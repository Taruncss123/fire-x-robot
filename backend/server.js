const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mqtt = require('mqtt');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 5001;
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.emqx.io:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
const BATCH_INTERVAL_MIN = parseInt(process.env.BATCH_INTERVAL_MINUTES || '5', 10);

app.use(cors());
app.use(express.json());

// ==========================================
// STATE MANAGEMENT & SAFETY
// ==========================================
const state = {
  robotConnected: false,
  isDemoMode: true,
  lastPacketTime: Date.now(),
  packetAgeMs: 0,
  
  // Pipeline: SENSE -> ANALYZE -> LOCATE -> NAVIGATE -> AIM -> SUPPRESS -> VERIFY
  pipelineStage: 'SENSE',

  // Robot telemetry
  telemetry: {
    ts: Date.now(),
    temp: 34.2,             // Primary temp (°C)
    temp_ds18b20_1: 34.2,   // DS18B20 Chassis (°C)
    temp_ds18b20_2: 36.8,   // DS18B20 Electronics (°C)
    humidity: 42.0,         // DHT22 (%)
    mq2: 24,                // Relative Gas Risk Index (0-100%)
    mq5: 18,                // Relative Gas Risk Index (0-100%)
    smoke: 'LOW',           // 'LOW', 'MEDIUM', 'HIGH'
    flame: false,           // boolean
    thermal_max: 33.5,      // Max AMG8833 temp (°C)
    thermal_dir: 'CENTER',  // 'LEFT', 'CENTER', 'RIGHT'
    thermal_grid: createBlankThermalGrid(28), // 64 numbers (8x8)
    battery: 88,            // %
    mode: 'MANUAL',         // 'MANUAL', 'ASSISTED', 'AUTO FIRE', 'EMERGENCY'
    zone: 'A',
    person: false,          // Person detection flag
    pump: false,            // Water pump state
    pan: 90,                // Cannon Pan (0-180)
    tilt: 45,               // Cannon Tilt (0-90)
    speed: 0.6,             // Drive speed 0.1 - 1.0
    cannon_lock: false,     // Cannon locked on target or safety lock
    estop: false,           // Emergency stop active
    movement: 'STOP'        // 'STOP', 'FORWARD', 'BACKWARD', 'LEFT', 'RIGHT', etc.
  },

  // Historical stores
  temperatureHistory: [], // Recent minutes for live chart
  batches: [],            // 5-minute aggregated batches
  events: [],             // Alert timeline
  lastSavedBatchTime: null
};

// Deadman timer for movement
let lastCommandTime = Date.now();
let deadmanInterval = null;

// Batch interval timer
let batchTimer = null;

// ==========================================
// THERMAL GRID HELPER (AMG8833 8x8)
// ==========================================
function createBlankThermalGrid(baseTemp = 28) {
  const grid = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      grid.push(parseFloat((baseTemp + (Math.sin(r) * 0.8) + (Math.cos(c) * 0.8) + (Math.random() * 0.4)).toFixed(1)));
    }
  }
  return grid;
}

function calculateHotspot(grid) {
  let maxTemp = -999;
  let maxIdx = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > maxTemp) {
      maxTemp = grid[i];
      maxIdx = i;
    }
  }
  const col = maxIdx % 8; // 0 to 7
  let dir = 'CENTER';
  if (col < 3) dir = 'LEFT';
  else if (col > 4) dir = 'RIGHT';

  return { maxTemp: parseFloat(maxTemp.toFixed(1)), maxIdx, dir };
}

// Calculate Fire Confidence (0 - 100)
// Flame: 30%, Thermal: 25%, Temp: 25%, Smoke: 20%
function calculateFireConfidence(t) {
  const flameContrib = t.flame ? 30 : 0;
  
  // Thermal contribution (25%): baseline 35°C to 75°C
  const thermalVal = Math.max(0, Math.min(25, ((t.thermal_max - 35) / 40) * 25));
  
  // Temp contribution (25%): baseline 40°C to 80°C
  const tempVal = Math.max(0, Math.min(25, ((t.temp - 38) / 42) * 25));
  
  // Smoke contribution (20%): max of mq2 and mq5
  const gasMax = Math.max(t.mq2 || 0, t.mq5 || 0);
  const smokeVal = Math.max(0, Math.min(20, (gasMax / 100) * 20));

  const total = Math.round(flameContrib + thermalVal + tempVal + smokeVal);
  return Math.min(100, Math.max(0, total));
}

