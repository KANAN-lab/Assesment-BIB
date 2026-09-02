import React, { useState, useEffect } from 'react';
import {
  Settings,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Zap,
  HelpCircle,
  ShieldCheck,
  Lightbulb,
  Heart,
  Award,
  Truck,
  ShieldAlert,
  Clock,
  Save,
  Search,
  BookOpen
} from 'lucide-react';
import {
  SystemConfigService,
  SystemConfig,
  FREQUENCY_OPTIONS,
} from '../domain/SystemConfigService';

interface SystemConfigPanelProps {
  onToast?: (message: string) => void;
}

export const SystemConfigPanel: React.FC<SystemConfigPanelProps> = ({ onToast }) => {
  const [config, setConfig] = useState<SystemConfig>(() => SystemConfigService.getConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setConfig(e.detail);
    };
    window.addEventListener('gappy_config_updated', handleUpdate);
    return () => window.removeEventListener('gappy_config_updated', handleUpdate);
  }, []);

  const handleChange = (field: keyof SystemConfig, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    SystemConfigService.updateConfig(config);
    setSavedSuccess(true);
    if (onToast) onToast('Konfigurasi tata kelola poin sistem berhasil disimpan!');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (confirm('Kembalikan semua nilai poin dan aturan sistem ke nilai standar default?')) {
      const def = SystemConfigService.resetToDefaults();
      setConfig(def);
      if (onToast) onToast('Konfigurasi sistem berhasil di-reset ke nilai default!');
    }
  };

  return (
    <form onSubmit={handleSave} className="card p-6 space-y-6 bg-zinc-950 border-purple-500/20 shadow-xl animate-fade-in">
      {/* ─── HEADER BANNER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Manajemen Poin Dinamis & Aturan Sistem (System Config)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Atur seluruh nominal reward poin aktivitas, penalti K3, dan kebijakan cooldown audit tanpa hardcode
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Kembalikan ke Nilai Standar Default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-purple-950"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-400 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Pengaturan poin dinamis telah berhasil disimpan dan disinkronkan ke seluruh sistem!</span>
        </div>
      )}

      {/* ─── 1. AUDIT FREQUENCY POLICY ─── */}
      <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-bold text-white">1. Kebijakan Frekuensi Penilaian Audit Supervisor</h4>
          </div>
          <span className="text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded">
            {config.auditFrequencyLabel}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400">
          Menentukan batas cooldown interval waktu audit berkala pekerja oleh Supervisor lapangan.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {FREQUENCY_OPTIONS.map((opt) => {
            const isSelected = config.auditFrequencyDays === opt.days;
            return (
              <button
                key={opt.days}
                type="button"
                onClick={() => handleChange('auditFrequencyDays', opt.days)}
                className={`p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-purple-600/20 border-purple-500 text-white font-bold ring-1 ring-purple-500/30'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── GRID: DYNAMIC POINTS CONFIGURATION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 2. Kuis Harian, Pre-Shift & SOP */}
        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Zap className="w-4 h-4" />
            <span>2. Kuis Harian, Pre-Shift & SOP Micro-Deck</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Kuis Harian Selesai</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.dailyQuizRewardPoints}
                  onChange={(e) => handleChange('dailyQuizRewardPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono font-bold">PTS</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Bonus Skor 100% Kuis</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.perfectQuizBonusPoints}
                  onChange={(e) => handleChange('perfectQuizBonusPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono font-bold">PTS</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Inspeksi Pre-Shift K3</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.preShiftRewardPoints}
                  onChange={(e) => handleChange('preShiftRewardPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono font-bold">PTS</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Default Selesai SOP</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.sopCompletionDefaultPoints}
                  onChange={(e) => handleChange('sopCompletionDefaultPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono font-bold">PTS</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Pelaporan Insiden & K3 */}
        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <span>3. Pelaporan Insiden K3 & Near-Miss</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Lapor Insiden Valid (Approved)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.incidentValidRewardPoints}
                  onChange={(e) => handleChange('incidentValidRewardPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono font-bold">PTS</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Laporan Near-Miss / Nyaris Celaka</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.nearMissRewardPoints}
                  onChange={(e) => handleChange('nearMissRewardPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono font-bold">PTS</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Inovasi Kaizen */}
        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
            <Lightbulb className="w-4 h-4" />
            <span>4. Inovasi Kaizen & Continuous Improvement</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Submit Ide Baru</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.kaizenSubmissionPoints}
                  onChange={(e) => handleChange('kaizenSubmissionPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-mono">PTS</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Approval Kaizen</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.kaizenApprovedPoints}
                  onChange={(e) => handleChange('kaizenApprovedPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-mono">PTS</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Terimplementasi</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.kaizenImplementedPoints}
                  onChange={(e) => handleChange('kaizenImplementedPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-mono">PTS</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Apresiasi Rekan (Kudo) & SIO MHE */}
        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-pink-400">
            <Heart className="w-4 h-4" />
            <span>5. Apresiasi Rekan (Kudo) & Lisensi SIO MHE</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Kirim Kudo</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.kudoSentPoints}
                  onChange={(e) => handleChange('kudoSentPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-pink-400 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Terima Kudo</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.kudoReceivedPoints}
                  onChange={(e) => handleChange('kudoReceivedPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-pink-400 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Daftar SIO</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.sioRegisteredRewardPoints}
                  onChange={(e) => handleChange('sioRegisteredRewardPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Perpanjang SIO</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.sioRenewedRewardPoints}
                  onChange={(e) => handleChange('sioRenewedRewardPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 6. Audit Standar 5R Wilayah Gudang */}
        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
            <Award className="w-4 h-4" />
            <span>6. Insentif Audit 5R / 5S Wilayah Gudang (PIC Reward)</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Predikat Gold (&ge; 90%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.audit5sGoldRewardPoints}
                  onChange={(e) => handleChange('audit5sGoldRewardPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-mono">PTS</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Predikat Silver (&ge; 80%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.audit5sSilverRewardPoints}
                  onChange={(e) => handleChange('audit5sSilverRewardPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-zinc-300 focus:outline-none focus:border-zinc-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-mono">PTS</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Predikat Bronze (&ge; 70%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.audit5sBronzeRewardPoints}
                  onChange={(e) => handleChange('audit5sBronzeRewardPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-orange-400 focus:outline-none focus:border-orange-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-mono">PTS</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Penalti Disiplin K3 */}
        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
            <ShieldAlert className="w-4 h-4" />
            <span>7. Skema Penalti Pengurangan Poin Disiplin K3</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Pembinaan Lisan</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.verbalCoachingPenaltyPoints}
                  onChange={(e) => handleChange('verbalCoachingPenaltyPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-mono">PTS</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Surat Peringatan 1 (SP1)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.warningLetter1PenaltyPoints}
                  onChange={(e) => handleChange('warningLetter1PenaltyPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-mono">PTS</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Surat Peringatan 2 (SP2)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.warningLetter2PenaltyPoints}
                  onChange={(e) => handleChange('warningLetter2PenaltyPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-mono">PTS</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Surat Peringatan 3 (SP3)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.warningLetter3PenaltyPoints}
                  onChange={(e) => handleChange('warningLetter3PenaltyPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-mono">PTS</span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] text-zinc-400 mb-1">Skorsing Operasional</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.suspensionPenaltyPoints}
                  onChange={(e) => handleChange('suspensionPenaltyPoints', Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-red-500 focus:outline-none focus:border-rose-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-mono">PTS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-zinc-800">
        <button
          type="submit"
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-950 transition flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Seluruh Pengaturan Tata Kelola Sistem</span>
        </button>
      </div>
    </form>
  );
};
