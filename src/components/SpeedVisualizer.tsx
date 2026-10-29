import React from 'react';
import { Gauge } from 'lucide-react';
import { formatPace } from '../services/calculations';

interface SpeedVisualizerProps {
  speedKmh: number; // 0.0 - 16.0
}

export const SpeedVisualizer: React.FC<SpeedVisualizerProps> = ({ speedKmh }) => {
  const maxSpeed = 16.0;
  const currentSpeed = Math.min(Math.max(speedKmh, 0), maxSpeed);
  const percentage = Math.min(100, Math.round((currentSpeed / maxSpeed) * 100));

  // PT Running Zones (Warm Cozy Palette)
  const getSpeedZone = (speed: number) => {
    if (speed <= 0.1) return { label: 'หยุดพัก (Idle)', color: 'text-[#8C827A]', progressColor: 'bg-[#D7CEC3]' };
    if (speed <= 4.5) return { label: 'เดินเบาสบาย (Easy Walk)', color: 'text-[#3B664E]', progressColor: 'bg-[#52796F]' };
    if (speed <= 6.5) return { label: 'เดินเร็วเบิร์นไขมัน (Zone 2 Power Walk)', color: 'text-[#436C55] font-semibold', progressColor: 'bg-[#4E7D63]' };
    if (speed <= 9.0) return { label: 'วิ่งเหยาะสบายๆ (Jogging)', color: 'text-[#A66E22] font-semibold', progressColor: 'bg-[#DDA15E]' };
    if (speed <= 12.0) return { label: 'วิ่งเร่งจังหวะ (Tempo Run)', color: 'text-[#C46849] font-semibold', progressColor: 'bg-[#D97757]' };
    return { label: 'สปรินต์ระดับสูง (Sprint)', color: 'text-[#B94A4A] font-bold animate-pulse', progressColor: 'bg-[#C95D63]' };
  };

  const zone = getSpeedZone(currentSpeed);
  const paceStr = formatPace(currentSpeed);

  return (
    <div className="rounded-3xl bg-white border border-[#EDE6DC] shadow-cozy p-5 sm:p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#EAF2EC] text-[#52796F]">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C827A]">
              ความเร็ว (Speed)
            </h3>
            <span className={`text-xs ${zone.color}`}>{zone.label}</span>
          </div>
        </div>

        {/* Pace display */}
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-[#8C827A] font-bold block">
            Pace (เพซ)
          </span>
          <span className="text-sm font-bold digital-number text-[#2C2621]">
            {paceStr} <span className="text-[10px] text-[#8C827A] font-normal">/km</span>
          </span>
        </div>
      </div>

      {/* Main Digital Speed */}
      <div className="my-3 flex items-baseline justify-center gap-2">
        <span className="text-6xl sm:text-7xl font-black digital-number text-[#2C2621]">
          {currentSpeed.toFixed(1)}
        </span>
        <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-[#EAF2EC] text-[#3B664E] border border-[#CDE0D3]">
          km/h
        </span>
      </div>

      {/* Speedometer Bar (0 to 16 km/h) */}
      <div className="mt-2">
        <div className="flex justify-between text-[11px] text-[#8C827A] font-medium mb-1.5">
          <span>0.0</span>
          <span>4.0</span>
          <span>8.0</span>
          <span>12.0</span>
          <span>16.0 km/h</span>
        </div>

        <div className="w-full h-3 bg-[#F5F0E8] rounded-full overflow-hidden p-0.5 border border-[#EDE6DC]">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${zone.progressColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