// ==========================================
// EVENT LOGGING
// ==========================================
function logEvent(title, detail, severity = 'info') {
  const event = {
    id: 'evt_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    ts: Date.now(),
    time: new Date().toLocaleTimeString(),
    title,
    detail,
    severity // 'info', 'safe', 'warning', 'danger'
  };
  state.events.unshift(event);
  if (state.events.length > 100) state.events.pop();

  // Broadcast event over WebSocket
  broadcast({
    type: 'event',
    data: event
  });
}

// ==========================================
// SIMULATOR (REALISTIC FIRE SCENARIO)
// ==========================================
let simScenarioStep = 0;
let simScenarioActive = false;

function triggerSimScenario(start = true) {
  simScenarioActive = start;
  simScenarioStep = 0;
  if (start) {
    logEvent('DEMO SCENARIO STARTED', 'Simulating fire event: gas rise -> thermal hotspot -> fire alarm -> suppression', 'warning');
  } else {
    logEvent('DEMO SCENARIO RESET', 'Simulator returned to normal patrol status', 'safe');
    resetSimToNormal();
  }
}

function resetSimToNormal() {
  state.telemetry.temp = 33.5;
  state.telemetry.temp_ds18b20_1 = 33.5;
  state.telemetry.temp_ds18b20_2 = 36.0;
  state.telemetry.humidity = 43.0;
  state.telemetry.mq2 = 20;
  state.telemetry.mq5 = 16;
  state.telemetry.smoke = 'LOW';
  state.telemetry.flame = false;
  state.telemetry.thermal_max = 31.0;
  state.telemetry.thermal_dir = 'CENTER';
  state.telemetry.thermal_grid = createBlankThermalGrid(28);
  state.telemetry.pump = false;
  state.telemetry.person = false;
  state.telemetry.cannon_lock = false;
  state.pipelineStage = 'SENSE';
}

