import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer, 
  MapPin, 
  Flame, 
  Mountain, 
  Maximize2, 
  Columns, 
  Tablet,
  Save,
  Check,
  Users,
  AlertTriangle,
  X,
  RotateCcw
} from 'lucide-react';
import type { 
  BluetoothProtocol, 
  ConnectionStatus, 
  PacketLog, 
  TelemetryPoint, 
  TreadmillMetrics, 
  WorkoutGoal,
  UserProfile
} from './types/treadmill';
import type { WorkoutProgram, WorkoutState, WorkoutStep } from './types/workout';
import type { WorkoutRecord } from './types/database';
import { bluetoothService } from './services/bluetooth';
import { audioCoach } from './services/audioCoach';
import { neonDatabase } from './services/neonDatabase';
import { formatDuration } from './services/calculations';
import { Header } from './components/Header';
import { MetricCard } from './components/MetricCard';
import { InclineVisualizer } from './components/InclineVisualizer';
import { SpeedVisualizer } from './components/SpeedVisualizer';
import { ElevationBanner } from './components/ElevationBanner';
import { LiveWorkoutChart } from './components/LiveWorkoutChart';
import { GoalTrackerCard } from './components/GoalTrackerCard';
import { QuickControls } from './components/QuickControls';
import { FatBurnCard } from './components/FatBurnCard';
import { GoalSettingsModal } from './components/GoalSettingsModal';
import { WorkoutActiveBanner } from './components/WorkoutActiveBanner';
import { WorkoutProgramsModal } from './components/WorkoutProgramsModal';
import { HistoryAnalyticsModal } from './components/HistoryAnalyticsModal';
import { NeonSettingsModal } from './components/NeonSettingsModal';
import { ProfileManagerModal } from './components/ProfileManagerModal';
import { DiagnosticDrawer } from './components/DiagnosticDrawer';
import { GiantRunningHud } from './components/GiantRunningHud';

const DEFAULT_PROFILES: UserProfile[] = [
  { 
    id: 'p_runner1', 
    name: 'Mike', 
    avatar: '🏃‍♂️', 
    weightKg: 70, 
    heightCm: 175, 
    age: 28, 
    gender: 'male',
    defaultStartSpeed: 3.5,
    favoriteSpeeds: [3.5, 6.5, 8.5, 10.5],
    favoriteInclines: [0, 2, 4, 8],
  },
  { 
    id: 'p_runner2', 
    name: 'Joy', 
    avatar: '🏃‍♀️', 
    weightKg: 54, 
    heightCm: 162, 
    age: 26, 
    gender: 'female',
    defaultStartSpeed: 3.0,
    favoriteSpeeds: [3.0, 4.5, 5.5, 7.0],
    favoriteInclines: [0, 2, 5, 12],
  },
  { 
    id: 'p_runner3', 
    name: 'Dad', 
    avatar: '🦁', 
    weightKg: 75, 
    heightCm: 170, 
    age: 58, 
    gender: 'male',
    defaultStartSpeed: 2.5,
    favoriteSpeeds: [2.5, 3.2, 4.0, 4.8],
    favoriteInclines: [0, 1, 3, 5],
  },
];

