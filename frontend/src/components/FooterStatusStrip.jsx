"use client";

import React from "react";
import { Radio, Database, Shield, Activity } from "lucide-react";

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
    color: "text-emerald-800 bg-emerald-50 border-emerald-300",
    dot: "bg-emerald-500 animate-pulse"
  };

  if (isDemoMode) {
    linkBadge = {
      label: "DEMO SIMULATOR",
      color: "text-amber-800 bg-amber-50 border-amber-300",
      dot: "bg-amber-500 animate-pulse"
    };
  } else if (!robotConnected || isStale) {
    linkBadge = {
      label: isStale ? "STALE (>5s) LINK" : "DISCONNECTED",
      color: "text-stone-500 bg-stone-100 border-stone-300",
      dot: "bg-stone-400"
    };
  }

  const mqttConnected = mqttStatus === "CONNECTED";

  return (
    <footer className="mt-6 border-t border-[#D4C9B8] bg-[#F8F4EF]/95 backdrop-blur px-4 sm:px-6 xl:px-8 py-3 text-xs font-mono">
      <div className="w-full mx-auto flex flex-wrap items-center justify-between gap-3 text-[#6B5C4C]">
        
        {/* Left Side: Health Status Badges */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-[11px]">
          
          {/* Rover Link Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold ${linkBadge.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${linkBadge.dot}`} />
            <span>{linkBadge.label}</span>
          </div>

          {/* MQTT State */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium ${
            mqttConnected ? "border-emerald-300 text-emerald-800 bg-emerald-50" : "border-stone-300 text-stone-500 bg-stone-100"
          }`}>
            <Radio className="w-3 h-3" />
            <span>MQTT: <strong>{mqttStatus}</strong></span>
          </div>

          {/* Firebase State */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-sky-300 text-sky-800 bg-sky-50 font-medium">
            <Database className="w-3 h-3" />
            <span>FIRESTORE: <strong>{firebaseStatus}</strong></span>
          </div>

          {/* Deadman Watchdog */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#D4C9B8] text-[#1A1612] bg-[#F2EDE6] font-medium">
            <Shield className="w-3 h-3 text-[#C2601F]" />
            <span>DEADMAN: <strong>500ms AUTO-HALT</strong></span>
          </div>

        </div>

        {/* Right Side: Packet Latency & Version */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 text-[#1A1612] bg-[#F2EDE6] px-2.5 py-1 rounded-md border border-[#D4C9B8]">
            <Activity className="w-3 h-3 text-[#C2601F]" />
            <span className="text-[#6B5C4C]">PACKET AGE:</span>
            <strong className={isStale ? "text-red-600" : "text-emerald-700"}>
              {packetAgeMs} ms
            </strong>
          </div>

          <span className="text-[#D4C9B8] hidden md:inline">·</span>

          <span className="text-[#9E8D7A] hidden md:inline">
            FIRE-X COMMAND CENTER · V2.0
          </span>
        </div>

      </div>
    </footer>
  );
}
