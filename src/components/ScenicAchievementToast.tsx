import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, X, Trophy } from 'lucide-react';
import type { AchievementItem } from '../services/scenicAchievements';

interface ScenicAchievementToastProps {
  queue: AchievementItem[];
  onDismiss: (id: string) => void;
  durationMs?: number;
}

export const ScenicAchievementToast: React.FC<ScenicAchievementToastProps> = ({ 
  queue, 
  onDismiss,
  durationMs = 2800 
}) => {
  const current = queue[0] ?? null;
  const currentId = current?.id;
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);

  // Keep a stable ref to onDismiss so re-renders of parent don't re-trigger the timer effect
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  // Handle dismissal with smooth exit animation
  const handleDismiss = useRef((id: string) => {
    setIsExiting(true);
    setTimeout(() => {
      onDismissRef.current(id);
      setIsExiting(false);
    }, 200);
  });

  useEffect(() => {
    if (!currentId) {
      setIsExiting(false);
      return;
    }

    // Reset progress and exit state for new achievement
    setProgress(100);
    setIsExiting(false);

    const DURATION = durationMs; // Default 2.8s (disappears within 2-3 seconds)
    const startTime = Date.now();

    // Smooth depletion of progress bar based on real wall-clock elapsed time
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remainingPct);
    }, 35);

    // Guaranteed auto-dismissal
    const timer = setTimeout(() => {
      clearInterval(interval);
      setProgress(0);
      handleDismiss.current(currentId);
    }, DURATION);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [currentId, durationMs]);

  if (!current) return null;

  // Tier coloring
  const tierColor =
    current.tier === 'platinum'
      ? 'border-[#5DADE2] shadow-[0_0_20px_rgba(93,173,226,0.35)]'
      : current.tier === 'gold'
      ? 'border-[#F5BA42] shadow-[0_0_20px_rgba(245,186,66,0.35)]'
      : current.tier === 'silver'
      ? 'border-[#D1D5DB] shadow-[0_0_15px_rgba(209,213,219,0.25)]'
      : 'border-[#CD7F32] shadow-[0_0_15px_rgba(205,127,50,0.25)]';

  const tierBadge =
    current.tier === 'platinum'
      ? 'bg-[#EBF5FB] text-[#2980B9]'
      : current.tier === 'gold'
      ? 'bg-[#FEF9E7] text-[#B7950B]'
      : current.tier === 'silver'
      ? 'bg-[#F2F4F4] text-[#7F8C8D]'
      : 'bg-[#FDF2E9] text-[#B9770E]';

  return (
    <div 
      className={`fixed bottom-6 right-4 sm:right-6 z-50 max-w-sm w-full select-none pointer-events-auto transition-all duration-200 ease-out ${
        isExiting 
          ? 'opacity-0 translate-y-4 scale-95 pointer-events-none' 
          : 'opacity-100 translate-y-0 scale-100 animate-in slide-in-from-bottom-5 duration-300'
      }`}
    >
      <div className={`relative overflow-hidden rounded-2xl bg-[#181512]/95 backdrop-blur-xl border-2 ${tierColor} text-white p-3.5 sm:p-4 shadow-2xl`}>
        
        {/* Glow Shimmer Background */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#F5BA42]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3">
          {/* Big Glowing Achievement Icon Frame */}
          <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#2D241C] to-[#161310] border border-[#E3B873]/50 flex items-center justify-center shadow-inner">
            <span className="text-2xl sm:text-3xl filter drop-shadow-md">{current.icon}</span>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#F5BA42] flex items-center justify-center text-[9px] text-[#161310] font-black">
              ★
            </div>
          </div>

          {/* Content Details */}
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Trophy className="w-3 h-3 text-[#F5BA42]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#F5BA42]">
                Achievement Unlocked
              </span>
              <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${tierBadge}`}>
                {current.tier}
              </span>
            </div>

            <h4 className="text-sm sm:text-base font-black text-white leading-tight truncate">
              {current.title}
            </h4>

            <p className="text-[11px] text-[#D5CEC5] leading-snug mt-1">
              {current.description}
            </p>

            {/* Food equivalency extra badge */}
            {current.foodBadge && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2A231C] border border-[#E3B873]/30 text-[10px] text-[#FBE3B5] font-semibold">
                <Sparkles className="w-2.5 h-2.5 text-[#F5BA42]" />
                <span>{current.foodBadge.emoji} เบิร์นลบ {current.foodBadge.calories} kcal!</span>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => handleDismiss.current(current.id)}
            className="shrink-0 text-[#8C827A] hover:text-white transition-colors cursor-pointer p-1"
            title="ปิดการแจ้งเตือน"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Depleting progress timer bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2C241E]">
          <div
            className="h-full bg-gradient-to-r from-[#F5BA42] to-[#E59866] transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
