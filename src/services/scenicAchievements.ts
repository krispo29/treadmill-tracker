import type { TreadmillMetrics } from '../types/treadmill';

export type AchievementCategory = 'distance' | 'food' | 'steps' | 'challenge' | 'secret';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface FoodBurnItem {
  id: string;
  name: string;
  emoji: string;
  calories: number;
  description: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: AchievementTier;
  foodBadge?: FoodBurnItem;
  checkUnlock: (metrics: TreadmillMetrics, sessionState: ScenicSessionState) => boolean;
}

export interface ScenicSessionState {
  pacerDeltaMeters: number;
  pacerEnabled: boolean;
  weather: string;
  isZenMode: boolean;
  hasCapturedPostcard: boolean;
  maxSpeedKmh: number;
  encounteredDeer?: boolean;
  encounteredLantern?: boolean;
  encounteredTrain?: boolean;
}

export interface UnlockedAchievementRecord {
  id: string;
  unlockedAt: string;
}

// FOOD BURN EQUIVALENCY CATALOG (Cozy Japanese Foods)
export const FOOD_BURN_CATALOG: FoodBurnItem[] = [
  { id: 'food_dango', name: 'มิทาราชิดังโงะ', emoji: '🍡', calories: 65, description: 'ดังโงะย่างซอสหวานหอมกรุ่น 1 ไม้' },
  { id: 'food_onigiri', name: 'โอนิกิริแซลมอน', emoji: '🍙', calories: 165, description: 'ข้าวปั้นสามเหลี่ยมไส้แซลมอนย่าง 1 ชิ้น' },
  { id: 'food_taiyaki', name: 'ไทยากิไส้ถั่วแดง', emoji: '🐟', calories: 230, description: 'ขนมปลาไทยากิอบร้อนๆ ไส้ถั่วแดงกวน' },
  { id: 'food_boba', name: 'ชานมไข่มุกหวานร้อย', emoji: '🧋', calories: 340, description: 'ชานมไข่มุกเคี้ยวหนึบแก้วโปรด 1 แก้วเต็ม' },
  { id: 'food_ramen', name: 'ราเมนทงคตสึเข้มข้น', emoji: '🍜', calories: 520, description: 'ราเมนซุปกระดูกหมูชามโต หมูชาชู 2 แผ่น' },
  { id: 'food_pizza', name: 'พิซซ่าถาดโต / ชาบู', emoji: '🍕', calories: 780, description: 'เบิร์นจัดหนักเทียบเท่ามื้อฉลองใหญ่!' },
];

// Calculate what foods have been burned off in current session
export function getFoodsBurned(caloriesBurned: number): { item: FoodBurnItem; count: number }[] {
  if (caloriesBurned <= 0) return [];
  const results: { item: FoodBurnItem; count: number }[] = [];
  
  for (const food of FOOD_BURN_CATALOG) {
    if (caloriesBurned >= food.calories) {
      const count = Math.floor(caloriesBurned / food.calories);
      results.push({ item: food, count });
    }
  }
  return results;
}

