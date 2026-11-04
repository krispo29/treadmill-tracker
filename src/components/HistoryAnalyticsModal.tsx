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
  Camera,
  ChevronDown,
  UserCheck,
  Pencil,
  Check,
  Terminal
} from 'lucide-react';
import type { WorkoutRecord, DatabaseStats } from '../types/database';
import type { UserProfile } from '../types/treadmill';
import { neonDatabase } from '../services/neonDatabase';
import { formatDuration, calculateAcsmCaloriesPerSecond, calculateFatGramsBurned } from '../services/calculations';
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
  const [editingRunnerWorkoutId, setEditingRunnerWorkoutId] = useState<string | null>(null);
  const [isUpdatingRunner, setIsUpdatingRunner] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);

  // Edit Workout Details State
  const [editingWorkout, setEditingWorkout] = useState<WorkoutRecord | null>(null);
  const [editDurationMin, setEditDurationMin] = useState<number>(0);
  const [editDurationSec, setEditDurationSec] = useState<number>(0);
  const [editDistanceKm, setEditDistanceKm] = useState<string>('0');
  const [editCalories, setEditCalories] = useState<string>('0');
  const [editElevation, setEditElevation] = useState<string>('0');
  const [editFatGrams, setEditFatGrams] = useState<string>('0');
  const [editAvgSpeed, setEditAvgSpeed] = useState<string>('5.0');
  const [editMaxIncline, setEditMaxIncline] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const handleOpenEdit = (w: WorkoutRecord) => {
    setEditingWorkout(w);
    setEditDurationMin(Math.floor(w.duration_seconds / 60));
    setEditDurationSec(w.duration_seconds % 60);
    setEditDistanceKm((w.distance_meters / 1000).toFixed(2));
    setEditCalories(w.calories_burned.toFixed(1));
    setEditElevation(w.elevation_gain_meters.toFixed(1));
    setEditFatGrams(w.fat_grams_burned.toFixed(1));
    setEditAvgSpeed(w.avg_speed_kmh.toFixed(1));
    setEditMaxIncline(w.max_incline || 0);
    setEditNotes(w.notes || '');
  };

  const handleRecalculateEdit = () => {
    if (!editingWorkout) return;
    const totalSec = Math.max(1, editDurationMin * 60 + editDurationSec);
    const speed = parseFloat(editAvgSpeed) || editingWorkout.avg_speed_kmh || 5.0;
    const incline = editingWorkout.avg_incline || editMaxIncline || 0;
    const weight = editingWorkout.user_weight_kg || 70;

    const distMeters = (speed * 1000 / 3600) * totalSec;
    setEditDistanceKm((distMeters / 1000).toFixed(2));

    const elevation = distMeters * (incline / 100);
    setEditElevation(elevation.toFixed(1));

    const calPerSec = calculateAcsmCaloriesPerSecond(speed, incline, weight);
    const cal = calPerSec * totalSec;
    setEditCalories(cal.toFixed(1));

    const fat = calculateFatGramsBurned(cal, speed, incline);
    setEditFatGrams(fat.toFixed(1));
  };

  const handleSaveEdit = async () => {
    if (!editingWorkout) return;
    setIsSavingEdit(true);

    const totalSec = Math.max(1, editDurationMin * 60 + editDurationSec);
    const distMeters = Math.round((parseFloat(editDistanceKm) || 0) * 1000);
    const calories = parseFloat(editCalories) || 0;
    const elevation = parseFloat(editElevation) || 0;
    const fat = parseFloat(editFatGrams) || 0;
    const speed = parseFloat(editAvgSpeed) || 0;

    const updated = await neonDatabase.updateWorkout(editingWorkout.id, {
      duration_seconds: totalSec,
      distance_meters: distMeters,
      calories_burned: calories,
      elevation_gain_meters: elevation,
      fat_grams_burned: fat,
      avg_speed_kmh: speed,
      max_incline: editMaxIncline,
      notes: editNotes,
    });

    if (updated) {
      setWorkouts((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setUpdateSuccessMsg(`✅ อัปเดตสถิติของ ${updated.user_name || 'รอบนี้'} สำเร็จ!`);
      setTimeout(() => setUpdateSuccessMsg(null), 4000);
      setEditingWorkout(null);
    }
    setIsSavingEdit(false);
  };

  const [downloadingLogId, setDownloadingLogId] = useState<string | null>(null);

  const handleDownloadLogs = async (workoutId: string, userName: string) => {
    setDownloadingLogId(workoutId);
    try {
      const logs = await neonDatabase.getDeviceLogs(workoutId);
      if (!logs || logs.length === 0) {
        alert('ยังไม่มีบันทึก Bluetooth Raw Packet Log สำหรับรอบนี้ (ระบบจะเริ่มบันทึกอัตโนมัติตั้งแต่รอบวิ่งถัดไป)');
        return;
      }
      const jsonStr = JSON.stringify(logs, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `treadmill-packet-log-${(userName || 'run').toLowerCase()}-${workoutId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('ไม่สามารถดึงข้อมูล Logs ได้');
    } finally {
      setDownloadingLogId(null);
    }
  };

  const loadWorkouts = async () => {
    setLoading(true);
    const data = await neonDatabase.getWorkouts();
    setWorkouts(data);
    setLoading(false);
  };

  const handleUpdateRunner = async (workoutId: string, newProfile: UserProfile) => {
    setIsUpdatingRunner(true);
    const updated = await neonDatabase.updateWorkoutRunner(workoutId, newProfile, true);
    if (updated) {
      setWorkouts((prev) => prev.map((item) => (item.id === workoutId ? updated : item)));
      setUpdateSuccessMsg(`เปลี่ยนคนวิ่งเป็น ${newProfile.name} และคำนวณแคลอรี่ใหม่เรียบร้อยแล้ว!`);
      setTimeout(() => setUpdateSuccessMsg(null), 4000);
    }
    setIsUpdatingRunner(false);
    setEditingRunnerWorkoutId(null);
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

        {/* Success Alert */}
        {updateSuccessMsg && (
          <div className="mt-3 px-4 py-2 rounded-2xl bg-[#EAF2EC] border border-[#52796F]/30 text-[#3B664E] text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <UserCheck className="w-4 h-4 text-[#52796F] shrink-0" />
            <span>{updateSuccessMsg}</span>
          </div>
        )}

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
                    {/* Runner Avatar Badge with interactive switcher */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setEditingRunnerWorkoutId(editingRunnerWorkoutId === w.id ? null : w.id)}
                        className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-[#FAF7F2] text-[#2C2621] border border-[#EDE6DC] hover:border-[#52796F] hover:bg-[#F3EFE6] flex items-center gap-1.5 transition-all cursor-pointer shadow-cozy-xs group"
                        title="คลิกเพื่อเปลี่ยนคนวิ่งของรอบนี้"
                      >
                        <span>{w.user_avatar || '🏃‍♀️'}</span>
                        <span>{w.user_name || 'User'}</span>
                        <ChevronDown className={`w-3 h-3 text-[#8C827A] group-hover:text-[#52796F] transition-transform ${editingRunnerWorkoutId === w.id ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu to change runner */}
                      {editingRunnerWorkoutId === w.id && (
                        <div className="absolute left-0 top-full mt-1.5 z-40 bg-white border border-[#EDE6DC] rounded-2xl shadow-cozy-lg p-2 min-w-[210px] text-xs">
                          <div className="px-2 py-1 font-bold text-[#8C827A] text-[10px] uppercase border-b border-[#EDE6DC]/60 mb-1">
                            เลือกคนวิ่งของรอบนี้
                          </div>
                          <div className="space-y-1">
                            {profiles.map((p) => {
                              const isCurrent = (w.user_id === p.id) || (w.user_name?.toLowerCase() === p.name.toLowerCase());
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  disabled={isCurrent || isUpdatingRunner}
                                  onClick={() => handleUpdateRunner(w.id, p)}
                                  className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                                    isCurrent
                                      ? 'bg-[#EAF2EC] text-[#52796F] font-bold cursor-default'
                                      : 'hover:bg-[#FAF7F2] text-[#2C2621]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{p.avatar || '🏃‍♂️'}</span>
                                    <span>{p.name} ({p.weightKg}kg)</span>
                                  </div>
                                  {isCurrent ? (
                                    <span className="text-[10px] text-[#52796F] font-medium">ปัจจุบัน</span>
                                  ) : (
                                    <span className="text-[10px] text-[#8C827A]">เลือก</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-1.5 pt-1.5 border-t border-[#EDE6DC]/60 text-[10px] text-[#8C827A] px-1 text-center">
                            * คำนวณแคลอรี่ใหม่ตามน้ำหนักอัตโนมัติ
                          </div>
                        </div>
                      )}
                    </div>

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
                    onClick={() => handleDownloadLogs(w.id, w.user_name || 'user')}
                    disabled={downloadingLogId === w.id}
                    className="p-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EAF2EC] text-[#5A5047] hover:text-[#52796F] border border-[#EDE6DC] transition-colors cursor-pointer disabled:opacity-50"
                    title="ดาวน์โหลด Bluetooth Packet Logs ของรอบนี้ (.json)"
                  >
                    <Terminal className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(w)}
                    className="p-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EAF2EC] text-[#5A5047] hover:text-[#52796F] border border-[#EDE6DC] transition-colors cursor-pointer"
                    title="แก้ไขสถิติรอบนี้ (เวลา, ระยะทาง, แคลอรี่)"
                  >
                    <Pencil className="w-4 h-4" />
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

        {/* Edit Workout Details Modal */}
        {editingWorkout && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-[#FFFDFB] border border-[#EDE6DC] rounded-3xl p-6 shadow-cozy-xl flex flex-col text-[#2C2621] space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#EDE6DC] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#EAF2EC] text-[#52796F]">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#2C2621]">แก้ไขข้อมูลเซสชั่น</h3>
                    <p className="text-xs text-[#8C827A]">
                      {editingWorkout.user_avatar || '🏃‍♂️'} {editingWorkout.user_name || 'User'} • {new Date(editingWorkout.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingWorkout(null)}
                  className="p-1.5 rounded-lg text-[#8C827A] hover:text-[#2C2621] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Input Form */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Duration */}
                <div className="col-span-2 space-y-1">
                  <label className="font-bold text-[#5A5047] flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-[#52796F]" />
                    <span>เวลาเดิน/วิ่ง (นาที : วินาที)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={editDurationMin}
                        onChange={(e) => setEditDurationMin(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-transparent font-mono text-sm font-bold outline-none text-[#2C2621]"
                      />
                      <span className="text-[#8C827A] text-xs ml-1">นาที</span>
                    </div>
                    <span className="font-bold text-lg text-[#8C827A]">:</span>
                    <div className="flex-1 flex items-center bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={editDurationSec}
                        onChange={(e) => setEditDurationSec(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full bg-transparent font-mono text-sm font-bold outline-none text-[#2C2621]"
                      />
                      <span className="text-[#8C827A] text-xs ml-1">วินาที</span>
                    </div>
                  </div>
                </div>

                {/* Distance */}
                <div className="space-y-1">
                  <label className="font-bold text-[#5A5047] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ระยะทาง (กม.)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editDistanceKm}
                    onChange={(e) => setEditDistanceKm(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-3 py-2 font-mono text-sm font-bold outline-none text-[#2C2621]"
                  />
                </div>

                {/* Avg Speed */}
                <div className="space-y-1">
                  <label className="font-bold text-[#5A5047] flex items-center gap-1">
                    <span>ความเร็วเฉลี่ย (km/h)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editAvgSpeed}
                    onChange={(e) => setEditAvgSpeed(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-3 py-2 font-mono text-sm font-bold outline-none text-[#2C2621]"
                  />
                </div>

                {/* Calories */}
                <div className="space-y-1">
                  <label className="font-bold text-[#5A5047] flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span>แคลอรี่ (kcal)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editCalories}
                    onChange={(e) => setEditCalories(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-3 py-2 font-mono text-sm font-bold outline-none text-[#2C2621]"
                  />
                </div>

                {/* Elevation */}
                <div className="space-y-1">
                  <label className="font-bold text-[#5A5047] flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5 text-indigo-500" />
                    <span>ความชันสะสม (+m)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editElevation}
                    onChange={(e) => setEditElevation(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-3 py-2 font-mono text-sm font-bold outline-none text-[#2C2621]"
                  />
                </div>

                {/* Fat Burned */}
                <div className="space-y-1">
                  <label className="font-bold text-[#5A5047] flex items-center gap-1">
                    <span>🔥 ไขมันที่เผาผลาญ (g)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editFatGrams}
                    onChange={(e) => setEditFatGrams(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-3 py-2 font-mono text-sm font-bold outline-none text-[#2C2621]"
                  />
                </div>

                {/* Max Incline */}
                <div className="space-y-1">
                  <label className="font-bold text-[#5A5047] flex items-center gap-1">
                    <span>ความชันสูงสุด (Level)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editMaxIncline}
                    onChange={(e) => setEditMaxIncline(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-3 py-2 font-mono text-sm font-bold outline-none text-[#2C2621]"
                  />
                </div>

                {/* Recalculate helper button */}
                <div className="col-span-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRecalculateEdit}
                    className="w-full py-2 px-3 rounded-xl bg-[#EAF2EC] hover:bg-[#D9E9DD] text-[#3B664E] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#52796F]/30"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>คำนวณระยะทางและแคลอรี่อัตโนมัติตามเวลา + ความเร็ว</span>
                  </button>
                </div>

                {/* Notes */}
                <div className="col-span-2 space-y-1">
                  <label className="font-bold text-[#5A5047]">บันทึกเพิ่มเติม (Notes)</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="เช่น ปรับแก้เวลาเนื่องจากแอปจับไม่ครบรอบ..."
                    className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-xl px-3 py-2 text-xs outline-none text-[#2C2621] resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EDE6DC]">
                <button
                  type="button"
                  onClick={() => setEditingWorkout(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3EFE6] text-[#5A5047] font-semibold text-xs border border-[#EDE6DC] transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-[#52796F] hover:bg-[#43645B] text-white font-bold text-xs flex items-center gap-1.5 shadow-cozy-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
