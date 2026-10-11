"use client";

import React from "react";
import { Wind, AlertCircle, ShieldCheck } from "lucide-react";

export default function GasDensityPanel({ mq2 = 20, mq5 = 16, smokeStatus = "LOW" }) {
  // Gas risk index calculation (0 - 100%)
  const mq2Risk = Math.min(100, Math.max(0, mq2));
  const mq5Risk = Math.min(100, Math.max(0, mq5));
  const combinedRisk = Math.max(mq2Risk, mq5Risk);

  let statusBadge = {
    label: "LOW GAS RISK",
    color: "text-emerald-800 bg-emerald-50 border-emerald-300",
    desc: "Clean atmospheric baseline. Combustible gas levels normal."
  };

  if (combinedRisk >= 65 || smokeStatus === "HIGH") {
    statusBadge = {
      label: "HIGH GAS RISK",
      color: "text-red-800 bg-red-50 border-red-400 alarm-glow",
      desc: "Hazardous smoke / combustible gas concentrations detected!"
    };
  } else if (combinedRisk >= 35 || smokeStatus === "MEDIUM") {
    statusBadge = {
      label: "MEDIUM GAS RISK",
      color: "text-amber-800 bg-amber-50 border-amber-300",
      desc: "Elevated hydrocarbon / smoke particles detected in rover sector."
    };
  }

  return (
    <div className="card-panel p-4 flex flex-col justify-between border-[#D4C9B8]">
      <div>
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#D4C9B8]">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-[#C2601F]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1612]">
              Relative Gas Risk Index
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E5DFD6] text-[#6B5C4C] border border-[#D4C9B8]">
            UNCALIBRATED SENSORS
          </span>
        </div>

        {/* Status Callout Badge */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between mb-4 shadow-sm ${statusBadge.color}`}>
          <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wide">
            {combinedRisk >= 65 ? <AlertCircle className="w-4 h-4 animate-bounce" /> : <ShieldCheck className="w-4 h-4" />}
            <span>STATUS: {statusBadge.label}</span>
          </div>
          <span className="font-mono font-bold text-sm">{combinedRisk}%</span>
        </div>

        {/* Circular Visual Gauges */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          
          {/* MQ-2 Gauge */}
          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-3 flex flex-col items-center">
            <span className="text-[11px] font-mono text-[#6B5C4C] mb-1 font-semibold">
              MQ-2 (Smoke / LPG / CO)
            </span>
            <div className="relative w-24 h-24 flex items-center justify-center my-1">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#D4C9B8]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${mq2Risk > 60 ? 'text-red-600' : mq2Risk > 30 ? 'text-amber-600' : 'text-emerald-600'} transition-all duration-500`}
                  strokeDasharray={`${mq2Risk}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-mono text-xl font-bold text-[#1A1612] leading-none">
                  {mq2Risk}%
                </span>
                <span className="text-[9px] font-mono text-[#9E8D7A] uppercase mt-0.5">
                  RISK INDEX
                </span>
              </div>
            </div>
            <div className="w-full bg-[#EDE8E0] h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full ${mq2Risk > 60 ? 'bg-red-600' : mq2Risk > 30 ? 'bg-amber-600' : 'bg-emerald-600'}`}
                style={{ width: `${mq2Risk}%` }}
              />
            </div>
          </div>

          {/* MQ-5 Gauge */}
          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-3 flex flex-col items-center">
            <span className="text-[11px] font-mono text-[#6B5C4C] mb-1 font-semibold">
              MQ-5 (Natural Gas / CH4)
            </span>
            <div className="relative w-24 h-24 flex items-center justify-center my-1">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#D4C9B8]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${mq5Risk > 60 ? 'text-red-600' : mq5Risk > 30 ? 'text-amber-600' : 'text-emerald-600'} transition-all duration-500`}
                  strokeDasharray={`${mq5Risk}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-mono text-xl font-bold text-[#1A1612] leading-none">
                  {mq5Risk}%
                </span>
                <span className="text-[9px] font-mono text-[#9E8D7A] uppercase mt-0.5">
                  RISK INDEX
                </span>
              </div>
            </div>
            <div className="w-full bg-[#EDE8E0] h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full ${mq5Risk > 60 ? 'bg-red-600' : mq5Risk > 30 ? 'bg-amber-600' : 'bg-emerald-600'}`}
                style={{ width: `${mq5Risk}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      <p className="text-[10px] text-[#9E8D7A] font-mono leading-tight pt-2 mt-2 border-t border-[#D4C9B8]">
        ℹ️ <strong>Calibration note:</strong> MQ-2 &amp; MQ-5 values are scaled as an empirical Relative Gas Risk Index (0–100%) rather than uncalibrated raw PPM.
      </p>
    </div>
  );
}
