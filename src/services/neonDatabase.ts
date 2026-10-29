import { neon, neonConfig } from '@neondatabase/serverless';
import type { WorkoutRecord, DatabaseStats } from '../types/database';

// Disable browser warning for personal client app
neonConfig.disableWarningInBrowsers = true;

const LOCAL_STORAGE_KEY = 'treadmill_workouts_backup';
const NEON_URL_KEY = 'neon_database_url';

class NeonDatabaseService {
  private customUrl: string = '';

  constructor() {
    if (typeof window !== 'undefined') {
      this.customUrl = localStorage.getItem(NEON_URL_KEY) || (import.meta as any).env?.VITE_NEON_DATABASE_URL || '';
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

        return { success: true, mode: 'neon', message: `บันทึกข้อมูลของ ${workout.user_name || 'ผู้ใช้งาน'} ขึ้น Neon Cloud เรียบร้อย!` };
      } catch (err: any) {
        console.warn('Could not save to Neon, saved locally:', err);
        return { 
          success: true, 
          mode: 'local', 
          message: `บันทึกลงในเครื่องแล้ว (ไม่สามารถส่งเข้า Neon ได้: ${err.message})` 
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
