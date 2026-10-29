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

    const colors = ['#52796F', '#DDA15E', '#C46849', '#7C5A87', '#E07A7A', '#84A98C'];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/40 backdrop-blur-md animate-in fade-in duration-200">
      {/* Confetti overlay */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-10 w-full h-full"
      />

      {/* Main Recap Modal Card */}
      <div className="relative z-20 w-full max-w-xl bg-[#FFFDFB] border-2 border-[#CDE0D3] rounded-3xl p-5 sm:p-7 shadow-cozy-lg max-h-[94vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-200 text-[#2C2621]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8C827A] hover:text-[#2C2621] rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Header */}
        <div className="text-center space-y-2 pb-4 border-b border-[#EDE6DC]">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#FDF6EA] border-2 border-[#F0DFBE] shadow-cozy text-3xl sm:text-4xl animate-bounce">
            🏆
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF2EC] border border-[#CDE0D3] text-[#3B664E] text-xs font-bold mb-1">
              <span>{record.user_avatar || '🏃‍♀️'}</span>
              <span>{record.user_name} ({record.user_weight_kg}kg)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#2C2621] tracking-tight">
              ยอดเยี่ยมมาก! วิ่งจบเซสชั่นแล้ว 🎉
            </h2>
            <p className="text-xs text-[#8C827A]">
              {record.program_name || 'Free Running Session'} • {new Date(record.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Fun Calorie Food Reward Highlight Card (Phase 3 Exclusive) */}
        <div className="my-4 p-4 rounded-3xl bg-[#FFFDF9] border border-[#F2E5CE] flex items-center gap-4 shadow-cozy-sm">
          <div className="text-4xl sm:text-5xl shrink-0 p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC]">
            {reward.emoji}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-[#A66E22] uppercase tracking-wider block">
              🍕 พลังงานที่คุณเผาผลาญเทียบเท่า:
            </span>
            <div className="text-base sm:text-lg font-black text-[#2C2621]">
              {reward.foodName}
            </div>
            <p className="text-xs text-[#5A5047] font-medium">
              {reward.equivalentDetail}
            </p>
            <p className="text-[11px] text-[#A66E22] italic pt-0.5">
              "{reward.motivationalQuote}"
            </p>
          </div>
        </div>

        {/* Big Highlights Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-1">
          {/* Duration */}
          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC] text-center">
            <span className="text-[11px] text-[#8C827A] font-semibold flex items-center justify-center gap-1 mb-0.5">
              <Timer className="w-3.5 h-3.5 text-[#52796F]" />
              <span>เวลาที่ใช้</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-[#2C2621]">
              {durationStr}
            </span>
          </div>

          {/* Distance */}
          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC] text-center">
            <span className="text-[11px] text-[#8C827A] font-semibold flex items-center justify-center gap-1 mb-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#52796F]" />
              <span>ระยะทาง</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-[#52796F]">
              {distanceKm} <span className="text-xs font-normal text-[#8C827A]">km</span>
            </span>
          </div>

          {/* Calories */}
          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC] text-center">
            <span className="text-[11px] text-[#8C827A] font-semibold flex items-center justify-center gap-1 mb-0.5">
              <Flame className="w-3.5 h-3.5 text-[#C46849]" />
              <span>แคลอรี่</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-[#C46849]">
              {caloriesBurned} <span className="text-xs font-normal text-[#8C827A]">kcal</span>
            </span>
          </div>

          {/* Average & Max Speed */}
          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC] text-center">
            <span className="text-[11px] text-[#8C827A] font-semibold flex items-center justify-center gap-1 mb-0.5">
              <Gauge className="w-3.5 h-3.5 text-[#52796F]" />
              <span>ความเร็วเฉลี่ย</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-[#2C2621]">
              {record.avg_speed_kmh.toFixed(1)} <span className="text-xs font-normal text-[#8C827A]">km/h</span>
            </span>
            <span className="text-[10px] text-[#8C827A] block font-medium">
              สูงสุด {record.max_speed_kmh.toFixed(1)} km/h
            </span>
          </div>

          {/* Elevation Gain */}
          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC] text-center">
            <span className="text-[11px] text-[#8C827A] font-semibold flex items-center justify-center gap-1 mb-0.5">
              <Mountain className="w-3.5 h-3.5 text-[#7C5A87]" />
              <span>ความสูงที่ปีนได้</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-[#7C5A87]">
              {Math.round(record.elevation_gain_meters)} <span className="text-xs font-normal text-[#8C827A]">m</span>
            </span>
            <span className="text-[10px] text-[#8C827A] block font-medium">
              ชันเฉลี่ย Lvl {record.avg_incline}
            </span>
          </div>

          {/* Fat Burned */}
          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC] text-center">
            <span className="text-[11px] text-[#8C827A] font-semibold flex items-center justify-center gap-1 mb-0.5">
              <span>🧈 ไขมันสลาย</span>
            </span>
            <span className="text-xl sm:text-2xl font-black digital-number text-[#A66E22]">
              {Math.round(record.fat_grams_burned)} <span className="text-xs font-normal text-[#8C827A]">g</span>
            </span>
            <span className="text-[10px] text-[#8C827A] block font-medium">
              Pure Fat Burned
            </span>
          </div>
        </div>

        {/* Neon Database Cloud Auto-Save Badge */}
        <div className="my-3 p-3.5 rounded-2xl bg-[#EAF2EC] border border-[#CDE0D3] flex items-center justify-between text-xs text-[#3B664E] shadow-cozy-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-[#52796F] text-white">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block">บันทึกอัตโนมัติขึ้น Neon PostgreSQL เรียบร้อย</span>
              <span className="text-[10px] text-[#3B664E]/80 font-mono">
                ผูกสถิติกับโปรไฟล์ {record.user_name} • แยกประวัติรายบุคคล 100%
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-[#EDE6DC]">
          <button
            onClick={() => {
              onClose();
              onViewHistory();
            }}
            className="flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold bg-[#FAF7F2] hover:bg-[#F3EFE6] text-[#5A5047] border border-[#EDE6DC] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-cozy-sm"
          >
            <History className="w-4 h-4 text-[#52796F]" />
            <span>ดูประวัติทั้งหมด (View History)</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold bg-[#52796F] hover:bg-[#43675E] text-white flex items-center justify-center gap-2 shadow-cozy-sm transition-all cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>ปิดการ์ด / เริ่มรอบใหม่</span>
          </button>
        </div>

      </div>
    </div>
  );
};
