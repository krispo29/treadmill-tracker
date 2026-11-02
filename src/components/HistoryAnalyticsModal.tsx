import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  Download, 
  Trash2, 
  Flame, 
  Mountain, 
  MapPin, 
  Timer, 
  Calendar,
  RefreshCw,
  Users,
  Camera
} from 'lucide-react';
import type { WorkoutRecord, DatabaseStats } from '../types/database';
import type { UserProfile } from '../types/treadmill';
import { neonDatabase } from '../services/neonDatabase';
import { formatDuration } from '../services/calculations';
import { WorkoutPostcardModal } from './WorkoutPostcardModal';

interface HistoryAnalyticsModalProps {
  isOpen: boolean;
  profiles: UserProfile[];
  onClose: () => void;
}

export const HistoryAnalyticsModal: React.FC<HistoryAnalyticsModalProps> = ({
  isOpen,
  profiles,
  onClose
}) => {
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [selectedPostcardRecord, setSelectedPostcardRecord] = useState<WorkoutRecord | null>(null);

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

  // Filter workouts by selected user
  const filteredWorkouts = selectedUserFilter === 'all'
    ? workouts
    : workouts.filter(w => (w.user_name || '').toLowerCase() === selectedUserFilter.toLowerCase() || w.user_id === selectedUserFilter);

  const stats: DatabaseStats = neonDatabase.calculateStats(filteredWorkouts);

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
    a.download = `treadmill-${(workout.user_name || 'run').toLowerCase()}-${new Date(workout.created_at).toISOString().split('T')[0]}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (filteredWorkouts.length === 0) return;
    const csvText = neonDatabase.generateCsv(filteredWorkouts);
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treadmill-history-${selectedUserFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-[#FFFDFB] border border-[#EDE6DC] rounded-3xl p-6 sm:p-7 shadow-cozy-lg relative max-h-[92vh] flex flex-col text-[#2C2621]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8C827A] hover:text-[#2C2621] rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EDE6DC] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[#EAF2EC] text-[#52796F]">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#2C2621] flex items-center gap-2">
                <span>ประวัติและสถิติการวิ่ง (Workout History)</span>
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs">
                <span className="text-[#3B664E] flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#52796F] animate-pulse" />
                  ซิงก์ประวัติการวิ่งอัตโนมัติ (Cloud Sync)
                </span>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadWorkouts}
              disabled={loading}
              className="p-2.5 rounded-2xl bg-[#FAF7F2] hover:bg-[#F3EFE6] text-[#5A5047] border border-[#EDE6DC] transition-colors cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Multi-Profile Filter Tabs */}
        <div className="flex items-center gap-1.5 my-3.5 overflow-x-auto pb-1 shrink-0 text-xs">
          <span className="text-[#8C827A] font-bold mr-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>กรองตามคนวิ่ง:</span>
          </span>

          <button
            onClick={() => setSelectedUserFilter('all')}
            className={`px-3.5 py-1.5 rounded-2xl font-bold transition-all cursor-pointer border ${
              selectedUserFilter === 'all'
                ? 'bg-[#52796F] text-white border-[#52796F] shadow-cozy-sm'
                : 'bg-[#FAF7F2] text-[#5A5047] border-[#EDE6DC] hover:bg-[#F3EFE6]'
            }`}
          >
            ทุกคนรวมกัน ({workouts.length})
          </button>

          {profiles.map((p) => {
            const count = workouts.filter(w => (w.user_name || '').toLowerCase() === p.name.toLowerCase() || w.user_id === p.id).length;
            const isSelected = selectedUserFilter.toLowerCase() === p.name.toLowerCase() || selectedUserFilter === p.id;

            return (
              <button
                key={p.id}
                onClick={() => setSelectedUserFilter(p.name)}
                className={`px-3.5 py-1.5 rounded-2xl font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#52796F] text-white border-[#52796F] shadow-cozy-sm'
                    : 'bg-[#FAF7F2] text-[#5A5047] border-[#EDE6DC] hover:bg-[#F3EFE6]'
                }`}
              >
                <span>{p.avatar || '🏃‍♀️'}</span>
                <span>{p.name}</span>
                <span className="opacity-75 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Aggregate Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3.5 shrink-0">
          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC]">
            <span className="text-[10px] uppercase font-bold text-[#8C827A] block">จำนวนครั้ง</span>
            <div className="text-xl sm:text-2xl font-black digital-number text-[#2C2621] mt-0.5">
              {stats.totalWorkouts} <span className="text-xs text-[#8C827A] font-normal">เซสชั่น</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC]">
            <span className="text-[10px] uppercase font-bold text-[#8C827A] block">ระยะทางรวม</span>
            <div className="text-xl sm:text-2xl font-black digital-number text-[#52796F] mt-0.5">
              {stats.totalDistanceKm.toFixed(1)} <span className="text-xs text-[#8C827A] font-normal">km</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC]">
            <span className="text-[10px] uppercase font-bold text-[#8C827A] block">ความสูงสะสม</span>
            <div className="text-xl sm:text-2xl font-black digital-number text-[#7C5A87] mt-0.5">
              +{Math.round(stats.totalElevationMeters)} <span className="text-xs text-[#8C827A] font-normal">m</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC]">
            <span className="text-[10px] uppercase font-bold text-[#8C827A] block">แคลอรี่รวม</span>
            <div className="text-xl sm:text-2xl font-black digital-number text-[#C46849] mt-0.5">
              {Math.round(stats.totalCalories)} <span className="text-xs text-[#8C827A] font-normal">kcal</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EDE6DC]">
            <span className="text-[10px] uppercase font-bold text-[#8C827A] block">ไขมันที่เผาผลาญ</span>
            <div className="text-xl sm:text-2xl font-black digital-number text-[#A66E22] mt-0.5">
              {stats.totalFatGrams.toFixed(0)} <span className="text-xs text-[#8C827A] font-normal">กรัม</span>
            </div>
          </div>
        </div>

        {/* Workouts History List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredWorkouts.length === 0 ? (
            <div className="text-center py-12 text-[#8C827A] text-xs">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-[#BDB5AB]" />
              <span>ยังไม่มีประวัติการวิ่ง{selectedUserFilter !== 'all' ? ` ของ ${selectedUserFilter}` : ''}</span>
            </div>
          ) : (
            filteredWorkouts.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-3xl bg-white border border-[#EDE6DC] hover:border-[#52796F] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-cozy-sm"
              >
                {/* Left: Runner Badge + Program & Date */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Runner Avatar Badge */}
                    <span className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-[#FAF7F2] text-[#2C2621] border border-[#EDE6DC] flex items-center gap-1">
                      <span>{w.user_avatar || '🏃‍♀️'}</span>
                      <span>{w.user_name || 'User'}</span>
                    </span>

                    <span className="font-bold text-[#2C2621] text-sm">
                      {w.program_name || 'Free Run'}
                    </span>
                    <span className="text-[11px] text-[#8C827A]">
                      • {new Date(w.created_at).toLocaleDateString('th-TH', {
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
                    {w.user_weight_kg && (
                      <span className="text-slate-500 font-mono">
                        (นน. {w.user_weight_kg}kg | BMI {w.user_bmi})
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedPostcardRecord(w)}
                    className="px-3 py-1.5 rounded-xl bg-[#FDF0EC] hover:bg-[#F9E2DA] text-[#C46849] border border-[#F6D5C9] flex items-center gap-1.5 transition-all cursor-pointer font-bold shadow-cozy-sm active:scale-95 text-xs"
                    title="เปิดดูและบันทึกภาพสตอรี่ IG / โปสการ์ดของรอบวิ่งนี้"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#C46849]" />
                    <span>สตอรี่ IG / การ์ด</span>
                  </button>

                  <button
                    onClick={() => handleDownloadGpx(w)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 transition-colors cursor-pointer text-xs"
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

        {/* Footer: Export Filtered CSV */}
        {filteredWorkouts.length > 0 && (
          <div className="pt-3 border-t border-slate-800 flex justify-between items-center shrink-0">
            <span className="text-xs text-slate-500">
              {selectedUserFilter === 'all' ? 'สถิติการออกกำลังกายทั้งหมด' : `แสดงเฉพาะสถิติของ ${selectedUserFilter}`}
            </span>
            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV (Excel)</span>
            </button>
          </div>
        )}

        {/* Postcard & IG Story Generator Modal */}
        <WorkoutPostcardModal
          isOpen={!!selectedPostcardRecord}
          onClose={() => setSelectedPostcardRecord(null)}
          record={selectedPostcardRecord}
        />
      </div>
    </div>
  );
};
