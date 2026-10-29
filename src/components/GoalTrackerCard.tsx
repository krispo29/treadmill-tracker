import React from 'react';
import { Target, Trophy, ChevronRight } from 'lucide-react';
import type { TreadmillMetrics, WorkoutGoal } from '../types/treadmill';
import { calculateGoalProgress } from '../services/calculations';

interface GoalTrackerCardProps {
  metrics: TreadmillMetrics;
  goal: WorkoutGoal;
  onOpenGoalModal: () => void;
}

export const GoalTrackerCard: React.FC<GoalTrackerCardProps> = ({
  metrics,
  goal,
  onOpenGoalModal
}) => {
  const { progress, currentFormatted, targetFormatted, isComplete } = calculateGoalProgress(metrics, goal);

  return (
    <div
      onClick={onOpenGoalModal}
      className={`rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer relative overflow-hidden ${
        isComplete
          ? 'bg-gradient-to-r from-emerald-950/70 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              isComplete
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            {isComplete ? <Trophy className="w-5 h-5 animate-bounce" /> : <Target className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                เป้าหมายวันนี้ (Target Goal)
              </span>
              {isComplete && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  สำเร็จแล้ว! 🎉
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold text-white">
                {goal.type === 'none' ? 'ยังไม่ได้ตั้งเป้าหมาย' : goal.title}
              </span>
              {goal.type !== 'none' && (
                <span className="text-xs text-slate-400">
                  ({currentFormatted} / {targetFormatted})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Progress */}
        <div className="flex items-center gap-3">
          {goal.type !== 'none' ? (
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-black digital-number text-cyan-400 glow-cyan">
                {progress}%
              </div>
              <span className="text-[10px] text-slate-500 block">
                {isComplete ? 'ทะลุเป้าหมาย' : 'ความคืบหน้า'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-cyan-400 font-medium flex items-center gap-1">
              <span>ตั้งเป้าหมาย</span>
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar (if goal is set) */}
      {goal.type !== 'none' && (
        <div className="mt-3 w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-sm shadow-emerald-400'
                : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
