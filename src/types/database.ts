export interface WorkoutRecord {
  id: string;
  created_at: string;
  program_name: string;
  duration_seconds: number;
  distance_meters: number;
  calories_burned: number;
  elevation_gain_meters: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  avg_incline: number;
  max_incline: number;
  fat_grams_burned: number;
  // Multi-Profile Tagging (No sign-up required)
  user_id?: string;
  user_name?: string;
  user_avatar?: string;
  // User Profile & Body Metrics at workout time
  user_weight_kg?: number;
  user_height_cm?: number;
  user_age?: number;
  user_gender?: string;
  user_bmi?: number;
  notes?: string;
}

export interface DatabaseStats {
  totalWorkouts: number;
  totalDistanceKm: number;
  totalElevationMeters: number;
  totalCalories: number;
  totalFatGrams: number;
  totalDurationSeconds: number;
}