// STEAM-STYLE ACHIEVEMENT CATALOG (20+ Engaging In-Run Badges)
export const ACHIEVEMENT_CATALOG: AchievementItem[] = [
  // --- FOOD EQUIVALENCY ACHIEVEMENTS ---
  {
    id: 'food_dango',
    title: 'แลกดังโงะ 1 ไม้ 🍡',
    description: 'เผาผลาญ 65 kcal เท่ามิทาราชิดังโงะย่าง 1 ไม้แล้ว!',
    icon: '🍡',
    category: 'food',
    tier: 'bronze',
    foodBadge: FOOD_BURN_CATALOG[0],
    checkUnlock: (m) => m.caloriesBurned >= 65,
  },
  {
    id: 'food_onigiri',
    title: 'โอนิกิริแซลมอน 🍙',
    description: 'เผาผลาญ 165 kcal เท่าข้าวปั้นญี่ปุ่นก้อนโต 1 ก้อน!',
    icon: '🍙',
    category: 'food',
    tier: 'bronze',
    foodBadge: FOOD_BURN_CATALOG[1],
    checkUnlock: (m) => m.caloriesBurned >= 165,
  },
  {
    id: 'food_taiyaki',
    title: 'ไทยากิร้อนๆ 🐟',
    description: 'เผาผลาญ 230 kcal ขนมปลาไส้ถั่วแดงชิ้นนี้ฟรีแล้ว!',
    icon: '🐟',
    category: 'food',
    tier: 'silver',
    foodBadge: FOOD_BURN_CATALOG[2],
    checkUnlock: (m) => m.caloriesBurned >= 230,
  },
  {
    id: 'food_boba',
    title: 'หมดสิทธิ์ชานม 🧋',
    description: 'เผาผลาญ 340 kcal ลบล้างชานมไข่มุกหวานร้อย 1 แก้วเต็ม!',
    icon: '🧋',
    category: 'food',
    tier: 'gold',
    foodBadge: FOOD_BURN_CATALOG[3],
    checkUnlock: (m) => m.caloriesBurned >= 340,
  },
  {
    id: 'food_ramen',
    title: 'ชามนี้พี่จ่ายไหว 🍜',
    description: 'เผาผลาญทะลุ 520 kcal เทียบเท่าราเมนทงคตสึ 1 ชามยักษ์!',
    icon: '🍜',
    category: 'food',
    tier: 'platinum',
    foodBadge: FOOD_BURN_CATALOG[4],
    checkUnlock: (m) => m.caloriesBurned >= 520,
  },

  // --- DISTANCE & STEPS ACHIEVEMENTS ---
  {
    id: 'dist_500m',
    title: 'ก้าวแรกสู่โตเกียว 🥉',
    description: 'เดินทางพิชิต 500 เมตรแรกของการเดินทางในวันนี้',
    icon: '👟',
    category: 'distance',
    tier: 'bronze',
    checkUnlock: (m) => m.distanceMeters >= 500,
  },
  {
    id: 'dist_1k',
    title: 'นักก้าวเท้ามือโปร 🥈',
    description: 'ผ่านหลักกิโลเมตรที่ 1.0 km อย่างสวยงามและมั่นคง',
    icon: '🚩',
    category: 'distance',
    tier: 'bronze',
    checkUnlock: (m) => m.distanceMeters >= 1000,
  },
  {
    id: 'dist_2k',
    title: 'ทุ่งดอกไม้บานสะพรั่ง 🌸',
    description: 'วิ่งต่อเนื่องทะลุ 2.0 km กลิ่นหอมซากุระอบอวล',
    icon: '🌸',
    category: 'distance',
    tier: 'silver',
    checkUnlock: (m) => m.distanceMeters >= 2000,
  },
  {
    id: 'dist_3k',
    title: 'ลัดเลาะข้ามขุนเขา 🥇',
    description: 'พิชิตระยะทาง 3.0 km ทิวทัศน์เริ่มเปลี่ยนสู่ธรรมชาติ',
    icon: '⛩️',
    category: 'distance',
    tier: 'gold',
    checkUnlock: (m) => m.distanceMeters >= 3000,
  },
  {
    id: 'dist_5k',
    title: 'ผู้พิชิต 5K แพลทินัม 👑',
    description: 'พิชิตมินิมาราธอน 5.0 km เต็มระยะ! คุณสุดยอดมาก!',
    icon: '🏆',
    category: 'distance',
    tier: 'platinum',
    checkUnlock: (m) => m.distanceMeters >= 5000,
  },
  {
    id: 'dist_10k',
    title: 'ตำนานนักวิ่งแห่งฟูจิ 🗻',
    description: 'เดินทางทะลุ 10.0 km ก้าวข้ามขีดจำกัดของตัวเอง!',
    icon: '🗻',
    category: 'distance',
    tier: 'platinum',
    checkUnlock: (m) => m.distanceMeters >= 10000,
  },
  {
    id: 'time_15min',
    title: 'โฟลว์สเตท 15 นาที 🧘',
    description: 'ออกกำลังกายต่อเนื่อง 15 นาที ร่างกายกำลังตื่นตัวเต็มที่',
    icon: '⏱️',
    category: 'steps',
    tier: 'bronze',
    checkUnlock: (m) => m.elapsedSeconds >= 900,
  },
  {
    id: 'time_30min',
    title: 'นักสู้ครึ่งชั่วโมง ⚡',
    description: 'วิ่งต่อเนื่องครบ 30 นาที เผาผลาญไขมันลึกอย่างทรงพลัง',
    icon: '🔥',
    category: 'steps',
    tier: 'silver',
    checkUnlock: (m) => m.elapsedSeconds >= 1800,
  },

  // --- CHALLENGE & SPEED ACHIEVEMENTS ---
  {
    id: 'speed_rush',
    title: 'ลมกรดซามูไร 💨',
    description: 'เร่งความเร็วทะลุ 8.0 km/h จนเกิดเส้นลมพุ่งผ่านร่างกาย!',
    icon: '💨',
    category: 'challenge',
    tier: 'silver',
    checkUnlock: (m) => m.speedKmh >= 8.0,
  },
  {
    id: 'incline_hiker',
    title: 'ปีนฟูจิชั้นที่ 5 ⛰️',
    description: 'เดินขึ้นทางชันความชัน Incline ระดับ 3 ขึ้นไป เผาผลาญทวีคูณ',
    icon: '⛰️',
    category: 'challenge',
    tier: 'bronze',
    checkUnlock: (m) => m.inclineLevel >= 3,
  },
  {
    id: 'incline_master',
    title: 'ยอดเขาสูงชันมิอาจขวาง 🧗',
    description: 'พิชิตทางชันระดับ 6 ขึ้นไป น่องเหล็กตัวจริง!',
    icon: '🧗',
    category: 'challenge',
    tier: 'gold',
    checkUnlock: (m) => m.inclineLevel >= 6,
  },
  {
    id: 'pacer_slayer',
    title: 'ทิ้งเพเซอร์ไม่เห็นฝุ่น 👻',
    description: 'วิ่งทิ้งห่าง Ghost Pacer เกินกว่า +50 เมตร นำโด่ง!',
    icon: '👻',
    category: 'challenge',
    tier: 'silver',
    checkUnlock: (_, s) => s.pacerEnabled && s.pacerDeltaMeters >= 50,
  },
  {
    id: 'weather_warrior',
    title: 'วิ่งฝ่าม่านฝน 🌧️',
    description: 'วิ่งออกกำลังกายขณะบรรยากาศฝนพรำ (Rain Mood) สุดสดชื่น',
    icon: '🌧️',
    category: 'secret',
    tier: 'bronze',
    checkUnlock: (m, s) => s.weather === 'rain' && m.distanceMeters >= 300,
  },
  {
    id: 'zen_peace',
    title: 'จิตสงบดั่งสายน้ำ 🍵',
    description: 'เปิดใช้งานโหมดเซน (Zen Mode) ดื่มด่ำกับทัศนียภาพเต็มจอ',
    icon: '🍵',
    category: 'secret',
    tier: 'bronze',
    checkUnlock: (m, s) => s.isZenMode && m.elapsedSeconds >= 60,
  },
  {
    id: 'postcard_memories',
    title: 'ช่างภาพแห่งภูเขาไฟฟูจิ 📸',
    description: 'ถ่ายและบันทึกภาพโปสการ์ดความทรงจำ Scenic Postcard',
    icon: '📸',
    category: 'secret',
    tier: 'silver',
    checkUnlock: (_, s) => s.hasCapturedPostcard,
  },
  {
    id: 'encounter_deer',
    title: 'กวางนาราทักทาย 🦌',
    description: 'ได้รับการก้มคำนับต้อนรับจากกวางนาราแสนสุภาพริมทาง',
    icon: '🦌',
    category: 'secret',
    tier: 'bronze',
    checkUnlock: (_, s) => !!s.encounteredDeer,
  },
  {
    id: 'encounter_cat',
    title: 'พรแมวนำโชค 🐾',
    description: 'พบแมวสามสีศาลเจ้าโบราณนั่งเชียร์บนตะเกียงหิน',
    icon: '🐾',
    category: 'secret',
    tier: 'bronze',
    checkUnlock: (_, s) => !!s.encounteredLantern,
  },
  {
    id: 'encounter_train',
    title: 'รถไฟสายโรแมนติก 🚃',
    description: 'โบกมือทักทายรถไฟโบราณ Enoden ที่แล่นผ่านเชิงเขา',
    icon: '🚃',
    category: 'secret',
    tier: 'silver',
    checkUnlock: (_, s) => !!s.encounteredTrain,
  },
];