// Helper to ensure saved profiles have favorite speeds migrated
const ensureProfileFavorites = (p: UserProfile): UserProfile => {
  if (p.favoriteSpeeds && p.favoriteSpeeds.length > 0 && p.defaultStartSpeed) {
    return p;
  }
  const nameLower = p.name.toLowerCase();
  if (nameLower === 'mike') {
    return {
      ...p,
      defaultStartSpeed: p.defaultStartSpeed ?? 3.5,
      favoriteSpeeds: p.favoriteSpeeds?.length ? p.favoriteSpeeds : [3.5, 6.5, 8.5, 10.5],
      favoriteInclines: p.favoriteInclines?.length ? p.favoriteInclines : [0, 2, 4, 8],
    };
  }
  if (nameLower === 'joy') {
    return {
      ...p,
      defaultStartSpeed: p.defaultStartSpeed ?? 3.0,
      favoriteSpeeds: p.favoriteSpeeds?.length ? p.favoriteSpeeds : [3.0, 4.5, 5.5, 7.0],
      favoriteInclines: p.favoriteInclines?.length ? p.favoriteInclines : [0, 2, 5, 12],
    };
  }
  if (nameLower === 'dad' || p.name.includes('พ่อ')) {
    return {
      ...p,
      defaultStartSpeed: p.defaultStartSpeed ?? 2.5,
      favoriteSpeeds: p.favoriteSpeeds?.length ? p.favoriteSpeeds : [2.5, 3.2, 4.0, 4.8],
      favoriteInclines: p.favoriteInclines?.length ? p.favoriteInclines : [0, 1, 3, 5],
    };
  }
  return {
    ...p,
    defaultStartSpeed: p.defaultStartSpeed ?? 3.0,
    favoriteSpeeds: p.favoriteSpeeds?.length ? p.favoriteSpeeds : [3.0, 5.0, 7.0, 9.0],
    favoriteInclines: p.favoriteInclines?.length ? p.favoriteInclines : [0, 2, 4, 6],
  };
};

