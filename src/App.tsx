import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer, 
  MapPin, 
  Flame, 
  Mountain, 
  Maximize2, 
  Columns, 
  Sparkles,
  Tablet,
  Save,
  Check
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
import { UserProfileModal } from './components/UserProfileModal';
import { DiagnosticDrawer } from './components/DiagnosticDrawer';

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
  const [compactMode, setCompactMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Peak tracking for stats
  const maxSpeedRef = useRef<number>(0);
  const maxInclineRef = useRef<number>(0);

  // Active workout goal stored in localStorage
  const [goal, setGoal] = useState<WorkoutGoal>(() => {
    const saved = localStorage.getItem('treadmill_workout_goal');
    return saved
      ? JSON.parse(saved)
      : { type: 'distance', target: 5.0, title: 'วิ่งระยะทาง 5.0 km' };
  });

  // User Profile (Weight, Height, Age, Gender) stored in localStorage
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('treadmill_user_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    const legacyWeight = localStorage.getItem('treadmill_user_weight');
    return {
      weightKg: legacyWeight ? parseFloat(legacyWeight) : 70,
      heightCm: 175,
      age: 28,
      gender: 'male',
    };
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

  useEffect(() => {
    bluetoothService.setUserWeight(profile.weightKg);
  }, [profile.weightKg]);

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
          // Move to next step
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
    try {
      await bluetoothService.connect();
    } catch (err) {
      console.error(err);
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

  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('treadmill_user_profile', JSON.stringify(newProfile));
    localStorage.setItem('treadmill_user_weight', newProfile.weightKg.toString());
  };

  const handleSaveGoal = (newGoal: WorkoutGoal) => {
    setGoal(newGoal);
    localStorage.setItem('treadmill_workout_goal', JSON.stringify(newGoal));
  };

  const handleSetSpeed = (spd: number) => {
    bluetoothService.setSpeed(spd);
  };

  const handleSetIncline = (inc: number) => {
    bluetoothService.setIncline(inc);
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

  // Save Workout to Neon Postgres including user demographics (Weight, Height, Age, BMI)
  const handleManualSaveWorkout = async () => {
    if (metrics.elapsedSeconds < 10) {
      alert('เวลาในการวิ่งสั้นเกินไป (ต้องมากกว่า 10 วินาที)');
      return;
    }

    setIsSaving(true);
    const avgSpeed = metrics.elapsedSeconds > 0
      ? (metrics.distanceMeters / 1000) / (metrics.elapsedSeconds / 3600)
      : metrics.speedKmh;

    const heightM = profile.heightCm / 100;
    const userBmi = heightM > 0 ? Number((profile.weightKg / (heightM * heightM)).toFixed(1)) : undefined;

    const record: WorkoutRecord = {
      id: `wo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      program_name: workoutState.program?.title || 'Free Running Session',
      duration_seconds: metrics.elapsedSeconds,
      distance_meters: Math.round(metrics.distanceMeters),
      calories_burned: Number(metrics.caloriesBurned.toFixed(1)),
      elevation_gain_meters: Number(metrics.elevationGainMeters.toFixed(1)),
      avg_speed_kmh: Number(avgSpeed.toFixed(1)),
      max_speed_kmh: Number(Math.max(metrics.speedKmh, maxSpeedRef.current).toFixed(1)),
      avg_incline: metrics.inclineLevel,
      max_incline: Math.max(metrics.inclineLevel, maxInclineRef.current),
      fat_grams_burned: Number(metrics.fatGramsBurned.toFixed(1)),
      user_weight_kg: profile.weightKg,
      user_height_cm: profile.heightCm,
      user_age: profile.age,
      user_gender: profile.gender,
      user_bmi: userBmi,
    };

    const res = await neonDatabase.saveWorkout(record);
    setIsSaving(false);
    setSaveSuccessMsg(res.message);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleAutoSaveWorkout = async () => {
    if (metrics.elapsedSeconds >= 10) {
      const avgSpeed = (metrics.distanceMeters / 1000) / (metrics.elapsedSeconds / 3600);
      const heightM = profile.heightCm / 100;
      const userBmi = heightM > 0 ? Number((profile.weightKg / (heightM * heightM)).toFixed(1)) : undefined;

      const record: WorkoutRecord = {
        id: `wo_${Date.now()}`,
        created_at: new Date().toISOString(),
        program_name: workoutState.program?.title || 'Finished Workout',
        duration_seconds: metrics.elapsedSeconds,
        distance_meters: Math.round(metrics.distanceMeters),
        calories_burned: Number(metrics.caloriesBurned.toFixed(1)),
        elevation_gain_meters: Number(metrics.elevationGainMeters.toFixed(1)),
        avg_speed_kmh: Number(avgSpeed.toFixed(1)),
        max_speed_kmh: Number(Math.max(metrics.speedKmh, maxSpeedRef.current).toFixed(1)),
        avg_incline: metrics.inclineLevel,
        max_incline: Math.max(metrics.inclineLevel, maxInclineRef.current),
        fat_grams_burned: Number(metrics.fatGramsBurned.toFixed(1)),
        user_weight_kg: profile.weightKg,
        user_height_cm: profile.heightCm,
        user_age: profile.age,
        user_gender: profile.gender,
        user_bmi: userBmi,
      };
      await neonDatabase.saveWorkout(record);
    }
  };

  // Distance in kilometers
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
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onToggleSimulation={handleToggleSimulation}
        onOpenSettings={() => setIsProfileModalOpen(true)}
        onOpenWorkouts={() => setIsWorkoutsModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onResetSession={handleResetSession}
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
            <Tablet className="w-4 h-4 text-cyan-400" />
            <span>โหมดหน้าจอ iPad:</span>
            <span className="text-slate-200 font-medium">
              {compactMode ? 'โหมดคอลัมน์กระชับ (Split View)' : 'โหมดเต็มหน้าจอ (Full Dashboard)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Workout Button */}
            <button
              onClick={handleManualSaveWorkout}
              disabled={isSaving || metrics.elapsedSeconds < 5}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all font-semibold cursor-pointer active:scale-95 disabled:opacity-40"
              title="บันทึกเซสชั่นนี้พร้อมค่าน้ำหนัก ส่วนสูง อายุ และ BMI ขึ้น Neon Database"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกเซสชั่น (Save to Neon)'}</span>
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

        {/* Quick Touch Controls for iPad */}
        <QuickControls
          currentSpeed={metrics.speedKmh}
          currentIncline={metrics.inclineLevel}
          onSetSpeed={handleSetSpeed}
          onSetIncline={handleSetIncline}
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
            subtitle={`คำนวณตามความชันจริง (นน. ${profile.weightKg} kg, สูง ${profile.heightCm} cm)`}
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

        {/* Quick Instructions & Tips */}
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-4 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>คำแนะนำการใช้งานและวิเคราะห์ข้อมูล:</span>
          </div>
          <p>
            1. <strong>โปรไฟล์สุขภาพ (ปุ่มรูปฟันเฟือง):</strong> กำหนดค่าน้ำหนัก ส่วนสูง อายุ เพื่อคำนวณ <code>BMI</code>, <code>Max Heart Rate</code>, <code>Zone 2 Target HR</code> และ <code>BMR</code>
          </p>
          <p>
            2. <strong>บันทึกขึ้น Neon:</strong> ทุกครั้งที่กดบันทึก ข้อมูลร่างกาย ณ ขณะนั้นจะถูกบันทึกคู่กับระยะทางและแคลอรี่ เพื่อดูแนวโน้มการลดน้ำหนักในอนาคตได้
          </p>
        </div>

      </main>

      {/* Live Raw Hex Packet Diagnostic Drawer */}
      <DiagnosticDrawer
        logs={logs}
        onClearLogs={() => setLogs([])}
      />

      {/* User Body Profile Settings Modal (Weight, Height, Age, Gender, BMI) */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        profile={profile}
        onSave={handleSaveProfile}
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

      {/* History & Analytics Modal */}
      <HistoryAnalyticsModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onOpenNeonSettings={() => setIsNeonModalOpen(true)}
      />

      {/* Neon Database Settings Modal */}
      <NeonSettingsModal
        isOpen={isNeonModalOpen}
        onClose={() => setIsNeonModalOpen(false)}
      />
    </div>
  );
};

export default App;
