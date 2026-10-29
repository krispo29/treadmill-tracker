import React from 'react';
import { Bluetooth, BluetoothOff, Monitor, Dumbbell, History, ChevronDown } from 'lucide-react';
import type { BluetoothProtocol, ConnectionStatus, UserProfile } from '../types/treadmill';

interface HeaderProps {
  status: ConnectionStatus;
  protocol: BluetoothProtocol;
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
}

export const Header: React.FC<HeaderProps> = ({
  status,
  protocol,
  deviceName,
  isSimulating,
  activeProfile,
  onConnect,
  onDisconnect,
  onToggleSimulation,
  onOpenProfileManager,
  onOpenWorkouts,
  onOpenHistory,
  onResetSession
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* App Title & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-black text-xl">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white m-0 p-0">
                Treadmill <span className="text-cyan-400">Tracker</span>
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Pro
              </span>
            </div>
            
            {/* Connection Badge */}
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              {status === 'connected' && (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  เชื่อมต่อ: {deviceName || 'FS-01BD59-A'} ({protocol})
                </span>
              )}
              {status === 'connecting' && (
                <span className="inline-flex items-center gap-1.5 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  กำลังเชื่อมต่อ...
                </span>
              )}
              {status === 'searching' && (
                <span className="inline-flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  กำลังค้นหาบลูทูธ...
                </span>
              )}
              {status === 'disconnected' && (
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  ยังไม่ได้เชื่อมต่อ
                </span>
              )}
              {status === 'error' && (
                <span className="inline-flex items-center gap-1.5 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  ข้อผิดพลาดบลูทูธ
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Active Runner 1-Tap Switcher Pill */}
          <button
            onClick={onOpenProfileManager}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
            title="แตะเพื่อสลับคนวิ่ง หรือเพิ่มคนใหม่"
          >
            <span className="text-base leading-none">{activeProfile.avatar || '🏃‍♂️'}</span>
            <span className="truncate max-w-[100px]">{activeProfile.name}</span>
            <span className="text-[10px] text-cyan-400 font-mono">({activeProfile.weightKg}kg)</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Workout Programs Button */}
          <button
            onClick={onOpenWorkouts}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-300 border border-indigo-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Dumbbell className="w-3.5 h-3.5 text-indigo-400" />
            <span>คอร์สซ้อม</span>
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            title="ดูประวัติและสถิติการวิ่งย้อนหลัง (Neon DB)"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>ประวัติ & สถิติ</span>
          </button>

          {/* Simulation Toggle */}
          <button
            onClick={onToggleSimulation}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
              isSimulating
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="ทดสอบระบบโดยไม่ต้องต่อลู่วิ่งจริง"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{isSimulating ? 'หยุด Demo' : 'โหมด Demo'}</span>
          </button>

          {/* Reset workout session */}
          <button
            onClick={onResetSession}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 transition-colors cursor-pointer"
            title="รีเซ็ตสถิติรอบนี้"
          >
            รีเซ็ต
          </button>

          {/* Bluetooth Connect/Disconnect Button */}
          {status === 'connected' ? (
            <button
              onClick={onDisconnect}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-all shadow-sm cursor-pointer"
            >
              <BluetoothOff className="w-4 h-4" />
              <span>ตัดการเชื่อมต่อ</span>
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={status === 'connecting' || status === 'searching'}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Bluetooth className="w-4 h-4" />
              <span>{status === 'searching' ? 'ค้นหา...' : 'เชื่อมต่อลู่'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
