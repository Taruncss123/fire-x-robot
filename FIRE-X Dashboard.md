# FIRE-X · Tactical Fire Detection & Extinguishing Robot System

**FIRE-X** is an autonomous and teleoperated fire-fighting robotics system built with an **ESP32 microcontroller**, **FastAPI / WebSocket Python backend**, and a **Single-Page Cream & Black Web Dashboard**.

---

## 🏗️ System Architecture

```
             ┌──────────────────┐
             │      ESP32       │
             │  Wi-Fi + Control │
             └────────┬─────────┘
                      │
       ┌──────────────┼───────────────┐
       │              │               │
   Sensors        Motor Driver     Safety
       │              │               │
 ┌─────┴─────┐   ┌────┴────┐     ┌────┴────┐
 │ HC-SR04 ×3│   │ TB6612  │     │ E-STOP  │
 │ IR        │   │ ×2      │     │ Buzzer  │
 │ MQ-2      │   └────┬────┘     │ LEDs    │
 │ MLX90640  │        │          └─────────┘
 │ MPU6050   │    4 × Motors
 └───────────┘
                      │
                 Robot Movement

                      Wi-Fi (WebSockets / HTTP REST)
                        │
                        ▼
              ┌──────────────────┐
              │ FastAPI / Backend │
              │   (server.py)    │
              └────────┬─────────┘
                       │
                       ▼ WebSockets (30 FPS)
              ┌──────────────────┐
              │ FIRE-X Dashboard │
              │   (index.html)   │
              └──────────────────┘
```

---

## 🎨 Theme: Luxury Cream & Obsidian Black
The web dashboard is styled in a high-contrast **Cream & Black** theme:
- **Background**: Obsidian Charcoal (`#090A0C` to `#121418`)
- **Card Surfaces**: Deep Slate (`#171A20` with borders `#2A303C`)
- **Primary Text & Accents**: Rich Cream (`#FFFDF7`, `#F7F2E7`, `#EFE8D8`)
- **Tactical Gold**: `#D4AF37`
- **Alarms & Actions**: Flame Red (`#FF3B30`), Water Cyan (`#00C7BE`), Safety Green (`#34C759`)

---

## 🕹️ Top-Right Controls & Keyboard Teleoperation

The robot navigation hub is located at the **top-right of the dashboard**:

| Key | Action | Function |
| :--- | :--- | :--- |
| <kbd>▲ Up Arrow</kbd> / <kbd>W</kbd> | **Forward** | Drive forward (4 motors) |
| <kbd>▼ Down Arrow</kbd> / <kbd>S</kbd> | **Reverse** | Drive backward (4 motors) |
| <kbd>◄ Left Arrow</kbd> / <kbd>A</kbd> | **Turn Left** | Skid steer left |
| <kbd>► Right Arrow</kbd> / <kbd>D</kbd> | **Turn Right** | Skid steer right |
| <kbd>Spacebar</kbd> | **Brake / Stop** | Immediate halt |
| <kbd>P</kbd> | **Water Pump** | Toggle 12V water pump on / off |
| <kbd>F</kbd> | **Simulate Fire** | Trigger demo fire detection |

---

## 📦 Pinout & Hardware Wiring (ESP32)

### 1. Ultrasonic Distance Array (3 × HC-SR04)
- **Left Sensor**: Trig = `GPIO 13`, Echo = `GPIO 34`
- **Front Sensor**: Trig = `GPIO 14`, Echo = `GPIO 35`
- **Right Sensor**: Trig = `GPIO 27`, Echo = `GPIO 39`

### 2. IR Flame Sensors
- **Left Flame**: `GPIO 32`
- **Center Flame**: `GPIO 33`
- **Right Flame**: `GPIO 25`

### 3. MQ-2 Gas & Smoke Intensity Sensor
- **Analog Output (A0)**: `GPIO 36 (ADC1_CH0 / VP)`
- **VCC / GND**: `5V` / `GND`

### 4. MLX90640 Thermal IR (32×24) & MPU6050 6-Axis IMU (I2C Bus)
- **SDA**: `GPIO 21`
- **SCL**: `GPIO 22`
- **MLX90640 I2C Address**: `0x33`
- **MPU6050 I2C Address**: `0x68`

### 5. 2 × TB6612FNG Dual H-Bridge Motor Drivers (4 DC Motors)
- **Front-Left Motor (TB1 PWMA, AIN1, AIN2)**: `GPIO 5 (PWM)`, `GPIO 18`, `GPIO 19`
- **Front-Right Motor (TB1 PWMB, BIN1, BIN2)**: `GPIO 17 (PWM)`, `GPIO 21`, `GPIO 22`
- **Rear-Left Motor (TB2 PWMA, AIN1, AIN2)**: `GPIO 0 (PWM)`, `GPIO 18`, `GPIO 19`
- **Rear-Right Motor (TB2 PWMB, BIN1, BIN2)**: `GPIO 4 (PWM)`, `GPIO 21`, `GPIO 22`
- **Standby (STBY)**: `GPIO 26` (Pulled HIGH)

### 6. Water Extinguisher System
- **12V DC Pump Relay**: `GPIO 23`
- **Nozzle Pan Servo (SG90/MG996R)**: `GPIO 15`

### 7. Safety, Alarms & Indicators
- **E-STOP Push Button**: `GPIO 4` (Active-LOW interrupt)
- **Active Piezo Buzzer**: `GPIO 2`
- **Status Green LED**: `GPIO 12`
- **Alarm Red LED**: `GPIO 16`

---

## 🚀 How to Run the System

### Step 1: Start the FastAPI Backend
```bash
python server.py
```
- Web Dashboard will be available at: **`http://localhost:8000`**
- WebSocket stream: **`ws://localhost:8000/ws`**

### Step 2: Flash the ESP32 Firmware
1. Open [`esp32_firex/esp32_firex.ino`](file:///d:/Fire%20-%20X/esp32_firex/esp32_firex.ino) in Arduino IDE.
2. Enter your Wi-Fi SSID, Password, and your computer's IP address.
3. Install libraries in Arduino IDE:
   - `WebSocketsClient` by Markus Sattler
   - `ArduinoJson` by Benoît Blanchon
   - `ESP32Servo` by Kevin Harrington
4. Click **Upload** to flash the ESP32.

### Step 3: Open Dashboard & Drive
- Open `http://localhost:8000` in your browser.
- Use your PC/Laptop **Arrow Keys** or **WASD** to drive the robot.
- Press **P** or click **START WATER PUMP** to spray water.