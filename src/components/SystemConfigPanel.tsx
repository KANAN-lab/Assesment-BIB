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
  BookOpen,
  FileText,
  Tag,
  Plus,
  X,
  HardHat,
  Cloud,
  ExternalLink,
  Folder
} from 'lucide-react';
import {
  SystemConfigService,
  SystemConfig,
  FREQUENCY_OPTIONS,
  DocumentType,
  DEFAULT_TIER_CONFIGS,
} from '../domain/SystemConfigService';
import type { TierConfig } from '../types/assessment';
import { SwalService } from '../domain/SwalService';

interface SystemConfigPanelProps {
  onToast?: (message: string) => void;
}

export const SystemConfigPanel: React.FC<SystemConfigPanelProps> = ({ onToast }) => {
  const [config, setConfig] = useState<SystemConfig>(() => SystemConfigService.getConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Local Category Inputs
  const [newRewardCat, setNewRewardCat] = useState('');
  const [newQuizCat, setNewQuizCat] = useState('');
  const [newPpeCatIcon, setNewPpeCatIcon] = useState('🛡️');
  const [newPpeCatLabel, setNewPpeCatLabel] = useState('');

  // Local Tier Inputs
  const [newTierName, setNewTierName] = useState('');
  const [newTierMinPoints, setNewTierMinPoints] = useState<number>(0);
  const [newTierIcon, setNewTierIcon] = useState('🎖️');
  const [newTierColor, setNewTierColor] = useState('#38bdf8');
  const [activeIconPickerTierId, setActiveIconPickerTierId] = useState<string | null>(null);
  const [showNewTierIconPicker, setShowNewTierIconPicker] = useState<boolean>(false);

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

  const handleAddRewardCategory = () => {
    const trimmed = newRewardCat.trim();
    if (!trimmed) return;
    if (config.rewardCategories.includes(trimmed)) {
      if (onToast) onToast('Kategori reward tersebut sudah ada.');
      return;
    }
    const updated = [...config.rewardCategories, trimmed];
    handleChange('rewardCategories', updated);
    setNewRewardCat('');
  };

  const handleRemoveRewardCategory = (cat: string) => {
    const updated = config.rewardCategories.filter((c) => c !== cat);
    handleChange('rewardCategories', updated);
  };

  const handleAddQuizCategory = () => {
    const trimmed = newQuizCat.trim();
    if (!trimmed) return;
    if (config.quizCategories.includes(trimmed)) {
      if (onToast) onToast('Kategori bank soal tersebut sudah ada.');
      return;
    }
    const updated = [...config.quizCategories, trimmed];
    handleChange('quizCategories', updated);
    setNewQuizCat('');
  };

  const handleRemoveQuizCategory = (cat: string) => {
    const updated = config.quizCategories.filter((c) => c !== cat);
    handleChange('quizCategories', updated);
  };

  const handleAddPpeCategory = () => {
    const trimmed = newPpeCatLabel.trim();
    if (!trimmed) return;
    const catId = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (config.ppeCategories.some((c) => c.id === catId)) {
      if (onToast) onToast('Kategori APD tersebut sudah ada.');
      return;
    }
    const newCat = { id: catId, label: trimmed, icon: newPpeCatIcon || '🛡️' };
    const updated = [...config.ppeCategories, newCat];
    handleChange('ppeCategories', updated);
    setNewPpeCatLabel('');
  };

  const handleRemovePpeCategory = (id: string) => {
    const updated = config.ppeCategories.filter((c) => c.id !== id);
    handleChange('ppeCategories', updated);
  };

  // ─── Tier Management Handlers ───
  const handleTierChange = (id: string, field: keyof TierConfig, val: any) => {
    const currentTiers = config.tierConfigs && config.tierConfigs.length > 0
      ? config.tierConfigs
      : DEFAULT_TIER_CONFIGS;
    const updated = currentTiers.map((t) => {
      if (t.id === id) {
        const item = { ...t, [field]: val };
        if (field === 'badgeColor') {
          item.badgeBg = `${val}14`;
          item.badgeBorder = `${val}33`;
        }
        return item;
      }
      return t;
    });
    handleChange('tierConfigs', updated);
  };

  const handleAddTier = () => {
    const trimmed = newTierName.trim();
    if (!trimmed) {
      if (onToast) onToast('Nama tier tidak boleh kosong.');
      return;
    }
    const currentTiers = config.tierConfigs && config.tierConfigs.length > 0
      ? config.tierConfigs
      : DEFAULT_TIER_CONFIGS;

    if (currentTiers.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      if (onToast) onToast('Tier dengan nama tersebut sudah terdaftar.');
      return;
    }

    const nextLevel = currentTiers.length > 0 ? Math.max(...currentTiers.map((t) => t.level)) + 1 : 1;
    const newTier: TierConfig = {
      id: `tier-${Date.now()}`,
      name: trimmed,
      minPoints: Math.max(0, Number(newTierMinPoints) || 0),
      level: nextLevel,
      badgeColor: newTierColor,
      badgeBg: `${newTierColor}14`,
      badgeBorder: `${newTierColor}33`,
      icon: newTierIcon || '🎖️',
    };

    const updated = [...currentTiers, newTier].sort((a, b) => a.level - b.level);
    handleChange('tierConfigs', updated);
    setNewTierName('');
    setNewTierMinPoints(0);
    if (onToast) onToast(`Tier "${trimmed}" berhasil ditambahkan.`);
  };

  const handleRemoveTier = (id: string) => {
    const currentTiers = config.tierConfigs && config.tierConfigs.length > 0
      ? config.tierConfigs
      : DEFAULT_TIER_CONFIGS;

    if (currentTiers.length <= 1) {
      if (onToast) onToast('Minimal harus ada 1 tier aktif di sistem.');
      return;
    }

    const target = currentTiers.find((t) => t.id === id);
    const updated = currentTiers.filter((t) => t.id !== id);
    handleChange('tierConfigs', updated);
    if (onToast) onToast(`Tier "${target?.name || id}" berhasil dihapus.`);
  };

  const handleResetTiers = async () => {
    const isConfirmed = await SwalService.confirm({
      title: 'Reset Konfigurasi Tier?',
      text: 'Kembalikan konfigurasi tier ke standar default (Novice, Pro, Elite, Legendary)? Perubahan kustom Anda pada tier akan digantikan.',
      confirmButtonText: 'Ya, Reset Tier',
      isDestructive: false,
    });
    if (isConfirmed) {
      handleChange('tierConfigs', DEFAULT_TIER_CONFIGS);
      if (onToast) onToast('Tier berhasil dikembalikan ke standar default.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    SystemConfigService.updateConfig(config);
    setSavedSuccess(true);
    if (onToast) onToast('Konfigurasi tata kelola poin sistem berhasil disimpan!');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = async () => {
    const isConfirmed = await SwalService.confirm({
      title: 'Reset Semua Konfigurasi?',
      text: 'Kembalikan seluruh nilai poin dan aturan tata kelola sistem ke nilai standar default pabrik?',
      confirmButtonText: 'Ya, Reset Semuanya',
      isDestructive: true,
    });
    if (isConfirmed) {
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

            <div className="col-span-2">
              <label className="block text-[11px] text-zinc-400 mb-1">Resolusi Temuan Gemba Safety Patrol (PIC)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={config.safetyPatrolResolvedPoints}
                  onChange={(e) => handleChange('safetyPatrolResolvedPoints', Number(e.target.value))}
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

      {/* ─── 9. FORMAT PENOMORAN DOKUMEN RESMI (CONFIGURABLE DOCUMENT NUMBERING) ─── */}
      <div className="bg-zinc-900/60 p-4 rounded-2xl border border-indigo-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-white">
              9. Format Penomoran Dokumen Resmi (Masking & Template)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
            Teraplikasi di Form Cetak, BAP, SP & PDF
          </span>
        </div>

        <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
          <div className="font-bold text-zinc-300 flex items-center gap-1.5">
            <span>ℹ️ Token variabel dinamis yang didukung:</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
            <span className="bg-zinc-800 text-indigo-300 px-2 py-0.5 rounded">{'{YEAR}'} = 2026</span>
            <span className="bg-zinc-800 text-indigo-300 px-2 py-0.5 rounded">{'{MONTH}'} = 09</span>
            <span className="bg-zinc-800 text-indigo-300 px-2 py-0.5 rounded">{'{DAY}'} = 03</span>
            <span className="bg-zinc-800 text-indigo-300 px-2 py-0.5 rounded">{'{RANDOM}'} = 4-digit acak</span>
            <span className="bg-zinc-800 text-indigo-300 px-2 py-0.5 rounded">{'{ID}'} = 6-karakter ID</span>
            <span className="bg-zinc-800 text-indigo-300 px-2 py-0.5 rounded">{'{CODE}'} = Kode Modul/Divisi</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Matriks Kompetensi */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300">
              Evaluasi Kinerja & Matriks Kompetensi
            </label>
            <input
              type="text"
              value={config.docNumberTemplateCompetencyMatrix}
              onChange={(e) => handleChange('docNumberTemplateCompetencyMatrix', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="text-[10px] text-zinc-500">
              Pratinjau: <span className="font-mono text-indigo-300">{SystemConfigService.generateDocumentNumber('competency_matrix')}</span>
            </div>
          </div>

          {/* 2. Insiden & BAP K3 */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300">
              Laporan Insiden K3 & Berita Acara (BAP)
            </label>
            <input
              type="text"
              value={config.docNumberTemplateK3Incident}
              onChange={(e) => handleChange('docNumberTemplateK3Incident', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="text-[10px] text-zinc-500">
              Pratinjau: <span className="font-mono text-amber-300">{SystemConfigService.generateDocumentNumber('k3_incident')}</span>
            </div>
          </div>

          {/* 3. Lisensi SIO MHE */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300">
              Audit Kepatuhan Lisensi SIO Alat Berat (MHE)
            </label>
            <input
              type="text"
              value={config.docNumberTemplateMheSio}
              onChange={(e) => handleChange('docNumberTemplateMheSio', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="text-[10px] text-zinc-500">
              Pratinjau: <span className="font-mono text-cyan-300">{SystemConfigService.generateDocumentNumber('mhe_sio')}</span>
            </div>
          </div>

          {/* 4. Inventaris & APD */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300">
              Inventaris & Siklus Hidup APD
            </label>
            <input
              type="text"
              value={config.docNumberTemplatePpeInventory}
              onChange={(e) => handleChange('docNumberTemplatePpeInventory', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="text-[10px] text-zinc-500">
              Pratinjau: <span className="font-mono text-emerald-300">{SystemConfigService.generateDocumentNumber('ppe_inventory')}</span>
            </div>
          </div>

          {/* 5. Anggaran & Reward */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300">
              Laporan Anggaran & Penukaran Reward
            </label>
            <input
              type="text"
              value={config.docNumberTemplateRewardBudget}
              onChange={(e) => handleChange('docNumberTemplateRewardBudget', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="text-[10px] text-zinc-500">
              Pratinjau: <span className="font-mono text-purple-300">{SystemConfigService.generateDocumentNumber('reward_budget')}</span>
            </div>
          </div>

          {/* 6. Berita Acara Audit 5R */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300">
              Berita Acara & Sertifikasi Audit 5R
            </label>
            <input
              type="text"
              value={config.docNumberTemplateAudit5s}
              onChange={(e) => handleChange('docNumberTemplateAudit5s', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="text-[10px] text-zinc-500">
              Pratinjau: <span className="font-mono text-teal-300">{SystemConfigService.generateDocumentNumber('audit_5s')}</span>
            </div>
          </div>

          {/* 7. Surat Peringatan K3 */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300">
              Surat Peringatan & Konseling K3 (SP)
            </label>
            <input
              type="text"
              value={config.docNumberTemplateDisciplinary}
              onChange={(e) => handleChange('docNumberTemplateDisciplinary', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="text-[10px] text-zinc-500">
              Pratinjau: <span className="font-mono text-rose-300">{SystemConfigService.generateDocumentNumber('disciplinary')}</span>
            </div>
          </div>

          {/* 8. Gemba Walk & Safety Patrol */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300">
              BAP Temuan Gemba Walk & Safety Patrol
            </label>
            <input
              type="text"
              value={config.docNumberTemplateSafetyPatrol}
              onChange={(e) => handleChange('docNumberTemplateSafetyPatrol', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="text-[10px] text-zinc-500">
              Pratinjau: <span className="font-mono text-slate-300">{SystemConfigService.generateDocumentNumber('safety_patrol')}</span>
            </div>
          </div>

          {/* 9. Standar Operasional Prosedur (SOP) */}
          <div className="space-y-1 md:col-span-2">
            <label className="block text-[11px] font-bold text-zinc-300">
              Dokumen SOP Resmi & Cheatsheet Lapangan
            </label>
            <input
              type="text"
              value={config.docNumberTemplateSop}
              onChange={(e) => handleChange('docNumberTemplateSop', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="text-[10px] text-zinc-500">
              Pratinjau: <span className="font-mono text-violet-300">{SystemConfigService.generateDocumentNumber('sop', { code: 'MHE-01' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 10. PENGELOLAAN KATEGORI MASTER DINAMIS (REWARD, BANK SOAL, APD) ─── */}
      <div className="bg-zinc-900/60 p-4 rounded-2xl border border-emerald-500/30 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white">
              10. Master Kategori Dinamis (Reward, Bank Soal & APD)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            Dapat Ditambah & Dikelola Penuh oleh Administrator
          </span>
        </div>

        {/* 10.1 Kategori Reward */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-zinc-300">
            Kategori Item Reward & Hadiah Penukaran Poin ({config.rewardCategories.length})
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 min-h-[48px] items-center">
            {config.rewardCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30"
              >
                <span>{cat}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRewardCategory(cat)}
                  className="hover:text-rose-400 text-zinc-500 transition"
                  title={`Hapus kategori ${cat}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newRewardCat}
              onChange={(e) => setNewRewardCat(e.target.value)}
              placeholder="Ketik kategori reward baru..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={handleAddRewardCategory}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori</span>
            </button>
          </div>
        </div>

        {/* 10.2 Kategori Bank Soal Quiz */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-zinc-300">
            Kategori Bank Soal Kuis Operasional ({config.quizCategories.length})
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 min-h-[48px] items-center">
            {config.quizCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30"
              >
                <span>{cat}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveQuizCategory(cat)}
                  className="hover:text-rose-400 text-zinc-500 transition"
                  title={`Hapus kategori ${cat}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newQuizCat}
              onChange={(e) => setNewQuizCat(e.target.value)}
              placeholder="Ketik kategori bank soal baru..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddQuizCategory}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori</span>
            </button>
          </div>
        </div>

        {/* 10.3 Kategori APD & Safety Gear */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-zinc-300">
            Kategori Inventaris Alat Pelindung Diri (APD) ({config.ppeCategories.length})
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 min-h-[48px] items-center">
            {config.ppeCategories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30"
              >
                <span>{cat.icon} {cat.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemovePpeCategory(cat.id)}
                  className="hover:text-rose-400 text-zinc-500 transition"
                  title={`Hapus kategori ${cat.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPpeCatIcon}
              onChange={(e) => setNewPpeCatIcon(e.target.value)}
              placeholder="Icon"
              className="w-14 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-center text-xs text-white focus:outline-none"
            />
            <input
              type="text"
              value={newPpeCatLabel}
              onChange={(e) => setNewPpeCatLabel(e.target.value)}
              placeholder="Ketik nama kategori APD baru..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddPpeCategory}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori APD</span>
            </button>
          </div>
        </div>

        {/* 10.4 Master Tier Pekerja & Ambang Batas Poin */}
        <div className="space-y-3 pt-3 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold text-zinc-200">
                Master Tier Pekerja & Ambang Batas Poin ({(config.tierConfigs || DEFAULT_TIER_CONFIGS).length} Tier)
              </label>
              <p className="text-[11px] text-zinc-400">
                Pekerja otomatis naik tier saat akumulasi total poin mencapai atau melebihi ambang batas minimal.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetTiers}
              className="text-[10px] text-zinc-400 hover:text-amber-300 transition underline flex items-center gap-1 self-start sm:self-auto"
            >
              Reset ke 4 Tier Default
            </button>
          </div>

          {/* List Tier Cards / Rows */}
          <div className="space-y-2">
            {(config.tierConfigs || DEFAULT_TIER_CONFIGS).map((tier, idx) => (
              <div
                key={tier.id || idx}
                className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 hover:border-zinc-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Visual Preview & Level */}
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="w-6 text-center text-xs font-mono font-bold text-zinc-500">
                    L{tier.level}
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold"
                    style={{
                      color: tier.badgeColor,
                      backgroundColor: tier.badgeBg || `${tier.badgeColor}14`,
                      border: `1px solid ${tier.badgeBorder || `${tier.badgeColor}33`}`,
                    }}
                  >
                    <span>{tier.icon}</span>
                    <span>{tier.name}</span>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="flex flex-wrap items-center gap-2 flex-1 sm:justify-end">
                  {/* Interactive Icon Picker */}
                  <div className="relative flex items-center gap-1">
                    <span className="text-[10px] text-zinc-400">Icon:</span>
                    <button
                      type="button"
                      onClick={() => setActiveIconPickerTierId(activeIconPickerTierId === tier.id ? null : tier.id)}
                      className="w-9 h-8 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-lg flex items-center justify-center text-base transition shadow-sm"
                      title="Klik untuk memilih icon"
                    >
                      {tier.icon}
                    </button>
                    {activeIconPickerTierId === tier.id && (
                      <div
                        className="absolute top-10 right-0 sm:left-0 z-50 p-2.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-60 animate-in fade-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800 text-[10px] text-zinc-400 font-bold">
                          <span>Pilih Icon Tier:</span>
                          <button
                            type="button"
                            onClick={() => setActiveIconPickerTierId(null)}
                            className="text-zinc-500 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1">
                          {['🔰', '🛡️', '💎', '👑', '⚡', '🏆', '⭐', '🔥', '🎯', '🥇', '🌟', '🎖️', '🏅', '🚀', '🦁', '💪', '✨', '📦', '🚜', '⚙️'].map((ic) => (
                            <button
                              key={ic}
                              type="button"
                              onClick={() => {
                                handleTierChange(tier.id, 'icon', ic);
                                setActiveIconPickerTierId(null);
                              }}
                              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${
                                tier.icon === ic ? 'bg-indigo-500/20 ring-1 ring-indigo-500 scale-105' : 'bg-zinc-800 hover:bg-zinc-700'
                              }`}
                            >
                              {ic}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-500">Custom:</span>
                          <input
                            type="text"
                            value={tier.icon}
                            onChange={(e) => handleTierChange(tier.id, 'icon', e.target.value)}
                            placeholder="Emoji..."
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-400">Nama:</span>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => handleTierChange(tier.id, 'name', e.target.value)}
                      className="w-36 sm:w-44 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-400">Min:</span>
                    <input
                      type="number"
                      min={0}
                      value={tier.minPoints}
                      onChange={(e) => handleTierChange(tier.id, 'minPoints', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-mono text-amber-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-zinc-500">PTS</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-400">Warna:</span>
                    <input
                      type="color"
                      value={tier.badgeColor}
                      onChange={(e) => handleTierChange(tier.id, 'badgeColor', e.target.value)}
                      className="w-7 h-7 rounded border border-zinc-800 bg-zinc-900 cursor-pointer p-0.5"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveTier(tier.id)}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition"
                    title={`Hapus tier ${tier.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Form Tambah Tier Baru */}
          <div className="p-3 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 shrink-0">Tambah Tier Baru:</span>

            {/* Icon Picker for New Tier */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNewTierIconPicker(!showNewTierIconPicker)}
                className="w-10 h-8 bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-lg flex items-center justify-center text-lg transition shadow-sm"
                title="Pilih Icon Tier Baru"
              >
                {newTierIcon}
              </button>
              {showNewTierIconPicker && (
                <div
                  className="absolute bottom-11 left-0 z-50 p-2.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-60 animate-in fade-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800 text-[10px] text-zinc-400 font-bold">
                    <span>Pilih Icon Tier Baru:</span>
                    <button
                      type="button"
                      onClick={() => setShowNewTierIconPicker(false)}
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1">
                    {['🔰', '🛡️', '💎', '👑', '⚡', '🏆', '⭐', '🔥', '🎯', '🥇', '🌟', '🎖️', '🏅', '🚀', '🦁', '💪', '✨', '📦', '🚜', '⚙️'].map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => {
                          setNewTierIcon(ic);
                          setShowNewTierIconPicker(false);
                        }}
                        className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${
                          newTierIcon === ic ? 'bg-indigo-500/20 ring-1 ring-indigo-500 scale-105' : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <input
              type="text"
              value={newTierName}
              onChange={(e) => setNewTierName(e.target.value)}
              placeholder="Nama tier baru..."
              className="flex-1 min-w-[140px] bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-400">Min:</span>
              <input
                type="number"
                min={0}
                value={newTierMinPoints}
                onChange={(e) => setNewTierMinPoints(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono text-amber-400 focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500">PTS</span>
            </div>
            <input
              type="color"
              value={newTierColor}
              onChange={(e) => setNewTierColor(e.target.value)}
              className="w-8 h-8 rounded border border-zinc-800 bg-zinc-900 cursor-pointer p-0.5 shrink-0"
              title="Pilih warna tema tier"
            />
            <button
              type="button"
              onClick={handleAddTier}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tier</span>
            </button>
          </div>
        </div>
      </div>

      {/* 11. Cloud Storage & Google Drive Gateway Integration */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">
              11. Cloud Storage & Google Drive Gateway Integration
            </h3>
          </div>
          {config.gdriveTargetFolderId && (
            <a
              href={`https://drive.google.com/drive/folders/${config.gdriveTargetFolderId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-bold transition"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Buka Root Drive</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Seluruh berkas unggahan pekerja & administrator (Insiden K3, Patroli, Foto Profil, SIO, Kaizen, SOP) otomatis tersimpan ke folder Google Drive resmi dengan struktur subfolder per user <code className="text-sky-300 font-mono text-[11px]">[NIP] Nama/Kategori</code>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Google Drive Root Folder ID
            </label>
            <input
              type="text"
              value={config.gdriveTargetFolderId || ''}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, gdriveTargetFolderId: e.target.value.trim() }))
              }
              placeholder="Contoh: 16p6cnEb7o6zOF2jFcPm3z7Md-Utntrkr"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 font-mono"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              ID Folder Google Drive yang menjadi wadah penampung berkas utama.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Google Apps Script WebApp Webhook URL
            </label>
            <input
              type="url"
              value={config.gdriveWebhookUrl || ''}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, gdriveWebhookUrl: e.target.value.trim() }))
              }
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 font-mono"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              URL Webhook deployment Google Apps Script (Assesment-DAM Gateway).
            </p>
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
