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

  // PT Running Zones
  const getSpeedZone = (speed: number) => {
    if (speed <= 0.1) return { label: 'หยุดพัก (Idle)', color: 'text-slate-400', progressColor: 'bg-slate-700' };
    if (speed <= 4.5) return { label: 'เดินปกติ (Easy Walk)', color: 'text-emerald-400', progressColor: 'bg-emerald-500' };
    if (speed <= 6.5) return { label: 'เดินเร็ว (Power Walk / Zone 2)', color: 'text-cyan-400', progressColor: 'bg-cyan-500' };
    if (speed <= 9.0) return { label: 'วิ่งเหยาะ (Jogging / Base Run)', color: 'text-blue-400', progressColor: 'bg-blue-500' };
    if (speed <= 12.0) return { label: 'วิ่งเร็ว (Tempo Pace)', color: 'text-amber-400', progressColor: 'bg-amber-500' };
    return { label: 'สปรินต์สูงสุด (VO2 Max Sprint)', color: 'text-rose-400 font-bold animate-pulse', progressColor: 'bg-rose-500' };
  };

  const zone = getSpeedZone(currentSpeed);
  const paceStr = formatPace(currentSpeed);

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              ความเร็ว (Speed)
            </h3>
            <span className={`text-xs ${zone.color}`}>{zone.label}</span>
          </div>
        </div>

        {/* Pace display */}
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
            Pace (เพซ)
          </span>
          <span className="text-sm font-bold digital-number text-slate-200">
            {paceStr} <span className="text-[10px] text-slate-400 font-normal">/km</span>
          </span>
        </div>
      </div>

      {/* Main Digital Speed */}
      <div className="my-2 flex items-baseline justify-center gap-2">
        <span className="text-5xl sm:text-6xl font-black digital-number text-cyan-400 glow-cyan">
          {currentSpeed.toFixed(1)}
        </span>
        <span className="text-sm font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
          km/h
        </span>
      </div>

      {/* Speedometer Bar (0 to 16 km/h) */}
      <div className="mt-2">
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>0.0</span>
          <span>4.0</span>
          <span>8.0</span>
          <span>12.0</span>
          <span>16.0 km/h</span>
        </div>

        <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${zone.progressColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
