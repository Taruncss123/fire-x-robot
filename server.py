"""
FIRE-X Robotic Control & Telemetry Server
FastAPI + WebSockets Backend for ESP32 Robot Teleoperation & Dashboard Monitoring
"""

import asyncio
import json
import math
import random
import time
from typing import Dict, List, Optional, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="FIRE-X Tactical Robotics Backend",
    description="Backend server connecting ESP32 Robot Hardware with Single-Page Web Dashboard",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# GLOBAL ROBOT TELEMETRY STATE
# -----------------------------------------------------------------------------
class RobotState:
    def __init__(self):
        self.robot_id = "FIREX-01"
        self.mode = "DEMO"  # "DEMO" or "LIVE"
        self.last_esp32_heartbeat = 0.0

        # Sensors (from ESP32: HC-SR04 x3, MQ-2, MLX90640, MPU6050, IR Flame)
        self.ultrasonic = {"left_cm": 150.0, "center_cm": 145.0, "right_cm": 160.0}
        self.mq2_smoke_ppm = 42.0
        self.temperature_c = 38.2
        self.flame_sensors = {"left": False, "center": False, "right": False}
        self.fire_detected = False
        self.fire_confidence = 0.0
        self.fire_location = "None"
        self.threat_level = "NORMAL"

        # MPU6050 6-Axis IMU
        self.imu = {"pitch": 0.0, "roll": 0.0, "yaw": 0.0, "heading": 0}

        # MLX90640 32x24 Thermal Matrix summary (min, max, avg, hotspot coordinates)
        self.thermal = {
            "min_c": 26.5,
            "max_c": 38.4,
            "avg_c": 29.1,
            "hotspot_x": 18,
            "hotspot_y": 12,
            "hotspot_temp_c": 38.4
        }

        # 4-Motor Driver (2x TB6612FNG) Status
        self.motors = {
            "front_left": 0,   # -255 to 255 PWM
            "front_right": 0,
            "rear_left": 0,
            "rear_right": 0,
            "movement": "STOP",
            "speed": 0.5       # m/s
        }

        # Safety & Actuation (Water Pump, E-Stop, Buzzer, LEDs)
        self.pump_active = False
        self.water_level_pct = 92.0
        self.spray_rate_lpm = 0.0
        self.nozzle_angle = 90
        self.emergency_stop = False
        self.buzzer_active = False
        self.led_status = "GREEN_IDLE"
        self.battery_pct = 87.0
        self.position = {"x": 0.0, "y": 0.0}

        # Mission Pipeline
        self.mission_stage = -1
        self.mission_status = "IDLE"
        self.drive_mode = "MANUAL"  # "MANUAL" or "AUTONOMOUS"

        # History and Telemetry Batches
        self.batches: List[dict] = []
        self.logs: List[dict] = []

    def to_dict(self):
        return {
            "robotId": self.robot_id,
            "mode": self.mode,
            "liveConnected": (time.time() - self.last_esp32_heartbeat < 3.0),
            "sensors": {
                "ultrasonic": self.ultrasonic,
                "smokePpm": round(self.mq2_smoke_ppm, 1),
                "temperatureC": round(self.temperature_c, 1),
                "flameSensors": self.flame_sensors,
                "fireDetected": self.fire_detected,
                "fireConfidence": round(self.fire_confidence, 2),
                "fireLocation": self.fire_location,
                "threatLevel": self.threat_level,
                "imu": self.imu,
                "thermal": self.thermal
            },
            "motors": self.motors,
            "safety": {
                "emergencyStop": self.emergency_stop,
                "buzzer": self.buzzer_active,
                "ledStatus": self.led_status,
                "battery": round(self.battery_pct, 1)
            },
            "extinguisher": {
                "pumpActive": self.pump_active,
                "waterLevelPct": round(self.water_level_pct, 1),
                "sprayRateLpm": round(self.spray_rate_lpm, 1),
                "nozzleAngle": self.nozzle_angle
            },
            "mission": {
                "stage": self.mission_stage,
                "status": self.mission_status,
                "driveMode": self.drive_mode,
                "position": self.position
            },
            "timestamp": time.time()
        }

