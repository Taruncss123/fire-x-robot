"use client";

import React, { useState } from "react";
import { Download, Database, Filter, Clock, TrendingUp } from "lucide-react";
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
    <div className="card-panel p-4 flex flex-col justify-between border-[#D4C9B8]">
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-3 border-b border-[#D4C9B8]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#C2601F]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1612]">
              5-Minute Structured Telemetry Log &amp; Trends
            </h3>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
            {/* Interval selector */}
            <div className="flex items-center gap-1.5 bg-[#F2EDE6] px-2.5 py-1 rounded-lg border border-[#D4C9B8]">
              <span className="text-[#6B5C4C] text-[10px]">INTERVAL:</span>
              <select
                value={intervalMin}
                onChange={(e) => setIntervalMin(Number(e.target.value))}
                className="bg-transparent text-[#1A1612] text-xs font-bold outline-none cursor-pointer"
              >
                <option value={1} className="bg-[#FAF7F4]">1 min</option>
                <option value={2} className="bg-[#FAF7F4]">2 min</option>
                <option value={5} className="bg-[#FAF7F4]">5 min (Default)</option>
                <option value={10} className="bg-[#FAF7F4]">10 min</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C2601F] hover:bg-[#A34E18] text-white font-bold font-mono text-xs transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT CSV</span>
            </button>
          </div>
        </div>

        {/* Status Line & Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#6B5C4C]">
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            <span>LAST SAVED TO FIRESTORE / STORAGE: <strong className="text-[#1A1612]">{lastSavedTime || "Awaiting initial batch"}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter time / zone / mode..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="bg-[#F2EDE6] border border-[#D4C9B8] text-[#1A1612] placeholder-[#9E8D7A] text-xs px-2.5 py-1.5 rounded-lg pl-7 outline-none focus:border-[#C2601F] w-48 sm:w-56"
              />
              <Filter className="w-3.5 h-3.5 text-[#9E8D7A] absolute left-2 top-2" />
            </div>
          </div>
        </div>

        {/* Historical Batch Trends Chart */}
        {chartData.length > 0 && (
          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-[#6B5C4C]">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#C2601F]" />
                HISTORICAL BATCH RECORD TRENDS
              </span>
              <div className="flex gap-3">
                <span className="text-[#C2601F]">■ Temp (°C)</span>
                <span className="text-red-600">■ Thermal Peak</span>
                <span className="text-amber-600">■ Gas Risk Index</span>
              </div>
            </div>

            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 2, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="time" stroke="#9E8D7A" fontSize={8} tickLine={false} />
                  <YAxis stroke="#9E8D7A" fontSize={8} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FAF7F4',
                      borderColor: '#D4C9B8',
                      borderRadius: '0.5rem',
                      fontSize: '10px',
                      fontFamily: 'ui-monospace, monospace',
                      color: '#1A1612'
                    }}
                  />
                  <Area type="monotone" dataKey="temp" stroke="#C2601F" fill="#C2601F" fillOpacity={0.15} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="thermal" stroke="#DC2626" fill="#DC2626" fillOpacity={0.1} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="gas" stroke="#D97706" fill="#D97706" fillOpacity={0.1} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Batch Records Table */}
        <div className="overflow-x-auto max-h-52 border border-[#D4C9B8] rounded-xl bg-[#FAF7F4]">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-[#F2EDE6] text-[#6B5C4C] sticky top-0 border-b border-[#D4C9B8] text-[11px]">
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
            <tbody className="divide-y divide-[#D4C9B8] text-[11px]">
              {filteredBatches.length > 0 ? (
                filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-[#EDE8E0] transition-colors">
                    <td className="py-1.5 px-2.5 text-[#1A1612] whitespace-nowrap">{b.time}</td>
                    <td className="py-1.5 px-2 font-bold text-[#C2601F] whitespace-nowrap">{b.id}</td>
                    <td className="py-1.5 px-2 text-[#1A1612]">{b.temp}°C</td>
                    <td className="py-1.5 px-2 text-[#4A3C30]">{b.mq2_index}%</td>
                    <td className="py-1.5 px-2 text-[#4A3C30]">{b.mq5_index}%</td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        b.smoke_status === 'HIGH' ? 'bg-red-100 text-red-800' :
                        b.smoke_status === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                        'bg-[#E5DFD6] text-[#6B5C4C]'
                      }`}>
                        {b.smoke_status}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        b.flame_detected ? 'bg-red-100 text-red-800 font-bold' : 'text-[#9E8D7A]'
                      }`}>
                        {b.flame_detected ? 'FLAME' : 'CLEAR'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-semibold text-amber-800">{b.thermal_max}°C</td>
                    <td className="py-1.5 px-2 text-[#4A3C30]">{b.battery_pct}%</td>
                    <td className="py-1.5 px-2 text-[#6B5C4C]">{b.mode}</td>
                    <td className="py-1.5 px-2 font-bold">
                      <span className={b.fire_confidence > 50 ? 'text-red-700' : b.fire_confidence > 25 ? 'text-amber-700' : 'text-emerald-700'}>
                        {b.fire_confidence}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-[#9E8D7A]">
                    No batch records matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[10px] text-[#9E8D7A] font-mono pt-2 mt-2 border-t border-[#D4C9B8] flex justify-between items-center">
        <span>Storage Target: Firestore Collection &quot;batches&quot; + Local Cache</span>
        <span>Records: {filteredBatches.length} Batches</span>
      </div>
    </div>
  );
}
