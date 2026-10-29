import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Copy, Trash2, Check } from 'lucide-react';
import type { PacketLog } from '../types/treadmill';

interface DiagnosticDrawerProps {
  logs: PacketLog[];
  onClearLogs: () => void;
}

export const DiagnosticDrawer: React.FC<DiagnosticDrawerProps> = ({ logs, onClearLogs }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLogs = () => {
    const text = logs
      .map(l => `[${l.timestamp}] [${l.direction}] [${l.protocol}] ${l.hex ? 'HEX: ' + l.hex : ''} ${l.decodedSummary || ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7F2]/95 border-t border-[#EDE6DC] shadow-cozy-lg backdrop-blur-lg transition-all duration-300">
      {/* Bar Header */}
      <div
        className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-[#F3EFE6] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5 text-xs font-semibold text-[#5A5047]">
          <Terminal className="w-4 h-4 text-[#52796F]" />
          <span>Bluetooth Packet Inspector & Logs</span>
          <span className="px-2 py-0.5 rounded-full bg-[#EAF2EC] text-[#3B664E] border border-[#CDE0D3] text-[10px] font-bold">
            {logs.length} รายการ
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-[#8C827A]" />
          ) : (
            <ChevronUp className="w-4 h-4 text-[#8C827A]" />
          )}
        </div>
      </div>

      {/* Expanded Log Drawer */}
      {isOpen && (
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#EDE6DC] text-xs">
            <span className="text-[#8C827A]">
              บันทึก Raw Hex Data จากลู่วิ่ง FS-01BD59-A แบบ Real-time
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLogs();
                }}
                className="px-3 py-1 rounded-xl bg-white hover:bg-[#F5F0E8] text-[#5A5047] border border-[#EDE6DC] flex items-center gap-1.5 cursor-pointer shadow-cozy-sm"
                title="คัดลอก Logs ทั้งหมด"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#52796F]" /> : <Copy className="w-3.5 h-3.5 text-[#8C827A]" />}
                <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearLogs();
                }}
                className="px-3 py-1 rounded-xl bg-[#FDF0F0] hover:bg-[#FBE4E4] text-[#B94A4A] border border-[#F4CECE] flex items-center gap-1.5 cursor-pointer shadow-cozy-sm"
                title="ล้าง Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้าง</span>
              </button>
            </div>
          </div>

          {/* Logs Viewport */}
          <div className="h-48 overflow-y-auto font-mono text-xs space-y-1 p-3 rounded-2xl bg-[#2C2621] text-[#E8E2D9] border border-[#3E3730]">
            {logs.length === 0 ? (
              <div className="text-[#8C827A] text-center py-6 font-sans">
                ยังไม่มีข้อมูล (เมื่อกดเชื่อมต่อลู่วิ่ง ข้อมูล Hex Packet จะแสดงที่นี่)
              </div>
            ) : (
              logs.slice().reverse().map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="text-slate-500 whitespace-nowrap">[{log.timestamp}]</span>
                  <span
                    className={`px-1 rounded text-[10px] font-bold ${
                      log.direction === 'RX'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : log.direction === 'TX'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {log.direction}
                  </span>
                  {log.hex && (
                    <span className="text-emerald-400 font-semibold tracking-wide">
                      {log.hex}
                    </span>
                  )}
                  {log.decodedSummary && (
                    <span className="text-slate-300">
                      → {log.decodedSummary}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
