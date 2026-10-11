"use client";

import React from "react";
import { 
  Bell, 
  Flame, 
  Wind, 
  UserX, 
  WifiOff, 
  Droplets, 
  ShieldAlert, 
  Info, 
  CheckCircle 
} from "lucide-react";

export default function AlertsTimeline({ events = [] }) {
  const getEventIcon = (title = "") => {
    const t = title.toUpperCase();
    if (t.includes("FIRE") || t.includes("FLAME")) return Flame;
    if (t.includes("GAS") || t.includes("SMOKE")) return Wind;
    if (t.includes("PERSON")) return UserX;
    if (t.includes("COMMS") || t.includes("MQTT") || t.includes("OFFLINE")) return WifiOff;
    if (t.includes("PUMP") || t.includes("SUPPRESS")) return Droplets;
    if (t.includes("EMERGENCY") || t.includes("ESTOP")) return ShieldAlert;
    if (t.includes("SAFE") || t.includes("CLEAR") || t.includes("ARMED")) return CheckCircle;
    return Info;
  };

  const getSeverityStyle = (sev = "info") => {
    if (sev === "danger") return "border-red-300 bg-red-50 text-red-800";
    if (sev === "warning") return "border-amber-300 bg-amber-50 text-amber-800";
    if (sev === "safe") return "border-emerald-300 bg-emerald-50 text-emerald-800";
    return "border-[#D4C9B8] bg-[#F2EDE6] text-[#4A3C30]";
  };

  return (
    <div className="card-panel p-4 flex flex-col justify-between border-[#D4C9B8]">
      <div>
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#D4C9B8]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#C2601F]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1612]">
              Alerts &amp; Mission Event Timeline
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E5DFD6] text-[#6B5C4C] border border-[#D4C9B8]">
            {events.length} LOGGED EVENTS
          </span>
        </div>

        {/* Scrollable Event List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {events && events.length > 0 ? (
            events.map((evt) => {
              const Icon = getEventIcon(evt.title);
              const cardClass = getSeverityStyle(evt.severity);

              return (
                <div 
                  key={evt.id || evt.ts}
                  className={`p-2.5 rounded-xl border text-xs font-mono transition-all flex items-start gap-2.5 shadow-sm ${cardClass}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold tracking-wide truncate">{evt.title}</span>
                      <span className="text-[10px] opacity-75 whitespace-nowrap">{evt.time}</span>
                    </div>
                    {evt.detail && (
                      <p className="text-[11px] opacity-90 mt-0.5 leading-tight break-words">
                        {evt.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-xs font-mono text-[#9E8D7A]">
              No alerts recorded yet. Rover patrolling nominal.
            </div>
          )}
        </div>
      </div>

      <div className="text-[10px] text-[#9E8D7A] font-mono pt-2 mt-2 border-t border-[#D4C9B8] flex justify-between items-center">
        <span>Firestore Collection &quot;events&quot;</span>
        <span>Auto-synced</span>
      </div>
    </div>
  );
}
