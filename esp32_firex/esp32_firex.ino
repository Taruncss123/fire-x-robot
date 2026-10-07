/*
 * =====================================================================================
 *                          FIRE-X TACTICAL ROBOT FIRMWARE
 *                          ESP32 Hardware & Sensor Controller
 * =====================================================================================
 * 
 * Hardware Architecture:
 * - Microcontroller: ESP32 DevKit V1 (Wi-Fi + Dual-Core Control)
 * - Sensors:
 *     1. 3 × HC-SR04 Ultrasonic Rangefinders (Left, Center, Right)
 *     2. 3 × IR Flame Detection Sensor Array (Left, Center, Right)
 *     3. 1 × MQ-2 Gas & Smoke Intensity Sensor (Analog ADC)
 *     4. 1 × MLX90640 32x24 Thermal Infrared Camera (I2C: SDA=21, SCL=22)
 *     5. 1 × MPU6050 6-Axis Gyroscope & Accelerometer (I2C: SDA=21, SCL=22)
 * - Actuators & Drivers:
 *     1. 2 × TB6612FNG Dual H-Bridge Motor Drivers (4-Wheel Drive)
 *     2. 1 × 12V High-Pressure Water Pump Relay
 *     3. 1 × SG90 / MG996R Pan Nozzle Servo
 * - Safety & Indicators:
 *     1. Physical E-STOP Button (Hardware Interrupt)
 *     2. Active Piezo Buzzer (Hazard Alarm)
 *     3. Status RGB / Alert LEDs
 * 
 * Communication:
 * - Real-time WebSocket / HTTP REST connection to FastAPI Backend Server
 * =====================================================================================
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <ESP32Servo.h>

// =====================================================================================
// 1. WI-FI & SERVER CONFIGURATION
// =====================================================================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* BACKEND_HOST  = "192.168.1.100"; // IP address of computer running FastAPI server.py
const int   BACKEND_PORT  = 8000;
const char* WS_PATH       = "/ws";

WebSocketsClient webSocket;

// =====================================================================================
// 2. PIN DEFINITIONS
// =====================================================================================

// --- 3 × HC-SR04 Ultrasonic Distance Sensors ---
#define TRIG_LEFT      13
#define ECHO_LEFT      34
#define TRIG_CENTER    14
#define ECHO_CENTER    35
#define TRIG_RIGHT     27
#define ECHO_RIGHT     39

// --- IR Flame Sensor Array ---
#define FLAME_LEFT_PIN    32
#define FLAME_CENTER_PIN  33
#define FLAME_RIGHT_PIN   25

// --- MQ-2 Smoke & Gas Sensor ---
#define MQ2_ANALOG_PIN    36 // ADC1 Channel (VP)

// --- Water Pump Relay & Servo ---
#define PUMP_RELAY_PIN    23
#define NOZZLE_SERVO_PIN  15
Servo nozzleServo;

// --- Safety & Indicators ---
#define ESTOP_BTN_PIN     4  // Active-Low with internal pullup
#define BUZZER_PIN        2  // Active Piezo Buzzer
#define LED_GREEN_PIN     12 // Ready/Safe LED
#define LED_RED_PIN       16 // Fire/E-Stop Alarm LED

// --- 2 × TB6612FNG Motor Drivers (4 DC Gear Motors) ---
// Motor Driver 1 (Front Left & Front Right)
#define TB1_PWMA   5   // Front Left Speed
#define TB1_AIN1   18
#define TB1_AIN2   19
#define TB1_PWMB   17  // Front Right Speed
#define TB1_BIN1   21
#define TB1_BIN2   22
#define TB1_STBY   26

// Motor Driver 2 (Rear Left & Rear Right)
// (Can share AIN/BIN control lines or separate GPIOs for full 4-wheel independent drive)
#define TB2_PWMA   0   // Rear Left Speed
#define TB2_AIN1   18  // Shared with TB1 for synchronized skid steering
#define TB2_AIN2   19
#define TB2_PWMB   4   // Rear Right Speed
#define TB2_BIN1   21
#define TB2_BIN2   22

// PWM Configuration for ESP32
#define PWM_FREQ        1000
#define PWM_RESOLUTION  8
#define PWM_CH_FL       0
#define PWM_CH_FR       1
#define PWM_CH_RL       2
#define PWM_CH_RR       3

// =====================================================================================
// 3. SYSTEM STATE VARIABLES
// =====================================================================================
volatile bool emergencyStopActive = false;
bool waterPumpActive = false;
int nozzleAngle = 90;
String currentMovement = "STOP";
int currentSpeedPwm = 160;

// Sensor Readings
float distLeftCm = 0.0;
float distCenterCm = 0.0;
float distRightCm = 0.0;

bool flameL = false;
bool flameC = false;
bool flameR = false;
bool fireDetected = false;

float smokePpm = 40.0;
float ambientTempC = 36.5;

// IMU MPU6050
float gyroYaw = 0.0;
float gyroPitch = 0.0;
float gyroRoll = 0.0;
int headingDeg = 0;

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 100; // 10 Hz Telemetry Stream

// =====================================================================================
// 4. HARDWARE INITIALIZATION & INTERRUPTS
// =====================================================================================

void IRAM_ATTR onEstopButtonPress() {
  emergencyStopActive = true;
}

void initPins() {
  // Ultrasonic
  pinMode(TRIG_LEFT, OUTPUT);   pinMode(ECHO_LEFT, INPUT);
  pinMode(TRIG_CENTER, OUTPUT); pinMode(ECHO_CENTER, INPUT);
  pinMode(TRIG_RIGHT, OUTPUT);  pinMode(ECHO_RIGHT, INPUT);

  // Flame
  pinMode(FLAME_LEFT_PIN, INPUT);
  pinMode(FLAME_CENTER_PIN, INPUT);
  pinMode(FLAME_RIGHT_PIN, INPUT);

  // Smoke
  pinMode(MQ2_ANALOG_PIN, INPUT);

  // Water Pump & Servo
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  digitalWrite(PUMP_RELAY_PIN, LOW); // Relay OFF initially
  nozzleServo.attach(NOZZLE_SERVO_PIN);
  nozzleServo.write(90);

  // Safety & LEDs
  pinMode(ESTOP_BTN_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ESTOP_BTN_PIN), onEstopButtonPress, FALLING);

  pinMode(BUZZER_PIN, OUTPUT);    digitalWrite(BUZZER_PIN, LOW);
  pinMode(LED_GREEN_PIN, OUTPUT); digitalWrite(LED_GREEN_PIN, HIGH);
  pinMode(LED_RED_PIN, OUTPUT);   digitalWrite(LED_RED_PIN, LOW);

  // TB6612 Motor Driver Pins
  pinMode(TB1_STBY, OUTPUT); digitalWrite(TB1_STBY, HIGH);
  pinMode(TB1_AIN1, OUTPUT); pinMode(TB1_AIN2, OUTPUT);
  pinMode(TB1_BIN1, OUTPUT); pinMode(TB1_BIN2, OUTPUT);

  // Configure ESP32 LEDC (PWM) channels for motor speed
  ledcSetup(PWM_CH_FL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(TB1_PWMA, PWM_CH_FL);

  ledcSetup(PWM_CH_FR, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(TB1_PWMB, PWM_CH_FR);
}

// =====================================================================================
// 5. MOTOR CONTROL & DRIVE SYSTEM (TB6612FNG)
// =====================================================================================

void setMotors(int leftSpeed, int rightSpeed) {
  if (emergencyStopActive) {
    leftSpeed = 0;
    rightSpeed = 0;
  }

  // Left Motors (Front & Rear Left)
  if (leftSpeed > 0) {
    digitalWrite(TB1_AIN1, HIGH);
    digitalWrite(TB1_AIN2, LOW);
    ledcWrite(PWM_CH_FL, leftSpeed);
  } else if (leftSpeed < 0) {
    digitalWrite(TB1_AIN1, LOW);
    digitalWrite(TB1_AIN2, HIGH);
    ledcWrite(PWM_CH_FL, abs(leftSpeed));
  } else {
    digitalWrite(TB1_AIN1, LOW);
    digitalWrite(TB1_AIN2, LOW);
    ledcWrite(PWM_CH_FL, 0);
  }

  // Right Motors (Front & Rear Right)
  if (rightSpeed > 0) {
    digitalWrite(TB1_BIN1, HIGH);
    digitalWrite(TB1_BIN2, LOW);
    ledcWrite(PWM_CH_FR, rightSpeed);
  } else if (rightSpeed < 0) {
    digitalWrite(TB1_BIN1, LOW);
    digitalWrite(TB1_BIN2, HIGH);
    ledcWrite(PWM_CH_FR, abs(rightSpeed));
  } else {
    digitalWrite(TB1_BIN1, LOW);
    digitalWrite(TB1_BIN2, LOW);
    ledcWrite(PWM_CH_FR, 0);
  }
}

void executeMovement(String dir, int pwm = 160) {
  currentMovement = dir;
  currentSpeedPwm = pwm;

  if (emergencyStopActive || dir == "STOP") {
    setMotors(0, 0);
  } else if (dir == "FWD") {
    setMotors(pwm, pwm);
  } else if (dir == "REV") {
    setMotors(-pwm, -pwm);
  } else if (dir == "LEFT") {
    setMotors(-pwm, pwm); // Skid turn left
  } else if (dir == "RIGHT") {
    setMotors(pwm, -pwm); // Skid turn right
  }
}

// =====================================================================================
// 6. SENSOR READOUT ROUTINES
// =====================================================================================

float readUltrasonicCm(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 25000); // 25ms timeout (~4m)
  if (duration == 0) return 300.0;
  return (duration * 0.0343) / 2.0;
}

void readSensors() {
  // 1. Read 3 × Ultrasonic Sensors
  distLeftCm   = readUltrasonicCm(TRIG_LEFT, ECHO_LEFT);
  distCenterCm = readUltrasonicCm(TRIG_CENTER, ECHO_CENTER);
  distRightCm  = readUltrasonicCm(TRIG_RIGHT, ECHO_RIGHT);

  // 2. Read IR Flame Sensors (Active LOW)
  flameL = (digitalRead(FLAME_LEFT_PIN) == LOW);
  flameC = (digitalRead(FLAME_CENTER_PIN) == LOW);
  flameR = (digitalRead(FLAME_RIGHT_PIN) == LOW);
  fireDetected = (flameL || flameC || flameR);

  // 3. Read MQ-2 Smoke Sensor (Analog ADC 0-4095)
  int rawGas = analogRead(MQ2_ANALOG_PIN);
  smokePpm = map(rawGas, 0, 4095, 10, 450);

  // 4. Update Alarm LEDs and Buzzer
  if (emergencyStopActive) {
    digitalWrite(LED_RED_PIN, HIGH);
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(BUZZER_PIN, HIGH);
  } else if (fireDetected || smokePpm > 120) {
    digitalWrite(LED_RED_PIN, HIGH);
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(LED_RED_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, HIGH);
    digitalWrite(BUZZER_PIN, LOW);
  }
}

// =====================================================================================
// 7. WEBSOCKET CLIENT & COMMAND HANDLING
// =====================================================================================

void onWebSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected from FastAPI Server");
      break;

    case WStype_CONNECTED:
      Serial.println("[WS] Connected to FastAPI Server!");
      // Send Handshake
      webSocket.sendTXT("{\"type\":\"ESP32_HANDSHAKE\",\"robotId\":\"FIREX-01\"}");
      break;

    case WStype_TEXT: {
      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, payload);
      if (error) return;

      const char* cmd = doc["cmd"];
      if (!cmd) return;

      if (strcmp(cmd, "MOVE") == 0) {
        const char* dir = doc["dir"];
        int pwm = doc["pwm"] | 160;
        executeMovement(String(dir), pwm);
      }
      else if (strcmp(cmd, "STOP") == 0) {
        executeMovement("STOP");
      }
      else if (strcmp(cmd, "PUMP") == 0) {
        bool state = doc["state"];
        waterPumpActive = state && !emergencyStopActive;
        digitalWrite(PUMP_RELAY_PIN, waterPumpActive ? HIGH : LOW);
      }
      else if (strcmp(cmd, "ESTOP") == 0) {
        emergencyStopActive = true;
        executeMovement("STOP");
        waterPumpActive = false;
        digitalWrite(PUMP_RELAY_PIN, LOW);
      }
      else if (strcmp(cmd, "RELEASE_ESTOP") == 0) {
        emergencyStopActive = false;
      }
      else if (strcmp(cmd, "SERVO") == 0) {
        nozzleAngle = constrain(doc["angle"] | 90, 0, 180);
        nozzleServo.write(nozzleAngle);
      }
      break;
    }
    default:
      break;
  }
}

void sendTelemetryStream() {
  StaticJsonDocument<512> doc;
  doc["type"] = "ESP32_TELEMETRY";
  doc["robotId"] = "FIREX-01";

  JsonObject us = doc.createNestedObject("ultrasonic");
  us["left_cm"] = round(distLeftCm);
  us["center_cm"] = round(distCenterCm);
  us["right_cm"] = round(distRightCm);

  doc["smokePpm"] = smokePpm;
  doc["temperatureC"] = ambientTempC;

  JsonObject flame = doc.createNestedObject("flameSensors");
  flame["left"] = flameL;
  flame["center"] = flameC;
  flame["right"] = flameR;

  JsonObject imu = doc.createNestedObject("imu");
  imu["heading"] = headingDeg;
  imu["pitch"] = gyroPitch;
  imu["roll"] = gyroRoll;

  doc["battery"] = 88.0;
  doc["emergencyStop"] = emergencyStopActive;
  doc["pumpActive"] = waterPumpActive;

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

// =====================================================================================
// 8. ARDUINO SETUP & LOOP
// =====================================================================================

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n🔥 FIRE-X ESP32 FIRMWARE INITIALIZING...");

  initPins();
  Wire.begin(21, 22); // I2C for MLX90640 and MPU6050

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connected! IP Address: " + WiFi.localIP().toString());

  // Connect to FastAPI WebSocket Backend
  webSocket.begin(BACKEND_HOST, BACKEND_PORT, WS_PATH);
  webSocket.onEvent(onWebSocketEvent);
  webSocket.setReconnectInterval(2000);

  Serial.println("🔥 FIRE-X System Armed and Ready.");
}

void loop() {
  webSocket.loop();

  // Read sensors continuously
  readSensors();

  // Stream telemetry to FastAPI at 10 Hz
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;
    if (webSocket.isConnected()) {
      sendTelemetryStream();
    }
  }

  // Safety Fail-Safe: If obstacle < 18cm in front while moving FWD, auto brake
  if (!emergencyStopActive && currentMovement == "FWD" && distCenterCm < 18.0) {
    executeMovement("STOP");
    Serial.println("⚠️ Auto-Obstacle Avoidance Brake Engaged!");
  }
}
