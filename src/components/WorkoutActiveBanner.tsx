import React from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  X, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Zap, 
  Flag,
  Mountain,
  Gauge
} from 'lucide-react';
import type { WorkoutProgram, WorkoutStep } from '../types/workout';
import { formatDuration } from '../services/calculations';

interface WorkoutActiveBannerProps {
  program: WorkoutProgram;
  currentStepIndex: number;
  stepElapsedSeconds: number;
  isPaused: boolean;
  autoControlEnabled: boolean;
  voiceEnabled: boolean;
  soundEnabled: boolean;
  onPauseToggle: () => void;
  onSkipStep: () => void;
  onStopWorkout: () => void;
  onToggleAutoControl: () => void;
  onToggleVoice: () => void;
  onToggleSound: () => void;
}

export const WorkoutActiveBanner: React.FC<WorkoutActiveBannerProps> = ({
  program,
  currentStepIndex,
  stepElapsedSeconds,
  isPaused,
  autoControlEnabled,
  voiceEnabled,
  soundEnabled,
  onPauseToggle,
  onSkipStep,
  onStopWorkout,
  onToggleAutoControl,
  onToggleVoice,
  onToggleSound,
}) => {
  const currentStep: WorkoutStep = program.steps[currentStepIndex] || program.steps[0];
  const nextStep: WorkoutStep | undefined = program.steps[currentStepIndex + 1];

  const stepRemaining = Math.max(0, currentStep.durationSeconds - stepElapsedSeconds);
  const stepProgress = Math.min(100, Math.round((stepElapsedSeconds / currentStep.durationSeconds) * 100));

  // Calculate total workout progress
  const completedDuration = program.steps
    .slice(0, currentStepIndex)
    .reduce((acc, s) => acc + s.durationSeconds, 0) + stepElapsedSeconds;
  const totalProgress = Math.min(100, Math.round((completedDuration / program.totalDurationSeconds) * 100));

  const getStepTypeBadge = (type: string) => {
    switch (type) {
      case 'warmup':
        return 'bg-[#FDF6EA] text-[#9A641F] border-[#F0DFBE]';
      case 'work':
        return 'bg-[#FDF0EC] text-[#B85737] border-[#F6D5C9]';
      case 'rest':
        return 'bg-[#EAF2EC] text-[#3B664E] border-[#CDE0D3]';
      case 'cooldown':
        return 'bg-[#F5EFF7] text-[#694874] border-[#E5D7E8]';
      default:
        return 'bg-[#FAF7F2] text-[#5A5047] border-[#EDE6DC]';
    }
  };

  return (
    <div className="rounded-3xl bg-white border-2 border-[#CDE0D3] p-5 sm:p-6 shadow-cozy relative overflow-hidden">
      {/* Top Program & Step Meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EDE6DC]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#52796F] animate-pulse" />
          <h2 className="text-sm sm:text-base font-bold text-[#2C2621] tracking-wide">
            {program.title}
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#FAF7F2] text-[#5A5047] border border-[#EDE6DC]">
            สเต็ป {currentStepIndex + 1} / {program.steps.length}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Auto Control Toggle */}
          <button
            onClick={onToggleAutoControl}
            className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              autoControlEnabled
                ? 'bg-[#EAF2EC] text-[#3B664E] border-[#CDE0D3]'
                : 'bg-[#FAF7F2] text-[#8C827A] border-[#EDE6DC]'
            }`}
            title="ปรับความเร็วและความชันลู่วิ่งให้อัตโนมัติตามสเต็ป"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Auto Control: {autoControlEnabled ? 'เปิด' : 'ปิด'}</span>
          </button>

          {/* Voice Coach Toggle */}
          <button
            onClick={onToggleVoice}
            className={`p-1.5 rounded-xl text-xs transition-colors cursor-pointer border ${
              voiceEnabled ? 'bg-[#FDF6EA] text-[#9A641F] border-[#F0DFBE]' : 'bg-[#FAF7F2] text-[#8C827A] border-[#EDE6DC]'
            }`}
            title={voiceEnabled ? 'เปิดเสียงโค้ชบรรยายอยู่' : 'ปิดเสียงโค้ช'}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Sound Beep Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-xl text-xs transition-colors cursor-pointer border ${
              soundEnabled ? 'bg-[#FDF6EA] text-[#9A641F] border-[#F0DFBE]' : 'bg-[#FAF7F2] text-[#8C827A] border-[#EDE6DC]'
            }`}
            title={soundEnabled ? 'เปิดเสียงปี๊บอยู่' : 'ปิดเสียงปี๊บ'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Stop Workout Button */}
          <button
            onClick={onStopWorkout}
            className="p-1.5 rounded-xl bg-[#FDF0F0] text-[#B94A4A] hover:bg-[#FBE4E4] border border-[#F4CECE] transition-colors cursor-pointer"
            title="หยุดโปรแกรมฝึกนี้"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Focus: Countdown & Targets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 items-center">
        {/* Step Name & Remaining Time */}
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${getStepTypeBadge(currentStep.type)}`}>
              {currentStep.type}
            </span>
            <span className="text-xs text-[#8C827A] font-medium truncate">
              {currentStep.name}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-black digital-number text-[#2C2621]">
              {formatDuration(stepRemaining)}
            </span>
            <span className="text-xs text-[#8C827A] font-medium">
              เหลือในสเต็ปนี้
            </span>
          </div>

          {/* Mini Step Progress Bar */}
          <div className="w-48 h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden mt-2 border border-[#EDE6DC]">
            <div
              className="h-full bg-[#52796F] transition-all duration-300 rounded-full"
              style={{ width: `${stepProgress}%` }}
            />
          </div>

          {currentStep.instructions && (
            <p className="text-xs text-[#8C827A] mt-2 italic font-medium">
              💡 {currentStep.instructions}
            </p>
          )}
        </div>

        {/* Target Speed & Incline Required */}
        <div className="md:col-span-1 flex items-center justify-around gap-2 bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#EDE6DC]">
          {/* Target Speed */}
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-wider text-[#8C827A] font-bold block flex items-center justify-center gap-1">
              <Gauge className="w-3 h-3 text-[#52796F]" />
              เป้าหมายสปีด
            </span>
            <div className="text-2xl sm:text-3xl font-black digital-number text-[#2C2621] mt-0.5">
              {currentStep.targetSpeed.toFixed(1)} <span className="text-xs font-normal text-[#8C827A]">km/h</span>
            </div>
          </div>

          <div className="w-px h-10 bg-[#EDE6DC]" />

          {/* Target Incline */}
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-wider text-[#8C827A] font-bold block flex items-center justify-center gap-1">
              <Mountain className="w-3 h-3 text-[#C46849]" />
              เป้าหมายความชัน
            </span>
            <div className="text-2xl sm:text-3xl font-black digital-number text-[#C46849] mt-0.5">
              Lvl {currentStep.targetIncline} <span className="text-xs font-normal text-[#8C827A]">/ 20</span>
            </div>
          </div>
        </div>

        {/* Controls & Next Step Preview */}
        <div className="md:col-span-1 flex flex-col justify-between h-full space-y-2">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPauseToggle}
              className={`flex-1 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-cozy-sm ${
                isPaused
                  ? 'bg-[#52796F] hover:bg-[#43675E] text-white'
                  : 'bg-[#FDF6EA] hover:bg-[#F7EEDC] text-[#9A641F] border border-[#F0DFBE]'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
              <span>{isPaused ? 'เริ่มต่อ (Resume)' : 'หยุดชั่วคราว (Pause)'}</span>
            </button>

            <button
              onClick={onSkipStep}
              className="px-3.5 py-2.5 rounded-2xl font-bold text-xs bg-white hover:bg-[#FAF7F2] text-[#5A5047] border border-[#EDE6DC] transition-colors flex items-center gap-1 cursor-pointer shadow-cozy-sm"
              title="ข้ามไปยังสเต็ปถัดไป"
            >
              <SkipForward className="w-4 h-4" />
              <span>ข้ามสเต็ป</span>
            </button>
          </div>

          {/* Next Step Info */}
          {nextStep ? (
            <div className="text-xs bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EDE6DC] flex items-center justify-between text-[#8C827A]">
              <span className="truncate">
                ถัดไป: <strong className="text-[#2C2621]">{nextStep.name}</strong>
              </span>
              <span className="font-mono text-[#52796F] font-semibold shrink-0 ml-2">
                {nextStep.targetSpeed} km/h | Lvl {nextStep.targetIncline}
              </span>
            </div>
          ) : (
            <div className="text-xs text-[#3B664E] font-medium flex items-center gap-1">
              <Flag className="w-3.5 h-3.5" />
              <span>นี่คือสเต็ปสุดท้ายแล้ว! เตรียมคูลดาวน์</span>
            </div>
          )}
        </div>
      </div>

      {/* Overall Program Progress Bar */}
      <div className="pt-2 border-t border-[#EDE6DC]">
        <div className="flex justify-between text-[11px] text-[#8C827A] mb-1 font-medium">
          <span>ความคืบหน้าทั้งโปรแกรม</span>
          <span className="font-mono text-[#52796F] font-bold">{totalProgress}%</span>
        </div>
        <div className="w-full h-2 bg-[#F5F0E8] rounded-full overflow-hidden p-0.5 border border-[#EDE6DC]">
          <div
            className="h-full bg-[#52796F] rounded-full transition-all duration-300"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
