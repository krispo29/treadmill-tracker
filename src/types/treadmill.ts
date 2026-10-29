export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // Emoji e.g. '🏃‍♂️', '🏃‍♀️', '⚡', '🔥'
  weightKg: number;
  heightCm: number;
  age: number;
  gender: 'male' | 'female' | 'other';
}

export interface UserPhysiology {
  bmi: number;
  bmiCategory: string;
  maxHeartRateBpm: number;
  zone2MinBpm: number;
  zone2MaxBpm: number;
  bmrKcal: number;
}

export type ConnectionStatus = 'disconnected' | 'searching' | 'connecting' | 'connected' | 'error';

export type BluetoothProtocol = 'FTMS' | 'FitShow_FFF0' | 'Simulation' | 'Unknown';

export interface TreadmillMetrics {
  speedKmh: number;          // 0.0 - 16.0 km/h
  inclineLevel: number;      // 0 - 20 levels
  distanceMeters: number;    // cumulative meters
  elapsedSeconds: number;    // active duration
  caloriesBurned: number;    // ACSM Incline-adjusted calories
  elevationGainMeters: number; // Vertical climb in meters
  currentPaceSecPerKm: number; // Seconds per kilometer
  fatGramsBurned: number;    // Pure fat oxidized in grams
  heartRate?: number;        // BPM (if sensor detected)
  cadence?: number;          // Steps per minute
}

export interface TelemetryPoint {
  second: number;
  speed: number;
  incline: number;
}

export type GoalType = 'distance' | 'time' | 'calories' | 'elevation' | 'none';

export interface WorkoutGoal {
  type: GoalType;
  target: number; // in km, minutes, kcal, or meters
  title: string;
}

export interface PacketLog {
  id: string;
  timestamp: string;
  direction: 'RX' | 'TX' | 'SYS';
  protocol: BluetoothProtocol;
  hex: string;
  decodedSummary?: string;
}
