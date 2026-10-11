# FIRE-X Command Center · Architecture & Telemetry Specification

## 1. System Context & Overview

FIRE-X is an autonomous and teleoperated tracked fire-fighting rover engineered for hazardous environment reconnaissance, search & rescue, and rapid fire mitigation.

```
       ┌────────────────────────┐              ┌────────────────────────┐
       │   ESP32 Microcontroller│              │   Raspberry Pi 4 / 5   │
       │   Motors · Sensors ·   │              │   Camera AI · Thermal  │
       │   Water Pump Relay     │              │   AMG8833 · MQTT Client│
       └───────────┬────────────┘              └───────────┬────────────┘
                   │                                       │
                   └───────────────────┬───────────────────┘
                                       │ Wi-Fi / MQTT
                                       ▼
                   ┌───────────────────────────────────────┐
                   │   MQTT Broker (EMQX / HiveMQ Cloud)   │
                   │   fire-x/telemetry · fire-x/command   │
                   └───────────────────┬───────────────────┘
                                       │
                                       ▼
                   ┌───────────────────────────────────────┐
                   │    Node.js Express + WebSocket Bridge │
                   │    Safety Checks · Batcher · Sim      │
                   └───────────────────┬───────────────────┘
                                       │
                                       ▼ WebSocket (10 Hz)
                   ┌───────────────────────────────────────┐
                   │   Next.js (React) Single-Page UI      │
                   │   FIRE-X Command Center Dashboard     │
                   └───────────────────┬───────────────────┘
                                       │
                                       ▼ Batches (5 min)
                   ┌───────────────────────────────────────┐
                   │          Firebase Firestore           │
                   │   Collections: "batches", "events"    │
                   └───────────────────────────────────────┘
```

---

## 2. MQTT Communication Protocol

### Topic Hierarchy
- `fire-x/telemetry` — 10 Hz telemetry published by the robot.
- `fire-x/command` — Commands sent from Command Center to the rover.
- `fire-x/alert` — Asynchronous high-priority alerts emitted by the rover.
- `fire-x/status` — Rover heartbeat & link state.

### Telemetry Payload Specification (`fire-x/telemetry`)
```json
{
  "ts": 1791696000000,
  "temp": 34.2,
  "temp_ds18b20_1": 34.2,
  "temp_ds18b20_2": 36.8,
  "humidity": 42.0,
  "mq2": 24,
  "mq5": 18,
  "smoke": "LOW",
  "flame": false,
  "thermal_max": 33.5,
  "thermal_dir": "CENTER",
  "thermal_grid": [28.1, 28.5, 29.0, 31.2, 33.5, 30.1, 29.0, 28.4, "... 64 numbers total"],
  "battery": 88,
  "mode": "MANUAL",
  "zone": "A",
  "person": false,
  "pump": false,
  "pan": 90,
  "tilt": 45,
  "speed": 0.6,
  "cannon_lock": false,
  "estop": false,
  "movement": "STOP"
}
```

### Command Payload Examples (`fire-x/command`)

#### 1. Movement Drive Command
```json
{
  "type": "move",
  "dir": "forward",
  "speed": 0.6
}
```
*Directions*: `"forward"`, `"backward"`, `"left"`, `"right"`, `"arc_left"`, `"arc_right"`, `"stop"`

#### 2. Water Pump Command
```json
{
  "type": "pump",
  "on": true
}
```
*Safety check*: Automatically rejected if `person === true`.

#### 3. Water Cannon Pan/Tilt Aim
```json
{
  "type": "aim",
  "pan": 120,
  "tilt": 45
}
```

#### 4. Operational Mode Selection
```json
{
  "type": "mode",
  "value": "AUTO FIRE"
}
```
*Values*: `"MANUAL"`, `"ASSISTED"`, `"AUTO FIRE"`, `"EMERGENCY"`

#### 5. Emergency Stop & Arm/Reset
```json
{ "type": "estop" }
{ "type": "reset" }
```

---

## 3. Safety Interlocks & Watchdog Timer

### 1. Person Detection Interlock
- When AI vision or thermal sensor detects a human silhouette (`person === true`):
  1. Cannon Lock is immediately engaged (`cannon_lock = true`).
  2. Water pump is automatically shut OFF (`pump = false`).
  3. Operator commands to engage pump are blocked on both UI and backend.
  4. Audio/visual alarm is broadcast to operator.

### 2. Deadman Watchdog (500 ms)
- The rover firmware (ESP32) listens for heartbeat/command packets. If no packet is received for 500 ms while moving, the rover immediately halts all motors to prevent runaways.
- The Command Center dashboard continuously streams movement commands at 10 Hz (100 ms) while keys are held down, and immediately dispatches `stop` upon key release, tab hiding, or window blur.

### 3. Emergency Stop (E-STOP)
- Hardware interrupt button on the rover + physical <kbd>Esc</kbd> key or UI button on dashboard.
- Immediately disables H-Bridge motor drivers, de-energizes water pump relay, and enters `EMERGENCY` state until operator clicks `ARM / RESET`.
