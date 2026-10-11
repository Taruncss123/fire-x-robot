# 🔥 FIRE-X Command Center

> **Strategic Risk & Fire Mitigation · Autonomous Tracked Fire-Fighting Rover Teleoperation & Telemetry Dashboard**

---

## 📸 Overview & Theme
**FIRE-X Command Center** is a high-performance single-page web dashboard engineered for live teleoperation, real-time sensor analytics, thermal hotspot tracking, and safety interlocked fire suppression for the **FIRE-X Tracked Rover**.

- **Aesthetic**: Minimalist neutral theme with warm cream (`#F5EFEB`), obsidian charcoal (`#0D0E11`, `#121316`), and tactical flame amber (`var(--primary): #D97706`).
- **One-Page Layout**: Consolidated responsive cockpit for laptops and mobile devices with zero route switches.
- **Fail-Safe & Interlocked**: Deadman 500 ms heartbeat watchdog, physical/software E-Stop, and **Human Detection Safety Lockout** (inhibits water pump if a person is in the sector).

---

## 🗂️ Project Structure

```
FIRE-X/
├── backend/                  # Node.js Express + WebSocket + MQTT Bridge
│   ├── package.json
│   └── server.js             # 10 Hz Telemetry, Deadman Watchdog, Batcher & Simulator
├── frontend/                 # Next.js 14 (React) + Tailwind CSS + Recharts
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css   # Contains CSS variable --primary
│   │   │   ├── layout.js
│   │   │   └── page.js       # Consolidated single-page dashboard
│   │   └── components/
│   │       ├── Navbar.jsx            # Honest connection state, mode, battery, clock
│   │       ├── Banners.jsx           # E-Stop, Person Detected, Demo mode banners
│   │       ├── PipelineTracker.jsx   # SENSE -> ANALYZE -> LOCATE -> NAVIGATE -> AIM -> SUPPRESS -> VERIFY
│   │       ├── ControlSection.jsx    # Gaming-style WASD/arrows, D-Pad, Pump R/F/E, Pan/Tilt, E-Stop
│   │       ├── GasDensityPanel.jsx   # MQ-2 & MQ-5 Relative Risk Index (0-100%)
│   │       ├── TemperaturePanel.jsx  # DS18B20 x2, DHT22 temp & humidity + live Recharts graph
│   │       ├── LiveThermalPanel.jsx  # AMG8833 8x8 smooth interpolated canvas heatmap + Pi stream
│   │       ├── FireConfidencePanel.jsx# 0-100 composite confidence (Flame 30%, Thermal 25%, Temp 25%, Smoke 20%)
│   │       ├── DataLogSection.jsx    # 5-min batch table, CSV exporter, date filter & trend graph
│   │       ├── AlertsTimeline.jsx    # Chronological incident and safety alert feed
│   │       └── FooterStatusStrip.jsx # Honest links, MQTT state, packet age & deadman
│   ├── public/
│   │   └── logo.jpg          # Emblem logo (Myth Annihilator)
│   ├── jsconfig.json
│   ├── tailwind.config.js
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md       # Technical specs, MQTT topics, JSON schemas, safety rules
│   └── FIRESTORE_RULES.md    # Firebase collection schemas & recommended security rules
├── esp32_firex/
│   └── esp32_firex.ino       # ESP32 C++ firmware for motor drivers, sensors & pump
├── .env.example              # Sample environment variables
├── package.json              # Root workspace orchestrator
├── run-dev.js                # Root dual-process runner
└── README.md
```

---

## 🕹️ Keyboard Controls Reference (Gaming Style)

| Key | Function | Detail |
| :--- | :--- | :--- |
| <kbd>W</kbd> | **Drive Forward** | Dual track drive forward |
| <kbd>S</kbd> | **Drive Reverse** | Dual track drive backward |
| <kbd>A</kbd> | **Turn Left** | Skid steer left |
| <kbd>D</kbd> | **Turn Right** | Skid steer right |
| <kbd>W</kbd>+<kbd>A</kbd> / <kbd>W</kbd>+<kbd>D</kbd> | **Arc Turns** | Smooth diagonal steering |
| <kbd>Shift</kbd> | **Precision Speed** | Toggles Slow speed ($0.3\text{ m/s}$) while held |
| <kbd>Space</kbd> | **Immediate Brake / Stop** | Stops drive motors instantly |
| <kbd>↑</kbd> <kbd>↓</kbd> | **Cannon Tilt** | Adjusts water nozzle tilt ($0^\circ - 90^\circ$) |
| <kbd>←</kbd> <kbd>→</kbd> | **Cannon Pan** | Adjusts water nozzle pan ($0^\circ - 180^\circ$) |
| <kbd>R</kbd> | **Pump ON** | Activates high-pressure water pump |
| <kbd>F</kbd> | **Pump OFF** | Deactivates water pump |
| <kbd>E</kbd> | **Toggle Pump** | Toggles pump state |
| <kbd>Esc</kbd> | **EMERGENCY STOP** | Cuts all motors & pump; locks controls until reset |

