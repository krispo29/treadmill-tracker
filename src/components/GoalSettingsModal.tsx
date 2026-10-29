import React, { useState } from 'react';
import { X, Target, Flag, Clock, Flame, Mountain, Check } from 'lucide-react';
import type { GoalType, WorkoutGoal } from '../types/treadmill';

interface GoalSettingsModalProps {
  isOpen: boolean;
  currentGoal: WorkoutGoal;
  onSaveGoal: (goal: WorkoutGoal) => void;
  onClose: () => void;
}

export const GoalSettingsModal: React.FC<GoalSettingsModalProps> = ({
  isOpen,
  currentGoal,
  onSaveGoal,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<GoalType>(currentGoal.type === 'none' ? 'distance' : currentGoal.type);
  const [targetValue, setTargetValue] = useState<number>(currentGoal.target > 0 ? currentGoal.target : 5.0);

  if (!isOpen) return null;

  const presets = {
    distance: [
      { label: '3.0 km (วอร์มอัป)', value: 3.0 },
      { label: '5.0 km (ยอดนิยม)', value: 5.0 },
      { label: '10.0 km (มินิมาราธอน)', value: 10.0 },
    ],
    time: [
      { label: '20 นาที (เบิร์นไว)', value: 20 },
      { label: '30 นาที (สูตร 12-3-30)', value: 30 },
      { label: '45 นาที (แอโรบิก)', value: 45 },
      { label: '60 นาที (Endurance)', value: 60 },
    ],
    calories: [
      { label: '150 kcal', value: 150 },
      { label: '300 kcal', value: 300 },
      { label: '500 kcal (เบิร์นหนัก)', value: 500 },
    ],
    elevation: [
      { label: '100m (ตึก 30 ชั้น)', value: 100 },
      { label: '304m (ตึกใบหยก 2)', value: 304 },
      { label: '500m (ครึ่งยอดดอย)', value: 500 },
    ]
  };

  const handleApplyPreset = (type: GoalType, val: number, title: string) => {
    onSaveGoal({
      type,
      target: val,
      title
    });
    onClose();
  };

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    let title = '';
    if (selectedType === 'distance') title = `วิ่งระยะทาง ${targetValue} km`;
    else if (selectedType === 'time') title = `เวลา ${targetValue} นาที`;
    else if (selectedType === 'calories') title = `เผาผลาญ ${targetValue} kcal`;
    else if (selectedType === 'elevation') title = `ปีนความสูง ${targetValue} เมตร`;

    onSaveGoal({
      type: selectedType,
      target: targetValue,
      title
    });
    onClose();
  };

  const handleClearGoal = () => {
    onSaveGoal({
      type: 'none',
      target: 0,
      title: 'ไม่กำหนดเป้าหมาย'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#FFFDFB] border border-[#EDE6DC] rounded-3xl p-6 sm:p-7 shadow-cozy-lg relative max-h-[90vh] overflow-y-auto text-[#2C2621]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8C827A] hover:text-[#2C2621] rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="p-3 rounded-2xl bg-[#EAF2EC] text-[#52796F]">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#2C2621]">ตั้งเป้าหมายการซ้อม (Target Goal)</h3>
            <p className="text-xs text-[#8C827A]">เมื่อทำถึงเป้าหมาย ระบบจะแจ้งเตือนฉลองความสำเร็จให้คุณ</p>
          </div>
        </div>

        {/* Goal Type Tabs */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { id: 'distance', label: 'ระยะทาง', icon: <Flag className="w-4 h-4" /> },
            { id: 'time', label: 'เวลา', icon: <Clock className="w-4 h-4" /> },
            { id: 'calories', label: 'แคลอรี่', icon: <Flame className="w-4 h-4" /> },
            { id: 'elevation', label: 'ความชัน', icon: <Mountain className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id as GoalType)}
              className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                selectedType === tab.id
                  ? 'bg-[#52796F] text-white border-[#52796F] shadow-cozy-sm'
                  : 'bg-[#FAF7F2] text-[#5A5047] border-[#EDE6DC] hover:bg-[#F3EFE6]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Presets List */}
        <div className="space-y-2 mb-5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#8C827A] block">
            เลือกเป้าหมายด่วน (Quick Presets)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {selectedType !== 'none' && presets[selectedType].map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleApplyPreset(selectedType, preset.value, preset.label)}
                className="p-3.5 rounded-2xl bg-white border border-[#EDE6DC] hover:border-[#52796F] text-left text-xs font-semibold text-[#2C2621] transition-all cursor-pointer hover:bg-[#FAF7F2] shadow-cozy-sm"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input Form */}
        <form onSubmit={handleSubmitCustom} className="space-y-4 pt-3 border-t border-[#EDE6DC]">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8C827A] block mb-2">
              หรือกำหนดค่าเอง
            </label>
            <div className="relative">
              <input
                type="number"
                step={selectedType === 'distance' ? '0.1' : '1'}
                min="1"
                value={targetValue}
                onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-2xl px-4 py-3 text-xl font-bold digital-number text-[#2C2621] focus:outline-none focus:border-[#52796F]"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8C827A] uppercase">
                {selectedType === 'distance' ? 'KM' : selectedType === 'time' ? 'นาที' : selectedType === 'calories' ? 'KCAL' : 'เมตร'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleClearGoal}
              className="text-xs text-[#B94A4A] hover:underline transition-colors cursor-pointer font-medium"
            >
              ยกเลิกเป้าหมาย
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-medium text-[#5A5047] hover:bg-[#FAF7F2] border border-[#EDE6DC] transition-colors cursor-pointer"
              >
                ปิด
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#52796F] text-white hover:bg-[#43675E] flex items-center gap-1.5 transition-all cursor-pointer shadow-cozy-sm"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกเป้าหมาย</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