// Persistent storage helpers
const STORAGE_KEY = 'scenic_achievements_unlocked_v1';

export function getUnlockedAchievementIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUnlockedAchievementId(id: string): void {
  try {
    const current = new Set(getUnlockedAchievementIds());
    current.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

/**
 * Procedural Web Audio Synthesis for signature Steam "Ding! 🏆" Chime
 * Crisp, sparkling high-bell chime with shimmering harmonics
 */
export function playSteamAchievementChime(audioCtx?: AudioContext | null): void {
  try {
    let ctx = audioCtx;
    if (!ctx) {
      const AudioClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioClass) ctx = new AudioClass();
    }
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;

    // Steam-like Signature Double Bell Chime: Note 1 (B5 ~987Hz) -> Note 2 High Chime (E6 ~1318Hz & G#6 ~1661Hz)
    const tones = [
      { freq: 987.77, start: 0.00, dur: 0.35, gain: 0.08, type: 'sine' as OscillatorType },
      { freq: 1318.51, start: 0.08, dur: 0.70, gain: 0.12, type: 'sine' as OscillatorType },
      { freq: 1975.53, start: 0.10, dur: 0.85, gain: 0.07, type: 'triangle' as OscillatorType }, // Sparkle overtone
      { freq: 2637.02, start: 0.12, dur: 0.90, gain: 0.04, type: 'sine' as OscillatorType }, // Shimmer tail
    ];

    tones.forEach((t) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = t.type;
      osc.frequency.setValueAtTime(t.freq, now + t.start);

      // Attack and gentle exponential decay
      gain.gain.setValueAtTime(0.0001, now + t.start);
      gain.gain.exponentialRampToValueAtTime(t.gain, now + t.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.start);
      osc.stop(now + t.start + t.dur);
    });
  } catch (err) {
    console.warn('Could not play Steam achievement chime:', err);
  }
}

/**
 * Procedural Web Audio Synthesis for Nostalgic Japanese Train Whistle (Toot-Toot! 🚃)
 * Warm dual-tone chord (F#4 370Hz + A4 440Hz) with gentle acoustic swell
 */
export function playTrainWhistleTone(audioCtx?: AudioContext | null): void {
  try {
    let ctx = audioCtx;
    if (!ctx) {
      const AudioClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioClass) ctx = new AudioClass();
    }
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const blasts = [
      { start: 0.0, dur: 0.38 },
      { start: 0.46, dur: 0.75 },
    ];

    blasts.forEach(({ start, dur }) => {
      [369.99, 440.00, 554.37].forEach((freq, fIdx) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + start);

        const peakGain = fIdx === 0 ? 0.035 : 0.025;
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(peakGain, now + start + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    });
  } catch (err) {
    console.warn('Could not play train whistle:', err);
  }
}
