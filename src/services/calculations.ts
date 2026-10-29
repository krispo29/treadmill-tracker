/**
 * Scientific calculations based on ACSM (American College of Sports Medicine) metabolic equations
 * and Exercise Physiology (Tanaka, Mifflin-St Jeor, WHO/Asian BMI).
 */

import type { TreadmillMetrics, WorkoutGoal, UserProfile, UserPhysiology } from '../types/treadmill';

/**
 * Calculates Caloric burn rate (kcal per minute) taking Incline & Speed into account.
 * 
 * ACSM Walking Formula (Speed <= 6.0 km/h or power hike):
 *   VO2 (ml/kg/min) = (0.1 * S) + (1.8 * S * G) + 3.5
 * 
 * ACSM Running Formula (Speed > 6.0 km/h):
 *   VO2 (ml/kg/min) = (0.2 * S) + (0.9 * S * G) + 3.5
 */
export function calculateAcsmCaloriesPerSecond(
  speedKmh: number,
  inclineLevel: number,
  weightKg: number = 70
): number {
  if (speedKmh <= 0.1) return 0;

  // Convert speed to meters per minute
  const speedMetersPerMin = speedKmh * (1000 / 60);

  // Incline levels 0-20
  const grade = Math.min(inclineLevel, 20) / 100;

  let vo2: number;
  if (speedKmh <= 6.0) {
    // Walking / Power Incline Hike formula
    vo2 = (0.1 * speedMetersPerMin) + (1.8 * speedMetersPerMin * grade) + 3.5;
  } else {
    // Running formula
    vo2 = (0.2 * speedMetersPerMin) + (0.9 * speedMetersPerMin * grade) + 3.5;
  }

  // 1 Liter of O2 consumed ~ 5 kcal
  const kcalPerMinute = (vo2 * weightKg / 1000) * 5.0;
  return kcalPerMinute / 60; // Calories per second
}

/**
 * Calculates complete physiological profile (BMI, Max HR, Zone 2, BMR)
 */
export function calculatePhysiology(profile: UserProfile): UserPhysiology {
  const { weightKg, heightCm, age, gender } = profile;
  
  // BMI
  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? Number((weightKg / (heightM * heightM)).toFixed(1)) : 22.0;
  
  let bmiCategory = 'สมส่วน (Normal)';
  if (bmi < 18.5) bmiCategory = 'น้ำหนักน้อยกว่าเกณฑ์ (Underweight)';
  else if (bmi < 23.0) bmiCategory = 'สมส่วนสุขภาพดี (Normal)';
  else if (bmi < 25.0) bmiCategory = 'น้ำหนักเกินเกณฑ์ (Overweight)';
  else bmiCategory = 'โรคอ้วน (Obese)';

  // Max Heart Rate (Tanaka Equation: 208 - 0.7 * Age)
  const maxHeartRateBpm = Math.round(208 - (0.7 * age));

  // Zone 2 Target Range (60% - 70% of Max HR) - Peak fat oxidation zone
  const zone2MinBpm = Math.round(maxHeartRateBpm * 0.60);
  const zone2MaxBpm = Math.round(maxHeartRateBpm * 0.70);

  // BMR (Mifflin-St Jeor Equation)
  let bmrKcal = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') {
    bmrKcal += 5;
  } else if (gender === 'female') {
    bmrKcal -= 161;
  } else {
    bmrKcal -= 78;
  }

  return {
    bmi,
    bmiCategory,
    maxHeartRateBpm,
    zone2MinBpm,
    zone2MaxBpm,
    bmrKcal: Math.round(bmrKcal)
  };
}

/**
 * Estimates pure fat oxidation in grams based on exercise intensity & incline.
 */
export function calculateFatGramsBurned(
  calories: number,
  speedKmh: number,
  inclineLevel: number
): number {
  if (calories <= 0) return 0;

  let fatRatio: number;
  if (speedKmh <= 5.5 && inclineLevel >= 6) {
    fatRatio = 0.70;
  } else if (speedKmh <= 6.5) {
    fatRatio = 0.60;
  } else if (speedKmh <= 9.0) {
    fatRatio = 0.45;
  } else if (speedKmh <= 12.0) {
    fatRatio = 0.30;
  } else {
    fatRatio = 0.18;
  }

  const fatCalories = calories * fatRatio;
  return Number((fatCalories / 9.0).toFixed(1));
}

