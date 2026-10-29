import React, { useState, useEffect, useRef } from 'react';
import { 
  Minimize2, 
  Gauge, 
  Mountain, 
  Timer, 
  MapPin, 
  Flame, 
  Play, 
  Square,
  Volume2,
  VolumeX
} from 'lucide-react';
import type { TreadmillMetrics, UserProfile } from '../types/treadmill';
import { formatDuration, formatPace, getSpeedPillInfo } from '../services/calculations';
import { audioCoach } from '../services/audioCoach';

interface GiantRunningHudProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: TreadmillMetrics;
  activeProfile: UserProfile;
  profiles?: UserProfile[];
  onSelectProfile?: (id: string) => void;
  onSetSpeed: (speed: number) => void;
  onSetIncline: (incline: number) => void;
  onStart: (speed?: number) => void;
  onStop: () => void;
  deviceName: string;
}

export const GiantRunningHud: React.FC<GiantRunningHudProps> = ({
  isOpen,
  onClose,
  metrics,
  activeProfile,
  profiles = [],
  onSelectProfile,
  onSetSpeed,
  onSetIncline,
  onStart,
  onStop,
  deviceName
}) => {
  const defaultStartingSpeed = activeProfile?.defaultStartSpeed ?? 3.0;
  const [targetSpeed, setTargetSpeed] = useState<number>(() => metrics.speedKmh > 0 ? metrics.speedKmh : defaultStartingSpeed);
  const [targetIncline, setTargetIncline] = useState<number>(metrics.inclineLevel);
  const [soundOn, setSoundOn] = useState(true);
  const lastUserActionRef = useRef<number>(0);

  // When activeProfile changes and treadmill is stopped, switch target speed to their personal default
  useEffect(() => {
    if (metrics.speedKmh <= 0.1 && activeProfile?.defaultStartSpeed) {
      setTargetSpeed(activeProfile.defaultStartSpeed);
    }
  }, [activeProfile?.id, activeProfile?.defaultStartSpeed]);

  // Sync target with actual metrics when running (with grace period so user adjustments aren't snapped back by motor lag)
  useEffect(() => {
    const timeSinceLastAction = Date.now() - lastUserActionRef.current;
    if (timeSinceLastAction > 2500 && metrics.speedKmh > 0.5 && Math.abs(metrics.speedKmh - targetSpeed) > 0.05) {
      setTargetSpeed(metrics.speedKmh);
    }
  }, [metrics.speedKmh]);

  useEffect(() => {
    const timeSinceLastAction = Date.now() - lastUserActionRef.current;
    if (timeSinceLastAction > 2500) {
      setTargetIncline(metrics.inclineLevel);
    }
  }, [metrics.inclineLevel]);

  if (!isOpen) return null;

  const handleAdjustSpeed = (delta: number) => {
    lastUserActionRef.current = Date.now();
    if (soundOn) audioCoach.playButtonTapSound();
    const base = targetSpeed > 0.5 ? targetSpeed : (metrics.speedKmh > 0.5 ? metrics.speedKmh : 3.0);
    const newSpeed = Math.min(16.0, Math.max(1.0, Math.round((base + delta) * 10) / 10));
    setTargetSpeed(newSpeed);
    onSetSpeed(newSpeed);
  };

  const handleDirectSpeed = (spd: number) => {
    lastUserActionRef.current = Date.now();
    if (soundOn) audioCoach.playButtonTapSound();
    setTargetSpeed(spd);
    onSetSpeed(spd);
  };

  const handleAdjustIncline = (delta: number) => {
    lastUserActionRef.current = Date.now();
    if (soundOn) audioCoach.playButtonTapSound();
    const newIncline = Math.min(20, Math.max(0, Math.round(targetIncline + delta)));
    setTargetIncline(newIncline);
    onSetIncline(newIncline);
  };

  const handleDirectIncline = (inc: number) => {
    lastUserActionRef.current = Date.now();
    if (soundOn) audioCoach.playButtonTapSound();
    setTargetIncline(inc);
    onSetIncline(inc);
  };

  const handleStart = () => {
    if (soundOn) audioCoach.playButtonTapSound();
    const spd = targetSpeed >= 1.0 ? targetSpeed : defaultStartingSpeed;
    onStart(spd);
  };

  const handleStop = () => {
    if (soundOn) audioCoach.playStopSound();
    onStop();
  };

  const paceStr = formatPace(metrics.speedKmh);
  const durationStr = formatDuration(metrics.elapsedSeconds);
  const distanceKm = (metrics.distanceMeters / 1000).toFixed(2);
  const caloriesStr = Math.round(metrics.caloriesBurned).toString();

  const favoriteSpeeds = activeProfile?.favoriteSpeeds && activeProfile.favoriteSpeeds.length > 0
    ? activeProfile.favoriteSpeeds
    : [3.0, 5.0, 7.0, 9.0];

  const speedPresets = [3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 10.0, 12.0];
  const inclinePresets = [0, 2, 4, 6, 8, 10, 12, 16, 20];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden animate-in fade-in duration-150">
      
      {/* Top Runner Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 shadow-sm">
            <span className="text-xl leading-none">{activeProfile.avatar || '🏃‍♂️'}</span>
            <span className="font-bold text-sm text-white">{activeProfile.name}</span>
            <span className="text-xs text-cyan-400 font-mono">({activeProfile.weightKg}kg)</span>
          </div>

          {/* Quick Profile Switcher inside Giant HUD (Phase 2) */}
          {profiles.length > 1 && onSelectProfile && (
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              {profiles.map((p) => {
                const isSelected = p.id === activeProfile.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (soundOn) audioCoach.playButtonTapSound();
                      onSelectProfile(p.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{deviceName || 'FS-01BD59-A'}</span>
          </div>
        </div>

        {/* Controls: Audio Toggle & Minimize */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
            title="เปิด/ปิดเสียงคลิก"
          >
            {soundOn ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-slate-600" />}
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-2 text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm"
          >
            <Minimize2 className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">ย่อหน้าจอ</span>
          </button>
        </div>
      </div>

      {/* Hero Dual Metrics: Speed & Incline */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 my-auto py-2">
        {/* Giant Speed Block */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/40 rounded-3xl border border-cyan-500/30 p-4 sm:p-6 flex flex-col justify-between shadow-2xl shadow-cyan-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400">
              <Gauge className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">ความเร็ว (SPEED)</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Pace</span>
              <span className="text-xs sm:text-sm font-mono font-bold text-slate-300">{paceStr} /km</span>
            </div>
          </div>

          <div className="my-2 sm:my-4 text-center">
            <div className="text-6xl sm:text-8xl md:text-9xl font-black digital-number text-cyan-400 tracking-tight glow-cyan leading-none">
              {metrics.speedKmh.toFixed(1)}
            </div>
            <div className="text-xs sm:text-sm text-cyan-300 font-bold uppercase mt-1">
              กิโลเมตร/ชั่วโมง (km/h)
            </div>
          </div>

          {/* Stepper buttons for Speed (+0.1, -0.1, +0.5, -0.5) */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <button
              onClick={() => handleAdjustSpeed(-0.5)}
              className="py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 text-sm sm:text-base font-black active:scale-90 transition-all border border-slate-700/80 cursor-pointer shadow-md"
            >
              -0.5
            </button>
            <button
              onClick={() => handleAdjustSpeed(-0.1)}
              className="py-3 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 text-sm sm:text-base font-black active:scale-90 transition-all border border-cyan-500/50 cursor-pointer shadow-md"
            >
              -0.1
            </button>
            <button
              onClick={() => handleAdjustSpeed(0.1)}
              className="py-3 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 text-sm sm:text-base font-black active:scale-90 transition-all border border-cyan-500/50 cursor-pointer shadow-md"
            >
              +0.1
            </button>
            <button
              onClick={() => handleAdjustSpeed(0.5)}
              className="py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 text-sm sm:text-base font-black active:scale-90 transition-all border border-slate-700/80 cursor-pointer shadow-md"
            >
              +0.5
            </button>
          </div>
        </div>

        {/* Giant Incline Block */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/40 rounded-3xl border border-orange-500/30 p-4 sm:p-6 flex flex-col justify-between shadow-2xl shadow-orange-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-400">
              <Mountain className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">ความชัน (INCLINE)</span>
            </div>
            <span className="text-xs text-orange-400/80 font-mono">0-20 ระดับ</span>
          </div>

          <div className="my-2 sm:my-4 text-center">
            <div className="text-6xl sm:text-8xl md:text-9xl font-black digital-number text-orange-400 tracking-tight leading-none">
              {metrics.inclineLevel}
            </div>
            <div className="text-xs sm:text-sm text-orange-300 font-bold uppercase mt-1">
              ระดับความชัน (Level)
            </div>
          </div>

          {/* Stepper buttons for Incline (-1, +1, -2, +2) */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <button
              onClick={() => handleAdjustIncline(-2)}
              className="py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 text-sm sm:text-base font-black active:scale-90 transition-all border border-slate-700/80 cursor-pointer shadow-md"
            >
              -2
            </button>
            <button
              onClick={() => handleAdjustIncline(-1)}
              className="py-3 rounded-2xl bg-orange-950/80 hover:bg-orange-900/80 text-orange-300 text-sm sm:text-base font-black active:scale-90 transition-all border border-orange-500/50 cursor-pointer shadow-md"
            >
              -1
            </button>
            <button
              onClick={() => handleAdjustIncline(1)}
              className="py-3 rounded-2xl bg-orange-950/80 hover:bg-orange-900/80 text-orange-300 text-sm sm:text-base font-black active:scale-90 transition-all border border-orange-500/50 cursor-pointer shadow-md"
            >
              +1
            </button>
            <button
              onClick={() => handleAdjustIncline(2)}
              className="py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 text-sm sm:text-base font-black active:scale-90 transition-all border border-slate-700/80 cursor-pointer shadow-md"
            >
              +2
            </button>
          </div>
        </div>
      </div>

      {/* Middle Row: Duration, Distance, Calories, Fat Burned */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 my-1">
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-2.5 sm:p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-semibold mb-0.5">
            <Timer className="w-3.5 h-3.5 text-cyan-400" />
            <span>เวลา</span>
          </div>
          <div className="text-xl sm:text-3xl font-black digital-number text-white">
            {durationStr}
          </div>
        </div>

        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-2.5 sm:p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-semibold mb-0.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>ระยะทาง</span>
          </div>
          <div className="text-xl sm:text-3xl font-black digital-number text-emerald-400">
            {distanceKm} <span className="text-xs font-normal text-slate-400">km</span>
          </div>
        </div>

        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-2.5 sm:p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-semibold mb-0.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>แคลอรี่</span>
          </div>
          <div className="text-xl sm:text-3xl font-black digital-number text-orange-400">
            {caloriesStr} <span className="text-xs font-normal text-slate-400">kcal</span>
          </div>
        </div>

        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-2.5 sm:p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-semibold mb-0.5">
            <Mountain className="w-3.5 h-3.5 text-purple-400" />
            <span>ความสูง</span>
          </div>
          <div className="text-xl sm:text-3xl font-black digital-number text-purple-400">
            {Math.round(metrics.elevationGainMeters)} <span className="text-xs font-normal text-slate-400">m</span>
          </div>
        </div>
      </div>

      {/* Bottom Mega Action Bar */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        {/* Runner's Mega Personal Favorite Speed Bar (Phase 2) */}
        {favoriteSpeeds.length > 0 && (
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 px-1">
              <span>⭐ สปีดโปรดของ {activeProfile.name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {favoriteSpeeds.map((spd) => {
                const info = getSpeedPillInfo(spd);
                const isSelected = Math.abs(metrics.speedKmh - spd) < 0.1;
                return (
                  <button
                    key={spd}
                    onClick={() => handleDirectSpeed(spd)}
                    className={`py-2.5 sm:py-3 px-3 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer active:scale-95 shadow-md ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-300/40 shadow-amber-500/25'
                        : 'bg-slate-900/90 hover:bg-slate-850 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base sm:text-lg leading-none">{info.icon}</span>
                      <span className="text-xs font-bold">{info.label}</span>
                    </div>
                    <span className="text-lg sm:text-xl font-black digital-number">
                      {spd.toFixed(1)} <span className="text-[10px] font-normal opacity-80">km/h</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Speed Presets Grid */}
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
          {speedPresets.map((spd) => {
            const isSelected = Math.abs(metrics.speedKmh - spd) < 0.1;
            return (
              <button
                key={spd}
                onClick={() => handleDirectSpeed(spd)}
                className={`py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black digital-number cursor-pointer active:scale-95 transition-all shadow-sm ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40'
                    : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                }`}
              >
                {spd.toFixed(1)}
              </button>
            );
          })}
        </div>

        {/* Quick Incline Presets Grid */}
        <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
          {inclinePresets.map((inc) => {
            const isSelected = metrics.inclineLevel === inc;
            return (
              <button
                key={inc}
                onClick={() => handleDirectIncline(inc)}
                className={`py-1.5 rounded-xl text-xs font-bold digital-number cursor-pointer active:scale-95 transition-all shadow-sm ${
                  isSelected
                    ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/40'
                    : inc === 12
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-900/90 hover:bg-slate-850 text-slate-400 border border-slate-800'
                }`}
              >
                {inc === 12 ? '12★' : `▲${inc}`}
              </button>
            );
          })}
        </div>

        {/* Master Motor Buttons: Giant START / STOP */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleStart}
            className="py-3.5 sm:py-4 px-6 rounded-2xl text-base sm:text-lg font-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            <span>เริ่มวิ่ง (START {targetSpeed >= 1.0 ? targetSpeed.toFixed(1) : '3.0'})</span>
          </button>

          <button
            onClick={handleStop}
            className="py-3.5 sm:py-4 px-6 rounded-2xl text-base sm:text-lg font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-3 shadow-xl shadow-rose-900/40 active:scale-95 transition-all cursor-pointer border border-rose-400/40"
          >
            <Square className="w-6 h-6 fill-white" />
            <span>⏹️ หยุดสายพาน (STOP & SAVE)</span>
          </button>
        </div>
      </div>

    </div>
  );
};
