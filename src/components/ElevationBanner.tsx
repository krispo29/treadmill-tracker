import React from 'react';
import { Mountain } from 'lucide-react';
import { getNearestLandmark } from '../services/calculations';

interface ElevationBannerProps {
  elevationMeters: number;
}

export const ElevationBanner: React.FC<ElevationBannerProps> = ({
  elevationMeters
}) => {
  const roundedMeters = Math.round(elevationMeters);
  const { current: landmark, progress } = getNearestLandmark(elevationMeters);

  return (
    <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-indigo-500/20 p-4 sm:p-5 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        
        {/* Left: Total Elevation */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Mountain className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-indigo-300">
              ความสูงสะสม (Elevation Gain)
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-black digital-number text-white">
                +{roundedMeters}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                เมตร
              </span>
              <span className="text-xs text-slate-400">
                (เทียบเท่าขึ้นบันได ~{Math.round(roundedMeters / 3)} ชั้น)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Milestone Landmark */}
        <div className="sm:max-w-xs w-full bg-slate-950/50 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <span>{landmark.icon}</span>
              <span>เป้าหมาย: <strong className="text-slate-200">{landmark.name}</strong></span>
            </span>
            <span className="font-semibold text-indigo-400">{progress}%</span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0m</span>
            <span>ความสูงตึก {landmark.heightMeters}m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
