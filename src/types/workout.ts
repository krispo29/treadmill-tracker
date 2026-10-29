export type StepType = 'warmup' | 'work' | 'rest' | 'cooldown';

export interface WorkoutStep {
  id: string;
  name: string;
  durationSeconds: number;
  targetSpeed: number;    // 0.0 - 16.0 km/h
  targetIncline: number;  // 0 - 20 levels
  type: StepType;
  instructions?: string;
}

export interface WorkoutProgram {
  id: string;
  title: string;
  subtitle: string;
  category: 'fat_burn' | 'climb' | 'hiit' | 'endurance' | 'custom';
  description: string;
  totalDurationSeconds: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  targetZone: string;
  steps: WorkoutStep[];
  badge: string;
}

export interface WorkoutState {
  program: WorkoutProgram | null;
  currentStepIndex: number;
  stepElapsedSeconds: number;
  totalElapsedSeconds: number;
  isPaused: boolean;
  autoControlEnabled: boolean;
  voiceEnabled: boolean;
  soundEnabled: boolean;
  language: 'th-TH' | 'en-US';
}
