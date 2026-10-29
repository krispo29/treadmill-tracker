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

  // PT Training Zones based on Incline (Warm Cozy Palette)
  const getZoneInfo = (level: number) => {
    if (level === 0) return { label: 'ทางราบ (Flat Recovery)', color: 'text-[#8C827A]', desc: 'ผ่อนคลาย / วอร์มอัป' };
    if (level <= 4) return { label: 'เนินเบาๆ (Gentle Hill)', color: 'text-[#3B664E]', desc: 'กระตุ้นการหายใจสบายๆ' };
    if (level <= 8) return { label: 'เดินขึ้นเนิน (Moderate Hike)', color: 'text-[#A66E22] font-semibold', desc: 'เริ่มดึงไขมันสะสม (Zone 2)' };
    if (level <= 14) return { label: 'เดินชันเผาผลาญสูง (12-3-30 Burn)', color: 'text-[#C46849] font-semibold', desc: 'เผาผลาญสูง ถนอมข้อเข่า' };
    return { label: 'ไต่เขาชันพิเศษ (Peak Alpine 20)', color: 'text-[#B94A4A] font-bold', desc: 'กระชับสะโพกและเรียวขาเต็มที่' };
  };

  const zone = getZoneInfo(current);

  return (
    <div className="rounded-3xl bg-white border border-[#EDE6DC] shadow-cozy p-5 sm:p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#FDF0EC] text-[#C46849]">
            <Mountain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C827A]">
              ความชันลู่วิ่ง (Incline)
            </h3>
            <span className={`text-xs ${zone.color}`}>{zone.label}</span>
          </div>
        </div>

        {/* Big Digit Display */}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl sm:text-5xl font-black digital-number text-[#2C2621]">
            {current}
          </span>
          <span className="text-xs text-[#8C827A] font-medium">/ 20</span>
        </div>
      </div>

      {/* Visual Animated Slope */}
      <div className="relative h-20 my-2 bg-[#FAF7F2] rounded-2xl overflow-hidden border border-[#EDE6DC] flex items-end px-4 pb-2">
        {/* Dynamic Slope line */}
        <div
          className="absolute left-0 bottom-0 w-full h-2 bg-gradient-to-r from-[#DDA15E] to-[#C46849] origin-bottom-left transition-transform duration-500 ease-out shadow-sm"
          style={{ transform: `rotate(-${visualAngle}deg)` }}
        />

        {/* Slope Fill */}
        <div
          className="absolute left-0 bottom-0 w-full bg-gradient-to-t from-[#C46849]/15 to-transparent origin-bottom-left transition-transform duration-500 ease-out pointer-events-none"
          style={{
            height: '100%',
            transform: `rotate(-${visualAngle}deg)`,
          }}
        />

        {/* Treadmill Walker Icon representation */}
        <div
          className="absolute z-10 transition-all duration-500 ease-out flex items-center justify-center text-[#2C2621]"
          style={{
            left: '45%',
            bottom: `${Math.max(6, (current / 20) * 45)}px`,
          }}
        >
          <span className="text-xl">🏃‍♀️</span>
        </div>

        <div className="relative z-10 w-full flex justify-between text-[11px] text-[#8C827A] font-medium">
          <span>0 (0%)</span>
          <span className="text-[#C46849] font-medium">{zone.desc}</span>
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
                className={`rounded-full transition-all duration-300 ${
                  isActive
                    ? levelNum > 14
                      ? 'bg-[#C95D63]'
                      : levelNum > 8
                      ? 'bg-[#C46849]'
                      : 'bg-[#DDA15E]'
                    : 'bg-[#EFE8DD]'
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
