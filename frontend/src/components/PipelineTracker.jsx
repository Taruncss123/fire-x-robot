"use client";

import React from "react";
import { 
  Eye, 
  BrainCircuit, 
  MapPin, 
  Compass, 
  Crosshair, 
  Droplets, 
  ShieldCheck, 
  ChevronRight 
} from "lucide-react";

const STAGES = [
  { id: "SENSE", label: "SENSE", icon: Eye, desc: "Ambient sensors & thermal scan" },
  { id: "ANALYZE", label: "ANALYZE", icon: BrainCircuit, desc: "AI fire confidence scoring" },
  { id: "LOCATE", label: "LOCATE", icon: MapPin, desc: "Hotspot azimuth & zone detection" },
  { id: "NAVIGATE", label: "NAVIGATE", icon: Compass, desc: "Obstacle avoidance waypoint drive" },
  { id: "AIM", label: "AIM", icon: Crosshair, desc: "Pan/tilt cannon lock onto hotspot" },
  { id: "SUPPRESS", label: "SUPPRESS", icon: Droplets, desc: "Water pump high-pressure discharge" },
  { id: "VERIFY", label: "VERIFY", icon: ShieldCheck, desc: "Cool-down & re-ignition inspection" },
];

export default function PipelineTracker({ currentStage = "SENSE" }) {
  const currentIndex = STAGES.findIndex(s => s.id === currentStage);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="card-panel p-3 sm:p-4 max-w-[1720px] mx-auto w-full">
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#252830]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D97706]" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-[#F5EFEB] uppercase">
            AUTONOMOUS FIRE MITIGATION PIPELINE
          </h2>
        </div>
        <div className="text-[11px] font-mono text-[#A6987E]">
          ACTIVE PHASE: <span className="font-bold text-[#D97706]">{STAGES[activeIdx]?.label}</span> · {STAGES[activeIdx]?.desc}
        </div>
      </div>

      {/* Pipeline Stages Flex/Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 sm:gap-2">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = idx < activeIdx;
          const isCurrent = idx === activeIdx;

          let cardStyle = "bg-[#16171D] border-[#252830] text-[#7E766B]";
          let badgeStyle = "bg-zinc-800 text-zinc-400";
          let iconStyle = "text-zinc-500";

          if (isCurrent) {
            cardStyle = "bg-[#D97706]/15 border-[#D97706] text-[#F5EFEB] shadow-md shadow-[#D97706]/20";
            badgeStyle = "bg-[#D97706] text-black font-bold animate-pulse";
            iconStyle = "text-[#D97706]";
          } else if (isDone) {
            cardStyle = "bg-emerald-950/20 border-emerald-600/40 text-[#EAE2D5]";
            badgeStyle = "bg-emerald-600/30 text-emerald-300 font-semibold";
            iconStyle = "text-emerald-400";
          }

          return (
            <div 
              key={stage.id} 
              className={`flex flex-col p-2 sm:p-2.5 rounded-lg border transition-all ${cardStyle}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${badgeStyle}`}>
                  0{idx + 1}
                </span>
                <Icon className={`w-3.5 h-3.5 ${iconStyle}`} />
              </div>
              <div className="font-mono text-xs font-bold tracking-wider">
                {stage.label}
              </div>
              <div className="text-[10px] text-[#A6987E] leading-tight truncate mt-0.5" title={stage.desc}>
                {stage.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