function runSimulatorTick() {
  if (!state.isDemoMode) return;

  state.lastPacketTime = Date.now();
  state.robotConnected = true;

  const t = state.telemetry;

  if (simScenarioActive) {
    simScenarioStep++;

    // Stage 1: Gas & Smoke Rise (Steps 1 - 6)
    if (simScenarioStep < 8) {
      state.pipelineStage = 'SENSE';
      t.mq2 = Math.min(88, t.mq2 + 8);
      t.mq5 = Math.min(82, t.mq5 + 7);
      t.smoke = t.mq2 > 60 ? 'HIGH' : 'MEDIUM';
      if (simScenarioStep === 3) {
        logEvent('GAS RISK ALERT', 'MQ-2 & MQ-5 detect elevated combustible gas index', 'warning');
      }
    }
    // Stage 2: Thermal Hotspot on Right & Flame Detected (Steps 8 - 18)
    else if (simScenarioStep < 20) {
      state.pipelineStage = 'ANALYZE';
      t.flame = true;
      t.temp = Math.min(84, t.temp + 3.5);
      t.temp_ds18b20_1 = t.temp;
      t.thermal_max = Math.min(88, t.thermal_max + 4.2);
      t.thermal_dir = 'RIGHT';

      // Inject localized hotspot in columns 5, 6, 7 (RIGHT)
      const grid = createBlankThermalGrid(34);
      grid[21] = 68.5; grid[22] = 82.0; grid[23] = 78.5;
      grid[29] = 74.0; grid[30] = t.thermal_max; grid[31] = 81.0;
      grid[37] = 62.0; grid[38] = 75.0; grid[39] = 70.0;
      t.thermal_grid = grid;

      if (simScenarioStep === 10) {
        state.pipelineStage = 'LOCATE';
        logEvent('FIRE CONFIRMED', `Thermal hotspot ${t.thermal_max}°C detected on RIGHT. Flame confirmed!`, 'danger');
      }
      if (simScenarioStep === 14) {
        state.pipelineStage = 'AIM';
        t.pan = 135; // Aim toward right
        t.tilt = 55;
        t.cannon_lock = true;
      }
    }
    // Stage 3: Suppression - Water Cannon Spraying (Steps 20 - 32)
    else if (simScenarioStep < 34) {
      state.pipelineStage = 'SUPPRESS';
      t.pump = true;
      t.temp = Math.max(38, t.temp - 4.5);
      t.temp_ds18b20_1 = t.temp;
      t.thermal_max = Math.max(36, t.thermal_max - 5.0);
      t.mq2 = Math.max(25, t.mq2 - 6);
      t.mq5 = Math.max(20, t.mq5 - 5);

      if (simScenarioStep === 22) {
        logEvent('SUPPRESSION ENGAGED', 'Water pump ON. Directing water stream to target hotspot', 'warning');
      }
    }
    // Stage 4: Verify & Cooled (Steps > 34)
    else {
      state.pipelineStage = 'VERIFY';
      t.pump = false;
      t.flame = false;
      t.smoke = 'LOW';
      t.cannon_lock = false;
      if (simScenarioStep === 35) {
        logEvent('FIRE EXTINGUISHED', 'Temperature normalized. Suppression complete. Area verified safe', 'safe');
      }
      if (simScenarioStep > 40) {
        simScenarioActive = false;
        resetSimToNormal();
      }
    }
  } else {
    // Normal ambient drift
    t.temp = parseFloat((33.5 + Math.sin(Date.now() / 15000) * 1.5).toFixed(1));
    t.temp_ds18b20_1 = t.temp;
    t.temp_ds18b20_2 = parseFloat((36.2 + Math.cos(Date.now() / 20000) * 0.8).toFixed(1));
    t.humidity = parseFloat((42.5 + Math.sin(Date.now() / 18000) * 2.0).toFixed(1));
    t.mq2 = Math.max(12, Math.min(30, Math.round(20 + Math.sin(Date.now() / 12000) * 5)));
    t.mq5 = Math.max(10, Math.min(26, Math.round(16 + Math.cos(Date.now() / 14000) * 4)));
    t.battery = Math.max(20, parseFloat((t.battery - 0.002).toFixed(1)));
    
    if (Math.random() < 0.1) {
      t.thermal_grid = createBlankThermalGrid(28);
      const hotspot = calculateHotspot(t.thermal_grid);
      t.thermal_max = hotspot.maxTemp;
      t.thermal_dir = hotspot.dir;
    }
  }

  t.ts = Date.now();

  // Push to temperature history (keep 60 points = 1-2 minutes)
  state.temperatureHistory.push({
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    temp: t.temp,
    chassis: t.temp_ds18b20_1,
    electronics: t.temp_ds18b20_2,
    thermal: t.thermal_max,
    mq2: t.mq2,
    mq5: t.mq5
  });
  if (state.temperatureHistory.length > 60) state.temperatureHistory.shift();
}

// ==========================================
// BATCH AGGREGATOR (5-MINUTE SUMMARY)
// ==========================================
function saveBatchRecord() {
  const t = state.telemetry;
  const confidence = calculateFireConfidence(t);

  const batch = {
    id: 'BATCH_' + String(state.batches.length + 1).padStart(4, '0'),
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString(),
    temp: t.temp,
    temp_chassis: t.temp_ds18b20_1,
    temp_electronics: t.temp_ds18b20_2,
    mq2_index: t.mq2,
    mq5_index: t.mq5,
    smoke_status: t.smoke,
    flame_detected: t.flame,
    thermal_max: t.thermal_max,
    thermal_direction: t.thermal_dir,
    battery_pct: t.battery,
    mode: t.mode,
    zone: t.zone,
    fire_confidence: confidence,
    pump_status: t.pump ? 'ACTIVE' : 'IDLE',
    estop_status: t.estop ? 'ACTIVE' : 'NORMAL'
  };

  state.batches.unshift(batch);
  if (state.batches.length > 200) state.batches.pop();
  state.lastSavedBatchTime = new Date().toLocaleTimeString();

  logEvent('TELEMETRY BATCH RECORDED', `Saved batch #${batch.id} [Confidence: ${confidence}%]`, 'info');

  broadcast({
    type: 'batch_saved',
    data: batch
  });
}