robot = RobotState()

# -----------------------------------------------------------------------------
# WEBSOCKET CONNECTION MANAGER
# -----------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.esp32_connection: Optional[WebSocket] = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        if self.esp32_connection == websocket:
            self.esp32_connection = None
            robot.mode = "DEMO"

    async def broadcast(self, message: dict):
        dead_sockets = []
        msg_str = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(msg_str)
            except Exception:
                dead_sockets.append(connection)
        for dead in dead_sockets:
            self.active_connections.discard(dead)

    async def send_to_esp32(self, command: dict):
        if self.esp32_connection:
            try:
                await self.esp32_connection.send_text(json.dumps(command))
            except Exception:
                self.esp32_connection = None

manager = ConnectionManager()

def log_event(text: str, log_type: str = "info"):
    entry = {
        "time": time.strftime("%H:%M:%S"),
        "text": text,
        "type": log_type
    }
    robot.logs.insert(0, entry)
    if len(robot.logs) > 60:
        robot.logs.pop()

# -----------------------------------------------------------------------------
# BACKGROUND SIMULATOR / WATCHDOG TASK
# -----------------------------------------------------------------------------
async def background_simulation_loop():
    """Provides physics simulation if ESP32 is not currently connected."""
    batch_timer = 0
    while True:
        await asyncio.sleep(0.5)

        # Check if live ESP32 is feeding data
        is_live = (time.time() - robot.last_esp32_heartbeat < 3.0)
        robot.mode = "LIVE" if is_live else "DEMO"

        if not is_live:
            # DEMO / Simulation Mode physics
            if not robot.emergency_stop:
                # Motion physics
                if robot.motors["movement"] != "STOP":
                    heading_rad = math.radians(robot.imu["heading"])
                    speed = robot.motors["speed"]
                    if robot.motors["movement"] == "FWD":
                        robot.position["x"] += math.sin(heading_rad) * (speed * 0.1)
                        robot.position["y"] += math.cos(heading_rad) * (speed * 0.1)
                        robot.ultrasonic["center_cm"] = max(15.0, robot.ultrasonic["center_cm"] - 2 + random.uniform(-1, 1))
                    elif robot.motors["movement"] == "REV":
                        robot.position["x"] -= math.sin(heading_rad) * (speed * 0.1)
                        robot.position["y"] -= math.cos(heading_rad) * (speed * 0.1)
                        robot.ultrasonic["center_cm"] = min(300.0, robot.ultrasonic["center_cm"] + 2 + random.uniform(-1, 1))
                    elif robot.motors["movement"] == "LEFT":
                        robot.imu["heading"] = (robot.imu["heading"] - 10 + 360) % 360
                    elif robot.motors["movement"] == "RIGHT":
                        robot.imu["heading"] = (robot.imu["heading"] + 10) % 360

                    robot.battery_pct = max(0.0, robot.battery_pct - 0.005)

                # Water pump spraying
                if robot.pump_active and robot.water_level_pct > 0:
                    robot.water_level_pct = max(0.0, robot.water_level_pct - 0.4)
                    if robot.fire_detected:
                        robot.temperature_c = max(26.0, robot.temperature_c - 1.8)
                        robot.mq2_smoke_ppm = max(20.0, robot.mq2_smoke_ppm - 3.5)

                # Gas / Smoke fluctuation
                if robot.fire_detected:
                    robot.mq2_smoke_ppm = min(350.0, robot.mq2_smoke_ppm + random.uniform(3, 8))
                    robot.temperature_c = min(110.0, robot.temperature_c + random.uniform(1.2, 2.5))
                    robot.threat_level = "CRITICAL"
                    robot.buzzer_active = True
                    robot.led_status = "RED_FIRE_ALARM"
                else:
                    target_gas = 42.0
                    robot.mq2_smoke_ppm += (target_gas - robot.mq2_smoke_ppm) * 0.05 + random.uniform(-0.5, 0.5)
                    target_temp = 38.0
                    robot.temperature_c += (target_temp - robot.temperature_c) * 0.05 + random.uniform(-0.2, 0.2)
                    robot.threat_level = "NORMAL"
                    robot.buzzer_active = False
                    robot.led_status = "GREEN_IDLE"

        # 5-Minute Batch creation
        batch_timer += 0.5
        if batch_timer >= 300:
            batch_timer = 0
            n = len(robot.batches) + 1
            batch = {
                "id": f"BATCH_{n:03d}",
                "time": time.strftime("%H:%M:%S"),
                "gas": round(robot.mq2_smoke_ppm, 1),
                "temp": round(robot.temperature_c, 1),
                "water": f"{round(robot.water_level_pct)}%",
                "threat": robot.threat_level,
                "stage": f"STAGE_{robot.mission_stage}" if robot.mission_stage >= 0 else "IDLE"
            }
            robot.batches.insert(0, batch)
            if len(robot.batches) > 30:
                robot.batches.pop()

        # Broadcast state to all connected dashboard websockets
        await manager.broadcast({
            "type": "telemetry",
            "data": robot.to_dict(),
            "logs": robot.logs[:15]
        })

