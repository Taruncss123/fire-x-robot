"use client";

import React from "react";
import { AlertTriangle, Flame, ShieldAlert, UserX, RotateCcw } from "lucide-react";

export default function Banners({
  isDemoMode,
  estop,
  personDetected,
  onSimulateFire,
  onResetSim,
  onReleaseEstop,
  onTogglePerson
}) {
  return (
    <div className="flex flex-col gap-2 px-4 sm:px-6 xl:px-8 pt-3 w-full">

      {/* E-STOP Banner */}
      {estop && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-red-50 border-2 border-red-400 text-red-800 shadow-sm alarm-glow">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 animate-bounce" />
            <div>
              <div className="font-bold text-sm tracking-wide uppercase font-mono">
                EMERGENCY STOP ENGAGED · ALL SYSTEMS LOCKED
              </div>
              <p className="text-xs text-red-600">Propulsion, steering & cannon locked. Press RELEASE to restore control.</p>
            </div>
          </div>
          <button
            onClick={onReleaseEstop}
            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold font-mono text-xs uppercase tracking-wider transition-all shadow"
          >
            Release E-Stop · Arm Rover
          </button>
        </div>
      )}

      {/* Person Detected Banner */}
      {personDetected && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-800 shadow-sm">
          <div className="flex items-center gap-3">
            <UserX className="w-5 h-5 text-amber-500 flex-shrink-0 animate-pulse" />
            <div>
              <div className="font-bold text-xs sm:text-sm tracking-wide uppercase font-mono">
                SAFETY LOCK: PERSON DETECTED IN ROVER SECTOR
              </div>
              <p className="text-[11px] text-amber-600">Water pump automatically OFF — cannon locked to prevent injury.</p>
            </div>
          </div>
          <button
            onClick={() => onTogglePerson(false)}
            className="px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-400 text-amber-800 text-xs font-mono font-bold transition-all"
          >
            Clear Person Flag
          </button>
        </div>
      )}

      {/* Demo Mode Bar */}
      {isDemoMode && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl border border-[#C2601F]/30 text-xs font-mono"
          style={{ background: "rgba(194,96,31,0.06)" }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--primary)" }} />
            <span className="font-bold text-[#C2601F] tracking-wide">DEMO SIMULATOR ACTIVE</span>
            <span className="text-[#9E8D7A] hidden md:inline">— Simulating rover sensors, thermal & water pump telemetry.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSimulateFire(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold tracking-wide transition-all shadow-sm"
            >
              <Flame className="w-3.5 h-3.5" />
              Simulate Fire Scenario
            </button>
            <button
              onClick={onResetSim}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2EDE6] hover:bg-[#E8E0D5] border border-[#D4C9B8] text-[#6B5C4C] text-[11px] font-semibold transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Ambient
            </button>
            <button
              onClick={() => onTogglePerson(!personDetected)}
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                personDetected
                  ? "bg-amber-100 border-amber-400 text-amber-800"
                  : "bg-[#F2EDE6] border-[#D4C9B8] text-[#6B5C4C] hover:bg-[#E8E0D5]"
              }`}
            >
              {personDetected ? "Clear Person" : "Detect Person"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