// Initial seed batches so history table is populated immediately
function seedBatches() {
  const now = Date.now();
  for (let i = 8; i >= 1; i--) {
    const pastTime = new Date(now - i * (BATCH_INTERVAL_MIN * 60 * 1000));
    state.batches.push({
      id: 'BATCH_' + String(9 - i).padStart(4, '0'),
      timestamp: pastTime.toISOString(),
      time: pastTime.toLocaleTimeString(),
      temp: parseFloat((33.2 + Math.random() * 2.5).toFixed(1)),
      temp_chassis: parseFloat((33.5 + Math.random() * 2).toFixed(1)),
      temp_electronics: parseFloat((36.0 + Math.random() * 1.5).toFixed(1)),
      mq2_index: Math.round(18 + Math.random() * 10),
      mq5_index: Math.round(14 + Math.random() * 8),
      smoke_status: 'LOW',
      flame_detected: false,
      thermal_max: parseFloat((31.0 + Math.random() * 3).toFixed(1)),
      thermal_direction: 'CENTER',
      battery_pct: Math.round(98 - (8 - i) * 1.2),
      mode: 'MANUAL',
      zone: 'A',
      fire_confidence: Math.round(10 + Math.random() * 8),
      pump_status: 'IDLE',
      estop_status: 'NORMAL'
    });
  }
  state.lastSavedBatchTime = new Date().toLocaleTimeString();
}
seedBatches();

// Initial seed events
logEvent('SYSTEM BOOT', 'FIRE-X Command Center Bridge Initialized', 'info');
logEvent('NETWORK LINK', 'MQTT / WebSocket bridge listening for rover telemetry', 'safe');

