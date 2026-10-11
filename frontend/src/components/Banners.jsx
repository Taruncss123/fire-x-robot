"use client";

import React from "react";
import { AlertTriangle, Flame, ShieldAlert, UserX, CheckCircle, RotateCcw } from "lucide-react";

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
    <div className="flex flex-col gap-2 px-3 sm:px-6 pt-3 max-w-[1720px] mx-auto w-full">
      
      {/* 1. Emergency Stop Lockdown Banner */}
      {estop && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-red-950/90 border-2 border-red-500 text-red-200 shadow-lg shadow-red-950/50 alarm-glow">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 animate-bounce" />
            <div>
              <div className="font-bold text-sm tracking-wide text-white uppercase font-mono">
                EMERGENCY STOP ENGAGED · MOTORS &amp; WATER PUMP LOCKED
              </div>
              <p className="text-xs text-red-300">
                Rover propulsion, steering and water cannon are locked out until cleared by the operator.
              </p>
            </div>
          </div>
          <button
            onClick={onReleaseEstop}
            className="px-4 py-1.5 rounded-md bg-white text-red-900 hover:bg-red-100 font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-md"
          >
            RELEASE E-STOP / ARM ROVER
          </button>
        </div>
      )}

      {/* 2. Person Detected Safety Interlock Banner */}
      {personDetected && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-amber-950/90 border-2 border-amber-500 text-amber-200 shadow-md">
          <div className="flex items-center gap-3">
            <UserX className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
            <div>
              <div className="font-bold text-xs sm:text-sm tracking-wide text-white uppercase font-mono">
                SAFETY INTERLOCK: PERSON DETECTED IN ROVER SECTOR
              </div>
              <p className="text-[11px] text-amber-300">
                Water pump is automatically locked OFF to prevent human injury. Cannon aim locked to target safety zone.
              </p>
            </div>
          </div>
          <button
            onClick={() => onTogglePerson(false)}
            className="px-3 py-1 rounded bg-amber-900/80 hover:bg-amber-800 border border-amber-600/50 text-amber-200 text-xs font-mono font-medium transition-all"
          >
            Clear Person Flag
          </button>
        </div>
      )}

      {/* 3. Demo Mode Banner with Quick Interactive Scenario Buttons */}
      {isDemoMode && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-lg bg-[#16171D] border border-[#D97706]/40 text-[#EAE2D5] text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
            <span className="font-bold text-[#F5EFEB] tracking-wide">
              DEMO SIMULATOR ACTIVE:
            </span>
            <span className="text-[#A6987E] hidden md:inline">
              Simulating autonomous rover sensors, thermal camera &amp; water pump telemetry.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSimulateFire(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/70 border border-red-700/60 hover:bg-red-900 text-red-200 text-[11px] font-semibold transition-all"
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>Simulate Fire Scenario</span>
            </button>
            <button
              onClick={onResetSim}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Reset to Ambient</span>
            </button>
            <button
              onClick={() => onTogglePerson(!personDetected)}
              className={`px-2 py-1 rounded border text-[11px] font-medium transition-all ${
                personDetected 
                  ? 'bg-amber-900/80 border-amber-600 text-amber-200' 
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {personDetected ? "Simulate: Clear Person" : "Simulate: Detect Person"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
