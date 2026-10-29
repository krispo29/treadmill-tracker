import React, { useState } from 'react';
import { X, Database, Check, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { neonDatabase } from '../services/neonDatabase';

interface NeonSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess?: () => void;
}

export const NeonSettingsModal: React.FC<NeonSettingsModalProps> = ({
  isOpen,
  onClose,
  onConnectionSuccess
}) => {
  const [dbUrl, setDbUrl] = useState(() => neonDatabase.getConnectionUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    const result = await neonDatabase.testConnection(dbUrl);
    setTesting(false);
    setTestResult(result);

    if (result.success) {
      neonDatabase.setConnectionUrl(dbUrl);
      if (onConnectionSuccess) onConnectionSuccess();
    }
  };

  const handleClear = () => {
    neonDatabase.setConnectionUrl('');
    setDbUrl('');
    setTestResult({ success: false, message: 'ลบการเชื่อมต่อ Neon เรียบร้อย (ระบบจะสลับไปบันทึกในเครื่องแทน)' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>ตั้งค่า Neon PostgreSQL Database</span>
            </h2>
            <p className="text-xs text-slate-400">
              บันทึกประวัติการวิ่งและสถิติทั้งหมดขึ้น Cloud ส่วนตัวของคุณฟรี
            </p>
          </div>
        </div>

        <form onSubmit={handleTestAndSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Neon Connection String (URI)
            </label>
            <textarea
              rows={3}
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              placeholder="postgresql://neondb_owner:***@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
              required
            />
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Instructions on how to get free Neon */}
          <div className="rounded-xl bg-slate-950/70 p-3.5 border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <span>วิธีรับ Connection String ฟรีจาก Neon:</span>
            </span>
            <p>1. สมัครฟรีที่ <a href="https://neon.tech" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">neon.tech <ExternalLink className="w-3 h-3" /></a></p>
            <p>2. สร้างโปรเจกต์ใหม่ (ใช้เวลาเพียง 10 วินาที)</p>
            <p>3. ในหน้า Dashboard คัดลอกช่อง <strong>Connection string</strong> นำมาวางที่นี่</p>
            <p className="text-[11px] text-slate-500">
              * ตาราง <code>treadmill_workouts</code> จะถูกสร้างในฐานข้อมูลให้อัตโนมัติทันทีที่กดเชื่อมต่อ
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors cursor-pointer"
            >
              ล้างค่า
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                ปิด
              </button>

              <button
                type="submit"
                disabled={testing || !dbUrl}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-cyan-500/10 cursor-pointer disabled:opacity-50"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{testing ? 'กำลังทดสอบ...' : 'ทดสอบและบันทึก'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