// ==========================================
// COMMAND PROCESSING & SAFETY INTERLOCKS
// ==========================================
function handleCommand(cmd) {
  lastCommandTime = Date.now();

  // EMERGENCY STOP SAFETY OVERRIDE
  if (cmd.type === 'estop' || cmd.type === 'EMERGENCY_STOP') {
    state.telemetry.estop = true;
    state.telemetry.movement = 'STOP';
    state.telemetry.pump = false;
    state.telemetry.mode = 'EMERGENCY';
    state.pipelineStage = 'SENSE';
    logEvent('EMERGENCY STOP ACTIVATED', 'All drive motors and water pump immediately halted by operator', 'danger');
    forwardToMqtt('fire-x/command', { type: 'estop' });
    return { success: true, status: 'ESTOP_ACTIVE' };
  }

  // ARM / RESET
  if (cmd.type === 'reset' || cmd.type === 'arm' || cmd.type === 'RELEASE_ESTOP') {
    state.telemetry.estop = false;
    state.telemetry.mode = 'MANUAL';
    logEvent('SYSTEM ARMED', 'Emergency stop released. System controls re-armed', 'safe');
    forwardToMqtt('fire-x/command', { type: 'reset' });
    return { success: true, status: 'SYSTEM_ARMED' };
  }

  // If E-Stop active, reject other commands
  if (state.telemetry.estop) {
    return { success: false, error: 'EMERGENCY_STOP_LOCKOUT', message: 'Controls locked: Release E-STOP first.' };
  }

  // PERSON DETECTED SAFETY INTERLOCK FOR WATER PUMP
  if (cmd.type === 'pump') {
    if (cmd.on === true && state.telemetry.person === true) {
      logEvent('PUMP ENGAGE BLOCKED', 'SAFETY INTERLOCK: Person detected in firing line! Cannon locked, pump inhibited.', 'danger');
      return {
        success: false,
        error: 'PERSON_DETECTED_SAFETY_LOCK',
        message: 'SAFETY INTERLOCK: Cannot engage pump while PERSON is detected in sector!'
      };
    }

    state.telemetry.pump = !!cmd.on;
    logEvent(state.telemetry.pump ? 'PUMP ACTIVATED' : 'PUMP DEACTIVATED', `Water pump turned ${state.telemetry.pump ? 'ON' : 'OFF'}`, state.telemetry.pump ? 'warning' : 'info');
    forwardToMqtt('fire-x/command', { type: 'pump', on: state.telemetry.pump });
    return { success: true, pump: state.telemetry.pump };
  }

  // DRIVE MOVEMENT
  if (cmd.type === 'move') {
    state.telemetry.movement = cmd.dir || 'STOP';
    if (cmd.speed !== undefined) state.telemetry.speed = parseFloat(cmd.speed);
    forwardToMqtt('fire-x/command', { type: 'move', dir: state.telemetry.movement, speed: state.telemetry.speed });
    return { success: true, movement: state.telemetry.movement };
  }

  // CANNON AIM
  if (cmd.type === 'aim') {
    if (cmd.pan !== undefined) state.telemetry.pan = Math.max(0, Math.min(180, cmd.pan));
    if (cmd.tilt !== undefined) state.telemetry.tilt = Math.max(0, Math.min(90, cmd.tilt));
    forwardToMqtt('fire-x/command', { type: 'aim', pan: state.telemetry.pan, tilt: state.telemetry.tilt });
    return { success: true, pan: state.telemetry.pan, tilt: state.telemetry.tilt };
  }

  // DRIVE MODE
  if (cmd.type === 'mode') {
    const validModes = ['MANUAL', 'ASSISTED', 'AUTO FIRE', 'EMERGENCY'];
    if (validModes.includes(cmd.value)) {
      state.telemetry.mode = cmd.value;
      logEvent('MODE CHANGED', `Operational mode switched to ${cmd.value}`, 'info');
      forwardToMqtt('fire-x/command', { type: 'mode', value: cmd.value });
      return { success: true, mode: state.telemetry.mode };
    }
  }

  // SIMULATOR TOGGLES
  if (cmd.type === 'set_demo') {
    state.isDemoMode = !!cmd.enabled;
    logEvent('DEMO MODE TOGGLE', `Demo Mode set to ${state.isDemoMode}`, 'info');
    return { success: true, demo: state.isDemoMode };
  }

  if (cmd.type === 'sim_fire') {
    triggerSimScenario(cmd.enabled !== false);
    return { success: true, scenario: simScenarioActive };
  }

  if (cmd.type === 'set_person') {
    state.telemetry.person = !!cmd.detected;
    if (state.telemetry.person) {
      state.telemetry.cannon_lock = true;
      if (state.telemetry.pump) {
        state.telemetry.pump = false;
        logEvent('SAFETY INTERLOCK TRIGGERED', 'PERSON DETECTED -> CANNON LOCK -> PUMP OFF -> OPERATOR ALERT', 'danger');
      } else {
        logEvent('PERSON DETECTED', 'Target locked for human safety. Pump disabled.', 'warning');
      }
    } else {
      state.telemetry.cannon_lock = false;
      logEvent('PERSON CLEARED', 'Safety interlock released.', 'safe');
    }
    return { success: true, person: state.telemetry.person };
  }

  return { success: false, error: 'UNKNOWN_COMMAND' };
}

// Deadman heartbeat watcher (every 100 ms)
deadmanInterval = setInterval(() => {
  const age = Date.now() - lastCommandTime;
  // If moving and no command in 500ms, auto stop!
  if (state.telemetry.movement !== 'STOP' && age > 500) {
    state.telemetry.movement = 'STOP';
    forwardToMqtt('fire-x/command', { type: 'move', dir: 'STOP' });
  }
}, 100);

// Setup Batch interval
batchTimer = setInterval(saveBatchRecord, BATCH_INTERVAL_MIN * 60 * 1000);

// ==========================================
// MQTT CLIENT (HIVE MQ / EMQX / LOCAL)
// ==========================================
let mqttClient = null;
let mqttStatus = 'DISCONNECTED';

