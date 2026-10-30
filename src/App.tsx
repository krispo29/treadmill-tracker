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
import { ScenicJourneyModal } from './components/ScenicJourneyModal';
import { WorkoutRecapModal } from './components/WorkoutRecapModal';

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
  const [isScenicModalOpen, setIsScenicModalOpen] = useState(false);
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);
  const [latestSavedRecord, setLatestSavedRecord] = useState<WorkoutRecord | null>(null);
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
  const wasRunningRef = useRef<boolean>(false);
  const autoSaveDebounceRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);
  const hasSavedCurrentSessionRef = useRef<boolean>(false);

  // Multi-Profile Management (100% Neon Database Driven - Zero Hardcode)
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    return localStorage.getItem('treadmill_active_profile_id') || 'p_runner1';
  });

  // Active workout goal (100% Neon Database Driven)
  const [goal, setGoal] = useState<WorkoutGoal>({
    type: 'distance',
    target: 5.0,
    title: 'วิ่งระยะทาง 5.0 km'
  });

  // Load all Profiles from Neon PostgreSQL
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const dbProfiles = await neonDatabase.getProfiles();
        if (dbProfiles && dbProfiles.length > 0) {
          setProfiles(dbProfiles);
          const savedActiveId = localStorage.getItem('treadmill_active_profile_id');
          if (savedActiveId && dbProfiles.some(p => p.id === savedActiveId)) {
            setActiveProfileId(savedActiveId);
          } else {
            setActiveProfileId(dbProfiles[0].id);
            localStorage.setItem('treadmill_active_profile_id', dbProfiles[0].id);
          }
        }
      } catch (err) {
        console.error('Neon getProfiles error:', err);
      }
    };
    fetchProfiles();
  }, []);

  const activeProfile: UserProfile = profiles.find(p => p.id === activeProfileId) || profiles[0] || {
    id: 'p_runner1',
    name: 'Runner',
    avatar: '🏃‍♂️',
    weightKg: 70,
    heightCm: 170,
    age: 28,
    gender: 'male',
    defaultStartSpeed: 3.0,
    favoriteSpeeds: [3.0, 5.0, 7.0, 9.0],
    favoriteInclines: [0, 2, 4, 6]
  };

  // Load active runner's personal goal from Neon Database
  useEffect(() => {
    if (!activeProfile.id) return;
    const fetchGoal = async () => {
      try {
        const dbGoal = await neonDatabase.getGoal(activeProfile.id);
        if (dbGoal) {
          setGoal(dbGoal);
        }
      } catch (err) {
        console.warn('Neon getGoal error:', err);
      }
    };
    fetchGoal();
  }, [activeProfile.id]);

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

  const saveSessionRef = useRef<(reason?: string, isManual?: boolean) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    bluetoothService.setCallbacks(
      (newMetrics) => {
        setMetrics(newMetrics);
        if (newMetrics.speedKmh > maxSpeedRef.current) maxSpeedRef.current = newMetrics.speedKmh;
        if (newMetrics.inclineLevel > maxInclineRef.current) maxInclineRef.current = newMetrics.inclineLevel;

        // Auto-detect when belt stops running (Phase 3)
        if (newMetrics.speedKmh > 0.5) {
          wasRunningRef.current = true;
          autoSaveDebounceRef.current = false;
          hasSavedCurrentSessionRef.current = false;
        } else if (newMetrics.speedKmh <= 0.05 && wasRunningRef.current) {
          wasRunningRef.current = false;
          if (!hasSavedCurrentSessionRef.current && !autoSaveDebounceRef.current && (newMetrics.elapsedSeconds >= 15 || newMetrics.distanceMeters >= 30)) {
            autoSaveDebounceRef.current = true;
            saveSessionRef.current('วิ่งจบเซสชั่น (Auto-saved)');
          }
        }
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

  const resetAfterWorkout = () => {
    bluetoothService.resetSession();
    setTelemetry([]);
    maxSpeedRef.current = 0;
    maxInclineRef.current = 0;
    wasRunningRef.current = false;
    autoSaveDebounceRef.current = false;
    isSavingRef.current = false;
    hasSavedCurrentSessionRef.current = false;
    if (workoutState.program) {
      setWorkoutState((prev) => ({ ...prev, program: null, currentStepIndex: 0, stepElapsedSeconds: 0 }));
    }
  };

  const handleResetSession = () => {
    if (window.confirm('คุณต้องการรีเซ็ตสถิติรอบนี้ใช่หรือไม่?')) {
      resetAfterWorkout();
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

  const handleUpdateActiveFavorites = async (newFavorites: number[]) => {
    const updatedProfile = { ...activeProfile, favoriteSpeeds: newFavorites };
    await handleSaveProfile(updatedProfile);
    setSaveSuccessMsg(`⭐ บันทึกลง Neon: สปีดโปรดของ ${activeProfile.name} (${newFavorites.map(s => s.toFixed(1)).join(', ')} km/h)`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSaveProfile = async (p: UserProfile) => {
    await neonDatabase.saveProfile(p);
    const updated = await neonDatabase.getProfiles();
    setProfiles(updated);
  };

  const handleDeleteProfile = async (id: string) => {
    await neonDatabase.deleteProfile(id);
    const updated = await neonDatabase.getProfiles();
    setProfiles(updated);
    if (activeProfileId === id && updated.length > 0) {
      handleSelectProfile(updated[0].id);
    }
  };

  const handleSaveGoal = async (newGoal: WorkoutGoal) => {
    setGoal(newGoal);
    if (activeProfile.id) {
      await neonDatabase.saveGoal(activeProfile.id, newGoal);
    }
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
    // Auto-save session immediately when stopping belt (if not already saved)
    if (!hasSavedCurrentSessionRef.current && (metrics.elapsedSeconds >= 10 || metrics.distanceMeters >= 20)) {
      await saveSessionRecord('วิ่งจบเซสชั่น (Auto-saved)');
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
    // Prevent duplicate saves: block concurrent or repeated saves for the same workout session
    if (isSavingRef.current) return;
    if (!isManual && hasSavedCurrentSessionRef.current) return;

    if (metrics.elapsedSeconds < 10 && metrics.distanceMeters < 20) {
      if (isManual) {
        alert('เวลาในการวิ่งสั้นเกินไป (ต้องมากกว่า 10 วินาที)');
      }
      return;
    }

    isSavingRef.current = true;
    hasSavedCurrentSessionRef.current = true;
    autoSaveDebounceRef.current = true;
    setIsSaving(true);

    try {
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

      // Open Post-Workout Reward Celebration Recap Modal (Phase 3)
      setLatestSavedRecord(record);
      setIsRecapModalOpen(true);
      setIsGiantHudOpen(false); // Close giant HUD so recap modal takes full focus
      setIsScenicModalOpen(false);

      const distKm = (metrics.distanceMeters / 1000).toFixed(2);
      const timeFormatted = formatDuration(metrics.elapsedSeconds);
      const kcal = Math.round(metrics.caloriesBurned);
      const successText = `✅ บันทึกอัตโนมัติเรียบร้อย! (${activeProfile.name}: ${distKm} km | ${timeFormatted} | ${kcal} kcal)`;

      setSaveSuccessMsg(successText);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Failed to save workout session:', err);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  saveSessionRef.current = saveSessionRecord;

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
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2621] flex flex-col selection:bg-[#52796F] selection:text-white pb-24">
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
        onOpenScenicView={() => setIsScenicModalOpen(true)}
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
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8C827A] bg-white rounded-2xl px-4 py-2.5 border border-[#EDE6DC] shadow-cozy-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#EAF2EC] hover:bg-[#DCEAE0] text-[#3B664E] border border-[#CDE0D3] transition-colors font-bold cursor-pointer"
            >
              <span>{activeProfile.avatar || '🏃‍♀️'}</span>
              <span>กำลังวิ่ง: {activeProfile.name}</span>
            </button>
            <span className="hidden sm:inline text-[#D7CEC3]">|</span>
            <div className="hidden sm:flex items-center gap-1.5">
              <Tablet className="w-4 h-4 text-[#8C827A]" />
              <span className="text-[#5A5047] font-medium">
                {compactMode ? 'Split View' : 'Full Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Workout Button */}
            <button
              onClick={handleManualSaveWorkout}
              disabled={isSaving || metrics.elapsedSeconds < 5}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#EAF2EC] hover:bg-[#DCEAE0] text-[#3B664E] border border-[#CDE0D3] transition-all font-semibold cursor-pointer active:scale-95 disabled:opacity-40 shadow-cozy-sm"
              title={`บันทึกผลการวิ่งของ ${activeProfile.name} ขึ้น Neon Database`}
            >
              <Save className="w-3.5 h-3.5 text-[#52796F]" />
              <span>{isSaving ? 'กำลังบันทึก...' : `บันทึกเซสชั่นของ ${activeProfile.name}`}</span>
            </button>

            <button
              onClick={() => setCompactMode(!compactMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F3EFE6] text-[#5A5047] border border-[#EDE6DC] transition-colors cursor-pointer"
            >
              {compactMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Columns className="w-3.5 h-3.5" />}
              <span>{compactMode ? 'เต็มจอ' : 'จอแคบ'}</span>
            </button>
          </div>
        </div>

        {/* Household Multi-Profile Quick Switcher (Phase 2) */}
        <div className="rounded-3xl bg-white border border-[#EDE6DC] p-4 text-xs space-y-2.5 shadow-cozy">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#2C2621] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#52796F]" />
              <span>👥 สลับคนวิ่งในบ้าน (Household Runners):</span>
            </span>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="text-xs text-[#52796F] font-bold hover:underline cursor-pointer flex items-center gap-1"
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
                  className={`px-3.5 py-2 rounded-2xl font-bold flex items-center gap-2 transition-all cursor-pointer border active:scale-95 shadow-cozy-sm ${
                    isSelected
                      ? 'bg-[#52796F] text-white border-[#52796F]'
                      : 'bg-[#FAF7F2] text-[#5A5047] border-[#EDE6DC] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <span className="text-base leading-none">{p.avatar || '🏃‍♀️'}</span>
                  <span className="text-sm">{p.name}</span>
                  <span className={`text-[11px] font-mono ${isSelected ? 'text-white/90' : 'text-[#8C827A]'}`}>
                    ({p.weightKg}kg)
                  </span>
                  {p.favoriteSpeeds && p.favoriteSpeeds.length > 0 && (
                    <span className={`text-[10px] font-mono hidden md:inline ml-1 px-1.5 py-0.5 rounded-lg ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#FDF6EA] text-[#A66E22] border border-[#F0DFBE]'
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
          <div className="rounded-2xl p-3 bg-[#EAF2EC] border border-[#CDE0D3] text-[#3B664E] text-xs flex items-center justify-between gap-2 shadow-cozy-sm animate-fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#52796F]" />
              <span>{saveSuccessMsg}</span>
            </span>
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="text-xs font-bold underline hover:text-[#2C2621] cursor-pointer"
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

      {/* Floating 1-Tap Giant HUD & Scenic View Launcher Buttons */}
      {!isGiantHudOpen && !isScenicModalOpen && (
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2">
          {/* Scenic View Launcher */}
          <button
            onClick={() => setIsScenicModalOpen(true)}
            className="px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl bg-[#C46849] hover:bg-[#B3593B] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-cozy-lg border border-[#E8A58D] cursor-pointer active:scale-95 transition-all"
            title="เปิดวิววิ่งธรรมชาติสุดชิลล์ ดูเพลินๆ"
          >
            <span className="text-base leading-none">🌸</span>
            <span>วิววิ่งเพลินๆ</span>
          </button>

          {/* Giant HUD Launcher */}
          <button
            onClick={() => setIsGiantHudOpen(true)}
            className="px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl bg-[#52796F] hover:bg-[#43675E] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-cozy-lg border border-[#A8CCA8] cursor-pointer active:scale-95 transition-all"
            title="เปิดหน้าจอวิ่งขนาดยักษ์ มองชัด 1 เมตร"
          >
            <Maximize2 className="w-4 h-4" />
            <span>📺 จอวิ่งยักษ์</span>
          </button>
        </div>
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
        onOpenScenicView={() => setIsScenicModalOpen(true)}
        deviceName={deviceName}
      />

      {/* Scenic Animated Journey View (Interactive Scenic Run with Avatar & Companions) */}
      <ScenicJourneyModal
        isOpen={isScenicModalOpen}
        onClose={() => setIsScenicModalOpen(false)}
        metrics={metrics}
        activeProfile={activeProfile}
        onSetSpeed={handleSetSpeed}
        onSetIncline={handleSetIncline}
        onStart={handleStartTreadmill}
        onStop={handleStopTreadmill}
        onOpenGiantHud={() => setIsGiantHudOpen(true)}
        deviceName={deviceName}
      />

      {/* Post-Workout Reward Celebration Recap Card (Phase 3) */}
      <WorkoutRecapModal
        isOpen={isRecapModalOpen}
        record={latestSavedRecord}
        onClose={() => {
          setIsRecapModalOpen(false);
          resetAfterWorkout();
        }}
        onViewHistory={() => {
          setIsRecapModalOpen(false);
          setIsHistoryModalOpen(true);
        }}
      />

      {/* Bluetooth Error / Permission Guide Modal */}
      {bluetoothError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#FFFDFB] border border-[#EDE6DC] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-cozy-lg text-[#2C2621] relative">
            <button
              onClick={() => setBluetoothError(null)}
              className="absolute top-5 right-5 text-[#8C827A] hover:text-[#2C2621] p-1.5 rounded-xl hover:bg-[#FAF7F2] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FDF0EC] border border-[#F6D5C9] flex items-center justify-center text-[#C46849] shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 pr-6">
                <h3 className="text-lg font-bold text-[#2C2621] mb-1">
                  {bluetoothError.title}
                </h3>
                <p className="text-xs text-[#8C827A] leading-relaxed mb-4">
                  {bluetoothError.message}
                </p>
              </div>
            </div>

            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#EDE6DC] space-y-3 mb-5 text-xs text-[#5A5047]">
              <div className="font-mono text-[#B94A4A] bg-[#FDF0F0] border border-[#F4CECE] p-2.5 rounded-xl break-words">
                {bluetoothError.message}
              </div>

              <div className="font-bold text-[#52796F] flex items-center gap-1.5 pt-1">
                <span>💡 รายการตรวจสอบแนะนำ:</span>
              </div>
              <ul className="list-disc list-inside space-y-1.5 leading-relaxed text-[#5A5047]">
                <li>เปิดสวิตช์เครื่องลู่วิ่งให้หน้าจอติด</li>
                <li>เปิดบลูทูธหลักของ iPad (ใน Control Center หรือ การตั้งค่า &gt; บลูทูธ)</li>
                <li>หากใน <strong>การตั้งค่า &gt; บลูทูธ</strong> มีชื่อ <code className="text-[#2C2621] font-bold">FS-01BD59-A</code> เชื่อมต่ออยู่ ให้กดปุ่มตัว (i) สีฟ้า แล้วเลือก <strong>"ลืมอุปกรณ์นี้ (Forget This Device)"</strong></li>
                <li>ปิดแอป FitShow ในมือถือเครื่องอื่นให้สนิท</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBluetoothError(null)}
                className="flex-1 py-2.5 px-4 rounded-2xl text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F3EFE6] text-[#5A5047] border border-[#EDE6DC] transition-colors"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={() => {
                  setBluetoothError(null);
                  handleConnect();
                }}
                className="flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold bg-[#52796F] hover:bg-[#43675E] text-white flex items-center justify-center gap-2 transition-all shadow-cozy-sm active:scale-95"
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
