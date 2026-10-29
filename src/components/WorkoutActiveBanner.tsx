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
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'work':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'rest':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'cooldown':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-2 border-cyan-500/50 p-4 sm:p-5 shadow-2xl shadow-cyan-500/10 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Top Program & Step Meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            {program.title}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            สเต็ป {currentStepIndex + 1} / {program.steps.length}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Auto Control Toggle */}
          <button
            onClick={onToggleAutoControl}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              autoControlEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="ปรับความเร็วและความชันลู่วิ่งให้อัตโนมัติตามสเต็ป"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Auto Control: {autoControlEnabled ? 'เปิด' : 'ปิด'}</span>
          </button>

          {/* Voice Coach Toggle */}
          <button
            onClick={onToggleVoice}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
              voiceEnabled ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title={voiceEnabled ? 'เปิดเสียงโค้ชบรรยายอยู่' : 'ปิดเสียงโค้ช'}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Sound Beep Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
              soundEnabled ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title={soundEnabled ? 'เปิดเสียงปี๊บอยู่' : 'ปิดเสียงปี๊บ'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Stop Workout Button */}
          <button
            onClick={onStopWorkout}
            className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-colors cursor-pointer"
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
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStepTypeBadge(currentStep.type)}`}>
              {currentStep.type}
            </span>
            <span className="text-xs text-slate-400 font-medium truncate">
              {currentStep.name}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-black digital-number text-cyan-400 glow-cyan">
              {formatDuration(stepRemaining)}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              เหลือในสเต็ปนี้
            </span>
          </div>

          {/* Mini Step Progress Bar */}
          <div className="w-48 h-1 bg-slate-950 rounded-full overflow-hidden mt-1.5 border border-slate-800">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${stepProgress}%` }}
            />
          </div>

          {currentStep.instructions && (
            <p className="text-xs text-slate-400 mt-2 italic">
              💡 {currentStep.instructions}
            </p>
          )}
        </div>

        {/* Target Speed & Incline Required */}
        <div className="md:col-span-1 flex items-center justify-around gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          {/* Target Speed */}
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block flex items-center justify-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              เป้าหมายสปีด
            </span>
            <div className="text-2xl sm:text-3xl font-black digital-number text-cyan-400 mt-0.5">
              {currentStep.targetSpeed.toFixed(1)} <span className="text-xs font-normal text-slate-400">km/h</span>
            </div>
          </div>

          <div className="w-px h-10 bg-slate-800" />

          {/* Target Incline */}
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block flex items-center justify-center gap-1">
              <Mountain className="w-3 h-3 text-orange-400" />
              เป้าหมายความชัน
            </span>
            <div className="text-2xl sm:text-3xl font-black digital-number text-orange-400 mt-0.5">
              Lvl {currentStep.targetIncline} <span className="text-xs font-normal text-slate-400">/ 20</span>
            </div>
          </div>
        </div>

        {/* Controls & Next Step Preview */}
        <div className="md:col-span-1 flex flex-col justify-between h-full space-y-2">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPauseToggle}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                isPaused
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
              <span>{isPaused ? 'เริ่มต่อ (Resume)' : 'หยุดชั่วคราว (Pause)'}</span>
            </button>

            <button
              onClick={onSkipStep}
              className="px-3 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="ข้ามไปยังสเต็ปถัดไป"
            >
              <SkipForward className="w-4 h-4" />
              <span>ข้ามสเต็ป</span>
            </button>
          </div>

          {/* Next Step Info */}
          {nextStep ? (
            <div className="text-xs bg-slate-950/40 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between text-slate-400">
              <span className="truncate">
                ถัดไป: <strong className="text-slate-200">{nextStep.name}</strong>
              </span>
              <span className="font-mono text-cyan-400 shrink-0 ml-2">
                {nextStep.targetSpeed} km/h | Lvl {nextStep.targetIncline}
              </span>
            </div>
          ) : (
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <Flag className="w-3.5 h-3.5" />
              <span>นี่คือสเต็ปสุดท้ายแล้ว! เตรียมคูลดาวน์</span>
            </div>
          )}
        </div>
      </div>

      {/* Overall Program Progress Bar */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
          <span>ความคืบหน้าทั้งโปรแกรม</span>
          <span className="font-mono text-cyan-400 font-semibold">{totalProgress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
