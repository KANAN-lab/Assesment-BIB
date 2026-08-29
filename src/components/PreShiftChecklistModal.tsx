import React, { useState } from 'react';
import { X, ShieldCheck, Sparkles } from 'lucide-react';

interface PreShiftChecklistModalProps {
  onClose: () => void;
  onCompleteChecklist: () => void;
}

export const PreShiftChecklistModal: React.FC<PreShiftChecklistModalProps> = ({
  onClose,
  onCompleteChecklist
}) => {
  const [items, setItems] = useState([
    { id: 1, text: 'Penggunaan Helm Safety / Topi Kurir & Sepatu Safety lengkap', checked: false },
    { id: 2, text: 'Pemeriksaan alur ban, kecukupan angin, & daya cengkeram rem armada', checked: false },
    { id: 3, text: 'Lampu utama, lampu sein, & klakson berfungsi normal', checked: false },
    { id: 4, text: 'Kompartemen kargo bersih & bebas dari cairan bocor / benda tajam', checked: false },
    { id: 5, text: 'Aplikasi GPS & Sistem Scanning POD siap digunakan', checked: false },
  ]);

  const toggleCheck = (id: number) => {
    setItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const allChecked = items.every(item => item.checked);

  const handleSubmit = () => {
    if (!allChecked) return;
    onCompleteChecklist();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in">
      <div className="card-elevated w-full max-w-md p-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Pre-Shift Safety Checklist</h3>
            <p className="text-xs text-zinc-400">Verifikasi Kesiapan Operasional Harian</p>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {items.map((item) => (
            <label
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-3 transition ${
                item.checked
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 font-medium'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => {}}
                className="mt-0.5 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="leading-relaxed">{item.text}</span>
            </label>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allChecked}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Kirim Checklist & Tambah Streak</span>
        </button>

      </div>
    </div>
  );
};
