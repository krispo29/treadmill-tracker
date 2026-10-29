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
      <div className="rounded-3xl bg-white border border-[#EDE6DC] p-6 flex flex-col items-center justify-center min-h-[180px] text-[#8C827A] text-xs shadow-cozy">
        <Activity className="w-6 h-6 mb-2 text-[#BDB5AB] animate-pulse" />
        <span className="font-medium">กราฟสถิติจะเริ่มวาดโดยอัตโนมัติเมื่อสายพานเริ่มหมุน</span>
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
    <div className="rounded-3xl bg-white border border-[#EDE6DC] p-5 sm:p-6 relative overflow-hidden shadow-cozy">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#EAF2EC] text-[#52796F]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2621]">
              Live Telemetry Profile
            </h3>
            <span className="text-[11px] text-[#8C827A]">
              วิเคราะห์ความเร็วและความชันตลอดเซสชั่น
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-[#52796F]">
            <span className="w-3 h-1 rounded-full bg-[#52796F]" />
            <span>Speed: {currentSpeed.toFixed(1)} km/h</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#C46849]">
            <span className="w-3 h-1 rounded-full bg-[#C46849]" />
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
              <stop offset="0%" stopColor="#52796F" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#52796F" stopOpacity="0.0" />
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
                  stroke="#EDE6DC"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                />
                {/* Left Y Axis Label (Speed) */}
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-[#8C827A] font-mono font-medium"
                >
                  {speedVal}
                </text>
                {/* Right Y Axis Label (Incline) */}
                <text
                  x={width - padding.right + 6}
                  y={y + 3}
                  textAnchor="start"
                  className="text-[9px] fill-[#8C827A] font-mono font-medium"
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
            stroke="#52796F"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Incline Line */}
          <path
            d={inclineLineD}
            fill="none"
            stroke="#C46849"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="3 2"
          />

          {/* Current Heads (Pointers) */}
          <circle cx={lastX} cy={lastYSpeed} r="4.5" fill="#52796F" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx={lastX} cy={lastYIncline} r="4" fill="#C46849" stroke="#FFFFFF" strokeWidth="2" />

          {/* Time ticks on Bottom */}
          <text
            x={padding.left}
            y={height - 5}
            textAnchor="start"
            className="text-[10px] fill-[#8C827A] font-mono font-medium"
          >
            {formatDuration(minSec)}
          </text>
          <text
            x={width - padding.right}
            y={height - 5}
            textAnchor="end"
            className="text-[10px] fill-[#8C827A] font-mono font-medium"
          >
            {formatDuration(maxSec)}
          </text>
        </svg>
      </div>
    </div>
  );
};
