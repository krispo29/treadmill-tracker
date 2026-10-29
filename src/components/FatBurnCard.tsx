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
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-amber-950/40 border border-amber-500/20 p-4 sm:p-5 relative overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-amber-300">
              เผาผลาญไขมันแท้ (Fat Oxidation)
            </span>
            {isHighFatZone && (
              <span className="text-[10px] text-emerald-400 block font-medium">
                ⚡ กำลังอยู่ใน Max Fat Burn Zone (ความชัน &gt;= 8)
              </span>
            )}
          </div>
        </div>

        <div className="p-1 rounded-full bg-amber-500/10 text-amber-300 text-xs">
          <Droplet className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 my-1">
        <span className="text-4xl sm:text-5xl font-black digital-number text-amber-400 glow-orange">
          {fatGrams.toFixed(1)}
        </span>
        <span className="text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-300 border-amber-500/30">
          GRAMS
        </span>
      </div>

      <p className="text-xs text-slate-400 mt-2 truncate flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>{getFatComparison(fatGrams)}</span>
      </p>
    </div>
  );
};
