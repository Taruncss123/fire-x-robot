"use client";

import React, { useState } from "react";
import { Download, Database, Calendar, Filter, Clock, TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export default function DataLogSection({ 
  batches = [], 
  lastSavedTime = "", 
  onExportCsv 
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const [intervalMin, setIntervalMin] = useState(5);

  // Filter batches by search query (e.g. date, zone, mode)
  const filteredBatches = batches.filter(b => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      (b.time && b.time.toLowerCase().includes(q)) ||
      (b.id && b.id.toLowerCase().includes(q)) ||
      (b.mode && b.mode.toLowerCase().includes(q)) ||
      (b.zone && b.zone.toLowerCase().includes(q)) ||
      (b.smoke_status && b.smoke_status.toLowerCase().includes(q))
    );
  });

  // Prepare chart data from batches (chronological)
  const chartData = [...batches].reverse().map(b => ({
    time: b.time || "00:00",
    temp: b.temp,
    thermal: b.thermal_max,
    gas: b.mq2_index,
    confidence: b.fire_confidence
  }));

  // CSV download trigger
  const handleDownloadCsv = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }

    const headers = [
      'Batch_ID', 'Timestamp', 'Local_Time', 'Temperature_C', 'Chassis_Temp_C',
      'Electronics_Temp_C', 'MQ2_Gas_Risk_Idx', 'MQ5_Gas_Risk_Idx', 'Smoke_Status',
      'Flame_Detected', 'Thermal_Max_C', 'Hotspot_Direction', 'Battery_Pct',
      'Drive_Mode', 'Zone', 'Fire_Confidence_Pct', 'Pump_Status', 'Estop_Status'
    ];

    const rows = batches.map(b => [
      b.id,
      b.timestamp || new Date().toISOString(),
      `"${b.time}"`,
      b.temp,
      b.temp_chassis || b.temp,
      b.temp_electronics || b.temp,
      b.mq2_index,
      b.mq5_index,
      b.smoke_status,
      b.flame_detected ? 'TRUE' : 'FALSE',
      b.thermal_max,
      b.thermal_direction || 'CENTER',
      b.battery_pct,
      b.mode,
      b.zone || 'A',
      b.fire_confidence,
      b.pump_status || 'IDLE',
      b.estop_status || 'NORMAL'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `firex_batches_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card-panel p-4 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-3 border-b border-[#252830]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#D97706]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#F5EFEB]">
              5-Minute Structured Telemetry Log &amp; Trends
            </h3>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
            {/* Interval selector */}
            <div className="flex items-center gap-1.5 bg-[#17181D] px-2 py-1 rounded border border-[#252830]">
              <span className="text-[#A6987E] text-[10px]">INTERVAL:</span>
              <select
                value={intervalMin}
                onChange={(e) => setIntervalMin(Number(e.target.value))}
                className="bg-transparent text-[#F5EFEB] text-xs font-bold outline-none cursor-pointer"
              >
                <option value={1} className="bg-[#121316]">1 min</option>
                <option value={2} className="bg-[#121316]">2 min</option>
                <option value={5} className="bg-[#121316]">5 min (Default)</option>
                <option value={10} className="bg-[#121316]">10 min</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#D97706] hover:bg-[#B45309] text-black font-bold font-mono text-xs transition-all shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT CSV</span>
            </button>
          </div>
        </div>

        {/* Status Line & Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#A6987E]">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>LAST SAVED TO FIRESTORE / STORAGE: <strong className="text-[#F5EFEB]">{lastSavedTime || "Awaiting initial batch"}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter time / zone / mode..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="bg-[#17181D] border border-[#252830] text-[#F5EFEB] text-xs px-2.5 py-1 rounded pl-7 outline-none focus:border-[#D97706] w-48 sm:w-56"
              />
              <Filter className="w-3.5 h-3.5 text-[#7E766B] absolute left-2 top-1.5" />
            </div>
          </div>
        </div>

        {/* Historical Batch Trends Chart */}
        {chartData.length > 0 && (
          <div className="bg-[#17181D] border border-[#252830] rounded-lg p-2.5 mb-3">
            <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-[#A6987E]">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#D97706]" />
                HISTORICAL BATCH RECORD TRENDS
              </span>
              <div className="flex gap-3">
                <span className="text-amber-400">■ Temp (°C)</span>
                <span className="text-red-400">■ Thermal Peak</span>
                <span className="text-orange-400">■ Gas Risk Index</span>
              </div>
            </div>

            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 2, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="time" stroke="#7E766B" fontSize={8} tickLine={false} />
                  <YAxis stroke="#7E766B" fontSize={8} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121316',
                      borderColor: '#252830',
                      borderRadius: '0.375rem',
                      fontSize: '10px',
                      fontFamily: 'ui-monospace, monospace'
                    }}
                  />
                  <Area type="monotone" dataKey="temp" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="thermal" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="gas" stroke="#D97706" fill="#D97706" fillOpacity={0.1} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Batch Records Table */}
        <div className="overflow-x-auto max-h-52 border border-[#252830] rounded-lg bg-[#14151A]">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-[#1A1C23] text-[#A6987E] sticky top-0 border-b border-[#252830] text-[11px]">
              <tr>
                <th className="py-2 px-2.5">Time</th>
                <th className="py-2 px-2">Batch</th>
                <th className="py-2 px-2">Temp</th>
                <th className="py-2 px-2">Gas MQ-2</th>
                <th className="py-2 px-2">Gas MQ-5</th>
                <th className="py-2 px-2">Smoke</th>
                <th className="py-2 px-2">Flame</th>
                <th className="py-2 px-2">Thermal</th>
                <th className="py-2 px-2">Batt</th>
                <th className="py-2 px-2">Mode</th>
                <th className="py-2 px-2">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252830] text-[11px]">
              {filteredBatches.length > 0 ? (
                filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-1.5 px-2.5 text-[#EAE2D5] whitespace-nowrap">{b.time}</td>
                    <td className="py-1.5 px-2 font-bold text-[#D97706] whitespace-nowrap">{b.id}</td>
                    <td className="py-1.5 px-2 text-[#EAE2D5]">{b.temp}°C</td>
                    <td className="py-1.5 px-2 text-zinc-300">{b.mq2_index}%</td>
                    <td className="py-1.5 px-2 text-zinc-300">{b.mq5_index}%</td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                        b.smoke_status === 'HIGH' ? 'bg-red-950 text-red-300' :
                        b.smoke_status === 'MEDIUM' ? 'bg-amber-950 text-amber-300' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {b.smoke_status}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                        b.flame_detected ? 'bg-red-950 text-red-300 font-bold' : 'text-zinc-500'
                      }`}>
                        {b.flame_detected ? 'FLAME' : 'CLEAR'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-amber-300">{b.thermal_max}°C</td>
                    <td className="py-1.5 px-2 text-zinc-300">{b.battery_pct}%</td>
                    <td className="py-1.5 px-2 text-zinc-400">{b.mode}</td>
                    <td className="py-1.5 px-2 font-bold">
                      <span className={b.fire_confidence > 50 ? 'text-red-400' : b.fire_confidence > 25 ? 'text-amber-400' : 'text-emerald-400'}>
                        {b.fire_confidence}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-[#7E766B]">
                    No batch records matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[10px] text-[#7E766B] font-mono pt-2 border-t border-[#252830] flex justify-between items-center">
        <span>Storage Target: Firestore Collection &quot;batches&quot; + Local Cache</span>
        <span>Records: {filteredBatches.length} Batches</span>
      </div>
    </div>
  );
}
