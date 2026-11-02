import React, { useState, useEffect } from 'react';
import { X, Smartphone, Image as ImageIcon, Share2, Download } from 'lucide-react';
import type { WorkoutRecord } from '../types/database';
import { formatDuration, formatPace, getCalorieReward } from '../services/calculations';
import { ACHIEVEMENT_CATALOG, getUnlockedAchievementIds } from '../services/scenicAchievements';

export interface WorkoutPostcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: WorkoutRecord | null;
  sourceCanvas?: HTMLCanvasElement | null;
}

// Stage and Theme resolvers
export const getStageForDistance = (distanceMeters: number): 'kamakura' | 'kyoto' | 'hokkaido' | 'tokyo' => {
  if (distanceMeters >= 7500) return 'tokyo';
  if (distanceMeters >= 5000) return 'hokkaido';
  if (distanceMeters >= 2500) return 'kyoto';
  return 'kamakura';
};

export const getThemeForCurrentTime = (date: Date = new Date()): 'sakura' | 'countryside' | 'sunset' | 'night' => {
  const hour = date.getHours();
  if (hour >= 17 && hour < 19) return 'sunset';
  if (hour >= 19 || hour < 6) return 'night';
  if (hour >= 6 && hour < 11) return 'sakura';
  return 'countryside';
};

/**
 * Smart Sprite Drawer:
 * Slices out exactly 1 single cell from a sprite sheet grid (e.g. 4x4)
 */
function drawSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  defaultCols: number,
  defaultRows: number,
  cellCol: number,
  cellRow: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const isSheet = image.naturalWidth >= 200;
  const cols = isSheet ? defaultCols : 1;
  const rows = isSheet ? defaultRows : 1;
  const sw = image.naturalWidth / cols;
  const sh = image.naturalHeight / rows;
  const sx = (cellCol % cols) * sw;
  const sy = (cellRow % rows) * sh;
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}

// Asset Cache Interface
interface ScenicAssets {
  runnerRun: HTMLImageElement | null;
  runnerIdle: HTMLImageElement | null;
  bgCloud: HTMLImageElement | null;
  bgFuji: HTMLImageElement | null;
  bgMountains: HTMLImageElement | null;
  bgHills: HTMLImageElement | null;
  bgSunSunset: HTMLImageElement | null;
  bgMoonCrescent: HTMLImageElement | null;
  petShiba: HTMLImageElement | null;
  propMilestone: HTMLImageElement | null;
  encounterLantern: HTMLImageElement | null;
  landmarkTorii: HTMLImageElement | null;
  landmarkSakura: HTMLImageElement | null;
  bgKyotoBamboo: HTMLImageElement | null;
  bgKyotoPagoda: HTMLImageElement | null;
  bgHokkaidoSnow: HTMLImageElement | null;
  bgHokkaidoLavender: HTMLImageElement | null;
  bgTokyoTower: HTMLImageElement | null;
  bgTokyoSkyline: HTMLImageElement | null;
}

let cachedAssets: ScenicAssets | null = null;
let assetLoadingPromise: Promise<ScenicAssets> | null = null;

