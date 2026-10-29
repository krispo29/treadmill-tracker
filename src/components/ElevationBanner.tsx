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
    <div className="rounded-3xl bg-white border border-[#EDE6DC] p-5 sm:p-6 relative overflow-hidden shadow-cozy">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        
        {/* Left: Total Elevation */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F5EFF7] border border-[#E5D7E8] flex items-center justify-center text-[#7C5A87]">
            <Mountain className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#7C5A87]">
              ความสูงสะสม (Elevation Gain)
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-black digital-number text-[#2C2621]">
                +{roundedMeters}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-xl bg-[#F5EFF7] text-[#694874] border border-[#E5D7E8]">
                เมตร
              </span>
              <span className="text-xs text-[#8C827A] font-medium">
                (เทียบเท่าขึ้นบันได ~{Math.round(roundedMeters / 3)} ชั้น)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Milestone Landmark */}
        <div className="sm:max-w-xs w-full bg-[#FAF7F2] rounded-2xl p-3.5 border border-[#EDE6DC]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#8C827A] flex items-center gap-1.5 font-medium">
              <span className="text-sm">{landmark.icon}</span>
              <span>เป้าหมาย: <strong className="text-[#2C2621]">{landmark.name}</strong></span>
            </span>
            <span className="font-bold text-[#7C5A87]">{progress}%</span>
          </div>

          <div className="w-full h-2 bg-[#EFE8DD] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7C5A87] transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-[#8C827A] font-medium mt-1">
            <span>0m</span>
            <span>ความสูง {landmark.heightMeters}m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
