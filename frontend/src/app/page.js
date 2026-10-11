"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Banners from "@/components/Banners";
import PipelineTracker from "@/components/PipelineTracker";
import GasDensityPanel from "@/components/GasDensityPanel";
import TemperaturePanel from "@/components/TemperaturePanel";
import LiveThermalPanel from "@/components/LiveThermalPanel";
import FireConfidencePanel from "@/components/FireConfidencePanel";
import ControlSection from "@/components/ControlSection";
import DataLogSection from "@/components/DataLogSection";
import AlertsTimeline from "@/components/AlertsTimeline";
import FooterStatusStrip from "@/components/FooterStatusStrip";

export default function CommandCenterPage() {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [robotConnected, setRobotConnected] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [packetAgeMs, setPacketAgeMs] = useState(0);
  const [pipelineStage, setPipelineStage] = useState("SENSE");
  const [fireConfidence, setFireConfidence] = useState(14);
  const [mqttStatus, setMqttStatus] = useState("CONNECTED");
  const [firebaseStatus, setFirebaseStatus] = useState("ACTIVE (FIRESTORE)");
  const [lastSavedBatchTime, setLastSavedBatchTime] = useState("");

  const [telemetry, setTelemetry] = useState({
    ts: Date.now(),
    temp: 34.2, temp_ds18b20_1: 34.2, temp_ds18b20_2: 36.8,
    humidity: 42.0, mq2: 24, mq5: 18, smoke: "LOW",
    flame: false, thermal_max: 33.5, thermal_dir: "CENTER",
    thermal_grid: Array(64).fill(28),
    battery: 88, mode: "MANUAL", zone: "A",
    person: false, pump: false, pan: 90, tilt: 45,
    speed: 0.6, cannon_lock: false, estop: false, movement: "STOP"
  });

  const [batches, setBatches] = useState([]);
  const [events, setEvents] = useState([]);
  const [tempHistory, setTempHistory] = useState([]);

  const wsRef = useRef(null);
  const lastPacketTimeRef = useRef(Date.now());

  const sendCommand = useCallback((cmd) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    } else {
      if (cmd.type === "move") setTelemetry(p => ({ ...p, movement: cmd.dir || "STOP", speed: cmd.speed || 0.6 }));
      else if (cmd.type === "pump") { if (cmd.on && telemetry.person) return; setTelemetry(p => ({ ...p, pump: !!cmd.on })); }
      else if (cmd.type === "aim") setTelemetry(p => ({ ...p, pan: cmd.pan ?? p.pan, tilt: cmd.tilt ?? p.tilt }));
      else if (cmd.type === "mode") setTelemetry(p => ({ ...p, mode: cmd.value }));
      else if (cmd.type === "estop") setTelemetry(p => ({ ...p, estop: true, movement: "STOP", pump: false, mode: "EMERGENCY" }));
      else if (cmd.type === "reset" || cmd.type === "arm") setTelemetry(p => ({ ...p, estop: false, mode: "MANUAL" }));
    }
  }, [telemetry.person]);

  const handleEmergencyStop = () => sendCommand({ type: "estop" });
  const handleReleaseEstop = () => sendCommand({ type: "reset" });
  const handleSetMode = (mode) => sendCommand({ type: "mode", value: mode });
  const handleTogglePump = () => sendCommand({ type: "pump", on: !telemetry.pump });
  const handleSetPump = (on) => sendCommand({ type: "pump", on });
  const handleAimCannon = (pan, tilt) => sendCommand({ type: "aim", pan, tilt });
  const handleToggleDemo = () => { const next = !isDemoMode; setIsDemoMode(next); sendCommand({ type: "set_demo", enabled: next }); };
  const handleSimulateFire = (enabled = true) => sendCommand({ type: "sim_fire", enabled });
  const handleResetSim = () => sendCommand({ type: "sim_fire", enabled: false });
  const handleTogglePerson = (detected) => sendCommand({ type: "set_person", detected });

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5001";
    let ws = null;
    let reconnectTimeout = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => { setRobotConnected(true); setIsStale(false); lastPacketTimeRef.current = Date.now(); };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            lastPacketTimeRef.current = Date.now();
            if (msg.type === "state" && msg.data) {
              const d = msg.data;
              if (d.telemetry) setTelemetry(d.telemetry);
              if (d.isDemoMode !== undefined) setIsDemoMode(d.isDemoMode);
              if (d.robotConnected !== undefined) setRobotConnected(d.robotConnected);
              if (d.isStale !== undefined) setIsStale(d.isStale);
              if (d.packetAgeMs !== undefined) setPacketAgeMs(d.packetAgeMs);
              if (d.pipelineStage) setPipelineStage(d.pipelineStage);
              if (d.fireConfidence !== undefined) setFireConfidence(d.fireConfidence);
              if (d.mqttStatus) setMqttStatus(d.mqttStatus);
              if (d.firebaseStatus) setFirebaseStatus(d.firebaseStatus);
              if (d.lastSavedBatchTime) setLastSavedBatchTime(d.lastSavedBatchTime);
              if (d.temperatureHistory) setTempHistory(d.temperatureHistory);
            } else if (msg.type === "init" && msg.data) {
              const d = msg.data;
              if (d.telemetry) setTelemetry(d.telemetry);
              if (d.isDemoMode !== undefined) setIsDemoMode(d.isDemoMode);
              if (d.robotConnected !== undefined) setRobotConnected(d.robotConnected);
              if (d.pipelineStage) setPipelineStage(d.pipelineStage);
              if (d.fireConfidence !== undefined) setFireConfidence(d.fireConfidence);
              if (d.batches) setBatches(d.batches);
              if (d.events) setEvents(d.events);
              if (d.temperatureHistory) setTempHistory(d.temperatureHistory);
              if (d.lastSavedBatchTime) setLastSavedBatchTime(d.lastSavedBatchTime);
            } else if (msg.type === "batch_saved" && msg.data) {
              setBatches(prev => [msg.data, ...prev.slice(0, 50)]);
              setLastSavedBatchTime(msg.data.time);
            } else if (msg.type === "event" && msg.data) {
              setEvents(prev => [msg.data, ...prev.slice(0, 50)]);
            }
          } catch (err) { /* parse error */ }
        };
        ws.onclose = () => { setRobotConnected(false); setIsStale(true); reconnectTimeout = setTimeout(connect, 2000); };
        ws.onerror = () => { ws.close(); };
      } catch (err) { reconnectTimeout = setTimeout(connect, 3000); }
    };

    connect();

    const staleInterval = setInterval(() => {
      const age = Date.now() - lastPacketTimeRef.current;
      setPacketAgeMs(age);
      if (age > 5000 && !isDemoMode) setIsStale(true);
    }, 500);

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(staleInterval);
    };
  }, [isDemoMode]);

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: "var(--bg-page)" }}>

      {/* Navbar */}
      <Navbar
        telemetry={telemetry}
        isDemoMode={isDemoMode}
        robotConnected={robotConnected}
        isStale={isStale}
        onToggleDemo={handleToggleDemo}
        onResetSim={handleResetSim}
        onSimulateFire={handleSimulateFire}
      />

      {/* Banners */}
      <Banners
        isDemoMode={isDemoMode}
        estop={telemetry.estop}
        personDetected={telemetry.person}
        onSimulateFire={handleSimulateFire}
        onResetSim={handleResetSim}
        onReleaseEstop={handleReleaseEstop}
        onTogglePerson={handleTogglePerson}
      />

      {/* Main Content — full viewport width with comfortable padding */}
      <main className="flex-1 w-full px-4 sm:px-6 xl:px-8 py-5 flex flex-col gap-4">

        {/* Pipeline Tracker */}
        <PipelineTracker currentStage={pipelineStage} />

        {/* Hero Row: Thermal | Controls | Fire Confidence */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-4 flex flex-col">
            <LiveThermalPanel
              thermalGrid={telemetry.thermal_grid}
              thermalMax={telemetry.thermal_max}
              thermalDir={telemetry.thermal_dir}
              cameraStreamUrl={process.env.NEXT_PUBLIC_CAMERA_STREAM_URL || ""}
            />
          </div>
          <div className="lg:col-span-5 flex flex-col">
            <ControlSection
              telemetry={telemetry}
              isDemoMode={isDemoMode}
              onSendCommand={sendCommand}
              onEmergencyStop={handleEmergencyStop}
              onReleaseEstop={handleReleaseEstop}
              onSetMode={handleSetMode}
              onTogglePump={handleTogglePump}
              onSetPump={handleSetPump}
              onAimCannon={handleAimCannon}
              personDetected={telemetry.person}
            />
          </div>
          <div className="lg:col-span-3 flex flex-col">
            <FireConfidencePanel telemetry={telemetry} fireConfidence={fireConfidence} />
          </div>
        </div>

        {/* Sensor Row: Gas | Temperature */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <GasDensityPanel mq2={telemetry.mq2} mq5={telemetry.mq5} smokeStatus={telemetry.smoke} />
          <TemperaturePanel
            temp={telemetry.temp}
            tempChassis={telemetry.temp_ds18b20_1}
            tempElectronics={telemetry.temp_ds18b20_2}
            humidity={telemetry.humidity}
            history={tempHistory}
          />
        </div>

        {/* Data Log & Alerts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-8 flex flex-col">
            <DataLogSection
              batches={batches}
              lastSavedTime={lastSavedBatchTime}
              onExportCsv={() => window.open("http://localhost:5001/api/export/csv", "_blank")}
            />
          </div>
          <div className="lg:col-span-4 flex flex-col">
            <AlertsTimeline events={events} />
          </div>
        </div>

      </main>

      {/* Footer */}
      <FooterStatusStrip
        robotConnected={robotConnected}
        isDemoMode={isDemoMode}
        isStale={isStale}
        packetAgeMs={packetAgeMs}
        mqttStatus={mqttStatus}
        firebaseStatus={firebaseStatus}
      />
    </div>
  );
}