@app.on_event("startup")
async def startup_event():
    log_event("FIRE-X Backend Server started on FastAPI.", "info")
    asyncio.create_task(background_simulation_loop())

# -----------------------------------------------------------------------------
# REST API ENDPOINTS
# -----------------------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except Exception as e:
        return HTMLResponse(content=f"<h1>FIRE-X Server Running</h1><p>Error loading index.html: {e}</p>")

@app.get("/api/health")
async def health_check():
    return {
        "firex": True,
        "status": "online",
        "mode": robot.mode,
        "activeClients": len(manager.active_connections),
        "esp32Connected": (time.time() - robot.last_esp32_heartbeat < 3.0)
    }

@app.get("/api/telemetry")
async def get_telemetry():
    return robot.to_dict()

# ESP32 Telemetry Ingestion Endpoint (HTTP POST fallback for ESP32)
class ESP32Packet(BaseModel):
    robotId: Optional[str] = "FIREX-01"
    ultrasonic: Optional[Dict[str, float]] = None
    smokePpm: Optional[float] = None
    temperatureC: Optional[float] = None
    flameSensors: Optional[Dict[str, bool]] = None
    imu: Optional[Dict[str, float]] = None
    battery: Optional[float] = None
    emergencyStop: Optional[bool] = None

@app.post("/api/telemetry")
async def ingest_esp32_telemetry(packet: ESP32Packet):
    robot.last_esp32_heartbeat = time.time()
    robot.mode = "LIVE"

    if packet.ultrasonic:
        robot.ultrasonic = packet.ultrasonic
    if packet.smokePpm is not None:
        robot.mq2_smoke_ppm = packet.smokePpm
    if packet.temperatureC is not None:
        robot.temperature_c = packet.temperatureC
    if packet.flameSensors:
        robot.flame_sensors = packet.flameSensors
        robot.fire_detected = any(packet.flameSensors.values())
    if packet.imu:
        robot.imu = packet.imu
    if packet.battery is not None:
        robot.battery_pct = packet.battery
    if packet.emergencyStop is not None:
        robot.emergency_stop = packet.emergencyStop

    return {"status": "ok", "pumpState": robot.pump_active, "movement": robot.motors["movement"]}

# Robot Movement APIs
class MovePayload(BaseModel):
    direction: str
    speed: Optional[float] = 0.5

