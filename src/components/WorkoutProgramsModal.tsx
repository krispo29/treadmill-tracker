import React, { useState } from 'react';
import { 
  X, 
  Dumbbell, 
  Clock, 
  Mountain, 
  Play, 
  Plus, 
  Trash2, 
  Languages 
} from 'lucide-react';
import type { WorkoutProgram, WorkoutStep } from '../types/workout';
import { WORKOUT_PROGRAMS } from '../data/programs';

interface WorkoutProgramsModalProps {
  isOpen: boolean;
  onSelectProgram: (program: WorkoutProgram) => void;
  onClose: () => void;
  voiceLanguage: 'th-TH' | 'en-US';
  onChangeLanguage: (lang: 'th-TH' | 'en-US') => void;
}

export const WorkoutProgramsModal: React.FC<WorkoutProgramsModalProps> = ({
  isOpen,
  onSelectProgram,
  onClose,
  voiceLanguage,
  onChangeLanguage,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');

  // Custom workout creator state
  const [customTitle, setCustomTitle] = useState('My Custom Workout');
  const [customSteps, setCustomSteps] = useState<WorkoutStep[]>([
    { id: 'c1', name: 'วอร์มอัป', durationSeconds: 300, targetSpeed: 4.0, targetIncline: 2, type: 'warmup' },
    { id: 'c2', name: 'เดินชันเผาผลาญ', durationSeconds: 900, targetSpeed: 4.8, targetIncline: 10, type: 'work' },
    { id: 'c3', name: 'คูลดาวน์', durationSeconds: 300, targetSpeed: 3.5, targetIncline: 0, type: 'cooldown' },
  ]);

  if (!isOpen) return null;

  const handleAddCustomStep = () => {
    const newStep: WorkoutStep = {
      id: Math.random().toString(36).substring(2, 7),
      name: `ช่วงที่ ${customSteps.length + 1}`,
      durationSeconds: 300,
      targetSpeed: 5.0,
      targetIncline: 4,
      type: 'work'
    };
    setCustomSteps([...customSteps, newStep]);
  };

  const handleRemoveCustomStep = (idx: number) => {
    if (customSteps.length <= 1) return;
    setCustomSteps(customSteps.filter((_, i) => i !== idx));
  };

  const handleUpdateStep = (idx: number, field: keyof WorkoutStep, val: any) => {
    const updated = [...customSteps];
    updated[idx] = { ...updated[idx], [field]: val };
    setCustomSteps(updated);
  };

  const handleStartCustomWorkout = () => {
    const totalDuration = customSteps.reduce((acc, s) => acc + s.durationSeconds, 0);
    const customProgram: WorkoutProgram = {
      id: `custom_${Date.now()}`,
      title: customTitle || 'Custom Workout',
      subtitle: 'โปรแกรมออกแบบเอง',
      category: 'custom',
      difficulty: 'Intermediate',
      badge: '⚙️ CUSTOM',
      targetZone: 'Personalized Interval',
      description: `โปรแกรมฝึกแบบกำหนดเอง จำนวน ${customSteps.length} สเต็ป`,
      totalDurationSeconds: totalDuration,
      steps: customSteps
    };
    onSelectProgram(customProgram);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>Personal Trainer Workout Engine</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Phase 3
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                เลือกคอร์สฝึกเฉพาะทางพร้อมเสียงโค้ชบรรยาย และระบบปรับสปีด/ความชันอัตโนมัติ
              </p>
            </div>
          </div>

          {/* Voice Language Toggle */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Languages className="w-4 h-4 text-slate-400" />
            <button
              onClick={() => onChangeLanguage('th-TH')}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                voiceLanguage === 'th-TH' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              ไทย
            </button>
            <button
              onClick={() => onChangeLanguage('en-US')}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                voiceLanguage === 'en-US' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 my-4 shrink-0">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'catalog'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
            }`}
          >
            คอร์สฝึกมาตรฐาน (4 โปรแกรม)
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'custom'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
            }`}
          >
            สร้างโปรแกรมเอง (Custom Intervals)
          </button>
        </div>

        {/* Tab 1: Catalog */}
        {activeTab === 'catalog' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {WORKOUT_PROGRAMS.map((prog) => (
              <div
                key={prog.id}
                className="rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-4 transition-all hover:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {prog.badge}
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {prog.title}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      • {prog.difficulty}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium">
                    {prog.subtitle}
                  </p>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {prog.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{Math.round(prog.totalDurationSeconds / 60)} นาที</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Mountain className="w-3.5 h-3.5 text-orange-400" />
                      <span>{prog.targetZone}</span>
                    </span>
                    <span className="text-slate-500">
                      {prog.steps.length} สเต็ป
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectProgram(prog);
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-cyan-500/10 cursor-pointer shrink-0 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>เริ่มซ้อม</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Custom Interval Builder */}
        {activeTab === 'custom' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                ชื่อโปรแกรม
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  รายการสเต็ปการฝึก ({customSteps.length} ช่วง)
                </label>
                <button
                  onClick={handleAddCustomStep}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มสเต็ป</span>
                </button>
              </div>

              {customSteps.map((step, idx) => (
                <div
                  key={step.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  {/* Step Name */}
                  <input
                    type="text"
                    value={step.name}
                    onChange={(e) => handleUpdateStep(idx, 'name', e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white w-32 focus:outline-none focus:border-cyan-500"
                  />

                  {/* Duration */}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">เวลา:</span>
                    <input
                      type="number"
                      min="10"
                      step="30"
                      value={step.durationSeconds}
                      onChange={(e) => handleUpdateStep(idx, 'durationSeconds', parseInt(e.target.value) || 60)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white w-16 text-center font-mono font-bold"
                    />
                    <span className="text-slate-500">วิ</span>
                  </div>

                  {/* Target Speed */}
                  <div className="flex items-center gap-1">
                    <span className="text-cyan-400 font-semibold">Speed:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="16.0"
                      step="0.5"
                      value={step.targetSpeed}
                      onChange={(e) => handleUpdateStep(idx, 'targetSpeed', parseFloat(e.target.value) || 5.0)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-400 w-16 text-center font-mono font-bold"
                    />
                    <span className="text-slate-500">km/h</span>
                  </div>

                  {/* Target Incline */}
                  <div className="flex items-center gap-1">
                    <span className="text-orange-400 font-semibold">Incline:</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="1"
                      value={step.targetIncline}
                      onChange={(e) => handleUpdateStep(idx, 'targetIncline', parseInt(e.target.value) || 0)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-orange-400 w-14 text-center font-mono font-bold"
                    />
                    <span className="text-slate-500">/20</span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveCustomStep(idx)}
                    disabled={customSteps.length <= 1}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-30 cursor-pointer"
                    title="ลบสเต็ปนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleStartCustomWorkout}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>บันทึกและเริ่มโปรแกรม Custom</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
