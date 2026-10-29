import React, { useState, useEffect } from 'react';
import { 
  X, 
  Dumbbell, 
  Clock, 
  Mountain, 
  Play, 
  Plus, 
  Trash2, 
  Languages,
  Loader2
} from 'lucide-react';
import type { WorkoutProgram, WorkoutStep } from '../types/workout';
import { neonDatabase } from '../services/neonDatabase';

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
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch training programs directly from Neon Database (0% Hardcoded)
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      neonDatabase.getPrograms().then((res) => {
        setPrograms(res);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    }
  }, [isOpen]);

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

  const handleStartCustomWorkout = async () => {
    const totalDuration = customSteps.reduce((acc, s) => acc + s.durationSeconds, 0);
    const customProgram: WorkoutProgram = {
      id: `custom_${Date.now()}`,
      title: customTitle || 'Custom Workout',
      subtitle: 'โปรแกรมออกแบบเอง (บันทึกบน Neon DB)',
      category: 'custom',
      difficulty: 'Intermediate',
      badge: '⚙️ CUSTOM',
      targetZone: 'Personalized Interval',
      description: `โปรแกรมฝึกแบบกำหนดเอง จำนวน ${customSteps.length} สเต็ป`,
      totalDurationSeconds: totalDuration,
      steps: customSteps
    };
    await neonDatabase.saveProgram(customProgram);
    const updated = await neonDatabase.getPrograms();
    setPrograms(updated);
    onSelectProgram(customProgram);
    onClose();
  };

  const handleDeleteProgram = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('คุณต้องการลบโปรแกรมนี้ออกจาก Neon DB ใช่หรือไม่?')) {
      await neonDatabase.deleteProgram(id);
      const updated = await neonDatabase.getPrograms();
      setPrograms(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-[#FFFDFB] border border-[#EDE6DC] rounded-3xl p-6 sm:p-7 shadow-cozy-lg relative max-h-[90vh] flex flex-col text-[#2C2621]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8C827A] hover:text-[#2C2621] rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EDE6DC] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[#EAF2EC] text-[#52796F]">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#2C2621] flex items-center gap-2">
                <span>Personal Trainer Workout Engine</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#EAF2EC] text-[#3B664E] border border-[#CDE0D3]">
                  Cozy Studio
                </span>
              </h2>
              <p className="text-xs text-[#8C827A]">
                เลือกคอร์สฝึกเฉพาะทางพร้อมเสียงโค้ชบรรยาย และระบบปรับสปีด/ความชันอัตโนมัติ
              </p>
            </div>
          </div>

          {/* Voice Language Toggle */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-2xl border border-[#EDE6DC] text-xs">
            <Languages className="w-4 h-4 text-[#8C827A]" />
            <button
              onClick={() => onChangeLanguage('th-TH')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                voiceLanguage === 'th-TH' ? 'bg-[#52796F] text-white' : 'text-[#8C827A]'
              }`}
            >
              ไทย
            </button>
            <button
              onClick={() => onChangeLanguage('en-US')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                voiceLanguage === 'en-US' ? 'bg-[#52796F] text-white' : 'text-[#8C827A]'
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
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'catalog'
                ? 'bg-[#52796F] text-white border-[#52796F] shadow-cozy-sm'
                : 'bg-[#FAF7F2] text-[#5A5047] border-[#EDE6DC] hover:bg-[#F3EFE6]'
            }`}
          >
            คอร์สฝึกจาก Neon Database ({programs.length} โปรแกรม)
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'custom'
                ? 'bg-[#52796F] text-white border-[#52796F] shadow-cozy-sm'
                : 'bg-[#FAF7F2] text-[#5A5047] border-[#EDE6DC] hover:bg-[#F3EFE6]'
            }`}
          >
            สร้างโปรแกรมเอง (Custom Intervals)
          </button>
        </div>

        {/* Tab 1: Catalog */}
        {activeTab === 'catalog' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-[#8C827A] gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#52796F]" />
                <span className="text-xs">กำลังโหลดคอร์สฝึกจาก Neon PostgreSQL...</span>
              </div>
            ) : programs.length === 0 ? (
              <div className="text-center p-8 text-[#8C827A] text-xs">
                ยังไม่มีโปรแกรมในฐานข้อมูล
              </div>
            ) : (
              programs.map((prog) => (
                <div
                  key={prog.id}
                  className="rounded-3xl bg-white border border-[#EDE6DC] hover:border-[#52796F] p-4.5 transition-all shadow-cozy-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#FDF6EA] text-[#9A641F] border border-[#F0DFBE]">
                        {prog.badge}
                      </span>
                      <h3 className="text-base font-bold text-[#2C2621]">
                        {prog.title}
                      </h3>
                      <span className="text-xs text-[#8C827A] font-medium">
                        • {prog.difficulty}
                      </span>
                    </div>

                    <p className="text-xs text-[#52796F] font-semibold">
                      {prog.subtitle}
                    </p>

                    <p className="text-xs text-[#8C827A] line-clamp-2 leading-relaxed">
                      {prog.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-[#8C827A] pt-1 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#52796F]" />
                        <span>{Math.round(prog.totalDurationSeconds / 60)} นาที</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Mountain className="w-3.5 h-3.5 text-[#C46849]" />
                        <span>{prog.targetZone}</span>
                      </span>
                      <span className="text-[#8C827A]">
                        {prog.steps.length} สเต็ป
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {prog.category === 'custom' && (
                      <button
                        onClick={(e) => handleDeleteProgram(prog.id, e)}
                        className="p-2 rounded-xl text-[#8C827A] hover:text-[#B94A4A] hover:bg-[#FDF0F0] cursor-pointer"
                        title="ลบโปรแกรมที่สร้างเองนี้ออกจาก Neon DB"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onSelectProgram(prog);
                        onClose();
                      }}
                      className="py-2.5 px-5 rounded-2xl text-xs font-bold bg-[#52796F] hover:bg-[#43675E] text-white flex items-center justify-center gap-2 shadow-cozy-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>เริ่มคอร์สนี้</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Custom Interval Builder */}
        {activeTab === 'custom' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#8C827A] block mb-1">
                ชื่อโปรแกรม
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-2xl px-4 py-2.5 text-sm font-semibold text-[#2C2621] focus:outline-none focus:border-[#52796F]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8C827A]">
                  รายการสเต็ปการฝึก ({customSteps.length} ช่วง)
                </label>
                <button
                  onClick={handleAddCustomStep}
                  className="text-xs text-[#52796F] hover:text-[#43675E] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มสเต็ป</span>
                </button>
              </div>

              {customSteps.map((step, idx) => (
                <div
                  key={step.id}
                  className="p-3.5 rounded-2xl bg-white border border-[#EDE6DC] flex flex-wrap items-center justify-between gap-3 text-xs shadow-cozy-sm"
                >
                  {/* Step Name */}
                  <input
                    type="text"
                    value={step.name}
                    onChange={(e) => handleUpdateStep(idx, 'name', e.target.value)}
                    className="bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-3 py-1.5 text-xs text-[#2C2621] font-semibold w-32 focus:outline-none focus:border-[#52796F]"
                  />

                  {/* Duration */}
                  <div className="flex items-center gap-1 font-medium">
                    <span className="text-[#8C827A]">เวลา:</span>
                    <input
                      type="number"
                      min="10"
                      step="30"
                      value={step.durationSeconds}
                      onChange={(e) => handleUpdateStep(idx, 'durationSeconds', parseInt(e.target.value) || 60)}
                      className="bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-2 py-1 text-xs text-[#2C2621] w-16 text-center font-mono font-bold"
                    />
                    <span className="text-[#8C827A]">วิ</span>
                  </div>

                  {/* Target Speed */}
                  <div className="flex items-center gap-1 font-medium">
                    <span className="text-[#52796F] font-bold">Speed:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="16.0"
                      step="0.5"
                      value={step.targetSpeed}
                      onChange={(e) => handleUpdateStep(idx, 'targetSpeed', parseFloat(e.target.value) || 5.0)}
                      className="bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-2 py-1 text-xs text-[#52796F] w-16 text-center font-mono font-bold"
                    />
                    <span className="text-[#8C827A]">km/h</span>
                  </div>

                  {/* Target Incline */}
                  <div className="flex items-center gap-1 font-medium">
                    <span className="text-[#C46849] font-bold">Incline:</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="1"
                      value={step.targetIncline}
                      onChange={(e) => handleUpdateStep(idx, 'targetIncline', parseInt(e.target.value) || 0)}
                      className="bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-2 py-1 text-xs text-[#C46849] w-14 text-center font-mono font-bold"
                    />
                    <span className="text-[#8C827A]">/20</span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveCustomStep(idx)}
                    disabled={customSteps.length <= 1}
                    className="p-1 text-[#8C827A] hover:text-[#B94A4A] transition-colors disabled:opacity-30 cursor-pointer"
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
                className="px-6 py-2.5 rounded-2xl font-bold text-xs bg-[#52796F] hover:bg-[#43675E] text-white flex items-center gap-1.5 shadow-cozy-sm cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>บันทึกและเริ่มโปรแกรม Custom</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
