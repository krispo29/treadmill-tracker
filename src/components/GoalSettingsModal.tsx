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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">ตั้งเป้าหมายการซ้อม (Target Goal)</h3>
            <p className="text-xs text-slate-400">เมื่อทำถึงเป้าหมาย จะมีแอนิเมชันแจ้งเตือนฉลองความสำเร็จ</p>
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
              className={`p-2.5 rounded-xl flex flex-col items-center gap-1 text-xs font-semibold border transition-all cursor-pointer ${
                selectedType === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Presets List */}
        <div className="space-y-2 mb-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            เลือกเป้าหมายด่วน (Quick Presets)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {selectedType !== 'none' && presets[selectedType].map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleApplyPreset(selectedType, preset.value, preset.label)}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 text-left text-xs font-medium text-slate-200 transition-all cursor-pointer hover:bg-slate-800/80"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input Form */}
        <form onSubmit={handleSubmitCustom} className="space-y-4 pt-3 border-t border-slate-800">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              หรือกำหนดค่าเอง
            </label>
            <div className="relative">
              <input
                type="number"
                step={selectedType === 'distance' ? '0.1' : '1'}
                min="1"
                value={targetValue}
                onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xl font-bold digital-number text-white focus:outline-none focus:border-cyan-500"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 uppercase">
                {selectedType === 'distance' ? 'KM' : selectedType === 'time' ? 'นาที' : selectedType === 'calories' ? 'KCAL' : 'เมตร'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleClearGoal}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              ยกเลิกเป้าหมาย
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                ปิด
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 hover:opacity-90 flex items-center gap-1.5 transition-all cursor-pointer"
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
