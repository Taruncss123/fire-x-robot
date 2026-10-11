"use client";

import React from "react";
import { Wifi, Radio, Database, Shield, Activity, Clock } from "lucide-react";

export default function FooterStatusStrip({ 
  robotConnected = false, 
  isDemoMode = true, 
  isStale = false, 
  packetAgeMs = 0, 
  mqttStatus = "CONNECTED", 
  firebaseStatus = "ACTIVE (LOCAL/FIRESTORE)" 
}) {
  let linkBadge = {
    label: "LIVE ROVER LINK",
    color: "text-emerald-400 bg-emerald-950/80 border-emerald-500/40",
    dot: "bg-emerald-400 animate-pulse"
  };

  if (isDemoMode) {
    linkBadge = {
      label: "DEMO SIMULATOR",
      color: "text-amber-400 bg-amber-950/80 border-amber-500/40",
      dot: "bg-amber-400 animate-pulse"
    };
  } else if (!robotConnected || isStale) {
    linkBadge = {
      label: isStale ? "STALE (>5s) LINK" : "DISCONNECTED",
      color: "text-zinc-400 bg-zinc-900 border-zinc-700",
      dot: "bg-zinc-600"
    };
  }

  const mqttConnected = mqttStatus === "CONNECTED";

  return (
    <footer className="mt-6 border-t border-[#252830] bg-[#121316]/90 backdrop-blur px-3 sm:px-6 py-2.5 text-xs font-mono">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3 text-[#A6987E]">
        
        {/* Left Side: Health Status Badges */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-[11px]">
          
          {/* Rover Link Badge */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${linkBadge.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${linkBadge.dot}`} />
            <span className="font-bold">{linkBadge.label}</span>
          </div>

          {/* MQTT State */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${
            mqttConnected ? "border-emerald-500/30 text-emerald-400 bg-emerald-950/30" : "border-zinc-700 text-zinc-400 bg-zinc-900"
          }`}>
            <Radio className="w-3 h-3" />
            <span>MQTT: <strong>{mqttStatus}</strong></span>
          </div>

          {/* Firebase State */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-sky-500/30 text-sky-400 bg-sky-950/30">
            <Database className="w-3 h-3" />
            <span>FIRESTORE: <strong>{firebaseStatus}</strong></span>
          </div>

          {/* Deadman Watchdog */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#252830] text-[#EAE2D5] bg-[#17181D]">
            <Shield className="w-3 h-3 text-[#D97706]" />
            <span>DEADMAN: <strong>500ms AUTO-HALT</strong></span>
          </div>

        </div>

        {/* Right Side: Packet Latency & Copyright */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1 text-[#EAE2D5]">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>PACKET AGE:</span>
            <strong className={isStale ? "text-red-400" : "text-emerald-400"}>
              {packetAgeMs} ms
            </strong>
          </div>

          <span className="text-[#7E766B] hidden md:inline">·</span>

          <span className="text-[#7E766B] hidden md:inline">
            FIRE-X COMMAND CENTER · V2.0
          </span>
        </div>

      </div>
    </footer>
  );
}
