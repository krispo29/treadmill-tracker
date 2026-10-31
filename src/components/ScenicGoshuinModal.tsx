import React, { useState } from 'react';
import { X, Trophy, Lock, CheckCircle2 } from 'lucide-react';
import {
  ACHIEVEMENT_CATALOG,
  getUnlockedAchievementIds,
} from '../services/scenicAchievements';

interface ScenicGoshuinModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionUnlockedIds: Set<string>;
}

export const ScenicGoshuinModal: React.FC<ScenicGoshuinModalProps> = ({
  isOpen,
  onClose,
  sessionUnlockedIds,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  if (!isOpen) return null;

  const persistentUnlockedIds = new Set(getUnlockedAchievementIds());
  // An achievement is unlocked if it's saved in localStorage OR unlocked in the current session
  const isUnlocked = (id: string) => persistentUnlockedIds.has(id) || sessionUnlockedIds.has(id);

  const totalCount = ACHIEVEMENT_CATALOG.length;
  const unlockedCount = ACHIEVEMENT_CATALOG.filter((a) => isUnlocked(a.id)).length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  // Filter items
  const filteredAchievements = ACHIEVEMENT_CATALOG.filter((item) => {
    // Status filter
    const unlocked = isUnlocked(item.id);
    if (statusFilter === 'unlocked' && !unlocked) return false;
    if (statusFilter === 'locked' && unlocked) return false;

    // Category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'food' && item.category !== 'food') return false;
      if (selectedCategory === 'distance' && item.category !== 'distance' && item.category !== 'steps') return false;
      if (selectedCategory === 'challenge' && item.category !== 'challenge') return false;
      if (selectedCategory === 'secret' && item.category !== 'secret') return false;
    }
    return true;
  });

  const categories = [
    { id: 'all', label: 'ทั้งหมด', icon: '📜' },
    { id: 'food', label: 'เผาผลาญอาหาร', icon: '🍡' },
    { id: 'distance', label: 'ระยะทาง & ก้าว', icon: '🚩' },
    { id: 'challenge', label: 'ความท้าทาย & สปีด', icon: '⚡' },
    { id: 'secret', label: 'สหาย & อีเวนต์ริมทาง', icon: '🦌' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#FAF7F2] border-2 border-[#E7DFD5] shadow-2xl text-[#2C2621] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Japanese Accordion Book Header Texture */}
        <div className="relative px-5 py-4 sm:px-8 sm:py-5 bg-gradient-to-r from-[#2C2621] via-[#38312B] to-[#2C2621] text-white flex items-center justify-between border-b-2 border-[#D4AF37]/50 shadow-md">
          {/* Subtle gold accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E3B873] via-[#F5BA42] to-[#E3B873]" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/60 flex items-center justify-center text-xl sm:text-2xl shadow-inner">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-black tracking-wide text-white flex items-center gap-1.5 font-serif">
                  <span>御朱印帳</span>
                  <span className="text-[#D4AF37] text-xs sm:text-sm font-sans font-bold">• GOSHUINCHO</span>
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-[#D5CEC5]">
                สมุดสะสมตราประทับแห่งความเพียร (Treadmill Journey Achievements)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-[#D5CEC5] hover:text-white transition-all cursor-pointer shadow-cozy-sm"
            title="ปิดสมุดตราประทับ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress & Stats Bar */}
        <div className="px-5 py-3 sm:px-8 sm:py-4 bg-[#F4EEE4] border-b border-[#EAE3D7] flex flex-wrap items-center justify-between gap-3">
          {/* Unlocked Counter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#2C2621]">
              <Trophy className="w-4 h-4 text-[#D4AF37]" />
              <span>ความสำเร็จ:</span>
              <span className="font-mono text-base font-black text-[#B7950B]">{unlockedCount}</span>
              <span className="text-[#8C827A]">/ {totalCount} ตราประทับ</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#E8E1D3] text-[#7D6608] text-[10px] font-black font-mono">
              {progressPercent}%
            </span>
          </div>

          {/* Linear Progress Bar */}
          <div className="flex-1 min-w-[140px] max-w-xs h-2.5 bg-[#E2D9CC] rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#C44536] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Status Filter (All / Unlocked / Locked) */}
          <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-2xl border border-[#E0D8CB] text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#2C2621] text-white shadow-cozy-sm'
                  : 'text-[#8C827A] hover:text-[#2C2621]'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setStatusFilter('unlocked')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'unlocked'
                  ? 'bg-[#3B664E] text-white shadow-cozy-sm'
                  : 'text-[#8C827A] hover:text-[#2C2621]'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>ได้แล้ว ({unlockedCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('locked')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'locked'
                  ? 'bg-[#C46849] text-white shadow-cozy-sm'
                  : 'text-[#8C827A] hover:text-[#2C2621]'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>ยังไม่ได้ ({totalCount - unlockedCount})</span>
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-5 py-2.5 sm:px-8 bg-[#FAF7F2] border-b border-[#EAE3D7] flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-[#C44536] text-white shadow-cozy-sm'
                  : 'bg-white/80 hover:bg-white text-[#7A6E65] border border-[#EDE6DC]'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Stamp Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5 bg-[#FAF7F2]">
          {filteredAchievements.map((item) => {
            const unlocked = isUnlocked(item.id);

            // Tier styling
            const tierBadge =
              item.tier === 'platinum'
                ? 'bg-[#EBF5FB] text-[#2980B9] border-[#A9CCE3]'
                : item.tier === 'gold'
                ? 'bg-[#FEF9E7] text-[#B7950B] border-[#F9E79F]'
                : item.tier === 'silver'
                ? 'bg-[#F2F4F4] text-[#7F8C8D] border-[#D5D8DC]'
                : 'bg-[#FDF2E9] text-[#B9770E] border-[#FAD7A0]';

            return (
              <div
                key={item.id}
                className={`relative rounded-3xl p-4 transition-all duration-200 border flex flex-col justify-between ${
                  unlocked
                    ? 'bg-white border-[#E5DDD0] shadow-cozy hover:shadow-cozy-md hover:-translate-y-0.5'
                    : 'bg-[#F5EFE6]/60 border-dashed border-[#DDD5C7] opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    {/* The Hanko Stamp / Lock Icon */}
                    <div className="relative">
                      {unlocked ? (
                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl border-2 border-[#C44536] bg-[#FDF4F2] flex items-center justify-center relative shadow-sm rotate-[-2deg]">
                          {/* Inner double border for authentic Japanese Inkan stamp look */}
                          <div className="absolute inset-1 border border-[#C44536]/40 rounded-xl pointer-events-none" />
                          {item.customStampImg ? (
                            <img src={item.customStampImg} alt={item.title} className="w-10 h-10 object-contain filter drop-shadow-sm" />
                          ) : (
                            <span className="text-2xl sm:text-3xl filter drop-shadow-sm">{item.icon}</span>
                          )}
                          <span className="absolute -bottom-1 -right-1 text-[8px] font-black px-1 rounded bg-[#C44536] text-white">
                            済
                          </span>
                        </div>
                      ) : (
                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl border border-dashed border-[#C0B7A8] bg-[#EBE4D8] flex items-center justify-center text-lg text-[#8C827A]">
                          <Lock className="w-5 h-5 text-[#A0958B]" />
                        </div>
                      )}
                    </div>

                    {/* Tier Pill */}
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${tierBadge}`}>
                      {item.tier}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h4 className={`text-xs sm:text-sm font-black mb-1 ${unlocked ? 'text-[#2C2621]' : 'text-[#7A6E65]'}`}>
                    {item.title}
                  </h4>

                  <p className="text-[11px] text-[#7A6E65] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Status / Food Pill */}
                <div className="mt-3 pt-2 border-t border-[#F0EAE1] flex items-center justify-between text-[10px]">
                  {item.foodBadge ? (
                    <span className="inline-flex items-center gap-1 font-bold text-[#B7950B]">
                      <span>{item.foodBadge.emoji}</span>
                      <span>-{item.foodBadge.calories} kcal</span>
                    </span>
                  ) : (
                    <span className="text-[#8C827A] capitalize">
                      {item.category}
                    </span>
                  )}

                  {unlocked ? (
                    <span className="inline-flex items-center gap-1 text-[#3B664E] font-black">
                      <CheckCircle2 className="w-3 h-3 text-[#3B664E]" />
                      <span>ปลดล็อกแล้ว</span>
                    </span>
                  ) : (
                    <span className="text-[#A0958B] italic">
                      ยังไม่สำเร็จ
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 sm:px-8 bg-[#F4EEE4] border-t border-[#EAE3D7] flex items-center justify-between text-xs text-[#8C827A]">
          <span className="text-[11px]">
            💡 ทริป: ตราประทับที่คุณสะสมได้จะปรากฏบน <span className="text-[#C44536] font-bold">โปสการ์ด (Scenic Postcard)</span> ตอนกดบันทึกภาพด้วย!
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-2xl bg-[#2C2621] text-white hover:bg-[#3D352E] font-bold text-xs transition-all cursor-pointer shadow-cozy-sm"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
