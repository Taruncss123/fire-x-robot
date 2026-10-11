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
    if (sev === "danger") return "border-red-500/50 bg-red-950/40 text-red-300";
    if (sev === "warning") return "border-amber-500/50 bg-amber-950/40 text-amber-300";
    if (sev === "safe") return "border-emerald-500/50 bg-emerald-950/40 text-emerald-300";
    return "border-zinc-700 bg-zinc-900/60 text-zinc-300";
  };

  return (
    <div className="card-panel p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#252830]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#D97706]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#F5EFEB]">
              Alerts &amp; Mission Event Timeline
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
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
                  className={`p-2.5 rounded-lg border text-xs font-mono transition-all flex items-start gap-2.5 ${cardClass}`}
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
            <div className="text-center py-8 text-xs font-mono text-[#7E766B]">
              No alerts recorded yet. Rover patrolling nominal.
            </div>
          )}
        </div>
      </div>

      <div className="text-[10px] text-[#7E766B] font-mono pt-2 border-t border-[#252830] flex justify-between items-center">
        <span>Firestore Collection &quot;events&quot;</span>
        <span>Auto-synced</span>
      </div>
    </div>
  );
}
