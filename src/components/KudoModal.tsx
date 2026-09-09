import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { KudoService, KudoQuotaInfo, KUDO_QUICK_TAGS } from '../lib/kudoService';
import { KudoCategory } from '../types/kudos';
import { SystemConfigService } from '../domain/SystemConfigService';
import { RoleEntity } from '../domain/RoleEntity';
import { X, Award, Search, Loader2, CheckCircle2, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

interface KudoWorkerItem {
  id: string;
  name: string;
  avatar: string;
  role?: string;
  division?: string;
}

interface KudoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkerId: string;
  initialWorkers?: KudoWorkerItem[];
}

let cachedActiveWorkers: KudoWorkerItem[] = [];

export function KudoModal({ isOpen, onClose, currentWorkerId, initialWorkers }: KudoModalProps) {
  const [workers, setWorkers] = useState<KudoWorkerItem[]>(() => {
    if (initialWorkers && initialWorkers.length > 0) {
      return initialWorkers.filter(w => w.id !== currentWorkerId && !RoleEntity.isSystemAdmin(w));
    }
    if (cachedActiveWorkers.length > 0) {
      return cachedActiveWorkers.filter(w => w.id !== currentWorkerId && !RoleEntity.isSystemAdmin(w));
    }
    return [];
  });
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<KudoCategory | ''>('');
  const [message, setMessage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const kudoCfg = SystemConfigService.getConfig();
  const receiverPts = kudoCfg.kudoReceivedPoints || 25;
  const senderBonus = kudoCfg.kudoSentPoints || 10;

  // Anti-Fraud Quota State
  const [quotaInfo, setQuotaInfo] = useState<KudoQuotaInfo | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);

  const categories: { label: KudoCategory; desc: string; icon: string; color: string }[] = [
    { label: 'Kerja Aman', desc: 'Bekerja sesuai SOP K3', icon: '🛡️', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 ring-emerald-500' },
    { label: 'Bantuan Hebat', desc: 'Membantu rekan kerja', icon: '🤝', color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 ring-indigo-500' },
    { label: 'Team Player', desc: 'Kolaborasi tim prima', icon: '👥', color: 'bg-sky-500/10 border-sky-500/20 text-sky-400 ring-sky-500' },
    { label: 'Inisiatif', desc: 'Ide & aksi proaktif', icon: '💡', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400 ring-amber-500' },
  ];

  const prevIsOpenRef = useRef(false);

  // Inisialisasi data HANYA saat modal pertama kali bertransisi dari closed ke open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      if (workers.length === 0) {
        fetchWorkers();
      } else {
        fetchWorkersQuietly();
      }
      fetchQuota();
      resetForm();

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else if (!isOpen && prevIsOpenRef.current) {
      document.body.style.overflow = 'unset';
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentWorkerId]);

  // Sinkronisasi data awal pekerja jika tersedia
  useEffect(() => {
    if (initialWorkers && initialWorkers.length > 0 && workers.length === 0) {
      const filtered = initialWorkers.filter(w => w.id !== currentWorkerId);
      cachedActiveWorkers = filtered;
      setWorkers(filtered);
    }
  }, [initialWorkers, currentWorkerId, workers.length]);

  // Keyboard Escape Handler terisolasi tanpa memicu reset form
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchQuota = async () => {
    setLoadingQuota(true);
    try {
      const q = await KudoService.getWeeklyQuotaInfo(currentWorkerId);
      setQuotaInfo(q);
    } catch {
      // ignore
    } finally {
      setLoadingQuota(false);
    }
  };

  const fetchWorkers = async () => {
    setLoadingWorkers(true);
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('id, name, avatar, role, division')
        .neq('id', currentWorkerId)
        .eq('status', 'active');
        
      if (!error && data) {
        const nonAdmin = (data as KudoWorkerItem[]).filter(w => !RoleEntity.isSystemAdmin(w));
        cachedActiveWorkers = nonAdmin;
        setWorkers(nonAdmin);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const fetchWorkersQuietly = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('id, name, avatar, role, division')
        .neq('id', currentWorkerId)
        .eq('status', 'active');
        
      if (!error && data) {
        const nonAdmin = (data as KudoWorkerItem[]).filter(w => !RoleEntity.isSystemAdmin(w));
        cachedActiveWorkers = nonAdmin;
        setWorkers(nonAdmin);
      }
    } catch {}
  };

  const resetForm = () => {
    setSelectedReceiverId('');
    setSelectedCategory('');
    setMessage('');
    setSearchQuery('');
    setSubmitError('');
    setSubmitSuccess(false);
  };

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedReceiverId || !selectedCategory) {
      setSubmitError('Pilih rekan kerja dan kategori kudo.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const result = await KudoService.sendKudo(
      currentWorkerId,
      selectedReceiverId,
      selectedCategory,
      message
    );

    setIsSubmitting(false);

    if (result.success) {
      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setSubmitError(result.message);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full sm:max-w-md max-h-[88vh] sm:max-h-[90vh] m-auto bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Kirim Kudo</h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {submitSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Kudo Terkirim!</h3>
              <p className="text-sm text-zinc-400">
                Apresiasi Anda berhasil dikirim! Rekan Anda mendapatkan +{receiverPts} PTS dan Anda mendapatkan bonus +{senderBonus} PTS.
              </p>
            </div>
          ) : (
            <>
              {/* Anti-Fraud Quota Banner */}
              <div className="p-3 bg-zinc-800/80 border border-zinc-700/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Sisa Kuota Mingguan
                  </span>
                  <span
                    className={`font-black px-2 py-0.5 rounded text-[11px] ${
                      (quotaInfo?.remainingQuota ?? 3) > 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {loadingQuota ? '...' : `${quotaInfo?.remainingQuota ?? 3} / 3 Kudo`}
                  </span>
                </div>
                {quotaInfo && quotaInfo.remainingQuota <= 0 ? (
                  <p className="text-[11px] text-rose-300 leading-relaxed bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    Batas Kuota Tercapai: Anda telah menggunakan 3 kudo minggu ini. Untuk menjaga integritas sistem penghargaan, kuota akan direset otomatis secara rolling 7 hari.
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-400">
                    Maksimal 3 kudo/minggu & anti-pingpong (1x per rekan setiap 7 hari).
                  </p>
                )}
              </div>

              {/* Step 1: Select Worker */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  1. Pilih Rekan Kerja
                </label>
                
                {selectedReceiverId ? (
                  <div className="flex items-center justify-between p-3 bg-zinc-800 border border-zinc-700 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-700 border-2 border-zinc-600">
                        <img 
                          src={workers.find(w => w.id === selectedReceiverId)?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedReceiverId}`} 
                          alt="avatar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {workers.find(w => w.id === selectedReceiverId)?.name}
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedReceiverId('')}
                      className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 rounded-md cursor-pointer"
                    >
                      Ganti
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="Cari nama pekerja..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-[16px] sm:text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>
                    
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1 snap-y">
                      {loadingWorkers ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                        </div>
                      ) : filteredWorkers.length > 0 ? (
                        filteredWorkers.map(w => {
                          const isAlreadySent = quotaInfo?.sentReceiverIds?.includes(w.id);
                          return (
                            <button
                              key={w.id}
                              type="button"
                              disabled={isAlreadySent || (quotaInfo?.remainingQuota ?? 3) <= 0}
                              onClick={() => setSelectedReceiverId(w.id)}
                              className={`w-full flex items-center justify-between p-2 rounded-lg transition snap-start min-h-[44px] ${
                                isAlreadySent || (quotaInfo?.remainingQuota ?? 3) <= 0
                                  ? 'opacity-50 cursor-not-allowed bg-zinc-900/40'
                                  : 'hover:bg-zinc-800 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <img 
                                  src={w.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.id}`} 
                                  alt={w.name}
                                  className="w-8 h-8 rounded-full bg-zinc-700"
                                />
                                <span className="text-sm font-semibold text-zinc-200">{w.name}</span>
                              </div>
                              {isAlreadySent && (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  Sudah dikirim minggu ini
                                </span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-xs text-zinc-500">
                          Tidak ada pekerja ditemukan
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Select Category */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  2. Pilih Kategori
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map(cat => {
                    const isSelected = selectedCategory === cat.label;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setSelectedCategory(cat.label)}
                        className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border min-h-[44px] transition cursor-pointer ${
                          isSelected 
                            ? `${cat.color} ring-1 ring-inset` 
                            : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-300'
                        }`}
                      >
                        <span className="text-2xl mb-1">{cat.icon}</span>
                        <span className="text-xs font-bold">{cat.label}</span>
                        <span className="text-[10px] text-center opacity-70 mt-1 hidden sm:block">{cat.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Step 3: Message */}
              <div className="space-y-3 pb-24 sm:pb-0">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    3. Pesan (Opsional)
                  </label>
                  <span className={`text-[10px] ${message.length > 150 ? 'text-rose-400 font-bold' : 'text-zinc-500'}`}>
                    {message.length}/150
                  </span>
                </div>

                {/* Quick-Tag Lapangan Presets */}
                {selectedCategory && KUDO_QUICK_TAGS[selectedCategory] && (
                  <div className="p-2.5 bg-zinc-850/80 rounded-xl border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Preset Cepat Lapangan (Klik untuk isi otomatis):
                      </span>
                      {message && (
                        <button
                          type="button"
                          onClick={() => setMessage('')}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                        >
                          Bersihkan
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {KUDO_QUICK_TAGS[selectedCategory].map((tag, idx) => {
                        const isAdded = message.includes(tag);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setMessage(prev => {
                                if (!prev) return tag;
                                if (prev.includes(tag)) {
                                  // remove tag if already there
                                  const cleaned = prev.replace(new RegExp(`(,\\s*)?${tag}(,\\s*)?`), ', ').trim();
                                  return cleaned.replace(/^,\s*|,\s*$/g, '');
                                }
                                const combined = `${prev.trim()}, ${tag}`;
                                return combined.length <= 150 ? combined : combined.slice(0, 150);
                              });
                            }}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 active:scale-95 ${
                              isAdded
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-zinc-800 border-zinc-700/80 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-zinc-600'
                            }`}
                          >
                            <span>{isAdded ? '✓' : '+'}</span>
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <textarea 
                  value={message}
                  maxLength={150}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tulis ucapan terima kasih atau klik preset cepat di atas..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-[16px] sm:text-sm px-3 py-2.5 h-20 resize-none focus:outline-none focus:border-emerald-500/60"
                />
                
                {submitError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                    {submitError}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions (Sticky on Mobile) */}
        {!submitSuccess && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-900 absolute sm:relative bottom-0 left-0 right-0 z-10 shrink-0">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedReceiverId || !selectedCategory || (quotaInfo?.remainingQuota ?? 3) <= 0}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-3.5 sm:py-2.5 rounded-xl transition flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (quotaInfo?.remainingQuota ?? 3) <= 0 ? (
                <span>Kuota Mingguan Habis (3/3)</span>
              ) : (
                <span>Kirim Apresiasi (+{receiverPts} PTS)</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