@app.post("/api/robot/move")
async def move_robot(payload: MovePayload):
    if robot.emergency_stop:
        return JSONResponse({"status": "blocked", "error": "EMERGENCY_STOP_ACTIVE"}, status_code=403)

    robot.motors["movement"] = payload.direction
    robot.motors["speed"] = payload.speed or 0.5

    # Calculate motor PWMs for TB6612
    pwm = int(robot.motors["speed"] * 255)
    if payload.direction == "FWD":
        robot.motors["front_left"] = pwm; robot.motors["front_right"] = pwm
        robot.motors["rear_left"] = pwm; robot.motors["rear_right"] = pwm
    elif payload.direction == "REV":
        robot.motors["front_left"] = -pwm; robot.motors["front_right"] = -pwm
        robot.motors["rear_left"] = -pwm; robot.motors["rear_right"] = -pwm
    elif payload.direction == "LEFT":
        robot.motors["front_left"] = -pwm; robot.motors["front_right"] = pwm
        robot.motors["rear_left"] = -pwm; robot.motors["rear_right"] = pwm
    elif payload.direction == "RIGHT":
        robot.motors["front_left"] = pwm; robot.motors["front_right"] = -pwm
        robot.motors["rear_left"] = pwm; robot.motors["rear_right"] = -pwm

    log_event(f"Movement: {payload.direction} @ {robot.motors['speed']} m/s", "nav")
    await manager.send_to_esp32({"cmd": "MOVE", "dir": payload.direction, "speed": robot.motors["speed"], "pwm": pwm})
    return {"status": "ok", "movement": robot.motors["movement"]}

@app.post("/api/robot/stop")
async def stop_robot():
    robot.motors["movement"] = "STOP"
    robot.motors["front_left"] = 0; robot.motors["front_right"] = 0
    robot.motors["rear_left"] = 0; robot.motors["rear_right"] = 0
    log_event("Robot drive stopped.", "nav")
    await manager.send_to_esp32({"cmd": "STOP"})
    return {"status": "ok", "movement": "STOP"}

# Emergency Stop APIs
@app.post("/api/robot/emergency-stop")
async def emergency_stop():
    robot.emergency_stop = True
    robot.motors["movement"] = "STOP"
    robot.pump_active = False
    robot.spray_rate_lpm = 0.0
    robot.buzzer_active = True
    robot.led_status = "RED_ESTOP"
    log_event("🚨 EMERGENCY STOP ACTIVATED!", "fire")
    await manager.send_to_esp32({"cmd": "ESTOP"})
    return {"status": "ok", "emergencyStop": True}

@app.post("/api/robot/emergency-stop/release")
async def release_emergency_stop():
    robot.emergency_stop = False
    robot.buzzer_active = False
    robot.led_status = "GREEN_IDLE"
    log_event("Emergency stop released.", "info")
    await manager.send_to_esp32({"cmd": "RELEASE_ESTOP"})
    return {"status": "ok", "emergencyStop": False}

# Water Pump APIs
@app.post("/api/pump/on")
async def pump_on():
    if robot.emergency_stop:
        return JSONResponse({"status": "blocked", "error": "EMERGENCY_STOP_ACTIVE"}, status_code=403)
    robot.pump_active = True
    robot.spray_rate_lpm = 4.2
    log_event("💧 Water pump started (Relay 12V ACTIVE)", "pump")
    await manager.send_to_esp32({"cmd": "PUMP", "state": True})
    return {"status": "ok", "pumpActive": True}

@app.post("/api/pump/off")
async def pump_off():
    robot.pump_active = False
    robot.spray_rate_lpm = 0.0
    log_event("Water pump stopped.", "pump")
    await manager.send_to_esp32({"cmd": "PUMP", "state": False})
    return {"status": "ok", "pumpActive": False}

@app.post("/api/pump/toggle")
async def pump_toggle():
    return await (pump_off() if robot.pump_active else pump_on())

