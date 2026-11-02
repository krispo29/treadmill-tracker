import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  Mountain, 
  Gauge, 
  Timer, 
  MapPin, 
  Flame, 
  Sparkles,
  Eye,
  EyeOff,
  Tv,
  Clock,
  Music,
  Camera,
  Ghost,
  Trophy,
  Share2,
  Download,
  Smartphone,
  Image as ImageIcon
} from 'lucide-react';
import type { TreadmillMetrics, UserProfile, WorkoutGoal } from '../types/treadmill';
import { formatDuration, formatPace, getCalorieReward } from '../services/calculations';
import { audioCoach } from '../services/audioCoach';
import { scenicAudioEngine } from '../services/scenicAudioEngine';
import {
  ACHIEVEMENT_CATALOG,
  getUnlockedAchievementIds,
  saveUnlockedAchievementId,
  syncProfileAchievements,
  playSteamAchievementChime,
  playTrainWhistleTone,
  getFoodsBurned,
  type AchievementItem
} from '../services/scenicAchievements';
import { ScenicAchievementToast } from './ScenicAchievementToast';
import { ScenicGoshuinModal } from './ScenicGoshuinModal';

export type ScenicTheme = 'sakura' | 'countryside' | 'sunset' | 'night';
export type ScenicWeather = 'clear' | 'rain' | 'mist' | 'autumn';
export type CompanionType = 'shiba' | 'cat' | 'bunny' | 'none';

export type StageId = 'kamakura' | 'kyoto' | 'hokkaido' | 'tokyo';

export interface StageConfig {
  id: StageId;
  name: string;
  nameEn: string;
  rangeKm: string;
  accent: string;
  tag: string;
  description: string;
  stampSrc: string;
}

export const SCENIC_STAGES: Record<StageId, StageConfig> = {
  kamakura: {
    id: 'kamakura',
    name: 'คามาคุระ & ชายฝั่งโชนัน',
    nameEn: 'Kamakura Coastal',
    rangeKm: '0.0 - 2.5 km',
    accent: '#3B664E',
    tag: '🌊 เลียบหาด & ภูเขาไฟฟูจิ',
    description: 'เส้นทางเลียบหาด รับลมทะเลสดชื่น ชมวิวฟูจิซังและรถไฟโบราณ Enoden',
    stampSrc: '/assets/scenic/prop-milestone-post.png',
  },
  kyoto: {
    id: 'kyoto',
    name: 'เกียวโต อาราชิยามะ',
    nameEn: 'Kyoto Arashiyama',
    rangeKm: '2.5 - 5.0 km',
    accent: '#B85737',
    tag: '⛩️ ป่าไผ่ & ใบไม้เปลี่ยนสี',
    description: 'ข้ามสู่เมืองเก่า ร่มรื่นด้วยป่าไผ่ ซุ้มประตูศาลเจ้า และภูติทานูกิ',
    stampSrc: '/assets/scenic/stamp-kyoto-arashiyama.png',
  },
  hokkaido: {
    id: 'hokkaido',
    name: 'ฮอกไกโด บิเอะ',
    nameEn: 'Hokkaido Biei',
    rangeKm: '5.0 - 7.5 km',
    accent: '#6E5296',
    tag: '🌸 ทุ่งลาเวนเดอร์ & ขุนเขาหิมะ',
    description: 'เนินเขาดอกไม้หลากสีสดชื่น เทือกเขาหิมะไกลสุดตา และฟาร์มโคนม',
    stampSrc: '/assets/scenic/stamp-hokkaido-biei.png',
  },
  tokyo: {
    id: 'tokyo',
    name: 'มหานครโตเกียว เรโทร',
    nameEn: 'Neo-Tokyo Twilight',
    rangeKm: '7.5 - 10.0+ km',
    accent: '#D97706',
    tag: '🏙️ โตเกียวทาวเวอร์ & ราเมนยาไต',
    description: 'แสงไฟนีออนอบอุ่นยามค่ำคืน ตู้กดน้ำสว่างไสว กลิ่นราเมนฉลองเข้าเส้นชัย',
    stampSrc: '/assets/scenic/stamp-tokyo-shinjuku.png',
  },
};

export const getStageForDistance = (distanceMeters: number): StageId => {
  if (distanceMeters >= 7500) return 'tokyo';
  if (distanceMeters >= 5000) return 'hokkaido';
  if (distanceMeters >= 2500) return 'kyoto';
  return 'kamakura';
};

/**
 * Automatically determine the scenic theme according to the real-world local time:
 * - 06:00 - 10:59: Sakura Morning (ซากุระ ยามเช้าสดชื่น)
 * - 11:00 - 16:59: Cozy Countryside (ชนบทอบอุ่น ยามกลางวัน)
 * - 17:00 - 18:59: Sunset Beach (เลียบหาด ตะวันตกดิน แดดสีทอง เช่นเวลา 18.00 น.)
 * - 19:00 - 05:59: Starry Night (คืนดาวพราว ยามค่ำคืน)
 */
export const getThemeForCurrentTime = (date: Date = new Date()): ScenicTheme => {
  const hour = date.getHours();
  // 17:00 - 18:59 (5 PM - 6:59 PM): Sunset / Golden hour (18.00 น. โชว์ตะวันตกดิน)
  if (hour >= 17 && hour < 19) {
    return 'sunset';
  }
  // 19:00 - 05:59 (7 PM - 5:59 AM): Night / Starry sky
  if (hour >= 19 || hour < 6) {
    return 'night';
  }
  // 06:00 - 10:59 (6 AM - 10:59 AM): Sakura Morning
  if (hour >= 6 && hour < 11) {
    return 'sakura';
  }
  // 11:00 - 16:59 (11 AM - 4:59 PM): Cozy Countryside / Afternoon
  return 'countryside';
};

export const getTimePeriodLabel = (date: Date = new Date()): string => {
  const hour = date.getHours();
  if (hour >= 17 && hour < 19) return 'ตะวันตกดิน (17:00-19:00)';
  if (hour >= 19 || hour < 6) return 'ค่ำคืนดาวพราว';
  if (hour >= 6 && hour < 11) return 'เช้าสดชื่น (ซากุระ)';
  return 'กลางวันอบอุ่น (ชนบท)';
};

// Safe roundRect polyfill for older iPadOS / Safari versions
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radii: number | number[] = 0
  ) {
    const r = typeof radii === 'number' ? radii : Array.isArray(radii) ? (radii[0] || 0) : 0;
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
    return this;
  };
}

interface ScenicJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: TreadmillMetrics;
  activeProfile: UserProfile;
  goal?: WorkoutGoal;
  onSetSpeed: (speed: number) => void;
  onSetIncline: (incline: number) => void;
  onStart: (speed?: number) => void;
  onStop: () => void;
  onOpenGiantHud?: () => void;
  deviceName?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  alpha: number;
  color: string;
  type?: 'default' | 'rain' | 'autumn';
}

interface RainRipple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
}

