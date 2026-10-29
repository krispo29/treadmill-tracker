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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#FFFDFB] border border-[#EDE6DC] rounded-3xl p-6 sm:p-7 shadow-cozy-lg relative text-[#2C2621]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8C827A] hover:text-[#2C2621] rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="p-3 rounded-2xl bg-[#EAF2EC] text-[#52796F]">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2C2621] flex items-center gap-2">
              <span>ตั้งค่า Neon PostgreSQL Database</span>
            </h2>
            <p className="text-xs text-[#8C827A]">
              บันทึกประวัติการวิ่งและสถิติทั้งหมดขึ้น Cloud ส่วนตัวของคุณฟรี
            </p>
          </div>
        </div>

        <form onSubmit={handleTestAndSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8C827A] block mb-2">
              Neon Connection String (URI)
            </label>
            <textarea
              rows={3}
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              placeholder="postgresql://neondb_owner:***@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
              className="w-full bg-[#FAF7F2] border border-[#EDE6DC] rounded-2xl px-4 py-2.5 text-xs font-mono text-[#2C2621] focus:outline-none focus:border-[#52796F] resize-none leading-relaxed"
              required
            />
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-[#EAF2EC] border-[#CDE0D3] text-[#3B664E]'
                  : 'bg-[#FDF0F0] border-[#F4CECE] text-[#B94A4A]'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-[#52796F] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#B94A4A] shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Instructions on how to get free Neon */}
          <div className="rounded-2xl bg-[#FAF7F2] p-4 border border-[#EDE6DC] text-xs text-[#5A5047] space-y-1.5">
            <span className="font-bold text-[#2C2621] flex items-center gap-1">
              <span>วิธีรับ Connection String ฟรีจาก Neon:</span>
            </span>
            <p>1. สมัครฟรีที่ <a href="https://neon.tech" target="_blank" rel="noreferrer" className="text-[#52796F] font-bold hover:underline inline-flex items-center gap-0.5">neon.tech <ExternalLink className="w-3 h-3" /></a></p>
            <p>2. สร้างโปรเจกต์ใหม่ (ใช้เวลาเพียง 10 วินาที)</p>
            <p>3. ในหน้า Dashboard คัดลอกช่อง <strong>Connection string</strong> นำมาวางที่นี่</p>
            <p className="text-[11px] text-[#8C827A]">
              * ตาราง <code>treadmill_workouts</code>, <code>treadmill_profiles</code>, <code>treadmill_goals</code>, <code>treadmill_programs</code> จะถูกสร้างและดูแลให้อัตโนมัติ
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-[#8C827A] hover:text-[#B94A4A] transition-colors cursor-pointer"
            >
              ล้างค่า
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-medium text-[#5A5047] hover:bg-[#FAF7F2] border border-[#EDE6DC] transition-colors cursor-pointer"
              >
                ปิด
              </button>

              <button
                type="submit"
                disabled={testing || !dbUrl}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#52796F] hover:bg-[#43675E] text-white flex items-center gap-1.5 shadow-cozy-sm cursor-pointer disabled:opacity-50"
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
