# Firestore Security Rules & Data Model for FIRE-X

## 1. Firestore Data Collections

### Collection: `batches`
Stores 5-minute periodic aggregated snapshots of the rover telemetry:
```javascript
{
  id: "BATCH_0001",
  timestamp: "2026-10-11T05:30:00.000Z",
  time: "11:00:00 AM",
  temp: 34.2,
  temp_chassis: 34.2,
  temp_electronics: 36.8,
  mq2_index: 24,
  mq5_index: 18,
  smoke_status: "LOW",
  flame_detected: false,
  thermal_max: 33.5,
  thermal_direction: "CENTER",
  battery_pct: 88,
  mode: "MANUAL",
  zone: "A",
  fire_confidence: 14,
  pump_status: "IDLE",
  estop_status: "NORMAL"
}
```

### Collection: `events`
Stores incident and safety events:
```javascript
{
  id: "evt_1791696000_123",
  ts: 1791696000000,
  time: "11:00:15 AM",
  title: "FIRE CONFIRMED",
  detail: "Thermal hotspot 78.5°C detected on RIGHT. Flame confirmed!",
  severity: "danger" // "info" | "safe" | "warning" | "danger"
}
```

---

## 2. Recommended Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Function to check authenticated operator role
    function isAuthenticated() {
      return request.auth != null;
    }

    // Telemetry batches: operators can read, authorized backend service can write
    match /batches/{batchId} {
      allow read: if true; // Allows public viewing for faculty presentation or authenticated
      allow create, update: if isAuthenticated() || request.auth.token.role == 'rover_backend';
      allow delete: if false; // Batches are immutable logs
    }

    // Incident event timeline
    match /events/{eventId} {
      allow read: if true;
      allow create: if isAuthenticated() || request.auth.token.role == 'rover_backend';
      allow update, delete: if false;
    }

    // Commands collection (if using Firestore-based command queueing)
    match /commands/{commandId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
    }
  }
}
```
