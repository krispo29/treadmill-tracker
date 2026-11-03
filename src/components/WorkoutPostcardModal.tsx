import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Image as ImageIcon, Share2, Download, Film, Sparkles, Loader2 } from 'lucide-react';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
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
 * Slices out exactly 1 single cell from a sprite sheet grid (e.g. 4x4 or 8x8)
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
  landmarkHokkaidoBarn: HTMLImageElement | null;
  encounterHokkaidoCow: HTMLImageElement | null;
  landmarkKyotoGate: HTMLImageElement | null;
  landmarkTokyoYatai: HTMLImageElement | null;
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

  const v = '?v=20261103a';
  assetLoadingPromise = Promise.all([
    loadImg(`/assets/scenic/runner-female-run.png${v}`),
    loadImg(`/assets/scenic/runner-female-idle.png${v}`),
    loadImg(`/assets/scenic/bg-cloud.png${v}`),
    loadImg(`/assets/scenic/bg-mountain-fuji.png${v}`),
    loadImg(`/assets/scenic/bg-mountains-distant.png${v}`),
    loadImg(`/assets/scenic/bg-hills-green.png${v}`),
    loadImg(`/assets/scenic/bg-sun-sunset.png${v}`),
    loadImg(`/assets/scenic/bg-moon-crescent.png${v}`),
    loadImg(`/assets/scenic/pet-shiba-run.png${v}`),
    loadImg(`/assets/scenic/prop-milestone-post.png${v}`),
    loadImg(`/assets/scenic/encounter-lantern.png${v}`),
    loadImg(`/assets/scenic/landmark-torii-gate.png${v}`),
    loadImg(`/assets/scenic/landmark-sakura-tree.png${v}`),
    loadImg(`/assets/scenic/bg-hills-kyoto-bamboo.png${v}`),
    loadImg(`/assets/scenic/bg-landmark-kyoto-pagoda.png${v}`),
    loadImg(`/assets/scenic/bg-mountains-hokkaido-snow.png${v}`),
    loadImg(`/assets/scenic/bg-hills-hokkaido-lavender.png${v}`),
    loadImg(`/assets/scenic/landmark-hokkaido-barn-windmill.png${v}`),
    loadImg(`/assets/scenic/encounter-hokkaido-cow.png${v}`),
    loadImg(`/assets/scenic/landmark-kyoto-shrine-gate.png${v}`),
    loadImg(`/assets/scenic/landmark-tokyo-yatai-ramen.png${v}`),
    loadImg(`/assets/scenic/bg-landmark-tokyo-tower.png${v}`),
    loadImg(`/assets/scenic/bg-skyline-tokyo-retro.png${v}`),
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
    landmarkHokkaidoBarn,
    encounterHokkaidoCow,
    landmarkKyotoGate,
    landmarkTokyoYatai,
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
      landmarkHokkaidoBarn,
      encounterHokkaidoCow,
      landmarkKyotoGate,
      landmarkTokyoYatai,
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
}) => {
  const [format, setFormat] = useState<'story' | 'landscape'>('story');
  const [isAssetsLoaded, setIsAssetsLoaded] = useState<boolean>(false);
  const [isExportingGif, setIsExportingGif] = useState<boolean>(false);
  const [gifProgress, setGifProgress] = useState<number>(0);
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const scenicCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Preload assets and start live 60fps animation
  useEffect(() => {
    let isCancelled = false;

    if (!isOpen || !record) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      setIsAssetsLoaded(false);
      setFileBlob(null);
      return;
    }

    if (!scenicCanvasRef.current) {
      const sc = document.createElement('canvas');
      sc.width = 960;
      sc.height = 720;
      scenicCanvasRef.current = sc;
    }

    getOrLoadScenicAssets().then((assets) => {
      if (isCancelled) return;
      setIsAssetsLoaded(true);

      // Prepare initial snapshot blob for PNG download / sharing
      const initialPostCanvas = document.createElement('canvas');
      const ipctx = initialPostCanvas.getContext('2d');
      const scenicCanvas = scenicCanvasRef.current!;
      const sctx = scenicCanvas.getContext('2d');

      if (ipctx && sctx) {
        drawAuthenticScenicView(sctx, 960, 720, record, assets, 0);
        if (format === 'story') {
          drawStoryCard(initialPostCanvas, ipctx, scenicCanvas, record);
        } else {
          drawLandscapeCard(initialPostCanvas, ipctx, scenicCanvas, record);
        }

        const now = new Date(record.created_at || Date.now());
        const pad = (n: number) => n.toString().padStart(2, '0');
        const fileDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        const prefix = format === 'story' ? 'ig-story-running' : 'scenic-postcard';
        const defaultName = `${prefix}-${fileDate}.png`;
        setFileName(defaultName);

        initialPostCanvas.toBlob((blob) => {
          if (blob && !isCancelled) {
            setFileBlob(blob);
          }
        }, 'image/png');
      }

      // Start continuous animation loop
      const startTime = performance.now();
      const loop = (currentTime: number) => {
        if (isCancelled) return;
        const animTime = (currentTime - startTime) / 1000;

        const scenic = scenicCanvasRef.current;
        if (scenic) {
          const sctx = scenic.getContext('2d');
          if (sctx) {
            drawAuthenticScenicView(sctx, 960, 720, record, assets, animTime);
          }
        }

        const canvas = canvasRef.current;
        if (canvas && scenic) {
          const pctx = canvas.getContext('2d');
          if (pctx) {
            if (format === 'story') {
              drawStoryCard(canvas, pctx, scenic, record);
            } else {
              drawLandscapeCard(canvas, pctx, scenic, record);
            }
          }
        }

        animFrameIdRef.current = requestAnimationFrame(loop);
      };

      animFrameIdRef.current = requestAnimationFrame(loop);
    });

    return () => {
      isCancelled = true;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isOpen, record, format]);

  if (!isOpen || !record) return null;

  // Export as Animated GIF using gifenc
  const handleExportGif = async () => {
    if (!record || isExportingGif || isExportingVideo) return;
    setIsExportingGif(true);
    setGifProgress(0);
    setExportNotice('กำลังสร้างแอนิเมชั่น GIF วนลูป...');

    try {
      const assets = await getOrLoadScenicAssets();
      // Use half-res for GIF to keep file size lightweight (<3MB) and fast generation
      const gifWidth = format === 'story' ? 540 : 600;
      const gifHeight = format === 'story' ? 960 : 400;

      const gifCanvas = document.createElement('canvas');
      gifCanvas.width = gifWidth;
      gifCanvas.height = gifHeight;
      const gctx = gifCanvas.getContext('2d', { willReadFrequently: true });
      if (!gctx) throw new Error('Cannot get GIF 2D context');

      const tempScenic = document.createElement('canvas');
      tempScenic.width = 960;
      tempScenic.height = 720;
      const tsctx = tempScenic.getContext('2d');
      if (!tsctx) throw new Error('Cannot get temp scenic context');

      const fullCardCanvas = document.createElement('canvas');
      fullCardCanvas.width = format === 'story' ? 1080 : 1200;
      fullCardCanvas.height = format === 'story' ? 1920 : 800;
      const fctx = fullCardCanvas.getContext('2d');
      if (!fctx) throw new Error('Cannot get full card context');

      const gif = GIFEncoder({ auto: true });
      const totalFrames = 24;
      const durationSec = 1.6;
      const delay = Math.round((durationSec / totalFrames) * 1000); // ~67ms per frame (15 fps)

      for (let i = 0; i < totalFrames; i++) {
        const t = (i / totalFrames) * durationSec;
        drawAuthenticScenicView(tsctx, 960, 720, record, assets, t);

        if (format === 'story') {
          drawStoryCard(fullCardCanvas, fctx, tempScenic, record);
        } else {
          drawLandscapeCard(fullCardCanvas, fctx, tempScenic, record);
        }

        // Draw downscaled frame to gifCanvas
        gctx.clearRect(0, 0, gifWidth, gifHeight);
        gctx.drawImage(fullCardCanvas, 0, 0, fullCardCanvas.width, fullCardCanvas.height, 0, 0, gifWidth, gifHeight);

        const imgData = gctx.getImageData(0, 0, gifWidth, gifHeight);
        const palette = quantize(imgData.data, 256);
        const index = applyPalette(imgData.data, palette);
        gif.writeFrame(index, gifWidth, gifHeight, { palette, delay });

        setGifProgress(Math.round(((i + 1) / totalFrames) * 100));
        // Yield execution to allow progress bar rendering
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      gif.finish();
      const bytes = gif.bytes();
      const gifBlob = new Blob([bytes as unknown as BlobPart], { type: 'image/gif' });

      const now = new Date(record.created_at || Date.now());
      const pad = (n: number) => n.toString().padStart(2, '0');
      const fileDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      const prefix = format === 'story' ? 'ig-story-anim' : 'scenic-postcard-anim';
      const name = `${prefix}-${fileDate}.gif`;

      // Trigger automatic browser download
      const url = URL.createObjectURL(gifBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setFileBlob(gifBlob);
      setFileName(name);
      setExportNotice('สร้างแอนิเมชั่น GIF สำเร็จ! เริ่มดาวน์โหลดแล้ว');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('GIF export failed:', err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ GIF');
    } finally {
      setIsExportingGif(false);
      setGifProgress(0);
    }
  };

  // Export as Looping Video (MP4 / WebM) for Instagram Stories / Reels
  const handleExportVideo = async () => {
    if (!record || isExportingVideo || isExportingGif) return;
    setIsExportingVideo(true);
    setVideoProgress(0);
    setExportNotice('กำลังบันทึกวิดีโอสตอรี่แบบวนลูป...');

    try {
      const assets = await getOrLoadScenicAssets();
      const videoCanvas = document.createElement('canvas');
      const vWidth = format === 'story' ? 1080 : 1200;
      const vHeight = format === 'story' ? 1920 : 800;
      videoCanvas.width = vWidth;
      videoCanvas.height = vHeight;
      const vctx = videoCanvas.getContext('2d');
      if (!vctx) throw new Error('Cannot get video 2D context');

      const tempScenic = document.createElement('canvas');
      tempScenic.width = 960;
      tempScenic.height = 720;
      const tsctx = tempScenic.getContext('2d');
      if (!tsctx) throw new Error('Cannot get temp scenic context');

      // Test best supported mimeType across iOS Safari and Chromium
      const mimeTypes = [
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];
      const selectedMime = mimeTypes.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || '';

      const stream = videoCanvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMime || undefined,
        videoBitsPerSecond: 6000000, // 6 Mbps high bitrate
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const durationSec = 3.2; // 3.2 second video loop
      const fps = 30;
      const totalFrames = Math.round(durationSec * fps);
      const frameDurationMs = 1000 / fps;

      // Draw initial frame
      drawAuthenticScenicView(tsctx, 960, 720, record, assets, 0);
      if (format === 'story') {
        drawStoryCard(videoCanvas, vctx, tempScenic, record);
      } else {
        drawLandscapeCard(videoCanvas, vctx, tempScenic, record);
      }

      mediaRecorder.start();

      let currentFrame = 0;
      await new Promise<void>((resolve, reject) => {
        const timer = setInterval(() => {
          currentFrame++;
          const t = (currentFrame / totalFrames) * durationSec;
          drawAuthenticScenicView(tsctx, 960, 720, record, assets, t);
          if (format === 'story') {
            drawStoryCard(videoCanvas, vctx, tempScenic, record);
          } else {
            drawLandscapeCard(videoCanvas, vctx, tempScenic, record);
          }
          setVideoProgress(Math.min(99, Math.round((currentFrame / totalFrames) * 100)));

          if (currentFrame >= totalFrames) {
            clearInterval(timer);
            mediaRecorder.stop();
          }
        }, frameDurationMs);

        mediaRecorder.onstop = () => resolve();
        mediaRecorder.onerror = (e) => reject(e);
      });

      const extension = selectedMime.includes('mp4') ? 'mp4' : 'webm';
      const videoBlob = new Blob(chunks, { type: selectedMime || 'video/mp4' });
      const now = new Date(record.created_at || Date.now());
      const pad = (n: number) => n.toString().padStart(2, '0');
      const fileDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      const prefix = format === 'story' ? 'ig-story-video' : 'scenic-postcard-video';
      const name = `${prefix}-${fileDate}.${extension}`;

      // Trigger automatic browser download
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setFileBlob(videoBlob);
      setFileName(name);
      setExportNotice('บันทึกวิดีโอสตอรี่สำเร็จ! เริ่มดาวน์โหลดแล้ว');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Video recording failed:', err);
      alert('เบราว์เซอร์ไม่รองรับการบันทึกวิดีโอ แนะนำให้ดาวน์โหลดเป็น GIF แทน');
    } finally {
      setIsExportingVideo(false);
      setVideoProgress(0);
    }
  };

  // Export as Classic High-Resolution Static PNG
  const handleExportPng = async () => {
    if (!record) return;
    try {
      const assets = await getOrLoadScenicAssets();
      const postCanvas = document.createElement('canvas');
      const pctx = postCanvas.getContext('2d');
      if (!pctx) return;

      const scenicSrc = document.createElement('canvas');
      scenicSrc.width = 960;
      scenicSrc.height = 720;
      const sctx = scenicSrc.getContext('2d');
      if (sctx) {
        drawAuthenticScenicView(sctx, 960, 720, record, assets, 0);
      }

      if (format === 'story') {
        drawStoryCard(postCanvas, pctx, scenicSrc, record);
      } else {
        drawLandscapeCard(postCanvas, pctx, scenicSrc, record);
      }

      const now = new Date(record.created_at || Date.now());
      const pad = (n: number) => n.toString().padStart(2, '0');
      const fileDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      const prefix = format === 'story' ? 'ig-story-running' : 'scenic-postcard';
      const name = `${prefix}-${fileDate}.png`;

      const dataUrl = postCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      postCanvas.toBlob((blob) => {
        if (blob) {
          setFileBlob(blob);
          setFileName(name);
        }
      }, 'image/png');

      setExportNotice('ดาวน์โหลดรูปภาพ PNG สำเร็จ');
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error('Failed to export PNG:', err);
    }
  };

  // Draw 9:16 Vertical Instagram Story (1080 x 1920)
  function drawStoryCard(
    postCanvas: HTMLCanvasElement,
    pctx: CanvasRenderingContext2D,
    scenicSrc: HTMLCanvasElement,
    rec: WorkoutRecord
  ) {
    if (postCanvas.width !== 1080 || postCanvas.height !== 1920) {
      postCanvas.width = 1080;
      postCanvas.height = 1920;
    }

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
    if (postCanvas.width !== 1200 || postCanvas.height !== 800) {
      postCanvas.width = 1200;
      postCanvas.height = 800;
    }

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

  // Draw Authentic Scenic Illustration with Real Game Assets and Smooth Animation Time
  function drawAuthenticScenicView(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    rec: WorkoutRecord,
    assets: ScenicAssets,
    animTime: number = 0
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

    // 2. STARS (Night) with soft twinkling
    if (isNight) {
      for (let i = 0; i < 45; i++) {
        const sx = ((i * 137.5) % width);
        const sy = (((i * 97.3) % (height * 0.48)));
        const sr = (i % 4 === 0 ? 2 : 1.2);
        const starAlpha = 0.35 + 0.65 * Math.abs(Math.sin(animTime * 2.5 + i * 1.7));
        ctx.save();
        ctx.globalAlpha = starAlpha;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 3. SUN / MOON
    const celestialX = width * 0.74;
    const celestialY = height * 0.22;
    if (isNight && assets.bgMoonCrescent) {
      const moonSize = 56;
      ctx.save();
      const moonPulse = 16 + Math.sin(animTime * 2) * 4;
      ctx.filter = `drop-shadow(0 0 ${moonPulse}px rgba(254, 240, 138, 0.6))`;
      // PixelLab moon is an 8x8 sheet of 32x32 cells (cell 0,0 is golden crescent moon)
      drawSprite(ctx, assets.bgMoonCrescent, 8, 8, 0, 0, celestialX - moonSize / 2, celestialY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    } else if (theme === 'sunset' && assets.bgSunSunset) {
      const sunSize = 92;
      drawSprite(ctx, assets.bgSunSunset, 4, 4, 0, 0, celestialX - sunSize / 2, celestialY - sunSize / 2, sunSize, sunSize);
    } else {
      const glowRadius = 65 + Math.sin(animTime * 2) * 5;
      const glow = ctx.createRadialGradient(celestialX, celestialY, 15, celestialX, celestialY, glowRadius);
      glow.addColorStop(0, sunGlow);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(celestialX, celestialY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = sunColor;
      ctx.beginPath();
      ctx.arc(celestialX, celestialY, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. FLUFFY CLOUDS with gentle drift
    if (assets.bgCloud) {
      const cloudPositions = [
        { origX: width * 0.10, y: height * 0.08, w: 120, h: 120, alpha: isNight ? 0.35 : 0.8, speed: 0.8 },
        { origX: width * 0.50, y: height * 0.12, w: 105, h: 105, alpha: isNight ? 0.30 : 0.7, speed: 1.0 },
        { origX: width * 0.82, y: height * 0.06, w: 130, h: 130, alpha: isNight ? 0.40 : 0.85, speed: 1.2 },
      ];
      for (const c of cloudPositions) {
        const cx = (((c.origX + animTime * 14 * c.speed + 150) % (width + 300)) - 150);
        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.drawImage(assets.bgCloud, cx, c.y, c.w, c.h);
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
      const haloRadius = 110 + Math.sin(animTime * 3) * 8;
      const halo = ctx.createRadialGradient(tX + tW / 2, tY + tH * 0.35, 10, tX + tW / 2, tY + tH * 0.35, haloRadius);
      halo.addColorStop(0, 'rgba(255, 160, 60, 0.38)');
      halo.addColorStop(1, 'rgba(255, 120, 30, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(tX + tW / 2, tY + tH * 0.35, haloRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(assets.bgTokyoTower, tX, tY, tW, tH);
      ctx.restore();
    } else if (stageId === 'kamakura' && assets.bgFuji) {
      // Signature Mount Fuji (Kamakura stage only)
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

      // Diamond sparkle on snowy peak with gentle glint
      const sX = fujiX + fujiW * 0.48;
      const sY = fujiY + fujiH * 0.22;
      const glint = 1 + 0.3 * Math.sin(animTime * 3.5);
      ctx.fillStyle = isNight ? 'rgba(210, 235, 255, 0.9)' : 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(sX, sY, 3 * glint, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isNight ? 'rgba(210, 235, 255, 0.8)' : 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sX - 8 * glint, sY); ctx.lineTo(sX + 8 * glint, sY);
      ctx.moveTo(sX, sY - 8 * glint); ctx.lineTo(sX, sY + 8 * glint);
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

    // Dashed Center Lane Line (Smooth gliding motion)
    const speedKmh = rec.avg_speed_kmh > 0.5 ? rec.avg_speed_kmh : 5.0;
    ctx.strokeStyle = 'rgba(245, 238, 230, 0.85)';
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 20]);
    ctx.lineDashOffset = -(animTime * (speedKmh * 16)) % 46;
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

    // Roadside Landmark / Encounter according to Stage
    const propX = width * 0.82;
    const propY = roadTopY - 26;

    if (stageId === 'hokkaido' && assets.encounterHokkaidoCow) {
      // Cute Hokkaido Dairy Cow
      const cowW = 76;
      const cowH = 76;
      ctx.fillStyle = 'rgba(20, 15, 10, 0.28)';
      ctx.beginPath();
      ctx.ellipse(propX + cowW / 2, roadTopY + 4, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(assets.encounterHokkaidoCow, propX, roadTopY - cowH + 8, cowW, cowH);
    } else if (stageId === 'kyoto' && assets.landmarkKyotoGate) {
      // Kyoto Shrine Torii Gate
      const gateW = 78;
      const gateH = 78;
      ctx.fillStyle = 'rgba(20, 15, 10, 0.28)';
      ctx.beginPath();
      ctx.ellipse(propX + gateW / 2, roadTopY + 4, 26, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(assets.landmarkKyotoGate, propX, roadTopY - gateH + 8, gateW, gateH);
    } else if (stageId === 'tokyo' && assets.landmarkTokyoYatai) {
      // Tokyo Yatai Ramen Stall
      const yataiW = 84;
      const yataiH = 84;
      ctx.fillStyle = 'rgba(20, 15, 10, 0.28)';
      ctx.beginPath();
      ctx.ellipse(propX + yataiW / 2, roadTopY + 4, 28, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(assets.landmarkTokyoYatai, propX, roadTopY - yataiH + 8, yataiW, yataiH);
    } else if (assets.encounterLantern) {
      // Traditional Stone Lantern (Kamakura)
      const toroW = 54;
      const toroH = 78;
      ctx.fillStyle = 'rgba(20, 15, 10, 0.3)';
      ctx.beginPath();
      ctx.ellipse(propX + toroW / 2, propY + toroH - 4, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(assets.encounterLantern, propX, propY, toroW, toroH);

      if (isNight) {
        const lanternRadius = 35 + 4 * Math.sin(animTime * 4);
        const lanternGlow = ctx.createRadialGradient(propX + toroW / 2, propY + 28, 4, propX + toroW / 2, propY + 28, lanternRadius);
        lanternGlow.addColorStop(0, 'rgba(255, 180, 60, 0.50)');
        lanternGlow.addColorStop(1, 'rgba(255, 180, 60, 0)');
        ctx.fillStyle = lanternGlow;
        ctx.beginPath();
        ctx.arc(propX + toroW / 2, propY + 28, lanternRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 10. RUNNER (Dynamic stride cadence & vertical bounce)
    const runnerX = width * 0.46;
    const runnerRoadY = roadTopY + 48;
    const runnerSpriteW = 86;
    const runnerSpriteH = 86;
    const runnerGroundDy = -runnerSpriteH * (60 / 64);

    // Calculate cadence and stride animation
    const stepsPerMin = 140 + Math.min(50, speedKmh * 5);
    const cadencePhase = animTime * (stepsPerMin / 60) * Math.PI * 2;
    const runFrame = Math.floor(cadencePhase / (Math.PI / 2)) % 4;
    const verticalBounce = Math.abs(Math.sin(cadencePhase)) * 3.5;
    const forwardLean = 0.04 + Math.min(0.06, (speedKmh / 15) * 0.06);

    // Runner Drop Shadow (scales with bounce)
    const shadowScale = 1 - verticalBounce / 16;
    ctx.save();
    ctx.translate(runnerX, runnerRoadY);
    ctx.fillStyle = 'rgba(30, 20, 15, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 22 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Runner Sprite
    if (assets.runnerRun) {
      ctx.save();
      ctx.translate(runnerX, runnerRoadY - verticalBounce);
      ctx.rotate(forwardLean);
      drawSprite(ctx, assets.runnerRun, 4, 4, runFrame, 0, -runnerSpriteW / 2, runnerGroundDy, runnerSpriteW, runnerSpriteH);
      ctx.restore();
    }

    // 11. PET SHIBA COMPANION (Trotting stride & joyful bounce)
    const petX = runnerX - 48;
    const petRoadY = runnerRoadY - 4;
    const petDrawSize = 44;
    const petGroundDy = -petDrawSize * (27 / 32);

    const petPhase = cadencePhase * 1.05;
    const petFrame = Math.floor(petPhase / (Math.PI / 2)) % 4;
    const petBounce = Math.abs(Math.sin(petPhase)) * 2.8;
    const petShadowScale = 1 - petBounce / 10;

    // Pet Drop Shadow
    ctx.save();
    ctx.translate(petX, petRoadY);
    ctx.fillStyle = 'rgba(30, 20, 15, 0.24)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 14 * petShadowScale, 4 * petShadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Shiba Sprite (Cols 0-3 run in 8x8 PixelLab sheet)
    if (assets.petShiba) {
      ctx.save();
      ctx.translate(petX, petRoadY - petBounce);
      ctx.rotate(0.04);
      drawSprite(ctx, assets.petShiba, 8, 8, petFrame, 0, -petDrawSize / 2, petGroundDy, petDrawSize, petDrawSize);
      ctx.restore();
    }

    // 12. FALLING SAKURA / AUTUMN PETALS / SNOW FLAKES
    const petalCount = 18;
    const petalColor = theme === 'sunset' 
      ? 'rgba(235, 120, 70, 0.8)' 
      : theme === 'night'
      ? 'rgba(220, 230, 255, 0.75)'
      : 'rgba(255, 185, 205, 0.85)';

    ctx.fillStyle = petalColor;
    for (let i = 0; i < petalCount; i++) {
      const speedY = 32 + (i % 5) * 6;
      const speedX = 18 + (i % 4) * 8;
      const px = (((i * 73) - animTime * speedX) % (width + 60) + (width + 60)) % (width + 60) - 30;
      const py = (height * 0.25 + ((i * 47) + animTime * speedY)) % (height * 0.75);
      const sway = Math.sin(animTime * 3 + i) * 6;
      const rot = (animTime * 1.5 + i) * 0.4;

      ctx.save();
      ctx.translate(px + sway, py);
      ctx.rotate(rot);
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
              <h3 className="text-base sm:text-lg font-black text-[#2C2621] flex items-center gap-2">
                <span>บันทึกความทรงจำ Scenic Run</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#52796F]/15 text-[#52796F] font-bold">
                  ✨ แอนิเมชั่นขยับได้
                </span>
              </h3>
              <p className="text-[11px] text-[#8C827A]">
                สร้างภาพเคลื่อนไหวพร้อมสถิติวิ่งสำหรับแชร์ลง Instagram Story / Reels หรือบันทึกเก็บไว้
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

        {/* Live Animation Canvas Preview Container */}
        <div className="relative rounded-2xl overflow-hidden shadow-cozy-lg border border-[#EDE6DC] bg-[#F7F4EE] flex items-center justify-center p-2 sm:p-3 max-h-[50vh]">
          {isAssetsLoaded ? (
            <div className="relative max-h-[46vh] flex items-center justify-center">
              <canvas 
                ref={canvasRef} 
                className="max-h-[46vh] w-auto max-w-full object-contain rounded-xl block shadow-md select-none"
                style={{
                  aspectRatio: format === 'story' ? '9 / 16' : '3 / 2'
                }}
              />
              <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1.5 pointer-events-none shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE ANIMATION</span>
              </div>
            </div>
          ) : (
            <div className="py-20 text-[#8C827A] text-xs font-mono animate-pulse flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#52796F]" />
              <span>กำลังโหลดฉาก Scenic และจัดทำแอนิเมชั่นสด...</span>
            </div>
          )}

          {/* Export Notification Toast */}
          {exportNotice && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-[#2C2621]/90 backdrop-blur-md text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 z-10">
              <Sparkles className="w-4 h-4 text-[#E9C46A]" />
              <span>{exportNotice}</span>
            </div>
          )}
        </div>

        {/* Action Buttons & iPad Tip */}
        <div className="space-y-2 pt-1">
          <p className="text-[11px] text-[#8C827A] text-center sm:text-left">
            💡 <span className="font-semibold text-[#5A5047]">แนะนำ:</span> เลือก <span className="text-[#3B664E] font-bold">"ดาวน์โหลด GIF"</span> สำหรับแอนิเมชั่นขนาดเบา หรือ <span className="text-[#9A641F] font-bold">"วิดีโอ (MP4)"</span> เพื่อลง Instagram Story & Reels ได้เนียนตาที่สุด
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Native Share button */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && fileBlob && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const shareFile = new File([fileBlob], fileName, { type: fileBlob.type });
                    if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                      await navigator.share({
                        files: [shareFile],
                        title: 'Treadmill Scenic Run',
                        text: 'ภาพความทรงจำการวิ่ง Scenic Journey'
                      });
                    }
                  } catch (e) {
                    console.log('Share dismissed:', e);
                  }
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-2xl bg-[#52796F] hover:bg-[#3B664E] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-cozy-sm cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>แชร์ลง IG / รูปภาพ</span>
              </button>
            )}

            {/* Export Animated GIF button */}
            <button
              type="button"
              disabled={isExportingGif || isExportingVideo}
              onClick={handleExportGif}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-cozy-sm cursor-pointer ${
                isExportingGif
                  ? 'bg-[#E07A5F] text-white opacity-80 cursor-wait'
                  : 'bg-[#E07A5F] hover:bg-[#D46B4E] text-white'
              }`}
            >
              {isExportingGif ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้าง GIF ({gifProgress}%)...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>ดาวน์โหลด GIF ขยับได้</span>
                </>
              )}
            </button>

            {/* Export Looping Video (MP4) button */}
            <button
              type="button"
              disabled={isExportingVideo || isExportingGif}
              onClick={handleExportVideo}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-cozy-sm cursor-pointer ${
                isExportingVideo
                  ? 'bg-[#B8860B] text-white opacity-80 cursor-wait'
                  : 'bg-[#B8860B] hover:bg-[#9A641F] text-white'
              }`}
            >
              {isExportingVideo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังอัดวิดีโอ ({videoProgress}%)...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>บันทึกวิดีโอ (MP4)</span>
                </>
              )}
            </button>

            {/* Export Classic Static PNG button */}
            <button
              type="button"
              onClick={handleExportPng}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-2xl bg-[#C46849] hover:bg-[#B3392B] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-cozy-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ภาพนิ่ง (PNG)</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-2xl bg-[#EAE3D9] hover:bg-[#DDD5C7] text-[#5A5047] font-bold text-xs transition-all cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
