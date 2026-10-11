"use client";

import React, { useRef, useEffect, useState } from "react";
import { Flame, Video } from "lucide-react";

export default function LiveThermalPanel({ 
  thermalGrid = [], 
  thermalMax = 33.5, 
  thermalDir = "CENTER",
  cameraStreamUrl = ""
}) {
  const canvasRef = useRef(null);
  const [activeView, setActiveView] = useState("thermal"); // "thermal" or "optical"
  const [streamError, setStreamError] = useState(false);

  // Render 8x8 AMG8833 grid with smooth bi-linear interpolation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Default 8x8 grid if not supplied
    let grid = thermalGrid;
    if (!grid || grid.length !== 64) {
      grid = [];
      for (let i = 0; i < 64; i++) grid.push(28 + Math.random() * 4);
    }

    let minT = 25;
    let maxT = Math.max(thermalMax, 40);
    let maxIdx = 0;
    let peakVal = -999;

    for (let i = 0; i < grid.length; i++) {
      if (grid[i] > peakVal) {
        peakVal = grid[i];
        maxIdx = i;
      }
      if (grid[i] < minT) minT = grid[i];
    }

    // Render smooth interpolated thermal heatmap onto offscreen canvas
    const offscreen = document.createElement("canvas");
    offscreen.width = 8;
    offscreen.height = 8;
    const offCtx = offscreen.getContext("2d");
    const imgData = offCtx.createImageData(8, 8);

    for (let i = 0; i < 64; i++) {
      const val = grid[i];
      const norm = Math.max(0, Math.min(1, (val - minT) / (maxT - minT || 1)));

      let r, g, b;
      if (norm < 0.25) {
        r = Math.round(norm * 4 * 80);
        g = Math.round(norm * 4 * 20);
        b = Math.round(norm * 4 * 140);
      } else if (norm < 0.5) {
        const n = (norm - 0.25) * 4;
        r = Math.round(80 + n * 140);
        g = Math.round(20 + n * 10);
        b = Math.round(140 - n * 120);
      } else if (norm < 0.75) {
        const n = (norm - 0.5) * 4;
        r = Math.round(220 + n * 35);
        g = Math.round(30 + n * 190);
        b = Math.round(20 - n * 20);
      } else {
        const n = (norm - 0.75) * 4;
        r = 255;
        g = Math.round(220 + n * 35);
        b = Math.round(n * 240);
      }

      imgData.data[i * 4 + 0] = r;
      imgData.data[i * 4 + 1] = g;
      imgData.data[i * 4 + 2] = b;
      imgData.data[i * 4 + 3] = 255;
    }
    offCtx.putImageData(imgData, 0, 0);

    // Draw smoothed enlarged image
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(offscreen, 0, 0, width, height);

    // Subtle 8x8 cell grid overlay
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += width / 8) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += height / 8) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Hotspot Target Crosshair on hottest cell
    const maxRow = Math.floor(maxIdx / 8);
    const maxCol = maxIdx % 8;
    const hotX = (maxCol + 0.5) * (width / 8);
    const hotY = (maxRow + 0.5) * (height / 8);

    // Crosshair Reticle
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hotX, hotY, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(hotX - 20, hotY); ctx.lineTo(hotX + 20, hotY);
    ctx.moveTo(hotX, hotY - 20); ctx.lineTo(hotX, hotY + 20);
    ctx.stroke();

    // Hotspot temperature tag
    ctx.fillStyle = "rgba(26,22,18,0.85)";
    ctx.fillRect(hotX + 16, hotY - 22, 54, 18);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(hotX + 16, hotY - 22, 54, 18);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px ui-monospace, monospace";
    ctx.fillText(`${peakVal.toFixed(1)}°C`, hotX + 20, hotY - 9);

  }, [thermalGrid, thermalMax]);

  return (
    <div className="card-panel p-4 flex flex-col justify-between border-[#D4C9B8]">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#D4C9B8]">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#C2601F]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1612]">
              AMG8833 Thermal IR (8×8 Grid) &amp; Pi Stream
            </h3>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#F2EDE6] p-0.5 rounded-lg border border-[#D4C9B8] text-[10px] font-mono">
            <button
              onClick={() => setActiveView("thermal")}
              className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                activeView === "thermal" 
                  ? "bg-[#C2601F] text-white shadow-sm" 
                  : "text-[#6B5C4C] hover:text-[#1A1612]"
              }`}
            >
              THERMAL IR
            </button>
            <button
              onClick={() => setActiveView("optical")}
              className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                activeView === "optical" 
                  ? "bg-[#C2601F] text-white shadow-sm" 
                  : "text-[#6B5C4C] hover:text-[#1A1612]"
              }`}
            >
              PI CAMERA
            </button>
          </div>
        </div>

        {/* Hotspot & Direction Quick Readout Badges */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-2.5 flex items-center justify-between">
            <div className="text-[10px] font-mono text-[#9E8D7A]">PEAK THERMAL:</div>
            <div className="font-mono text-base font-bold text-[#1A1612]">
              {thermalMax.toFixed(1)}<span className="text-xs text-[#9E8D7A]">°C</span>
            </div>
          </div>
          <div className="bg-[#F2EDE6] border border-[#D4C9B8] rounded-xl p-2.5 flex items-center justify-between">
            <div className="text-[10px] font-mono text-[#9E8D7A]">HOTSPOT AZIMUTH:</div>
            <div className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
              thermalDir === "CENTER" ? "bg-amber-100 border-amber-400 text-amber-800" :
              thermalDir === "RIGHT" ? "bg-red-100 border-red-400 text-red-800" :
              "bg-sky-100 border-sky-400 text-sky-800"
            }`}>
              {thermalDir}
            </div>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#D4C9B8] bg-[#1A1612] flex items-center justify-center shadow-inner">
          
          {activeView === "thermal" ? (
            <>
              <canvas
                ref={canvasRef}
                width={320}
                height={240}
                className="w-full h-full object-cover"
              />
              {/* Tactical HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between text-[10px] font-mono text-white/90">
                <div className="flex justify-between items-center bg-black/45 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/10">
                  <span>AMG8833 (I2C 0x69) · 8×8 BILINEAR</span>
                  <span className="text-amber-300 font-bold">PALETTE: INFERNO/IRON</span>
                </div>
                <div className="flex justify-between items-center bg-black/45 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/10">
                  <span>HOTSPOT: {thermalDir}</span>
                  <span className="text-emerald-300 font-bold">TARGET ACQUIRED</span>
                </div>
              </div>
            </>
          ) : (
            /* Raspberry Pi Camera Stream Slot */
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#EDE8E0]">
              {cameraStreamUrl && !streamError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={cameraStreamUrl} 
                  alt="Raspberry Pi Video Feed" 
                  className="w-full h-full object-cover"
                  onError={() => setStreamError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#6B5C4C]">
                  <Video className="w-10 h-10 mb-2 opacity-50 text-[#C2601F]" />
                  <div className="font-mono text-xs font-bold text-[#1A1612] mb-1">
                    RASPBERRY PI VIDEO STREAM (MJPEG / WebRTC)
                  </div>
                  <p className="text-[11px] text-[#9E8D7A] max-w-xs mb-2">
                    {cameraStreamUrl ? "Connecting to video stream endpoint..." : "No stream URL configured in .env (CAMERA_STREAM_URL). Stream placeholder active."}
                  </p>
                  <div className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E5DFD6] text-[#6B5C4C] border border-[#D4C9B8]">
                    OPTICAL TARGETING READY
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Footer scale info */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[#9E8D7A] pt-2 mt-2 border-t border-[#D4C9B8]">
        <span>Grid: 64 Elements (10 Hz)</span>
        <div className="flex items-center gap-1.5">
          <span>Cold (25°C)</span>
          <div className="w-16 h-2 rounded-full bg-gradient-to-r from-indigo-800 via-red-600 to-yellow-200" />
          <span>Hot (85°C)</span>
        </div>
      </div>
    </div>
  );
}