> 🛡️ **Safety Guard**: Keyboard movement automatically dispatches `STOP` when the browser tab is hidden, window blurred, or focus lost. Releasing keys sends `STOP`.

---

## 🚀 Quickstart & How to Run

### Prerequisites
- Node.js `v18+` or `v20+` or `v24+`
- npm `v9+` or `v10+`

### 1. Install Dependencies
```bash
# In the project root:
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Start Both Servers (One Command)
From the root directory:
```bash
npm run dev
```
Or start individually in separate terminals:
- **Backend**: `cd backend && npm run dev` *(Runs on `http://localhost:5001` with WebSocket on port 5001)*
- **Frontend**: `cd frontend && npm run dev` *(Runs Next.js on `http://localhost:3000`)*

### 3. Open the Dashboard
Navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## 📡 Free MQTT Broker Setup (HiveMQ / EMQX)

### Option A: Public Free Broker (Zero Setup, Ready Out-of-the-box)
The default `.env` is already configured for the free EMQX public broker:
```env
MQTT_BROKER_URL=mqtt://broker.emqx.io:1883
```

### Option B: Free HiveMQ Cloud (Private & Encrypted)
1. Sign up at [hivemq.com/cloud](https://www.hivemq.com/cloud/) (Free tier: 100 devices).
2. Create a cluster and add a credential (username + password).
3. Update `.env`:
   ```env
   MQTT_BROKER_URL=tls://YOUR_CLUSTER_URL.hivemq.cloud:8883
   MQTT_USERNAME=your_username
   MQTT_PASSWORD=your_password
   ```

---

## ☁️ Firebase Firestore Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com/).
2. Enable **Firestore Database** in test mode or production mode.
3. In Project Settings → Service Accounts, click **Generate new private key**.
4. In `.env`:
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```
*(Note: If Firebase credentials are not provided, the backend automatically uses in-memory and local JSON persistence so batching, CSV export, and history ALWAYS work seamlessly in DEMO and presentation mode!)*

---

## 🌐 Public Deployment (Showing the Faculty)

### 1. Frontend on Vercel
1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Set **Root Directory** to `frontend`.
4. Add Environment Variable:
   - `NEXT_PUBLIC_WS_URL`: `wss://your-backend.railway.app`
5. Click **Deploy**.

### 2. Backend on Railway or Render
1. In [railway.app](https://railway.app) or [render.com](https://render.com), create a new service from your repo.
2. Set **Root Directory** to `backend`.
3. Set build command: `npm install`, start command: `npm start`.
4. Add environment variables from `.env`.
5. Copy the generated public URL (e.g. `https://firex-backend.up.railway.app`) and use `wss://...` as `NEXT_PUBLIC_WS_URL` in Vercel.

---

## ✅ Acceptance Verification

- [x] **One-Page Layout**: Consolidated on a single page with zero route changes.
- [x] **WASD + Arrows + Space + Shift + Esc**: Full gaming-style keyboard teleoperation with on-screen visual key overlay.
- [x] **Emergency Stop Lockout**: Halts all propulsion and pump; controls locked until operator clicks `ARM / RESET`.
- [x] **Person Detected Interlock**: Automatically shuts off pump and blocks pump ignition when human is detected.
- [x] **Honest Link States**: Clear `LIVE`, `DEMO`, and `STALE (>5s)` badges; stale data is greyed out.
- [x] **AMG8833 Thermal Heatmap**: Smooth canvas interpolation with iron/inferno palette, max temp, hotspot direction, and target crosshair.
- [x] **5-Minute Telemetry Log**: Stored batch records, trend graph, and instant CSV export button.
- [x] **Built-in Demo Simulator**: Complete fire incident scenario (gas rise → thermal hotspot → fire confirmation → water suppression → cool-down).
