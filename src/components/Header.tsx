import React from 'react';
import { Bluetooth, BluetoothOff, Monitor, Dumbbell, History, ChevronDown, Maximize2 } from 'lucide-react';
import type { BluetoothProtocol, ConnectionStatus, UserProfile } from '../types/treadmill';

interface HeaderProps {
  status: ConnectionStatus;
  protocol?: BluetoothProtocol;
  deviceName: string;
  isSimulating: boolean;
  activeProfile: UserProfile;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleSimulation: () => void;
  onOpenProfileManager: () => void;
  onOpenWorkouts: () => void;
  onOpenHistory: () => void;
  onResetSession: () => void;
  onOpenGiantHud: () => void;
  onOpenScenicView: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  deviceName,
  isSimulating,
  activeProfile,
  onConnect,
  onDisconnect,
  onToggleSimulation,
  onOpenProfileManager,
  onOpenWorkouts,
  onOpenHistory,
  onResetSession,
  onOpenGiantHud,
  onOpenScenicView
}) => {
  return (
    <header className="border-b border-[#EBE4D8] bg-[#FAF7F2]/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* App Title & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#52796F] text-white flex items-center justify-center shadow-cozy text-lg font-bold">
            🌿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#2C2621] m-0 p-0">
                Treadmill <span className="text-[#52796F]">Studio</span>
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#EAF2EC] text-[#3B664E] border border-[#CDE0D3]">
                Cozy
              </span>
            </div>
            
            {/* Connection Badge */}
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              {status === 'connected' && (
                <span className="inline-flex items-center gap-1.5 text-[#3B664E] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#52796F] animate-pulse" />
                  เชื่อมต่อแล้ว: {deviceName || 'ลู่วิ่ง'}
                </span>
              )}
              {status === 'connecting' && (
                <span className="inline-flex items-center gap-1.5 text-[#B67A28] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#B67A28] animate-ping" />
                  กำลังเชื่อมต่อลู่วิ่ง...
                </span>
              )}
              {status === 'searching' && (
                <span className="inline-flex items-center gap-1.5 text-[#52796F] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#52796F] animate-pulse" />
                  กำลังค้นหาบลูทูธ...
                </span>
              )}
              {status === 'disconnected' && (
                <span className="inline-flex items-center gap-1.5 text-[#8C827A]">
                  <span className="w-2 h-2 rounded-full bg-[#BDB5AB]" />
                  ยังไม่ได้เชื่อมต่อลู่วิ่ง
                </span>
              )}
              {status === 'error' && (
                <span className="inline-flex items-center gap-1.5 text-[#B94A4A] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#B94A4A]" />
                  สัญญาณบลูทูธขัดข้อง
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Active Runner 1-Tap Switcher Pill */}
          <button
            onClick={onOpenProfileManager}
            className="px-3.5 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-2 bg-white hover:bg-[#F5F0E8] text-[#2C2621] border border-[#E5DDD0] transition-all cursor-pointer shadow-cozy-sm active:scale-95"
            title="แตะเพื่อสลับคนวิ่ง หรือแก้ไขโปรไฟล์"
          >
            <span className="text-base leading-none">{activeProfile.avatar || '🏃‍♀️'}</span>
            <span className="truncate max-w-[100px]">{activeProfile.name}</span>
            <span className="text-[11px] text-[#52796F] font-mono">({activeProfile.weightKg}kg)</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8C827A]" />
          </button>

          {/* Workout Programs Button */}
          <button
            onClick={onOpenWorkouts}
            className="px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 bg-[#FDF6EA] hover:bg-[#F7EEDC] text-[#9A641F] border border-[#F0DFBE] transition-all cursor-pointer shadow-cozy-sm active:scale-95"
          >
            <Dumbbell className="w-3.5 h-3.5 text-[#B67A28]" />
            <span>คอร์สซ้อม</span>
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 bg-white hover:bg-[#F5F0E8] text-[#5A5047] border border-[#E5DDD0] transition-all cursor-pointer shadow-cozy-sm active:scale-95"
            title="ดูประวัติและสถิติการวิ่งย้อนหลัง"
          >
            <History className="w-3.5 h-3.5 text-[#52796F]" />
            <span>ประวัติ & สถิติ</span>
          </button>

          {/* Scenic Walk Animation View Toggle */}
          <button
            onClick={onOpenScenicView}
            className="px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 bg-[#FDF0EC] hover:bg-[#F9E2DA] text-[#C46849] border border-[#F6D5C9] transition-all cursor-pointer shadow-cozy-sm active:scale-95"
            title="เปิดวิววิ่งธรรมชาติสุดชิลล์ เพลินตา (Scenic Journey)"
          >
            <span className="text-sm leading-none">🌸</span>
            <span>วิววิ่งเพลินๆ</span>
          </button>

          {/* Giant Running HUD Toggle */}
          <button
            onClick={onOpenGiantHud}
            className="px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 bg-[#EAF2EC] hover:bg-[#DCEAE0] text-[#3B664E] border border-[#CDE0D3] transition-all cursor-pointer shadow-cozy-sm active:scale-95"
            title="เปิดหน้าจอวิ่งขนาดยักษ์ (Giant HUD)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#4E7D63]" />
            <span>จอวิ่งยักษ์</span>
          </button>

          {/* Simulation Toggle */}
          <button
            onClick={onToggleSimulation}
            className={`px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
              isSimulating
                ? 'bg-[#FDF0EC] text-[#B85737] border-[#F6D5C9] shadow-cozy-sm'
                : 'bg-white text-[#6B635B] border-[#E5DDD0] hover:bg-[#F5F0E8]'
            }`}
            title="ทดสอบระบบโดยไม่ต้องต่อลู่วิ่งจริง"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{isSimulating ? 'หยุด Demo' : 'โหมด Demo'}</span>
          </button>

          {/* Reset workout session */}
          <button
            onClick={onResetSession}
            className="px-3 py-1.5 rounded-2xl text-xs font-medium text-[#8C827A] hover:text-[#2C2621] hover:bg-[#EFE8DD] transition-colors cursor-pointer"
            title="รีเซ็ตสถิติรอบนี้"
          >
            รีเซ็ต
          </button>

          {/* Bluetooth Connect/Disconnect Button */}
          {status === 'connected' ? (
            <button
              onClick={onDisconnect}
              className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 bg-[#FDF0F0] text-[#B94A4A] hover:bg-[#FBE4E4] border border-[#F4CECE] transition-all shadow-cozy-sm cursor-pointer active:scale-95"
            >
              <BluetoothOff className="w-4 h-4" />
              <span>ตัดการเชื่อมต่อ</span>
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={status === 'connecting' || status === 'searching'}
              className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 bg-[#52796F] hover:bg-[#43675E] text-white transition-all shadow-cozy-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Bluetooth className="w-4 h-4" />
              <span>{status === 'searching' ? 'กำลังค้นหา...' : 'เชื่อมต่อลู่'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
