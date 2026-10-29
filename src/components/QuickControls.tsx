import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Mountain, Gauge, Play, Square, Edit3, Check, Star } from 'lucide-react';
import type { UserProfile } from '../types/treadmill';
import { getSpeedPillInfo } from '../services/calculations';

interface QuickControlsProps {
  currentSpeed: number;
  currentIncline: number;
  onSetSpeed: (speed: number) => void;
  onSetIncline: (incline: number) => void;
  onStart?: (speed?: number) => void;
  onStop?: () => void;
  activeProfile?: UserProfile;
  onUpdateFavorites?: (speeds: number[]) => void;
}

export const QuickControls: React.FC<QuickControlsProps> = ({
  currentSpeed,
  currentIncline,
  onSetSpeed,
  onSetIncline,
  onStart,
  onStop,
  activeProfile,
  onUpdateFavorites
}) => {
  const defaultStartingSpeed = activeProfile?.defaultStartSpeed ?? 3.0;

  // Internal target speed so adjustments (+0.1 / -0.1) are immediate and not affected by motor acceleration lag
  const [targetSpeed, setTargetSpeed] = useState<number>(() => currentSpeed > 0 ? currentSpeed : defaultStartingSpeed);
  const [targetIncline, setTargetIncline] = useState<number>(currentIncline);
  const [isCustomSpeedOpen, setIsCustomSpeedOpen] = useState(false);
  const [customInputVal, setCustomInputVal] = useState('');
  const lastUserActionRef = useRef<number>(0);

  // When activeProfile changes and treadmill is stopped, switch target speed to their personal default
  useEffect(() => {
    if (currentSpeed <= 0.1 && activeProfile?.defaultStartSpeed) {
      setTargetSpeed(activeProfile.defaultStartSpeed);
    }
  }, [activeProfile?.id, activeProfile?.defaultStartSpeed]);

  // Sync target with incoming actual speed if user has not interacted recently (prevents fighting motor acceleration lag)
  useEffect(() => {
    const timeSinceLastAction = Date.now() - lastUserActionRef.current;
    if (timeSinceLastAction > 2500 && currentSpeed > 0.5 && Math.abs(currentSpeed - targetSpeed) > 0.05 && !isCustomSpeedOpen) {
      setTargetSpeed(currentSpeed);
    }
  }, [currentSpeed, isCustomSpeedOpen]);

  useEffect(() => {
    const timeSinceLastAction = Date.now() - lastUserActionRef.current;
    if (timeSinceLastAction > 2500) {
      setTargetIncline(currentIncline);
    }
  }, [currentIncline]);

  // Adjust speed with precise decimals (e.g. +0.1, -0.1, +0.5, -0.5)
  // Minimum speed when adjusting is clamped to 1.0 km/h so pressing minus NEVER drops to 0!
  const adjustSpeed = (delta: number) => {
    lastUserActionRef.current = Date.now();
    const base = targetSpeed > 0.5 ? targetSpeed : (currentSpeed > 0.5 ? currentSpeed : defaultStartingSpeed);
    const newSpeed = Math.min(16.0, Math.max(1.0, Math.round((base + delta) * 10) / 10));
    setTargetSpeed(newSpeed);
    onSetSpeed(newSpeed);
  };

  const setDirectSpeed = (spd: number) => {
    lastUserActionRef.current = Date.now();
    const clamped = Math.min(16.0, Math.max(0, Math.round(spd * 10) / 10));
    setTargetSpeed(clamped > 0 ? clamped : defaultStartingSpeed);
    onSetSpeed(clamped);
  };

  const adjustIncline = (delta: number) => {
    lastUserActionRef.current = Date.now();
    const base = targetIncline;
    const newIncline = Math.min(20, Math.max(0, Math.round(base + delta)));
    setTargetIncline(newIncline);
    onSetIncline(newIncline);
  };

  const handleApplyCustomSpeed = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(customInputVal);
    if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 16.0) {
      lastUserActionRef.current = Date.now();
      setDirectSpeed(parsed);
      setIsCustomSpeedOpen(false);
      setCustomInputVal('');
    }
  };

  const favoriteSpeeds = activeProfile?.favoriteSpeeds && activeProfile.favoriteSpeeds.length > 0
    ? activeProfile.favoriteSpeeds
    : [3.0, 5.0, 7.0, 9.0];

  const isCurrentSpeedFavorited = favoriteSpeeds.some(s => Math.abs(s - targetSpeed) < 0.05);

  const handleToggleFavorite = () => {
    if (!onUpdateFavorites) return;
    if (isCurrentSpeedFavorited) {
      // Remove current speed
      const filtered = favoriteSpeeds.filter(s => Math.abs(s - targetSpeed) >= 0.05);
      onUpdateFavorites(filtered.length > 0 ? filtered : [3.0]);
    } else {
      // Add and sort
      const updated = [...favoriteSpeeds, targetSpeed].sort((a, b) => a - b).slice(0, 6);
      onUpdateFavorites(updated);
    }
  };

  const speedPresets = [2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 10.0, 12.0, 16.0];
  const inclinePresets = [0, 2, 4, 6, 8, 10, 12, 16, 20];

  return (
    <div className="rounded-3xl bg-white border border-[#EDE6DC] shadow-cozy p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-[#EDE6DC]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2621] flex items-center gap-2">
          <span>🎮 Quick Controls (ควบคุมความเร็วละเอียด 0.1)</span>
        </h3>
        <span className="text-[11px] text-[#8C827A] font-mono">
          ปัจจุบัน: {currentSpeed.toFixed(1)} km/h | ชัน: {currentIncline}
        </span>
      </div>

      {/* Master Motor Controls: Start / Stop */}
      <div className="grid grid-cols-2 gap-3.5 pt-1">
        <button
          onClick={() => {
            const startSpd = targetSpeed >= 1.0 ? targetSpeed : defaultStartingSpeed;
            if (onStart) onStart(startSpd);
            else onSetSpeed(startSpd);
          }}
          className="py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold bg-[#52796F] hover:bg-[#43675E] text-white flex items-center justify-center gap-2 shadow-cozy-lg active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>เริ่มเดิน (Start {targetSpeed >= 1.0 ? targetSpeed.toFixed(1) : defaultStartingSpeed.toFixed(1)})</span>
        </button>

        <button
          onClick={() => {
            if (onStop) onStop();
            else onSetSpeed(0);
          }}
          className="py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold bg-[#FDF0F0] hover:bg-[#FBE4E4] text-[#B94A4A] border border-[#F4CECE] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-cozy-sm"
        >
          <Square className="w-4 h-4 fill-[#B94A4A]" />
          <span>หยุดสายพาน (Stop)</span>
        </button>
      </div>

      {/* Runner's Personal Favorite Speeds (Phase 2) */}
      {activeProfile && (
        <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#F2E5CE] space-y-3 shadow-cozy-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#A66E22] flex items-center gap-1.5">
              <span>⭐ สปีดโปรดของ {activeProfile.name}</span>
            </span>
            {onUpdateFavorites && (
              <button
                onClick={handleToggleFavorite}
                className="text-[11px] text-[#8C827A] hover:text-[#A66E22] flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                title={isCurrentSpeedFavorited ? 'ลบความเร็วนี้ออกจากสปีดโปรด' : 'บันทึกความเร็วนี้เป็นสปีดโปรด'}
              >
                <Star className={`w-3.5 h-3.5 ${isCurrentSpeedFavorited ? 'fill-[#DDA15E] text-[#DDA15E]' : 'text-[#8C827A]'}`} />
                <span>{isCurrentSpeedFavorited ? 'ลบออกจากสปีดโปรด' : `+ บันทึก ${targetSpeed.toFixed(1)} เป็นสปีดโปรด`}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {favoriteSpeeds.map((spd) => {
              const info = getSpeedPillInfo(spd);
              const isSelected = Math.abs(targetSpeed - spd) < 0.05;
              return (
                <button
                  key={spd}
                  onClick={() => setDirectSpeed(spd)}
                  className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer active:scale-95 shadow-cozy-sm ${
                    isSelected
                      ? 'ring-2 ring-[#DDA15E] bg-[#FDF6EA] border-[#DDA15E] text-[#2C2621]'
                      : 'bg-white hover:bg-[#FAF7F2] text-[#2C2621] border-[#EDE6DC]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base leading-none">{info.icon}</span>
                    <span className="text-xs font-semibold truncate">{info.label}</span>
                  </div>
                  <span className="text-sm font-black digital-number text-[#2C2621]">
                    {spd.toFixed(1)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Speed Controls with Decimal Fine-Tuning */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#52796F] font-bold flex items-center gap-1.5">
            <Gauge className="w-4 h-4" />
            <span>ปรับสปีดละเอียด (ทศนิยม 0.1 km/h)</span>
          </span>
          <button
            onClick={() => setIsCustomSpeedOpen(!isCustomSpeedOpen)}
            className="text-[11px] text-[#8C827A] hover:text-[#52796F] flex items-center gap-1 cursor-pointer font-medium"
          >
            <Edit3 className="w-3 h-3" />
            <span>พิมพ์ระบุตัวเลข</span>
          </button>
        </div>

        {/* Custom Speed Direct Input Form */}
        {isCustomSpeedOpen && (
          <form onSubmit={handleApplyCustomSpeed} className="flex items-center gap-2 p-2.5 bg-[#FAF7F2] rounded-2xl border border-[#EDE6DC]">
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="16.0"
              placeholder="เช่น 4.5, 7.2"
              value={customInputVal}
              onChange={(e) => setCustomInputVal(e.target.value)}
              className="flex-1 bg-white border border-[#EDE6DC] rounded-xl px-3 py-1.5 text-xs text-[#2C2621] digital-number focus:outline-none focus:border-[#52796F]"
              autoFocus
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-[#52796F] text-white font-bold text-xs flex items-center gap-1 hover:bg-[#43675E] cursor-pointer active:scale-95 shadow-cozy-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>ใช้ความเร็วนี้</span>
            </button>
          </form>
        )}

        {/* Stepper Row (-0.5, -0.1, [Display], +0.1, +0.5) */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 bg-[#F5F0E8] p-2 rounded-2xl border border-[#EDE6DC]">
          <button
            onClick={() => adjustSpeed(-0.5)}
            className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#5A5047] text-xs font-bold active:scale-95 cursor-pointer border border-[#EDE6DC] shadow-cozy-sm"
            title="ลด 0.5 km/h"
          >
            -0.5
          </button>

          <button
            onClick={() => adjustSpeed(-0.1)}
            className="flex-1 py-2.5 rounded-xl bg-[#EAF2EC] hover:bg-[#DCEAE0] text-[#3B664E] text-xs font-bold active:scale-95 cursor-pointer border border-[#CDE0D3] shadow-cozy-sm"
            title="ลด 0.1 km/h"
          >
            -0.1
          </button>

          {/* Central Target Speed Display */}
          <div className="px-3 py-1 text-center min-w-[95px]">
            <span className="text-2xl sm:text-3xl font-black digital-number text-[#2C2621]">
              {targetSpeed.toFixed(1)}
            </span>
            <span className="text-[10px] text-[#8C827A] font-semibold block -mt-0.5">km/h</span>
          </div>

          <button
            onClick={() => adjustSpeed(0.1)}
            className="flex-1 py-2.5 rounded-xl bg-[#EAF2EC] hover:bg-[#DCEAE0] text-[#3B664E] text-xs font-bold active:scale-95 cursor-pointer border border-[#CDE0D3] shadow-cozy-sm"
            title="เพิ่ม 0.1 km/h"
          >
            +0.1
          </button>

          <button
            onClick={() => adjustSpeed(0.5)}
            className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#5A5047] text-xs font-bold active:scale-95 cursor-pointer border border-[#EDE6DC] shadow-cozy-sm"
            title="เพิ่ม 0.5 km/h"
          >
            +0.5
          </button>
        </div>

        {/* Speed Presets Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
          {speedPresets.map((spd) => {
            const isSelected = Math.abs(targetSpeed - spd) < 0.05;
            return (
              <button
                key={spd}
                onClick={() => setDirectSpeed(spd)}
                className={`py-2 rounded-xl text-xs font-bold digital-number transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-[#52796F] text-white shadow-cozy-sm'
                    : 'bg-white hover:bg-[#FAF7F2] text-[#5A5047] border border-[#EDE6DC]'
                }`}
              >
                {spd.toFixed(spd % 1 === 0 ? 0 : 1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Incline Controls Row */}
      <div className="space-y-2.5 pt-3 border-t border-[#EDE6DC]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#C46849] font-bold flex items-center gap-1.5">
            <Mountain className="w-4 h-4" />
            <span>ปรับความชัน (Incline 0-20)</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustIncline(-1)}
              className="p-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#5A5047] cursor-pointer active:scale-95 border border-[#EDE6DC] shadow-cozy-sm"
              title="ลดความชัน 1"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-bold text-[#2C2621] text-sm">
              Lvl {targetIncline}
            </span>
            <button
              onClick={() => adjustIncline(1)}
              className="p-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#5A5047] cursor-pointer active:scale-95 border border-[#EDE6DC] shadow-cozy-sm"
              title="เพิ่มความชัน 1"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Incline Presets */}
        <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
          {inclinePresets.map((inc) => {
            const isSelected = targetIncline === inc;
            return (
              <button
                key={inc}
                onClick={() => {
                  setTargetIncline(inc);
                  onSetIncline(inc);
                }}
                className={`py-2 rounded-xl text-xs font-bold digital-number transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-[#C46849] text-white shadow-cozy-sm'
                    : inc === 12
                    ? 'bg-[#FDF0EC] text-[#B85737] border border-[#F6D5C9] hover:bg-[#FBE4DD]'
                    : 'bg-white hover:bg-[#FAF7F2] text-[#5A5047] border border-[#EDE6DC]'
                }`}
                title={inc === 12 ? 'สูตร 12-3-30 ยอดนิยม' : undefined}
              >
                {inc === 12 ? '12★' : inc}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
