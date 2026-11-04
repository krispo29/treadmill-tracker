import { neon, neonConfig } from '@neondatabase/serverless';
import type { WorkoutRecord, DatabaseStats } from '../types/database';
import type { UserProfile, WorkoutGoal } from '../types/treadmill';
import type { WorkoutProgram } from '../types/workout';
import { calculateAcsmCaloriesPerSecond, calculateFatGramsBurned } from './calculations';

// Disable browser warning for personal client app
neonConfig.disableWarningInBrowsers = true;

const LOCAL_STORAGE_KEY = 'treadmill_workouts_backup';
const NEON_URL_KEY = 'neon_database_url';

class NeonDatabaseService {
  private customUrl: string = '';

  constructor() {
    if (typeof window !== 'undefined') {
      this.customUrl = 
        localStorage.getItem(NEON_URL_KEY) || 
        (import.meta as any).env?.VITE_NEON_DATABASE_URL || 
        '';
    }
  }

  public getConnectionUrl(): string {
    return this.customUrl;
  }

  public setConnectionUrl(url: string) {
    this.customUrl = url.trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem(NEON_URL_KEY, this.customUrl);
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.customUrl && this.customUrl.startsWith('postgres'));
  }

  private getClient(urlOverride?: string) {
    const url = urlOverride || this.customUrl;
    if (!url || !url.startsWith('postgres')) {
      throw new Error('ยังไม่ได้กำหนด Neon Database URL');
    }
    return neon(url);
  }

  /**
   * Tests connection and initializes table schema
   */
  public async testConnection(urlToTest?: string): Promise<{ success: boolean; message: string }> {
    try {
      const sql = this.getClient(urlToTest);
      const result = await sql`SELECT 1 as connected;`;
      if (result && result.length > 0) {
        await this.initSchema(urlToTest);
        return { success: true, message: 'เชื่อมต่อ Neon Database สำเร็จ พร้อมใช้งาน!' };
      }
      return { success: false, message: 'ไม่สามารถอ่านข้อมูลจากฐานข้อมูลได้' };
    } catch (err: any) {
      console.error('Neon test connection error:', err);
      return { success: false, message: `เชื่อมต่อไม่สำเร็จ: ${err.message || err}` };
    }
  }

  /**
   * Initializes or upgrades the PostgreSQL table schema
   */
  public async initSchema(urlOverride?: string): Promise<void> {
    const sql = this.getClient(urlOverride);
    
    // Create base table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS treadmill_workouts (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        program_name TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        distance_meters NUMERIC NOT NULL,
        calories_burned NUMERIC NOT NULL,
        elevation_gain_meters NUMERIC NOT NULL,
        avg_speed_kmh NUMERIC NOT NULL,
        max_speed_kmh NUMERIC NOT NULL,
        avg_incline NUMERIC NOT NULL,
        max_incline INTEGER NOT NULL,
        fat_grams_burned NUMERIC NOT NULL,
        user_id TEXT,
        user_name TEXT,
        user_avatar TEXT,
        user_weight_kg NUMERIC,
        user_height_cm NUMERIC,
        user_age INTEGER,
        user_gender TEXT,
        user_bmi NUMERIC,
        notes TEXT
      );
    `;

    // Safe migrations for existing tables
    await sql`ALTER TABLE treadmill_workouts ADD COLUMN IF NOT EXISTS user_id TEXT;`;
    await sql`ALTER TABLE treadmill_workouts ADD COLUMN IF NOT EXISTS user_name TEXT;`;
    await sql`ALTER TABLE treadmill_workouts ADD COLUMN IF NOT EXISTS user_avatar TEXT;`;
    await sql`ALTER TABLE treadmill_workouts ADD COLUMN IF NOT EXISTS user_weight_kg NUMERIC;`;
    await sql`ALTER TABLE treadmill_workouts ADD COLUMN IF NOT EXISTS user_height_cm NUMERIC;`;
    await sql`ALTER TABLE treadmill_workouts ADD COLUMN IF NOT EXISTS user_age INTEGER;`;
    await sql`ALTER TABLE treadmill_workouts ADD COLUMN IF NOT EXISTS user_gender TEXT;`;
    await sql`ALTER TABLE treadmill_workouts ADD COLUMN IF NOT EXISTS user_bmi NUMERIC;`;

    // Create treadmill_profiles table in Neon
    await sql`
      CREATE TABLE IF NOT EXISTS treadmill_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '🏃‍♂️',
        weight_kg NUMERIC NOT NULL DEFAULT 70,
        height_cm NUMERIC NOT NULL DEFAULT 170,
        age INTEGER NOT NULL DEFAULT 25,
        gender TEXT NOT NULL DEFAULT 'other',
        default_start_speed NUMERIC DEFAULT 3.0,
        favorite_speeds JSONB DEFAULT '[]'::jsonb,
        favorite_inclines JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Create treadmill_goals table in Neon
    await sql`
      CREATE TABLE IF NOT EXISTS treadmill_goals (
        user_id TEXT PRIMARY KEY,
        goal_type TEXT NOT NULL DEFAULT 'distance',
        target NUMERIC NOT NULL DEFAULT 5.0,
        title TEXT NOT NULL DEFAULT 'วิ่งระยะทาง 5.0 km',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Create treadmill_programs table in Neon
    await sql`
      CREATE TABLE IF NOT EXISTS treadmill_programs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        category TEXT NOT NULL,
        description TEXT,
        total_duration_seconds INTEGER NOT NULL,
        difficulty TEXT NOT NULL,
        target_zone TEXT,
        badge TEXT,
        steps JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Create treadmill_achievements table in Neon (Per-Profile Isolated Achievements)
    await sql`
      CREATE TABLE IF NOT EXISTS treadmill_achievements (
        user_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (user_id, achievement_id)
      );
    `;
  }

  // ==========================================
  // PROFILE CRUD (100% Neon Database Driven)
  // ==========================================
  public async getProfiles(): Promise<UserProfile[]> {
    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await this.initSchema();
        const rows = await sql`
          SELECT * FROM treadmill_profiles ORDER BY created_at ASC;
        `;
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            avatar: r.avatar || '🏃‍♂️',
            weightKg: Number(r.weight_kg) || 70,
            heightCm: Number(r.height_cm) || 170,
            age: Number(r.age) || 25,
            gender: r.gender || 'other',
            defaultStartSpeed: r.default_start_speed ? Number(r.default_start_speed) : 3.0,
            favoriteSpeeds: Array.isArray(r.favorite_speeds)
              ? r.favorite_speeds.map(Number)
              : (typeof r.favorite_speeds === 'string' ? JSON.parse(r.favorite_speeds).map(Number) : [3.0, 5.0, 7.0, 9.0]),
            favoriteInclines: Array.isArray(r.favorite_inclines)
              ? r.favorite_inclines.map(Number)
              : (typeof r.favorite_inclines === 'string' ? JSON.parse(r.favorite_inclines).map(Number) : [0, 2, 4, 6]),
          }));
        }
      } catch (err) {
        console.warn('Neon getProfiles error:', err);
      }
    }
    return [];
  }

  public async saveProfile(p: UserProfile): Promise<void> {
    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await this.initSchema();
        const favSpeedsJson = JSON.stringify(p.favoriteSpeeds || [3.0, 5.0, 7.0, 9.0]);
        const favInclinesJson = JSON.stringify(p.favoriteInclines || [0, 2, 4, 6]);

        await sql`
          INSERT INTO treadmill_profiles (
            id, name, avatar, weight_kg, height_cm, age, gender, default_start_speed, favorite_speeds, favorite_inclines, updated_at
          ) VALUES (
            ${p.id}, ${p.name}, ${p.avatar || '🏃‍♂️'}, ${p.weightKg}, ${p.heightCm}, ${p.age}, ${p.gender},
            ${p.defaultStartSpeed || 3.0}, ${favSpeedsJson}::jsonb, ${favInclinesJson}::jsonb, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            avatar = EXCLUDED.avatar,
            weight_kg = EXCLUDED.weight_kg,
            height_cm = EXCLUDED.height_cm,
            age = EXCLUDED.age,
            gender = EXCLUDED.gender,
            default_start_speed = EXCLUDED.default_start_speed,
            favorite_speeds = EXCLUDED.favorite_speeds,
            favorite_inclines = EXCLUDED.favorite_inclines,
            updated_at = NOW();
        `;
      } catch (err) {
        console.error('Neon saveProfile error:', err);
      }
    }
  }

  public async deleteProfile(id: string): Promise<void> {
    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await sql`DELETE FROM treadmill_profiles WHERE id = ${id};`;
        await sql`DELETE FROM treadmill_goals WHERE user_id = ${id};`;
      } catch (err) {
        console.error('Neon deleteProfile error:', err);
      }
    }
  }

  // ==========================================
  // GOAL CRUD (100% Neon Database Driven)
  // ==========================================
  public async getGoal(userId: string): Promise<WorkoutGoal | null> {
    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await this.initSchema();
        const rows = await sql`
          SELECT * FROM treadmill_goals WHERE user_id = ${userId} LIMIT 1;
        `;
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            type: r.goal_type as any,
            target: Number(r.target),
            title: r.title,
          };
        }
      } catch (err) {
        console.warn('Neon getGoal error:', err);
      }
    }
    return null;
  }

  public async saveGoal(userId: string, goal: WorkoutGoal): Promise<void> {
    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await this.initSchema();
        await sql`
          INSERT INTO treadmill_goals (user_id, goal_type, target, title, updated_at)
          VALUES (${userId}, ${goal.type}, ${goal.target}, ${goal.title}, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            goal_type = EXCLUDED.goal_type,
            target = EXCLUDED.target,
            title = EXCLUDED.title,
            updated_at = NOW();
        `;
      } catch (err) {
        console.error('Neon saveGoal error:', err);
      }
    }
  }

  // ==========================================
  // ACHIEVEMENTS CRUD (Per-Profile Isolation)
  // ==========================================
  public async getAchievements(userId: string): Promise<string[]> {
    if (this.isConfigured() && userId) {
      try {
        const sql = this.getClient();
        await this.initSchema();
        const rows = await sql`
          SELECT achievement_id FROM treadmill_achievements WHERE user_id = ${userId};
        `;
        if (rows && rows.length > 0) {
          return rows.map((r: any) => r.achievement_id);
        }
      } catch (err) {
        console.warn('Neon getAchievements error:', err);
      }
    }
    return [];
  }

  public async saveAchievement(userId: string, achievementId: string): Promise<void> {
    if (this.isConfigured() && userId && achievementId) {
      try {
        const sql = this.getClient();
        await this.initSchema();
        await sql`
          INSERT INTO treadmill_achievements (user_id, achievement_id, unlocked_at)
          VALUES (${userId}, ${achievementId}, NOW())
          ON CONFLICT (user_id, achievement_id) DO NOTHING;
        `;
      } catch (err) {
        console.error('Neon saveAchievement error:', err);
      }
    }
  }

  // ==========================================
  // PROGRAM CRUD (100% Neon Database Driven)
  // ==========================================
  public async getPrograms(): Promise<WorkoutProgram[]> {
    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await this.initSchema();
        const rows = await sql`
          SELECT * FROM treadmill_programs ORDER BY created_at ASC;
        `;
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            title: r.title,
            subtitle: r.subtitle || '',
            category: r.category as any,
            description: r.description || '',
            totalDurationSeconds: Number(r.total_duration_seconds),
            difficulty: r.difficulty as any,
            targetZone: r.target_zone || '',
            badge: r.badge || '',
            steps: Array.isArray(r.steps) ? r.steps : (typeof r.steps === 'string' ? JSON.parse(r.steps) : []),
          }));
        }
      } catch (err) {
        console.warn('Neon getPrograms error:', err);
      }
    }
    return [];
  }

  public async saveProgram(p: WorkoutProgram): Promise<void> {
    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await this.initSchema();
        const stepsJson = JSON.stringify(p.steps);
        await sql`
          INSERT INTO treadmill_programs (
            id, title, subtitle, category, description, total_duration_seconds, difficulty, target_zone, badge, steps
          ) VALUES (
            ${p.id}, ${p.title}, ${p.subtitle}, ${p.category}, ${p.description}, ${p.totalDurationSeconds},
            ${p.difficulty}, ${p.targetZone}, ${p.badge}, ${stepsJson}::jsonb
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            subtitle = EXCLUDED.subtitle,
            category = EXCLUDED.category,
            description = EXCLUDED.description,
            total_duration_seconds = EXCLUDED.total_duration_seconds,
            difficulty = EXCLUDED.difficulty,
            target_zone = EXCLUDED.target_zone,
            badge = EXCLUDED.badge,
            steps = EXCLUDED.steps;
        `;
      } catch (err) {
        console.error('Neon saveProgram error:', err);
      }
    }
  }

  public async deleteProgram(id: string): Promise<void> {
    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await sql`DELETE FROM treadmill_programs WHERE id = ${id};`;
      } catch (err) {
        console.error('Neon deleteProgram error:', err);
      }
    }
  }

  /**
   * Saves a workout record (to Neon if configured, always backs up locally)
   */
  public async saveWorkout(workout: WorkoutRecord): Promise<{ success: boolean; mode: 'neon' | 'local'; message: string }> {
    this.saveToLocal(workout);

    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await this.initSchema();

        await sql`
          INSERT INTO treadmill_workouts (
            id, created_at, program_name, duration_seconds, distance_meters,
            calories_burned, elevation_gain_meters, avg_speed_kmh, max_speed_kmh,
            avg_incline, max_incline, fat_grams_burned,
            user_id, user_name, user_avatar,
            user_weight_kg, user_height_cm, user_age, user_gender, user_bmi, notes
          ) VALUES (
            ${workout.id}, ${workout.created_at}, ${workout.program_name},
            ${workout.duration_seconds}, ${workout.distance_meters}, ${workout.calories_burned},
            ${workout.elevation_gain_meters}, ${workout.avg_speed_kmh}, ${workout.max_speed_kmh},
            ${workout.avg_incline}, ${workout.max_incline}, ${workout.fat_grams_burned},
            ${workout.user_id || null}, ${workout.user_name || null}, ${workout.user_avatar || null},
            ${workout.user_weight_kg || null}, ${workout.user_height_cm || null},
            ${workout.user_age || null}, ${workout.user_gender || null},
            ${workout.user_bmi || null}, ${workout.notes || ''}
          )
          ON CONFLICT (id) DO UPDATE SET
            program_name = EXCLUDED.program_name,
            duration_seconds = EXCLUDED.duration_seconds,
            distance_meters = EXCLUDED.distance_meters,
            calories_burned = EXCLUDED.calories_burned,
            elevation_gain_meters = EXCLUDED.elevation_gain_meters,
            user_id = EXCLUDED.user_id,
            user_name = EXCLUDED.user_name,
            user_avatar = EXCLUDED.user_avatar,
            user_weight_kg = EXCLUDED.user_weight_kg,
            user_height_cm = EXCLUDED.user_height_cm,
            user_age = EXCLUDED.user_age,
            user_bmi = EXCLUDED.user_bmi;
        `;

        return { success: true, mode: 'neon', message: `บันทึกสถิติของ ${workout.user_name || 'ผู้ใช้งาน'} เรียบร้อยแล้ว` };
      } catch (err: any) {
        console.warn('Could not save to Neon, saved locally:', err);
        return { 
          success: true, 
          mode: 'local', 
          message: `บันทึกสถิติลงในเครื่องเรียบร้อยแล้ว` 
        };
      }
    }

    return { success: true, mode: 'local', message: `บันทึกประวัติการวิ่งของ ${workout.user_name || 'ผู้ใช้งาน'} ลงในเครื่องเรียบร้อย` };
  }

  /**
   * Fetches all workouts (prioritizes Neon, merges with local)
   */
  public async getWorkouts(): Promise<WorkoutRecord[]> {
    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await this.initSchema();
        const rows = await sql`
          SELECT * FROM treadmill_workouts 
          ORDER BY created_at DESC 
          LIMIT 200;
        `;

        if (rows && rows.length > 0) {
          const records: WorkoutRecord[] = rows.map((r: any) => ({
            id: r.id,
            created_at: new Date(r.created_at).toISOString(),
            program_name: r.program_name,
            duration_seconds: Number(r.duration_seconds),
            distance_meters: Number(r.distance_meters),
            calories_burned: Number(r.calories_burned),
            elevation_gain_meters: Number(r.elevation_gain_meters),
            avg_speed_kmh: Number(r.avg_speed_kmh),
            max_speed_kmh: Number(r.max_speed_kmh),
            avg_incline: Number(r.avg_incline),
            max_incline: Number(r.max_incline),
            fat_grams_burned: Number(r.fat_grams_burned),
            user_id: r.user_id || undefined,
            user_name: r.user_name || undefined,
            user_avatar: r.user_avatar || undefined,
            user_weight_kg: r.user_weight_kg ? Number(r.user_weight_kg) : undefined,
            user_height_cm: r.user_height_cm ? Number(r.user_height_cm) : undefined,
            user_age: r.user_age ? Number(r.user_age) : undefined,
            user_gender: r.user_gender || undefined,
            user_bmi: r.user_bmi ? Number(r.user_bmi) : undefined,
            notes: r.notes || '',
          }));
          return records;
        }
      } catch (err) {
        console.warn('Neon fetch failed, falling back to local storage:', err);
      }
    }

    return this.getLocalWorkouts();
  }

  public async deleteWorkout(id: string): Promise<boolean> {
    this.deleteFromLocal(id);
    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await sql`DELETE FROM treadmill_workouts WHERE id = ${id};`;
        return true;
      } catch (e) {
        console.warn('Delete from Neon failed:', e);
      }
    }
    return true;
  }

  public async updateWorkout(
    id: string,
    updates: Partial<WorkoutRecord>
  ): Promise<WorkoutRecord | null> {
    const workouts = await this.getWorkouts();
    const workout = workouts.find((w) => w.id === id);
    if (!workout) return null;

    const updatedWorkout: WorkoutRecord = {
      ...workout,
      ...updates,
      id: workout.id, // prevent id alteration
    };

    this.saveToLocal(updatedWorkout);

    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await sql`
          UPDATE treadmill_workouts
          SET 
            program_name = ${updatedWorkout.program_name},
            duration_seconds = ${updatedWorkout.duration_seconds},
            distance_meters = ${updatedWorkout.distance_meters},
            calories_burned = ${updatedWorkout.calories_burned},
            elevation_gain_meters = ${updatedWorkout.elevation_gain_meters},
            avg_speed_kmh = ${updatedWorkout.avg_speed_kmh},
            max_speed_kmh = ${updatedWorkout.max_speed_kmh},
            avg_incline = ${updatedWorkout.avg_incline},
            max_incline = ${updatedWorkout.max_incline},
            fat_grams_burned = ${updatedWorkout.fat_grams_burned},
            user_id = ${updatedWorkout.user_id},
            user_name = ${updatedWorkout.user_name},
            user_avatar = ${updatedWorkout.user_avatar},
            user_weight_kg = ${updatedWorkout.user_weight_kg},
            user_height_cm = ${updatedWorkout.user_height_cm},
            user_age = ${updatedWorkout.user_age},
            user_gender = ${updatedWorkout.user_gender},
            user_bmi = ${updatedWorkout.user_bmi},
            notes = ${updatedWorkout.notes || ''}
          WHERE id = ${id};
        `;
      } catch (err) {
        console.error('Failed to update workout in Neon:', err);
      }
    }

    return updatedWorkout;
  }

  public async updateWorkoutRunner(
    id: string,
    profile: UserProfile,
    recalculateCalories: boolean = true
  ): Promise<WorkoutRecord | null> {
    const workouts = await this.getWorkouts();
    const workout = workouts.find((w) => w.id === id);
    if (!workout) return null;

    const newWeight = profile.weightKg;
    const heightM = profile.heightCm / 100;
    const newBmi = heightM > 0 ? Number((newWeight / (heightM * heightM)).toFixed(1)) : undefined;

    let newCalories = workout.calories_burned;
    let newFatGrams = workout.fat_grams_burned;

    if (recalculateCalories && newWeight > 0) {
      const avgGrade = workout.distance_meters > 0 
        ? (workout.elevation_gain_meters / workout.distance_meters) * 100 
        : workout.avg_incline;
      const calPerSec = calculateAcsmCaloriesPerSecond(workout.avg_speed_kmh, avgGrade, newWeight);
      newCalories = Number((calPerSec * workout.duration_seconds).toFixed(1));
      newFatGrams = calculateFatGramsBurned(newCalories, workout.avg_speed_kmh, workout.avg_incline);
    }

    const updatedWorkout: WorkoutRecord = {
      ...workout,
      user_id: profile.id,
      user_name: profile.name,
      user_avatar: profile.avatar,
      user_weight_kg: newWeight,
      user_height_cm: profile.heightCm,
      user_age: profile.age,
      user_gender: profile.gender,
      user_bmi: newBmi,
      calories_burned: newCalories,
      fat_grams_burned: newFatGrams,
    };

    this.saveToLocal(updatedWorkout);

    if (this.isConfigured()) {
      try {
        const sql = this.getClient();
        await sql`
          UPDATE treadmill_workouts
          SET user_id = ${updatedWorkout.user_id},
              user_name = ${updatedWorkout.user_name},
              user_avatar = ${updatedWorkout.user_avatar},
              user_weight_kg = ${updatedWorkout.user_weight_kg},
              user_height_cm = ${updatedWorkout.user_height_cm},
              user_age = ${updatedWorkout.user_age},
              user_gender = ${updatedWorkout.user_gender},
              user_bmi = ${updatedWorkout.user_bmi},
              calories_burned = ${updatedWorkout.calories_burned},
              fat_grams_burned = ${updatedWorkout.fat_grams_burned}
          WHERE id = ${id};
        `;
      } catch (err) {
        console.error('Failed to update workout runner in Neon:', err);
      }
    }

    return updatedWorkout;
  }

  public calculateStats(workouts: WorkoutRecord[]): DatabaseStats {
    return workouts.reduce(
      (acc, w) => {
        acc.totalWorkouts += 1;
        acc.totalDistanceKm += w.distance_meters / 1000;
        acc.totalElevationMeters += w.elevation_gain_meters;
        acc.totalCalories += w.calories_burned;
        acc.totalFatGrams += w.fat_grams_burned;
        acc.totalDurationSeconds += w.duration_seconds;
        return acc;
      },
      {
        totalWorkouts: 0,
        totalDistanceKm: 0,
        totalElevationMeters: 0,
        totalCalories: 0,
        totalFatGrams: 0,
        totalDurationSeconds: 0,
      }
    );
  }

  public generateGpx(workout: WorkoutRecord): string {
    const timeIso = new Date(workout.created_at).toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Treadmill Pro Tracker" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${workout.user_name ? workout.user_name + ' - ' : ''}${workout.program_name || 'Treadmill Run'}</name>
    <time>${timeIso}</time>
  </metadata>
  <trk>
    <name>${workout.program_name || 'Treadmill Workout'}</name>
    <type>9</type>
    <trkseg>
      <trkpt lat="13.7563" lon="100.5018">
        <ele>${workout.elevation_gain_meters.toFixed(1)}</ele>
        <time>${timeIso}</time>
        <extensions>
          <calories>${Math.round(workout.calories_burned)}</calories>
          <distance>${workout.distance_meters.toFixed(0)}</distance>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;
  }

  public generateCsv(workouts: WorkoutRecord[]): string {
    const headers = [
      'ID',
      'Date',
      'Runner Name',
      'Program',
      'Duration (min)',
      'Distance (km)',
      'Calories (kcal)',
      'Elevation (m)',
      'Fat Burned (g)',
      'Avg Speed (km/h)',
      'Max Incline (lvl)',
      'User Weight (kg)',
      'User Height (cm)',
      'User Age',
      'User BMI'
    ];

    const rows = workouts.map(w => [
      w.id,
      new Date(w.created_at).toLocaleString('th-TH'),
      `"${(w.user_name || 'User').replace(/"/g, '""')}"`,
      `"${w.program_name.replace(/"/g, '""')}"`,
      (w.duration_seconds / 60).toFixed(1),
      (w.distance_meters / 1000).toFixed(2),
      Math.round(w.calories_burned),
      Math.round(w.elevation_gain_meters),
      w.fat_grams_burned.toFixed(1),
      w.avg_speed_kmh.toFixed(1),
      w.max_incline,
      w.user_weight_kg || '',
      w.user_height_cm || '',
      w.user_age || '',
      w.user_bmi || ''
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private saveToLocal(workout: WorkoutRecord) {
    if (typeof window === 'undefined') return;
    const existing = this.getLocalWorkouts();
    const filtered = existing.filter(w => w.id !== workout.id);
    filtered.unshift(workout);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered.slice(0, 200)));
  }

  private getLocalWorkouts(): WorkoutRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private deleteFromLocal(id: string) {
    if (typeof window === 'undefined') return;
    const existing = this.getLocalWorkouts();
    const filtered = existing.filter(w => w.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  }
}

export const neonDatabase = new NeonDatabaseService();
