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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800 shrink-0">
          <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>จัดการโปรไฟล์ผู้ใช้งาน (Profiles)</span>
            </h2>
            <p className="text-xs text-slate-400">
              สลับผู้ใช้งานได้ใน 1 แตะ ไม่ต้องสมัครสมาชิก ข้อมูลแคลอรี่และสถิติจะแยกตามรายบุคคล
            </p>
          </div>
        </div>

        {/* Profile List / Switcher View */}
        {!editingProfile ? (
          <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                เลือกคนที่กำลังวิ่งอยู่ ({profiles.length} คน)
              </span>
              <button
                onClick={handleStartAdd}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>เพิ่มโปรไฟล์ใหม่ (Add Profile)</span>
              </button>
            </div>

            {/* Profiles Cards */}
            <div className="grid grid-cols-1 gap-2.5">
              {profiles.map((p) => {
                const isActive = p.id === activeProfileId;
                const physio = calculatePhysiology(p);

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProfile(p.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                        {p.avatar || '🏃‍♂️'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">
                            {p.name}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950">
                              กำลังใช้งาน (Active)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{p.weightKg} kg</span>
                          <span>•</span>
                          <span>{p.heightCm} cm</span>
                          <span>•</span>
                          <span>อายุ {p.age} ปี</span>
                          <span>•</span>
                          <span className="text-cyan-400 font-mono">BMI {physio.bmi}</span>
                        </div>
                        {p.favoriteSpeeds && p.favoriteSpeeds.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                              ⭐ สปีดโปรด:
                            </span>
                            {p.favoriteSpeeds.map((s) => (
                              <span key={s} className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold digital-number">
                                {s.toFixed(1)}
                              </span>
                            ))}
                            {p.defaultStartSpeed && (
                              <span className="text-[10px] text-slate-400 font-mono">
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
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
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
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
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
              <div className="rounded-2xl bg-slate-950/90 p-4 border border-slate-800 space-y-2 mt-4">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>สถิติสรีรวิทยาของ {activeProfile.name}:</span>
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">BMI & รูปร่าง</span>
                    <span className="font-bold text-cyan-400 font-mono text-sm">{activePhysiology.bmi}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{activePhysiology.bmiCategory}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-400" />
                      <span>Max HR</span>
                    </span>
                    <span className="font-bold text-rose-400 font-mono text-sm">{activePhysiology.maxHeartRateBpm} BPM</span>
                    <span className="text-[10px] text-slate-400 block">(Tanaka)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Zone 2 HR</span>
                    </span>
                    <span className="font-bold text-amber-400 font-mono text-sm">{activePhysiology.zone2MinBpm}-{activePhysiology.zone2MaxBpm}</span>
                    <span className="text-[10px] text-slate-400 block">BPM</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Edit / Add Profile Form */
          <form onSubmit={handleFormSubmit} className="space-y-4 my-4 flex-1 overflow-y-auto pr-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                {isAddingNew ? 'เพิ่มโปรไฟล์ใหม่' : `แก้ไขโปรไฟล์: ${editingProfile.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ย้อนกลับ
              </button>
            </div>

            {/* Name Input */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                ชื่อคนวิ่ง (Name)
              </label>
              <input
                type="text"
                placeholder="เช่น Mike, แม่, ฟ้า, บอม"
                value={editingProfile.name}
                onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                เลือกไอคอนประจำตัว (Avatar)
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setEditingProfile({ ...editingProfile, avatar: av })}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all cursor-pointer ${
                      editingProfile.avatar === av
                        ? 'bg-cyan-500/20 border-cyan-400 scale-110 shadow-sm shadow-cyan-500/30'
                        : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
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
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-cyan-400" />
                  <span>น้ำหนัก (กก.)</span>
                </label>
                <input
                  type="number"
                  min="30"
                  max="250"
                  step="0.5"
                  value={editingProfile.weightKg}
                  onChange={(e) => setEditingProfile({ ...editingProfile, weightKg: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold digital-number text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ส่วนสูง (ซม.)</span>
                </label>
                <input
                  type="number"
                  min="100"
                  max="230"
                  step="1"
                  value={editingProfile.heightCm}
                  onChange={(e) => setEditingProfile({ ...editingProfile, heightCm: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold digital-number text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>อายุ (ปี)</span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  step="1"
                  value={editingProfile.age}
                  onChange={(e) => setEditingProfile({ ...editingProfile, age: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold digital-number text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  <span>เพศ</span>
                </label>
                <select
                  value={editingProfile.gender}
                  onChange={(e) => setEditingProfile({ ...editingProfile, gender: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>
            </div>

            {/* Personal Favorite Speeds (Phase 2) */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>ตั้งค่าสปีดโปรดประจำตัว (Favorite Speeds)</span>
                </label>
                <span className="text-[10px] text-slate-400">ปุ่มลัดสปีด 4 ระดับ</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  ความเร็วเริ่มต้นเมื่อกด Start (km/h)
                </label>
                <input
                  type="number"
                  min="1.0"
                  max="12.0"
                  step="0.1"
                  value={editingProfile.defaultStartSpeed ?? 3.0}
                  onChange={(e) => setEditingProfile({ ...editingProfile, defaultStartSpeed: parseFloat(e.target.value) || 3.0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold digital-number text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">
                  ปุ่มลัดความเร็ว 4 ระดับ (เช่น เดิน, จ็อกกิ้ง, วิ่งสบาย, สปรินต์)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const currentVal = (editingProfile.favoriteSpeeds && editingProfile.favoriteSpeeds[idx]) ?? (3.0 + idx * 2.0);
                    return (
                      <div key={idx}>
                        <span className="text-[10px] text-slate-500 block mb-1 text-center font-semibold">
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
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-center text-sm font-bold digital-number text-amber-300 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-cyan-500/10 cursor-pointer"
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
