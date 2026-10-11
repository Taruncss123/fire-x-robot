"use client";

import React from "react";
import { Thermometer, Droplets, Activity } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export default function TemperaturePanel({ 
  temp = 34.2, 
  tempChassis = 34.2, 
  tempElectronics = 36.8, 
  humidity = 42.0, 
  history = [] 
}) {
  const isHighTemp = temp > 60 || tempChassis > 60;
  const isWarmTemp = temp > 45 || tempChassis > 45;

  let tempBadge = {
    label: "NORMAL TEMPERATURE",
    color: "text-emerald-800 bg-emerald-50 border-emerald-300"
  };
  if (isHighTemp) {
    tempBadge = {
      label: "OVERHEAT / THERMAL THREAT",
      color: "text-red-800 bg-red-50 border-red-400 alarm-glow"
    };
  } else if (isWarmTemp) {
    tempBadge = {
      label: "ELEVATED TEMPERATURE",
      color: "text-amber-800 bg-amber-50 border-amber-300"
    };
  }

  // Fallback history data if empty
  const chartData = history && history.length > 0 ? history : [
    { time: "00:00", temp: 33, chassis: 34, electronics: 36 },
    { time: "00:30", temp: 34, chassis: 34.5, electronics: 36.2 },
    { time: "01:00", temp: 33.8, chassis: 34.2, electronics: 36.5 },
  ];

  return (
    <div className="card-panel p-4 flex flex-col justify-between border-[#D4C9B8]">
      <div>
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#D4C9B8]">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-[#C2601F]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1612]">
              Thermal &amp; Atmospheric Sensor Array
            </h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${tempBadge.color}`}>
            {tempBadge.label}
          </span>
        </div>

        {/* 4 Sensor Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          
          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-[#6B5C4C] flex items-center justify-between">
              <span>DS18B20 #1</span>
              <span className="text-emerald-700 font-bold">CHASSIS</span>
            </div>
            <div className="font-mono text-xl font-bold text-[#1A1612] mt-1">
              {tempChassis.toFixed(1)}<span className="text-xs text-[#9E8D7A] font-normal">°C</span>
            </div>
            <div className="text-[9px] text-[#9E8D7A] font-mono">Chassis Contact</div>
          </div>

          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-[#6B5C4C] flex items-center justify-between">
              <span>DS18B20 #2</span>
              <span className="text-sky-700 font-bold">CABIN</span>
            </div>
            <div className="font-mono text-xl font-bold text-[#1A1612] mt-1">
              {tempElectronics.toFixed(1)}<span className="text-xs text-[#9E8D7A] font-normal">°C</span>
            </div>
            <div className="text-[9px] text-[#9E8D7A] font-mono">Electronics Bay</div>
          </div>

          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-[#6B5C4C] flex items-center justify-between">
              <span>DHT22 TEMP</span>
              <span className="text-amber-700 font-bold">AIR</span>
            </div>
            <div className="font-mono text-xl font-bold text-[#1A1612] mt-1">
              {temp.toFixed(1)}<span className="text-xs text-[#9E8D7A] font-normal">°C</span>
            </div>
            <div className="text-[9px] text-[#9E8D7A] font-mono">Ambient Air</div>
          </div>

          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-[#6B5C4C] flex items-center justify-between">
              <span>DHT22 RH</span>
              <Droplets className="w-3 h-3 text-cyan-600" />
            </div>
            <div className="font-mono text-xl font-bold text-cyan-800 mt-1">
              {humidity.toFixed(1)}<span className="text-xs text-[#9E8D7A] font-normal">%</span>
            </div>
            <div className="text-[9px] text-[#9E8D7A] font-mono">Relative Humidity</div>
          </div>

        </div>

        {/* Live Recharts Line Chart */}
        <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#6B5C4C]">
              <Activity className="w-3.5 h-3.5 text-[#C2601F]" />
              <span>LIVE TEMPERATURE TREND (RECENT MINUTES)</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-[#C2601F]">
                <span className="w-2 h-0.5 bg-[#C2601F] rounded-full" /> Ambient
              </span>
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-0.5 bg-emerald-700 rounded-full" /> Chassis
              </span>
              <span className="flex items-center gap-1 text-sky-700">
                <span className="w-2 h-0.5 bg-sky-700 rounded-full" /> Electronics
              </span>
            </div>
          </div>

          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <XAxis 
                  dataKey="time" 
                  stroke="#9E8D7A" 
                  fontSize={9} 
                  tickLine={false} 
                  interval="preserveStartEnd" 
                />
                <YAxis 
                  stroke="#9E8D7A" 
                  fontSize={9} 
                  domain={['dataMin - 2', 'dataMax + 4']} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FAF7F4', 
                    borderColor: '#D4C9B8', 
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, monospace',
                    color: '#1A1612'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="temp" 
                  stroke="#C2601F" 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false} 
                />
                <Line 
                  type="monotone" 
                  dataKey="chassis" 
                  stroke="#16A34A" 
                  strokeWidth={1.5} 
                  dot={false} 
                  isAnimationActive={false} 
                />
                <Line 
                  type="monotone" 
                  dataKey="electronics" 
                  stroke="#0284C7" 
                  strokeWidth={1.5} 
                  dot={false} 
                  isAnimationActive={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-[#9E8D7A] font-mono pt-2 mt-2 border-t border-[#D4C9B8] flex justify-between items-center">
        <span>Sensors: DS18B20 1-Wire (GPIO 4) · DHT22 (GPIO 5)</span>
        <span>Sampling: 10 Hz Real-Time</span>
      </div>
    </div>
  );
}
