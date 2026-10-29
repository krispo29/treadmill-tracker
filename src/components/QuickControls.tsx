import React from 'react';
import { Plus, Minus, Mountain, Gauge, Play, Square } from 'lucide-react';

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
  const speedPresets = [3.0, 5.0, 8.0, 10.0, 12.0, 16.0];
  const inclinePresets = [0, 4, 8, 12, 16, 20];

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span>🎮 Quick Controls (ปุ่มลัดควบคุมลู่วิ่ง)</span>
        </h3>
        <span className="text-[11px] text-slate-500">
          แตะเพื่อปรับสปีดหรือความชันทันที
        </span>
      </div>

      {/* Master Motor Controls: Start / Stop */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={() => onStart ? onStart(3.0) : onSetSpeed(3.0)}
          className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>เริ่มเดิน (Start 3.0)</span>
        </button>

        <button
          onClick={() => onStop ? onStop() : onSetSpeed(0)}
          className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <Square className="w-4 h-4 fill-rose-300" />
          <span>หยุดสายพาน (Stop)</span>
        </button>
      </div>

      {/* Speed Controls Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5" />
            <span>ปรับความเร็ว (Speed)</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSetSpeed(Math.max(0, currentSpeed - 0.5))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer active:scale-95"
              title="ลดสปีด 0.5"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-bold text-white text-sm">
              {currentSpeed.toFixed(1)}
            </span>
            <button
              onClick={() => onSetSpeed(Math.min(16, currentSpeed + 0.5))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer active:scale-95"
              title="เพิ่มสปีด 0.5"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Speed Presets */}
        <div className="grid grid-cols-6 gap-2">
          {speedPresets.map((spd) => {
            const isSelected = Math.abs(currentSpeed - spd) < 0.2;
            return (
              <button
                key={spd}
                onClick={() => onSetSpeed(spd)}
                className={`py-2 rounded-xl text-xs font-bold digital-number transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                {spd.toFixed(1)}
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
              onClick={() => onSetIncline(Math.max(0, currentIncline - 1))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer active:scale-95"
              title="ลดความชัน 1"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-bold text-white text-sm">
              Lvl {currentIncline}
            </span>
            <button
              onClick={() => onSetIncline(Math.min(20, currentIncline + 1))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer active:scale-95"
              title="เพิ่มความชัน 1"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Incline Presets */}
        <div className="grid grid-cols-6 gap-2">
          {inclinePresets.map((inc) => {
            const isSelected = currentIncline === inc;
            return (
              <button
                key={inc}
                onClick={() => onSetIncline(inc)}
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
