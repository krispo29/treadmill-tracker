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
      className={`rounded-3xl p-5 sm:p-6 border transition-all cursor-pointer relative overflow-hidden shadow-cozy ${
        isComplete
          ? 'bg-[#F8FAF8] border-[#A8CCA8]'
          : 'bg-white border-[#EDE6DC] hover:border-[#D8CFBF]'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isComplete
                ? 'bg-[#EAF2EC] text-[#3B664E] border border-[#CDE0D3]'
                : 'bg-[#FDF6EA] text-[#B67A28] border border-[#F0DFBE]'
            }`}
          >
            {isComplete ? <Trophy className="w-5 h-5 animate-bounce" /> : <Target className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C827A]">
                เป้าหมายวันนี้ (Target Goal)
              </span>
              {isComplete && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF2EC] text-[#3B664E] border border-[#CDE0D3]">
                  สำเร็จแล้ว! 🎉
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold text-[#2C2621]">
                {goal.type === 'none' ? 'ยังไม่ได้ตั้งเป้าหมาย' : goal.title}
              </span>
              {goal.type !== 'none' && (
                <span className="text-xs text-[#8C827A] font-medium">
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
              <div className="text-2xl sm:text-3xl font-black digital-number text-[#52796F]">
                {progress}%
              </div>
              <span className="text-[10px] text-[#8C827A] font-medium block">
                {isComplete ? 'ทะลุเป้าหมาย' : 'ความคืบหน้า'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[#52796F] font-bold flex items-center gap-1">
              <span>ตั้งเป้าหมาย</span>
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar (if goal is set) */}
      {goal.type !== 'none' && (
        <div className="mt-3.5 w-full h-2.5 bg-[#F5F0E8] rounded-full overflow-hidden p-0.5 border border-[#EDE6DC]">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isComplete ? 'bg-[#52796F]' : 'bg-[#52796F]'
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
};
