import React from 'react';
import { Activity } from 'lucide-react';
import type { TelemetryPoint } from '../types/treadmill';
import { formatDuration } from '../services/calculations';

interface LiveWorkoutChartProps {
  telemetry: TelemetryPoint[];
  currentSpeed: number;
  currentIncline: number;
}

export const LiveWorkoutChart: React.FC<LiveWorkoutChartProps> = ({
  telemetry,
  currentSpeed,
  currentIncline
}) => {
  // If no data, show idle placeholder
  if (telemetry.length < 2) {
    return (
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col items-center justify-center min-h-[180px] text-slate-500 text-xs">
        <Activity className="w-6 h-6 mb-2 text-slate-600 animate-pulse" />
        <span>กราฟสถิติ Real-time จะเริ่มวาดอัตโนมัติเมื่อสายพานเริ่มหมุน</span>
      </div>
    );
  }

  const width = 800;
  const height = 180;
  const padding = { top: 20, right: 35, bottom: 25, left: 35 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxSpeed = 16.0;
  const maxIncline = 20;

  const pointsCount = telemetry.length;
  const minSec = telemetry[0].second;
  const maxSec = Math.max(telemetry[pointsCount - 1].second, minSec + 1);

  // Helper scale functions
  const getX = (sec: number) => padding.left + ((sec - minSec) / (maxSec - minSec)) * innerWidth;
  const getYSpeed = (speed: number) => padding.top + innerHeight - (Math.min(speed, maxSpeed) / maxSpeed) * innerHeight;
  const getYIncline = (incline: number) => padding.top + innerHeight - (Math.min(incline, maxIncline) / maxIncline) * innerHeight;

  // Build SVG path for Speed (Area + Line)
  const speedPathPoints = telemetry.map((p) => `${getX(p.second)},${getYSpeed(p.speed)}`);
  const speedLineD = `M ${speedPathPoints.join(' L ')}`;
  const speedAreaD = `${speedLineD} L ${getX(telemetry[pointsCount - 1].second)},${padding.top + innerHeight} L ${getX(telemetry[0].second)},${padding.top + innerHeight} Z`;

  // Build SVG path for Incline (Staircase line)
  const inclinePathPoints = telemetry.map((p) => `${getX(p.second)},${getYIncline(p.incline)}`);
  const inclineLineD = `M ${inclinePathPoints.join(' L ')}`;

  // Last point coordinates
  const lastP = telemetry[pointsCount - 1];
  const lastX = getX(lastP.second);
  const lastYSpeed = getYSpeed(lastP.speed);
  const lastYIncline = getYIncline(lastP.incline);

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Live Telemetry Profile
            </h3>
            <span className="text-[11px] text-slate-500">
              วิเคราะห์ความเร็วและความชันตลอดเซสชั่น
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-3 h-1 rounded-full bg-cyan-400" />
            <span>Speed: {currentSpeed.toFixed(1)} km/h</span>
          </div>
          <div className="flex items-center gap-1.5 text-orange-400">
            <span className="w-3 h-1 rounded-full bg-orange-400" />
            <span>Incline: Lvl {currentIncline}</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Viewport */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Speed Gradient */}
            <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + innerHeight * (1 - ratio);
            const speedVal = (ratio * maxSpeed).toFixed(0);
            const inclineVal = Math.round(ratio * maxIncline);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="0.7"
                  strokeDasharray="4 4"
                />
                {/* Left Y Axis Label (Speed) */}
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-500 font-mono"
                >
                  {speedVal}
                </text>
                {/* Right Y Axis Label (Incline) */}
                <text
                  x={width - padding.right + 6}
                  y={y + 3}
                  textAnchor="start"
                  className="text-[9px] fill-slate-500 font-mono"
                >
                  {inclineVal}
                </text>
              </g>
            );
          })}

          {/* Speed Area & Line */}
          <path d={speedAreaD} fill="url(#speedGradient)" />
          <path
            d={speedLineD}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Incline Line */}
          <path
            d={inclineLineD}
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2 1"
          />

          {/* Current Heads (Pointers) */}
          <circle cx={lastX} cy={lastYSpeed} r="4" fill="#06b6d4" stroke="#083344" strokeWidth="2" />
          <circle cx={lastX} cy={lastYIncline} r="3.5" fill="#f97316" stroke="#431407" strokeWidth="2" />

          {/* Time ticks on Bottom */}
          <text
            x={padding.left}
            y={height - 5}
            textAnchor="start"
            className="text-[10px] fill-slate-500 font-mono"
          >
            {formatDuration(minSec)}
          </text>
          <text
            x={width - padding.right}
            y={height - 5}
            textAnchor="end"
            className="text-[10px] fill-slate-500 font-mono"
          >
            {formatDuration(maxSec)}
          </text>
        </svg>
      </div>
    </div>
  );
};
