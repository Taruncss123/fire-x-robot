"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Gamepad2, 
  Droplets, 
  ShieldAlert, 
  RotateCcw, 
  Crosshair, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Square,
  Radio
} from "lucide-react";

export default function ControlSection({ 
  telemetry = {},
  isDemoMode = true,
  onSendCommand,
  onEmergencyStop,
  onReleaseEstop,
  onSetMode,
  onTogglePump,
  onSetPump,
  onAimCannon,
  personDetected = false
}) {
  const movement = telemetry.movement || "STOP";
  const pumpState = !!telemetry.pump;
  const currentMode = telemetry.mode || "MANUAL";
  const isEstop = !!telemetry.estop;
  const cannonLock = !!telemetry.cannon_lock || personDetected;
  const panAngle = telemetry.pan ?? 90;
  const tiltAngle = telemetry.tilt ?? 45;

  // Active keyboard tracking
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [speedLevel, setSpeedLevel] = useState("NORMAL"); // "SLOW", "NORMAL", "TURBO"

  // Base speed value
  const getSpeedValue = useCallback(() => {
    if (activeKeys.has("Shift") || speedLevel === "SLOW") return 0.3;
    if (speedLevel === "TURBO") return 1.0;
    return 0.6; // NORMAL
  }, [activeKeys, speedLevel]);

  // Movement command dispatcher with 100ms interval while keys are held
  const activeKeysRef = useRef(activeKeys);
  activeKeysRef.current = activeKeys;
  const getSpeedValueRef = useRef(getSpeedValue);
  getSpeedValueRef.current = getSpeedValue;

  const sendMoveCmd = useCallback((dir, speed) => {
    if (isEstop) return;
    onSendCommand({ type: "move", dir, speed });
  }, [isEstop, onSendCommand]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing inside form inputs
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        return;
      }

      const key = e.key;

      // Prevent window scrolling on arrow keys or space
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(key)) {
        e.preventDefault();
      }

      // Emergency Stop on Escape
      if (key === "Escape") {
        e.preventDefault();
        onEmergencyStop();
        return;
      }

      // Immediate stop on Space
      if (key === " ") {
        e.preventDefault();
        sendMoveCmd("STOP", 0);
        return;
      }

      // Water Pump controls: R for ON, F for OFF, E for Toggle
      if (key === "r" || key === "R") {
        e.preventDefault();
        if (personDetected) {
          alert("SAFETY INTERLOCK: Cannot turn ON water pump while PERSON is detected!");
          return;
        }
        onSetPump(true);
        return;
      }

      if (key === "f" || key === "F") {
        e.preventDefault();
        onSetPump(false);
        return;
      }

      if (key === "e" || key === "E") {
        e.preventDefault();
        if (!pumpState && personDetected) {
          alert("SAFETY INTERLOCK: Cannot engage water pump while PERSON is detected!");
          return;
        }
        onTogglePump();
        return;
      }

      // Pan / Tilt Aim Controls via Arrow Keys
      if (key === "ArrowUp") {
        e.preventDefault();
        onAimCannon(panAngle, Math.min(90, tiltAngle + 5));
        return;
      }
      if (key === "ArrowDown") {
        e.preventDefault();
        onAimCannon(panAngle, Math.max(0, tiltAngle - 5));
        return;
      }
      if (key === "ArrowLeft") {
        e.preventDefault();
        onAimCannon(Math.max(0, panAngle - 5), tiltAngle);
        return;
      }
      if (key === "ArrowRight") {
        e.preventDefault();
        onAimCannon(Math.min(180, panAngle + 5), tiltAngle);
        return;
      }

      // Track Drive Keys (WASD + Shift)
      const lower = key.toLowerCase();
      if (["w", "a", "s", "d", "shift"].includes(lower) || key === "Shift") {
        setActiveKeys(prev => {
          const next = new Set(prev);
          next.add(key === "Shift" ? "Shift" : lower);
          return next;
        });
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key;
      const lower = key.toLowerCase();
      if (["w", "a", "s", "d", "shift"].includes(lower) || key === "Shift") {
        setActiveKeys(prev => {
          const next = new Set(prev);
          next.delete(key === "Shift" ? "Shift" : lower);
          return next;
        });
      }
    };

    // Safety: Send STOP on window blur, tab hidden, or focus loss
    const handleSafetyBlur = () => {
      setActiveKeys(new Set());
      sendMoveCmd("STOP", 0);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleSafetyBlur);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) handleSafetyBlur();
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleSafetyBlur);
    };
  }, [isEstop, pumpState, personDetected, panAngle, tiltAngle, onEmergencyStop, onSetPump, onTogglePump, onAimCannon, sendMoveCmd]);

  // 10 Hz Movement Command Loop when Drive keys are held
  useEffect(() => {
    const timer = setInterval(() => {
      const keys = activeKeysRef.current;
      const speed = getSpeedValueRef.current();

      const hasW = keys.has("w");
      const hasS = keys.has("s");
      const hasA = keys.has("a");
      const hasD = keys.has("d");

      let dir = "STOP";
      if (hasW && hasA) dir = "ARC_LEFT";
      else if (hasW && hasD) dir = "ARC_RIGHT";
      else if (hasS && hasA) dir = "REV_LEFT";
      else if (hasS && hasD) dir = "REV_RIGHT";
      else if (hasW) dir = "FORWARD";
      else if (hasS) dir = "BACKWARD";
      else if (hasA) dir = "LEFT";
      else if (hasD) dir = "RIGHT";

      if (dir !== "STOP") {
        sendMoveCmd(dir, speed);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [sendMoveCmd]);

  // When all keys released, ensure STOP is sent
  const prevKeyCountRef = useRef(0);
  useEffect(() => {
    const driveKeys = ["w", "a", "s", "d"];
    const hasDriveKey = driveKeys.some(k => activeKeys.has(k));
    if (!hasDriveKey && prevKeyCountRef.current > 0) {
      sendMoveCmd("STOP", 0);
    }
    prevKeyCountRef.current = activeKeys.size;
  }, [activeKeys, sendMoveCmd]);

  return (
    <div className="card-panel p-4 md:p-5 relative border-[#D4C9B8]">
      
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#D4C9B8]">
        <div className="flex items-center gap-2.5">
          <Gamepad2 className="w-5 h-5 text-[#C2601F]" />
          <div>
            <h2 className="font-mono text-sm sm:text-base font-bold uppercase tracking-wider text-[#1A1612]">
              Rover Teleoperation &amp; Water Cannon Hub
            </h2>
            <p className="text-[11px] text-[#9E8D7A] font-mono">
              10 Hz Responsive Stream · Deadman Watchdog (500ms) · Interlocked
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-[#F2EDE6] border border-[#D4C9B8] text-[#4A3C30]">
            MOTION: <strong className="text-[#C2601F]">{movement}</strong>
          </span>
          <span className={`px-2.5 py-1 rounded-md border font-semibold ${
            pumpState ? 'bg-cyan-100 border-cyan-400 text-cyan-800 animate-pulse' : 'bg-[#F2EDE6] border-[#D4C9B8] text-[#9E8D7A]'
          }`}>
            PUMP: <strong>{pumpState ? "ON (DISCHARGING)" : "OFF"}</strong>
          </span>
          <span className={`px-2.5 py-1 rounded-md border font-semibold ${
            cannonLock ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-emerald-100 border-emerald-400 text-emerald-800'
          }`}>
            CANNON: {cannonLock ? "LOCKED (SAFETY)" : "ARMED"}
          </span>
        </div>
      </div>

      {/* Main Grid: D-Pad / Movement + Action & Cannon Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT / CENTER: Movement & Virtual D-Pad (Columns 1-7) */}
        <div className="lg:col-span-7 bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#D4C9B8]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#C2601F]" />
                <span className="font-mono text-xs font-bold text-[#1A1612] uppercase">
                  Drive Propulsion &amp; Skid Steering
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#9E8D7A]">
                SPEED: {speedLevel} ({getSpeedValue().toFixed(1)} m/s)
              </span>
            </div>

            {/* D-Pad & Key Indicators Layout */}
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-2">
              
              {/* Virtual Touch D-Pad */}
              <div className="grid grid-cols-3 gap-2 w-48 h-48 select-none">
                <div />
                <button
                  onMouseDown={() => sendMoveCmd("FORWARD", getSpeedValue())}
                  onMouseUp={() => sendMoveCmd("STOP", 0)}
                  onTouchStart={(e) => { e.preventDefault(); sendMoveCmd("FORWARD", getSpeedValue()); }}
                  onTouchEnd={(e) => { e.preventDefault(); sendMoveCmd("STOP", 0); }}
                  className={`flex flex-col items-center justify-center rounded-xl border font-mono font-bold transition-all shadow-sm ${
                    movement === "FORWARD" 
                      ? "bg-[#C2601F] text-white border-[#A34E18] shadow-md shadow-[#C2601F]/30 scale-95" 
                      : "bg-[#FAF7F4] hover:bg-[#EDE8E0] border-[#D4C9B8] text-[#1A1612]"
                  }`}
                  title="Forward (W)"
                >
                  <ArrowUp className="w-6 h-6" />
                  <span className="text-[10px]">FWD (W)</span>
                </button>
                <div />

                <button
                  onMouseDown={() => sendMoveCmd("LEFT", getSpeedValue())}
                  onMouseUp={() => sendMoveCmd("STOP", 0)}
                  onTouchStart={(e) => { e.preventDefault(); sendMoveCmd("LEFT", getSpeedValue()); }}
                  onTouchEnd={(e) => { e.preventDefault(); sendMoveCmd("STOP", 0); }}
                  className={`flex flex-col items-center justify-center rounded-xl border font-mono font-bold transition-all shadow-sm ${
                    movement === "LEFT" 
                      ? "bg-[#C2601F] text-white border-[#A34E18] shadow-md shadow-[#C2601F]/30 scale-95" 
                      : "bg-[#FAF7F4] hover:bg-[#EDE8E0] border-[#D4C9B8] text-[#1A1612]"
                  }`}
                  title="Turn Left (A)"
                >
                  <ArrowLeft className="w-6 h-6" />
                  <span className="text-[10px]">LEFT (A)</span>
                </button>

                <button
                  onClick={() => sendMoveCmd("STOP", 0)}
                  className={`flex flex-col items-center justify-center rounded-xl border font-mono font-bold transition-all shadow-sm ${
                    movement === "STOP"
                      ? "bg-red-600 border-red-700 text-white shadow-md shadow-red-600/30"
                      : "bg-[#FAF7F4] hover:bg-stone-200 border-[#D4C9B8] text-stone-700"
                  }`}
                  title="Brake / Stop (Space)"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span className="text-[10px]">STOP</span>
                </button>

                <button
                  onMouseDown={() => sendMoveCmd("RIGHT", getSpeedValue())}
                  onMouseUp={() => sendMoveCmd("STOP", 0)}
                  onTouchStart={(e) => { e.preventDefault(); sendMoveCmd("RIGHT", getSpeedValue()); }}
                  onTouchEnd={(e) => { e.preventDefault(); sendMoveCmd("STOP", 0); }}
                  className={`flex flex-col items-center justify-center rounded-xl border font-mono font-bold transition-all shadow-sm ${
                    movement === "RIGHT" 
                      ? "bg-[#C2601F] text-white border-[#A34E18] shadow-md shadow-[#C2601F]/30 scale-95" 
                      : "bg-[#FAF7F4] hover:bg-[#EDE8E0] border-[#D4C9B8] text-[#1A1612]"
                  }`}
                  title="Turn Right (D)"
                >
                  <ArrowRight className="w-6 h-6" />
                  <span className="text-[10px]">RIGHT (D)</span>
                </button>

                <div />
                <button
                  onMouseDown={() => sendMoveCmd("BACKWARD", getSpeedValue())}
                  onMouseUp={() => sendMoveCmd("STOP", 0)}
                  onTouchStart={(e) => { e.preventDefault(); sendMoveCmd("BACKWARD", getSpeedValue()); }}
                  onTouchEnd={(e) => { e.preventDefault(); sendMoveCmd("STOP", 0); }}
                  className={`flex flex-col items-center justify-center rounded-xl border font-mono font-bold transition-all shadow-sm ${
                    movement === "BACKWARD" 
                      ? "bg-[#C2601F] text-white border-[#A34E18] shadow-md shadow-[#C2601F]/30 scale-95" 
                      : "bg-[#FAF7F4] hover:bg-[#EDE8E0] border-[#D4C9B8] text-[#1A1612]"
                  }`}
                  title="Reverse (S)"
                >
                  <ArrowDown className="w-6 h-6" />
                  <span className="text-[10px]">REV (S)</span>
                </button>
                <div />
              </div>

              {/* Visual Keyboard Overlay */}
              <div className="flex flex-col gap-2 font-mono text-xs bg-[#FAF7F4] p-3 rounded-xl border border-[#D4C9B8]">
                <div className="text-[10px] text-[#9E8D7A] font-bold uppercase tracking-wider mb-1">
                  ⌨️ KEYBOARD MONITOR
                </div>
                
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div />
                  <div className={`keycap-box p-1.5 border text-xs ${activeKeys.has("w") ? "bg-[#C2601F] text-white border-[#A34E18]" : "bg-[#EDE8E0] border-[#C0AD99] text-[#4A3C30]"}`}>
                    W
                  </div>
                  <div />
                  <div className={`keycap-box p-1.5 border text-xs ${activeKeys.has("a") ? "bg-[#C2601F] text-white border-[#A34E18]" : "bg-[#EDE8E0] border-[#C0AD99] text-[#4A3C30]"}`}>
                    A
                  </div>
                  <div className={`keycap-box p-1.5 border text-xs ${activeKeys.has("s") ? "bg-[#C2601F] text-white border-[#A34E18]" : "bg-[#EDE8E0] border-[#C0AD99] text-[#4A3C30]"}`}>
                    S
                  </div>
                  <div className={`keycap-box p-1.5 border text-xs ${activeKeys.has("d") ? "bg-[#C2601F] text-white border-[#A34E18]" : "bg-[#EDE8E0] border-[#C0AD99] text-[#4A3C30]"}`}>
                    D
                  </div>
                </div>

                <div className="flex gap-1.5 mt-1 text-[10px]">
                  <span className={`keycap-box px-2 py-1 border flex-1 ${activeKeys.has("Shift") ? "bg-[#C2601F] text-white border-[#A34E18]" : "bg-[#EDE8E0] border-[#C0AD99] text-[#6B5C4C]"}`}>
                    Shift: Slow (0.3m/s)
                  </span>
                  <span className="keycap-box px-2 py-1 bg-[#EDE8E0] border border-[#C0AD99] text-[#6B5C4C] flex-1">
                    Space: Stop
                  </span>
                </div>
              </div>

            </div>

            {/* Speed Level Radio Selector */}
            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#D4C9B8] text-xs font-mono">
              <span className="text-[#9E8D7A]">SPEED PROFILE:</span>
              <div className="flex gap-1 bg-[#FAF7F4] p-1 rounded-lg border border-[#D4C9B8]">
                {["SLOW", "NORMAL", "TURBO"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSpeedLevel(lvl)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      speedLevel === lvl 
                        ? "bg-[#C2601F] text-white shadow-sm" 
                        : "text-[#6B5C4C] hover:text-[#1A1612]"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Action Controls, Water Cannon & Emergency Stop (Columns 8-12) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          
          {/* Water Pump Action Card */}
          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-3.5">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D4C9B8]">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-600" />
                <span className="font-mono text-xs font-bold text-[#1A1612] uppercase">
                  Water Cannon Pump
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#9E8D7A]">
                KEYS: [R]=ON · [F]=OFF · [E]=TOGGLE
              </span>
            </div>

            {/* Big Dedicated Pump ON / OFF Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                disabled={personDetected || isEstop}
                onClick={() => onSetPump(true)}
                className={`py-3 px-3 rounded-lg font-mono font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  pumpState
                    ? "bg-cyan-600 text-white border-2 border-cyan-400 shadow-cyan-600/30"
                    : personDetected
                    ? "bg-[#E5DFD6] text-stone-400 border border-[#D4C9B8] cursor-not-allowed"
                    : "bg-cyan-50 hover:bg-cyan-100 border border-cyan-400 text-cyan-800"
                }`}
              >
                <Droplets className="w-4 h-4" />
                <span>PUMP ON (R)</span>
              </button>

              <button
                onClick={() => onSetPump(false)}
                className={`py-3 px-3 rounded-lg font-mono font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all border ${
                  !pumpState
                    ? "bg-[#FAF7F4] text-[#4A3C30] border-[#D4C9B8] hover:bg-[#EDE8E0]"
                    : "bg-red-100 hover:bg-red-200 border-red-400 text-red-800"
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>PUMP OFF (F)</span>
              </button>
            </div>

            {personDetected && (
              <div className="p-2 rounded bg-amber-100 border border-amber-400 text-amber-800 text-[11px] font-mono leading-tight">
                ⚠️ PUMP INHIBITED: Human detected in target sector!
              </div>
            )}
          </div>

          {/* Pan / Tilt Cannon Aiming Card */}
          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-3.5">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D4C9B8]">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#C2601F]" />
                <span className="font-mono text-xs font-bold text-[#1A1612] uppercase">
                  Cannon Pan &amp; Tilt Aim (Arrow Keys)
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#C2601F] font-bold">
                PAN: {panAngle}° · TILT: {tiltAngle}°
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
              <button
                onClick={() => onAimCannon(panAngle, Math.min(90, tiltAngle + 5))}
                className="p-2 rounded-lg bg-[#FAF7F4] hover:bg-[#EDE8E0] border border-[#D4C9B8] text-[#1A1612] flex flex-col items-center justify-center shadow-sm"
                title="Tilt Up (Up Arrow)"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#C2601F]" />
                <span className="text-[9px]">TILT + (↑)</span>
              </button>

              <button
                onClick={() => onAimCannon(panAngle, Math.max(0, tiltAngle - 5))}
                className="p-2 rounded-lg bg-[#FAF7F4] hover:bg-[#EDE8E0] border border-[#D4C9B8] text-[#1A1612] flex flex-col items-center justify-center shadow-sm"
                title="Tilt Down (Down Arrow)"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#C2601F]" />
                <span className="text-[9px]">TILT - (↓)</span>
              </button>

              <button
                onClick={() => onAimCannon(Math.max(0, panAngle - 5), tiltAngle)}
                className="p-2 rounded-lg bg-[#FAF7F4] hover:bg-[#EDE8E0] border border-[#D4C9B8] text-[#1A1612] flex flex-col items-center justify-center shadow-sm"
                title="Pan Left (Left Arrow)"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#C2601F]" />
                <span className="text-[9px]">PAN L (←)</span>
              </button>

              <button
                onClick={() => onAimCannon(Math.min(180, panAngle + 5), tiltAngle)}
                className="p-2 rounded-lg bg-[#FAF7F4] hover:bg-[#EDE8E0] border border-[#D4C9B8] text-[#1A1612] flex flex-col items-center justify-center shadow-sm"
                title="Pan Right (Right Arrow)"
              >
                <ArrowRight className="w-3.5 h-3.5 text-[#C2601F]" />
                <span className="text-[9px]">PAN R (→)</span>
              </button>
            </div>
          </div>

          {/* Operational Mode Selection Buttons */}
          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-3">
            <div className="text-[11px] font-mono text-[#9E8D7A] mb-2 font-bold uppercase">
              OPERATIONAL ROVER MODES
            </div>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
              {["MANUAL", "ASSISTED", "AUTO FIRE"].map((m) => (
                <button
                  key={m}
                  onClick={() => onSetMode(m)}
                  className={`py-2 px-1.5 rounded-lg border font-bold text-[11px] uppercase transition-all ${
                    currentMode === m 
                      ? "bg-[#C2601F] text-white border-[#A34E18] shadow-sm" 
                      : "bg-[#FAF7F4] hover:bg-[#EDE8E0] border-[#D4C9B8] text-[#6B5C4C] hover:text-[#1A1612]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* BIG RED EMERGENCY STOP & ARM / RESET */}
          <div className="flex gap-2">
            <button
              onClick={onEmergencyStop}
              className="flex-1 py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 border-2 border-red-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 alarm-glow"
              title="Emergency Stop (Esc)"
            >
              <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-pulse" />
              <span>EMERGENCY STOP (ESC)</span>
            </button>

            {isEstop && (
              <button
                onClick={onReleaseEstop}
                className="py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 border-2 border-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RESET / ARM</span>
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
