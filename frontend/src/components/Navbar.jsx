"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Wifi, 
  WifiOff, 
  ShieldAlert, 
  Battery, 
  BatteryCharging, 
  Clock, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Maximize2 
} from "lucide-react";

export default function Navbar({ 
  telemetry, 
  isDemoMode, 
  robotConnected, 
  isStale, 
  onToggleDemo,
  onResetSim,
  onSimulateFire
}) {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Connection badge state
  let connBadge = {
    bg: "bg-emerald-950/80 border-emerald-500/40 text-emerald-400",
    dot: "bg-emerald-400",
    label: "LIVE ROVER",
    sub: "FRESH DATA"
  };

  if (isDemoMode) {
    connBadge = {
      bg: "bg-amber-950/80 border-amber-500/40 text-amber-300",
      dot: "bg-amber-400",
      label: "DEMO MODE",
      sub: "SIMULATED DATA"
    };
  } else if (!robotConnected || isStale) {
    connBadge = {
      bg: "bg-zinc-900 border-zinc-700 text-zinc-400",
      dot: "bg-zinc-500",
      label: "NOT CONNECTED",
      sub: isStale ? "STALE (>5s)" : "OFFLINE"
    };
  }

  // Mode badge state
  const mode = telemetry?.mode || "MANUAL";
  let modeBadgeColor = "border-zinc-700 text-zinc-300 bg-zinc-900";
  if (mode === "EMERGENCY") {
    modeBadgeColor = "border-red-500/80 text-red-300 bg-red-950/80 alarm-glow";
  } else if (mode === "AUTO FIRE") {
    modeBadgeColor = "border-amber-500/80 text-amber-300 bg-amber-950/80";
  } else if (mode === "ASSISTED") {
    modeBadgeColor = "border-sky-500/80 text-sky-300 bg-sky-950/80";
  } else {
    modeBadgeColor = "border-[#D97706]/60 text-[#F5EFEB] bg-[#1E2026]";
  }

  const battery = telemetry?.battery ?? 88;

  return (
    <header className="sticky top-0 z-50 bg-[#121316]/95 backdrop-blur-md border-b border-[#252830] px-3 sm:px-6 py-2.5 transition-all">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-[#EAE2D5]/30 shadow-md shadow-black/40 bg-black flex-shrink-0">
            <Image 
              src="/logo.jpg" 
              alt="Myth Annihilator FIRE-X Logo" 
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-wider text-[#F5EFEB] font-mono">
                FIRE-X
              </h1>
              <span className="text-[10px] tracking-widest font-semibold px-1.5 py-0.5 rounded bg-[#D97706] text-black">
                COMMAND CENTER
              </span>
            </div>
            <p className="text-[11px] text-[#A6987E] tracking-tight hidden sm:block">
              MYTH ANNIHILATOR · STRATEGIC RISK &amp; FIRE MITIGATION
            </p>
          </div>
        </div>

        {/* Badges & Telemetry Quick Readouts */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs">
          
          {/* Honest Connection Badge */}
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-mono font-medium ${connBadge.bg}`}>
            <span className={`w-2 h-2 rounded-full ${connBadge.dot} animate-pulse`} />
            <span className="font-semibold">{connBadge.label}</span>
            <span className="opacity-75 hidden md:inline">({connBadge.sub})</span>
          </div>

          {/* Rover Mode Badge */}
          <div className={`px-2.5 py-1 rounded-md border text-[11px] font-mono font-bold uppercase tracking-wide ${modeBadgeColor}`}>
            MODE: {mode}
          </div>

          {/* Battery Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#17181D] border border-[#252830] text-[#EAE2D5] font-mono text-[11px]">
            <Battery className={`w-3.5 h-3.5 ${battery > 40 ? 'text-emerald-400' : battery > 20 ? 'text-amber-400' : 'text-red-400'}`} />
            <span className="font-semibold">{Math.round(battery)}%</span>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#17181D] border border-[#252830] text-[#EAE2D5] font-mono text-[11px] hidden sm:flex">
            <Clock className="w-3.5 h-3.5 text-[#D97706]" />
            <span>{timeStr || "00:00:00"}</span>
          </div>

          {/* Quick Demo Toggle Switch */}
          <button
            onClick={onToggleDemo}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all border ${
              isDemoMode 
                ? 'bg-[#D97706] text-black border-[#F5EFEB]/30 hover:bg-[#B45309]' 
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
            }`}
            title="Toggle between Live Hardware and Demo Simulator"
          >
            {isDemoMode ? "SIMULATOR: ON" : "SIMULATOR: OFF"}
          </button>

        </div>

      </div>
    </header>
  );
}