/**
 * Formats speed into runner's pace (minutes and seconds per kilometer).
 */
export function formatPace(speedKmh: number): string {
  if (speedKmh <= 0.3) return "--'--\"";
  const secondsPerKm = Math.round(3600 / speedKmh);
  const minutes = Math.floor(secondsPerKm / 60);
  const remainingSeconds = secondsPerKm % 60;
  return `${minutes}'${remainingSeconds.toString().padStart(2, '0')}"`;
}

/**
 * Formats elapsed seconds into HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculates progress for the current Workout Goal
 */
export function calculateGoalProgress(
  metrics: TreadmillMetrics,
  goal: WorkoutGoal
): { progress: number; currentFormatted: string; targetFormatted: string; isComplete: boolean } {
  if (goal.type === 'none' || goal.target <= 0) {
    return { progress: 0, currentFormatted: '0', targetFormatted: '0', isComplete: false };
  }

  let currentVal = 0;
  let currentFormatted = '';
  let targetFormatted = '';

  switch (goal.type) {
    case 'distance': {
      currentVal = metrics.distanceMeters / 1000;
      currentFormatted = `${currentVal.toFixed(2)} km`;
      targetFormatted = `${goal.target.toFixed(1)} km`;
      break;
    }
    case 'time': {
      currentVal = metrics.elapsedSeconds / 60;
      currentFormatted = `${Math.floor(currentVal)} นาที`;
      targetFormatted = `${goal.target} นาที`;
      break;
    }
    case 'calories': {
      currentVal = metrics.caloriesBurned;
      currentFormatted = `${Math.round(currentVal)} kcal`;
      targetFormatted = `${goal.target} kcal`;
      break;
    }
    case 'elevation': {
      currentVal = metrics.elevationGainMeters;
      currentFormatted = `${Math.round(currentVal)} m`;
      targetFormatted = `${goal.target} m`;
      break;
    }
  }

  const progress = Math.min(100, Math.round((currentVal / goal.target) * 100));
  const isComplete = currentVal >= goal.target;

  return { progress, currentFormatted, targetFormatted, isComplete };
}

export interface Landmark {
  name: string;
  heightMeters: number;
  icon: string;
}

export const LANDMARKS: Landmark[] = [
  { name: 'บันได 10 ชั้น', heightMeters: 30, icon: '🏢' },
  { name: 'อนุสาวรีย์ชัยสมรภูมิ', heightMeters: 50, icon: '🏛️' },
  { name: 'วัดอรุณฯ', heightMeters: 82, icon: '🛕' },
  { name: 'รูปปั้นเทพีเสรีภาพ', heightMeters: 93, icon: '🗽' },
  { name: 'หอไอเฟล (ชั้น 2)', heightMeters: 115, icon: '🗼' },
  { name: 'ตึกคิงเพาเวอร์ มหานคร', heightMeters: 314, icon: '🏙️' },
  { name: 'ตึกใบหยก 2', heightMeters: 304, icon: '🏢' },
  { name: 'หอไอเฟล (ยอดตึก)', heightMeters: 330, icon: '🗼' },
  { name: 'ตึกเอ็มไพร์สเตต', heightMeters: 381, icon: '🏙️' },
  { name: 'ยอดดอยสุเทพ', heightMeters: 1000, icon: '⛰️' },
  { name: 'ยอดดอยอินทนนท์', heightMeters: 2565, icon: '🏔️' },
];

export function getNearestLandmark(elevationMeters: number): { current: Landmark; progress: number } {
  if (elevationMeters <= 0) {
    return { current: LANDMARKS[0], progress: 0 };
  }
  for (const landmark of LANDMARKS) {
    if (elevationMeters < landmark.heightMeters) {
      const progress = Math.min(100, Math.round((elevationMeters / landmark.heightMeters) * 100));
      return { current: landmark, progress };
    }
  }
  return { current: LANDMARKS[LANDMARKS.length - 1], progress: 100 };
}