function setupMqtt() {
  try {
    const opts = {};
    if (MQTT_USERNAME) opts.username = MQTT_USERNAME;
    if (MQTT_PASSWORD) opts.password = MQTT_PASSWORD;
    opts.connectTimeout = 5000;
    opts.reconnectPeriod = 3000;

    mqttClient = mqtt.connect(MQTT_BROKER_URL, opts);

    mqttClient.on('connect', () => {
      mqttStatus = 'CONNECTED';
      logEvent('MQTT CONNECTED', `Broker: ${MQTT_BROKER_URL}`, 'safe');
      mqttClient.subscribe(['fire-x/telemetry', 'fire-x/alert', 'fire-x/status']);
    });

    mqttClient.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (topic === 'fire-x/telemetry') {
          handleIncomingRobotTelemetry(payload);
        } else if (topic === 'fire-x/alert') {
          logEvent('ROBOT ALERT: ' + (payload.title || 'Warning'), payload.message || '', 'warning');
        }
      } catch (err) {
        // ignore parse errors
      }
    });

    mqttClient.on('error', (err) => {
      mqttStatus = 'ERROR';
    });

    mqttClient.on('close', () => {
      mqttStatus = 'DISCONNECTED';
    });
  } catch (err) {
    mqttStatus = 'ERROR';
  }
}
setupMqtt();

function forwardToMqtt(topic, payload) {
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, JSON.stringify(payload));
  }
}

function handleIncomingRobotTelemetry(data) {
  state.lastPacketTime = Date.now();
  state.isDemoMode = false;
  state.robotConnected = true;

  // Merge live telemetry
  Object.assign(state.telemetry, data);
  if (data.thermal_grid && Array.isArray(data.thermal_grid)) {
    const hotspot = calculateHotspot(data.thermal_grid);
    state.telemetry.thermal_max = hotspot.maxTemp;
    state.telemetry.thermal_dir = hotspot.dir;
  }
}

// ==========================================
// WEBSOCKET BROADCAST TO DASHBOARD CLIENTS
// ==========================================
function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// 10 Hz Telemetry Broadcast
setInterval(() => {
  runSimulatorTick();

  state.packetAgeMs = Date.now() - state.lastPacketTime;
  const isStale = state.packetAgeMs > 5000;

  broadcast({
    type: 'state',
    data: {
      telemetry: state.telemetry,
      isDemoMode: state.isDemoMode,
      robotConnected: state.robotConnected && !isStale,
      isStale,
      packetAgeMs: state.packetAgeMs,
      pipelineStage: state.pipelineStage,
      fireConfidence: calculateFireConfidence(state.telemetry),
      mqttStatus,
      firebaseStatus: 'ACTIVE (LOCAL/FIRESTORE)',
      lastSavedBatchTime: state.lastSavedBatchTime,
      temperatureHistory: state.temperatureHistory.slice(-25)
    }
  });
}, 100);

wss.on('connection', (ws) => {
  // Send initial snapshot
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      telemetry: state.telemetry,
      isDemoMode: state.isDemoMode,
      robotConnected: state.robotConnected,
      pipelineStage: state.pipelineStage,
      fireConfidence: calculateFireConfidence(state.telemetry),
      batches: state.batches,
      events: state.events,
      temperatureHistory: state.temperatureHistory.slice(-25),
      mqttStatus,
      lastSavedBatchTime: state.lastSavedBatchTime
    }
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());

      // Direct Robot / ESP32 Telemetry via WebSocket
      if (parsed.type === 'ESP32_TELEMETRY' || parsed.type === 'telemetry') {
        const tele = {
          temp: parsed.temperatureC ?? parsed.temp ?? state.telemetry.temp,
          mq2: parsed.smokePpm ? Math.min(100, Math.round(parsed.smokePpm / 4)) : (parsed.mq2 ?? state.telemetry.mq2),
          mq5: parsed.mq5 ?? state.telemetry.mq5,
          flame: parsed.flameSensors ? (parsed.flameSensors.left || parsed.flameSensors.center || parsed.flameSensors.right) : (parsed.flame ?? state.telemetry.flame),
          battery: parsed.battery ?? state.telemetry.battery,
          pump: parsed.pumpActive ?? parsed.pump ?? state.telemetry.pump,
          estop: parsed.emergencyStop ?? parsed.estop ?? state.telemetry.estop,
          thermal_max: parsed.thermal_max ?? state.telemetry.thermal_max,
          thermal_grid: parsed.thermal_grid ?? state.telemetry.thermal_grid
        };
        handleIncomingRobotTelemetry(tele);
        ws.send(JSON.stringify({ type: 'telemetry_ack', received: true }));
        return;
      }

      if (parsed.type === 'ESP32_HANDSHAKE') {
        state.robotConnected = true;
        state.lastPacketTime = Date.now();
        state.isDemoMode = false;
        logEvent('ROBOT HARDWARE CONNECTED', `Hardware ${parsed.robotId || 'ESP32'} handshake established.`, 'safe');
        ws.send(JSON.stringify({ type: 'handshake_ack', status: 'LINK_ESTABLISHED' }));
        return;
      }

      const res = handleCommand(parsed);
      ws.send(JSON.stringify({ type: 'command_ack', result: res }));
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON message' }));
    }
  });
});

