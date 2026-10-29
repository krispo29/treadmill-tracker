import React, { useEffect, useRef } from 'react';
import { 
  Timer, 
  MapPin, 
  Flame, 
  Gauge, 
  Mountain, 
  Check, 
  History, 
  X
} from 'lucide-react';
import type { WorkoutRecord } from '../types/database';
import { formatDuration, getCalorieReward } from '../services/calculations';
import { audioCoach } from '../services/audioCoach';

interface WorkoutRecapModalProps {
  isOpen: boolean;
  record: WorkoutRecord | null;
  onClose: () => void;
  onViewHistory: () => void;
}

export const WorkoutRecapModal: React.FC<WorkoutRecapModalProps> = ({
  isOpen,
  record,
  onClose,
  onViewHistory,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Trigger celebration fanfare sound and voice congratulations
  useEffect(() => {
    if (isOpen && record) {
      audioCoach.playCelebrationFanfare();
      const distKm = (record.distance_meters / 1000).toFixed(1);
      const kcal = Math.round(record.calories_burned);
      const voiceText = `ยอดเยี่ยมมากครับ ${record.user_name} วิ่งเสร็จแล้ว ระยะทาง ${distKm} กิโลเมตร เผาผลาญไป ${kcal} แคลอรี่ บันทึกข้อมูลเรียบร้อยครับ`;
      setTimeout(() => {
        audioCoach.speak(voiceText);
      }, 700);
    }
  }, [isOpen, record]);

  // High-performance lightweight Canvas Confetti System
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
    const particleCount = 70;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: width * 0.5 + (Math.random() - 0.5) * 200,
      y: height * 0.2,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 10,
      gravity: 0.35,
      friction: 0.98,
      opacity: 1,
    }));

    let startTime = Date.now();

    const render = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRotation;

        if (elapsed > 2500) {
          p.opacity = Math.max(0, p.opacity - 0.02);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (elapsed < 4500) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  if (!isOpen || !record) return null;

  const durationStr = formatDuration(record.duration_seconds);
  const distanceKm = (record.distance_meters / 1000).toFixed(2);
  const caloriesBurned = Math.round(record.calories_burned);
  const reward = getCalorieReward(caloriesBurned);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Confetti overlay */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-10 w-full h-full"
      />

      {/* Main Recap Modal Card */}
      <div className="relative z-20 w-full max-w-xl bg-slate-900 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-cyan-950/60 max-h-[94vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Header */}
        <div className="text-center space-y-2 pb-4 border-b border-slate-800/80">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-cyan-500/20 to-emerald-500/20 border-2 border-amber-400/50 shadow-xl shadow-amber-500/20 text-3xl sm:text-4xl animate-bounce">
            🏆
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold mb-1">
              <span>{record.user_avatar || '🏃‍♂️'}</span>
              <span>{record.user_name} ({record.user_weight_kg}kg)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              ยอดเยี่ยมมาก! วิ่งจบเซสชั่นแล้ว 🎉
            </h2>
            <p className="text-xs text-slate-400">
              {record.program_name || 'Free Running Session'} • {new Date(record.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Fun Calorie Food Reward Highlight Card (Phase 3 Exclusive) */}
        <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-amber-500/40 flex items-center gap-4 shadow-lg shadow-amber-950/20">
          <div className="text-4xl sm:text-5xl shrink-0 p-2 rounded-2xl bg-slate-900/80 border border-amber-500/30">
            {reward.emoji}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-amber-300 uppercase tracking-wider block">
              🍕 พลังงานที่คุณเผาผลาญเทียบเท่า:
            </span>
            <div className="text-base sm:text-lg font-black text-white">
              {reward.foodName}
            </div>
            <p className="text-xs text-slate-300">
              {reward.equivalentDetail}
            </p>
            <p className="text-[11px] text-amber-200/80 italic pt-0.5">
              "{reward.motivationalQuote}"
            </p>
          </div>
        </div>

        {/* Big Highlights Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-1">
          {/* Duration */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-1 mb-0.5">
              <Timer className="w-3.5 h-3.5 text-cyan-400" />
              <span>เวลาที่ใช้</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-white">
              {durationStr}
            </span>
          </div>

          {/* Distance */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-1 mb-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>ระยะทาง</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-emerald-400">
              {distanceKm} <span className="text-xs font-normal text-slate-400">km</span>
            </span>
          </div>

          {/* Calories */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-1 mb-0.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>แคลอรี่</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-orange-400">
              {caloriesBurned} <span className="text-xs font-normal text-slate-400">kcal</span>
            </span>
          </div>

          {/* Average & Max Speed */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-1 mb-0.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>ความเร็วเฉลี่ย</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-cyan-300">
              {record.avg_speed_kmh.toFixed(1)} <span className="text-xs font-normal text-slate-400">km/h</span>
            </span>
            <span className="text-[10px] text-slate-500 block">
              สูงสุด {record.max_speed_kmh.toFixed(1)} km/h
            </span>
          </div>

          {/* Elevation Gain */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-1 mb-0.5">
              <Mountain className="w-3.5 h-3.5 text-purple-400" />
              <span>ความสูงที่ปีนได้</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-purple-300">
              {Math.round(record.elevation_gain_meters)} <span className="text-xs font-normal text-slate-400">m</span>
            </span>
            <span className="text-[10px] text-slate-500 block">
              ชันเฉลี่ย Lvl {record.avg_incline}
            </span>
          </div>

          {/* Fat Burned */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-1 mb-0.5">
              <span>🧈 ไขมันสลาย</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-amber-300">
              {Math.round(record.fat_grams_burned)} <span className="text-xs font-normal text-slate-400">g</span>
            </span>
            <span className="text-[10px] text-slate-500 block">
              Pure Fat Burned
            </span>
          </div>
        </div>

        {/* Neon Database Cloud Auto-Save Badge */}
        <div className="my-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block">บันทึกอัตโนมัติขึ้น Neon PostgreSQL เรียบร้อย</span>
              <span className="text-[10px] text-emerald-400/80 font-mono">
                ผูกสถิติกับโปรไฟล์ {record.user_name} • แยกประวัติรายบุคคล 100%
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              onClose();
              onViewHistory();
            }}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <History className="w-4 h-4 text-cyan-400" />
            <span>ดูประวัติทั้งหมด (View History)</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>ปิดการ์ด / เริ่มรอบใหม่</span>
          </button>
        </div>

      </div>
    </div>
  );
};
