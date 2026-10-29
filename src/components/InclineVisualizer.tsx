import React from 'react';
import { Mountain } from 'lucide-react';

interface InclineVisualizerProps {
  inclineLevel: number; // 0 - 20
}

export const InclineVisualizer: React.FC<InclineVisualizerProps> = ({ inclineLevel }) => {
  // Max incline is 20 levels. Rotation angle from 0 to 18 degrees visually
  const maxLevels = 20;
  const current = Math.min(Math.max(inclineLevel, 0), maxLevels);
  const visualAngle = (current / maxLevels) * 18;

  // PT Training Zones based on Incline
  const getZoneInfo = (level: number) => {
    if (level === 0) return { label: 'ทางราบ (Flat Recovery)', color: 'text-slate-400', desc: 'ผ่อนคลาย / วอร์มอัป' };
    if (level <= 4) return { label: 'เนินเบาๆ (Gentle Hill)', color: 'text-emerald-400', desc: 'กระตุ้นระบบหายใจ' };
    if (level <= 8) return { label: 'เดินขึ้นเนิน (Moderate Hike)', color: 'text-cyan-400', desc: 'เริ่มดึงไขมันมาใช้ (Zone 2)' };
    if (level <= 14) return { label: 'เดินชันเผาผลาญสูง (12-3-30 Burn)', color: 'text-orange-400', desc: 'เผาผลาญสูง โหลดข้อเข่าต่ำ' };
    return { label: 'ไต่เขาชันพิเศษ (Peak Alpine 20)', color: 'text-rose-400 font-bold', desc: 'กล้ามเนื้อสะโพกและน่องทำงานเต็มที่' };
  };

  const zone = getZoneInfo(current);

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
            <Mountain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              ความชันลู่วิ่ง (Incline)
            </h3>
            <span className={`text-xs ${zone.color}`}>{zone.label}</span>
          </div>
        </div>

        {/* Big Digit Display */}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black digital-number text-orange-400 glow-orange">
            {current}
          </span>
          <span className="text-xs text-slate-500 font-medium">/ 20</span>
        </div>
      </div>

      {/* Visual Animated Slope */}
      <div className="relative h-20 my-2 bg-slate-950/60 rounded-xl overflow-hidden border border-slate-800/80 flex items-end px-4 pb-2">
        {/* Dynamic Slope line */}
        <div
          className="absolute left-0 bottom-0 w-full h-1.5 bg-gradient-to-r from-orange-500 to-amber-300 origin-bottom-left transition-transform duration-500 ease-out shadow-lg shadow-orange-500/50"
          style={{ transform: `rotate(-${visualAngle}deg)` }}
        />

        {/* Slope Fill */}
        <div
          className="absolute left-0 bottom-0 w-full bg-gradient-to-t from-orange-500/15 to-transparent origin-bottom-left transition-transform duration-500 ease-out pointer-events-none"
          style={{
            height: '100%',
            transform: `rotate(-${visualAngle}deg)`,
          }}
        />

        {/* Treadmill Walker Icon representation */}
        <div
          className="absolute z-10 transition-all duration-500 ease-out flex items-center justify-center text-white"
          style={{
            left: '45%',
            bottom: `${Math.max(6, (current / 20) * 45)}px`,
          }}
        >
          <span className="text-lg">🏃‍♂️</span>
        </div>

        <div className="relative z-10 w-full flex justify-between text-[10px] text-slate-500">
          <span>0 (0%)</span>
          <span className="text-orange-400/80 font-medium">{zone.desc}</span>
          <span>Level 20</span>
        </div>
      </div>

      {/* 20 Segments LED Bar */}
      <div className="mt-2">
        <div className="grid grid-cols-20 gap-1 h-2.5">
          {Array.from({ length: maxLevels }, (_, i) => {
            const levelNum = i + 1;
            const isActive = levelNum <= current;
            return (
              <div
                key={levelNum}
                className={`rounded-sm transition-all duration-300 ${
                  isActive
                    ? levelNum > 14
                      ? 'bg-rose-500 shadow-sm shadow-rose-500'
                      : levelNum > 8
                      ? 'bg-orange-500 shadow-sm shadow-orange-500'
                      : 'bg-amber-400'
                    : 'bg-slate-800'
                }`}
                title={`Level ${levelNum}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