// ==========================================
// REST API ENDPOINTS
// ==========================================
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'FIRE-X Command Center Bridge',
    time: new Date().toISOString(),
    demoMode: state.isDemoMode,
    mqttStatus
  });
});

app.get('/api/telemetry', (req, res) => {
  res.json({
    telemetry: state.telemetry,
    fireConfidence: calculateFireConfidence(state.telemetry),
    isDemoMode: state.isDemoMode,
    packetAgeMs: Date.now() - state.lastPacketTime,
    isStale: (Date.now() - state.lastPacketTime) > 5000
  });
});

// Ingest telemetry via HTTP POST from ESP32 / Raspberry Pi
app.post('/api/telemetry', (req, res) => {
  const data = req.body;
  handleIncomingRobotTelemetry(data);
  res.json({ success: true, received: true });
});

app.post('/api/command', (req, res) => {
  const result = handleCommand(req.body);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

app.get('/api/batches', (req, res) => {
  res.json({
    intervalMinutes: BATCH_INTERVAL_MIN,
    lastSaved: state.lastSavedBatchTime,
    batches: state.batches
  });
});

app.get('/api/events', (req, res) => {
  res.json(state.events);
});

// CSV Export Endpoint
app.get('/api/export/csv', (req, res) => {
  const headers = [
    'Batch_ID', 'Timestamp', 'Local_Time', 'Temperature_C', 'Chassis_Temp_C',
    'Electronics_Temp_C', 'MQ2_Gas_Risk_Idx', 'MQ5_Gas_Risk_Idx', 'Smoke_Status',
    'Flame_Detected', 'Thermal_Max_C', 'Hotspot_Direction', 'Battery_Pct',
    'Drive_Mode', 'Zone', 'Fire_Confidence_Pct', 'Pump_Status', 'Estop_Status'
  ];

  const rows = state.batches.map(b => [
    b.id,
    b.timestamp,
    `"${b.time}"`,
    b.temp,
    b.temp_chassis || b.temp,
    b.temp_electronics || b.temp,
    b.mq2_index,
    b.mq5_index,
    b.smoke_status,
    b.flame_detected ? 'TRUE' : 'FALSE',
    b.thermal_max,
    b.thermal_direction,
    b.battery_pct,
    b.mode,
    b.zone,
    b.fire_confidence,
    b.pump_status,
    b.estop_status
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="firex_batches_${Date.now()}.csv"`);
  res.send(csvContent);
});

// Run HTTP & WebSocket server
server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🔥 FIRE-X COMMAND CENTER BRIDGE BACKEND ACTIVE`);
  console.log(`🚀 Port:            http://localhost:${PORT}`);
  console.log(`📡 WebSocket:       ws://localhost:${PORT}`);
  console.log(`📡 MQTT Broker:     ${MQTT_BROKER_URL}`);
  console.log(`📊 Batch Interval:  ${BATCH_INTERVAL_MIN} minutes`);
  console.log('====================================================');
});
