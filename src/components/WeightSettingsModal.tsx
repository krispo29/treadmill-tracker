import React, { useState } from 'react';
import { X, Scale, Info, Check } from 'lucide-react';

interface WeightSettingsModalProps {
  isOpen: boolean;
  currentWeight: number;
  onSave: (weight: number) => void;
  onClose: () => void;
}

export const WeightSettingsModal: React.FC<WeightSettingsModalProps> = ({
  isOpen,
  currentWeight,
  onSave,
  onClose,
}) => {
  const [weight, setWeight] = useState(currentWeight);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (weight > 20 && weight < 250) {
      onSave(weight);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">ตั้งค่าน้ำหนักตัว (Body Weight)</h3>
            <p className="text-xs text-slate-400">สำหรับคำนวณแคลอรี่ตามหลัก ACSM</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              น้ำหนักของคุณ (กิโลกรัม)
            </label>
            <div className="relative">
              <input
                type="number"
                min="30"
                max="200"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-bold digital-number text-white focus:outline-none focus:border-cyan-500"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                กก. (kg)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              สูตร ACSM นำน้ำหนักตัว ความเร็ว และความชันระดับ 0-20 มาคำนวณการใช้ออกซิเจน ($VO_2$) ทำให้อัตราการเผาผลาญแม่นยำกว่าแอพทั่วไปที่คำนวณแบบคงที่
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 hover:opacity-90 flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>บันทึก</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
