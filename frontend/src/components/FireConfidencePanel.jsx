"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, Flame, ShieldAlert, Sparkles } from "lucide-react";

export default function FireConfidencePanel({ 
  telemetry = {},
  fireConfidence = 12 
}) {
  const flame = !!telemetry.flame;
  const thermalMax = telemetry.thermal_max || 32;
  const temp = telemetry.temp || 34;
  const gasMax = Math.max(telemetry.mq2 || 0, telemetry.mq5 || 0);

  // Exact contribution values
  const flameVal = flame ? 30 : 0;
  const thermalVal = Math.round(Math.max(0, Math.min(25, ((thermalMax - 35) / 40) * 25)));
  const tempVal = Math.round(Math.max(0, Math.min(25, ((temp - 38) / 42) * 25)));
  const smokeVal = Math.round(Math.max(0, Math.min(20, (gasMax / 100) * 20)));

  // Bands configuration
  let band = {
    label: "SAFE",
    color: "text-emerald-400 bg-emerald-950/70 border-emerald-500/40",
    barColor: "bg-emerald-500",
    icon: ShieldCheck,
    desc: "No fire or hazardous ignition signatures detected."
  };

  if (fireConfidence >= 76) {
    band = {
      label: "FIRE CONFIRMED",
      color: "text-red-400 bg-red-950/90 border-red-500/80 alarm-glow",
      barColor: "bg-red-500",
      icon: Flame,
      desc: "CRITICAL: Multiple sensors confirm active flame combustion!"
    };
  } else if (fireConfidence >= 51) {
    band = {
      label: "FIRE SUSPECTED",
      color: "text-amber-400 bg-amber-950/80 border-amber-500/60",
      barColor: "bg-[#D97706]",
      icon: AlertTriangle,
      desc: "WARNING: High thermal & smoke correlation. Fire suspected."
    };
  } else if (fireConfidence >= 26) {
    band = {
      label: "WARNING",
      color: "text-yellow-400 bg-yellow-950/70 border-yellow-500/40",
      barColor: "bg-yellow-500",
      icon: AlertTriangle,
      desc: "Elevated temperature or gas index detected in vicinity."
    };
  }

  const BandIcon = band.icon;

  return (
    <div className="card-panel p-4 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#252830]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#D97706]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#F5EFEB]">
              Composite Fire Confidence Index
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            WEIGHTED MULTI-SENSOR
          </span>
        </div>

        {/* Overall Score Badge */}
        <div className={`p-3 rounded-lg border flex items-center justify-between mb-4 ${band.color}`}>
          <div className="flex items-center gap-2.5">
            <BandIcon className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-mono text-xs sm:text-sm font-bold tracking-wider">
                CONFIDENCE: {band.label}
              </div>
              <div className="text-[10px] text-zinc-300 opacity-90 leading-tight">
                {band.desc}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-2xl font-bold leading-none">
              {fireConfidence}
            </span>
            <span className="text-xs font-mono opacity-75">/100</span>
          </div>
        </div>

        {/* Breakdown Contribution Bars */}
        <div className="space-y-2.5 mb-2 font-mono text-xs">
          
          {/* Flame Contribution (30%) */}
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-[#A6987E]">IR Flame Optical Sensor (30%)</span>
              <span className={`font-bold ${flame ? 'text-red-400' : 'text-zinc-400'}`}>
                {flame ? "TRIGGERED (+30%)" : "CLEAR (0%)"}
              </span>
            </div>
            <div className="w-full bg-[#17181D] h-2 rounded-full overflow-hidden border border-[#252830]">
              <div 
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${(flameVal / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* Thermal AMG8833 Contribution (25%) */}
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-[#A6987E]">AMG8833 Thermal IR (25%)</span>
              <span className="text-[#F5EFEB] font-bold">
                {thermalVal} / 25% ({thermalMax.toFixed(1)}°C)
              </span>
            </div>
            <div className="w-full bg-[#17181D] h-2 rounded-full overflow-hidden border border-[#252830]">
              <div 
                className="h-full bg-[#D97706] transition-all duration-300"
                style={{ width: `${(thermalVal / 25) * 100}%` }}
              />
            </div>
          </div>

          {/* Temperature DS18B20/DHT22 Contribution (25%) */}
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-[#A6987E]">Chassis / Ambient Temp (25%)</span>
              <span className="text-[#F5EFEB] font-bold">
                {tempVal} / 25% ({temp.toFixed(1)}°C)
              </span>
            </div>
            <div className="w-full bg-[#17181D] h-2 rounded-full overflow-hidden border border-[#252830]">
              <div 
                className="h-full bg-yellow-500 transition-all duration-300"
                style={{ width: `${(tempVal / 25) * 100}%` }}
              />
            </div>
          </div>

          {/* Gas & Smoke Contribution (20%) */}
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-[#A6987E]">Smoke &amp; Gas MQ-2/MQ-5 (20%)</span>
              <span className="text-[#F5EFEB] font-bold">
                {smokeVal} / 20% (Idx: {gasMax}%)
              </span>
            </div>
            <div className="w-full bg-[#17181D] h-2 rounded-full overflow-hidden border border-[#252830]">
              <div 
                className="h-full bg-orange-400 transition-all duration-300"
                style={{ width: `${(smokeVal / 20) * 100}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Threshold bands summary */}
      <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-center pt-2 border-t border-[#252830] text-[#7E766B]">
        <span className="border-r border-[#252830] pr-1">0–25: SAFE</span>
        <span className="border-r border-[#252830] pr-1">26–50: WARN</span>
        <span className="border-r border-[#252830] pr-1">51–75: SUSP</span>
        <span>76+: CONFIRMED</span>
      </div>
    </div>
  );
}