# Drive Mode & Mission
class DriveModePayload(BaseModel):
    mode: str

@app.post("/api/drive-mode")
async def set_drive_mode(payload: DriveModePayload):
    robot.drive_mode = payload.mode
    log_event(f"Drive mode set to {payload.mode}", "nav")
    await manager.send_to_esp32({"cmd": "MODE", "mode": payload.mode})
    return {"status": "ok", "driveMode": robot.drive_mode}

@app.post("/api/demo/simulate-fire")
async def simulate_fire():
    robot.fire_detected = not robot.fire_detected
    if robot.fire_detected:
        robot.fire_confidence = 0.94
        robot.fire_location = "Sector B (3.2m Center)"
        robot.flame_sensors = {"left": True, "center": True, "right": False}
        log_event("🔥 Fire event triggered via API", "fire")
    else:
        robot.fire_confidence = 0.0
        robot.fire_location = "None"
        robot.flame_sensors = {"left": False, "center": False, "right": False}
        log_event("Fire cleared.", "info")
    return {"status": "ok", "fireDetected": robot.fire_detected}

# CSV Export
@app.get("/api/export/csv")
async def export_csv():
    rows = ["Batch_ID,Time,Gas_PPM,Temperature_C,Water_Tank,Threat_Level,Stage"]
    for b in robot.batches:
        rows.append(f"{b['id']},{b['time']},{b['gas']},{b['temp']},{b['water']},{b['threat']},{b['stage']}")
    return PlainTextResponse(content="\n".join(rows), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=firex_telemetry.csv"})

# -----------------------------------------------------------------------------
# WEBSOCKET ENDPOINT
# -----------------------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send immediate initial state
        await websocket.send_text(json.dumps({
            "type": "telemetry",
            "data": robot.to_dict(),
            "logs": robot.logs[:15]
        }))

        while True:
            text = await websocket.receive_text()
            try:
                data = json.loads(text)
                cmd_type = data.get("type") or data.get("cmd")

                # Handle messages from ESP32 or Dashboard
                if cmd_type == "ESP32_HANDSHAKE":
                    manager.esp32_connection = websocket
                    robot.mode = "LIVE"
                    robot.last_esp32_heartbeat = time.time()
                    log_event("🟢 Live ESP32 Hardware connected via WebSocket!", "info")

                elif cmd_type == "ESP32_TELEMETRY":
                    robot.last_esp32_heartbeat = time.time()
                    robot.mode = "LIVE"
                    if "ultrasonic" in data: robot.ultrasonic = data["ultrasonic"]
                    if "smokePpm" in data: robot.mq2_smoke_ppm = data["smokePpm"]
                    if "temperatureC" in data: robot.temperature_c = data["temperatureC"]
                    if "flameSensors" in data:
                        robot.flame_sensors = data["flameSensors"]
                        robot.fire_detected = any(data["flameSensors"].values())
                    if "imu" in data: robot.imu = data["imu"]
                    if "battery" in data: robot.battery_pct = data["battery"]

                elif cmd_type == "MOVE":
                    direction = data.get("dir", "STOP")
                    speed = data.get("speed", 0.5)
                    await move_robot(MovePayload(direction=direction, speed=speed))

                elif cmd_type == "PUMP":
                    state = data.get("state")
                    if state is True: await pump_on()
                    elif state is False: await pump_off()
                    else: await pump_toggle()

                elif cmd_type == "ESTOP":
                    await emergency_stop()

                elif cmd_type == "RELEASE_ESTOP":
                    await release_emergency_stop()

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    print("==================================================================")
    print("🚀 FIRE-X FASTAPI ROBOTICS BACKEND RUNNING")
    print("👉 Web Dashboard: http://localhost:8000")
    print("👉 WebSocket:     ws://localhost:8000/ws")
    print("==================================================================")
    uvicorn.run(app, host="0.0.0.0", port=8000)