export const ScenicJourneyModal: React.FC<ScenicJourneyModalProps> = ({
  isOpen,
  onClose,
  metrics,
  activeProfile,
  goal,
  onSetSpeed,
  onSetIncline,
  onStart,
  onStop,
  onOpenGiantHud
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // User Settings & Real-World Time Theme
  // Default: isAutoTheme = true (syncs with real-world time e.g. 18:00 shows sunset)
  // If user clicks a specific theme, isAutoTheme becomes false without forcing
  const [isAutoTheme, setIsAutoTheme] = useState(true);
  const [manualTheme, setManualTheme] = useState<ScenicTheme>(() => getThemeForCurrentTime(new Date()));
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  // Active theme dynamically computed
  const theme: ScenicTheme = isAutoTheme ? getThemeForCurrentTime(currentTime) : manualTheme;

  const [companion, setCompanion] = useState<CompanionType>('shiba');
  const [weather, setWeather] = useState<ScenicWeather>(() => {
    try {
      const saved = localStorage.getItem('scenic_journey_weather');
      if (saved === 'clear' || saved === 'rain' || saved === 'mist' || saved === 'autumn') {
        return saved as ScenicWeather;
      }
    } catch {}
    return 'clear';
  });
  const [zenMode, setZenMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Phase 3: Flow State Ambient Soundscape State
  const [ambientSoundEnabled, setAmbientSoundEnabled] = useState(() => scenicAudioEngine.getIsEnabled());
  const [ambientVolume, setAmbientVolume] = useState(() => scenicAudioEngine.getVolume());
  const [showSoundMenu, setShowSoundMenu] = useState(false);

  // Phase 3: Start/Stop Flow State Audio Engine when Modal Opens/Closes
  useEffect(() => {
    if (isOpen) {
      scenicAudioEngine.start(theme, weather);
    } else {
      scenicAudioEngine.stop();
    }
    return () => {
      scenicAudioEngine.stop();
    };
  }, [isOpen]);

  // Phase 3: Crossfade Soundscape smoothly when theme or weather changes
  useEffect(() => {
    if (isOpen) {
      scenicAudioEngine.updateState(theme, weather);
    }
  }, [theme, weather, isOpen]);

  const handleToggleAmbient = () => {
    const nextState = scenicAudioEngine.toggleEnabled();
    setAmbientSoundEnabled(nextState);
  };

  const handleSetAmbientVolume = (vol: number) => {
    scenicAudioEngine.setVolume(vol);
    setAmbientVolume(vol);
    if (!ambientSoundEnabled && vol > 0) {
      scenicAudioEngine.setEnabled(true);
      setAmbientSoundEnabled(true);
    }
  };

  // Phase 4: Ghost Pacer State & Postcard Capture
  const [pacerEnabled, setPacerEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('scenic_pacer_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [pacerSpeed, setPacerSpeed] = useState<number>(() => {
    try {
      const s = localStorage.getItem('scenic_pacer_speed');
      return s ? parseFloat(s) : 6.0;
    } catch {
      return 6.0;
    }
  });
  const [pacerDeltaDisplay, setPacerDeltaDisplay] = useState<number>(0);
  const [isCapturingPostcard, setIsCapturingPostcard] = useState<boolean>(false);
  const [showShutterFlash, setShowShutterFlash] = useState<boolean>(false);

  // Phase 1: Steam-Style Achievement Engine State & Queue (Profile Isolated)
  const [achievementQueue, setAchievementQueue] = useState<AchievementItem[]>([]);
  const unlockedInSessionRef = useRef<Set<string>>(new Set());
  const [unlockedCount, setUnlockedCount] = useState<number>(() => getUnlockedAchievementIds(activeProfile.id).length);

  // Sync profile achievements whenever activeProfile changes
  useEffect(() => {
    setUnlockedCount(getUnlockedAchievementIds(activeProfile.id).length);
    syncProfileAchievements(activeProfile.id).then((ids) => {
      setUnlockedCount(ids.length);
    }).catch(() => {});
  }, [activeProfile.id]);
  const maxSpeedReachedRef = useRef<number>(0);
  const hasCapturedPostcardRef = useRef<boolean>(false);
  const [showGoshuinModal, setShowGoshuinModal] = useState<boolean>(false);

  // Postcard Preview & Save Modal State (Instagram 9:16 Story & 3:2 Landscape)
  const [postcardPreviewUrl, setPostcardPreviewUrl] = useState<string | null>(null);
  const [postcardBlob, setPostcardBlob] = useState<Blob | null>(null);
  const [postcardFileName, setPostcardFileName] = useState<string>('');
  const [postcardFormat, setPostcardFormat] = useState<'story' | 'landscape'>('story');
  const lastSnapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Phase 2 & 5: Roadside Encounters Tracking Refs
  const encounteredDeerRef = useRef<boolean>(false);
  const encounteredLanternRef = useRef<boolean>(false);
  const encounteredTrainRef = useRef<boolean>(false);
  const encounteredTanukiRef = useRef<boolean>(false);
  const encounteredCowRef = useRef<boolean>(false);
  const encounteredMailboxCatRef = useRef<boolean>(false);

  // Stage Tracking & Celebratory Announcement (Kamakura -> Kyoto -> Hokkaido -> Tokyo)
  const lastAcknowledgedStageRef = useRef<StageId>(getStageForDistance(metrics.distanceMeters || 0));
  const [activeStageTransition, setActiveStageTransition] = useState<{
    stage: StageConfig;
    timestamp: number;
  } | null>(null);

  // Stage Testing & Simulation Controls
  const [showStageMenu, setShowStageMenu] = useState<boolean>(false);
  const [simulatedSpeed, setSimulatedSpeed] = useState<number>(0);
  const [previewStageId, setPreviewStageId] = useState<StageId | null>(null);
  const [previewDistance, setPreviewDistance] = useState<number | null>(null);

  const simulatedSpeedRef = useRef(simulatedSpeed);
  const previewStageIdRef = useRef(previewStageId);
  const previewDistanceRef = useRef(previewDistance);

  useEffect(() => {
    simulatedSpeedRef.current = simulatedSpeed;
  }, [simulatedSpeed]);

  useEffect(() => {
    previewStageIdRef.current = previewStageId;
  }, [previewStageId]);

  useEffect(() => {
    previewDistanceRef.current = previewDistance;
  }, [previewDistance]);

  const handleJumpToStage = (stageId: StageId) => {
    const stageDistances: Record<StageId, number> = {
      kamakura: 150,
      kyoto: 2650,
      hokkaido: 5200,
      tokyo: 7700,
    };
    const dist = stageDistances[stageId];
    setPreviewStageId(stageId);
    setPreviewDistance(dist);
    lastAcknowledgedStageRef.current = stageId;
    const stageCfg = SCENIC_STAGES[stageId];
    setActiveStageTransition({
      stage: stageCfg,
      timestamp: Date.now(),
    });
    if (soundEnabled) {
      playSteamAchievementChime(ambientAudioCtxRef.current);
    }
    setTimeout(() => {
      setActiveStageTransition((prev) => (prev?.stage.id === stageCfg.id ? null : prev));
    }, 6000);
  };

  const handleResetToRealTreadmill = () => {
    setPreviewStageId(null);
    setPreviewDistance(metrics.distanceMeters);
    setSimulatedSpeed(0);
    lastAcknowledgedStageRef.current = getStageForDistance(metrics.distanceMeters);
  };

  const handleDismissAchievement = useCallback((id: string) => {
    setAchievementQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pacerEnabledRef = useRef(pacerEnabled);
  const pacerSpeedRef = useRef(pacerSpeed);

  // Refs to preserve continuous rendering without resetting the canvas engine
  const metricsRef = useRef(metrics);
  const themeRef = useRef(theme);
  const companionRef = useRef(companion);
  const weatherRef = useRef(weather);
  const soundEnabledRef = useRef(soundEnabled);

  // Synchronize refs safely in effect
  useEffect(() => {
    metricsRef.current = metrics;
    themeRef.current = theme;
    companionRef.current = companion;
    weatherRef.current = weather;
    soundEnabledRef.current = soundEnabled;
    pacerEnabledRef.current = pacerEnabled;
    pacerSpeedRef.current = pacerSpeed;
  });

  const handleTogglePacer = () => {
    const next = !pacerEnabled;
    setPacerEnabled(next);
    try {
      localStorage.setItem('scenic_pacer_enabled', next.toString());
    } catch {}
  };

  const handleAdjustPacerSpeed = (delta: number) => {
    const next = Math.max(2.0, Math.min(18.0, Math.round((pacerSpeed + delta) * 10) / 10));
    setPacerSpeed(next);
    try {
      localStorage.setItem('scenic_pacer_speed', next.toString());
    } catch {}
  };

  // Render 9:16 Vertical Instagram Story Card (1080 x 1920)
  const drawStoryPostcard = (
    postCanvas: HTMLCanvasElement,
    pctx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement
  ) => {
    postCanvas.width = 1080;
    postCanvas.height = 1920;

    // 1. Cozy Warm Cream Cardstock Gradient Background (#FAF7F2 to #F3ECE1)
    const bgGrad = pctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#FAF7F2');
    bgGrad.addColorStop(1, '#F3ECE1');
    pctx.fillStyle = bgGrad;
    pctx.fillRect(0, 0, 1080, 1920);

    // Outer double border
    pctx.strokeStyle = '#E8DFD3';
    pctx.lineWidth = 3;
    pctx.strokeRect(32, 32, 1080 - 64, 1920 - 64);

    pctx.strokeStyle = '#F2ECE4';
    pctx.lineWidth = 1.5;
    pctx.strokeRect(40, 40, 1080 - 80, 1920 - 80);

    // 2. Top Header (Safe from Instagram top story UI)
    pctx.textAlign = 'left';
    pctx.textBaseline = 'middle';
    pctx.fillStyle = '#52796F';
    pctx.font = 'bold 22px "Cinzel", Georgia, serif';
    pctx.fillText('🌿 TREADMILL STUDIO', 60, 115);

    pctx.fillStyle = '#8C827A';
    pctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('SCENIC RUN • JAPAN JOURNEY', 60, 145);

    // Runner Profile badge on the right
    pctx.textAlign = 'right';
    pctx.fillStyle = '#2C2621';
    pctx.font = 'bold 22px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`${activeProfile.avatar || '🏃‍♂️'} ${activeProfile.name || 'Mike'}`, 1080 - 60, 115);

    const dateStr = new Date().toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    pctx.fillStyle = '#A0958B';
    pctx.font = '14px ui-monospace, monospace';
    pctx.fillText(dateStr, 1080 - 60, 145);

    // 3. Scenic Photo Viewport (4:3 aspect ratio, 960 x 720)
    const photoX = 60;
    const photoY = 180;
    const photoW = 960;
    const photoH = 720;

    // Drop shadow
    pctx.save();
    pctx.fillStyle = 'rgba(44, 38, 33, 0.08)';
    pctx.beginPath();
    pctx.roundRect(photoX + 5, photoY + 5, photoW, photoH, 24);
    pctx.fill();
    pctx.restore();

    // Clip and draw scenic snapshot
    pctx.save();
    pctx.beginPath();
    pctx.roundRect(photoX, photoY, photoW, photoH, 24);
    pctx.clip();
    pctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, photoX, photoY, photoW, photoH);
    pctx.restore();

    pctx.strokeStyle = '#D9CFBF';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.roundRect(photoX, photoY, photoW, photoH, 24);
    pctx.stroke();

    // 3.1 Postal Seal Stamp (Hanko 🗻 富士山)
    const sealX = photoX + photoW - 90;
    const sealY = photoY + 80;
    pctx.save();
    pctx.translate(sealX, sealY);
    pctx.rotate(-0.06);

    pctx.strokeStyle = '#C44536';
    pctx.lineWidth = 2.5;
    pctx.beginPath();
    pctx.roundRect(-60, -45, 120, 90, 8);
    pctx.stroke();

    pctx.lineWidth = 1.2;
    pctx.beginPath();
    pctx.roundRect(-54, -40, 108, 80, 6);
    pctx.stroke();

    pctx.fillStyle = '#C44536';
    pctx.font = '900 14px "Noto Serif JP", serif';
    pctx.textAlign = 'center';
    pctx.textBaseline = 'middle';
    pctx.fillText('🗻 富士山', 0, -18);
    pctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('SCENIC RUN', 0, 4);
    pctx.font = 'bold 9px ui-monospace, monospace';
    pctx.fillText(new Date().toLocaleDateString('ja-JP').replace(/\//g, '.'), 0, 22);
    pctx.restore();

    // 3.2 Goshuin Seal Stamp (if unlocked)
    const latestAchId = Array.from(unlockedInSessionRef.current).pop() || getUnlockedAchievementIds(activeProfile.id)[0];
    const latestAch = latestAchId ? ACHIEVEMENT_CATALOG.find((a) => a.id === latestAchId) : null;
    if (latestAch) {
      const achSealX = photoX + 90;
      const achSealY = photoY + 80;
      pctx.save();
      pctx.translate(achSealX, achSealY);
      pctx.rotate(0.06);

      pctx.strokeStyle = '#B3392B';
      pctx.lineWidth = 2.5;
      pctx.beginPath();
      pctx.roundRect(-60, -45, 120, 90, 8);
      pctx.stroke();

      pctx.lineWidth = 1.2;
      pctx.beginPath();
      pctx.roundRect(-54, -40, 108, 80, 6);
      pctx.stroke();

      pctx.fillStyle = '#B3392B';
      pctx.font = 'bold 16px ui-sans-serif, system-ui, sans-serif';
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';
      pctx.fillText(`${latestAch.icon} 達成`, 0, -18);
      pctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
      pctx.fillText(latestAch.title.slice(0, 10), 0, 4);
      pctx.font = 'bold 9px ui-monospace, monospace';
      pctx.fillText('GOSHUIN SEAL', 0, 22);
      pctx.restore();
    }

    // 4. Hero Primary Distance Card (Bold, huge numbers for Instagram Stories!)
    const heroY = 930;
    pctx.fillStyle = '#FFFFFF';
    pctx.beginPath();
    pctx.roundRect(photoX, heroY, photoW, 230, 24);
    pctx.fill();

    pctx.strokeStyle = '#EBE4DA';
    pctx.lineWidth = 1.5;
    pctx.stroke();

    // Top accent bar
    pctx.fillStyle = '#52796F';
    pctx.beginPath();
    pctx.roundRect(photoX, heroY, photoW, 6, [24, 24, 0, 0]);
    pctx.fill();

    pctx.textAlign = 'left';
    pctx.textBaseline = 'top';
    pctx.fillStyle = '#8C827A';
    pctx.font = 'bold 15px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('TOTAL DISTANCE • ระยะทางสะสม', photoX + 35, heroY + 28);

    const distStr = (metrics.distanceMeters / 1000).toFixed(2);
    pctx.fillStyle = '#2C2621';
    pctx.font = '900 100px ui-monospace, monospace';
    pctx.fillText(distStr, photoX + 30, heroY + 68);

    const numWidth = pctx.measureText(distStr).width;
    pctx.fillStyle = '#52796F';
    pctx.font = '900 38px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('KM', photoX + 35 + numWidth + 16, heroY + 125);

    // Food reward badge inside hero card (right side)
    const calReward = getCalorieReward(metrics.caloriesBurned);
    const badgeW = 260;
    const badgeH = 175;
    const badgeX = photoX + photoW - badgeW - 25;
    const badgeY = heroY + 28;

    pctx.fillStyle = '#FDF6EA';
    pctx.beginPath();
    pctx.roundRect(badgeX, badgeY, badgeW, badgeH, 20);
    pctx.fill();
    pctx.strokeStyle = '#F0DFBE';
    pctx.lineWidth = 1;
    pctx.stroke();

    pctx.textAlign = 'center';
    pctx.font = '50px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(calReward.emoji, badgeX + badgeW / 2, badgeY + 15);

    pctx.fillStyle = '#9A641F';
    pctx.font = 'bold 15px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(calReward.foodName.slice(0, 15), badgeX + badgeW / 2, badgeY + 85);

    pctx.fillStyle = '#B67A28';
    pctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`เบิร์น ${Math.round(metrics.caloriesBurned)} kcal`, badgeX + badgeW / 2, badgeY + 115);

    // 5. Three Key Stats Badges (Time, Pace, Calories)
    const statCardsY = 1185;
    const statCardW = 300;
    const statCardH = 185;
    const statGap = 30;

    const cards = [
      {
        icon: '⏱️',
        label: 'เวลาวิ่ง (TIME)',
        value: formatDuration(metrics.elapsedSeconds),
        unit: '',
        color: '#2C2621'
      },
      {
        icon: '⚡',
        label: 'เพซเฉลี่ย (PACE)',
        value: formatPace(metrics.speedKmh > 0.5 ? 60 / metrics.speedKmh : 0),
        unit: '/km',
        color: '#B67A28'
      },
      {
        icon: '🔥',
        label: 'แคลอรี (KCAL)',
        value: `${Math.round(metrics.caloriesBurned)}`,
        unit: 'kcal',
        color: '#B85737'
      }
    ];

    cards.forEach((c, i) => {
      const cx = photoX + i * (statCardW + statGap);
      const cy = statCardsY;

      pctx.fillStyle = '#FFFFFF';
      pctx.beginPath();
      pctx.roundRect(cx, cy, statCardW, statCardH, 20);
      pctx.fill();

      pctx.strokeStyle = '#EBE4DA';
      pctx.lineWidth = 1.2;
      pctx.stroke();

      pctx.textAlign = 'center';
      pctx.textBaseline = 'top';
      pctx.fillStyle = '#8C827A';
      pctx.font = 'bold 14px ui-sans-serif, system-ui, sans-serif';
      pctx.fillText(`${c.icon} ${c.label}`, cx + statCardW / 2, cy + 24);

      pctx.fillStyle = c.color;
      pctx.font = 'bold 36px ui-monospace, monospace';
      pctx.fillText(c.value, cx + statCardW / 2, cy + 68);

      if (c.unit) {
        pctx.fillStyle = '#A0958B';
        pctx.font = 'bold 14px ui-sans-serif, system-ui, sans-serif';
        pctx.fillText(c.unit, cx + statCardW / 2, cy + 124);
      }
    });

    // 6. Journey Route & Story Details Card
    const storyCardY = 1395;
    const storyCardH = 265;
    pctx.fillStyle = '#FFFFFF';
    pctx.beginPath();
    pctx.roundRect(photoX, storyCardY, photoW, storyCardH, 24);
    pctx.fill();

    pctx.strokeStyle = '#EBE4DA';
    pctx.lineWidth = 1.5;
    pctx.stroke();

    pctx.textAlign = 'left';
    pctx.textBaseline = 'top';
    pctx.fillStyle = '#2C2621';
    pctx.font = 'bold 20px "Cinzel", "Playfair Display", Georgia, serif';
    pctx.fillText('JOURNEY MEMORIES • บันทึกการเดินทาง', photoX + 35, storyCardY + 28);

    const curStageCfg = SCENIC_STAGES[getStageForDistance(metrics.distanceMeters)];
    const themeThLabel = 
      theme === 'sakura' ? 'ซากุระสปริง 🌸' : 
      theme === 'countryside' ? 'ชนบทอบอุ่น 🌾' : 
      theme === 'sunset' ? 'ตะวันตกดิน 🌅' : 'ราตรีใต้แสงดาว 🌌';
    const companionThLabel = 
      companion === 'shiba' ? '🐕 ชิบะนำทาง' : 
      companion === 'cat' ? '🐈 แมวส้มแสนซน' : 
      companion === 'bunny' ? '🐇 กระต่ายป่า' : '🏃‍♀️ วิ่งเดี่ยวพิชิตเป้าหมาย';
    const weatherThLabel = 
      weather === 'clear' ? 'แจ่มใส ☀️' : 
      weather === 'rain' ? 'ฝนโปรยปราย 🌧️' : 
      weather === 'mist' ? 'หมอกยามเช้า 🌫️' : 'ใบไม้ร่วง 🍂';

    pctx.fillStyle = '#3B664E';
    pctx.font = 'bold 18px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`📍 เส้นทาง: ${curStageCfg.name} (${curStageCfg.rangeKm})`, photoX + 35, storyCardY + 75);

    pctx.fillStyle = '#5A5047';
    pctx.font = '500 16px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`⛅ บรรยากาศ: ${themeThLabel}  •  สภาพอากาศ: ${weatherThLabel}`, photoX + 35, storyCardY + 118);

    pctx.fillText(`🐾 เพื่อนร่วมทาง: ${companionThLabel}  •  โดย: ${activeProfile.name || 'Mike'}`, photoX + 35, storyCardY + 160);

    pctx.fillStyle = '#8C827A';
    pctx.font = '15px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`⛰️ ไต่ระดับความชัน: ${Math.round(metrics.elevationGainMeters)} m  •  เผาผลาญไขมันบริสุทธิ์: ${metrics.fatGramsBurned.toFixed(0)} g`, photoX + 35, storyCardY + 204);

    // 7. Footer Watermark (Safe from bottom IG text field)
    pctx.textAlign = 'center';
    pctx.fillStyle = '#A0958B';
    pctx.font = 'italic 15px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('Treadmill Studio — Scenic Journey Edition • ออกกำลังกายไม่มีเบื่อ', 540, 1720);
  };

  // Render 3:2 Classic Landscape Postcard (1200 x 800)
  const drawLandscapePostcard = (
    postCanvas: HTMLCanvasElement,
    pctx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement
  ) => {
    postCanvas.width = 1200;
    postCanvas.height = 800;

    // 1. Postcard Base Canvas (Cozy Warm Wabi-Sabi Cream Cardstock #FAF7F2)
    pctx.fillStyle = '#FAF7F2';
    pctx.fillRect(0, 0, 1200, 800);

    // Subtle textured border margin
    pctx.strokeStyle = '#E7DFD5';
    pctx.lineWidth = 2;
    pctx.strokeRect(20, 20, 1160, 760);

    // 2. Main Scenic Photo Inset (Polaroid Snapshot)
    const photoX = 45;
    const photoY = 45;
    const photoW = 1110;
    const photoH = 550;

    // Photo drop shadow
    pctx.save();
    pctx.fillStyle = 'rgba(44, 38, 33, 0.08)';
    pctx.fillRect(photoX + 4, photoY + 4, photoW, photoH);
    pctx.restore();

    // Draw scenic canvas snapshot into photo area
    pctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, photoX, photoY, photoW, photoH);

    // Subtle thin photo inner border
    pctx.strokeStyle = '#D9CFBF';
    pctx.lineWidth = 1;
    pctx.strokeRect(photoX, photoY, photoW, photoH);

    // 3. Traditional Vermilion Red Postal Seal Stamp (Inkan / Hanko)
    const sealX = photoX + photoW - 75;
    const sealY = photoY + 70;
    pctx.save();
    pctx.translate(sealX, sealY);
    pctx.rotate(-0.08);

    pctx.strokeStyle = '#C44536';
    pctx.lineWidth = 2.5;
    pctx.beginPath();
    pctx.roundRect(-55, -45, 110, 90, 8);
    pctx.stroke();

    pctx.lineWidth = 1.2;
    pctx.beginPath();
    pctx.roundRect(-50, -40, 100, 80, 6);
    pctx.stroke();

    pctx.fillStyle = '#C44536';
    pctx.font = '900 13px "Noto Serif JP", serif';
    pctx.textAlign = 'center';
    pctx.textBaseline = 'middle';
    pctx.fillText('🗻 富士山', 0, -18);
    pctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('SCENIC RUN', 0, 4);
    pctx.font = 'bold 8px ui-monospace, monospace';
    pctx.fillText(new Date().toLocaleDateString('ja-JP').replace(/\//g, '.'), 0, 22);
    pctx.restore();

    // 3.5 Phase 3: Goshuin Achievement Seal Stamp (if any unlocked)
    const latestAchId = Array.from(unlockedInSessionRef.current).pop() || getUnlockedAchievementIds(activeProfile.id)[0];
    const latestAch = latestAchId ? ACHIEVEMENT_CATALOG.find((a) => a.id === latestAchId) : null;
    if (latestAch) {
      const achSealX = photoX + 75;
      const achSealY = photoY + 70;
      pctx.save();
      pctx.translate(achSealX, achSealY);
      pctx.rotate(0.06);

      pctx.strokeStyle = '#B3392B';
      pctx.lineWidth = 2.2;
      pctx.beginPath();
      pctx.roundRect(-55, -45, 110, 90, 8);
      pctx.stroke();

      pctx.lineWidth = 1.0;
      pctx.beginPath();
      pctx.roundRect(-50, -40, 100, 80, 6);
      pctx.stroke();

      pctx.fillStyle = '#B3392B';
      pctx.font = 'bold 15px ui-sans-serif, system-ui, sans-serif';
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';
      pctx.fillText(`${latestAch.icon} 達成`, 0, -18);
      pctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
      pctx.fillText(latestAch.title.slice(0, 10), 0, 4);
      pctx.font = 'bold 8px ui-monospace, monospace';
      pctx.fillText('GOSHUIN SEAL', 0, 22);
      pctx.restore();
    }

    // 4. Bottom Metadata Area
    const metaBaseY = 635;
    pctx.fillStyle = '#2C2621';
    pctx.font = 'bold 26px "Cinzel", "Playfair Display", Georgia, serif';
    pctx.textAlign = 'left';
    pctx.textBaseline = 'top';
    pctx.fillText('JOURNEY MEMORIES', 55, metaBaseY);

    pctx.fillStyle = '#7A6E65';
    pctx.font = '500 13px ui-sans-serif, system-ui, sans-serif';
    const curStageCfg = SCENIC_STAGES[getStageForDistance(metrics.distanceMeters)];
    const themeThLabel = theme === 'sakura' ? 'ซากุระสปริง' : theme === 'countryside' ? 'ชนบทอบอุ่น' : theme === 'sunset' ? 'ตะวันตกดิน' : 'ราตรีใต้แสงดาว';
    const companionThLabel = companion === 'shiba' ? '🐕 ชิบะ' : companion === 'cat' ? '🐈 แมวส้ม' : companion === 'bunny' ? '🐇 กระต่าย' : '🏃‍♀️ วิ่งเดี่ยว';
    pctx.fillText(`เส้นทาง: ${curStageCfg.name} (${curStageCfg.rangeKm})  •  บรรยากาศ: ${themeThLabel}  •  เพื่อนร่วมทาง: ${companionThLabel}  •  โดย ${activeProfile.name || 'Athlete'}`, 55, metaBaseY + 36);

    const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    pctx.fillStyle = '#A0958B';
    pctx.font = '11px ui-monospace, monospace';
    pctx.fillText(`บันทึกเมื่อ: ${dateStr}`, 55, metaBaseY + 62);

    // Right Side: 4 Elegant Metric Stat Badges
    const statCardW = 105;
    const statCardH = 68;
    const statCards = [
      { label: 'ระยะทาง', value: `${(metrics.distanceMeters / 1000).toFixed(2)}`, unit: 'km', color: '#3B664E' },
      { label: 'เวลาวิ่ง', value: formatDuration(metrics.elapsedSeconds), unit: '', color: '#2C2621' },
      { label: 'เพซเฉลี่ย', value: formatPace(metrics.speedKmh > 0.5 ? 60 / metrics.speedKmh : 0), unit: '/km', color: '#B67A28' },
      { label: 'แคลอรี', value: `${Math.round(metrics.caloriesBurned)}`, unit: 'kcal', color: '#B85737' }
    ];

    const startStatX = 1200 - 55 - (statCards.length * (statCardW + 12));
    statCards.forEach((c, idx) => {
      const cx = startStatX + idx * (statCardW + 12);
      const cy = metaBaseY;

      pctx.fillStyle = '#FFFFFF';
      pctx.beginPath();
      pctx.roundRect(cx, cy, statCardW, statCardH, 12);
      pctx.fill();

      pctx.strokeStyle = '#EBE4DA';
      pctx.lineWidth = 1.2;
      pctx.stroke();

      pctx.fillStyle = '#8C827A';
      pctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
      pctx.textAlign = 'center';
      pctx.fillText(c.label, cx + statCardW / 2, cy + 18);

      pctx.fillStyle = c.color;
      pctx.font = 'bold 17px ui-monospace, monospace';
      pctx.fillText(c.value, cx + statCardW / 2, cy + 40);

      if (c.unit) {
        pctx.fillStyle = '#A0958B';
        pctx.font = '8px ui-sans-serif, system-ui, sans-serif';
        pctx.fillText(c.unit, cx + statCardW / 2, cy + 54);
      }
    });

    // Bottom Watermark
    pctx.fillStyle = '#C2B7AA';
    pctx.font = 'italic 10px ui-sans-serif, system-ui, sans-serif';
    pctx.textAlign = 'right';
    pctx.fillText('Treadmill Tracker — Scenic Journey Edition', 1140, 765);
  };

  // Render postcard from current snapshot in selected format
  const renderPostcardFromSnapshot = (format: 'story' | 'landscape') => {
    const sourceCanvas = lastSnapshotCanvasRef.current || canvasRef.current;
    if (!sourceCanvas) return;

    setPostcardFormat(format);

    try {
      const postCanvas = document.createElement('canvas');
      const pctx = postCanvas.getContext('2d');
      if (!pctx) return;

      if (format === 'story') {
        drawStoryPostcard(postCanvas, pctx, sourceCanvas);
      } else {
        drawLandscapePostcard(postCanvas, pctx, sourceCanvas);
      }

      const dataUrl = postCanvas.toDataURL('image/png');
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const fileDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      const prefix = format === 'story' ? 'ig-story-running' : 'scenic-postcard';
      const fileName = `${prefix}-${fileDate}.png`;

      setPostcardPreviewUrl(dataUrl);
      setPostcardFileName(fileName);

      postCanvas.toBlob((blob) => {
        if (!blob) return;
        setPostcardBlob(blob);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to render postcard:', err);
    }
  };

  const handleCapturePostcard = (targetFormat?: 'story' | 'landscape') => {
    const canvas = canvasRef.current;
    if (!canvas || isCapturingPostcard) return;

    const format = targetFormat || postcardFormat;

    setIsCapturingPostcard(true);
    hasCapturedPostcardRef.current = true;
    setShowShutterFlash(true);
    setTimeout(() => setShowShutterFlash(false), 320);

    // Save snapshot of current running canvas so user can toggle formats seamlessly
    try {
      const snap = document.createElement('canvas');
      snap.width = canvas.width;
      snap.height = canvas.height;
      const snapCtx = snap.getContext('2d');
      if (snapCtx) snapCtx.drawImage(canvas, 0, 0);
      lastSnapshotCanvasRef.current = snap;
    } catch {}

    renderPostcardFromSnapshot(format);
    setIsCapturingPostcard(false);
  };

  const handleSelectWeather = (w: ScenicWeather) => {
    setWeather(w);
    try {
      localStorage.setItem('scenic_journey_weather', w);
    } catch {}
  };

  // Persistent Canvas Animation State (Never restarts or jumps when metrics/theme update)
  const animStateRef = useRef<{
    groundScroll: number;
    midScroll: number;
    farScroll: number;
    cadencePhase: number;
    lastFootstepPhase: number;
    companionPhase: number;
    windTime: number;
    smoothDistance: number;
    lastTime: number;
    celebrationTimer: number;
    lastWeather: ScenicWeather;
    pacerDistance: number;
    pacerCadencePhase: number;
    trainX: number;
    trainActive: boolean;
    trainCooldown: number;
    trainWhistlePlayed: boolean;
    particles: Particle[];
    ripples: RainRipple[];
  }>({
    groundScroll: 0,
    midScroll: 0,
    farScroll: 0,
    cadencePhase: 0,
    lastFootstepPhase: 0,
    companionPhase: 0,
    windTime: 0,
    smoothDistance: metrics.distanceMeters || 0,
    lastTime: 0,
    celebrationTimer: 0,
    lastWeather: 'clear',
    pacerDistance: 0,
    pacerCadencePhase: 0,
    trainX: -500,
    trainActive: false,
    trainCooldown: 12,
    trainWhistlePlayed: false,
    particles: [],
    ripples: [],
  });

  // Update clock every 10 seconds to auto-transition time periods smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectTheme = (selectedTheme: ScenicTheme) => {
    setIsAutoTheme(false);
    setManualTheme(selectedTheme);
  };

  const handleEnableAutoTheme = () => {
    setIsAutoTheme(true);
  };

  // Pixel Art Image Assets Preloader
  const [, setAssetsLoaded] = useState(false);
  const assetsRef = useRef<{
    runnerRun: HTMLImageElement | null;
    runnerIdle: HTMLImageElement | null;
    bgCloud: HTMLImageElement | null;
    bgFuji: HTMLImageElement | null;
    bgMountains: HTMLImageElement | null;
    bgHills: HTMLImageElement | null;
    bgSunSunset: HTMLImageElement | null;
    bgMoonCrescent: HTMLImageElement | null;
    landmarkCafe: HTMLImageElement | null;
    landmarkSakuraTree: HTMLImageElement | null;
    landmarkTorii: HTMLImageElement | null;
    landmarkWindmill: HTMLImageElement | null;
    propMilestone: HTMLImageElement | null;
    petShiba: HTMLImageElement | null;
    petCat: HTMLImageElement | null;
    petBunny: HTMLImageElement | null;
    encounterDeer: HTMLImageElement | null;
    encounterLantern: HTMLImageElement | null;
    encounterTrain: HTMLImageElement | null;
    encounterUmbrella: HTMLImageElement | null;
    // Stage 2: Kyoto Arashiyama
    bgKyotoBamboo: HTMLImageElement | null;
    bgKyotoPagoda: HTMLImageElement | null;
    landmarkKyotoGate: HTMLImageElement | null;
    encounterTanuki: HTMLImageElement | null;
    stampKyoto: HTMLImageElement | null;
    // Stage 3: Hokkaido Biei
    bgHokkaidoSnow: HTMLImageElement | null;
    bgHokkaidoLavender: HTMLImageElement | null;
    landmarkHokkaidoBarn: HTMLImageElement | null;
    encounterHokkaidoCow: HTMLImageElement | null;
    stampHokkaido: HTMLImageElement | null;
    // Stage 4: Neo-Tokyo Twilight
    bgTokyoTower: HTMLImageElement | null;
    bgTokyoSkyline: HTMLImageElement | null;
    landmarkTokyoYatai: HTMLImageElement | null;
    encounterTokyoCat: HTMLImageElement | null;
    stampTokyo: HTMLImageElement | null;
  }>({
    runnerRun: null,
    runnerIdle: null,
    bgCloud: null,
    bgFuji: null,
    bgMountains: null,
    bgHills: null,
    bgSunSunset: null,
    bgMoonCrescent: null,
    landmarkCafe: null,
    landmarkSakuraTree: null,
    landmarkTorii: null,
    landmarkWindmill: null,
    propMilestone: null,
    petShiba: null,
    petCat: null,
    petBunny: null,
    encounterDeer: null,
    encounterLantern: null,
    encounterTrain: null,
    encounterUmbrella: null,
    bgKyotoBamboo: null,
    bgKyotoPagoda: null,
    landmarkKyotoGate: null,
    encounterTanuki: null,
    stampKyoto: null,
    bgHokkaidoSnow: null,
    bgHokkaidoLavender: null,
    landmarkHokkaidoBarn: null,
    encounterHokkaidoCow: null,
    stampHokkaido: null,
    bgTokyoTower: null,
    bgTokyoSkyline: null,
    landmarkTokyoYatai: null,
    encounterTokyoCat: null,
    stampTokyo: null,
  });

  useEffect(() => {
    const loadImg = (src: string): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      });
    };

    const loadAllAssets = async () => {
      try {
        const [
          runnerRun,
          runnerIdle,
          bgCloud,
          bgFuji,
          bgMountains,
          bgHills,
          bgSunSunset,
          bgMoonCrescent,
          landmarkCafe,
          landmarkSakuraTree,
          landmarkTorii,
          landmarkWindmill,
          propMilestone,
          petShiba,
          petCat,
          petBunny,
          encounterDeer,
          encounterLantern,
          encounterTrain,
          encounterUmbrella,
          bgKyotoBamboo,
          bgKyotoPagoda,
          landmarkKyotoGate,
          encounterTanuki,
          stampKyoto,
          bgHokkaidoSnow,
          bgHokkaidoLavender,
          landmarkHokkaidoBarn,
          encounterHokkaidoCow,
          stampHokkaido,
          bgTokyoTower,
          bgTokyoSkyline,
          landmarkTokyoYatai,
          encounterTokyoCat,
          stampTokyo,
        ] = await Promise.all([
          loadImg('/assets/scenic/runner-female-run.png'),
          loadImg('/assets/scenic/runner-female-idle.png'),
          loadImg('/assets/scenic/bg-cloud.png'),
          loadImg('/assets/scenic/bg-mountain-fuji.png'),
          loadImg('/assets/scenic/bg-mountains-distant.png'),
          loadImg('/assets/scenic/bg-hills-green.png'),
          loadImg('/assets/scenic/bg-sun-sunset.png'),
          loadImg('/assets/scenic/bg-moon-crescent.png'),
          loadImg('/assets/scenic/landmark-cafe-kiosk.png'),
          loadImg('/assets/scenic/landmark-sakura-tree.png'),
          loadImg('/assets/scenic/landmark-torii-gate.png'),
          loadImg('/assets/scenic/landmark-windmill.png'),
          loadImg('/assets/scenic/prop-milestone-post.png'),
          loadImg('/assets/scenic/pet-shiba-run.png'),
          loadImg('/assets/scenic/pet-cat-run.png'),
          loadImg('/assets/scenic/pet-bunny-hop.png'),
          loadImg('/assets/scenic/encounter-deer.png'),
          loadImg('/assets/scenic/encounter-lantern.png'),
          loadImg('/assets/scenic/encounter-train.png'),
          loadImg('/assets/scenic/encounter-umbrella.png'),
          loadImg('/assets/scenic/bg-hills-kyoto-bamboo.png'),
          loadImg('/assets/scenic/bg-landmark-kyoto-pagoda.png'),
          loadImg('/assets/scenic/landmark-kyoto-shrine-gate.png'),
          loadImg('/assets/scenic/encounter-tanuki-spirit.png'),
          loadImg('/assets/scenic/stamp-kyoto-arashiyama.png'),
          loadImg('/assets/scenic/bg-mountains-hokkaido-snow.png?v=20261102c'),
          loadImg('/assets/scenic/bg-hills-hokkaido-lavender.png?v=20261102c'),
          loadImg('/assets/scenic/landmark-hokkaido-barn-windmill.png'),
          loadImg('/assets/scenic/encounter-hokkaido-cow.png'),
          loadImg('/assets/scenic/stamp-hokkaido-biei.png'),
          loadImg('/assets/scenic/bg-landmark-tokyo-tower.png'),
          loadImg('/assets/scenic/bg-skyline-tokyo-retro.png'),
          loadImg('/assets/scenic/landmark-tokyo-yatai-ramen.png'),
          loadImg('/assets/scenic/encounter-tokyo-mailbox-cat.png'),
          loadImg('/assets/scenic/stamp-tokyo-shinjuku.png'),
        ]);

        assetsRef.current = {
          runnerRun,
          runnerIdle,
          bgCloud,
          bgFuji,
          bgMountains,
          bgHills,
          bgSunSunset,
          bgMoonCrescent,
          landmarkCafe,
          landmarkSakuraTree,
          landmarkTorii,
          landmarkWindmill,
          propMilestone,
          petShiba,
          petCat,
          petBunny,
          encounterDeer,
          encounterLantern,
          encounterTrain,
          encounterUmbrella,
          bgKyotoBamboo,
          bgKyotoPagoda,
          landmarkKyotoGate,
          encounterTanuki,
          stampKyoto,
          bgHokkaidoSnow,
          bgHokkaidoLavender,
          landmarkHokkaidoBarn,
          encounterHokkaidoCow,
          stampHokkaido,
          bgTokyoTower,
          bgTokyoSkyline,
          landmarkTokyoYatai,
          encounterTokyoCat,
          stampTokyo,
        };
        setAssetsLoaded(true);
      } catch (err) {
        console.warn('Failed to load some scenic assets:', err);
      }
    };

    loadAllAssets();
  }, []);

  // Target values for local quick controls
  const defaultStartSpeed = activeProfile?.defaultStartSpeed ?? 3.0;
  const [targetSpeed, setTargetSpeed] = useState<number>(() => metrics.speedKmh > 0 ? metrics.speedKmh : defaultStartSpeed);
  const [targetIncline, setTargetIncline] = useState<number>(metrics.inclineLevel);
  const lastActionTimeRef = useRef<number>(0);

  // Milestone toast notifications
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
  const lastMilestoneKmRef = useRef<number>(0);

  // Ambient Web Audio synth generator for calming footsteps/breeze
  const ambientAudioCtxRef = useRef<AudioContext | null>(null);

  // Sync targetSpeed and targetIncline when treadmill metrics update
  useEffect(() => {
    if (Date.now() - lastActionTimeRef.current > 2500 && metrics.speedKmh > 0.5) {
      setTargetSpeed(metrics.speedKmh);
    }
  }, [metrics.speedKmh]);

  useEffect(() => {
    if (Date.now() - lastActionTimeRef.current > 2500) {
      setTargetIncline(metrics.inclineLevel);
    }
  }, [metrics.inclineLevel]);

  // Cheerful Arpeggio Chime Fanfare on milestone reached (C5 -> E5 -> G5 -> C6)
  const playCelebrationFanfare = () => {
    if (!soundEnabled) return;
    try {
      if (!ambientAudioCtxRef.current) {
        const AudioClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioClass) ambientAudioCtxRef.current = new AudioClass();
      }
      const ctx = ambientAudioCtxRef.current;
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const startTime = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const noteStart = startTime + idx * 0.11;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);
        gain.gain.setValueAtTime(0.05, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteStart);
        osc.stop(noteStart + 0.3);
      });
    } catch {
      // Audio context may fail if user hasn't interacted with document
    }
  };

  // Milestone banner check (every 500m / 0.5km)
  useEffect(() => {
    const currentKm = metrics.distanceMeters / 1000;
    const reachedHalfKm = Math.floor(currentKm * 2) / 2;
    if (reachedHalfKm > 0 && reachedHalfKm > lastMilestoneKmRef.current) {
      lastMilestoneKmRef.current = reachedHalfKm;
      
      const landmarks: Record<string, string> = {
        '0.5': '☕ ผ่านซุ้มชากาแฟอุ่นริมทาง (0.5 km)',
        '1': '🌸 ข้ามสะพานไม้ธารน้ำซากุระ (1.0 km)',
        '1.5': '🏡 ผ่านหมู่บ้านชนบทอันเงียบสงบ (1.5 km)',
        '2': '🌾 ทุ่งดอกไม้บานสะพรั่ง (2.0 km)',
        '2.5': '⛩️ ข้ามสู่ดินแดนเก่าแก่: เกียวโต อาราชิยามะ (2.5 km)',
        '3': '🎋 ป่าไผ่เขียวขจีและซุ้มประตูศาลเจ้า (3.0 km)',
        '3.5': '🍃 กลิ่นอายบ้านไม้โบราณมาจิยะ (3.5 km)',
        '4': '🦌 สวนกวางและตะเกียงหินโบราณ (4.0 km)',
        '4.5': '🍵 ซุ้มชาเขียวมัทฉะเกียวโต (4.5 km)',
        '5': '🌸 ข้ามสู่แดนสวรรค์: ฮอกไกโด ทุ่งดอกไม้บิเอะ (5.0 km)',
        '5.5': '🌾 ทุ่งลาเวนเดอร์สีม่วงทอดยาว (5.5 km)',
        '6': '🐄 โรงนาโบราณและฟาร์มโคนมฮอกไกโด (6.0 km)',
        '6.5': '🏔️ วิวเทือกเขาหิมะไดเซ็ตสึซัง (6.5 km)',
        '7': '🌻 เนินเขาดอกทานตะวันสีทอง (7.0 km)',
        '7.5': '🏙️ ข้ามสู่มหานครนีออน: โตเกียวเรโทรยามราตรี (7.5 km)',
        '8': '🏮 ร้านราเมนรถเข็นยาไตส่งควันหอม (8.0 km)',
        '8.5': '🗼 แสงไฟอบอุ่นโตเกียวทาวเวอร์ (8.5 km)',
        '9': '🎶 บรรยากาศ Lo-Fi Citypop คืนที่งดงาม (9.0 km)',
        '9.5': '🐈‍⬛ ตู้ไปรษณีย์แดงเรโทรชินจูกุ (9.5 km)',
        '10': '🏆 พิชิต 10.0 KM มหานครโตเกียวสมบูรณ์แบบ!'
      };

      const landmarkMsg = landmarks[String(reachedHalfKm)] || `🚩 ถึงหลักกิโลเมตรที่ ${reachedHalfKm.toFixed(1)} km!`;
      setMilestoneToast(landmarkMsg);

      // Trigger Joyful Pet Hop and floating celebration hearts in canvas
      animStateRef.current.celebrationTimer = 4.0;
      if (soundEnabled) {
        playCelebrationFanfare();
      }

      const timer = setTimeout(() => setMilestoneToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [metrics.distanceMeters, soundEnabled]);

  // Phase 1: Real-time Steam-Style Achievement Unlock Engine
  useEffect(() => {
    if (!isOpen) return;

    if (metrics.speedKmh > maxSpeedReachedRef.current) {
      maxSpeedReachedRef.current = metrics.speedKmh;
    }

    const sessionState = {
      pacerDeltaMeters: pacerDeltaDisplay,
      pacerEnabled: pacerEnabled,
      weather: weather,
      isZenMode: zenMode,
      hasCapturedPostcard: hasCapturedPostcardRef.current,
      maxSpeedKmh: maxSpeedReachedRef.current,
      encounteredDeer: encounteredDeerRef.current,
      encounteredLantern: encounteredLanternRef.current,
      encounteredTrain: encounteredTrainRef.current,
      encounteredTanuki: encounteredTanukiRef.current,
      encounteredCow: encounteredCowRef.current,
      encounteredMailboxCat: encounteredMailboxCatRef.current,
    };

    // Stage Transition Check (Kamakura -> Kyoto -> Hokkaido -> Tokyo)
    const currentStageId = getStageForDistance(metrics.distanceMeters);
    if (currentStageId !== lastAcknowledgedStageRef.current) {
      lastAcknowledgedStageRef.current = currentStageId;
      const stageCfg = SCENIC_STAGES[currentStageId];
      setActiveStageTransition({
        stage: stageCfg,
        timestamp: Date.now(),
      });
      if (soundEnabled) {
        playSteamAchievementChime(ambientAudioCtxRef.current);
      }
      try {
        audioCoach.speak(`เข้าสู่เส้นทาง ${stageCfg.name}`);
      } catch {}

      // Auto dismiss after 6.5 seconds
      setTimeout(() => {
        setActiveStageTransition((prev) => (prev?.stage.id === stageCfg.id ? null : prev));
      }, 6500);
    }

    const newlyUnlocked: AchievementItem[] = [];
    const persistentUnlocked = new Set(getUnlockedAchievementIds(activeProfile.id));

    for (const ach of ACHIEVEMENT_CATALOG) {
      if (persistentUnlocked.has(ach.id) || unlockedInSessionRef.current.has(ach.id)) continue;

      try {
        if (ach.checkUnlock(metrics, sessionState)) {
          unlockedInSessionRef.current.add(ach.id);
          saveUnlockedAchievementId(ach.id, activeProfile.id);
          newlyUnlocked.push(ach);
        }
      } catch (err) {
        console.error('Error checking achievement:', ach.id, err);
      }
    }

    if (newlyUnlocked.length > 0) {
      setAchievementQueue((prev) => [...prev, ...newlyUnlocked]);
      setUnlockedCount(getUnlockedAchievementIds(activeProfile.id).length);

      // Trigger signature Steam double bell chime!
      if (soundEnabled) {
        playSteamAchievementChime(ambientAudioCtxRef.current);
      }
    }
  }, [
    metrics,
    pacerDeltaDisplay,
    pacerEnabled,
    weather,
    zenMode,
    isOpen,
    soundEnabled,
    activeProfile.id
  ]);

  // Soft footstep sound synthesis synchronized with runner cadence
  const playFootstepTone = () => {
    if (!soundEnabled) return;
    try {
      if (!ambientAudioCtxRef.current) {
        const AudioClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioClass) ambientAudioCtxRef.current = new AudioClass();
      }
      const ctx = ambientAudioCtxRef.current;
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Low thud like soft footstep on treadmill deck
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Audio context may fail if no user gesture yet
    }
  };

  // Canvas Animation Engine
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    animStateRef.current.lastTime = performance.now();

    const getParticleColor = (curTheme: string, curWeather: ScenicWeather) => {
      if (curWeather === 'autumn') {
        const autumnColors = ['#D32F2F', '#E64A19', '#F57C00', '#FFA000', '#C2185B', '#8D6E63'];
        return autumnColors[Math.floor(Math.random() * autumnColors.length)];
      }
      if (curWeather === 'rain') {
        return curTheme === 'night' ? 'rgba(165, 205, 240, 0.65)' : 'rgba(140, 195, 235, 0.7)';
      }
      if (curWeather === 'mist') {
        return 'rgba(255, 255, 255, 0.25)';
      }
      if (curTheme === 'countryside') return Math.random() > 0.5 ? 'rgba(235, 179, 90, 0.7)' : 'rgba(168, 204, 168, 0.7)';
      if (curTheme === 'sunset') return 'rgba(255, 214, 165, 0.75)';
      if (curTheme === 'night') return 'rgba(255, 245, 157, 0.85)'; // Firefly glow
      return 'rgba(255, 183, 197, 0.7)'; // Sakura pink
    };

    const createParticle = (width: number, height: number, curTheme: string, curWeather: ScenicWeather): Particle => {
      if (curWeather === 'rain') {
        return {
          x: Math.random() * (width + 150),
          y: Math.random() * height,
          vx: -(2.5 + Math.random() * 2.5),
          vy: 14 + Math.random() * 8,
          size: 14 + Math.random() * 12,
          rotation: 0,
          rotSpeed: 0,
          alpha: 0.35 + Math.random() * 0.45,
          color: getParticleColor(curTheme, curWeather),
          type: 'rain',
        };
      }
      if (curWeather === 'autumn') {
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: -(1.8 + Math.random() * 2.8),
          vy: 0.8 + Math.random() * 1.5,
          size: 6 + Math.random() * 6,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.08,
          alpha: 0.6 + Math.random() * 0.4,
          color: getParticleColor(curTheme, curWeather),
          type: 'autumn',
        };
      }
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: -(1.5 + Math.random() * 2.5),
        vy: 0.4 + Math.random() * 1.2,
        size: curTheme === 'night' ? 2 + Math.random() * 2.5 : 5 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.06,
        alpha: 0.3 + Math.random() * 0.7,
        color: getParticleColor(curTheme, curWeather),
        type: 'default',
      };
    };

    const handleResize = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = container.clientWidth;
      const height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Re-seed particles to screen boundaries if empty
      const state = animStateRef.current;
      const curTheme = themeRef.current;
      const curWeather = weatherRef.current;
      const maxParticles = curWeather === 'rain' ? 85 : curWeather === 'autumn' ? 55 : (curTheme === 'night' ? 70 : 45);
      if (state.particles.length === 0) {
        for (let i = 0; i < maxParticles; i++) {
          state.particles.push(createParticle(width, height, curTheme, curWeather));
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    /**
     * Smart Sprite Drawer:
     * If image is a 256x256 PixelLab sprite sheet grid (e.g. 8x8, 4x4, 2x2),
     * automatically slices out exactly 1 single sprite cell!
     * If the user later uploads a true single-sprite image, draws whole image.
     */
    const drawSprite = (
      image: HTMLImageElement,
      defaultCols: number,
      defaultRows: number,
      cellCol: number,
      cellRow: number,
      dx: number,
      dy: number,
      dw: number,
      dh: number
    ) => {
      const isSheet = image.naturalWidth >= 200;
      const cols = isSheet ? defaultCols : 1;
      const rows = isSheet ? defaultRows : 1;
      const sw = image.naturalWidth / cols;
      const sh = image.naturalHeight / rows;
      const sx = (cellCol % cols) * sw;
      const sy = (cellRow % rows) * sh;
      ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    };

    // ==========================================
    // MAIN RENDER LOOP (60 FPS)
    // ==========================================
    const render = (currentTime: number) => {
      const state = animStateRef.current;
      const metrics = metricsRef.current;
      const theme = themeRef.current;
      const companion = companionRef.current;
      const soundEnabled = soundEnabledRef.current;

      const dt = Math.min((currentTime - state.lastTime) / 1000, 0.1);
      state.lastTime = currentTime;
      state.windTime += dt;
      const windTime = state.windTime;

      // Milestone celebration timer countdown
      if (state.celebrationTimer > 0) {
        state.celebrationTimer = Math.max(0, state.celebrationTimer - dt);
      }
      const isCelebrating = state.celebrationTimer > 0;
      const width = canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
      const height = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
      const curWeather = weatherRef.current;

      // Re-seed particles if weather mode switched
      if (state.lastWeather !== curWeather) {
        state.lastWeather = curWeather;
        state.particles = [];
        const maxParticles = curWeather === 'rain' ? 85 : curWeather === 'autumn' ? 55 : (theme === 'night' ? 70 : 45);
        for (let i = 0; i < maxParticles; i++) {
          state.particles.push(createParticle(width, height, theme, curWeather));
        }
      }

      const assets = assetsRef.current;
      ctx.imageSmoothingEnabled = false;

      // Speed factor based on treadmill speed or simulated test speed
      const simSpeed = simulatedSpeedRef.current;
      const speed = simSpeed > 0 ? simSpeed : metrics.speedKmh;
      const isMoving = speed > 0.15;

      // 1. Continuous Distance Tracking (Never freezes or teleports landmarks)
      if (previewDistanceRef.current !== null) {
        state.smoothDistance = previewDistanceRef.current;
        previewDistanceRef.current = null;
      } else if (isMoving) {
        state.smoothDistance += (speed / 3.6) * dt;
      }

      if (metrics.distanceMeters > 0 && simSpeed === 0 && previewStageIdRef.current === null) {
        const distDiff = metrics.distanceMeters - state.smoothDistance;
        if (Math.abs(distDiff) > 25) {
          state.smoothDistance = metrics.distanceMeters;
        } else {
          state.smoothDistance += distDiff * Math.min(1.0, dt * 2.5);
        }
      }
      const currentDistanceMeters = state.smoothDistance;

      // Phase 4: Virtual Ghost Pacer Distance & Cadence
      const pacerEnabled = pacerEnabledRef.current;
      const pacerSpeed = pacerSpeedRef.current;
      if (pacerEnabled && (isMoving || speed > 0.1)) {
        state.pacerDistance += (pacerSpeed / 3.6) * dt;
        const pacerCadence = 2.5 + (pacerSpeed - 6.0) * 0.12;
        state.pacerCadencePhase += dt * pacerCadence * Math.PI * 2;
        if (state.pacerCadencePhase > 20000 * Math.PI) state.pacerCadencePhase %= 2 * Math.PI;
      }
      const pacerDeltaMeters = state.smoothDistance - state.pacerDistance;

      if (Math.floor(windTime * 4) !== Math.floor((windTime - dt) * 4)) {
        setPacerDeltaDisplay(pacerDeltaMeters);
      }

      // 2. Continuous Parallax Scrolling (Zero seams, zero hitching)
      const roadSpeed = isMoving ? speed * 22 : 0;
      state.groundScroll += roadSpeed * dt;
      if (state.groundScroll > 44000) state.groundScroll %= 44;
      const groundScroll = state.groundScroll;

      const hillSpeed = isMoving ? speed * 8.5 + 2.0 : 2.0;
      state.midScroll += hillSpeed * dt;
      if (state.midScroll > 960000) state.midScroll %= 960;
      const midScroll = state.midScroll;

      const mountainSpeed = isMoving ? speed * 2.6 + 0.8 : 0.8;
      state.farScroll += mountainSpeed * dt;
      if (state.farScroll > 1000000) state.farScroll %= 1000;
      const farScroll = state.farScroll;

      // Incline slope calculation (0 to 20 level -> 0° to 12° slope)
      const inclineAngle = (Math.min(20, metrics.inclineLevel) / 20) * (10 * Math.PI / 180);

      // Cadence calculation: steps per second
      const stepRate = isMoving ? Math.min(4.0, 1.3 + (speed / 10) * 1.8) : 0;
      if (isMoving) {
        state.cadencePhase += dt * stepRate * Math.PI * 2;
        state.companionPhase += dt * (stepRate * 1.15) * Math.PI * 2;
        if (state.cadencePhase > 20000 * Math.PI) state.cadencePhase %= 2 * Math.PI;
        if (state.companionPhase > 20000 * Math.PI) state.companionPhase %= 2 * Math.PI;

        // Trigger footstep sound at bottom of stride
        const currentHalf = Math.floor(state.cadencePhase / Math.PI);
        if (currentHalf > state.lastFootstepPhase) {
          state.lastFootstepPhase = currentHalf;
          if (soundEnabled) {
            playFootstepTone();
          }
        }
      }
      const cadencePhase = state.cadencePhase;
      const companionPhase = state.companionPhase;

      ctx.clearRect(0, 0, width, height);

      // ------------------------------------------
      // 1. SKY GRADIENT
      // ------------------------------------------
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (theme === 'sakura') {
        skyGrad.addColorStop(0, '#E1ECF4'); // Soft powder blue
        skyGrad.addColorStop(0.5, '#F7EDF0'); // Pale petal pink
        skyGrad.addColorStop(1, '#FAF7F2'); // Warm oat horizon
      } else if (theme === 'countryside') {
        skyGrad.addColorStop(0, '#D4EBF8'); // Crisp morning sky
        skyGrad.addColorStop(0.6, '#F8F6EB'); // Sunny cream
        skyGrad.addColorStop(1, '#EFE8D8'); // Gentle hill base
      } else if (theme === 'sunset') {
        skyGrad.addColorStop(0, '#4A334B'); // Plum dusk
        skyGrad.addColorStop(0.35, '#C46849'); // Terracotta warm glow
        skyGrad.addColorStop(0.7, '#E9A668'); // Golden apricot
        skyGrad.addColorStop(1, '#F7E7CD'); // Warm sand
      } else {
        // Night
        skyGrad.addColorStop(0, '#0F1A24'); // Midnight indigo
        skyGrad.addColorStop(0.5, '#1B2C3B'); // Soft navy
        skyGrad.addColorStop(1, '#27384A'); // Atmospheric horizon
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // ------------------------------------------
      // 2. CELESTIAL BODY (Sun / Moon / Stars)
      // ------------------------------------------
      if (theme === 'night') {
        // Multi-tier Twinkling Stars & Cross-Sparkle Stars (Phase 2)
        for (let i = 0; i < 50; i++) {
          const starX = ((i * 73 + 29) % 1000) * (width / 1000);
          const starY = ((i * 47 + 13) % 400) * ((height * 0.48) / 400);
          const twinkleFreq = 1.4 + (i % 5) * 0.7;
          const starAlpha = 0.25 + 0.65 * Math.abs(Math.sin(windTime * twinkleFreq + i * 1.7));
          
          ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
          ctx.beginPath();
          ctx.arc(starX, starY, (i % 4 === 0 ? 1.8 : 1.1), 0, Math.PI * 2);
          ctx.fill();

          // Special 4-point diamond sparkles for brightest stars
          if (i % 7 === 0 && starAlpha > 0.6) {
            ctx.save();
            ctx.strokeStyle = `rgba(215, 235, 255, ${starAlpha * 0.75})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(starX - 4, starY); ctx.lineTo(starX + 4, starY);
            ctx.moveTo(starX, starY - 4); ctx.lineTo(starX, starY + 4);
            ctx.stroke();
            ctx.restore();
          }
        }
        // Glowing Crescent Moon
        const moonX = width * 0.82;
        const moonY = height * 0.18;
        ctx.fillStyle = 'rgba(255, 248, 200, 0.15)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 44, 0, Math.PI * 2);
        ctx.fill();

        if (assets.bgMoonCrescent) {
          // PixelLab moon is an 8x8 sheet of 32x32 cells (cell 0,0 is a single crisp golden crescent moon)
          drawSprite(assets.bgMoonCrescent, 8, 8, 0, 0, moonX - 28, moonY - 28, 56, 56);
        } else {
          ctx.fillStyle = '#FFF8D6';
          ctx.beginPath();
          ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#14212E';
          ctx.beginPath();
          ctx.arc(moonX - 10, moonY - 6, 26, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (theme === 'sunset') {
        // Large Golden Setting Sun
        const sunX = width * 0.72;
        const sunY = height * 0.40;
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 90);
        sunGlow.addColorStop(0, 'rgba(255, 220, 150, 0.9)');
        sunGlow.addColorStop(0.5, 'rgba(235, 120, 75, 0.35)');
        sunGlow.addColorStop(1, 'rgba(235, 120, 75, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
        ctx.fill();

        if (assets.bgSunSunset) {
          const sunSize = 100;
          drawSprite(assets.bgSunSunset, 4, 4, 0, 0, sunX - sunSize / 2, sunY - sunSize / 2, sunSize, sunSize);
        } else {
          ctx.fillStyle = '#FFF2D6';
          ctx.beginPath();
          ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Gentle Warm Morning Sun with Soft Halo
        const sunX = width * 0.78;
        const sunY = height * 0.18;
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 70);
        sunGlow.addColorStop(0, 'rgba(255, 245, 220, 0.8)');
        sunGlow.addColorStop(0.6, 'rgba(255, 230, 180, 0.25)');
        sunGlow.addColorStop(1, 'rgba(255, 230, 180, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFDF7';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // ------------------------------------------
      // 3. CLOUDS (Parallax Layer Far)
      // ------------------------------------------
      ctx.fillStyle = theme === 'night' 
        ? 'rgba(40, 58, 77, 0.4)' 
        : theme === 'sunset' 
        ? 'rgba(255, 200, 170, 0.45)' 
        : 'rgba(255, 255, 255, 0.75)';

      const drawCloud = (cx: number, cy: number, scale: number) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 22 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 25 * scale, cy - 10 * scale, 30 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 60 * scale, cy - 5 * scale, 24 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 85 * scale, cy + 2 * scale, 18 * scale, 0, Math.PI * 2);
        ctx.fill();
      };

      for (let i = 0; i < 4; i++) {
        const cloudX = ((i * 340 - farScroll * 1.5) % (width + 300) + width + 300) % (width + 300) - 150;
        const cloudY = height * (0.07 + (i % 2) * 0.1);
        const cloudScale = 0.85 + (i % 3) * 0.25;

        if (assets.bgCloud) {
          const cw = 110 * cloudScale;
          const ch = 110 * cloudScale;
          ctx.save();
          if (theme === 'night') ctx.globalAlpha = 0.45;
          else if (theme === 'sunset') ctx.globalAlpha = 0.85;
          // Single isolated fluffy cloud asset (256x256)
          ctx.drawImage(assets.bgCloud, cloudX, cloudY, cw, ch);
          ctx.restore();
        } else {
          drawCloud(cloudX, cloudY, cloudScale);
        }
      }

      // ------------------------------------------
      // 4. DISTANT MOUNTAINS & SACRED MOUNT FUJI / SKY LANDMARK
      // ------------------------------------------
      const curStageId = previewStageIdRef.current || getStageForDistance(currentDistanceMeters);
      const mountainY = height * 0.58;

      // Atmospheric distant mountain base fill
      const farMountainBaseColor = curStageId === 'tokyo'
        ? (theme === 'night' ? '#141829' : '#312B45')
        : curStageId === 'kyoto'
        ? (theme === 'night' ? '#181A22' : '#73574A')
        : curStageId === 'hokkaido'
        ? (theme === 'night' ? '#151D2A' : '#9EB5C7')
        : (theme === 'night' ? '#162232' : theme === 'sunset' ? '#6E3E40' : theme === 'sakura' ? '#C2C8DE' : '#B4C9BC');
      ctx.fillStyle = farMountainBaseColor;
      ctx.fillRect(-50, mountainY, width + 100, height - mountainY);

      // A. Distant Sky Landmark (Fuji / Kyoto Pagoda / Tokyo Tower)
      const skyLandmarkX = ((width * 0.42 - farScroll * 0.4) % (width + 500) + width + 500) % (width + 500) - 150;
      const skyLandmarkBaseY = height * 0.68;

      if (curStageId === 'kamakura') {
        if (assets.bgFuji) {
          const fujiDrawW = 460;
          const fujiDrawH = 460;
          const fujiDrawX = skyLandmarkX - fujiDrawW / 2;
          const fujiDrawY = skyLandmarkBaseY - fujiDrawH * 0.92;

          ctx.save();
          if (theme === 'night') {
            ctx.filter = 'brightness(0.68) saturate(0.85) hue-rotate(-10deg)';
          } else if (theme === 'sunset') {
            ctx.filter = 'brightness(0.95) saturate(1.15) hue-rotate(-8deg)';
          }
          ctx.drawImage(assets.bgFuji, fujiDrawX, fujiDrawY, fujiDrawW, fujiDrawH);

          // Phase 2: Diamond Shimmer on Mount Fuji's Snowy Summit
          const shimmerT = (windTime * 1.2) % 7.0;
          if (shimmerT < 1.0) {
            const sProgress = shimmerT / 1.0;
            const sAlpha = Math.sin(sProgress * Math.PI) * (theme === 'night' ? 0.7 : 0.95);
            const sX = fujiDrawX + fujiDrawW * 0.48;
            const sY = fujiDrawY + fujiDrawH * 0.22;
            ctx.save();
            ctx.fillStyle = theme === 'night' ? `rgba(200, 230, 255, ${sAlpha})` : `rgba(255, 255, 255, ${sAlpha})`;
            ctx.beginPath();
            ctx.arc(sX, sY, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = theme === 'night' ? `rgba(200, 230, 255, ${sAlpha * 0.8})` : `rgba(255, 255, 255, ${sAlpha * 0.8})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sX - 7, sY); ctx.lineTo(sX + 7, sY);
            ctx.moveTo(sX, sY - 7); ctx.lineTo(sX, sY + 7);
            ctx.stroke();
            ctx.restore();
          }
          ctx.restore();
        }
      } else if (curStageId === 'kyoto') {
        if (assets.bgKyotoPagoda) {
          const pagodaW = 340;
          const pagodaH = 354;
          const pagodaX = skyLandmarkX - pagodaW / 2;
          const pagodaY = skyLandmarkBaseY - pagodaH * 0.88;
          ctx.save();
          if (theme === 'night') {
            ctx.filter = 'brightness(0.68) saturate(0.85) hue-rotate(-10deg)';
          } else if (theme === 'sunset') {
            ctx.filter = 'brightness(0.95) saturate(1.15) hue-rotate(-8deg)';
          }
          ctx.drawImage(assets.bgKyotoPagoda, pagodaX, pagodaY, pagodaW, pagodaH);
          ctx.restore();
        }
      } else if (curStageId === 'tokyo') {
        if (assets.bgTokyoTower) {
          const towerW = 210;
          const towerH = 415;
          const towerX = skyLandmarkX - towerW / 2;
          const towerY = skyLandmarkBaseY - towerH * 0.95;
          ctx.save();
          const haloGrad = ctx.createRadialGradient(towerX + towerW / 2, towerY + towerH * 0.35, 10, towerX + towerW / 2, towerY + towerH * 0.35, 120);
          haloGrad.addColorStop(0, 'rgba(255, 160, 60, 0.28)');
          haloGrad.addColorStop(1, 'rgba(255, 120, 30, 0)');
          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.arc(towerX + towerW / 2, towerY + towerH * 0.35, 120, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(assets.bgTokyoTower, towerX, towerY, towerW, towerH);
          ctx.restore();
        }
      }

      // B. Distant Mountain Ridge Layer (Seamless 1536x384 parallax strip in front of Fuji)
      // Solid 100% opacity to completely block what is behind!
      const curMountainImg = curStageId === 'hokkaido'
        ? (assets.bgHokkaidoSnow || assets.bgMountains)
        : assets.bgMountains;

      if (curMountainImg) {
        const mDrawW = 1000;
        const mDrawH = 250;
        const startX = -((farScroll * 0.6) % mDrawW);
        ctx.save();
        if (theme === 'night') {
          ctx.filter = 'brightness(0.65) saturate(0.85) hue-rotate(-10deg)';
        } else if (theme === 'sunset') {
          ctx.filter = 'brightness(0.92) saturate(1.15) hue-rotate(-8deg)';
        }
        // Overlap by 1px to guarantee zero seam gap (100% opaque!)
        for (let mx = startX - mDrawW; mx < width + mDrawW; mx += mDrawW - 1) {
          ctx.drawImage(curMountainImg, mx, mountainY - 145, mDrawW, mDrawH);
        }
        ctx.restore();
      }

      // Phase 2: Rolling Mountain Mist Wave (when weather === 'mist')
      if (curWeather === 'mist') {
        ctx.save();
        const mistGrad = ctx.createLinearGradient(0, mountainY - 50, 0, mountainY + 70);
        mistGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        mistGrad.addColorStop(0.5, theme === 'night' ? 'rgba(180, 205, 230, 0.16)' : 'rgba(255, 255, 255, 0.25)');
        mistGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = mistGrad;
        ctx.beginPath();
        ctx.moveTo(-50, mountainY + 80);
        for (let mx = -50; mx <= width + 50; mx += 35) {
          const my = mountainY - 20 + Math.sin((mx + windTime * 22) * 0.006) * 16;
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(width + 50, mountainY + 80);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // ------------------------------------------
      // 5. MID-GROUND ROLLING GREEN HILLS & MEADOW
      // ------------------------------------------
      const midHillY = height * 0.67;

      // Solid meadow base fill down to road
      const meadowBaseColor = curStageId === 'tokyo'
        ? (theme === 'night' ? '#181524' : '#2A2438')
        : curStageId === 'kyoto'
        ? (theme === 'night' ? '#1A1816' : '#5A4634')
        : curStageId === 'hokkaido'
        ? (theme === 'night' ? '#1B221E' : '#4E6847')
        : (theme === 'night' ? '#172720' : theme === 'sunset' ? '#6B4031' : theme === 'sakura' ? '#648858' : '#5D7E54');
      ctx.fillStyle = meadowBaseColor;
      ctx.fillRect(-50, midHillY, width + 100, height - midHillY);

      const curMidImg = curStageId === 'tokyo'
        ? (assets.bgTokyoSkyline || assets.bgHills)
        : curStageId === 'kyoto'
        ? (assets.bgKyotoBamboo || assets.bgHills)
        : curStageId === 'hokkaido'
        ? (assets.bgHokkaidoLavender || assets.bgHills)
        : assets.bgHills;

      if (curMidImg) {
        // Seamless Parallax Layer (1536x384 strip, 100% solid opacity)
        const hDrawW = 960;
        const hDrawH = 240;
        const startHX = -((midScroll * 1.0) % hDrawW);
        ctx.save();
        if (theme === 'night') {
          ctx.filter = 'brightness(0.58) saturate(0.85) hue-rotate(-5deg)';
        } else if (theme === 'sunset') {
          ctx.filter = 'brightness(0.92) saturate(1.12) hue-rotate(-5deg)';
        }
        // Overlap by 1px to guarantee zero seam gap (100% opaque!)
        for (let hx = startHX - hDrawW; hx < width + hDrawW; hx += hDrawW - 1) {
          ctx.drawImage(curMidImg, hx, midHillY - 108, hDrawW, hDrawH);
        }
        ctx.restore();
      } else {
        // Procedural hills fallback
        ctx.fillStyle = meadowBaseColor;
        ctx.beginPath();
        ctx.moveTo(-50, height);
        for (let x = -50; x <= width + 100; x += 30) {
          const hWave = Math.sin((x + midScroll * 0.65) * 0.005) * 32 
                      + Math.cos((x + midScroll * 0.65) * 0.012) * 14;
          ctx.lineTo(x, midHillY - 18 + hWave);
        }
        ctx.lineTo(width + 100, height);
        ctx.closePath();
        ctx.fill();
      }

      // Phase 2: Low Meadow Ground Mist (when weather === 'mist')
      if (curWeather === 'mist') {
        ctx.save();
        const meadowMistGrad = ctx.createLinearGradient(0, midHillY - 30, 0, midHillY + 65);
        meadowMistGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        meadowMistGrad.addColorStop(0.5, theme === 'night' ? 'rgba(175, 200, 225, 0.14)' : 'rgba(255, 255, 255, 0.22)');
        meadowMistGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = meadowMistGrad;
        ctx.beginPath();
        ctx.moveTo(-50, midHillY + 70);
        for (let mx = -50; mx <= width + 50; mx += 35) {
          const my = midHillY - 10 + Math.cos((mx + windTime * 35) * 0.008) * 14;
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(width + 50, midHillY + 70);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // ==========================================
      // PHASE 2 ENCOUNTER: RETRO ENODEN TRAIN (Scenic Horizon Railway)
      // ==========================================
      state.trainCooldown -= dt;
      if (state.trainCooldown <= 0 && !state.trainActive) {
        state.trainActive = true;
        state.trainX = -380;
        state.trainWhistlePlayed = false;
      }

      if (state.trainActive) {
        const trainSpeed = 135 + (isMoving ? speed * 10 : 25);
        state.trainX += trainSpeed * dt;

        // Play authentic Japanese train whistle when it enters screen
        if (!state.trainWhistlePlayed && state.trainX > width * 0.08) {
          state.trainWhistlePlayed = true;
          encounteredTrainRef.current = true;
          if (soundEnabled) {
            playTrainWhistleTone(ambientAudioCtxRef.current);
          }
        }

        if (assets.encounterTrain && state.trainX >= -400 && state.trainX <= width + 400) {
          const trainW = 195;
          const trainH = 80;
          const trainY = midHillY - trainH + 12;

          ctx.save();
          if (theme === 'night') {
            ctx.filter = 'brightness(0.68) saturate(0.9)';
          } else if (theme === 'sunset') {
            ctx.filter = 'brightness(0.95) saturate(1.15) hue-rotate(-6deg)';
          }
          ctx.drawImage(assets.encounterTrain, state.trainX, trainY, trainW, trainH);

          // Cozy glowing passenger windows
          ctx.fillStyle = theme === 'night' 
            ? 'rgba(255, 230, 140, 0.55)' 
            : theme === 'sunset'
            ? 'rgba(255, 240, 180, 0.40)'
            : 'rgba(255, 255, 230, 0.28)';
          ctx.fillRect(state.trainX + 22, trainY + 24, trainW - 44, 13);
          ctx.restore();
        }

        if (state.trainX > width + 450) {
          state.trainActive = false;
          // Cooldown 60 to 90 seconds until the next train passes by
          state.trainCooldown = 60 + Math.random() * 30;
        }
      }

      // Windmill or Cozy House in Countryside
      if (theme === 'countryside') {
        const millX = ((width * 0.35 - midScroll) % (width + 600) + width + 600) % (width + 600) - 100;
        const millY = midHillY - 40;
        if (assets.landmarkWindmill) {
          drawSprite(assets.landmarkWindmill, 4, 4, 0, 0, millX - 45, millY - 45, 90, 90);
        } else {
          // Tower
          ctx.fillStyle = '#FAF7F2';
          ctx.beginPath();
          ctx.moveTo(millX - 14, millY + 36);
          ctx.lineTo(millX - 8, millY);
          ctx.lineTo(millX + 8, millY);
          ctx.lineTo(millX + 14, millY + 36);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#B67A28';
          ctx.beginPath();
          ctx.arc(millX, millY, 9, Math.PI, 0);
          ctx.fill();
          // Turning Blades
          ctx.save();
          ctx.translate(millX, millY);
          ctx.rotate(windTime * 0.8);
          ctx.strokeStyle = '#6E5646';
          ctx.lineWidth = 2.5;
          for (let b = 0; b < 4; b++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(28, 0);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // Sakura trees for sakura theme
      if (theme === 'sakura') {
        if (assets.landmarkSakuraTree) {
          for (let i = 0; i < 4; i++) {
            const treeX = ((i * 340 - midScroll) % (width + 400) + width + 400) % (width + 400) - 80;
            const treeY = midHillY - 60;
            drawSprite(assets.landmarkSakuraTree, 4, 4, i % 4, 0, treeX - 45, treeY, 90, 90);
          }
        } else {
          const drawTree = (tx: number, ty: number) => {
            ctx.fillStyle = '#6E5646';
            ctx.fillRect(tx - 3, ty, 6, 22);
            ctx.fillStyle = '#F4B6C2';
            ctx.beginPath();
            ctx.arc(tx, ty - 6, 18, 0, Math.PI * 2);
            ctx.arc(tx - 10, ty - 2, 12, 0, Math.PI * 2);
            ctx.arc(tx + 10, ty - 2, 14, 0, Math.PI * 2);
            ctx.fill();
          };
          for (let i = 0; i < 7; i++) {
            const treeX = ((i * 240 - midScroll) % (width + 300) + width + 300) % (width + 300) - 50;
            const treeY = midHillY + Math.sin((treeX + midScroll) * 0.008) * 35 - 18;
            drawTree(treeX, treeY);
          }
        }
      }

      // ------------------------------------------
      // 6. ROAD / TRAIL WITH DYNAMIC INCLINE TILT
      // ------------------------------------------
      // Road starts at roadBaseY on left, tilts up to (roadBaseY - slopeHeight) on right
      const roadBaseY = height * 0.84;
      const inclineRise = Math.tan(inclineAngle) * width;
      const roadLeftY = roadBaseY + inclineRise * 0.35;
      const roadRightY = roadBaseY - inclineRise * 0.65;

      // Road embankment & grass base
      ctx.fillStyle = theme === 'night' 
        ? '#132128' 
        : theme === 'sunset' 
        ? '#643828' 
        : '#3D5A47';
      ctx.beginPath();
      ctx.moveTo(-20, roadLeftY - 6);
      ctx.lineTo(width + 20, roadRightY - 6);
      ctx.lineTo(width + 20, height + 20);
      ctx.lineTo(-20, height + 20);
      ctx.closePath();
      ctx.fill();

      // Paved Cozy Trail Surface (Warm stone / wooden deck)
      ctx.fillStyle = theme === 'night' 
        ? '#26343F' 
        : theme === 'sunset' 
        ? '#D89E7E' 
        : '#EFE8DE'; // Japandi warm limestone path
      ctx.beginPath();
      ctx.moveTo(-20, roadLeftY);
      ctx.lineTo(width + 20, roadRightY);
      ctx.lineTo(width + 20, roadRightY + 45);
      ctx.lineTo(-20, roadLeftY + 45);
      ctx.closePath();
      ctx.fill();

      // Road edge wood railing / stones
      ctx.strokeStyle = theme === 'night' ? '#3B4D5C' : '#D0C3B2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-20, roadLeftY);
      ctx.lineTo(width + 20, roadRightY);
      ctx.stroke();

      // Road Path Markings (Moving dashed line)
      ctx.strokeStyle = theme === 'night' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(82, 121, 111, 0.25)';
      ctx.lineWidth = 4;
      ctx.setLineDash([20, 24]);
      ctx.lineDashOffset = -groundScroll;
      ctx.beginPath();
      ctx.moveTo(-20, roadLeftY + 22);
      ctx.lineTo(width + 20, roadRightY + 22);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Phase 2: Animated Water Puddle Ripples on Road (in Rain Weather)
      if (curWeather === 'rain' && state.ripples.length > 0) {
        ctx.save();
        state.ripples.forEach((r) => {
          r.r += 0.75;
          r.alpha -= 0.035;
          if (r.alpha > 0) {
            ctx.strokeStyle = theme === 'night' 
              ? `rgba(180, 215, 245, ${r.alpha * 0.45})` 
              : `rgba(215, 235, 255, ${r.alpha * 0.6})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.r, r.r * 0.35, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
        state.ripples = state.ripples.filter((r) => r.alpha > 0);
        ctx.restore();
      }

      // Milestone Distance Posts along the trail (Smooth continuous 60 FPS gliding)
      const markerIntervalM = 250; // every 250m
      const baseMarker = Math.floor(currentDistanceMeters / markerIntervalM) * markerIntervalM;

      for (let m = -1; m <= 3; m++) {
        const markerDist = baseMarker + m * markerIntervalM;
        if (markerDist < 0) continue;
        const relativeDist = markerDist - currentDistanceMeters;
        // Map relative distance to screen X
        const markerX = width * 0.45 + relativeDist * 1.5;
        if (markerX >= -60 && markerX <= width + 60) {
          // Calculate Y on inclined road
          const t = (markerX - (-20)) / (width + 40);
          const markerY = roadLeftY + (roadRightY - roadLeftY) * t;

          if (assets.propMilestone) {
            // High-res pixel art wooden milestone signpost (256x256, base at Y=226)
            const postW = 56;
            const postH = 56;
            const postX = markerX - postW / 2;
            const postY = markerY - postH * (226 / 256);
            ctx.drawImage(assets.propMilestone, postX, postY, postW, postH);

            // Carved text on wooden board (placard center is around Y=115 in 256x256 space)
            const placardCenterY = postY + postH * (110 / 256);
            ctx.fillStyle = '#4E2C17';
            ctx.font = 'bold 9px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const distLabel = markerDist >= 1000 ? `${(markerDist / 1000).toFixed(1)}k` : `${markerDist}m`;
            ctx.fillText(distLabel, markerX + 1, placardCenterY);
          } else {
            // Cute wooden milestone signpost fallback
            ctx.fillStyle = '#8D6E63';
            ctx.fillRect(markerX - 3, markerY - 36, 6, 36);
            ctx.fillStyle = '#FFF8E1';
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(markerX - 22, markerY - 48, 44, 18, 4);
            ctx.fill();
            ctx.stroke();

            // Distance Badge Pill
            ctx.fillStyle = '#3E2723';
            ctx.font = 'bold 10px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const distLabel = markerDist >= 1000 ? `${(markerDist / 1000).toFixed(1)}k` : `${markerDist}m`;
            ctx.fillText(`🚩 ${distLabel}`, markerX, markerY - 39);

            // Painted Road Slope Chevron if Incline > 0
            if (metrics.inclineLevel > 0) {
              ctx.save();
              ctx.fillStyle = theme === 'night' ? 'rgba(255, 255, 255, 0.28)' : 'rgba(82, 121, 111, 0.45)';
              ctx.font = 'bold 9px ui-monospace, monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillText(`▲ +${metrics.inclineLevel}`, markerX, markerY + 4);
              ctx.restore();
            }
          }
        }
      }

      // Cozy Roadside Cafe Kiosk (at 500m, 1500m, 2500m...)
      if (assets.landmarkCafe) {
        const cafeDist = Math.floor(currentDistanceMeters / 1000) * 1000 + 500;
        const cafeRel = cafeDist - currentDistanceMeters;
        const cafeX = width * 0.45 + cafeRel * 1.5;
        if (cafeX >= -100 && cafeX <= width + 100) {
          const t = (cafeX - (-20)) / (width + 40);
          const cafeY = roadLeftY + (roadRightY - roadLeftY) * t;
          drawSprite(assets.landmarkCafe, 4, 4, 0, 0, cafeX - 45, cafeY - 82, 90, 90);
        }
      }

      // Traditional Red Torii Gate (at 1000m, 3000m...)
      if (assets.landmarkTorii && theme === 'sakura') {
        const toriiDist = Math.floor(currentDistanceMeters / 2000) * 2000 + 1000;
        const toriiRel = toriiDist - currentDistanceMeters;
        const toriiX = width * 0.45 + toriiRel * 1.5;
        if (toriiX >= -100 && toriiX <= width + 100) {
          const t = (toriiX - (-20)) / (width + 40);
          const toriiY = roadLeftY + (roadRightY - roadLeftY) * t;
          drawSprite(assets.landmarkTorii, 4, 4, 0, 0, toriiX - 45, toriiY - 90, 90, 90);
        }
      }

      // Stage 2 (Kyoto): Ancient Shrine Gate with Lanterns (at 2800m, 3500m, 4200m...)
      if (assets.landmarkKyotoGate && curStageId === 'kyoto') {
        const gateDist = Math.floor(currentDistanceMeters / 700) * 700 + 350;
        const gateRel = gateDist - currentDistanceMeters;
        const gateX = width * 0.45 + gateRel * 1.5;
        if (gateX >= -110 && gateX <= width + 110) {
          const t = (gateX - (-20)) / (width + 40);
          const gateY = roadLeftY + (roadRightY - roadLeftY) * t;
          const gateSize = 92;
          ctx.drawImage(assets.landmarkKyotoGate, gateX - gateSize / 2, gateY - gateSize + 4, gateSize, gateSize);
        }
      }

      // Stage 3 (Hokkaido): Rustic Dairy Barn & Windmill (at 5400m, 6200m, 7000m...)
      if (assets.landmarkHokkaidoBarn && curStageId === 'hokkaido') {
        const barnDist = Math.floor(currentDistanceMeters / 800) * 800 + 400;
        const barnRel = barnDist - currentDistanceMeters;
        const barnX = width * 0.45 + barnRel * 1.5;
        if (barnX >= -120 && barnX <= width + 120) {
          const t = (barnX - (-20)) / (width + 40);
          const barnY = roadLeftY + (roadRightY - roadLeftY) * t;
          const barnSize = 96;
          ctx.drawImage(assets.landmarkHokkaidoBarn, barnX - barnSize / 2, barnY - barnSize + 6, barnSize, barnSize);
        }
      }

      // Stage 4 (Tokyo): Yatai Ramen Food Cart & Vending Machine (at 7800m, 8600m, 9400m...)
      if (assets.landmarkTokyoYatai && curStageId === 'tokyo') {
        const yataiDist = Math.floor(currentDistanceMeters / 800) * 800 + 450;
        const yataiRel = yataiDist - currentDistanceMeters;
        const yataiX = width * 0.45 + yataiRel * 1.5;
        if (yataiX >= -120 && yataiX <= width + 120) {
          const t = (yataiX - (-20)) / (width + 40);
          const yataiY = roadLeftY + (roadRightY - roadLeftY) * t;
          const yataiSize = 98;
          ctx.drawImage(assets.landmarkTokyoYatai, yataiX - yataiSize / 2, yataiY - yataiSize + 6, yataiSize, yataiSize);

          // Warm aroma steam rising from ramen pot
          const steamPhase = windTime * 2.6;
          for (let s = 0; s < 3; s++) {
            const sProg = ((steamPhase + s * 0.7) % 2.0) / 2.0;
            const sY = yataiY - yataiSize * 0.65 - sProg * 22;
            const sX = yataiX - 16 + Math.sin(sProg * Math.PI * 2) * 4;
            const sAlpha = Math.sin(sProg * Math.PI) * 0.5;
            ctx.save();
            ctx.fillStyle = `rgba(255, 235, 210, ${sAlpha})`;
            ctx.beginPath();
            ctx.arc(sX, sY, 3 + sProg * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // Fixed screen horizontal position (runner runs in place like a treadmill!)
      const runnerX = width * 0.40;

      // ==========================================
      // PHASE 2: ROADSIDE RANDOM ENCOUNTERS (Guests Along the Path)
      // ==========================================
      // A. Nara Bowing Sika Deer (Every 1000m at +700m offset: 700m, 1700m, 2700m...)
      if (assets.encounterDeer) {
        const deerDist = Math.floor(currentDistanceMeters / 1000) * 1000 + 700;
        const deerRel = deerDist - currentDistanceMeters;
        const deerX = width * 0.45 + deerRel * 1.5;
        if (deerX >= -120 && deerX <= width + 120) {
          const t = (deerX - (-20)) / (width + 40);
          const roadY = roadLeftY + (roadRightY - roadLeftY) * t;
          const deerW = 75;
          const deerH = 86;
          const deerBaseY = roadY - 4; // Stands on grass verge

          const distToRunner = Math.abs(deerX - runnerX);
          const isNear = distToRunner < 120;
          if (isNear) {
            encounteredDeerRef.current = true;
          }

          const bowAngle = isNear ? Math.sin(windTime * 5) * 0.10 : 0;
          const bowY = isNear ? Math.abs(Math.sin(windTime * 5)) * 4 : 0;

          ctx.save();
          ctx.translate(deerX, deerBaseY);
          ctx.rotate(-inclineAngle);

          // Soft drop shadow
          ctx.fillStyle = 'rgba(30, 45, 30, 0.22)';
          ctx.beginPath();
          ctx.ellipse(0, 2, 22, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Deer sprite
          ctx.translate(0, -bowY);
          ctx.rotate(bowAngle);
          ctx.drawImage(assets.encounterDeer, -deerW / 2, -deerH, deerW, deerH);

          // Speech bubble when runner is near
          if (isNear && deerX > 60 && deerX < width - 60) {
            ctx.save();
            const bubbleY = -deerH - 24;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(-46, bubbleY, 92, 22, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#443830';
            ctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🦌 ยินดีต้อนรับ!', 0, bubbleY + 11);
            ctx.restore();
          }
          ctx.restore();
        }
      }

      // B. Lucky Shrine Stone Lantern with Calico Cat (Every 1000m at +300m offset: 300m, 1300m, 2300m...)
      if (assets.encounterLantern) {
        const lanternDist = Math.floor(currentDistanceMeters / 1000) * 1000 + 300;
        const lanternRel = lanternDist - currentDistanceMeters;
        const lanternX = width * 0.45 + lanternRel * 1.5;
        if (lanternX >= -80 && lanternX <= width + 80) {
          const t = (lanternX - (-20)) / (width + 40);
          const roadY = roadLeftY + (roadRightY - roadLeftY) * t;
          const lanternW = 50;
          const lanternH = 105;

          const distToRunner = Math.abs(lanternX - runnerX);
          const isNear = distToRunner < 110;
          if (isNear) {
            encounteredLanternRef.current = true;
          }

          ctx.save();
          ctx.translate(lanternX, roadY);
          ctx.rotate(-inclineAngle);

          // Soft drop shadow
          ctx.fillStyle = 'rgba(30, 40, 30, 0.24)';
          ctx.beginPath();
          ctx.ellipse(0, 2, 20, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(assets.encounterLantern, -lanternW / 2, -lanternH, lanternW, lanternH);

          // Floating lucky cheer bubble
          if (isNear && lanternX > 50 && lanternX < width - 50) {
            ctx.save();
            const bubbleY = -lanternH - 24;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#E3B873';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(-42, bubbleY, 84, 22, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#B67A28';
            ctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🐾 แมวนำโชค!', 0, bubbleY + 11);
            ctx.restore();
          }
          ctx.restore();
        }
      }

      // C. Japanese Nodategasa Tea Bench (Every 1000m at +900m offset: 900m, 1900m, 2900m...)
      if (assets.encounterUmbrella) {
        const umbrellaDist = Math.floor(currentDistanceMeters / 1000) * 1000 + 900;
        const umbrellaRel = umbrellaDist - currentDistanceMeters;
        const umbrellaX = width * 0.45 + umbrellaRel * 1.5;
        if (umbrellaX >= -90 && umbrellaX <= width + 90) {
          const t = (umbrellaX - (-20)) / (width + 40);
          const roadY = roadLeftY + (roadRightY - roadLeftY) * t;
          const umbrellaW = 82;
          const umbrellaH = 90;

          ctx.save();
          ctx.translate(umbrellaX, roadY);
          ctx.rotate(-inclineAngle);

          // Drop shadow
          ctx.fillStyle = 'rgba(35, 30, 25, 0.22)';
          ctx.beginPath();
          ctx.ellipse(0, 2, 28, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(assets.encounterUmbrella, -umbrellaW / 2, -umbrellaH, umbrellaW, umbrellaH);

          // Animated Rising Matcha Green Tea Steam from cup
          const steamPhase = windTime * 2.5;
          ctx.lineWidth = 1.2;
          ctx.lineCap = 'round';
          for (let s = 0; s < 3; s++) {
            const steamProgress = ((steamPhase + s * 0.8) % 2.5) / 2.5;
            const sY = -umbrellaH * 0.38 - steamProgress * 16;
            const sX = 8 + Math.sin(steamProgress * Math.PI * 2) * 3;
            const sAlpha = Math.sin(steamProgress * Math.PI) * 0.55;
            ctx.strokeStyle = `rgba(255, 255, 255, ${sAlpha})`;
            ctx.beginPath();
            ctx.moveTo(sX, sY);
            ctx.quadraticCurveTo(sX + 2, sY - 4, sX, sY - 8);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // D. Stage 2 Encounter: Cheerful Guardian Tanuki Spirit (Kyoto Arashiyama at 2650m, 3650m, 4650m...)
      if (assets.encounterTanuki && curStageId === 'kyoto') {
        const tanukiDist = Math.floor(currentDistanceMeters / 1000) * 1000 + 650;
        const tanukiRel = tanukiDist - currentDistanceMeters;
        const tanukiX = width * 0.45 + tanukiRel * 1.5;
        if (tanukiX >= -100 && tanukiX <= width + 100) {
          const t = (tanukiX - (-20)) / (width + 40);
          const roadY = roadLeftY + (roadRightY - roadLeftY) * t;
          const tanukiW = 75;
          const tanukiH = 75;
          const distToRunner = Math.abs(tanukiX - runnerX);
          const isNear = distToRunner < 120;
          if (isNear) {
            encounteredTanukiRef.current = true;
          }

          const tanukiHop = isNear ? Math.abs(Math.sin(windTime * 6)) * 6 : 0;
          const tanukiWave = isNear ? Math.sin(windTime * 8) * 0.12 : 0;

          ctx.save();
          ctx.translate(tanukiX, roadY);
          ctx.rotate(-inclineAngle);

          // Drop shadow
          ctx.fillStyle = 'rgba(30, 35, 25, 0.22)';
          ctx.beginPath();
          ctx.ellipse(0, 2, 22, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.translate(0, -tanukiHop);
          ctx.rotate(tanukiWave);
          ctx.drawImage(assets.encounterTanuki, -tanukiW / 2, -tanukiH, tanukiW, tanukiH);

          if (isNear && tanukiX > 60 && tanukiX < width - 60) {
            ctx.save();
            const bubbleY = -tanukiH - 24;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#B85737';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(-48, bubbleY, 96, 22, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#6E2C17';
            ctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🍃 โชคดีมีชัย!', 0, bubbleY + 11);
            ctx.restore();
          }
          ctx.restore();
        }
      }

      // E. Stage 3 Encounter: Hokkaido Dairy Calf with Daisy (Hokkaido Biei at 5500m, 6500m, 7500m...)
      if (assets.encounterHokkaidoCow && curStageId === 'hokkaido') {
        const cowDist = Math.floor(currentDistanceMeters / 1000) * 1000 + 500;
        const cowRel = cowDist - currentDistanceMeters;
        const cowX = width * 0.45 + cowRel * 1.5;
        if (cowX >= -110 && cowX <= width + 110) {
          const t = (cowX - (-20)) / (width + 40);
          const roadY = roadLeftY + (roadRightY - roadLeftY) * t;
          const cowW = 82;
          const cowH = 82;
          const distToRunner = Math.abs(cowX - runnerX);
          const isNear = distToRunner < 120;
          if (isNear) {
            encounteredCowRef.current = true;
          }

          const cowBob = Math.sin(windTime * 3) * 2;

          ctx.save();
          ctx.translate(cowX, roadY);
          ctx.rotate(-inclineAngle);

          // Drop shadow
          ctx.fillStyle = 'rgba(30, 40, 30, 0.22)';
          ctx.beginPath();
          ctx.ellipse(0, 2, 26, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.translate(0, cowBob);
          ctx.drawImage(assets.encounterHokkaidoCow, -cowW / 2, -cowH, cowW, cowH);

          if (isNear && cowX > 60 && cowX < width - 60) {
            ctx.save();
            const bubbleY = -cowH - 24;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#6E5296';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(-46, bubbleY, 92, 22, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#3E2A5C';
            ctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🐮 สู้ๆ มอ~!', 0, bubbleY + 11);
            ctx.restore();
          }
          ctx.restore();
        }
      }

      // F. Stage 4 Encounter: Mailbox Cheering Black Cat (Neo-Tokyo Twilight at 7600m, 8600m, 9600m...)
      if (assets.encounterTokyoCat && curStageId === 'tokyo') {
        const catDist = Math.floor(currentDistanceMeters / 1000) * 1000 + 600;
        const catRel = catDist - currentDistanceMeters;
        const catX = width * 0.45 + catRel * 1.5;
        if (catX >= -100 && catX <= width + 100) {
          const t = (catX - (-20)) / (width + 40);
          const roadY = roadLeftY + (roadRightY - roadLeftY) * t;
          const catW = 76;
          const catH = 80;
          const distToRunner = Math.abs(catX - runnerX);
          const isNear = distToRunner < 120;
          if (isNear) {
            encounteredMailboxCatRef.current = true;
          }

          const catPawWave = isNear ? Math.sin(windTime * 7) * 0.15 : 0;

          ctx.save();
          ctx.translate(catX, roadY);
          ctx.rotate(-inclineAngle);

          // Drop shadow
          ctx.fillStyle = 'rgba(20, 15, 30, 0.25)';
          ctx.beginPath();
          ctx.ellipse(0, 2, 24, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.rotate(catPawWave);
          ctx.drawImage(assets.encounterTokyoCat, -catW / 2, -catH, catW, catH);

          if (isNear && catX > 60 && catX < width - 60) {
            ctx.save();
            const bubbleY = -catH - 24;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#D97706';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(-48, bubbleY, 96, 22, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#78350F';
            ctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🐈‍⬛ แชมเปี้ยน!', 0, bubbleY + 11);
            ctx.restore();
          }
          ctx.restore();
        }
      }

      // ------------------------------------------
      // 7. RUNNER CHARACTER & COMPANION
      // ------------------------------------------
      // Interpolate runner's foot level on the inclined road
      const runnerRoadY = roadLeftY + (roadRightY - roadLeftY) * ((runnerX - (-20)) / (width + 40));

      // Calculate vertical bounce & forward lean
      const bounceHeight = isMoving ? Math.min(10, 4 + speed * 0.7) : 0;
      const verticalBounce = isMoving ? Math.abs(Math.sin(cadencePhase)) * bounceHeight : Math.sin(windTime * 2) * 1.5;
      const forwardLean = isMoving ? Math.min(0.24, 0.05 + speed * 0.015) : 0;

      // Draw Soft Drop Shadow under runner on the road
      ctx.save();
      ctx.translate(runnerX, runnerRoadY);
      ctx.rotate(-inclineAngle);
      ctx.fillStyle = 'rgba(40, 30, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 4, isMoving ? 22 : 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ==========================================
      // DRAW RUNNER (Pixel Art Sprite from PixelLab or Vector Fallback)
      // ==========================================
      const runnerSpriteW = 86;
      const runnerSpriteH = 86;
      // In 64x64 cell, feet rest at y=60 (60/64). Offset dy grounds feet exactly on road!
      const runnerGroundDy = -runnerSpriteH * (60 / 64);

      if (isMoving && assets.runnerRun) {
        ctx.save();
        ctx.translate(runnerX, runnerRoadY - verticalBounce);
        ctx.rotate(-inclineAngle + forwardLean);
        // Row 0 has 4 running frames, synced to treadmill cadence
        const runFrame = Math.floor(cadencePhase / (Math.PI / 2)) % 4;
        drawSprite(assets.runnerRun, 4, 4, runFrame, 0, -runnerSpriteW / 2, runnerGroundDy, runnerSpriteW, runnerSpriteH);
        ctx.restore();
      } else if (!isMoving && assets.runnerIdle) {
        ctx.save();
        ctx.translate(runnerX, runnerRoadY - verticalBounce);
        ctx.rotate(-inclineAngle);
        // Fixed calm standing pose (col 0) instead of cycling through multiple avatar variants
        const idleFrame = 0;
        drawSprite(assets.runnerIdle, 4, 4, idleFrame, 0, -runnerSpriteW / 2, runnerGroundDy, runnerSpriteW, runnerSpriteH);
        ctx.restore();
      } else {
        // Procedural vector runner fallback
        ctx.save();
        ctx.translate(runnerX, runnerRoadY - verticalBounce);
        ctx.rotate(-inclineAngle + forwardLean);

        const legSwing = isMoving ? Math.sin(cadencePhase) * (0.45 + Math.min(0.4, speed * 0.04)) : 0;
        const armSwing = -legSwing; // arms swing opposite to legs

        // Runner Color Palette (Cozy Sage & Oat)
        const skinColor = '#FAD4C0';
        const hairColor = '#3D2F28';
        const topColor = '#52796F';
        const shortsColor = '#FAF7F2';
        const shoeColor = '#C46849';

        // Far Leg (Behind)
        ctx.save();
        ctx.translate(-4, -30);
        ctx.rotate(-legSwing * 0.9);
        ctx.fillStyle = '#405B54';
        ctx.fillRect(-3, 0, 6, 18);
        ctx.translate(0, 18);
        ctx.rotate(isMoving ? Math.max(0, legSwing * 1.2) : 0);
        ctx.fillRect(-2.5, 0, 5, 16);
        ctx.fillStyle = '#9C4E36';
        ctx.beginPath();
        ctx.roundRect(-3, 14, 14, 6, 2);
        ctx.fill();
        ctx.restore();

        // Far Arm (Behind)
        ctx.save();
        ctx.translate(-2, -58);
        ctx.rotate(-armSwing * 0.8);
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-6, 14);
        ctx.lineTo(isMoving ? 8 : -2, 22);
        ctx.stroke();
        ctx.restore();

        // Torso & Shorts
        ctx.fillStyle = shortsColor;
        ctx.beginPath();
        ctx.roundRect(-7, -35, 14, 12, 3);
        ctx.fill();

        // Sporty Top
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.roundRect(-8, -58, 16, 25, 4);
        ctx.fill();

        // Near Leg (Front)
        ctx.save();
        ctx.translate(4, -30);
        ctx.rotate(legSwing);
        ctx.fillStyle = skinColor;
        ctx.fillRect(-3, 0, 6, 18);
        ctx.translate(0, 18);
        ctx.rotate(isMoving ? Math.max(0, -legSwing * 1.2) : 0);
        ctx.fillRect(-2.5, 0, 5, 16);
        ctx.fillStyle = shoeColor;
        ctx.beginPath();
        ctx.roundRect(-3, 14, 15, 6, 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-3, 18, 15, 2);
        ctx.restore();

        // Head & Face
        ctx.fillStyle = skinColor;
        ctx.fillRect(-3, -64, 6, 7);
        ctx.beginPath();
        ctx.arc(0, -74, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#3D2F28';
        ctx.beginPath();
        ctx.arc(4, -75, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Hair & Ponytail
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        ctx.arc(0, -77, 12, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fill();

        const hairBounce = isMoving ? Math.sin(cadencePhase - 0.7) * 0.35 : Math.sin(windTime * 3) * 0.1;
        ctx.save();
        ctx.translate(-10, -78);
        ctx.rotate(-0.4 + hairBounce);
        ctx.beginPath();
        ctx.ellipse(-10, 4, 14, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#C46849';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Near Arm
        ctx.save();
        ctx.translate(2, -56);
        ctx.rotate(armSwing * 0.9);
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(isMoving ? 10 : 3, 14);
        ctx.lineTo(isMoving ? 18 : 6, 8);
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      }

      // ==========================================
      // DRAW COMPANION ANIMAL (Shiba / Cat / Bunny)
      // ==========================================
      if (companion !== 'none') {
        const petOffsetX = -44; // Runs slightly behind runner
        const petRoadY = roadLeftY + (roadRightY - roadLeftY) * (((runnerX + petOffsetX) - (-20)) / (width + 40));
        const petBounce = isMoving ? Math.abs(Math.sin(companionPhase)) * (bounceHeight * 0.8) : Math.sin(windTime * 2.5) * 1.2;
        // Joyful pet hop bounce when reaching milestone
        const petJoyBounce = isCelebrating ? Math.abs(Math.sin((4.0 - state.celebrationTimer) * 7)) * 14 : 0;

        // Pet Drop Shadow
        ctx.save();
        ctx.translate(runnerX + petOffsetX, petRoadY);
        ctx.rotate(-inclineAngle);
        ctx.fillStyle = 'rgba(40, 30, 20, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 3, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(runnerX + petOffsetX, petRoadY - petBounce - petJoyBounce);
        ctx.rotate(-inclineAngle + (isMoving ? forwardLean * 0.7 : 0));

        // Pet sprite size (scaled to cute companion size ~44x44)
        const petDrawSize = 44;
        const petGroundDy = -petDrawSize * (27 / 32); // Feet on ground
        // When running, cycle 4 run frames (0..3). When idle, hold a calm standing/sitting pose.
        const petRunFrame = Math.floor(companionPhase / (Math.PI / 2)) % 4;
        const petShibaCol = isMoving ? petRunFrame : 4;
        const petCatCol = isMoving ? petRunFrame : 0;
        const petBunnyCol = isMoving ? petRunFrame : 4;

        if (companion === 'shiba' && assets.petShiba) {
          // Pixel Art Shiba Inu (8x8 grid of 32x32 cells, col 4 has standing pose, cols 0-3 run)
          drawSprite(assets.petShiba, 8, 8, petShibaCol, 0, -petDrawSize / 2, petGroundDy, petDrawSize, petDrawSize);
        } else if (companion === 'cat' && assets.petCat) {
          // Pixel Art Cat (8x8 grid of 32x32 cells, col 0 has standing pose, cols 0-3 run)
          drawSprite(assets.petCat, 8, 8, petCatCol, 0, -petDrawSize / 2, petGroundDy, petDrawSize, petDrawSize);
        } else if (companion === 'bunny' && assets.petBunny) {
          // Pixel Art Bunny (8x8 grid of 32x32 cells, col 4 has sitting pose, cols 0-3 hop)
          drawSprite(assets.petBunny, 8, 8, petBunnyCol, 0, -petDrawSize / 2, petGroundDy, petDrawSize, petDrawSize);
        } else if (companion === 'shiba') {
          // SHIBA INU (Golden-tan, curled tail, pointy ears - fallback)
          const shibaGold = '#DE8C3B';
          const shibaWhite = '#FFFBF2';

          // Body
          ctx.fillStyle = shibaGold;
          ctx.beginPath();
          ctx.ellipse(0, -14, 14, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          // White chest
          ctx.fillStyle = shibaWhite;
          ctx.beginPath();
          ctx.ellipse(6, -12, 7, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Legs
          const petLegSwing = isMoving ? Math.sin(companionPhase) * 0.5 : 0;
          ctx.fillStyle = shibaGold;
          ctx.fillRect(-8 + petLegSwing * 6, -8, 3.5, 10);
          ctx.fillRect(6 - petLegSwing * 6, -8, 3.5, 10);

          // Head
          ctx.fillStyle = shibaGold;
          ctx.beginPath();
          ctx.arc(12, -22, 8, 0, Math.PI * 2);
          ctx.fill();
          // White muzzle
          ctx.fillStyle = shibaWhite;
          ctx.beginPath();
          ctx.arc(15, -20, 4.5, 0, Math.PI * 2);
          ctx.fill();
          // Black nose
          ctx.fillStyle = '#2C2621';
          ctx.beginPath();
          ctx.arc(17.5, -20.5, 1.4, 0, Math.PI * 2);
          ctx.fill();
          // Eye
          ctx.beginPath();
          ctx.arc(13, -23, 1.3, 0, Math.PI * 2);
          ctx.fill();
          // Pointy Ears
          ctx.fillStyle = shibaGold;
          ctx.beginPath();
          ctx.moveTo(9, -28);
          ctx.lineTo(12, -36);
          ctx.lineTo(15, -28);
          ctx.fill();

          // Curled Tail Wagging!
          const tailWag = Math.sin(isMoving ? companionPhase * 1.5 : windTime * 6) * 0.4;
          ctx.save();
          ctx.translate(-13, -18);
          ctx.rotate(tailWag);
          ctx.strokeStyle = shibaGold;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, 7, Math.PI * 0.5, Math.PI * 1.7);
          ctx.stroke();
          ctx.restore();

        } else if (companion === 'cat') {
          // GINGER CAT (Striped cat with tail held high)
          const catOrange = '#E8904A';
          ctx.fillStyle = catOrange;
          ctx.beginPath();
          ctx.ellipse(0, -12, 12, 7.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Paws
          const petLegSwing = isMoving ? Math.sin(companionPhase) * 0.4 : 0;
          ctx.fillStyle = '#FAF7F2';
          ctx.fillRect(-6 + petLegSwing * 5, -6, 3, 8);
          ctx.fillRect(5 - petLegSwing * 5, -6, 3, 8);

          // Head
          ctx.fillStyle = catOrange;
          ctx.beginPath();
          ctx.arc(10, -18, 6.5, 0, Math.PI * 2);
          ctx.fill();
          // Triangular Ears
          ctx.beginPath();
          ctx.moveTo(8, -23);
          ctx.lineTo(10, -29);
          ctx.lineTo(12, -23);
          ctx.fill();
          // Eye & Nose
          ctx.fillStyle = '#2C2621';
          ctx.beginPath();
          ctx.arc(12, -19, 1.2, 0, Math.PI * 2);
          ctx.fill();

          // Graceful Tail S-curve
          ctx.save();
          ctx.translate(-11, -14);
          ctx.rotate(Math.sin(windTime * 4) * 0.25);
          ctx.strokeStyle = catOrange;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-8, -12, -2, -18);
          ctx.stroke();
          ctx.restore();

        } else if (companion === 'bunny') {
          // CUTE BUNNY (Soft white, hopping)
          ctx.fillStyle = '#FFFDF9';
          ctx.beginPath();
          ctx.ellipse(0, -10, 10, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Head
          ctx.beginPath();
          ctx.arc(8, -16, 6, 0, Math.PI * 2);
          ctx.fill();

          // Long Pink Ears
          ctx.fillStyle = '#FFDDE4';
          ctx.beginPath();
          ctx.ellipse(6, -26, 2.5, 7, -0.15, 0, Math.PI * 2);
          ctx.fill();

          // Eye
          ctx.fillStyle = '#D9534F';
          ctx.beginPath();
          ctx.arc(9.5, -17, 1.2, 0, Math.PI * 2);
          ctx.fill();

          // Cotton Tail
          ctx.fillStyle = '#FFFDF9';
          ctx.beginPath();
          ctx.arc(-9, -12, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Floating celebration hearts & sparkles above pet when milestone reached
        if (isCelebrating) {
          const cProgress = (4.0 - state.celebrationTimer) / 4.0;
          for (let hi = 0; hi < 3; hi++) {
            const hLife = ((cProgress * 2.5 + hi * 0.33) % 1.0);
            const hAlpha = Math.sin(hLife * Math.PI);
            const hY = petGroundDy - (hLife * 32) - 6;
            const hX = Math.sin(cProgress * 8 + hi * 2) * 10;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, hAlpha));
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(hi % 2 === 0 ? '💖' : '✨', hX, hY);
            ctx.restore();
          }
        }

        ctx.restore();
      }

      // ==========================================
      // PHASE 4: GHOST PACER RUNNER (Ethereal Virtual Companion)
      // ==========================================
      if (pacerEnabled && state.pacerDistance > 0) {
        // Delta > 0: user is ahead, Ghost is behind
        // Delta < 0: Ghost is ahead of user
        // 1 meter = 4.5 pixels on screen relative to runner
        const rawGhostX = runnerX - (pacerDeltaMeters * 4.5);
        // Clamp ghost so it stays visible on screen with badge
        const ghostX = Math.max(width * 0.08, Math.min(width * 0.88, rawGhostX));
        const ghostRoadY = roadLeftY + (roadRightY - roadLeftY) * ((ghostX - (-20)) / (width + 40));
        const ghostBounce = Math.abs(Math.sin(state.pacerCadencePhase)) * 6;
        const ghostForwardLean = Math.min(0.20, 0.04 + pacerSpeed * 0.012);

        // Ghost Drop Shadow
        ctx.save();
        ctx.translate(ghostX, ghostRoadY);
        ctx.rotate(-inclineAngle);
        ctx.fillStyle = 'rgba(40, 70, 90, 0.18)';
        ctx.beginPath();
        ctx.ellipse(0, 4, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Ghost Runner Sprite with ethereal neon glow & cyan filter
        ctx.save();
        ctx.globalAlpha = 0.42;
        ctx.filter = 'hue-rotate(185deg) brightness(1.35) drop-shadow(0 0 8px rgba(80, 220, 255, 0.85))';
        ctx.translate(ghostX, ghostRoadY - ghostBounce);
        ctx.rotate(-inclineAngle + ghostForwardLean);

        const ghostFrame = Math.floor(state.pacerCadencePhase / (Math.PI / 2)) % 4;
        if (assets.runnerRun) {
          drawSprite(assets.runnerRun, 4, 4, ghostFrame, 0, -runnerSpriteW / 2, runnerGroundDy, runnerSpriteW, runnerSpriteH);
        }
        ctx.restore();

        // Ghost Pacer Floating Badge
        ctx.save();
        const isLeading = pacerDeltaMeters >= 0;
        ctx.fillStyle = isLeading ? 'rgba(82, 121, 111, 0.88)' : 'rgba(196, 104, 73, 0.88)';
        const ghostBadgeW = 82;
        const ghostBadgeH = 20;
        const ghostBadgeY = ghostRoadY - 102;
        ctx.beginPath();
        ctx.roundRect(ghostX - ghostBadgeW / 2, ghostBadgeY, ghostBadgeW, ghostBadgeH, 10);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const gapStr = Math.abs(pacerDeltaMeters) < 1 
          ? 'ตีคู่' 
          : isLeading 
          ? `+${Math.round(pacerDeltaMeters)}m` 
          : `-${Math.round(Math.abs(pacerDeltaMeters))}m`;
        ctx.fillText(`👻 ${pacerSpeed.toFixed(1)}k ${gapStr}`, ghostX, ghostBadgeY + ghostBadgeH / 2);
        ctx.restore();
      }

      // ==========================================
      // KINETIC SPEED WIND STREAKS (Phase 2)
      // Activated dynamically when speed >= 8.0 km/h
      // ==========================================
      if (speed >= 8.0) {
        const streakCount = speed >= 11.0 ? 12 : 7;
        const streakSpeed = 420 + (speed - 8.0) * 130;
        ctx.save();
        for (let si = 0; si < streakCount; si++) {
          const streakPhase = ((windTime * (streakSpeed * 0.002) + si * 0.37) % 1.0);
          const streakX = width * 1.05 - streakPhase * (width * 1.25);
          const streakY = runnerRoadY - 125 + ((si * 43) % 150);
          const streakLen = 45 + (speed * 4) + (si % 3) * 25;
          const streakAlpha = (Math.sin(streakPhase * Math.PI) * 0.5) * Math.min(1.0, (speed - 7.5) / 2.0);

          if (streakAlpha > 0.05) {
            const grad = ctx.createLinearGradient(streakX, streakY, streakX + streakLen, streakY);
            const streakColor = theme === 'night' 
              ? `rgba(180, 220, 255, ${streakAlpha})` 
              : `rgba(255, 255, 255, ${streakAlpha})`;
            grad.addColorStop(0, streakColor);
            grad.addColorStop(0.3, streakColor);
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.strokeStyle = grad;
            ctx.lineWidth = (si % 4 === 0) ? 2.0 : 1.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(streakX, streakY);
            ctx.lineTo(streakX + streakLen, streakY);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // ------------------------------------------
      // 8. FOREGROUND PARTICLES (Sakura / Autumn / Rain / Mist / Fireflies)
      // ------------------------------------------
      state.particles.forEach((p) => {
        // Particle drift speeds scale with running speed
        const particleSpeedMult = isMoving ? 1 + speed * 0.15 : 1;
        p.x += p.vx * particleSpeedMult;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        // Wrap around screen with active weather / theme color
        if (p.type === 'rain') {
          if (p.y > height + 25 || p.x < -30) {
            p.y = -20;
            p.x = Math.random() * (width + 120);
          }
        } else {
          if (p.x < -20) {
            p.x = width + 20;
            p.color = getParticleColor(theme, curWeather);
          }
          if (p.y > height + 20) {
            p.y = -20;
            p.color = getParticleColor(theme, curWeather);
          }
        }

        ctx.save();

        if (p.type === 'rain') {
          // Fast Angled Rain Drop Streak
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.5, p.y + p.vy * 1.5);
          ctx.stroke();

          // Spawn puddle ripple on pavement
          const currentRoadY = roadLeftY + (roadRightY - roadLeftY) * ((p.x - (-20)) / (width + 40));
          if (p.y >= currentRoadY && p.y <= currentRoadY + 32 && state.ripples.length < 20 && Math.random() < 0.25) {
            state.ripples.push({
              x: p.x,
              y: p.y,
              r: 1.5,
              maxR: 9 + Math.random() * 6,
              alpha: 0.8,
            });
          }
        } else if (p.type === 'autumn') {
          // Vibrant Autumn Maple Leaf (Momiji)
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          // Stem
          ctx.strokeStyle = '#5D4037';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-p.size * 0.75, p.size * 0.35);
          ctx.stroke();
        } else if (curWeather === 'mist') {
          // Soft Floating Mist Particle
          ctx.translate(p.x, p.y);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (theme === 'night') {
          // Firefly Glowing Dot
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          const pulse = 0.4 + 0.6 * Math.sin(windTime * 4 + p.x);
          ctx.fillStyle = `rgba(255, 245, 157, ${p.alpha * pulse})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Petal / Leaf Shape
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Continue animation loop
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Treadmill Controls Handlers
  const handleAdjustSpeed = (delta: number) => {
    lastActionTimeRef.current = Date.now();
    if (soundEnabled) audioCoach.playButtonTapSound();
    const base = targetSpeed > 0.5 ? targetSpeed : (metrics.speedKmh > 0.5 ? metrics.speedKmh : 3.0);
    const newSpeed = Math.min(16.0, Math.max(1.0, Math.round((base + delta) * 10) / 10));
    setTargetSpeed(newSpeed);
    onSetSpeed(newSpeed);
  };

  const handleDirectSpeed = (spd: number) => {
    lastActionTimeRef.current = Date.now();
    if (soundEnabled) audioCoach.playButtonTapSound();
    setTargetSpeed(spd);
    onSetSpeed(spd);
  };

  const handleAdjustIncline = (delta: number) => {
    lastActionTimeRef.current = Date.now();
    if (soundEnabled) audioCoach.playButtonTapSound();
    const newIncline = Math.min(20, Math.max(0, Math.round(targetIncline + delta)));
    setTargetIncline(newIncline);
    onSetIncline(newIncline);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isRunning = metrics.speedKmh > 0.1;
  const distanceKm = (metrics.distanceMeters / 1000).toFixed(2);
  const durationStr = formatDuration(metrics.elapsedSeconds);
  const caloriesStr = Math.round(metrics.caloriesBurned).toString();
  const paceStr = formatPace(metrics.currentPaceSecPerKm);
  const currentTimeStr = currentTime.toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });

  // Target distance from Goal or default 5.0 km (Phase 1)
  const targetKm = (goal?.type === 'distance' && goal.target > 0)
    ? goal.target
    : (goal?.type === 'time' && goal.target > 0)
    ? Math.max(1, Math.round((goal.target / 60) * (metrics.speedKmh > 0 ? metrics.speedKmh : 5.0) * 10) / 10)
    : 5.0;

  const currentKm = metrics.distanceMeters / 1000;
  const progressPercent = Math.min(100, Math.max(0, (currentKm / targetKm) * 100));
  const remainingKm = Math.max(0, targetKm - currentKm);
  const remainingKmStr = remainingKm > 0 ? remainingKm.toFixed(2) : '0.00';
  const targetKmLabel = goal?.title || `เป้าหมาย ${targetKm.toFixed(1)} km`;

  // Companion emoji helper
  const companionEmoji = companion === 'shiba' ? '🐕' : companion === 'cat' ? '🐱' : companion === 'bunny' ? '🐰' : null;

  // Key milestones and roadside encounters along the journey
  const landmarkPins = [
    { km: 0.3, label: 'แมวนำโชคศาลเจ้า', icon: '🐾' },
    { km: 0.5, label: 'ซุ้มกาแฟดริป', icon: '☕' },
    { km: 0.7, label: 'กวางนาราทักทาย', icon: '🦌' },
    { km: 0.9, label: 'ซุ้มน้ำชาร่มแดง', icon: '🍵' },
    { km: 1.0, label: 'สะพานซากุระ', icon: '🌸' },
    { km: 1.2, label: 'ทางรถไฟโบราณ', icon: '🚃' },
    { km: 1.5, label: 'หมู่บ้านชนบท', icon: '🏡' },
    { km: 2.0, label: 'ทุ่งดอกไม้', icon: '🌾' },
    { km: 2.5, label: 'จุดชมวิวเทือกเขา', icon: '🏔️' },
    { km: 3.0, label: 'ประตูโทริอิ', icon: '⛩️' },
    { km: 4.0, label: 'ริมทะเลสาบ', icon: '🌊' },
    { km: targetKm, label: 'เส้นชัย', icon: '🏁' },
  ].filter((p, idx, arr) => p.km <= targetKm && (idx === arr.length - 1 || p.km < targetKm));

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#FAF7F2] text-[#2C2621] flex flex-col overflow-hidden select-none"
    >
      {/* FULLSCREEN CANVAS VIEW */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full block cursor-pointer"
        onClick={() => setZenMode(!zenMode)}
      />

      {/* SHUTTER FLASH OVERLAY (Scenic Postcard) */}
      {showShutterFlash && (
        <div className="absolute inset-0 bg-white pointer-events-none z-50 animate-out fade-out duration-300" />
      )}

      {/* TOP FLOATING CONTROL BAR */}
      <div className={`relative z-20 p-3 sm:p-4 flex items-center justify-between gap-2 transition-all duration-300 ${
        zenMode ? 'opacity-20 hover:opacity-100' : 'opacity-100'
      }`}>
        {/* Left: Stage Progress & Theme Switcher & Companion Picker */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Stage Indicator Badge & Stage Jump Popover */}
          <div className="relative">
            {(() => {
              const activeStageId = previewStageId || getStageForDistance(metrics.distanceMeters);
              const activeStage = SCENIC_STAGES[activeStageId];
              return (
                <button
                  type="button"
                  onClick={() => setShowStageMenu(!showStageMenu)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border backdrop-blur-md shadow-cozy-sm text-xs font-semibold cursor-pointer transition-all hover:scale-102 active:scale-98 ${
                    showStageMenu
                      ? 'bg-[#2C2621] text-white border-[#2C2621]'
                      : 'bg-white/95 text-[#2C2621] border-[#EDE6DC] hover:border-[#D4AF37]'
                  }`}
                  title="คลิกเพื่อเลือกเมือง / ทดสอบด่านและจำลองการวิ่ง"
                >
                  <div className="w-5 h-5 rounded-lg border border-[#C44536]/30 bg-[#FDF4F2] flex items-center justify-center overflow-hidden shrink-0">
                    <img src={activeStage.stampSrc} alt={activeStage.name} className="w-4 h-4 object-contain" />
                  </div>
                  <div className="flex items-center gap-1.5 text-left">
                    <span className="font-black truncate max-w-[120px] sm:max-w-none">{activeStage.name}</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${showStageMenu ? 'bg-white/20 text-white' : 'bg-[#F3EFE6] text-[#7A6E65]'}`}>
                      {activeStage.rangeKm}
                    </span>
                  </div>
                </button>
              );
            })()}

            {/* Click-away backdrop */}
            {showStageMenu && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowStageMenu(false)}
              />
            )}

            {/* Stage Selector & Simulator Popover Menu */}
            {showStageMenu && (
              <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 p-4 rounded-3xl bg-white/95 backdrop-blur-xl border border-[#EDE6DC] shadow-cozy-lg z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3.5 text-[#2C2621]">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#F0EAE1]">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#C44536]">
                    <span>🎌</span>
                    <span>เลือกดูเมือง & ทดสอบด่าน (Stage Preview)</span>
                  </div>
                  <button
                    onClick={() => setShowStageMenu(false)}
                    className="text-[#8C827A] hover:text-[#2C2621] text-xs font-bold cursor-pointer px-1"
                  >
                    ✕
                  </button>
                </div>

                {/* 4 Stage Quick-Jump Cards */}
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SCENIC_STAGES) as StageId[]).map((sId) => {
                    const stg = SCENIC_STAGES[sId];
                    const isSelected = (previewStageId || getStageForDistance(metrics.distanceMeters)) === sId;
                    return (
                      <button
                        key={sId}
                        onClick={() => handleJumpToStage(sId)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#FAF7F2] border-[#C44536] shadow-cozy-sm ring-1 ring-[#C44536]'
                            : 'bg-white/80 border-[#E8E1D5] hover:bg-[#FAF7F2] hover:border-[#D4AF37]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <img src={stg.stampSrc} alt={stg.name} className="w-6 h-6 object-contain" />
                          <span className="text-[10px] font-mono font-bold text-[#8C827A] bg-[#F4EEE4] px-1.5 py-0.5 rounded-full">
                            {stg.rangeKm.split(' ')[0]}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-black text-[#2C2621] line-clamp-1">{stg.name}</div>
                          <div className="text-[10px] text-[#8C827A] line-clamp-1">{stg.tag}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Simulated Walking & Jogging Toggle */}
                <div className="pt-2 border-t border-[#F0EAE1] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#443830] flex items-center gap-1">
                      <span>🏃</span>
                      <span>จำลองการวิ่ง (Demo Walking):</span>
                    </span>
                    <span className="font-mono text-xs font-black text-[#3B664E]">
                      {simulatedSpeed > 0 ? `${simulatedSpeed.toFixed(1)} km/h` : 'ปิดอยู่'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: 'หยุดนิ่ง', spd: 0 },
                      { label: 'เดิน 4 km/h', spd: 4.0 },
                      { label: 'วิ่ง 7 km/h', spd: 7.0 },
                    ].map((btn) => (
                      <button
                        key={btn.spd}
                        onClick={() => setSimulatedSpeed(btn.spd)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          simulatedSpeed === btn.spd
                            ? 'bg-[#3B664E] text-white shadow-cozy-sm'
                            : 'bg-[#F4EEE4] text-[#7A6E65] hover:bg-[#EAE3D9]'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Reset to Treadmill Real Distance */}
                  {previewStageId && (
                    <button
                      onClick={handleResetToRealTreadmill}
                      className="w-full mt-1 py-1.5 rounded-xl bg-white border border-[#E0D8CB] hover:bg-[#FAF7F2] text-[11px] font-bold text-[#8C827A] hover:text-[#2C2621] transition-all cursor-pointer text-center"
                    >
                      ↺ กลับสู่ระยะทางจริงบนลู่วิ่ง
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Selector with Real-World Time Auto-Sync */}
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-[#EDE6DC] shadow-cozy-sm text-xs font-medium">
            {/* Auto Real-Time Mode Toggle */}
            <button
              onClick={handleEnableAutoTheme}
              className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                isAutoTheme 
                  ? 'bg-[#52796F] text-white font-bold shadow-cozy-sm' 
                  : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title={`ปรับธีมอัตโนมัติตามเวลาจริง (ขณะนี้ ${currentTimeStr} น. - ${getTimePeriodLabel(currentTime)})`}
            >
              <Clock className="w-3 h-3" />
              <span>เวลาจริง ({currentTimeStr})</span>
            </button>

            <span className="text-[#D7CEC3] text-[11px] px-0.5">|</span>

            {/* Sakura Morning (06:00 - 11:00) */}
            <button
              onClick={() => handleSelectTheme('sakura')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                !isAutoTheme && theme === 'sakura'
                  ? 'bg-[#52796F] text-white font-bold shadow-cozy-sm'
                  : isAutoTheme && theme === 'sakura'
                  ? 'bg-[#EAF2EC] text-[#3B664E] font-semibold border border-[#CDE0D3]'
                  : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title="หุบเขาซากุระ (เช้าตรู่ 06:00 - 11:00)"
            >
              <span>🌸</span>
              <span>ซากุระ</span>
              {isAutoTheme && theme === 'sakura' && <span className="text-[9px] opacity-75">●</span>}
            </button>

            {/* Cozy Countryside (11:00 - 17:00) */}
            <button
              onClick={() => handleSelectTheme('countryside')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                !isAutoTheme && theme === 'countryside'
                  ? 'bg-[#52796F] text-white font-bold shadow-cozy-sm'
                  : isAutoTheme && theme === 'countryside'
                  ? 'bg-[#EAF2EC] text-[#3B664E] font-semibold border border-[#CDE0D3]'
                  : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title="ทุ่งหญ้าชนบท (กลางวัน 11:00 - 17:00)"
            >
              <span>☕</span>
              <span>ชนบท</span>
              {isAutoTheme && theme === 'countryside' && <span className="text-[9px] opacity-75">●</span>}
            </button>

            {/* Sunset Beach (17:00 - 19:00 e.g. 18:00) */}
            <button
              onClick={() => handleSelectTheme('sunset')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                !isAutoTheme && theme === 'sunset'
                  ? 'bg-[#52796F] text-white font-bold shadow-cozy-sm'
                  : isAutoTheme && theme === 'sunset'
                  ? 'bg-[#EAF2EC] text-[#3B664E] font-semibold border border-[#CDE0D3]'
                  : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title="เลียบหาดอัสดง (ตะวันตกดิน 17:00 - 19:00 เช่น 18.00 น.)"
            >
              <span>🌅</span>
              <span>ตะวันตกดิน</span>
              {isAutoTheme && theme === 'sunset' && <span className="text-[9px] opacity-75">●</span>}
            </button>

            {/* Starry Night (19:00 - 06:00) */}
            <button
              onClick={() => handleSelectTheme('night')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                !isAutoTheme && theme === 'night'
                  ? 'bg-[#52796F] text-white font-bold shadow-cozy-sm'
                  : isAutoTheme && theme === 'night'
                  ? 'bg-[#EAF2EC] text-[#3B664E] font-semibold border border-[#CDE0D3]'
                  : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title="คืนดาวพราว (ค่ำคืน 19:00 - 06:00)"
            >
              <span>🌙</span>
              <span>คืนดาว</span>
              {isAutoTheme && theme === 'night' && <span className="text-[9px] opacity-75">●</span>}
            </button>
          </div>

          {/* Companion Animal Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-white/85 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-[#EDE6DC] shadow-cozy-sm text-xs font-medium">
            <span className="text-[#8C827A] px-1 text-[11px]">เพื่อนร่วมทาง:</span>
            <button
              onClick={() => setCompanion('shiba')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer ${
                companion === 'shiba' ? 'bg-[#C46849] text-white font-bold' : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title="น้องหมาชิบะ"
            >
              🐕 ชิบะ
            </button>
            <button
              onClick={() => setCompanion('cat')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer ${
                companion === 'cat' ? 'bg-[#C46849] text-white font-bold' : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title="น้องแมวส้ม"
            >
              🐈 แมวส้ม
            </button>
            <button
              onClick={() => setCompanion('bunny')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer ${
                companion === 'bunny' ? 'bg-[#C46849] text-white font-bold' : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title="น้องกระต่าย"
            >
              🐰 กระต่าย
            </button>
            <button
              onClick={() => setCompanion('none')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer ${
                companion === 'none' ? 'bg-[#52796F] text-white font-bold' : 'text-[#8C827A] hover:bg-[#FAF7F2]'
              }`}
              title="วิ่งเดี่ยว"
            >
              เดี่ยว
            </button>
          </div>

          {/* Weather Selector (Phase 2) */}
          <div className="hidden md:flex items-center gap-1 bg-white/85 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-[#EDE6DC] shadow-cozy-sm text-xs font-medium">
            <span className="text-[#8C827A] px-1 text-[11px]">สภาพอากาศ:</span>
            <button
              onClick={() => handleSelectWeather('clear')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                weather === 'clear' ? 'bg-[#52796F] text-white font-bold shadow-cozy-sm' : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title="อากาศแจ่มใส (ตามธีมหลัก)"
            >
              <span>☀️</span>
              <span>แจ่มใส</span>
            </button>
            <button
              onClick={() => handleSelectWeather('rain')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                weather === 'rain' ? 'bg-[#4A7A96] text-white font-bold shadow-cozy-sm' : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title="ฝนตกปรอยๆ บรรยากาศอบอุ่น (Cozy Drizzle)"
            >
              <span>🌧️</span>
              <span>ฝนปรอย</span>
            </button>
            <button
              onClick={() => handleSelectWeather('mist')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                weather === 'mist' ? 'bg-[#6B7F8C] text-white font-bold shadow-cozy-sm' : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title="หมอกยามเช้าลอยเรี่ยเขา (Morning Mist)"
            >
              <span>🌫️</span>
              <span>หมอก</span>
            </button>
            <button
              onClick={() => handleSelectWeather('autumn')}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                weather === 'autumn' ? 'bg-[#C46849] text-white font-bold shadow-cozy-sm' : 'text-[#5A5047] hover:bg-[#FAF7F2]'
              }`}
              title="ลมใบไม้ร่วงสีทอง (Autumn Breeze)"
            >
              <span>🍂</span>
              <span>ใบไม้ร่วง</span>
            </button>
          </div>

          {/* Compact Weather Selector for Mobile */}
          <div className="flex md:hidden items-center gap-0.5 bg-white/85 backdrop-blur-md px-1.5 py-1 rounded-2xl border border-[#EDE6DC] shadow-cozy-sm text-xs">
            {(['clear', 'rain', 'mist', 'autumn'] as ScenicWeather[]).map((w) => {
              const icons = { clear: '☀️', rain: '🌧️', mist: '🌫️', autumn: '🍂' };
              const titles = { clear: 'แจ่มใส', rain: 'ฝนปรอย', mist: 'หมอก', autumn: 'ใบไม้ร่วง' };
              return (
                <button
                  key={w}
                  onClick={() => handleSelectWeather(w)}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    weather === w ? 'bg-[#52796F] text-white scale-105 shadow-cozy-sm' : 'text-[#5A5047] hover:bg-[#FAF7F2]'
                  }`}
                  title={titles[w]}
                >
                  <span className="text-xs">{icons[w]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Toggles (Zen Mode / Sound / Giant HUD / Close) */}
        <div className="flex items-center gap-2">
          {/* Zen Minimal Mode Toggle */}
          <button
            onClick={() => setZenMode(!zenMode)}
            className={`px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md border transition-all cursor-pointer shadow-cozy-sm ${
              zenMode
                ? 'bg-[#52796F] text-white border-[#52796F]'
                : 'bg-white/85 text-[#5A5047] border-[#EDE6DC] hover:bg-white'
            }`}
            title={zenMode ? 'แสดงข้อมูลทั้งหมด' : 'ซ่อนปุ่ม เปิดโหมดเซ็นดูวิวเพลินๆ'}
          >
            {zenMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{zenMode ? 'แสดง HUD' : 'โหมดเซ็น'}</span>
          </button>

          {/* Sound Controls & Flow State Audio Menu (Phase 3) */}
          <div className="relative">
            <button
              onClick={() => setShowSoundMenu(!showSoundMenu)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md border transition-all cursor-pointer shadow-cozy-sm ${
                ambientSoundEnabled || soundEnabled
                  ? 'bg-white/90 text-[#3B664E] border-[#CDE0D3] hover:bg-white'
                  : 'bg-white/80 text-[#8C827A] border-[#EDE6DC] hover:bg-white'
              }`}
              title="ตั้งค่าเสียงเอฟเฟกต์ & เสียงบรรยากาศธรรมชาติ (Soundscape)"
            >
              {ambientSoundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-[#52796F]" />
              ) : soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-[#8C827A]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-[#A89F91]" />
              )}
              <span className="hidden sm:inline">
                {ambientSoundEnabled ? 'เสียงธรรมชาติ' : soundEnabled ? 'เสียงก้าวเท้า' : 'ปิดเสียง'}
              </span>
              {ambientSoundEnabled && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#EAF2EC] text-[#3B664E]">
                  {Math.round(ambientVolume * 100)}%
                </span>
              )}
            </button>

            {/* Backdrop click-away dismissal */}
            {showSoundMenu && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowSoundMenu(false)} 
              />
            )}

            {/* Frosted Cozy Sound Popover Menu */}
            {showSoundMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 p-3.5 rounded-3xl bg-white/95 backdrop-blur-lg border border-[#EDE6DC] shadow-cozy-lg z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3.5 text-[#2C2621]">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#F0EAE1]">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#3B664E]">
                    <Music className="w-3.5 h-3.5 text-[#52796F]" />
                    <span>เสียงและบรรยากาศ (Flow State)</span>
                  </div>
                  <button 
                    onClick={() => setShowSoundMenu(false)}
                    className="text-[#8C827A] hover:text-[#2C2621] text-xs font-bold cursor-pointer px-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Section 1: Ambient Soundscape */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#443830] flex items-center gap-1">
                        <span>🍃</span>
                        <span>เสียงธรรมชาติเบื้องหลัง</span>
                      </div>
                      <div className="text-[10px] text-[#8C827A]">
                        {weather === 'rain'
                          ? '🌧️ ละอองฝนตกปรอยๆ (Cozy Drizzle)'
                          : weather === 'mist'
                          ? '🌫️ สายลมหมอกหุบเขา (Mountain Drone)'
                          : theme === 'sakura'
                          ? '🌸 ลมยอดไม้ + กระดิ่งลมญี่ปุ่น (Fuurin)'
                          : theme === 'countryside'
                          ? '☕ นกยามเช้า + สายน้ำไหลเอื่อย'
                          : theme === 'sunset'
                          ? '🌅 คลื่นซัดหาดทรายยามอัสดง'
                          : '🌙 ลมค่ำคืน + จิ้งหรีด Lo-Fi'}
                      </div>
                    </div>
                    <button
                      onClick={handleToggleAmbient}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        ambientSoundEnabled
                          ? 'bg-[#52796F] text-white shadow-cozy-sm'
                          : 'bg-[#F3EFE6] text-[#8C827A] hover:bg-[#EAE3D9]'
                      }`}
                    >
                      {ambientSoundEnabled ? 'เปิดอยู่' : 'ปิด'}
                    </button>
                  </div>

                  {/* Volume Steppers */}
                  {ambientSoundEnabled && (
                    <div className="flex items-center gap-1 pt-1">
                      <span className="text-[10px] font-semibold text-[#8C827A] mr-1">ระดับเสียง:</span>
                      {[
                        { label: '30%', val: 0.3 },
                        { label: '60%', val: 0.6 },
                        { label: '90%', val: 0.9 },
                      ].map((lvl) => (
                        <button
                          key={lvl.val}
                          onClick={() => handleSetAmbientVolume(lvl.val)}
                          className={`flex-1 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                            Math.abs(ambientVolume - lvl.val) < 0.15
                              ? 'bg-[#EAF2EC] text-[#3B664E] border border-[#52796F] shadow-cozy-sm'
                              : 'bg-[#FAF7F2] text-[#5A5047] border border-[#EDE6DC] hover:bg-white'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: SFX & Footsteps */}
                <div className="pt-2 border-t border-[#F0EAE1] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#443830] flex items-center gap-1">
                      <span>👟</span>
                      <span>เสียงก้าวเท้า & ชัยชนะ</span>
                    </div>
                    <div className="text-[10px] text-[#8C827A]">
                      เสียงฝีเท้าตามรอบขา และดนตรีเฉลิมฉลอง
                    </div>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      soundEnabled
                        ? 'bg-[#52796F] text-white shadow-cozy-sm'
                        : 'bg-[#F3EFE6] text-[#8C827A] hover:bg-[#EAE3D9]'
                    }`}
                  >
                    {soundEnabled ? 'เปิดอยู่' : 'ปิด'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Goshuincho Stamp Journal Button (Phase 3) */}
          <button
            onClick={() => setShowGoshuinModal(true)}
            className="px-2.5 py-1.5 rounded-2xl bg-white/85 hover:bg-white text-[#B7950B] font-semibold text-xs backdrop-blur-md border border-[#F9E79F] transition-all shadow-cozy-sm flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
            title={`คลิกเพื่อเปิดสมุดสะสมตราประทับ (Goshuincho) • สำเร็จแล้ว ${unlockedCount}/${ACHIEVEMENT_CATALOG.length} ตรา`}
          >
            <Trophy className="w-3.5 h-3.5 text-[#F5BA42]" />
            <span className="font-mono text-[11px] font-bold text-[#8D6E63] hidden sm:inline">สมุดตราประทับ</span>
            <span className="font-mono text-[11px] font-black text-[#B7950B]">{unlockedCount}/{ACHIEVEMENT_CATALOG.length}</span>
          </button>

          {/* Postcard Capture Button (Phase 4) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCapturePostcard();
            }}
            disabled={isCapturingPostcard}
            className="px-3 py-1.5 rounded-2xl bg-white/85 hover:bg-white text-[#C46849] font-semibold text-xs backdrop-blur-md border border-[#F6D8C6] transition-all cursor-pointer shadow-cozy-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="บันทึกภาพโปสการ์ดความทรงจำ (Scenic Postcard)"
          >
            <Camera className="w-3.5 h-3.5 text-[#C46849]" />
            <span className="hidden sm:inline">ถ่ายโปสการ์ด</span>
          </button>

          {/* Switch to Giant HUD */}
          {onOpenGiantHud && (
            <button
              onClick={() => {
                onClose();
                onOpenGiantHud();
              }}
              className="px-3 py-1.5 rounded-2xl bg-white/85 hover:bg-white text-[#3B664E] font-semibold text-xs backdrop-blur-md border border-[#CDE0D3] transition-all cursor-pointer shadow-cozy-sm flex items-center gap-1.5"
              title="สลับไปหน้าจอวิ่งตัวเลขยักษ์ (Giant HUD)"
            >
              <Tv className="w-3.5 h-3.5 text-[#52796F]" />
              <span className="hidden sm:inline">จอวิ่งยักษ์</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded-2xl bg-white/85 hover:bg-white text-[#5A5047] backdrop-blur-md border border-[#EDE6DC] transition-all cursor-pointer shadow-cozy-sm"
            title="เต็มจอ"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Scenic View */}
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/85 hover:bg-[#FDF0F0] text-[#B94A4A] backdrop-blur-md border border-[#F4CECE] transition-all cursor-pointer shadow-cozy-sm"
            title="กลับสู่หน้าแดชบอร์ดหลัก"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MILESTONE CELEBRATION TOAST BANNER */}
      {milestoneToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 sm:px-6 sm:py-3 rounded-3xl bg-white/95 backdrop-blur-md border-2 border-[#E3B873] shadow-cozy-lg text-[#2C2621] text-xs sm:text-sm font-bold flex items-center gap-3 animate-in zoom-in-95 duration-200">
          <div className="w-8 h-8 rounded-2xl bg-[#FDF6EA] border border-[#F0DFBE] flex items-center justify-center text-lg animate-bounce">
            🎉
          </div>
          <div>
            <div className="text-[10px] text-[#A66E22] uppercase tracking-wider font-extrabold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#B67A28]" />
              <span>พิชิตหลักกิโลเมตร!</span>
            </div>
            <div className="text-xs sm:text-sm font-black text-[#3B664E]">
              {milestoneToast}
            </div>
          </div>
        </div>
      )}

      {/* CENTER HUD: TELEMETRY PILLS (Hidden or minimized in Zen Mode) */}
      <div className={`relative z-10 mx-auto max-w-4xl w-full px-4 pt-2 transition-all duration-300 pointer-events-none ${
        zenMode ? 'opacity-40 hover:opacity-100' : 'opacity-100'
      }`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pointer-events-auto">
          {/* SPEED PILL */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-[#EDE6DC] shadow-cozy-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#8C827A] flex items-center gap-1">
                <Gauge className="w-3 h-3 text-[#52796F]" />
                <span>ความเร็ว</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#2C2621] digital-number">
                {metrics.speedKmh.toFixed(1)} <span className="text-xs font-normal text-[#8C827A]">km/h</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-[#52796F] font-mono">
              {paceStr}
            </div>
          </div>

          {/* INCLINE PILL */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-[#EDE6DC] shadow-cozy-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#8C827A] flex items-center gap-1">
                <Mountain className="w-3 h-3 text-[#C46849]" />
                <span>ความชัน</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#2C2621] digital-number">
                {metrics.inclineLevel} <span className="text-xs font-normal text-[#8C827A]">ระดับ</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-[#C46849] font-mono">
              +{(metrics.inclineLevel * 0.8).toFixed(1)}%
            </div>
          </div>

          {/* DISTANCE PILL */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-[#EDE6DC] shadow-cozy-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#8C827A] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#3B664E]" />
                <span>ระยะทาง</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#2C2621] digital-number">
                {distanceKm} <span className="text-xs font-normal text-[#8C827A]">km</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-[#8C827A] font-mono">
              {Math.round(metrics.distanceMeters)}m
            </div>
          </div>

          {/* TIME & CALORIES PILL */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-[#EDE6DC] shadow-cozy-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#8C827A] flex items-center gap-1">
                <Timer className="w-3 h-3 text-[#B67A28]" />
                <span>เวลา</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#2C2621] digital-number">
                {durationStr}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#B85737] font-bold font-mono flex items-center gap-0.5 justify-end">
                <Flame className="w-3 h-3" />
                <span>{caloriesStr}</span>
              </span>
              <span className="text-[9px] text-[#8C827A]">kcal</span>
            </div>
          </div>
        </div>
      </div>

      {/* MINI JOURNEY PROGRESS BAR CARD (Phase 1) */}
      <div className={`relative z-10 mx-auto max-w-4xl w-full px-4 pt-2 transition-all duration-300 pointer-events-none ${
        zenMode ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
      }`}>
        <div className="bg-white/85 backdrop-blur-md rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 border border-[#EDE6DC] shadow-cozy-sm pointer-events-auto">
          {/* Top Info Row */}
          <div className="flex items-center justify-between text-xs mb-1.5 font-bold text-[#2C2621]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[#3B664E] text-xs sm:text-sm">🚩</span>
              <span className="text-[11px] sm:text-xs text-[#443830] font-bold">{targetKmLabel}</span>
              {metrics.inclineLevel > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FDF2E9] text-[#C46849] border border-[#F6D8C6] text-[10px] font-extrabold shadow-cozy-sm">
                  <Mountain className="w-2.5 h-2.5 text-[#C46849]" />
                  <span>ชัน +{metrics.inclineLevel} (+{(metrics.inclineLevel * 0.8).toFixed(1)}%)</span>
                </span>
              )}

              {/* Ghost Pacer Toggle & Speed Pill (Phase 4) */}
              <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#EDE6DC] text-[10px]">
                <button
                  onClick={handleTogglePacer}
                  className={`flex items-center gap-1 font-bold cursor-pointer transition-all ${
                    pacerEnabled ? 'text-[#1E6091]' : 'text-[#8C827A] hover:text-[#5A5047]'
                  }`}
                  title={pacerEnabled ? 'คลิกเพื่อปิด Ghost Pacer' : 'คลิกเพื่อเปิดวิ่งแข่งกับ Ghost Pacer'}
                >
                  <Ghost className="w-3 h-3 text-[#5DADE2]" />
                  <span>{pacerEnabled ? `${pacerSpeed.toFixed(1)} km/h` : 'Pacer ปิด'}</span>
                </button>
                {pacerEnabled && (
                  <div className="flex items-center gap-1 ml-1 border-l border-[#EDE6DC] pl-1 font-mono">
                    <button 
                      onClick={() => handleAdjustPacerSpeed(-0.5)} 
                      className="w-4 h-4 flex items-center justify-center rounded bg-white hover:bg-[#EAE3D9] text-[#5A5047] font-bold cursor-pointer shadow-cozy-sm"
                      title="ลดความเร็ว Pacer -0.5 km/h"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => handleAdjustPacerSpeed(0.5)} 
                      className="w-4 h-4 flex items-center justify-center rounded bg-white hover:bg-[#EAE3D9] text-[#5A5047] font-bold cursor-pointer shadow-cozy-sm"
                      title="เพิ่มความเร็ว Pacer +0.5 km/h"
                    >
                      +
                    </button>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      pacerDeltaDisplay >= 0 ? 'text-[#2D6A4F] bg-[#D8F3DC]' : 'text-[#BC4749] bg-[#FDE2E4]'
                    }`} title={pacerDeltaDisplay >= 0 ? 'คุณนำ Pacer อยู่' : 'คุณตามหลัง Pacer อยู่'}>
                      {pacerDeltaDisplay >= 0 ? `+${Math.round(pacerDeltaDisplay)}m` : `${Math.round(pacerDeltaDisplay)}m`}
                    </span>
                  </div>
                )}
              </div>

              {/* Food Calorie Burn Pill (Phase 1) */}
              {(() => {
                const foods = getFoodsBurned(metrics.caloriesBurned);
                if (foods.length === 0) return null;
                return (
                  <div className="flex items-center gap-1 bg-[#FEF9E7] border border-[#F9E79F] px-2 py-0.5 rounded-full text-[10px] text-[#7D6608] font-bold shadow-cozy-sm" title="อาหารที่คุณวิ่งเบิร์นหมดไปแล้วในเซสชันนี้">
                    <span>🔥 เบิร์นแล้ว:</span>
                    <span className="font-semibold text-[#B7950B]">
                      {foods.slice(0, 3).map((f) => `${f.item.emoji} x${f.count}`).join(' ')}
                    </span>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs text-[#3B664E]">
              <span>{progressPercent.toFixed(0)}%</span>
              <span className="text-[10px] text-[#8C827A] font-normal">
                (เหลือ {remainingKmStr} km)
              </span>
            </div>
          </div>

          {/* The Progress Bar Track */}
          <div className="relative h-2 sm:h-2.5 w-full bg-[#EAE3D9] rounded-full overflow-visible flex items-center my-1.5">
            {/* Filled Progress Gradient */}
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#659B7D] via-[#52796F] to-[#3B664E] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Landmark Pins */}
            {landmarkPins.map((lm, idx) => {
              const isPassed = currentKm >= lm.km;
              const posPercent = (lm.km / targetKm) * 100;
              if (posPercent > 100) return null;
              return (
                <div 
                  key={idx}
                  className="absolute -top-1 sm:-top-1.5 -translate-x-1/2 flex flex-col items-center group cursor-pointer z-10"
                  style={{ left: `${posPercent}%` }}
                  title={`${lm.label} (${lm.km} km)`}
                >
                  <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] shadow-cozy-sm border transition-all ${
                    isPassed 
                      ? 'bg-[#EAF2EC] border-[#52796F] text-[#3B664E] scale-110' 
                      : 'bg-white border-[#EDE6DC] text-[#8C827A] opacity-70'
                  }`}>
                    {lm.icon}
                  </div>
                </div>
              );
            })}

            {/* Runner + Pet Avatar Pin sliding along the track */}
            <div 
              className="absolute -top-3.5 sm:-top-4 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FFFDF9] border border-[#52796F] shadow-cozy transition-all duration-300 pointer-events-none z-20"
              style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            >
              <span className="text-xs sm:text-sm">{activeProfile.avatar || '🏃‍♀️'}</span>
              {companionEmoji && <span className="text-[10px]">{companionEmoji}</span>}
            </div>

            {/* Ghost Pacer Sliding Pin (Phase 4) */}
            {pacerEnabled && (
              <div 
                className="absolute -top-3.5 sm:-top-4 -translate-x-1/2 flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#EBF5FB] border-2 border-[#5DADE2] shadow-cozy transition-all duration-300 pointer-events-none z-15"
                style={{ left: `${Math.min(100, Math.max(0, ((animStateRef.current.pacerDistance / 1000) / targetKm) * 100))}%` }}
                title={`Ghost Pacer (${pacerSpeed.toFixed(1)} km/h)`}
              >
                <span className="text-xs">👻</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SPACER FOR VIEWING SCENERY */}
      <div className="flex-1" />

      {/* BOTTOM QUICK TREADMILL CONTROLS BAR (Collapsible in Zen Mode) */}
      <div className={`relative z-20 max-w-3xl w-full mx-auto p-3 sm:p-4 mb-2 transition-all duration-300 ${
        zenMode ? 'opacity-0 translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}>
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-3.5 sm:p-4 border border-[#EDE6DC] shadow-cozy-lg space-y-3">
          
          {/* Main Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Start / Stop Belt */}
            {isRunning ? (
              <button
                onClick={onStop}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-[#FDF0F0] text-[#B94A4A] hover:bg-[#FBE4E4] border border-[#F4CECE] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shadow-cozy-sm"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>หยุดสายพาน (Stop)</span>
              </button>
            ) : (
              <button
                onClick={() => onStart(targetSpeed)}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-2xl bg-[#52796F] text-white hover:bg-[#43675E] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shadow-cozy-lg"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>เริ่มเดิน ({targetSpeed.toFixed(1)} km/h)</span>
              </button>
            )}

            {/* Quick Speed Stepper */}
            <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1 rounded-2xl border border-[#EDE6DC]">
              <span className="text-[10px] font-bold text-[#8C827A] px-2 hidden sm:inline">สปีด:</span>
              <button
                onClick={() => handleAdjustSpeed(-0.5)}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#F3EFE6] text-xs font-bold text-[#5A5047] border border-[#E5DDD0] cursor-pointer"
              >
                -0.5
              </button>
              <button
                onClick={() => handleAdjustSpeed(-0.1)}
                className="px-2 py-1 rounded-xl bg-white hover:bg-[#F3EFE6] text-xs font-bold text-[#5A5047] border border-[#E5DDD0] cursor-pointer"
              >
                -0.1
              </button>
              <span className="px-2 font-mono font-bold text-sm text-[#2C2621]">
                {targetSpeed.toFixed(1)}
              </span>
              <button
                onClick={() => handleAdjustSpeed(+0.1)}
                className="px-2 py-1 rounded-xl bg-white hover:bg-[#F3EFE6] text-xs font-bold text-[#5A5047] border border-[#E5DDD0] cursor-pointer"
              >
                +0.1
              </button>
              <button
                onClick={() => handleAdjustSpeed(+0.5)}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#F3EFE6] text-xs font-bold text-[#5A5047] border border-[#E5DDD0] cursor-pointer"
              >
                +0.5
              </button>
            </div>

            {/* Quick Incline Stepper */}
            <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1 rounded-2xl border border-[#EDE6DC]">
              <span className="text-[10px] font-bold text-[#8C827A] px-2 hidden sm:inline">ชัน:</span>
              <button
                onClick={() => handleAdjustIncline(-1)}
                disabled={targetIncline <= 0}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#F3EFE6] text-xs font-bold text-[#5A5047] border border-[#E5DDD0] disabled:opacity-40 cursor-pointer"
              >
                -1
              </button>
              <span className="px-2 font-mono font-bold text-sm text-[#C46849]">
                {targetIncline}
              </span>
              <button
                onClick={() => handleAdjustIncline(+1)}
                disabled={targetIncline >= 20}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#F3EFE6] text-xs font-bold text-[#5A5047] border border-[#E5DDD0] disabled:opacity-40 cursor-pointer"
              >
                +1
              </button>
            </div>
          </div>

          {/* Quick Favorite Speed Preset Buttons */}
          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#F0EBE1] text-xs">
            <span className="text-[11px] text-[#8C827A] hidden sm:inline">ทางลัดสปีด:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {(activeProfile?.favoriteSpeeds || [3.0, 4.5, 6.0, 8.0]).map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleDirectSpeed(spd)}
                  className={`px-3 py-1 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer border ${
                    Math.abs(metrics.speedKmh - spd) < 0.1
                      ? 'bg-[#52796F] text-white border-[#52796F]'
                      : 'bg-[#FAF7F2] text-[#5A5047] border-[#EDE6DC] hover:bg-[#F3EFE6]'
                  }`}
                >
                  {spd.toFixed(1)}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-[#8C827A] hidden md:inline">
              แตะที่ใดก็ได้บนภาพเพื่อซ่อน/เปิด HUD
            </span>
          </div>

        </div>
      </div>

      {/* CELEBRATORY STAGE TRANSITION BANNER (Phase 5) */}
      {activeStageTransition && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto cursor-pointer animate-in fade-in slide-in-from-top-6 duration-500 max-w-[92vw] sm:max-w-md select-none"
          onClick={() => {
            setShowGoshuinModal(true);
            setActiveStageTransition(null);
          }}
          title="คลิกเพื่อดูสมุดสะสมตราประทับ"
        >
          <div className="relative flex items-center gap-3.5 px-4.5 py-3.5 rounded-3xl bg-[#FAF7F2]/95 backdrop-blur-xl border-2 border-[#D4AF37] shadow-2xl text-[#2C2621] overflow-hidden">
            {/* Shimmer background accent */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundColor: activeStageTransition.stage.accent }}
            />
            {/* Hanko Stamp Icon */}
            <div className="relative shrink-0 w-14 h-14 rounded-2xl border-2 border-[#C44536] bg-[#FDF4F2] flex items-center justify-center shadow-md rotate-[-3deg] overflow-hidden p-1">
              <img
                src={activeStageTransition.stage.stampSrc}
                alt={activeStageTransition.stage.name}
                className="w-full h-full object-contain filter drop-shadow-sm"
              />
              <span className="absolute -bottom-1 -right-1 text-[8px] font-black px-1 rounded bg-[#C44536] text-white">
                済
              </span>
            </div>
            {/* Text info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-[#C44536]">
                <span>🎉 ข้ามเขตสู่เมืองใหม่ • {activeStageTransition.stage.rangeKm}</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-[#2C2621] truncate">
                {activeStageTransition.stage.name}
              </h3>
              <p className="text-[11px] text-[#7A6E65] line-clamp-2 leading-tight">
                {activeStageTransition.stage.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEAM-STYLE ACHIEVEMENT TOAST NOTIFICATION (Phase 1) */}
      <ScenicAchievementToast
        queue={achievementQueue}
        onDismiss={handleDismissAchievement}
      />

      {/* GOSHUINCHO ACHIEVEMENT STAMP JOURNAL MODAL (Phase 3) */}
      <ScenicGoshuinModal
        isOpen={showGoshuinModal}
        onClose={() => setShowGoshuinModal(false)}
        sessionUnlockedIds={unlockedInSessionRef.current}
        activeProfile={activeProfile}
      />

      {/* SCENIC POSTCARD PREVIEW & DIRECT SAVE MODAL (iPad & Mobile Safe) */}
      {postcardPreviewUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPostcardPreviewUrl(null)}
        >
          <div 
            className="relative max-w-2xl w-full bg-[#FAF7F2] rounded-3xl p-4 sm:p-6 border-2 border-[#E7DFD5] shadow-2xl space-y-3.5 select-none text-[#2C2621]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📸</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#2C2621]">
                    บันทึกภาพความทรงจำ Scenic Run
                  </h3>
                  <p className="text-[11px] text-[#8C827A]">
                    ภาพความทรงจำพร้อมสถิติวิ่งและตราประทับ สำหรับแชร์ลง Instagram Story หรือบันทึกเก็บไว้
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPostcardPreviewUrl(null)}
                className="p-1.5 rounded-xl bg-white/80 hover:bg-white text-[#8C827A] hover:text-[#2C2621] transition-all cursor-pointer shadow-cozy-sm"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Format Switcher Tabs: 9:16 IG Story vs 3:2 Landscape */}
            <div className="flex items-center gap-1.5 p-1 bg-[#EDE6DC]/80 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => renderPostcardFromSnapshot('story')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  postcardFormat === 'story'
                    ? 'bg-[#52796F] text-white shadow-cozy-sm'
                    : 'text-[#6B635B] hover:text-[#2C2621]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>สตอรี่แนวตั้ง (9:16 IG Story)</span>
              </button>
              <button
                type="button"
                onClick={() => renderPostcardFromSnapshot('landscape')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  postcardFormat === 'landscape'
                    ? 'bg-[#52796F] text-white shadow-cozy-sm'
                    : 'text-[#6B635B] hover:text-[#2C2621]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>โปสการ์ดแนวนอน (3:2)</span>
              </button>
            </div>

            {/* Image Preview Container */}
            <div className="relative rounded-2xl overflow-hidden shadow-cozy-lg border border-[#EDE6DC] bg-[#F7F4EE] flex items-center justify-center p-2 sm:p-3 max-h-[52vh]">
              <img 
                src={postcardPreviewUrl} 
                alt="Scenic Postcard" 
                className="max-h-[48vh] w-auto max-w-full object-contain rounded-xl block select-auto pointer-events-auto shadow-md"
              />
            </div>

            {/* Action Buttons & iPad Tip */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-[#8C827A] text-center sm:text-left">
                💡 <span className="font-semibold text-[#5A5047]">บน iPad/iPhone:</span> แตะภาพค้างไว้ (Long Press) เพื่อเลือก <span className="text-[#C46849] font-bold">"บันทึกรูปภาพ" (Save to Photos)</span> หรือกดปุ่มแชร์เพื่อลง Instagram Story ได้ทันที
              </p>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!postcardBlob) return;
                      try {
                        const file = new File([postcardBlob], postcardFileName, { type: 'image/png' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                          await navigator.share({
                            files: [file],
                            title: 'Treadmill Scenic Run Story',
                            text: 'ภาพความทรงจำการวิ่ง Scenic Journey'
                          });
                        }
                      } catch (e) {
                        console.log('Share dismissed:', e);
                      }
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-2xl bg-[#52796F] hover:bg-[#3B664E] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-cozy-sm cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>แชร์ลง Instagram Story / บันทึกรูป</span>
                  </button>
                )}

                <a
                  href={postcardPreviewUrl}
                  download={postcardFileName}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-2xl bg-[#C46849] hover:bg-[#B3392B] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-cozy-sm cursor-pointer text-center"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด {postcardFormat === 'story' ? 'IG Story (9:16)' : 'โปสการ์ด (3:2)'}</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPostcardPreviewUrl(null)}
                  className="px-4 py-2 rounded-2xl bg-[#EAE3D9] hover:bg-[#DDD5C7] text-[#5A5047] font-bold text-xs transition-all cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