export const App: React.FC = () => {
  const [metrics, setMetrics] = useState<TreadmillMetrics>({
    speedKmh: 0,
    inclineLevel: 0,
    distanceMeters: 0,
    elapsedSeconds: 0,
    caloriesBurned: 0,
    elevationGainMeters: 0,
    currentPaceSecPerKm: 0,
    fatGramsBurned: 0,
  });

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [protocol, setProtocol] = useState<BluetoothProtocol>('Unknown');
  const [deviceName, setDeviceName] = useState<string>('');
  const [logs, setLogs] = useState<PacketLog[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isWorkoutsModalOpen, setIsWorkoutsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isNeonModalOpen, setIsNeonModalOpen] = useState(false);
  const [isGiantHudOpen, setIsGiantHudOpen] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [bluetoothError, setBluetoothError] = useState<{
    code: string;
    title: string;
    message: string;
  } | null>(null);

  // Peak tracking for stats
  const maxSpeedRef = useRef<number>(0);
  const maxInclineRef = useRef<number>(0);

  // Multi-Profile Management (No login required)
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('treadmill_multi_profiles');
    if (saved) {
      try {
        const parsed: UserProfile[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(ensureProfileFavorites);
        }
      } catch {}
    }
    return DEFAULT_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    const savedId = localStorage.getItem('treadmill_active_profile_id');
    return savedId || 'p_runner1';
  });

  const activeProfile: UserProfile = profiles.find(p => p.id === activeProfileId) || profiles[0] || DEFAULT_PROFILES[0];

  // Active workout goal stored in localStorage
  const [goal, setGoal] = useState<WorkoutGoal>(() => {
    const saved = localStorage.getItem('treadmill_workout_goal');
    return saved
      ? JSON.parse(saved)
      : { type: 'distance', target: 5.0, title: 'วิ่งระยะทาง 5.0 km' };
  });

  // Workout Execution Engine State
  const [workoutState, setWorkoutState] = useState<WorkoutState>({
    program: null,
    currentStepIndex: 0,
    stepElapsedSeconds: 0,
    totalElapsedSeconds: 0,
    isPaused: false,
    autoControlEnabled: true,
    voiceEnabled: true,
    soundEnabled: true,
    language: 'th-TH',
  });

  const workoutStateRef = useRef(workoutState);
  workoutStateRef.current = workoutState;

  // Sync weight whenever active profile changes
  useEffect(() => {
    bluetoothService.setUserWeight(activeProfile.weightKg);
  }, [activeProfile.weightKg]);

  useEffect(() => {
    audioCoach.setPreferences(
      workoutState.soundEnabled,
      workoutState.voiceEnabled,
      workoutState.language
    );
  }, [workoutState.soundEnabled, workoutState.voiceEnabled, workoutState.language]);

  useEffect(() => {
    bluetoothService.setCallbacks(
      (newMetrics) => {
        setMetrics(newMetrics);
        if (newMetrics.speedKmh > maxSpeedRef.current) maxSpeedRef.current = newMetrics.speedKmh;
        if (newMetrics.inclineLevel > maxInclineRef.current) maxInclineRef.current = newMetrics.inclineLevel;
      },
      (newStatus, newProtocol, name) => {
        setStatus(newStatus);
        setProtocol(newProtocol);
        if (name) setDeviceName(name);
      },
      (log) => {
        setLogs((prev) => [...prev.slice(-199), log]); // Keep last 200 logs
      },
      (point) => {
        setTelemetry((prev) => [...prev.slice(-150), point]); // Keep last 150 points for chart
      }
    );
  }, []);

  // Workout Step Timer (Runs every 1 second when workout is active and belt is running)
  useEffect(() => {
    const timer = setInterval(() => {
      const state = workoutStateRef.current;
      if (!state.program || state.isPaused) return;

      const currentStep: WorkoutStep | undefined = state.program.steps[state.currentStepIndex];
      if (!currentStep) return;

      const newStepElapsed = state.stepElapsedSeconds + 1;
      const remainingSeconds = currentStep.durationSeconds - newStepElapsed;

      // 10s warning voice announcement
      if (remainingSeconds === 10) {
        const nextStep = state.program.steps[state.currentStepIndex + 1];
        if (nextStep) {
          audioCoach.announceUpcoming(10, nextStep.targetSpeed, nextStep.targetIncline);
        }
      }

      // 3, 2, 1 countdown electronic beeps
      if (remainingSeconds > 0 && remainingSeconds <= 3) {
        audioCoach.playCountdownBeep(remainingSeconds);
      }

      // Check if step completed
      if (newStepElapsed >= currentStep.durationSeconds) {
        const nextIndex = state.currentStepIndex + 1;
        if (nextIndex < state.program.steps.length) {
          const nextStep = state.program.steps[nextIndex];
          audioCoach.playIntervalChangeBeep();
          audioCoach.announceInterval(nextStep.name, nextStep.targetSpeed, nextStep.targetIncline);

          if (state.autoControlEnabled) {
            bluetoothService.setSpeed(nextStep.targetSpeed);
            bluetoothService.setIncline(nextStep.targetIncline);
          }

          setWorkoutState((prev) => ({
            ...prev,
            currentStepIndex: nextIndex,
            stepElapsedSeconds: 0,
            totalElapsedSeconds: prev.totalElapsedSeconds + 1,
          }));
        } else {
          audioCoach.playWorkoutCompleteSound();
          audioCoach.announceCompletion();
          handleAutoSaveWorkout();
          setWorkoutState((prev) => ({
            ...prev,
            program: null,
            currentStepIndex: 0,
            stepElapsedSeconds: 0,
          }));
        }
      } else {
        setWorkoutState((prev) => ({
          ...prev,
          stepElapsedSeconds: newStepElapsed,
          totalElapsedSeconds: prev.totalElapsedSeconds + 1,
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleConnect = async () => {
    setBluetoothError(null);
    try {
      await bluetoothService.connect();
    } catch (err: any) {
      console.error('Connection failed:', err);
      const msg = String(err?.message || err || '');
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('ยกเลิก')) {
        return; // User dismissed device picker
      }
      setBluetoothError({
        code: 'BLUETOOTH_ERROR',
        title: 'ไม่สามารถเชื่อมต่อบลูทูธได้',
        message: msg
      });
    }
  };

  const handleDisconnect = () => {
    bluetoothService.disconnect();
    setIsSimulating(false);
  };

  const handleToggleSimulation = () => {
    if (isSimulating) {
      bluetoothService.stopSimulation();
      setIsSimulating(false);
    } else {
      bluetoothService.startSimulation();
      setIsSimulating(true);
    }
  };

  const handleResetSession = () => {
    if (window.confirm('คุณต้องการรีเซ็ตสถิติรอบนี้ใช่หรือไม่?')) {
      bluetoothService.resetSession();
      setTelemetry([]);
      maxSpeedRef.current = 0;
      maxInclineRef.current = 0;
      if (workoutState.program) {
        setWorkoutState((prev) => ({ ...prev, currentStepIndex: 0, stepElapsedSeconds: 0 }));
      }
    }
  };

  // Profile actions
  const handleSelectProfile = (id: string) => {
    setActiveProfileId(id);
    localStorage.setItem('treadmill_active_profile_id', id);
    const chosen = profiles.find(p => p.id === id);
    if (chosen) {
      bluetoothService.setUserWeight(chosen.weightKg);
      setSaveSuccessMsg(`🏃 สลับคนวิ่งเป็น ${chosen.name} (${chosen.weightKg}kg) — สปีดโปรด: ${chosen.favoriteSpeeds?.join(', ') || '3, 5, 7, 9'} km/h`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  const handleUpdateActiveFavorites = (newFavorites: number[]) => {
    const updatedProfile = { ...activeProfile, favoriteSpeeds: newFavorites };
    handleSaveProfile(updatedProfile);
    setSaveSuccessMsg(`⭐ บันทึกสปีดโปรดของ ${activeProfile.name} แล้ว (${newFavorites.map(s => s.toFixed(1)).join(', ')} km/h)`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSaveProfile = (p: UserProfile) => {
    const existingIndex = profiles.findIndex(item => item.id === p.id);
    let updated: UserProfile[];
    if (existingIndex >= 0) {
      updated = [...profiles];
      updated[existingIndex] = p;
    } else {
      updated = [...profiles, p];
    }
    setProfiles(updated);
    localStorage.setItem('treadmill_multi_profiles', JSON.stringify(updated));
  };

  const handleDeleteProfile = (id: string) => {
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    localStorage.setItem('treadmill_multi_profiles', JSON.stringify(updated));
    if (activeProfileId === id && updated.length > 0) {
      handleSelectProfile(updated[0].id);
    }
  };

  const handleSaveGoal = (newGoal: WorkoutGoal) => {
    setGoal(newGoal);
    localStorage.setItem('treadmill_workout_goal', JSON.stringify(newGoal));
  };

  const handleSetSpeed = (spd: number) => {
    if (spd === 0) {
      handleStopTreadmill();
    } else {
      bluetoothService.setSpeed(spd);
    }
  };

  const handleSetIncline = (inc: number) => {
    bluetoothService.setIncline(inc);
  };

  const handleStartTreadmill = (spd: number = 3.0) => {
    bluetoothService.startTreadmill(spd);
    setIsGiantHudOpen(true);
  };

  const handleStopTreadmill = async () => {
    await bluetoothService.stopTreadmill();
    // Auto-save session immediately when stopping belt (no need to manually press save)
    if (metrics.elapsedSeconds >= 10 || metrics.distanceMeters >= 20) {
      await saveSessionRecord('หยุดสายพาน (Auto-saved)');
    }
  };

  // Workout Program controls
  const handleStartProgram = (prog: WorkoutProgram) => {
    setWorkoutState({
      program: prog,
      currentStepIndex: 0,
      stepElapsedSeconds: 0,
      totalElapsedSeconds: 0,
      isPaused: false,
      autoControlEnabled: true,
      voiceEnabled: true,
      soundEnabled: true,
      language: workoutState.language,
    });

    const firstStep = prog.steps[0];
    if (firstStep) {
      bluetoothService.setSpeed(firstStep.targetSpeed);
      bluetoothService.setIncline(firstStep.targetIncline);
      audioCoach.playIntervalChangeBeep();
      audioCoach.announceInterval(firstStep.name, firstStep.targetSpeed, firstStep.targetIncline);
    }
  };

  const handleSkipWorkoutStep = () => {
    if (!workoutState.program) return;
    const nextIdx = workoutState.currentStepIndex + 1;
    if (nextIdx < workoutState.program.steps.length) {
      const nextStep = workoutState.program.steps[nextIdx];
      audioCoach.playIntervalChangeBeep();
      audioCoach.announceInterval(nextStep.name, nextStep.targetSpeed, nextStep.targetIncline);
      if (workoutState.autoControlEnabled) {
        bluetoothService.setSpeed(nextStep.targetSpeed);
        bluetoothService.setIncline(nextStep.targetIncline);
      }
      setWorkoutState((prev) => ({
        ...prev,
        currentStepIndex: nextIdx,
        stepElapsedSeconds: 0,
      }));
    } else {
      audioCoach.playWorkoutCompleteSound();
      audioCoach.announceCompletion();
      handleAutoSaveWorkout();
      setWorkoutState((prev) => ({ ...prev, program: null }));
    }
  };

  const handleStopWorkout = () => {
    if (window.confirm('คุณต้องการหยุดโปรแกรมฝึกนี้ใช่หรือไม่?')) {
      setWorkoutState((prev) => ({ ...prev, program: null, currentStepIndex: 0, stepElapsedSeconds: 0 }));
    }
  };

  // Unified Save Workout function (saves to Neon DB tagged with active runner)
  const saveSessionRecord = async (reasonTitle?: string, isManual: boolean = false) => {
    if (metrics.elapsedSeconds < 10 && metrics.distanceMeters < 20) {
      if (isManual) {
        alert('เวลาในการวิ่งสั้นเกินไป (ต้องมากกว่า 10 วินาที)');
      }
      return;
    }

    setIsSaving(true);
    const avgSpeed = metrics.elapsedSeconds > 0
      ? (metrics.distanceMeters / 1000) / (metrics.elapsedSeconds / 3600)
      : metrics.speedKmh;

    const heightM = activeProfile.heightCm / 100;
    const userBmi = heightM > 0 ? Number((activeProfile.weightKg / (heightM * heightM)).toFixed(1)) : undefined;

    const progTitle = workoutState.program?.title || reasonTitle || 'Free Running Session';

    const record: WorkoutRecord = {
      id: `wo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      program_name: progTitle,
      duration_seconds: metrics.elapsedSeconds,
      distance_meters: Math.round(metrics.distanceMeters),
      calories_burned: Number(metrics.caloriesBurned.toFixed(1)),
      elevation_gain_meters: Number(metrics.elevationGainMeters.toFixed(1)),
      avg_speed_kmh: Number(avgSpeed.toFixed(1)),
      max_speed_kmh: Number(Math.max(metrics.speedKmh, maxSpeedRef.current).toFixed(1)),
      avg_incline: metrics.inclineLevel,
      max_incline: Math.max(metrics.inclineLevel, maxInclineRef.current),
      fat_grams_burned: Number(metrics.fatGramsBurned.toFixed(1)),
      user_id: activeProfile.id,
      user_name: activeProfile.name,
      user_avatar: activeProfile.avatar,
      user_weight_kg: activeProfile.weightKg,
      user_height_cm: activeProfile.heightCm,
      user_age: activeProfile.age,
      user_gender: activeProfile.gender,
      user_bmi: userBmi,
    };

    await neonDatabase.saveWorkout(record);
    setIsSaving(false);

    const distKm = (metrics.distanceMeters / 1000).toFixed(2);
    const timeFormatted = formatDuration(metrics.elapsedSeconds);
    const kcal = Math.round(metrics.caloriesBurned);
    const successText = `✅ บันทึกอัตโนมัติเรียบร้อย! (${activeProfile.name}: ${distKm} km | ${timeFormatted} | ${kcal} kcal)`;

    setSaveSuccessMsg(successText);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  const handleManualSaveWorkout = () => {
    saveSessionRecord('Manual Save', true);
  };

  const handleAutoSaveWorkout = () => {
    saveSessionRecord('Completed Program');
  };

  const distanceKm = (metrics.distanceMeters / 1000).toFixed(2);
  const durationStr = formatDuration(metrics.elapsedSeconds);
  const caloriesStr = Math.round(metrics.caloriesBurned).toString();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 pb-20">
      {/* Top Header */}
      <Header
        status={status}
        protocol={protocol}
        deviceName={deviceName}
        isSimulating={isSimulating}
        activeProfile={activeProfile}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onToggleSimulation={handleToggleSimulation}
        onOpenProfileManager={() => setIsProfileModalOpen(true)}
        onOpenWorkouts={() => setIsWorkoutsModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onResetSession={handleResetSession}
        onOpenGiantHud={() => setIsGiantHudOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Active Workout Program Banner */}
        {workoutState.program && (
          <WorkoutActiveBanner
            program={workoutState.program}
            currentStepIndex={workoutState.currentStepIndex}
            stepElapsedSeconds={workoutState.stepElapsedSeconds}
            isPaused={workoutState.isPaused}
            autoControlEnabled={workoutState.autoControlEnabled}
            voiceEnabled={workoutState.voiceEnabled}
            soundEnabled={workoutState.soundEnabled}
            onPauseToggle={() => setWorkoutState((p) => ({ ...p, isPaused: !p.isPaused }))}
            onSkipStep={handleSkipWorkoutStep}
            onStopWorkout={handleStopWorkout}
            onToggleAutoControl={() => setWorkoutState((p) => ({ ...p, autoControlEnabled: !p.autoControlEnabled }))}
            onToggleVoice={() => setWorkoutState((p) => ({ ...p, voiceEnabled: !p.voiceEnabled }))}
            onToggleSound={() => setWorkoutState((p) => ({ ...p, soundEnabled: !p.soundEnabled }))}
          />
        )}

        {/* iPad Split-View Toggle & Quick Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 bg-slate-900/60 rounded-xl px-4 py-2.5 border border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors font-bold cursor-pointer"
            >
              <span>{activeProfile.avatar || '🏃‍♂️'}</span>
              <span>กำลังวิ่ง: {activeProfile.name}</span>
            </button>
            <span className="hidden sm:inline text-slate-500">|</span>
            <div className="hidden sm:flex items-center gap-1.5">
              <Tablet className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 font-medium">
                {compactMode ? 'Split View' : 'Full Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Workout Button */}
            <button
              onClick={handleManualSaveWorkout}
              disabled={isSaving || metrics.elapsedSeconds < 5}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all font-semibold cursor-pointer active:scale-95 disabled:opacity-40"
              title={`บันทึกผลการวิ่งของ ${activeProfile.name} ขึ้น Neon Database`}
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isSaving ? 'กำลังบันทึก...' : `บันทึกเซสชั่นของ ${activeProfile.name}`}</span>
            </button>

            <button
              onClick={() => setCompactMode(!compactMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              {compactMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Columns className="w-3.5 h-3.5" />}
              <span>{compactMode ? 'เต็มจอ' : 'จอแคบ'}</span>
            </button>
          </div>
        </div>

        {/* Household Multi-Profile Quick Switcher (Phase 2) */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-3 sm:p-4 text-xs space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>👥 สลับคนวิ่งในบ้าน (Household Runners):</span>
            </span>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="text-xs text-cyan-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>⚙️ จัดการโปรไฟล์ / สปีดโปรด</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {profiles.map((p) => {
              const isSelected = p.id === activeProfile.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectProfile(p.id)}
                  className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer border active:scale-95 shadow-sm ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base leading-none">{p.avatar || '🏃‍♂️'}</span>
                  <span className="text-sm">{p.name}</span>
                  <span className={`text-[11px] font-mono ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                    ({p.weightKg}kg)
                  </span>
                  {p.favoriteSpeeds && p.favoriteSpeeds.length > 0 && (
                    <span className={`text-[10px] font-mono hidden md:inline ml-1 px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-300'
                    }`}>
                      ⭐ {p.favoriteSpeeds.slice(0, 3).map(s => s.toFixed(1)).join('/')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Confirmation Notification Banner */}
        {saveSuccessMsg && (
          <div className="rounded-xl p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccessMsg}</span>
            </span>
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="text-xs font-bold underline hover:text-white cursor-pointer"
            >
              ดูประวัติ
            </button>
          </div>
        )}

        {/* Goal Tracker Card */}
        <GoalTrackerCard
          metrics={metrics}
          goal={goal}
          onOpenGoalModal={() => setIsGoalModalOpen(true)}
        />

        {/* Primary Gauges: Speed & Incline */}
        <div className={`grid gap-4 ${compactMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          <SpeedVisualizer speedKmh={metrics.speedKmh} />
          <InclineVisualizer inclineLevel={metrics.inclineLevel} />
        </div>

        {/* Quick Touch Controls for iPad with Personal Favorite Speeds (Phase 2) */}
        <QuickControls
          currentSpeed={metrics.speedKmh}
          currentIncline={metrics.inclineLevel}
          onSetSpeed={handleSetSpeed}
          onSetIncline={handleSetIncline}
          onStart={handleStartTreadmill}
          onStop={handleStopTreadmill}
          activeProfile={activeProfile}
          onUpdateFavorites={handleUpdateActiveFavorites}
        />

        {/* Live Workout Telemetry Chart (Speed Area & Incline Line) */}
        <LiveWorkoutChart
          telemetry={telemetry}
          currentSpeed={metrics.speedKmh}
          currentIncline={metrics.inclineLevel}
        />

        {/* Elevation Gain & Landmark Milestones */}
        <ElevationBanner
          elevationMeters={metrics.elevationGainMeters}
        />

        {/* Metrics Grid */}
        <div className={`grid gap-4 ${
          compactMode 
            ? 'grid-cols-2' 
            : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
        }`}>
          {/* Time Duration */}
          <MetricCard
            title="เวลาที่ใช้ (Duration)"
            value={durationStr}
            unit="TIME"
            subtitle="นับเฉพาะตอนสายพานหมุน"
            icon={<Timer className="w-5 h-5" />}
            colorScheme="cyan"
          />

          {/* Distance */}
          <MetricCard
            title="ระยะทาง (Distance)"
            value={distanceKm}
            unit="KM"
            subtitle={`${Math.round(metrics.distanceMeters)} เมตร`}
            icon={<MapPin className="w-5 h-5" />}
            colorScheme="emerald"
          />

          {/* Incline-Adjusted Calories */}
          <MetricCard
            title="แคลอรี่จริง (ACSM Incline)"
            value={caloriesStr}
            unit="KCAL"
            subtitle={`คำนวณตาม นน. ${activeProfile.weightKg} kg ของ ${activeProfile.name}`}
            icon={<Flame className="w-5 h-5" />}
            colorScheme="orange"
            highlight={metrics.inclineLevel >= 10}
          />

          {/* Elevation Climbed */}
          <MetricCard
            title="ความสูงที่ปีนได้"
            value={Math.round(metrics.elevationGainMeters)}
            unit="M"
            subtitle={`ไต่ความชันระดับ ${metrics.inclineLevel}/20`}
            icon={<Mountain className="w-5 h-5" />}
            colorScheme="purple"
          />
        </div>

        {/* Fat Burn Card (Scientific Fat Oxidation) */}
        <FatBurnCard
          fatGrams={metrics.fatGramsBurned}
          inclineLevel={metrics.inclineLevel}
        />

      </main>

      {/* Live Raw Hex Packet Diagnostic Drawer */}
      <DiagnosticDrawer
        logs={logs}
        onClearLogs={() => setLogs([])}
      />

      {/* Multi-Profile Manager Modal */}
      <ProfileManagerModal
        isOpen={isProfileModalOpen}
        profiles={profiles}
        activeProfileId={activeProfile.id}
        onSelectProfile={handleSelectProfile}
        onSaveProfile={handleSaveProfile}
        onDeleteProfile={handleDeleteProfile}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Workout Goal Settings Modal */}
      <GoalSettingsModal
        isOpen={isGoalModalOpen}
        currentGoal={goal}
        onSaveGoal={handleSaveGoal}
        onClose={() => setIsGoalModalOpen(false)}
      />

      {/* Workout Programs Modal */}
      <WorkoutProgramsModal
        isOpen={isWorkoutsModalOpen}
        onSelectProgram={handleStartProgram}
        onClose={() => setIsWorkoutsModalOpen(false)}
        voiceLanguage={workoutState.language}
        onChangeLanguage={(lang) => setWorkoutState((p) => ({ ...p, language: lang }))}
      />

      {/* History & Analytics Modal with Runner Filters */}
      <HistoryAnalyticsModal
        isOpen={isHistoryModalOpen}
        profiles={profiles}
        onClose={() => setIsHistoryModalOpen(false)}
        onOpenNeonSettings={() => setIsNeonModalOpen(true)}
      />

      {/* Neon Database Settings Modal */}
      <NeonSettingsModal
        isOpen={isNeonModalOpen}
        onClose={() => setIsNeonModalOpen(false)}
      />

      {/* Floating 1-Tap Giant HUD Launcher Button */}
      {!isGiantHudOpen && (
        <button
          onClick={() => setIsGiantHudOpen(true)}
          className="fixed bottom-5 right-5 z-30 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2.5 shadow-2xl shadow-cyan-500/30 border border-cyan-300/40 cursor-pointer active:scale-95 transition-all"
          title="เปิดหน้าจอวิ่งขนาดยักษ์ มองชัด 1 เมตร"
        >
          <Maximize2 className="w-4 h-4" />
          <span>📺 จอวิ่งยักษ์ (Giant HUD)</span>
        </button>
      )}

      {/* Giant Running HUD Fullscreen Cockpit with Household Switcher & Favorites (Phase 2) */}
      <GiantRunningHud
        isOpen={isGiantHudOpen}
        onClose={() => setIsGiantHudOpen(false)}
        metrics={metrics}
        activeProfile={activeProfile}
        profiles={profiles}
        onSelectProfile={handleSelectProfile}
        onSetSpeed={handleSetSpeed}
        onSetIncline={handleSetIncline}
        onStart={handleStartTreadmill}
        onStop={handleStopTreadmill}
        deviceName={deviceName}
      />

      {/* Bluetooth Error / Permission Guide Modal */}
      {bluetoothError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-100 relative">
            <button
              onClick={() => setBluetoothError(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 pr-6">
                <h3 className="text-lg font-bold text-white mb-1">
                  {bluetoothError.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {bluetoothError.message}
                </p>
              </div>
            </div>

            <div className="bg-slate-850 rounded-xl p-4 border border-slate-800 space-y-3 mb-5 text-xs text-slate-300">
              <div className="font-mono text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg break-words">
                {bluetoothError.message}
              </div>

              <div className="font-bold text-cyan-400 flex items-center gap-1.5 pt-1">
                <span>💡 รายการตรวจสอบแนะนำ:</span>
              </div>
              <ul className="list-disc list-inside space-y-1.5 leading-relaxed text-slate-200">
                <li>เปิดสวิตช์เครื่องลู่วิ่งให้หน้าจอติด</li>
                <li>เปิดบลูทูธหลักของ iPad (ใน Control Center หรือ การตั้งค่า &gt; บลูทูธ)</li>
                <li>หากใน <strong>การตั้งค่า &gt; บลูทูธ</strong> มีชื่อ <code className="text-white">FS-01BD59-A</code> เชื่อมต่ออยู่ ให้กดปุ่มตัว (i) สีฟ้า แล้วเลือก <strong>"ลืมอุปกรณ์นี้ (Forget This Device)"</strong></li>
                <li>ปิดแอป FitShow ในมือถือเครื่องอื่นให้สนิท</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBluetoothError(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={() => {
                  setBluetoothError(null);
                  handleConnect();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ลองเชื่อมต่ออีกครั้ง</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
