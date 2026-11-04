import React, { useState } from 'react';
import { X, Trophy, Lock, CheckCircle2, Gift, Sparkles } from 'lucide-react';
import type { UserProfile } from '../types/treadmill';
import {
  ACHIEVEMENT_CATALOG,
  getUnlockedAchievementIds,
  OMIYAGE_CATALOG,
  getUnlockedOmiyageIds,
} from '../services/scenicAchievements';

interface ScenicGoshuinModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionUnlockedIds: Set<string>;
  activeProfile?: UserProfile;
}

export const ScenicGoshuinModal: React.FC<ScenicGoshuinModalProps> = ({
  isOpen,
  onClose,
  sessionUnlockedIds,
  activeProfile,
}) => {
  const [mainTab, setMainTab] = useState<'goshuin' | 'omiyage'>('goshuin');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [omiyageRegion, setOmiyageRegion] = useState<string>('all');

  if (!isOpen) return null;

  const persistentUnlockedIds = new Set(getUnlockedAchievementIds(activeProfile?.id));
  const isUnlocked = (id: string) => persistentUnlockedIds.has(id) || sessionUnlockedIds.has(id);

  const totalCount = ACHIEVEMENT_CATALOG.length;
  const unlockedCount = ACHIEVEMENT_CATALOG.filter((a) => isUnlocked(a.id)).length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  // Omiyage collections
  const persistentOmiyageIds = new Set(getUnlockedOmiyageIds(activeProfile?.id));
  const isOmiyageUnlocked = (id: string) => persistentOmiyageIds.has(id);
  const unlockedOmiyageCount = OMIYAGE_CATALOG.filter((o) => isOmiyageUnlocked(o.id)).length;
  const omiyageProgressPercent = Math.round((unlockedOmiyageCount / OMIYAGE_CATALOG.length) * 100);

  // Filter achievements
  const filteredAchievements = ACHIEVEMENT_CATALOG.filter((item) => {
    const unlocked = isUnlocked(item.id);
    if (statusFilter === 'unlocked' && !unlocked) return false;
    if (statusFilter === 'locked' && unlocked) return false;

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

  const omiyageRegions = [
    { id: 'all', label: 'ทุกจังหวัด', icon: '🗾' },
    { id: 'kamakura', label: 'คามาคุระ', icon: '🌊' },
    { id: 'kyoto', label: 'เกียวโต', icon: '⛩️' },
    { id: 'hokkaido', label: 'ฮอกไกโด', icon: '🌸' },
    { id: 'tokyo', label: 'โตเกียว', icon: '🏙️' },
  ];

  const filteredOmiyage = OMIYAGE_CATALOG.filter((item) => {
    if (omiyageRegion !== 'all' && item.region !== omiyageRegion) return false;
    return true;
  });

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
              {mainTab === 'goshuin' ? '📜' : '🎁'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-black tracking-wide text-white flex items-center gap-1.5 font-serif">
                  <span>{mainTab === 'goshuin' ? '御朱印帳' : 'お土産コレクション'}</span>
                  <span className="text-[#D4AF37] text-xs sm:text-sm font-sans font-bold">
                    • {mainTab === 'goshuin' ? 'GOSHUINCHO' : 'OMIYAGE CABINET'} {activeProfile ? `(${activeProfile.name})` : ''}
                  </span>
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-[#D5CEC5]">
                {mainTab === 'goshuin'
                  ? `สมุดสะสมตราประทับแห่งความเพียรของ ${activeProfile?.name || 'นักวิ่ง'} ${activeProfile?.avatar || '🏃‍♂️'}`
                  : `ตู้ของที่ระลึกประจำถิ่น 4 ภูมิภาคญี่ปุ่น สุ่มรับเมื่อวิ่งผ่านจุดอีเวนต์ริมทาง`}
              </p>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setMainTab('goshuin')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mainTab === 'goshuin'
                    ? 'bg-[#D4AF37] text-[#2C2621] shadow-md'
                    : 'text-[#D5CEC5] hover:text-white'
                }`}
              >
                <span>📜</span>
                <span>ตราประทับ ({unlockedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setMainTab('omiyage')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mainTab === 'omiyage'
                    ? 'bg-[#C44536] text-white shadow-md'
                    : 'text-[#D5CEC5] hover:text-white'
                }`}
              >
                <span>🎁</span>
                <span>ของที่ระลึก ({unlockedOmiyageCount}/{OMIYAGE_CATALOG.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-[#D5CEC5] hover:text-white transition-all cursor-pointer shadow-cozy-sm"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress & Stats Bar */}
        <div className="px-5 py-3 sm:px-8 sm:py-4 bg-[#F4EEE4] border-b border-[#EAE3D7] flex flex-wrap items-center justify-between gap-3">
          {mainTab === 'goshuin' ? (
            <>
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
            </>
          ) : (
            <>
              {/* Omiyage Stats */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#2C2621]">
                  <Gift className="w-4 h-4 text-[#C44536]" />
                  <span>ของที่ระลึกที่สะสมได้:</span>
                  <span className="font-mono text-base font-black text-[#C44536]">{unlockedOmiyageCount}</span>
                  <span className="text-[#8C827A]">/ {OMIYAGE_CATALOG.length} ชิ้น</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#FADBD8] text-[#922B21] text-[10px] font-black font-mono">
                  {omiyageProgressPercent}%
                </span>
              </div>

              {/* Linear Progress Bar for Omiyage */}
              <div className="flex-1 min-w-[140px] max-w-xs h-2.5 bg-[#E2D9CC] rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[#C44536] to-[#E67E22] transition-all duration-500 rounded-full"
                  style={{ width: `${omiyageProgressPercent}%` }}
                />
              </div>

              <div className="text-xs text-[#7A6E65] flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>วิ่งผ่านจุดอีเวนต์ริมทางเพื่อสุ่มรับของที่ระลึก</span>
              </div>
            </>
          )}
        </div>

        {/* Sub-Category Tabs (Goshuin Category or Omiyage Region) */}
        <div className="px-5 py-2.5 sm:px-8 bg-[#FAF7F2] border-b border-[#EAE3D7] flex items-center gap-1.5 overflow-x-auto">
          {mainTab === 'goshuin' ? (
            categories.map((cat) => (
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
            ))
          ) : (
            omiyageRegions.map((reg) => (
              <button
                key={reg.id}
                onClick={() => setOmiyageRegion(reg.id)}
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  omiyageRegion === reg.id
                    ? 'bg-[#2C2621] text-[#D4AF37] border border-[#D4AF37] shadow-cozy-sm'
                    : 'bg-white/80 hover:bg-white text-[#7A6E65] border border-[#EDE6DC]'
                }`}
              >
                <span>{reg.icon}</span>
                <span>{reg.label}</span>
              </button>
            ))
          )}
        </div>

        {/* Main Content Area (Goshuin vs Omiyage) */}
        {mainTab === 'goshuin' ? (
          /* Stamp Cards Grid */
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
        ) : (
          /* OMIYAGE CABINET SHOWCASE GRID (Ticket 3.2) */
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 bg-gradient-to-b from-[#F5EFE6] to-[#ECE3D4]">
            {filteredOmiyage.map((item) => {
              const unlocked = isOmiyageUnlocked(item.id);

              const rarityBadge =
                item.rarity === 'legendary'
                  ? 'bg-[#FEF9E7] text-[#B7950B] border-[#F9E79F] ring-1 ring-[#F5BA42]'
                  : item.rarity === 'rare'
                  ? 'bg-[#EBF5FB] text-[#2980B9] border-[#A9CCE3]'
                  : 'bg-[#F2F4F4] text-[#5A5047] border-[#D5D8DC]';

              return (
                <div
                  key={item.id}
                  className={`relative rounded-3xl p-4.5 transition-all duration-300 border flex flex-col justify-between shadow-cozy ${
                    unlocked
                      ? 'bg-gradient-to-b from-white to-[#FDFBF7] border-[#E5DDD0] hover:shadow-cozy-lg hover:-translate-y-1'
                      : 'bg-[#ECE4D6]/70 border-dashed border-[#D2C7B6] opacity-60'
                  }`}
                >
                  <div>
                    {/* Header: Emoji & Region & Rarity */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="relative">
                        {unlocked ? (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFF9F2] to-[#F5ECE1] border-2 border-[#D4AF37]/80 flex items-center justify-center text-3xl shadow-sm rotate-[-2deg]">
                            <span>{item.emoji}</span>
                            <span className="absolute -top-1 -right-1 text-[9px]">✨</span>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-[#DFD6C7] border border-dashed border-[#BEB4A2] flex items-center justify-center text-2xl filter grayscale opacity-40">
                            <span>{item.emoji}</span>
                            <Lock className="w-4 h-4 text-[#7A6E65] absolute" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${rarityBadge}`}>
                          {item.rarity === 'legendary' ? '★ ตำนาน' : item.rarity === 'rare' ? '◆ หายาก' : '● ทั่วไป'}
                        </span>
                        <span className="text-[10px] font-bold text-[#8C827A]">
                          {item.regionName.split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Titles */}
                    <div className="mb-1.5">
                      <div className="text-[10px] font-serif font-bold text-[#C44536] tracking-wider">
                        {item.nameJp}
                      </div>
                      <h4 className={`text-xs sm:text-sm font-black ${unlocked ? 'text-[#2C2621]' : 'text-[#7A6E65]'}`}>
                        {item.name}
                      </h4>
                    </div>

                    <p className="text-[11px] text-[#7A6E65] leading-relaxed">
                      {unlocked ? item.description : 'ออกวิ่งในเส้นทางนี้ และทักทายอีเวนต์ริมทางเพื่อลุ้นรับของที่ระลึกชิ้นนี้'}
                    </p>
                  </div>

                  {/* Status Footer */}
                  <div className="mt-3.5 pt-2.5 border-t border-[#F0EAE1] flex items-center justify-between text-[10px]">
                    <span className="text-[#8C827A] font-medium">
                      {item.regionName}
                    </span>

                    {unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[#C44536] font-black">
                        <span>🎁</span>
                        <span>เก็บเข้าตู้แล้ว</span>
                      </span>
                    ) : (
                      <span className="text-[#A0958B] italic flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>ยังไม่พบ</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
