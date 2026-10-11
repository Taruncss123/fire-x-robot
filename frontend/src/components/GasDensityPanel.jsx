"use client";

import React from "react";
import { Wind, AlertCircle, ShieldCheck, Flame } from "lucide-react";

export default function GasDensityPanel({ mq2 = 20, mq5 = 16, smokeStatus = "LOW" }) {
  // Gas risk index calculation (0 - 100%)
  const mq2Risk = Math.min(100, Math.max(0, mq2));
  const mq5Risk = Math.min(100, Math.max(0, mq5));
  const combinedRisk = Math.max(mq2Risk, mq5Risk);

  let statusBadge = {
    label: "LOW GAS RISK",
    color: "text-emerald-400 bg-emerald-950/70 border-emerald-500/40",
    desc: "Clean atmospheric baseline. Combustible gas levels normal."
  };

  if (combinedRisk >= 65 || smokeStatus === "HIGH") {
    statusBadge = {
      label: "HIGH GAS RISK",
      color: "text-red-400 bg-red-950/80 border-red-500/60 alarm-glow",
      desc: "Hazardous smoke / combustible gas concentrations detected!"
    };
  } else if (combinedRisk >= 35 || smokeStatus === "MEDIUM") {
    statusBadge = {
      label: "MEDIUM GAS RISK",
      color: "text-amber-400 bg-amber-950/70 border-amber-500/50",
      desc: "Elevated hydrocarbon / smoke particles detected in rover sector."
    };
  }

  return (
    <div className="card-panel p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#252830]">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-[#D97706]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#F5EFEB]">
              Relative Gas Risk Index
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            UNCALIBRATED SENSORS
          </span>
        </div>

        {/* Status Callout Badge */}
        <div className={`p-2.5 rounded-lg border flex items-center justify-between mb-4 ${statusBadge.color}`}>
          <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wide">
            {combinedRisk >= 65 ? <AlertCircle className="w-4 h-4 animate-bounce" /> : <ShieldCheck className="w-4 h-4" />}
            <span>STATUS: {statusBadge.label}</span>
          </div>
          <span className="font-mono font-bold text-sm">{combinedRisk}%</span>
        </div>

        {/* Circular / Semi-radial Visual Gauges */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          
          {/* MQ-2 Gauge */}
          <div className="bg-[#17181D] border border-[#252830] rounded-lg p-3 flex flex-col items-center">
            <span className="text-[11px] font-mono text-[#A6987E] mb-1 font-semibold">
              MQ-2 (Smoke / LPG / CO)
            </span>
            <div className="relative w-24 h-24 flex items-center justify-center my-1">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-zinc-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${mq2Risk > 60 ? 'text-red-500' : mq2Risk > 30 ? 'text-amber-500' : 'text-emerald-500'} transition-all duration-500`}
                  strokeDasharray={`${mq2Risk}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-mono text-xl font-bold text-[#F5EFEB] leading-none">
                  {mq2Risk}%
                </span>
                <span className="text-[9px] font-mono text-[#A6987E] uppercase mt-0.5">
                  RISK INDEX
                </span>
              </div>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full ${mq2Risk > 60 ? 'bg-red-500' : mq2Risk > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${mq2Risk}%` }}
              />
            </div>
          </div>

          {/* MQ-5 Gauge */}
          <div className="bg-[#17181D] border border-[#252830] rounded-lg p-3 flex flex-col items-center">
            <span className="text-[11px] font-mono text-[#A6987E] mb-1 font-semibold">
              MQ-5 (Natural Gas / CH4)
            </span>
            <div className="relative w-24 h-24 flex items-center justify-center my-1">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-zinc-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${mq5Risk > 60 ? 'text-red-500' : mq5Risk > 30 ? 'text-amber-500' : 'text-emerald-500'} transition-all duration-500`}
                  strokeDasharray={`${mq5Risk}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-mono text-xl font-bold text-[#F5EFEB] leading-none">
                  {mq5Risk}%
                </span>
                <span className="text-[9px] font-mono text-[#A6987E] uppercase mt-0.5">
                  RISK INDEX
                </span>
              </div>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full ${mq5Risk > 60 ? 'bg-red-500' : mq5Risk > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${mq5Risk}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      <p className="text-[10px] text-[#7E766B] font-mono leading-tight pt-2 border-t border-[#252830]">
        ℹ️ <strong>Calibration note:</strong> MQ-2 &amp; MQ-5 values are scaled as an empirical Relative Gas Risk Index (0–100%) rather than uncalibrated raw PPM.
      </p>
    </div>
  );
}
