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
    if (!isOpen || !record) {
      setPreviewUrl(null);
      setFileBlob(null);
      return;
    }
    renderCard(format);
  }, [isOpen, record, format]);

  if (!isOpen || !record) return null;

  function renderCard(currentFormat: 'story' | 'landscape') {
    if (!record) return;

    try {
      const postCanvas = document.createElement('canvas');
      const pctx = postCanvas.getContext('2d');
      if (!pctx) return;

      // Determine scenic viewport source: live canvas or procedural scenic illustration
      let scenicSrc: HTMLCanvasElement;
      if (sourceCanvas) {
        scenicSrc = sourceCanvas;
      } else {
        scenicSrc = document.createElement('canvas');
        scenicSrc.width = 960;
        scenicSrc.height = 720;
        const sctx = scenicSrc.getContext('2d');
        if (sctx) {
          drawProceduralScenicView(sctx, 960, 720, record);
        }
      }

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

    // Clip & draw scenic snapshot
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
    pctx.fillText(new Date(rec.created_at || Date.now()).toLocaleDateString('ja-JP').replace(/\//g, '.'), 0, 22);
    pctx.restore();

    // 3.2 Goshuin Seal Stamp
    const userAchIds = getUnlockedAchievementIds(rec.user_id);
    const latestAchId = userAchIds[userAchIds.length - 1] || 'dist_1k';
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

    // 4. Hero Primary Distance Card (Bold numbers for Instagram Stories!)
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
    pctx.fillText(calReward.foodName.slice(0, 15), badgeX + badgeW / 2, badgeY + 85);

    pctx.fillStyle = '#B67A28';
    pctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    pctx.fillText(`เบิร์น ${Math.round(rec.calories_burned)} kcal`, badgeX + badgeW / 2, badgeY + 115);

    // 5. Three Key Stats Badges (Time, Pace, Calories)
    const statCardsY = 1185;
    const statCardW = 300;
    const statCardH = 185;
    const statGap = 30;

    const cards = [
      {
        icon: '⏱️',
        label: 'เวลาวิ่ง (TIME)',
        value: formatDuration(rec.duration_seconds),
        unit: '',
        color: '#2C2621'
      },
      {
        icon: '⚡',
        label: 'เพซเฉลี่ย (PACE)',
        value: formatPace(rec.avg_speed_kmh > 0.5 ? 60 / rec.avg_speed_kmh : 0),
        unit: '/km',
        color: '#B67A28'
      },
      {
        icon: '🔥',
        label: 'แคลอรี (KCAL)',
        value: `${Math.round(rec.calories_burned)}`,
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

    pctx.fillStyle = '#C2B7AA';
    pctx.font = 'italic 10px ui-sans-serif, system-ui, sans-serif';
    pctx.textAlign = 'right';
    pctx.fillText('Treadmill Tracker — Scenic Journey Edition', 1140, 765);
  }

  // Draw Procedural Scenic Illustration for past runs without live canvas
  function drawProceduralScenicView(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    rec: WorkoutRecord
  ) {
    const date = new Date(rec.created_at || Date.now());
    const hour = date.getHours();

    // 1. Sky Gradient based on hour of workout
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.65);
    let sunColor = '#FFA07A';
    let sunGlow = 'rgba(255, 160, 122, 0.4)';

    if (hour >= 16 && hour < 19) {
      // Sunset
      skyGrad.addColorStop(0, '#B84A39');
      skyGrad.addColorStop(0.35, '#E07A5F');
      skyGrad.addColorStop(0.7, '#F4A261');
      skyGrad.addColorStop(1, '#E9C46A');
      sunColor = '#FDE24F';
      sunGlow = 'rgba(253, 226, 79, 0.45)';
    } else if (hour >= 19 || hour < 6) {
      // Twilight / Night
      skyGrad.addColorStop(0, '#1E1B4B');
      skyGrad.addColorStop(0.5, '#312E81');
      skyGrad.addColorStop(1, '#4338CA');
      sunColor = '#FEF08A';
      sunGlow = 'rgba(254, 240, 138, 0.3)';
    } else if (hour >= 6 && hour < 11) {
      // Morning Sakura
      skyGrad.addColorStop(0, '#D48175');
      skyGrad.addColorStop(0.4, '#F3B4A6');
      skyGrad.addColorStop(0.8, '#FCE4EC');
      skyGrad.addColorStop(1, '#FFF1F5');
      sunColor = '#FFAA95';
      sunGlow = 'rgba(255, 170, 149, 0.4)';
    } else {
      // Day
      skyGrad.addColorStop(0, '#4A8094');
      skyGrad.addColorStop(0.5, '#7BA7B8');
      skyGrad.addColorStop(1, '#C7DFE8');
      sunColor = '#FFF5B8';
      sunGlow = 'rgba(255, 245, 184, 0.45)';
    }

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Stars for night
    if (hour >= 19 || hour < 6) {
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 40; i++) {
        const sx = (Math.sin(i * 99) * 0.5 + 0.5) * width;
        const sy = (Math.cos(i * 33) * 0.5 + 0.5) * (height * 0.45);
        const sr = (i % 3 === 0 ? 2 : 1.2);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Sun or Moon
    const celestialX = width * 0.72;
    const celestialY = height * 0.32;
    const celestialR = 48;

    const glow = ctx.createRadialGradient(celestialX, celestialY, celestialR * 0.5, celestialX, celestialY, celestialR * 2.5);
    glow.addColorStop(0, sunGlow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, celestialR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = sunColor;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, celestialR, 0, Math.PI * 2);
    ctx.fill();

    // 4. Stylized Japanese Clouds
    const drawCloud = (cx: number, cy: number, w: number, h: number, alpha: number) => {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - w * 0.2, cy - h * 0.25, h * 0.65, 0, Math.PI * 2);
      ctx.arc(cx + w * 0.15, cy - h * 0.15, h * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawCloud(width * 0.35, height * 0.28, 160, 32, 0.45);
    drawCloud(width * 0.85, height * 0.22, 140, 28, 0.35);

    // 5. Mount Fuji
    const fujiBaseY = height * 0.68;
    const fujiPeakX = width * 0.28;
    const fujiPeakY = height * 0.22;
    const fujiHalfW = 240;

    const fujiGrad = ctx.createLinearGradient(0, fujiPeakY, 0, fujiBaseY);
    fujiGrad.addColorStop(0, '#3E4968');
    fujiGrad.addColorStop(0.5, '#4F5D7E');
    fujiGrad.addColorStop(1, '#6A7B9B');
    ctx.fillStyle = fujiGrad;
    ctx.beginPath();
    ctx.moveTo(fujiPeakX - 32, fujiPeakY + 8);
    ctx.quadraticCurveTo(fujiPeakX - 90, fujiBaseY * 0.75, fujiPeakX - fujiHalfW, fujiBaseY);
    ctx.lineTo(fujiPeakX + fujiHalfW, fujiBaseY);
    ctx.quadraticCurveTo(fujiPeakX + 90, fujiBaseY * 0.75, fujiPeakX + 32, fujiPeakY + 8);
    ctx.closePath();
    ctx.fill();

    // Snow Cap on Fuji
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(fujiPeakX - 32, fujiPeakY + 8);
    ctx.lineTo(fujiPeakX + 32, fujiPeakY + 8);
    ctx.quadraticCurveTo(fujiPeakX + 60, fujiPeakY + 75, fujiPeakX + 80, fujiPeakY + 110);
    ctx.lineTo(fujiPeakX + 50, fujiPeakY + 95);
    ctx.lineTo(fujiPeakX + 25, fujiPeakY + 120);
    ctx.lineTo(fujiPeakX, fujiPeakY + 100);
    ctx.lineTo(fujiPeakX - 25, fujiPeakY + 125);
    ctx.lineTo(fujiPeakX - 50, fujiPeakY + 105);
    ctx.lineTo(fujiPeakX - 80, fujiPeakY + 115);
    ctx.quadraticCurveTo(fujiPeakX - 60, fujiPeakY + 75, fujiPeakX - 32, fujiPeakY + 8);
    ctx.closePath();
    ctx.fill();

    // 6. Rolling Green Hills (Midground)
    const hillGrad = ctx.createLinearGradient(0, height * 0.58, 0, height * 0.75);
    hillGrad.addColorStop(0, '#52796F');
    hillGrad.addColorStop(1, '#3B5950');
    ctx.fillStyle = hillGrad;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.62);
    ctx.bezierCurveTo(width * 0.3, height * 0.58, width * 0.6, height * 0.68, width, height * 0.63);
    ctx.lineTo(width, height * 0.78);
    ctx.lineTo(0, height * 0.78);
    ctx.closePath();
    ctx.fill();

    // 7. Ground / Road Perspective
    const roadTopY = height * 0.72;
    const roadBottomY = height;
    ctx.fillStyle = '#7A6B61';
    ctx.beginPath();
    ctx.moveTo(0, roadTopY);
    ctx.lineTo(width, roadTopY + 18);
    ctx.lineTo(width, roadBottomY);
    ctx.lineTo(0, roadBottomY);
    ctx.closePath();
    ctx.fill();

    // Road curb
    ctx.fillStyle = '#5A4E46';
    ctx.fillRect(0, roadTopY, width, 6);

    // Road dashed lines
    ctx.strokeStyle = 'rgba(245, 238, 230, 0.85)';
    ctx.lineWidth = 4;
    ctx.setLineDash([28, 22]);
    ctx.beginPath();
    ctx.moveTo(0, roadTopY + (roadBottomY - roadTopY) * 0.55);
    ctx.lineTo(width, roadTopY + (roadBottomY - roadTopY) * 0.55 + 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // 8. Stone Lantern (Toro) on Roadside
    const toroX = width * 0.82;
    const toroY = roadTopY - 20;
    ctx.fillStyle = '#524A44';
    ctx.fillRect(toroX - 10, toroY + 20, 20, 30);
    ctx.fillRect(toroX - 15, toroY + 10, 30, 10);
    ctx.fillStyle = '#FFAA33';
    ctx.fillRect(toroX - 8, toroY - 5, 16, 15);
    ctx.fillStyle = '#3E3631';
    ctx.beginPath();
    ctx.moveTo(toroX - 22, toroY - 5);
    ctx.lineTo(toroX + 22, toroY - 5);
    ctx.lineTo(toroX, toroY - 25);
    ctx.closePath();
    ctx.fill();

    // 9. Runner Silhouette with Ponytail
    const runnerX = width * 0.42;
    const runnerY = roadTopY + 45;

    ctx.save();
    ctx.translate(runnerX, runnerY);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2C2621';
    ctx.beginPath();
    ctx.roundRect(-8, -48, 16, 26, 6);
    ctx.fill();

    ctx.fillStyle = '#F4D06F';
    ctx.beginPath();
    ctx.arc(0, -56, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    ctx.arc(0, -58, 11, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, -60);
    ctx.quadraticCurveTo(-22, -62, -18, -48);
    ctx.quadraticCurveTo(-10, -52, -6, -55);
    ctx.fill();

    ctx.strokeStyle = '#2C2621';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2, -24);
    ctx.lineTo(14, -8);
    ctx.lineTo(10, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -24);
    ctx.lineTo(-16, -12);
    ctx.lineTo(-24, -2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(12, -34);
    ctx.lineTo(18, -44);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(-12, -34);
    ctx.lineTo(-8, -26);
    ctx.stroke();

    ctx.restore();

    // 10. Companion Dog (Shiba) Running Beside
    const shibaX = runnerX - 48;
    const shibaY = runnerY + 8;

    ctx.save();
    ctx.translate(shibaX, shibaY);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.ellipse(0, -12, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(12, -18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, -24);
    ctx.lineTo(13, -28);
    ctx.lineTo(15, -23);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(15, -16, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-13, -19, 5, 0, Math.PI * 1.5);
    ctx.stroke();

    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(6, -6);
    ctx.lineTo(11, 2);
    ctx.moveTo(-6, -6);
    ctx.lineTo(-12, 1);
    ctx.stroke();

    ctx.restore();

    // 11. Drifting Sakura Petals
    ctx.fillStyle = 'rgba(255, 182, 193, 0.85)';
    for (let p = 0; p < 18; p++) {
      const px = (Math.sin(p * 47) * 0.5 + 0.5) * width;
      const py = (Math.cos(p * 83) * 0.5 + 0.5) * (height * 0.85);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p * 0.4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
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
                : 'text-[#6B635B] hover:text-[#2C2621]'
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
                : 'text-[#6B635B] hover:text-[#2C2621]'
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
            <div className="py-20 text-[#8C827A] text-xs font-mono animate-pulse">กำลังประมวลผลรูปภาพ...</div>
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
