"use client";

import React from "react";
import { Eye, BrainCircuit, MapPin, Compass, Crosshair, Droplets, ShieldCheck } from "lucide-react";

const STAGES = [
  { id: "SENSE",    label: "SENSE",    icon: Eye,          desc: "Ambient sensors & thermal scan" },
  { id: "ANALYZE",  label: "ANALYZE",  icon: BrainCircuit, desc: "AI fire confidence scoring" },
  { id: "LOCATE",   label: "LOCATE",   icon: MapPin,       desc: "Hotspot azimuth & zone detection" },
  { id: "NAVIGATE", label: "NAVIGATE", icon: Compass,      desc: "Obstacle avoidance drive" },
  { id: "AIM",      label: "AIM",      icon: Crosshair,    desc: "Pan/tilt cannon lock" },
  { id: "SUPPRESS", label: "SUPPRESS", icon: Droplets,     desc: "Water pump discharge" },
  { id: "VERIFY",   label: "VERIFY",   icon: ShieldCheck,  desc: "Cool-down & re-inspection" },
];

export default function PipelineTracker({ currentStage = "SENSE" }) {
  const currentIndex = STAGES.findIndex(s => s.id === currentStage);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="card-panel px-4 py-3 w-full">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#D4C9B8]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--primary)" }} />
          <h2 className="text-xs font-mono font-bold tracking-wider text-[#1A1612] uppercase">
            Autonomous Fire Mitigation Pipeline
          </h2>
        </div>
        <div className="text-[11px] font-mono text-[#9E8D7A] hidden md:block">
          ACTIVE: <span className="font-bold" style={{ color: "var(--primary)" }}>{STAGES[activeIdx]?.label}</span>
          {" · "}{STAGES[activeIdx]?.desc}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = idx < activeIdx;
          const isCurrent = idx === activeIdx;

          let cardStyle = "bg-[#F2EDE6] border-[#D4C9B8] text-[#9E8D7A]";
          let numBadge = "bg-[#E5DFD6] text-[#9E8D7A]";
          let iconColor = "text-[#C0AD99]";

          if (isCurrent) {
            cardStyle = "border-[#C2601F] text-[#1A1612] shadow-sm";
            numBadge = "text-white font-bold";
            iconColor = "text-[#C2601F]";
          } else if (isDone) {
            cardStyle = "bg-emerald-50 border-emerald-300 text-emerald-800";
            numBadge = "bg-emerald-100 text-emerald-700 font-semibold";
            iconColor = "text-emerald-600";
          }

          return (
            <div
              key={stage.id}
              className={`flex flex-col p-2.5 rounded-xl border transition-all ${cardStyle}`}
              style={isCurrent ? { background: "rgba(194,96,31,0.08)", borderColor: "var(--primary)" } : {}}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${numBadge}`}
                  style={isCurrent ? { background: "var(--primary)" } : {}}>
                  0{idx + 1}
                </span>
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
              </div>
              <div className="font-mono text-xs font-bold tracking-wider">{stage.label}</div>
              <div className="text-[10px] text-[#9E8D7A] leading-tight truncate mt-0.5" title={stage.desc}>
                {stage.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
