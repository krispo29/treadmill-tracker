import React from 'react';
import { Flame, Droplet, Sparkles } from 'lucide-react';

interface FatBurnCardProps {
  fatGrams: number;
  inclineLevel: number;
}

export const FatBurnCard: React.FC<FatBurnCardProps> = ({ fatGrams, inclineLevel }) => {
  // Fun real-world comparisons
  const getFatComparison = (grams: number) => {
    if (grams < 2) return 'กำลังเริ่มวอร์มอัปดึงไขมันสะสม...';
    if (grams < 10) return `เทียบเท่าน้ำมันพืช ${grams.toFixed(1)} กรัม 🥄`;
    if (grams < 20) return `เทียบเท่าเนย 1 ก้อนเล็ก (${grams.toFixed(1)}g) 🧈`;
    if (grams < 35) return `เทียบเท่าน้ำมันมะกอก 2 ช้อนโต๊ะ (${grams.toFixed(1)}g) ✨`;
    if (grams < 50) return `เผาผลาญไขมันสะสมได้เกือบ 50 กรัม! 🔥`;
    return `สุดยอด! เผาผลาญไขมันแท้เทียบเท่าเนยครึ่งก้อน (${grams.toFixed(1)}g) 🏆`;
  };

  const isHighFatZone = inclineLevel >= 8;

  return (
    <div className="rounded-3xl bg-[#FFFDF9] border border-[#F2E5CE] p-5 sm:p-6 relative overflow-hidden shadow-cozy">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#FDF6EA] text-[#B67A28]">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#9A641F]">
              เผาผลาญไขมันแท้ (Fat Oxidation)
            </span>
            {isHighFatZone && (
              <span className="text-[11px] text-[#3B664E] block font-medium">
                🌿 อยู่ในช่วงเบิร์นไขมันสูงสุด (Incline &gt;= 8)
              </span>
            )}
          </div>
        </div>

        <div className="p-1.5 rounded-full bg-[#FDF6EA] text-[#B67A28] text-xs">
          <Droplet className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 my-2">
        <span className="text-4xl sm:text-5xl font-black digital-number text-[#2C2621]">
          {fatGrams.toFixed(1)}
        </span>
        <span className="text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-xl border bg-[#FDF6EA] text-[#9A641F] border-[#F0DFBE]">
          GRAMS
        </span>
      </div>

      <p className="text-xs text-[#8C827A] mt-2 truncate flex items-center gap-2 font-medium">
        <Sparkles className="w-4 h-4 text-[#DDA15E] shrink-0" />
        <span>{getFatComparison(fatGrams)}</span>
      </p>
    </div>
  );
};
