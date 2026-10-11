"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Wifi, WifiOff, Battery, Clock, Flame } from "lucide-react";

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
    const updateTime = () => setTimeStr(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, []);

  // Connection badge
  let connBadge = { bg: "bg-emerald-100 border-emerald-300 text-emerald-800", dot: "bg-emerald-500", label: "LIVE", sub: "FRESH DATA" };
  if (isDemoMode) {
    connBadge = { bg: "bg-amber-100 border-amber-300 text-amber-800", dot: "bg-amber-500", label: "DEMO", sub: "SIMULATED" };
  } else if (!robotConnected || isStale) {
    connBadge = { bg: "bg-stone-200 border-stone-300 text-stone-500", dot: "bg-stone-400", label: "OFFLINE", sub: isStale ? "STALE >5s" : "DISCONNECTED" };
  }

  // Mode badge
  const mode = telemetry?.mode || "MANUAL";
  let modeBadge = "bg-stone-100 border-stone-300 text-stone-600";
  if (mode === "EMERGENCY") modeBadge = "bg-red-100 border-red-400 text-red-700 alarm-glow";
  else if (mode === "AUTO FIRE") modeBadge = "bg-orange-100 border-orange-400 text-orange-700";
  else if (mode === "ASSISTED") modeBadge = "bg-sky-100 border-sky-400 text-sky-700";
  else modeBadge = "bg-amber-50 border-amber-300 text-amber-800";

  const battery = telemetry?.battery ?? 88;
  const battColor = battery > 50 ? "text-emerald-700" : battery > 25 ? "text-amber-700" : "text-red-600";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#D4C9B8] backdrop-blur-sm"
      style={{ background: "rgba(248,244,239,0.95)" }}>
      <div className="w-full px-4 sm:px-6 xl:px-8 mx-auto flex flex-wrap items-center justify-between gap-3 py-3">

        <div className="flex items-center gap-3">
          <div className="w-[38px] h-[38px] min-w-[38px] min-h-[38px] rounded-full overflow-hidden border-2 border-[#C2601F]/40 shadow-sm bg-[#1A1612] flex-shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="FIRE-X Logo" className="w-full h-full object-cover" width="38" height="38" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold text-base tracking-wider text-[#1A1612]">FIRE-X</h1>
              <span className="text-[10px] tracking-widest font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: "var(--primary)" }}>COMMAND CENTER</span>
            </div>
            <p className="text-[10px] text-[#9E8D7A] tracking-tight hidden sm:block font-mono">
              MYTH ANNIHILATOR · STRATEGIC RISK & FIRE MITIGATION
            </p>
          </div>
        </div>

        {/* Right: Status Badges */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">

          {/* Connection */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${connBadge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${connBadge.dot}`} />
            <span>{connBadge.label}</span>
            <span className="opacity-60 hidden md:inline">({connBadge.sub})</span>
          </div>

          {/* Mode */}
          <div className={`px-2.5 py-1 rounded-md border text-[11px] font-bold uppercase tracking-wide ${modeBadge}`}>
            {mode}
          </div>

          {/* Battery */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#D4C9B8] bg-[#F2EDE6] text-[11px]">
            <Battery className={`w-3.5 h-3.5 ${battColor}`} />
            <span className={`font-bold ${battColor}`}>{Math.round(battery)}%</span>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#D4C9B8] bg-[#F2EDE6] text-[11px] text-[#6B5C4C] hidden sm:flex">
            <Clock className="w-3 h-3 text-[#C2601F]" />
            <span>{timeStr || "00:00:00"}</span>
          </div>

          {/* Demo Toggle */}
          <button
            onClick={onToggleDemo}
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border transition-all ${
              isDemoMode
                ? "text-white border-[#A34E18]"
                : "bg-stone-100 text-stone-500 border-stone-300 hover:bg-stone-200"
            }`}
            style={isDemoMode ? { background: "var(--primary)" } : {}}
            title="Toggle Demo / Live mode"
          >
            {isDemoMode ? "SIM ON" : "SIM OFF"}
          </button>

        </div>
      </div>
    </header>
  );
}
