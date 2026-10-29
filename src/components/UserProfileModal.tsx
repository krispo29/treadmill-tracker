import React, { useState } from 'react';
import { X, User, Scale, Ruler, Calendar, Heart, Zap, Check, Sparkles } from 'lucide-react';
import type { UserProfile } from '../types/treadmill';
import { calculatePhysiology } from '../services/calculations';

interface UserProfileModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  profile,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<UserProfile>(profile);

  if (!isOpen) return null;

  const physiology = calculatePhysiology(formData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>โปรไฟล์ร่างกาย & สรีรวิทยา</span>
            </h2>
            <p className="text-xs text-slate-400">
              นำน้ำหนัก ส่วนสูง และอายุไปคำนวณ BMI, Max HR, BMR และแคลอรี่แม่นยำ
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Inputs Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Weight */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-cyan-400" />
                <span>น้ำหนัก (กก.)</span>
              </label>
              <input
                type="number"
                min="30"
                max="250"
                step="0.5"
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-lg font-bold digital-number text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            {/* Height */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                <span>ส่วนสูง (ซม.)</span>
              </label>
              <input
                type="number"
                min="100"
                max="230"
                step="1"
                value={formData.heightCm}
                onChange={(e) => setFormData({ ...formData, heightCm: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-lg font-bold digital-number text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            {/* Age */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>อายุ (ปี)</span>
              </label>
              <input
                type="number"
                min="10"
                max="100"
                step="1"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-lg font-bold digital-number text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                <span>เพศ</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="male">ชาย (Male)</option>
                <option value="female">หญิง (Female)</option>
                <option value="other">อื่นๆ (Other)</option>
              </select>
            </div>
          </div>

          {/* Live Physiological Diagnostic Preview */}
          <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>ผลการวิเคราะห์สรีรวิทยาอัตโนมัติ (Live Diagnostics)</span>
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* BMI Card */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-semibold block">ดัชนีมวลกาย (BMI)</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black digital-number text-cyan-400">{physiology.bmi}</span>
                  <span className="text-[10px] text-slate-400">kg/m²</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium block truncate mt-0.5">
                  {physiology.bmiCategory}
                </span>
              </div>

              {/* Max Heart Rate Card */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-semibold block flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-400" />
                  <span>Max Heart Rate</span>
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black digital-number text-rose-400">{physiology.maxHeartRateBpm}</span>
                  <span className="text-[10px] text-slate-400">BPM</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  (Tanaka Formula)
                </span>
              </div>

              {/* Zone 2 Fat Burn Range */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-semibold block flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Zone 2 Target HR</span>
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-black digital-number text-amber-400">
                    {physiology.zone2MinBpm}-{physiology.zone2MaxBpm}
                  </span>
                  <span className="text-[10px] text-slate-400">BPM</span>
                </div>
                <span className="text-[10px] text-amber-400/80 block mt-0.5">
                  โซนเผาผลาญไขมันสูงสุด
                </span>
              </div>

              {/* BMR */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-semibold block">อัตราเผาผลาญพื้นฐาน (BMR)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-black digital-number text-purple-400">{physiology.bmrKcal}</span>
                  <span className="text-[10px] text-slate-400">kcal/day</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  (Mifflin-St Jeor)
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 hover:opacity-90 flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/10 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกโปรไฟล์</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
