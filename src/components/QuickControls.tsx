import React, { useState, useEffect } from 'react';
import { Plus, Minus, Mountain, Gauge, Play, Square, Edit3, Check } from 'lucide-react';

interface QuickControlsProps {
  currentSpeed: number;
  currentIncline: number;
  onSetSpeed: (speed: number) => void;
  onSetIncline: (incline: number) => void;
  onStart?: (speed?: number) => void;
  onStop?: () => void;
}

export const QuickControls: React.FC<QuickControlsProps> = ({
  currentSpeed,
  currentIncline,
  onSetSpeed,
  onSetIncline,
  onStart,
  onStop
}) => {
  // Internal target speed so adjustments (+0.1 / -0.1) are immediate and not affected by motor acceleration lag
  const [targetSpeed, setTargetSpeed] = useState<number>(() => currentSpeed > 0 ? currentSpeed : 3.0);
  const [targetIncline, setTargetIncline] = useState<number>(currentIncline);
  const [isCustomSpeedOpen, setIsCustomSpeedOpen] = useState(false);
  const [customInputVal, setCustomInputVal] = useState('');

  // Sync target with incoming actual speed if user is not actively editing
  useEffect(() => {
    if (currentSpeed > 0.5 && Math.abs(currentSpeed - targetSpeed) > 0.05 && !isCustomSpeedOpen) {
      setTargetSpeed(currentSpeed);
    }
  }, [currentSpeed, isCustomSpeedOpen]);

  useEffect(() => {
    setTargetIncline(currentIncline);
  }, [currentIncline]);

  // Adjust speed with precise decimals (e.g. +0.1, -0.1, +0.5, -0.5)
  // Minimum speed when adjusting is clamped to 1.0 km/h so pressing minus NEVER drops to 0!
  const adjustSpeed = (delta: number) => {
    const base = targetSpeed > 0.5 ? targetSpeed : (currentSpeed > 0.5 ? currentSpeed : 3.0);
    const newSpeed = Math.min(16.0, Math.max(1.0, Math.round((base + delta) * 10) / 10));
    setTargetSpeed(newSpeed);
    onSetSpeed(newSpeed);
  };

  const setDirectSpeed = (spd: number) => {
    const clamped = Math.min(16.0, Math.max(0, Math.round(spd * 10) / 10));
    setTargetSpeed(clamped > 0 ? clamped : 3.0);
    onSetSpeed(clamped);
  };

  const adjustIncline = (delta: number) => {
    const base = targetIncline;
    const newIncline = Math.min(20, Math.max(0, Math.round(base + delta)));
    setTargetIncline(newIncline);
    onSetIncline(newIncline);
  };

  const handleApplyCustomSpeed = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(customInputVal);
    if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 16.0) {
      setDirectSpeed(parsed);
      setIsCustomSpeedOpen(false);
      setCustomInputVal('');
    }
  };

  const speedPresets = [2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 10.0, 12.0, 16.0];
  const inclinePresets = [0, 2, 4, 6, 8, 10, 12, 16, 20];

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span>🎮 Quick Controls (ควบคุมลู่วิ่งปรับละเอียด 0.1)</span>
        </h3>
        <span className="text-[11px] text-slate-400 font-mono">
          ปัจจุบัน: {currentSpeed.toFixed(1)} km/h | ชัน: {currentIncline}
        </span>
      </div>

      {/* Master Motor Controls: Start / Stop */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={() => {
            const startSpd = targetSpeed >= 1.0 ? targetSpeed : 3.0;
            if (onStart) onStart(startSpd);
            else onSetSpeed(startSpd);
          }}
          className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>เริ่มเดิน (Start {targetSpeed >= 1.0 ? targetSpeed.toFixed(1) : '3.0'})</span>
        </button>

        <button
          onClick={() => {
            if (onStop) onStop();
            else onSetSpeed(0);
          }}
          className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <Square className="w-4 h-4 fill-rose-300" />
          <span>หยุดสายพาน (Stop)</span>
        </button>
      </div>

      {/* Speed Controls with Decimal Fine-Tuning */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5" />
            <span>ปรับสปีดละเอียด (ทศนิยม 0.1 km/h)</span>
          </span>

          <button
            onClick={() => {
              setIsCustomSpeedOpen(!isCustomSpeedOpen);
              setCustomInputVal(targetSpeed.toFixed(1));
            }}
            className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
            <span>พิมพ์ระบุตัวเลข</span>
          </button>
        </div>

        {/* Custom Decimal Speed Input Modal/Bar */}
        {isCustomSpeedOpen && (
          <form onSubmit={handleApplyCustomSpeed} className="flex items-center gap-2 bg-slate-850 p-2 rounded-xl border border-cyan-500/30">
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="16.0"
              value={customInputVal}
              onChange={(e) => setCustomInputVal(e.target.value)}
              placeholder="เช่น 3.2 หรือ 4.8"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              autoFocus
            />
            <button
              type="submit"
              className="py-1.5 px-3 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>ปรับ</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCustomSpeedOpen(false)}
              className="py-1.5 px-2 rounded-lg bg-slate-800 text-slate-400 text-xs hover:text-white"
            >
              ปิด
            </button>
          </form>
        )}

        {/* Decimal Stepper Buttons */}
        <div className="flex items-center justify-between gap-1.5 bg-slate-850/60 p-2 rounded-xl border border-slate-800">
          <button
            onClick={() => adjustSpeed(-0.5)}
            className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold active:scale-95 cursor-pointer border border-slate-700/60"
            title="ลด 0.5 km/h"
          >
            -0.5
          </button>

          <button
            onClick={() => adjustSpeed(-0.1)}
            className="flex-1 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-bold active:scale-95 cursor-pointer border border-cyan-500/40"
            title="ลด 0.1 km/h"
          >
            -0.1
          </button>

          {/* Central Target Speed Display */}
          <div className="px-3 py-1 text-center min-w-[90px]">
            <span className="text-xl sm:text-2xl font-black digital-number text-cyan-400">
              {targetSpeed.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">km/h</span>
          </div>

          <button
            onClick={() => adjustSpeed(0.1)}
            className="flex-1 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-bold active:scale-95 cursor-pointer border border-cyan-500/40"
            title="เพิ่ม 0.1 km/h"
          >
            +0.1
          </button>

          <button
            onClick={() => adjustSpeed(0.5)}
            className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold active:scale-95 cursor-pointer border border-slate-700/60"
            title="เพิ่ม 0.5 km/h"
          >
            +0.5
          </button>
        </div>

        {/* Speed Presets Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
          {speedPresets.map((spd) => {
            const isSelected = Math.abs(targetSpeed - spd) < 0.05;
            return (
              <button
                key={spd}
                onClick={() => setDirectSpeed(spd)}
                className={`py-2 rounded-xl text-xs font-bold digital-number transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                {spd.toFixed(spd % 1 === 0 ? 0 : 1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Incline Controls Row */}
      <div className="space-y-2 pt-2 border-t border-slate-800/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-orange-400 font-semibold flex items-center gap-1.5">
            <Mountain className="w-3.5 h-3.5" />
            <span>ปรับความชัน (Incline 0-20)</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => adjustIncline(-1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 cursor-pointer active:scale-95 border border-slate-700"
              title="ลดความชัน 1"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 font-mono font-bold text-white text-sm">
              Lvl {targetIncline}
            </span>
            <button
              onClick={() => adjustIncline(1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 cursor-pointer active:scale-95 border border-slate-700"
              title="เพิ่มความชัน 1"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Incline Presets */}
        <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
          {inclinePresets.map((inc) => {
            const isSelected = targetIncline === inc;
            return (
              <button
                key={inc}
                onClick={() => {
                  setTargetIncline(inc);
                  onSetIncline(inc);
                }}
                className={`py-2 rounded-xl text-xs font-bold digital-number transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
                    : inc === 12
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
                title={inc === 12 ? 'สูตร 12-3-30 ยอดนิยม' : undefined}
              >
                {inc === 12 ? '12★' : inc}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
