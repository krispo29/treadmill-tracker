import React, { useState, useEffect, useRef } from 'react';
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
  Clock
} from 'lucide-react';
import type { TreadmillMetrics, UserProfile } from '../types/treadmill';
import { formatDuration, formatPace } from '../services/calculations';
import { audioCoach } from '../services/audioCoach';

export type ScenicTheme = 'sakura' | 'countryside' | 'sunset' | 'night';
export type CompanionType = 'shiba' | 'cat' | 'bunny' | 'none';

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

interface ScenicJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: TreadmillMetrics;
  activeProfile: UserProfile;
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
}

export const ScenicJourneyModal: React.FC<ScenicJourneyModalProps> = ({
  isOpen,
  onClose,
  metrics,
  activeProfile,
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
  const [zenMode, setZenMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const [assetsLoaded, setAssetsLoaded] = useState(false);
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
        '2.5': '🏔️ จุดชมวิวเทือกเขาไกลลิบ (2.5 km)',
        '3': '⛩️ ซุ้มประตูโทริอิกลางป่า (3.0 km)',
        '3.5': '🌲 แนวป่าสนหอมสดชื่น (3.5 km)',
        '4': '🌊 ริมทะเลสาบสะท้อนประกายแดด (4.0 km)',
        '4.5': '🍃 สวนสมุนไพรอบอุ่น (4.5 km)',
        '5': '🏆 พิชิตเป้าหมาย 5.0 KM สุดยอดมาก!'
      };

      const landmarkMsg = landmarks[String(reachedHalfKm)] || `🚩 ถึงหลักกิโลเมตรที่ ${reachedHalfKm.toFixed(1)} km!`;
      setMilestoneToast(landmarkMsg);
      if (soundEnabled) audioCoach.playIntervalChangeBeep();
      const timer = setTimeout(() => setMilestoneToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [metrics.distanceMeters, soundEnabled]);

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
    let lastTime = performance.now();

    // Scene Physics & Offsets
    let groundScroll = 0;
    let midScroll = 0;
    let farScroll = 0;
    let cadencePhase = 0;
    let lastFootstepPhase = 0;
    let companionPhase = 0;
    let windTime = 0;

    // Initialize ambient particles
    const particles: Particle[] = [];
    const maxParticles = theme === 'night' ? 70 : 45;

    const createParticle = (width: number, height: number): Particle => {
      let color = 'rgba(255, 183, 197, 0.7)'; // Sakura pink
      if (theme === 'countryside') color = Math.random() > 0.5 ? 'rgba(235, 179, 90, 0.7)' : 'rgba(168, 204, 168, 0.7)';
      if (theme === 'sunset') color = 'rgba(255, 214, 165, 0.75)';
      if (theme === 'night') color = 'rgba(255, 245, 157, 0.85)'; // Firefly glow

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: -(1.5 + Math.random() * 2.5),
        vy: 0.4 + Math.random() * 1.2,
        size: theme === 'night' ? 2 + Math.random() * 2.5 : 5 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.06,
        alpha: 0.3 + Math.random() * 0.7,
        color
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

      // Re-seed particles to screen boundaries
      if (particles.length === 0) {
        for (let i = 0; i < maxParticles; i++) {
          particles.push(createParticle(width, height));
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
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      windTime += dt;

      const width = canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
      const height = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
      const assets = assetsRef.current;
      ctx.imageSmoothingEnabled = false;

      // Speed factor based on treadmill speed
      const speed = metrics.speedKmh;
      const isMoving = speed > 0.15;
      
      // Speed multiplier for background parallax
      const scrollSpeed = isMoving ? speed * 28 : 2.5; // slow idle breeze when stopped
      groundScroll = (groundScroll + scrollSpeed * dt * 8) % width;
      midScroll = (midScroll + scrollSpeed * dt * 2.2) % width;
      farScroll = (farScroll + scrollSpeed * dt * 0.5) % width;

      // Incline slope calculation (0 to 20 level -> 0° to 12° slope)
      const inclineAngle = (Math.min(20, metrics.inclineLevel) / 20) * (10 * Math.PI / 180);

      // Cadence calculation: steps per second
      // Walking (3 km/h) -> ~1.8 steps/sec
      // Jogging (6 km/h) -> ~2.6 steps/sec
      // Running (10 km/h) -> ~3.1 steps/sec
      const stepRate = isMoving ? Math.min(4.0, 1.3 + (speed / 10) * 1.8) : 0;
      if (isMoving) {
        cadencePhase += dt * stepRate * Math.PI * 2;
        companionPhase += dt * (stepRate * 1.15) * Math.PI * 2;

        // Trigger footstep sound at bottom of stride
        const currentHalf = Math.floor(cadencePhase / Math.PI);
        if (currentHalf > lastFootstepPhase) {
          lastFootstepPhase = currentHalf;
          playFootstepTone();
        }
      }

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
        // Twinkling Stars
        for (let i = 0; i < 40; i++) {
          const starX = (i * 37) % width;
          const starY = (i * 23) % (height * 0.45);
          const starAlpha = 0.3 + 0.6 * Math.sin(windTime * 2 + i);
          ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
          ctx.beginPath();
          ctx.arc(starX, starY, (i % 3 === 0 ? 1.8 : 1.2), 0, Math.PI * 2);
          ctx.fill();
        }
        // Glowing Crescent Moon
        const moonX = width * 0.82;
        const moonY = height * 0.18;
        ctx.fillStyle = 'rgba(255, 248, 200, 0.15)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 44, 0, Math.PI * 2);
        ctx.fill();

        if (assets.bgMoonCrescent) {
          drawSprite(assets.bgMoonCrescent, 4, 4, 0, 0, moonX - 35, moonY - 35, 70, 70);
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
        const cloudX = ((i * 320 - farScroll * 1.5) % (width + 240) + width + 240) % (width + 240) - 100;
        const cloudY = height * (0.08 + (i % 2) * 0.1);
        const cloudScale = 0.8 + (i % 3) * 0.25;

        if (assets.bgCloud) {
          const cw = 88 * cloudScale;
          const ch = 88 * cloudScale;
          ctx.save();
          if (theme === 'night') ctx.globalAlpha = 0.45;
          else if (theme === 'sunset') ctx.globalAlpha = 0.85;
          drawSprite(assets.bgCloud, 8, 8, i % 8, 0, cloudX, cloudY, cw, ch);
          ctx.restore();
        } else {
          drawCloud(cloudX, cloudY, cloudScale);
        }
      }

      // ------------------------------------------
      // 4. DISTANT MOUNTAINS / HILLS (Parallax Layer Mid-Far)
      // ------------------------------------------
      const mountainY = height * 0.62;

      if (assets.bgMountains) {
        // Pixel Art Mountain Silhouette Layer (Crop single row 0)
        const mWidth = 280;
        const mHeight = 110;
        const startX = -((farScroll * 0.8) % mWidth);
        ctx.save();
        if (theme === 'night') ctx.globalAlpha = 0.6;
        for (let mx = startX - mWidth; mx < width + mWidth; mx += mWidth) {
          drawSprite(assets.bgMountains, 1, 8, 0, 0, mx, mountainY - mHeight + 35, mWidth, mHeight);
        }
        ctx.restore();
      } else {
        // Procedural mountain fallback
        ctx.fillStyle = theme === 'night'
          ? '#192837'
          : theme === 'sunset'
          ? '#8A4A48'
          : theme === 'sakura'
          ? '#C4D4E0' // Lavender mountain
          : '#B7CEBE'; // Sage mountain

        ctx.beginPath();
        ctx.moveTo(-50, height);
        for (let x = -50; x <= width + 100; x += 120) {
          const peakIdx = Math.floor((x + farScroll) / 240);
          const peakH = 90 + Math.sin(peakIdx * 1.7) * 45;
          ctx.lineTo(x, mountainY - peakH);
          ctx.lineTo(x + 60, mountainY - 20);
        }
        ctx.lineTo(width + 100, height);
        ctx.closePath();
        ctx.fill();
      }

      // Fuji Peak Snow Cap (if Sakura theme)
      if (theme === 'sakura') {
        const fujiX = ((width * 0.45 - farScroll * 0.8) % (width + 400) + width + 400) % (width + 400) - 200;
        if (assets.bgFuji) {
          const fujiSize = 180;
          drawSprite(assets.bgFuji, 2, 2, 0, 0, fujiX - fujiSize / 2, mountainY - fujiSize + 45, fujiSize, fujiSize);
        } else {
          const fujiY = mountainY - 140;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(fujiX - 80, fujiY + 60);
          ctx.lineTo(fujiX, fujiY);
          ctx.lineTo(fujiX + 80, fujiY + 60);
          ctx.lineTo(fujiX + 50, fujiY + 50);
          ctx.lineTo(fujiX + 20, fujiY + 62);
          ctx.lineTo(fujiX - 15, fujiY + 52);
          ctx.lineTo(fujiX - 45, fujiY + 60);
          ctx.closePath();
          ctx.fill();
        }
      }

      // ------------------------------------------
      // 5. MID-GROUND ROLLING HILLS & COZY CABINS / TREES
      // ------------------------------------------
      const midHillY = height * 0.70;

      if (assets.bgHills) {
        // Pixel Art Rolling Green Hills (Crop single row 0)
        const hillW = 280;
        const hillH = 110;
        const startHX = -((midScroll * 0.9) % hillW);
        ctx.save();
        if (theme === 'night') ctx.globalAlpha = 0.55;
        for (let hx = startHX - hillW; hx < width + hillW; hx += hillW) {
          drawSprite(assets.bgHills, 1, 8, 0, 0, hx, midHillY - hillH + 40, hillW, hillH);
        }
        ctx.restore();
      } else {
        // Procedural hills fallback
        ctx.fillStyle = theme === 'night'
          ? '#223847'
          : theme === 'sunset'
          ? '#A35E47'
          : theme === 'sakura'
          ? '#A8CCA8' // Soft sage green
          : '#8FB495';

        ctx.beginPath();
        ctx.moveTo(-50, height);
        for (let x = -50; x <= width + 100; x += 80) {
          const hillOffset = Math.sin((x + midScroll) * 0.008) * 35;
          ctx.lineTo(x, midHillY + hillOffset);
        }
        ctx.lineTo(width + 100, height);
        ctx.closePath();
        ctx.fill();
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

      // Milestone Distance Posts along the trail
      const currentDistanceMeters = metrics.distanceMeters;
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
            drawSprite(assets.propMilestone, 8, 8, 0, 0, markerX - 25, markerY - 48, 50, 50);
          } else {
            // Cute wooden milestone signpost fallback
            ctx.fillStyle = '#8D6E63';
            ctx.fillRect(markerX - 3, markerY - 32, 6, 32);
            ctx.fillStyle = '#FFF8E1';
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(markerX - 22, markerY - 48, 44, 20, 4);
            ctx.fill();
            ctx.stroke();
          }

          // Distance Badge Pill
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.strokeStyle = '#5D4037';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(markerX - 22, markerY - 56, 44, 16, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#3E2723';
          ctx.font = 'bold 9px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const distLabel = markerDist >= 1000 ? `${(markerDist / 1000).toFixed(1)}k` : `${markerDist}m`;
          ctx.fillText(`🚩 ${distLabel}`, markerX, markerY - 48);
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

      // ------------------------------------------
      // 7. RUNNER CHARACTER & COMPANION
      // ------------------------------------------
      // Fixed screen horizontal position (runner runs in place like a treadmill!)
      const runnerX = width * 0.40;
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
      if (isMoving && assets.runnerRun) {
        ctx.save();
        ctx.translate(runnerX, runnerRoadY - verticalBounce);
        ctx.rotate(-inclineAngle + forwardLean);
        const drawSize = 88;
        const runFrame = Math.floor(cadencePhase / (Math.PI / 4)) % 8;
        drawSprite(assets.runnerRun, 8, 8, runFrame, 0, -drawSize / 2, -drawSize + 8, drawSize, drawSize);
        ctx.restore();
      } else if (!isMoving && assets.runnerIdle) {
        ctx.save();
        ctx.translate(runnerX, runnerRoadY - verticalBounce);
        ctx.rotate(-inclineAngle);
        const drawSize = 88;
        drawSprite(assets.runnerIdle, 8, 8, 0, 0, -drawSize / 2, -drawSize + 8, drawSize, drawSize);
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
        ctx.translate(runnerX + petOffsetX, petRoadY - petBounce);
        ctx.rotate(-inclineAngle + (isMoving ? forwardLean * 0.7 : 0));

        if (companion === 'shiba') {
          // SHIBA INU (Golden-tan, curled tail, pointy ears)
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

        ctx.restore();
      }

      // ------------------------------------------
      // 8. FOREGROUND PARTICLES (Sakura / Leaves / Fireflies)
      // ------------------------------------------
      particles.forEach((p) => {
        // Particle drift speeds scale with running speed
        const particleSpeedMult = isMoving ? 1 + speed * 0.15 : 1;
        p.x += p.vx * particleSpeedMult;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        // Wrap around screen
        if (p.x < -20) p.x = width + 20;
        if (p.y > height + 20) p.y = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (theme === 'night') {
          // Firefly Glowing Dot
          const pulse = 0.4 + 0.6 * Math.sin(windTime * 4 + p.x);
          ctx.fillStyle = `rgba(255, 245, 157, ${p.alpha * pulse})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Petal / Leaf Shape
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
  }, [isOpen, theme, companion, metrics.speedKmh, metrics.inclineLevel, metrics.distanceMeters, soundEnabled, assetsLoaded]);

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

      {/* TOP FLOATING CONTROL BAR */}
      <div className={`relative z-20 p-3 sm:p-4 flex items-center justify-between gap-2 transition-all duration-300 ${
        zenMode ? 'opacity-20 hover:opacity-100' : 'opacity-100'
      }`}>
        {/* Left: Theme Switcher & Companion Picker */}
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-2xl bg-white/85 hover:bg-white text-[#5A5047] backdrop-blur-md border border-[#EDE6DC] transition-all cursor-pointer shadow-cozy-sm"
            title={soundEnabled ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#52796F]" /> : <VolumeX className="w-4 h-4 text-[#8C827A]" />}
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

      {/* MILESTONE CELEBRATION TOAST */}
      {milestoneToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full bg-white/95 backdrop-blur-md border border-[#CDE0D3] shadow-cozy-lg text-[#3B664E] text-xs sm:text-sm font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-[#B67A28]" />
          <span>{milestoneToast}</span>
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
    </div>
  );
};
