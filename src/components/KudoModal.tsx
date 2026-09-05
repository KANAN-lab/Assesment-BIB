import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { KudoService } from '../lib/kudoService';
import { KudoCategory } from '../types/kudos';
import { X, Award, Search, Loader2, CheckCircle2 } from 'lucide-react';

interface KudoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkerId: string;
}

export function KudoModal({ isOpen, onClose, currentWorkerId }: KudoModalProps) {
  const [workers, setWorkers] = useState<{ id: string; name: string; avatar: string }[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<KudoCategory | ''>('');
  const [message, setMessage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const categories: { label: KudoCategory; desc: string; icon: string; color: string }[] = [
    { label: 'Kerja Aman', desc: 'Bekerja sesuai SOP K3', icon: '🛡️', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 ring-emerald-500' },
    { label: 'Bantuan Hebat', desc: 'Membantu rekan kerja', icon: '🤝', color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 ring-indigo-500' },
    { label: 'Team Player', desc: 'Kolaborasi tim prima', icon: '👥', color: 'bg-sky-500/10 border-sky-500/20 text-sky-400 ring-sky-500' },
    { label: 'Inisiatif', desc: 'Ide & aksi proaktif', icon: '💡', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400 ring-amber-500' },
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      fetchWorkers();
      resetForm();

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  const fetchWorkers = async () => {
    setLoadingWorkers(true);
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('id, name, avatar')
        .neq('id', currentWorkerId)
        .eq('status', 'active');
        
      if (!error && data) {
        setWorkers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWorkers(false);
    }
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
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition"
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
                Apresiasi Anda berhasil dikirim dan rekan Anda mendapatkan +10 PTS.
              </p>
            </div>
          ) : (
            <>
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
                      onClick={() => setSelectedReceiverId('')}
                      className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 rounded-md"
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
                        filteredWorkers.map(w => (
                          <button
                            key={w.id}
                            onClick={() => setSelectedReceiverId(w.id)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg transition snap-start min-h-[44px]"
                          >
                            <img 
                              src={w.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.id}`} 
                              alt={w.name}
                              className="w-8 h-8 rounded-full bg-zinc-700"
                            />
                            <span className="text-sm font-semibold text-zinc-200">{w.name}</span>
                          </button>
                        ))
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
                        onClick={() => setSelectedCategory(cat.label)}
                        className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border min-h-[44px] transition ${
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
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  3. Pesan (Opsional)
                </label>
                <textarea 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tulis ucapan terima kasih singkat..."
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
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedReceiverId || !selectedCategory}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-3.5 sm:py-2.5 rounded-xl transition flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <span>Kirim Apresiasi (+10 PTS)</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
