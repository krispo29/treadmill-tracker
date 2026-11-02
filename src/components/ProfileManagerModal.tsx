import React, { useState } from 'react';
import { 
  X, 
  User, 
  UserPlus, 
  Check, 
  Trash2, 
  Edit3, 
  Scale, 
  Ruler, 
  Calendar, 
  Sparkles,
  Heart,
  Zap
} from 'lucide-react';
import type { UserProfile } from '../types/treadmill';
import { calculatePhysiology } from '../services/calculations';

interface ProfileManagerModalProps {
  isOpen: boolean;
  profiles: UserProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onSaveProfile: (profile: UserProfile) => void;
  onDeleteProfile: (id: string) => void;
  onClose: () => void;
}

const AVATAR_OPTIONS = ['🏃‍♂️', '🏃‍♀️', '⚡', '🔥', '🦁', '🐯', '🚴‍♂️', '🧘‍♀️', '🏆', '⭐'];

export const ProfileManagerModal: React.FC<ProfileManagerModalProps> = ({
  isOpen,
  profiles,
  activeProfileId,
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
  onClose
}) => {
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  if (!isOpen) return null;

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];
  const activePhysiology = activeProfile ? calculatePhysiology(activeProfile) : null;

  const handleStartAdd = () => {
    setEditingProfile({
      id: `prof_${Date.now()}`,
      name: '',
      avatar: '🏃‍♂️',
      weightKg: 65,
      heightCm: 170,
      age: 25,
      gender: 'male',
      defaultStartSpeed: 3.0,
      favoriteSpeeds: [3.0, 5.0, 7.0, 9.0],
      favoriteInclines: [0, 2, 4, 6]
    });
    setIsAddingNew(true);
  };

  const handleStartEdit = (p: UserProfile) => {
    setEditingProfile({ ...p });
    setIsAddingNew(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editingProfile.name.trim()) return;
    onSaveProfile(editingProfile);
    if (isAddingNew) {
      onSelectProfile(editingProfile.id);
    }
    setEditingProfile(null);
    setIsAddingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
      <div className="w-full max-w-xl bg-[#FFFDFB] border border-[#EDE6DC] rounded-3xl p-6 sm:p-7 shadow-cozy-lg relative max-h-[92vh] flex flex-col text-[#2C2621]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8C827A] hover:text-[#2C2621] rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-[#EDE6DC] shrink-0">
          <div className="p-3 rounded-2xl bg-[#EAF2EC] text-[#52796F]">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2C2621] flex items-center gap-2">
              <span>จัดการโปรไฟล์ผู้ใช้งาน (Profiles)</span>
            </h2>
            <p className="text-xs text-[#8C827A]">
              สลับผู้ใช้งานได้ใน 1 แตะ ไม่ต้องจำรหัสผ่าน สถิติและแคลอรี่จะบันทึกแยกตามคนวิ่งโดยอัตโนมัติ
            </p>
          </div>
        </div>

        {/* Profile List / Switcher View */}
        {!editingProfile ? (
          <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C827A]">
                เลือกคนที่กำลังวิ่งอยู่ ({profiles.length} คน)
              </span>
              <button
                onClick={handleStartAdd}
                className="px-3.5 py-1.5 rounded-2xl bg-[#52796F] hover:bg-[#43675E] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-cozy-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ เพิ่มคนวิ่งใหม่</span>
              </button>
            </div>

            {/* Profiles Cards */}
            <div className="grid grid-cols-1 gap-3">
              {profiles.map((p) => {
                const isActive = p.id === activeProfileId;
                const physio = calculatePhysiology(p);

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProfile(p.id)}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-cozy-sm ${
                      isActive
                        ? 'bg-[#FAF7F2] border-[#52796F] ring-1 ring-[#52796F]'
                        : 'bg-white border-[#EDE6DC] hover:border-[#D8CFBF]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-13 h-13 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC] flex items-center justify-center text-2xl">
                        {p.avatar || '🏃‍♀️'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-[#2C2621]">
                            {p.name}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EAF2EC] text-[#3B664E] border border-[#CDE0D3]">
                              กำลังวิ่ง (Active)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#8C827A] mt-0.5 font-medium">
                          <span>{p.weightKg} kg</span>
                          <span>•</span>
                          <span>{p.heightCm} cm</span>
                          <span>•</span>
                          <span>อายุ {p.age} ปี</span>
                          <span>•</span>
                          <span className="text-[#52796F] font-mono font-bold">BMI {physio.bmi}</span>
                        </div>
                        {p.favoriteSpeeds && p.favoriteSpeeds.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[10px] text-[#A66E22] font-bold flex items-center gap-1">
                              ⭐ สปีดโปรด:
                            </span>
                            {p.favoriteSpeeds.map((s) => (
                              <span key={s} className="px-2 py-0.5 rounded-lg bg-[#FDF6EA] border border-[#F0DFBE] text-[#9A641F] font-mono text-xs font-bold digital-number">
                                {s.toFixed(1)}
                              </span>
                            ))}
                            {p.defaultStartSpeed && (
                              <span className="text-[10px] text-[#8C827A] font-mono">
                                (เริ่มเดิน: {p.defaultStartSpeed.toFixed(1)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleStartEdit(p)}
                        className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3EFE6] text-[#5A5047] border border-[#EDE6DC] transition-colors cursor-pointer"
                        title="แก้ไขข้อมูลส่วนตัว"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {profiles.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`คุณต้องการลบโปรไฟล์ของ ${p.name} ใช่หรือไม่?`)) {
                              onDeleteProfile(p.id);
                            }
                          }}
                          className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#FDF0F0] text-[#8C827A] hover:text-[#B94A4A] border border-[#EDE6DC] transition-colors cursor-pointer"
                          title="ลบโปรไฟล์นี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active User's Physiology Preview */}
            {activeProfile && activePhysiology && (
              <div className="rounded-2xl bg-[#FAF7F2] p-4 border border-[#EDE6DC] space-y-2 mt-4">
                <span className="text-xs font-bold text-[#2C2621] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#DDA15E]" />
                  <span>สถิติสรีรวิทยาของ {activeProfile.name}:</span>
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-2xl bg-white border border-[#EDE6DC]">
                    <span className="text-[10px] text-[#8C827A] block font-medium">BMI & รูปร่าง</span>
                    <span className="font-bold text-[#52796F] font-mono text-sm">{activePhysiology.bmi}</span>
                    <span className="text-[10px] text-[#8C827A] block truncate">{activePhysiology.bmiCategory}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white border border-[#EDE6DC]">
                    <span className="text-[10px] text-[#8C827A] block flex items-center gap-1 font-medium">
                      <Heart className="w-3 h-3 text-[#C46849]" />
                      <span>Max HR</span>
                    </span>
                    <span className="font-bold text-[#C46849] font-mono text-sm">{activePhysiology.maxHeartRateBpm} BPM</span>
                    <span className="text-[10px] text-[#8C827A] block">(Tanaka)</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white border border-[#EDE6DC]">
                    <span className="text-[10px] text-[#8C827A] block flex items-center gap-1 font-medium">
                      <Zap className="w-3 h-3 text-[#A66E22]" />
                      <span>Zone 2 HR</span>
                    </span>
                    <span className="font-bold text-[#A66E22] font-mono text-sm">{activePhysiology.zone2MinBpm}-{activePhysiology.zone2MaxBpm}</span>
                    <span className="text-[10px] text-[#8C827A] block">BPM</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Edit / Add Profile Form */
          <form onSubmit={handleFormSubmit} className="space-y-4 my-4 flex-1 overflow-y-auto pr-1">
            <div className="flex items-center justify-between pb-2 border-b border-[#EDE6DC]">
              <h3 className="text-sm font-bold text-[#2C2621]">
                {isAddingNew ? 'เพิ่มโปรไฟล์ใหม่' : `แก้ไขโปรไฟล์: ${editingProfile.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="text-xs text-[#8C827A] hover:text-[#2C2621] cursor-pointer"
              >
                ย้อนกลับ
              </button>
            </div>

            {/* Name Input */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#8C827A] block mb-1.5">
                ชื่อคนวิ่ง (Name)
              </label>
              <input
                type="text"
                placeholder="เช่น Mike, จอย, คุณแม่, ฟ้า"
                value={editingProfile.name}
                onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-2xl px-4 py-2.5 text-sm font-bold text-[#2C2621] focus:outline-none focus:border-[#52796F]"
                required
              />
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#8C827A] block mb-1.5">
                เลือกไอคอนประจำตัว (Avatar)
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setEditingProfile({ ...editingProfile, avatar: av })}
                    className={`w-10 h-10 rounded-2xl text-xl flex items-center justify-center border transition-all cursor-pointer ${
                      editingProfile.avatar === av
                        ? 'bg-[#EAF2EC] border-[#52796F] scale-110 shadow-cozy-sm'
                        : 'bg-white border-[#EDE6DC] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight, Height, Age, Gender */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#8C827A] block mb-1 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-[#52796F]" />
                  <span>น้ำหนัก (กก.)</span>
                </label>
                <input
                  type="number"
                  min="30"
                  max="250"
                  step="0.5"
                  value={editingProfile.weightKg}
                  onChange={(e) => setEditingProfile({ ...editingProfile, weightKg: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-2xl px-3 py-2 text-base font-bold digital-number text-[#2C2621] focus:outline-none focus:border-[#52796F]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#8C827A] block mb-1 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-[#52796F]" />
                  <span>ส่วนสูง (ซม.)</span>
                </label>
                <input
                  type="number"
                  min="100"
                  max="230"
                  step="1"
                  value={editingProfile.heightCm}
                  onChange={(e) => setEditingProfile({ ...editingProfile, heightCm: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-2xl px-3 py-2 text-base font-bold digital-number text-[#2C2621] focus:outline-none focus:border-[#52796F]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#8C827A] block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#A66E22]" />
                  <span>อายุ (ปี)</span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  step="1"
                  value={editingProfile.age}
                  onChange={(e) => setEditingProfile({ ...editingProfile, age: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-2xl px-3 py-2 text-base font-bold digital-number text-[#2C2621] focus:outline-none focus:border-[#52796F]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#8C827A] block mb-1">
                  <span>เพศ</span>
                </label>
                <select
                  value={editingProfile.gender}
                  onChange={(e) => setEditingProfile({ ...editingProfile, gender: e.target.value as any })}
                  className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-2xl px-3 py-2 text-xs font-semibold text-[#2C2621] focus:outline-none focus:border-[#52796F]"
                >
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>
            </div>

            {/* Personal Favorite Speeds (Phase 2) */}
            <div className="pt-3 border-t border-[#EDE6DC] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#A66E22] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#DDA15E]" />
                  <span>ตั้งค่าสปีดโปรดประจำตัว (Favorite Speeds)</span>
                </label>
                <span className="text-[10px] text-[#8C827A]">ปุ่มลัดสปีด 4 ระดับ</span>
              </div>

              <div>
                <label className="text-[11px] text-[#8C827A] block mb-1">
                  ความเร็วเริ่มต้นเมื่อกด Start (km/h)
                </label>
                <input
                  type="number"
                  min="1.0"
                  max="12.0"
                  step="0.1"
                  value={editingProfile.defaultStartSpeed ?? 3.0}
                  onChange={(e) => setEditingProfile({ ...editingProfile, defaultStartSpeed: parseFloat(e.target.value) || 3.0 })}
                  className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-2xl px-3 py-2 text-sm font-bold digital-number text-[#52796F] focus:outline-none focus:border-[#52796F]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8C827A] block mb-1.5">
                  ปุ่มลัดความเร็ว 4 ระดับ (เช่น เดิน, จ็อกกิ้ง, วิ่งสบาย, สปรินต์)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const currentVal = (editingProfile.favoriteSpeeds && editingProfile.favoriteSpeeds[idx]) ?? (3.0 + idx * 2.0);
                    return (
                      <div key={idx}>
                        <span className="text-[10px] text-[#8C827A] block mb-1 text-center font-bold">
                          ระดับ {idx + 1}
                        </span>
                        <input
                          type="number"
                          min="1.0"
                          max="16.0"
                          step="0.1"
                          value={currentVal}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 3.0;
                            const prev = editingProfile.favoriteSpeeds ? [...editingProfile.favoriteSpeeds] : [3.0, 5.0, 7.0, 9.0];
                            prev[idx] = val;
                            setEditingProfile({ ...editingProfile, favoriteSpeeds: prev });
                          }}
                          className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-2xl px-2 py-2 text-center text-sm font-bold digital-number text-[#A66E22] focus:outline-none focus:border-[#DDA15E]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#EDE6DC]">
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="px-4 py-2.5 rounded-2xl text-xs font-medium text-[#5A5047] hover:bg-[#FAF7F2] border border-[#EDE6DC] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#52796F] hover:bg-[#43675E] text-white flex items-center gap-1.5 shadow-cozy-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกโปรไฟล์</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
