"use client";

import React, { useRef, useEffect, useState } from "react";
import { Eye, Flame, Crosshair, Camera, Video, Compass, Radio } from "lucide-react";

export default function LiveThermalPanel({ 
  thermalGrid = [], 
  thermalMax = 33.5, 
  thermalDir = "CENTER",
  cameraStreamUrl = ""
}) {
  const canvasRef = useRef(null);
  const [activeView, setActiveView] = useState("thermal"); // "thermal" or "optical"
  const [streamError, setStreamError] = useState(false);

  // Iron / Inferno color map function (cold dark purple -> bright red -> amber -> white-hot)
  const getIronColor = (t, minT, maxT) => {
    const norm = Math.max(0, Math.min(1, (t - minT) / (maxT - minT || 1)));
    
    let r, g, b;
    if (norm < 0.25) {
      // 0.0 - 0.25: Black to Deep Purple
      r = Math.round(norm * 4 * 80);
      g = Math.round(norm * 4 * 20);
      b = Math.round(norm * 4 * 140);
    } else if (norm < 0.5) {
      // 0.25 - 0.5: Deep Purple to Red
      const n = (norm - 0.25) * 4;
      r = Math.round(80 + n * (220 - 80));
      g = Math.round(20 + n * (30 - 20));
      b = Math.round(140 - n * 120);
    } else if (norm < 0.75) {
      // 0.5 - 0.75: Red to Amber/Yellow
      const n = (norm - 0.5) * 4;
      r = Math.round(220 + n * 35);
      g = Math.round(30 + n * 190);
      b = Math.round(20 - n * 20);
    } else {
      // 0.75 - 1.0: Yellow to White Hot
      const n = (norm - 0.75) * 4;
      r = 255;
      g = Math.round(220 + n * 35);
      b = Math.round(n * 240);
    }
    return `rgb(${r}, ${g}, ${b})`;
  };

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

    // Render smooth interpolated thermal heatmap onto canvas
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
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
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
    ctx.fillStyle = "#000000";
    ctx.fillRect(hotX + 16, hotY - 22, 54, 18);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(hotX + 16, hotY - 22, 54, 18);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px ui-monospace, monospace";
    ctx.fillText(`${peakVal.toFixed(1)}°C`, hotX + 20, hotY - 9);

  }, [thermalGrid, thermalMax]);

  return (
    <div className="card-panel p-4 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#252830]">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#D97706]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#F5EFEB]">
              AMG8833 Thermal IR (8×8 Grid) &amp; Pi Stream
            </h3>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#17181D] p-0.5 rounded border border-[#252830] text-[10px] font-mono">
            <button
              onClick={() => setActiveView("thermal")}
              className={`px-2 py-0.5 rounded transition-all ${
                activeView === "thermal" 
                  ? "bg-[#D97706] text-black font-bold" 
                  : "text-[#A6987E] hover:text-[#F5EFEB]"
              }`}
            >
              THERMAL IR
            </button>
            <button
              onClick={() => setActiveView("optical")}
              className={`px-2 py-0.5 rounded transition-all ${
                activeView === "optical" 
                  ? "bg-[#D97706] text-black font-bold" 
                  : "text-[#A6987E] hover:text-[#F5EFEB]"
              }`}
            >
              PI CAMERA
            </button>
          </div>
        </div>

        {/* Hotspot & Direction Quick Readout Badges */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-[#17181D] border border-[#252830] rounded-lg p-2 flex items-center justify-between">
            <div className="text-[10px] font-mono text-[#A6987E]">PEAK THERMAL:</div>
            <div className="font-mono text-base font-bold text-[#F5EFEB]">
              {thermalMax.toFixed(1)}<span className="text-xs text-[#A6987E]">°C</span>
            </div>
          </div>
          <div className="bg-[#17181D] border border-[#252830] rounded-lg p-2 flex items-center justify-between">
            <div className="text-[10px] font-mono text-[#A6987E]">HOTSPOT AZIMUTH:</div>
            <div className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
              thermalDir === "CENTER" ? "bg-amber-950/70 border-amber-600 text-amber-300" :
              thermalDir === "RIGHT" ? "bg-red-950/70 border-red-600 text-red-300" :
              "bg-sky-950/70 border-sky-600 text-sky-300"
            }`}>
              {thermalDir}
            </div>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-[#252830] bg-black flex items-center justify-center shadow-inner">
          
          {activeView === "thermal" ? (
            <>
              <canvas
                ref={canvasRef}
                width={320}
                height={240}
                className="w-full h-full object-cover"
              />
              {/* Tactical HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between text-[10px] font-mono text-white/80">
                <div className="flex justify-between items-center bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                  <span>AMG8833 (I2C 0x69) · 8×8 BILINEAR</span>
                  <span className="text-[#D97706] font-bold">PALETTE: INFERNO/IRON</span>
                </div>
                <div className="flex justify-between items-center bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                  <span>HOTSPOT: {thermalDir}</span>
                  <span className="text-emerald-400">TARGET ACQUIRED</span>
                </div>
              </div>
            </>
          ) : (
            /* Raspberry Pi Camera Stream Slot */
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#090A0C]">
              {cameraStreamUrl && !streamError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={cameraStreamUrl} 
                  alt="Raspberry Pi Video Feed" 
                  className="w-full h-full object-cover"
                  onError={() => setStreamError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#7E766B]">
                  <Video className="w-10 h-10 mb-2 opacity-40 text-[#D97706]" />
                  <div className="font-mono text-xs font-bold text-[#F5EFEB] mb-1">
                    RASPBERRY PI VIDEO STREAM (MJPEG / WebRTC)
                  </div>
                  <p className="text-[11px] text-[#A6987E] max-w-xs mb-2">
                    {cameraStreamUrl ? "Connecting to video stream endpoint..." : "No stream URL configured in .env (CAMERA_STREAM_URL). Stream placeholder active."}
                  </p>
                  <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    OPTICAL TARGETING READY
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Footer scale info */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[#7E766B] pt-2 border-t border-[#252830]">
        <span>Grid: 64 Elements (10 Hz)</span>
        <div className="flex items-center gap-1">
          <span>Cold (25°C)</span>
          <div className="w-16 h-2 rounded-full bg-gradient-to-r from-indigo-800 via-red-600 to-yellow-200" />
          <span>Hot (85°C)</span>
        </div>
      </div>
    </div>
  );
}
