import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  Download, 
  Trash2, 
  Database, 
  Flame, 
  Mountain, 
  MapPin, 
  Timer, 
  Calendar,
  RefreshCw
} from 'lucide-react';
import type { WorkoutRecord, DatabaseStats } from '../types/database';
import { neonDatabase } from '../services/neonDatabase';
import { formatDuration } from '../services/calculations';

interface HistoryAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNeonSettings: () => void;
}

export const HistoryAnalyticsModal: React.FC<HistoryAnalyticsModalProps> = ({
  isOpen,
  onClose,
  onOpenNeonSettings
}) => {
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const isNeonConnected = neonDatabase.isConfigured();

  const loadWorkouts = async () => {
    setLoading(true);
    const data = await neonDatabase.getWorkouts();
    setWorkouts(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadWorkouts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const stats: DatabaseStats = neonDatabase.calculateStats(workouts);

  const handleDelete = async (id: string) => {
    if (window.confirm('คุณต้องการลบประวัติการวิ่งนี้ใช่หรือไม่?')) {
      await neonDatabase.deleteWorkout(id);
      setWorkouts((prev) => prev.filter(w => w.id !== id));
    }
  };

  const handleDownloadGpx = (workout: WorkoutRecord) => {
    const gpxText = neonDatabase.generateGpx(workout);
    const blob = new Blob([gpxText], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treadmill-${new Date(workout.created_at).toISOString().split('T')[0]}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (workouts.length === 0) return;
    const csvText = neonDatabase.generateCsv(workouts);
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treadmill-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>ประวัติและสถิติการวิ่ง (Workout History)</span>
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs">
                {isNeonConnected ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Neon Database เชื่อมต่อแล้ว (Cloud Sync)
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    บันทึกลงในเครื่อง (ยังไม่ได้เชื่อม Neon)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Database Setup & Refresh Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadWorkouts}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onOpenNeonSettings}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isNeonConnected ? 'จัดการ Neon DB' : 'เชื่อมต่อ Neon DB'}</span>
            </button>
          </div>
        </div>

        {/* Aggregate Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-4 shrink-0">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">จำนวนครั้ง</span>
            <div className="text-xl sm:text-2xl font-black digital-number text-white mt-0.5">
              {stats.totalWorkouts} <span className="text-xs text-slate-400 font-normal">เซสชั่น</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">ระยะทางรวม</span>
            <div className="text-xl sm:text-2xl font-black digital-number text-emerald-400 mt-0.5">
              {stats.totalDistanceKm.toFixed(1)} <span className="text-xs text-slate-400 font-normal">km</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">ความสูงสะสม</span>
            <div className="text-xl sm:text-2xl font-black digital-number text-indigo-400 mt-0.5">
              +{Math.round(stats.totalElevationMeters)} <span className="text-xs text-slate-400 font-normal">m</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">แคลอรี่รวม</span>
            <div className="text-xl sm:text-2xl font-black digital-number text-orange-400 mt-0.5">
              {Math.round(stats.totalCalories)} <span className="text-xs text-slate-400 font-normal">kcal</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">ไขมันที่เผาผลาญ</span>
            <div className="text-xl sm:text-2xl font-black digital-number text-amber-400 mt-0.5">
              {stats.totalFatGrams.toFixed(0)} <span className="text-xs text-slate-400 font-normal">กรัม</span>
            </div>
          </div>
        </div>

        {/* Workouts History List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {workouts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <span>ยังไม่มีประวัติการวิ่ง (เมื่อวิ่งเสร็จและกดบันทึก ข้อมูลจะขึ้นที่นี่)</span>
            </div>
          ) : (
            workouts.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                {/* Left: Program & Date */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {w.program_name || 'Free Run'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(w.created_at).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Metrics Badges */}
                  <div className="flex flex-wrap items-center gap-3 text-slate-300 pt-0.5">
                    <span className="flex items-center gap-1 font-mono">
                      <Timer className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{formatDuration(w.duration_seconds)}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{(w.distance_meters / 1000).toFixed(2)} km</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Mountain className="w-3.5 h-3.5 text-indigo-400" />
                      <span>+{Math.round(w.elevation_gain_meters)}m (Lvl {w.max_incline})</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span>{Math.round(w.calories_burned)} kcal</span>
                    </span>
                    <span className="text-amber-400 font-mono">
                      🔥 ไขมัน {w.fat_grams_burned.toFixed(1)}g
                    </span>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownloadGpx(w)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                    title="ดาวน์โหลดไฟล์ .GPX สำหรับอัปโหลดเข้า Strava"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Strava GPX</span>
                  </button>

                  <button
                    onClick={() => handleDelete(w.id)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition-colors cursor-pointer"
                    title="ลบรายการนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: Export All to CSV */}
        {workouts.length > 0 && (
          <div className="pt-3 border-t border-slate-800 flex justify-between items-center shrink-0">
            <span className="text-xs text-slate-500">
              ข้อมูลทั้งหมดเก็บไว้บน Neon Cloud อย่างปลอดภัย
            </span>
            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออกทั้งหมดเป็น CSV (Excel)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