function getOrLoadScenicAssets(): Promise<ScenicAssets> {
  if (cachedAssets) return Promise.resolve(cachedAssets);
  if (assetLoadingPromise) return assetLoadingPromise;

  const loadImg = (src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  assetLoadingPromise = Promise.all([
    loadImg('/assets/scenic/runner-female-run.png'),
    loadImg('/assets/scenic/runner-female-idle.png'),
    loadImg('/assets/scenic/bg-cloud.png'),
    loadImg('/assets/scenic/bg-mountain-fuji.png'),
    loadImg('/assets/scenic/bg-mountains-distant.png'),
    loadImg('/assets/scenic/bg-hills-green.png'),
    loadImg('/assets/scenic/bg-sun-sunset.png'),
    loadImg('/assets/scenic/bg-moon-crescent.png'),
    loadImg('/assets/scenic/pet-shiba-run.png'),
    loadImg('/assets/scenic/prop-milestone-post.png'),
    loadImg('/assets/scenic/encounter-lantern.png'),
    loadImg('/assets/scenic/landmark-torii-gate.png'),
    loadImg('/assets/scenic/landmark-sakura-tree.png'),
    loadImg('/assets/scenic/bg-hills-kyoto-bamboo.png'),
    loadImg('/assets/scenic/bg-landmark-kyoto-pagoda.png'),
    loadImg('/assets/scenic/bg-mountains-hokkaido-snow.png'),
    loadImg('/assets/scenic/bg-hills-hokkaido-lavender.png'),
    loadImg('/assets/scenic/bg-landmark-tokyo-tower.png'),
    loadImg('/assets/scenic/bg-skyline-tokyo-retro.png'),
  ]).then(([
    runnerRun,
    runnerIdle,
    bgCloud,
    bgFuji,
    bgMountains,
    bgHills,
    bgSunSunset,
    bgMoonCrescent,
    petShiba,
    propMilestone,
    encounterLantern,
    landmarkTorii,
    landmarkSakura,
    bgKyotoBamboo,
    bgKyotoPagoda,
    bgHokkaidoSnow,
    bgHokkaidoLavender,
    bgTokyoTower,
    bgTokyoSkyline,
  ]) => {
    cachedAssets = {
      runnerRun,
      runnerIdle,
      bgCloud,
      bgFuji,
      bgMountains,
      bgHills,
      bgSunSunset,
      bgMoonCrescent,
      petShiba,
      propMilestone,
      encounterLantern,
      landmarkTorii,
      landmarkSakura,
      bgKyotoBamboo,
      bgKyotoPagoda,
      bgHokkaidoSnow,
      bgHokkaidoLavender,
      bgTokyoTower,
      bgTokyoSkyline,
    };
    return cachedAssets;
  });

  return assetLoadingPromise;
}

export const WorkoutPostcardModal: React.FC<WorkoutPostcardModalProps> = ({
  isOpen,
  onClose,
  record,
  sourceCanvas,
}) => {
  const [format, setFormat] = useState<'story' | 'landscape'>('story');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string>('');

  useEffect(() => {
    let isCancelled = false;
    if (!isOpen || !record) {
      setPreviewUrl(null);
      setFileBlob(null);
      return;
    }
    renderCard(format, () => isCancelled);
    return () => {
      isCancelled = true;
    };
  }, [isOpen, record, format]);

  if (!isOpen || !record) return null;

  async function renderCard(currentFormat: 'story' | 'landscape', isCancelled?: () => boolean) {
    if (!record) return;

    try {
      const postCanvas = document.createElement('canvas');
      const pctx = postCanvas.getContext('2d');
      if (!pctx) return;

      // Determine scenic viewport source: live canvas or authentic scenic illustration using real game assets
      let scenicSrc: HTMLCanvasElement;
      if (sourceCanvas) {
        scenicSrc = sourceCanvas;
      } else {
        const assets = await getOrLoadScenicAssets();
        if (isCancelled && isCancelled()) return;

        scenicSrc = document.createElement('canvas');
        scenicSrc.width = 960;
        scenicSrc.height = 720;
        const sctx = scenicSrc.getContext('2d');
        if (sctx) {
          drawAuthenticScenicView(sctx, 960, 720, record, assets);
        }
      }

      if (isCancelled && isCancelled()) return;

      if (currentFormat === 'story') {
        drawStoryCard(postCanvas, pctx, scenicSrc, record);
      } else {
        drawLandscapeCard(postCanvas, pctx, scenicSrc, record);
      }

      const dataUrl = postCanvas.toDataURL('image/png');
      const now = new Date(record.created_at || Date.now());
      const pad = (n: number) => n.toString().padStart(2, '0');
      const fileDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      const prefix = currentFormat === 'story' ? 'ig-story-running' : 'scenic-postcard';
      const name = `${prefix}-${fileDate}.png`;

      setPreviewUrl(dataUrl);
      setFileName(name);

      postCanvas.toBlob((blob) => {
        if (!blob) return;
        setFileBlob(blob);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to render postcard:', err);
    }
  }

  // Draw 9:16 Vertical Instagram Story (1080 x 1920)
  function drawStoryCard(
    postCanvas: HTMLCanvasElement,
    pctx: CanvasRenderingContext2D,
    scenicSrc: HTMLCanvasElement,
    rec: WorkoutRecord
  ) {
    postCanvas.width = 1080;
    postCanvas.height = 1920;

    // 1. Warm Cream Cardstock Gradient (#FAF7F2 to #F3ECE1)
    const bgGrad = pctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#FAF7F2');
    bgGrad.addColorStop(1, '#F3ECE1');
    pctx.fillStyle = bgGrad;
    pctx.fillRect(0, 0, 1080, 1920);

    // Double border
    pctx.strokeStyle = '#E8DFD3';
    pctx.lineWidth = 3;
    pctx.strokeRect(32, 32, 1080 - 64, 1920 - 64);

    pctx.strokeStyle = '#F2ECE4';
    pctx.lineWidth = 1.5;
    pctx.strokeRect(40, 40, 1080 - 80, 1920 - 80);

    // 2. Top Header (Safe from Instagram top bar)
    pctx.textAlign = 'left';
    pctx.textBaseline = 'middle';
    pctx.fillStyle = '#52796F';
    pctx.font = 'bold 22px "Cinzel", Georgia, serif';
    pctx.fillText('🌿 TREADMILL STUDIO', 60, 115);

    pctx.fillStyle = '#8C827A';
    pctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('SCENIC RUN • WORKOUT MEMORIES', 60, 145);

    // Runner Profile badge on the right
    pctx.textAlign = 'right';
    pctx.fillStyle = '#2C2621';
    pctx.font = 'bold 22px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`${rec.user_avatar || '🏃‍♂️'} ${rec.user_name || 'Mike'}`, 1080 - 60, 115);

    const dateStr = new Date(rec.created_at || Date.now()).toLocaleDateString('th-TH', { 
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
    pctx.drawImage(scenicSrc, 0, 0, scenicSrc.width, scenicSrc.height, photoX, photoY, photoW, photoH);
    pctx.restore();

    pctx.strokeStyle = '#D9CFBF';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.roundRect(photoX, photoY, photoW, photoH, 24);
    pctx.stroke();

    // 3.1 Postal Seal Stamp (Hanko)
    const stageId = getStageForDistance(rec.distance_meters || 0);
    const sealTitle = stageId === 'tokyo' ? '🗼 東京' : stageId === 'hokkaido' ? '🌸 北海道' : stageId === 'kyoto' ? '⛩️ 京都' : '🗻 富士山';

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
    pctx.fillText(sealTitle, 0, -18);
    pctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('SCENIC RUN', 0, 4);
    pctx.font = 'bold 9px ui-monospace, monospace';
    pctx.fillText(new Date(rec.created_at || Date.now()).toLocaleDateString('ja-JP').replace(/\//g, '.'), 0, 22);
    pctx.restore();

    // 3.2 Goshuin Achievement Seal Stamp (if any unlocked)
    const userAchIds = getUnlockedAchievementIds(rec.user_id);
    const latestAchId = userAchIds[userAchIds.length - 1];
    const latestAch = ACHIEVEMENT_CATALOG.find((a) => a.id === latestAchId);

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

    // 4. Hero Primary Distance Card
    const heroY = 930;
    pctx.fillStyle = '#FFFFFF';
    pctx.beginPath();
    pctx.roundRect(photoX, heroY, photoW, 230, 24);
    pctx.fill();

    pctx.strokeStyle = '#EBE4DA';
    pctx.lineWidth = 1.5;
    pctx.stroke();

    pctx.fillStyle = '#52796F';
    pctx.beginPath();
    pctx.roundRect(photoX, heroY, photoW, 6, [24, 24, 0, 0]);
    pctx.fill();

    pctx.textAlign = 'left';
    pctx.textBaseline = 'top';
    pctx.fillStyle = '#8C827A';
    pctx.font = 'bold 15px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('TOTAL DISTANCE • ระยะทางสะสม', photoX + 35, heroY + 28);

    const distStr = (rec.distance_meters / 1000).toFixed(2);
    pctx.fillStyle = '#2C2621';
    pctx.font = '900 100px ui-monospace, monospace';
    pctx.fillText(distStr, photoX + 30, heroY + 68);

    const numWidth = pctx.measureText(distStr).width;
    pctx.fillStyle = '#52796F';
    pctx.font = '900 38px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('KM', photoX + 35 + numWidth + 16, heroY + 125);

    // Food reward badge inside hero card (right side)
    const calReward = getCalorieReward(rec.calories_burned);
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
    pctx.fillText(calReward.foodName, badgeX + badgeW / 2, badgeY + 105);

    pctx.fillStyle = '#B8860B';
    pctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`เบิร์นลบ ~${calReward.thresholdKcal} kcal`, badgeX + badgeW / 2, badgeY + 135);

    // 5. 3-Card Secondary Metrics Grid (Time, Pace, Calories)
    const subGridY = 1190;
    const subCardGap = 20;
    const subCardW = (photoW - subCardGap * 2) / 3;
    const subCardH = 170;

    const subMetrics = [
      {
        icon: '⏱️',
        label: 'เวลาวิ่ง (TIME)',
        val: formatDuration(rec.duration_seconds),
        unit: '',
        color: '#2C2621'
      },
      {
        icon: '⚡',
        label: 'เพซเฉลี่ย (PACE)',
        val: formatPace(rec.avg_speed_kmh > 0.5 ? 60 / rec.avg_speed_kmh : 0),
        unit: '/km',
        color: '#9A641F'
      },
      {
        icon: '🔥',
        label: 'แคลอรี่ (KCAL)',
        val: `${Math.round(rec.calories_burned)}`,
        unit: 'kcal',
        color: '#C46849'
      }
    ];

    subMetrics.forEach((m, idx) => {
      const cx = photoX + idx * (subCardW + subCardGap);
      pctx.fillStyle = '#FFFFFF';
      pctx.beginPath();
      pctx.roundRect(cx, subGridY, subCardW, subCardH, 20);
      pctx.fill();
      pctx.strokeStyle = '#EBE4DA';
      pctx.lineWidth = 1.5;
      pctx.stroke();

      pctx.textAlign = 'center';
      pctx.textBaseline = 'top';
      pctx.fillStyle = '#8C827A';
      pctx.font = 'bold 13px ui-sans-serif, system-ui, sans-serif';
      pctx.fillText(`${m.icon} ${m.label}`, cx + subCardW / 2, subGridY + 22);

      pctx.fillStyle = m.color;
      pctx.font = '900 44px ui-monospace, monospace';
      pctx.fillText(m.val, cx + subCardW / 2, subGridY + 62);

      if (m.unit) {
        pctx.fillStyle = '#8C827A';
        pctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
        pctx.fillText(m.unit, cx + subCardW / 2, subGridY + 122);
      }
    });

    // 6. Journey Story Narrative Card
    const storyCardY = 1390;
    const storyCardH = 270;

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
    pctx.fillText('JOURNEY MEMORIES • บันทึกการออกกำลังกาย', photoX + 35, storyCardY + 28);

    pctx.fillStyle = '#3B664E';
    pctx.font = 'bold 18px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`📍 โปรแกรม: ${rec.program_name || 'Free Run'}`, photoX + 35, storyCardY + 75);

    pctx.fillStyle = '#5A5047';
    pctx.font = '500 16px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`🏃 ผู้ฝึกซ้อม: ${rec.user_name || 'Runner'} ${rec.user_weight_kg ? `(น้ำหนัก ${rec.user_weight_kg} kg)` : ''}`, photoX + 35, storyCardY + 118);

    pctx.fillText(`⚡ สปีดเฉลี่ย: ${rec.avg_speed_kmh.toFixed(1)} km/h (สูงสุด: ${rec.max_speed_kmh.toFixed(1)} km/h)`, photoX + 35, storyCardY + 160);

    pctx.fillStyle = '#8C827A';
    pctx.font = '15px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`⛰️ ไต่ระดับความชัน: +${Math.round(rec.elevation_gain_meters)} m (ชันสูงสุด ${rec.max_incline}%)  •  เผาผลาญไขมัน: ${rec.fat_grams_burned.toFixed(1)} g`, photoX + 35, storyCardY + 204);

    // 7. Footer Watermark (Safe from bottom IG text field)
    pctx.textAlign = 'center';
    pctx.fillStyle = '#A0958B';
    pctx.font = 'italic 15px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('Treadmill Studio — Workout Memories Edition • ออกกำลังกายไม่มีเบื่อ', 540, 1720);
  }

  // Draw 3:2 Classic Landscape Postcard (1200 x 800)
  function drawLandscapeCard(
    postCanvas: HTMLCanvasElement,
    pctx: CanvasRenderingContext2D,
    scenicSrc: HTMLCanvasElement,
    rec: WorkoutRecord
  ) {
    postCanvas.width = 1200;
    postCanvas.height = 800;

    // 1. Postcard Base Canvas
    pctx.fillStyle = '#FAF7F2';
    pctx.fillRect(0, 0, 1200, 800);

    pctx.strokeStyle = '#E7DFD5';
    pctx.lineWidth = 2;
    pctx.strokeRect(20, 20, 1160, 760);

    // 2. Main Scenic Photo Inset
    const photoX = 45;
    const photoY = 45;
    const photoW = 1110;
    const photoH = 550;

    pctx.save();
    pctx.fillStyle = 'rgba(44, 38, 33, 0.08)';
    pctx.fillRect(photoX + 4, photoY + 4, photoW, photoH);
    pctx.restore();

    pctx.drawImage(scenicSrc, 0, 0, scenicSrc.width, scenicSrc.height, photoX, photoY, photoW, photoH);

    pctx.strokeStyle = '#D9CFBF';
    pctx.lineWidth = 1;
    pctx.strokeRect(photoX, photoY, photoW, photoH);

    // 3. Hanko Stamp
    const stageId = getStageForDistance(rec.distance_meters || 0);
    const sealTitle = stageId === 'tokyo' ? '🗼 東京' : stageId === 'hokkaido' ? '🌸 北海道' : stageId === 'kyoto' ? '⛩️ 京都' : '🗻 富士山';

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
    pctx.fillText(sealTitle, 0, -18);
    pctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText('SCENIC RUN', 0, 4);
    pctx.font = 'bold 8px ui-monospace, monospace';
    pctx.fillText(new Date(rec.created_at || Date.now()).toLocaleDateString('ja-JP').replace(/\//g, '.'), 0, 22);
    pctx.restore();

    // 4. Bottom Metadata Area
    const metaBaseY = 635;
    pctx.fillStyle = '#2C2621';
    pctx.font = 'bold 26px "Cinzel", Georgia, serif';
    pctx.textAlign = 'left';
    pctx.textBaseline = 'top';
    pctx.fillText('JOURNEY MEMORIES', 55, metaBaseY);

    pctx.fillStyle = '#7A6E65';
    pctx.font = '500 13px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`โปรแกรม: ${rec.program_name || 'Free Run'}  •  ความชันสูงสุด: ${rec.max_incline}% (+${Math.round(rec.elevation_gain_meters)}m)  •  โดย ${rec.user_name || 'Athlete'}`, 55, metaBaseY + 36);

    const dateStr = new Date(rec.created_at || Date.now()).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    pctx.fillStyle = '#A0958B';
    pctx.font = '11px ui-monospace, monospace';
    pctx.fillText(`บันทึกเมื่อ: ${dateStr}`, 55, metaBaseY + 62);

    // Right Side: 4 Stat Badges
    const statCardW = 105;
    const statCardH = 68;
    const statCards = [
      { label: 'ระยะทาง', value: `${(rec.distance_meters / 1000).toFixed(2)}`, unit: 'km', color: '#3B664E' },
      { label: 'เวลาวิ่ง', value: formatDuration(rec.duration_seconds), unit: '', color: '#2C2621' },
      { label: 'เพซเฉลี่ย', value: formatPace(rec.avg_speed_kmh > 0.5 ? 60 / rec.avg_speed_kmh : 0), unit: '/km', color: '#B67A28' },
      { label: 'แคลอรี', value: `${Math.round(rec.calories_burned)}`, unit: 'kcal', color: '#B85737' }
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

      pctx.textAlign = 'center';
      pctx.textBaseline = 'top';
      pctx.fillStyle = '#8C827A';
      pctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
      pctx.fillText(c.label, cx + statCardW / 2, cy + 10);

      pctx.fillStyle = c.color;
      pctx.font = '900 18px ui-monospace, monospace';
      pctx.fillText(c.value, cx + statCardW / 2, cy + 30);

      if (c.unit) {
        pctx.fillStyle = '#A0958B';
        pctx.font = '8px ui-sans-serif, system-ui, sans-serif';
        pctx.fillText(c.unit, cx + statCardW / 2, cy + 54);
      }
    });

    pctx.fillStyle = '#C2B7AA';
    pctx.font = 'italic 10px ui-sans-serif, system-ui, sans-serif';
    pctx.textAlign = 'right';
    pctx.fillText('Treadmill Tracker — Scenic Journey Edition', 1140, 765);
  }

  // Draw Authentic Scenic Illustration with Real Game Assets (Identical to live Scenic Run)
  function drawAuthenticScenicView(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    rec: WorkoutRecord,
    assets: ScenicAssets
  ) {
    const date = new Date(rec.created_at || Date.now());
    const theme = getThemeForCurrentTime(date);
    const stageId = getStageForDistance(rec.distance_meters || 0);

    // 1. SKY GRADIENT
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.65);
    let sunColor = '#FFA07A';
    let sunGlow = 'rgba(255, 160, 122, 0.4)';
    let isNight = false;

    if (theme === 'sunset') {
      skyGrad.addColorStop(0, '#B84A39');
      skyGrad.addColorStop(0.35, '#E07A5F');
      skyGrad.addColorStop(0.7, '#F4A261');
      skyGrad.addColorStop(1, '#E9C46A');
      sunColor = '#FDE24F';
      sunGlow = 'rgba(253, 226, 79, 0.45)';
    } else if (theme === 'night') {
      isNight = true;
      skyGrad.addColorStop(0, '#151932');
      skyGrad.addColorStop(0.5, '#24224A');
      skyGrad.addColorStop(1, '#3E3765');
      sunColor = '#FEF08A';
      sunGlow = 'rgba(254, 240, 138, 0.3)';
    } else if (theme === 'sakura') {
      skyGrad.addColorStop(0, '#D48175');
      skyGrad.addColorStop(0.4, '#F3B4A6');
      skyGrad.addColorStop(0.8, '#FCE4EC');
      skyGrad.addColorStop(1, '#FFF1F5');
      sunColor = '#FFAA95';
      sunGlow = 'rgba(255, 170, 149, 0.4)';
    } else {
      // Countryside / Daytime
      skyGrad.addColorStop(0, '#4A8094');
      skyGrad.addColorStop(0.5, '#7BA7B8');
      skyGrad.addColorStop(1, '#C7DFE8');
      sunColor = '#FFF5B8';
      sunGlow = 'rgba(255, 245, 184, 0.45)';
    }

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. STARS (Night)
    if (isNight) {
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 45; i++) {
        const sx = ((i * 137.5) % width);
        const sy = (((i * 97.3) % (height * 0.48)));
        const sr = (i % 4 === 0 ? 2 : 1.2);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. SUN / MOON
    const celestialX = width * 0.74;
    const celestialY = height * 0.22;
    if (isNight && assets.bgMoonCrescent) {
      const moonW = 75;
      const moonH = 75;
      ctx.save();
      ctx.filter = 'drop-shadow(0 0 16px rgba(254, 240, 138, 0.5))';
      ctx.drawImage(assets.bgMoonCrescent, celestialX - moonW / 2, celestialY - moonH / 2, moonW, moonH);
      ctx.restore();
    } else if (theme === 'sunset' && assets.bgSunSunset) {
      const sunSize = 92;
      drawSprite(ctx, assets.bgSunSunset, 4, 4, 0, 0, celestialX - sunSize / 2, celestialY - sunSize / 2, sunSize, sunSize);
    } else {
      const glow = ctx.createRadialGradient(celestialX, celestialY, 15, celestialX, celestialY, 65);
      glow.addColorStop(0, sunGlow);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(celestialX, celestialY, 65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = sunColor;
      ctx.beginPath();
      ctx.arc(celestialX, celestialY, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. FLUFFY CLOUDS (Real asset bgCloud)
    if (assets.bgCloud) {
      const cloudPositions = [
        { x: width * 0.10, y: height * 0.08, w: 120, h: 120, alpha: isNight ? 0.35 : 0.8 },
        { x: width * 0.50, y: height * 0.12, w: 105, h: 105, alpha: isNight ? 0.30 : 0.7 },
        { x: width * 0.82, y: height * 0.06, w: 130, h: 130, alpha: isNight ? 0.40 : 0.85 },
      ];
      for (const c of cloudPositions) {
        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.drawImage(assets.bgCloud, c.x, c.y, c.w, c.h);
        ctx.restore();
      }
    }

    // 5. DISTANT SKY LANDMARK (Mount Fuji / Pagoda / Tokyo Tower)
    const landmarkBaseY = height * 0.68;
    const skyLandmarkX = width * 0.40;

    if (stageId === 'kyoto' && assets.bgKyotoPagoda) {
      const pW = 320;
      const pH = 334;
      const pX = skyLandmarkX - pW / 2;
      const pY = landmarkBaseY - pH * 0.88;
      ctx.save();
      if (isNight) ctx.filter = 'brightness(0.70) saturate(0.85)';
      ctx.drawImage(assets.bgKyotoPagoda, pX, pY, pW, pH);
      ctx.restore();
    } else if (stageId === 'tokyo' && assets.bgTokyoTower) {
      const tW = 190;
      const tH = 375;
      const tX = skyLandmarkX - tW / 2;
      const tY = landmarkBaseY - tH * 0.94;
      ctx.save();
      const halo = ctx.createRadialGradient(tX + tW / 2, tY + tH * 0.35, 10, tX + tW / 2, tY + tH * 0.35, 110);
      halo.addColorStop(0, 'rgba(255, 160, 60, 0.35)');
      halo.addColorStop(1, 'rgba(255, 120, 30, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(tX + tW / 2, tY + tH * 0.35, 110, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(assets.bgTokyoTower, tX, tY, tW, tH);
      ctx.restore();
    } else if (assets.bgFuji) {
      // Signature Mount Fuji
      const fujiW = 440;
      const fujiH = 440;
      const fujiX = skyLandmarkX - fujiW / 2;
      const fujiY = landmarkBaseY - fujiH * 0.90;
      ctx.save();
      if (isNight) {
        ctx.filter = 'brightness(0.70) saturate(0.85) hue-rotate(-10deg)';
      } else if (theme === 'sunset') {
        ctx.filter = 'brightness(0.95) saturate(1.15) hue-rotate(-8deg)';
      }
      ctx.drawImage(assets.bgFuji, fujiX, fujiY, fujiW, fujiH);

      // Diamond sparkle on snowy peak
      const sX = fujiX + fujiW * 0.48;
      const sY = fujiY + fujiH * 0.22;
      ctx.fillStyle = isNight ? 'rgba(210, 235, 255, 0.9)' : 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(sX, sY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isNight ? 'rgba(210, 235, 255, 0.8)' : 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sX - 8, sY); ctx.lineTo(sX + 8, sY);
      ctx.moveTo(sX, sY - 8); ctx.lineTo(sX, sY + 8);
      ctx.stroke();
      ctx.restore();
    }

    // 6. DISTANT MOUNTAIN RIDGE (Seamless strip)
    const mountainY = height * 0.58;
    const mountainImg = stageId === 'hokkaido'
      ? (assets.bgHokkaidoSnow || assets.bgMountains)
      : assets.bgMountains;

    if (mountainImg) {
      const mW = 960;
      const mH = 240;
      ctx.save();
      if (isNight) ctx.filter = 'brightness(0.68) saturate(0.85)';
      else if (theme === 'sunset') ctx.filter = 'brightness(0.92) saturate(1.12)';
      ctx.drawImage(mountainImg, 0, mountainY - 135, mW, mH);
      ctx.restore();
    }

    // 7. MID-GROUND ROLLING HILLS (Seamless strip)
    const midHillY = height * 0.67;
    const hillImg = stageId === 'tokyo'
      ? (assets.bgTokyoSkyline || assets.bgHills)
      : stageId === 'kyoto'
      ? (assets.bgKyotoBamboo || assets.bgHills)
      : stageId === 'hokkaido'
      ? (assets.bgHokkaidoLavender || assets.bgHills)
      : assets.bgHills;

    if (hillImg) {
      const hW = 960;
      const hH = 240;
      ctx.save();
      if (isNight) ctx.filter = 'brightness(0.60) saturate(0.85)';
      else if (theme === 'sunset') ctx.filter = 'brightness(0.92) saturate(1.12)';
      ctx.drawImage(hillImg, 0, midHillY - 105, hW, hH);
      ctx.restore();
    }

    // 8. ROADWAY SURFACE & CURB
    const roadTopY = height * 0.72;
    const roadBottomY = height;
    const incline = Math.min(15, (rec.max_incline || 0));
    const inclineOffset = incline * 1.5;

    // Road Asphalt
    ctx.fillStyle = isNight ? '#3D3833' : '#5E564E';
    ctx.beginPath();
    ctx.moveTo(0, roadTopY);
    ctx.lineTo(width, roadTopY - inclineOffset);
    ctx.lineTo(width, roadBottomY);
    ctx.lineTo(0, roadBottomY);
    ctx.closePath();
    ctx.fill();

    // Curb Strip
    ctx.fillStyle = isNight ? '#2B2622' : '#453E38';
    ctx.beginPath();
    ctx.moveTo(0, roadTopY);
    ctx.lineTo(width, roadTopY - inclineOffset);
    ctx.lineTo(width, roadTopY - inclineOffset + 6);
    ctx.lineTo(0, roadTopY + 6);
    ctx.closePath();
    ctx.fill();

    // Dashed Center Lane Line
    ctx.strokeStyle = 'rgba(245, 238, 230, 0.85)';
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 20]);
    ctx.beginPath();
    const laneYStart = roadTopY + (roadBottomY - roadTopY) * 0.52;
    const laneYEnd = (roadTopY - inclineOffset) + (roadBottomY - (roadTopY - inclineOffset)) * 0.52;
    ctx.moveTo(0, laneYStart);
    ctx.lineTo(width, laneYEnd);
    ctx.stroke();
    ctx.setLineDash([]);

    // 9. ROADSIDE PROPS
    // Milestone Post
    if (assets.propMilestone) {
      const mileX = width * 0.16;
      const mileY = roadTopY - 18;
      const mileW = 46;
      const mileH = 72;

      ctx.fillStyle = 'rgba(20, 15, 10, 0.28)';
      ctx.beginPath();
      ctx.ellipse(mileX + mileW / 2, mileY + mileH - 2, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.drawImage(assets.propMilestone, mileX, mileY, mileW, mileH);

      ctx.fillStyle = '#4A3B32';
      ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${(rec.distance_meters / 1000).toFixed(1)}km`, mileX + mileW / 2, mileY + 36);
    }

    // Stone Lantern (Toro)
    if (assets.encounterLantern) {
      const toroX = width * 0.82;
      const toroY = roadTopY - 26;
      const toroW = 54;
      const toroH = 78;

      ctx.fillStyle = 'rgba(20, 15, 10, 0.3)';
      ctx.beginPath();
      ctx.ellipse(toroX + toroW / 2, toroY + toroH - 4, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.drawImage(assets.encounterLantern, toroX, toroY, toroW, toroH);

      if (isNight) {
        const lanternGlow = ctx.createRadialGradient(toroX + toroW / 2, toroY + 28, 4, toroX + toroW / 2, toroY + 28, 35);
        lanternGlow.addColorStop(0, 'rgba(255, 180, 60, 0.45)');
        lanternGlow.addColorStop(1, 'rgba(255, 180, 60, 0)');
        ctx.fillStyle = lanternGlow;
        ctx.beginPath();
        ctx.arc(toroX + toroW / 2, toroY + 28, 35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 10. RUNNER (Pixel Art Sprite from PixelLab)
    const runnerX = width * 0.46;
    const runnerRoadY = roadTopY + 48;
    const runnerSpriteW = 86;
    const runnerSpriteH = 86;
    const runnerGroundDy = -runnerSpriteH * (60 / 64);

    // Runner Drop Shadow
    ctx.save();
    ctx.translate(runnerX, runnerRoadY);
    ctx.fillStyle = 'rgba(30, 20, 15, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Runner Sprite (Frame 1: dynamic running stride)
    if (assets.runnerRun) {
      ctx.save();
      ctx.translate(runnerX, runnerRoadY);
      ctx.rotate(0.06);
      drawSprite(ctx, assets.runnerRun, 4, 4, 1, 0, -runnerSpriteW / 2, runnerGroundDy, runnerSpriteW, runnerSpriteH);
      ctx.restore();
    }

    // 11. PET SHIBA COMPANION (Pixel Art Sprite)
    const petX = runnerX - 48;
    const petRoadY = runnerRoadY - 4;
    const petDrawSize = 44;
    const petGroundDy = -petDrawSize * (27 / 32);

    // Pet Drop Shadow
    ctx.save();
    ctx.translate(petX, petRoadY);
    ctx.fillStyle = 'rgba(30, 20, 15, 0.24)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Shiba Sprite (Frame 1: playful trot)
    if (assets.petShiba) {
      ctx.save();
      ctx.translate(petX, petRoadY);
      drawSprite(ctx, assets.petShiba, 4, 4, 1, 0, -petDrawSize / 2, petGroundDy, petDrawSize, petDrawSize);
      ctx.restore();
    }

    // 12. FALLING SAKURA / AUTUMN PETALS
    const petalCount = 14;
    const petalColor = theme === 'sunset' ? 'rgba(235, 120, 70, 0.75)' : 'rgba(255, 185, 205, 0.8)';
    ctx.fillStyle = petalColor;
    for (let i = 0; i < petalCount; i++) {
      const px = ((i * 73) % width);
      const py = height * 0.45 + ((i * 47) % (height * 0.5));
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(0.3 + (i % 5) * 0.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div 
        className="relative max-w-2xl w-full bg-[#FAF7F2] rounded-3xl p-4 sm:p-6 border-2 border-[#E7DFD5] shadow-2xl space-y-3.5 text-[#2C2621]"
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
            onClick={onClose}
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
            onClick={() => setFormat('story')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              format === 'story'
                ? 'bg-[#52796F] text-white shadow-cozy-sm'
                : 'text-[#6C635B] hover:text-[#2C2621]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>สตอรี่แนวตั้ง (9:16 IG Story)</span>
          </button>
          <button
            type="button"
            onClick={() => setFormat('landscape')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              format === 'landscape'
                ? 'bg-[#52796F] text-white shadow-cozy-sm'
                : 'text-[#6C635B] hover:text-[#2C2621]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>โปสการ์ดแนวนอน (3:2)</span>
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="relative rounded-2xl overflow-hidden shadow-cozy-lg border border-[#EDE6DC] bg-[#F7F4EE] flex items-center justify-center p-2 sm:p-3 max-h-[52vh]">
          {previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Scenic Postcard" 
              className="max-h-[48vh] w-auto max-w-full object-contain rounded-xl block select-auto pointer-events-auto shadow-md"
            />
          ) : (
            <div className="py-20 text-[#8C827A] text-xs font-mono animate-pulse flex flex-col items-center gap-2">
              <span className="text-2xl animate-spin">⏳</span>
              <span>กำลังดึงภาพฉาก Scenic และจัดทำรูปภาพ...</span>
            </div>
          )}
        </div>

        {/* Action Buttons & iPad Tip */}
        <div className="space-y-2 pt-1">
          <p className="text-[11px] text-[#8C827A] text-center sm:text-left">
            💡 <span className="font-semibold text-[#5A5047]">บน iPad/iPhone:</span> แตะภาพค้างไว้ (Long Press) เพื่อเลือก <span className="text-[#C46849] font-bold">"บันทึกรูปภาพ" (Save to Photos)</span> หรือกดปุ่มแชร์เพื่อลง Instagram Story ได้ทันที
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && fileBlob && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const file = new File([fileBlob], fileName, { type: 'image/png' });
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

            {previewUrl && (
              <a
                href={previewUrl}
                download={fileName}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-2xl bg-[#C46849] hover:bg-[#B3392B] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-cozy-sm cursor-pointer text-center"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด {format === 'story' ? 'IG Story (9:16)' : 'โปสการ์ด (3:2)'}</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl bg-[#EAE3D9] hover:bg-[#DDD5C7] text-[#5A5047] font-bold text-xs transition-all cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
