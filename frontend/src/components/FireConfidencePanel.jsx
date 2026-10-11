"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, Flame, ShieldAlert } from "lucide-react";

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
    color: "text-emerald-800 bg-emerald-50 border-emerald-300",
    barColor: "bg-emerald-600",
    icon: ShieldCheck,
    desc: "No fire or hazardous ignition signatures detected."
  };

  if (fireConfidence >= 76) {
    band = {
      label: "FIRE CONFIRMED",
      color: "text-red-800 bg-red-50 border-red-400 alarm-glow",
      barColor: "bg-red-600",
      icon: Flame,
      desc: "CRITICAL: Multiple sensors confirm active flame combustion!"
    };
  } else if (fireConfidence >= 51) {
    band = {
      label: "FIRE SUSPECTED",
      color: "text-amber-800 bg-amber-50 border-amber-300",
      barColor: "bg-[#C2601F]",
      icon: AlertTriangle,
      desc: "WARNING: High thermal & smoke correlation. Fire suspected."
    };
  } else if (fireConfidence >= 26) {
    band = {
      label: "WARNING",
      color: "text-yellow-800 bg-yellow-50 border-yellow-300",
      barColor: "bg-yellow-600",
      icon: AlertTriangle,
      desc: "Elevated temperature or gas index detected in vicinity."
    };
  }

  const BandIcon = band.icon;

  return (
    <div className="card-panel p-4 flex flex-col justify-between border-[#D4C9B8]">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#D4C9B8]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#C2601F]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1612]">
              Composite Fire Confidence Index
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E5DFD6] text-[#6B5C4C] border border-[#D4C9B8]">
            WEIGHTED MULTI-SENSOR
          </span>
        </div>

        {/* Overall Score Badge */}
        <div className={`p-3 rounded-xl border flex items-center justify-between mb-4 shadow-sm ${band.color}`}>
          <div className="flex items-center gap-2.5">
            <BandIcon className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-mono text-xs sm:text-sm font-bold tracking-wider">
                CONFIDENCE: {band.label}
              </div>
              <div className="text-[10px] opacity-80 leading-tight">
                {band.desc}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-2xl font-bold leading-none">
              {fireConfidence}
            </span>
            <span className="text-xs font-mono opacity-70">/100</span>
          </div>
        </div>

        {/* Breakdown Contribution Bars */}
        <div className="space-y-3 mb-2 font-mono text-xs">
          
          {/* Flame Contribution (30%) */}
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-[#6B5C4C]">IR Flame Optical Sensor (30%)</span>
              <span className={`font-bold ${flame ? 'text-red-600' : 'text-[#9E8D7A]'}`}>
                {flame ? "TRIGGERED (+30%)" : "CLEAR (0%)"}
              </span>
            </div>
            <div className="w-full bg-[#EDE8E0] h-2 rounded-full overflow-hidden border border-[#D4C9B8]">
              <div 
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${(flameVal / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* Thermal AMG8833 Contribution (25%) */}
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-[#6B5C4C]">AMG8833 Thermal IR (25%)</span>
              <span className="text-[#1A1612] font-bold">
                {thermalVal} / 25% ({thermalMax.toFixed(1)}°C)
              </span>
            </div>
            <div className="w-full bg-[#EDE8E0] h-2 rounded-full overflow-hidden border border-[#D4C9B8]">
              <div 
                className="h-full bg-[#C2601F] transition-all duration-300"
                style={{ width: `${(thermalVal / 25) * 100}%` }}
              />
            </div>
          </div>

          {/* Temperature DS18B20/DHT22 Contribution (25%) */}
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-[#6B5C4C]">Chassis / Ambient Temp (25%)</span>
              <span className="text-[#1A1612] font-bold">
                {tempVal} / 25% ({temp.toFixed(1)}°C)
              </span>
            </div>
            <div className="w-full bg-[#EDE8E0] h-2 rounded-full overflow-hidden border border-[#D4C9B8]">
              <div 
                className="h-full bg-yellow-600 transition-all duration-300"
                style={{ width: `${(tempVal / 25) * 100}%` }}
              />
            </div>
          </div>

          {/* Gas & Smoke Contribution (20%) */}
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-[#6B5C4C]">Smoke &amp; Gas MQ-2/MQ-5 (20%)</span>
              <span className="text-[#1A1612] font-bold">
                {smokeVal} / 20% (Idx: {gasMax}%)
              </span>
            </div>
            <div className="w-full bg-[#EDE8E0] h-2 rounded-full overflow-hidden border border-[#D4C9B8]">
              <div 
                className="h-full bg-orange-600 transition-all duration-300"
                style={{ width: `${(smokeVal / 20) * 100}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Threshold bands summary */}
      <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-center pt-2 mt-2 border-t border-[#D4C9B8] text-[#9E8D7A]">
        <span className="border-r border-[#D4C9B8] pr-1">0–25: SAFE</span>
        <span className="border-r border-[#D4C9B8] pr-1">26–50: WARN</span>
        <span className="border-r border-[#D4C9B8] pr-1">51–75: SUSP</span>
        <span>76+: CONFIRMED</span>
      </div>
    </div>
  );
}
