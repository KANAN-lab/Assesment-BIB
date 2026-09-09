import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import SearchableSelect, { SelectOption } from './ui/SearchableSelect';
import { useIdempotentSubmit } from '../hooks/useIdempotentSubmit';
import { X, Save, AlertTriangle, User, Loader2, Package, SearchCheck, CheckSquare, Settings2, Trash2, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import { HandoverManager } from '../lib/handoverService';
import { ShiftType, ConditionStatus, HandoverCategory, HandoverInput } from '../types/handover';
import { WorkerProfile } from '../types/assessment';
import { fetchAllWorkers } from '../lib/supabaseService';

let cachedHandoverWorkers: WorkerProfile[] = [];

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkerId: string;
  initialWorkers?: WorkerProfile[];
}

export function ShiftHandoverModal({ isOpen, onClose, currentWorkerId, initialWorkers }: ShiftHandoverModalProps) {
  const [shiftType, setShiftType] = useState<ShiftType>('Pagi');
  const [handoverCategory, setHandoverCategory] = useState<HandoverCategory>('MHE & Peralatan');
  const [conditionStatus, setConditionStatus] = useState<ConditionStatus>('Aman');
  const [notes, setNotes] = useState('');
  const [nextSupervisorId, setNextSupervisorId] = useState<string>('');
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const prevIsOpenRef = useRef(false);
  
  const [workers, setWorkers] = useState<WorkerProfile[]>(() => {
    if (initialWorkers && initialWorkers.length > 0) {
      return initialWorkers.filter(w => w.id !== currentWorkerId);
    }
    return cachedHandoverWorkers.filter(w => w.id !== currentWorkerId);
  });

  const { submit: idempSubmit, isSubmitting: loading, idempotencyError, clearIdempotencyError } = useIdempotentSubmit({
    workerId: currentWorkerId,
    formType: 'handover',
    getPayload: () => ({ shiftType, handoverCategory, conditionStatus, notes: notes.trim(), nextSupervisorId: nextSupervisorId || null }),
  });
  const [error, setError] = useState<string | null>(null);

  // Inisialisasi modal HANYA 1x saat bertransisi dari false -> true
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        notesRef.current?.focus();
      }, 50);

      // Inisialisasi daftar pekerja dari cache/initialWorkers terlebih dahulu
      if (initialWorkers && initialWorkers.length > 0) {
        cachedHandoverWorkers = initialWorkers;
        setWorkers(initialWorkers.filter(w => w.id !== currentWorkerId));
      } else if (cachedHandoverWorkers.length > 0) {
        setWorkers(cachedHandoverWorkers.filter(w => w.id !== currentWorkerId));
      } else {
        fetchAllWorkers().then(data => {
          cachedHandoverWorkers = data;
          setWorkers(data.filter(w => w.id !== currentWorkerId));
        }).catch(err => {
          console.error('Error fetching workers:', err);
        });
      }
      
      // Reset form ke default hanya saat baru dibuka
      setShiftType('Pagi');
      setHandoverCategory('MHE & Peralatan');
      setConditionStatus('Aman');
      setNotes('');
      setNextSupervisorId('');
      setError(null);

      prevIsOpenRef.current = true;
      return () => {
        clearTimeout(timer);
      };
    } else if (!isOpen && prevIsOpenRef.current) {
      document.body.style.overflow = 'unset';
      prevIsOpenRef.current = false;
    }
  }, [isOpen, currentWorkerId, initialWorkers]);

  // Listener tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Catatan handover tidak boleh kosong.');
      return;
    }

    clearIdempotencyError();
    setError(null);
    
    await idempSubmit(async () => {
      const { IdempotencyEngine } = await import('../domain/IdempotencyEngine');
      const idemp = IdempotencyEngine.generateKey(currentWorkerId, 'handover', {
        shiftType,
        handoverCategory,
        conditionStatus,
        notes: notes.trim(),
        nextSupervisorId: nextSupervisorId || null,
      });

      const input: HandoverInput = {
        shiftType,
        handoverCategory,
        conditionStatus,
        notes: notes.trim(),
        nextSupervisorId: nextSupervisorId || null
      };

      await HandoverManager.submitHandover(currentWorkerId, input, idemp);
      window.dispatchEvent(new CustomEvent('gappy_handover_submitted', { detail: { workerId: currentWorkerId } }));
      onClose();
    }).catch((err: any) => {
      setError(err.message || 'Gagal mengirim handover.');
    });
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-950 w-full sm:max-w-lg max-h-[88vh] sm:max-h-[90vh] m-auto rounded-3xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-base font-bold text-white">Log Serah Terima</h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-zinc-900 transition"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto">
          {idempotencyError && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{idempotencyError}</span>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <form id="handover-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Target Penerima (Opsional)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <SearchableSelect
                  value={nextSupervisorId}
                  onChange={setNextSupervisorId}
                  placeholder="-- Semua Tim / General --"
                  searchPlaceholder="Cari nama atau role..."
                  options={workers.map((w: WorkerProfile): SelectOption => ({
                    value: w.id,
                    label: w.name,
                    sublabel: w.role,
                  }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Tipe Shift</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Pagi', 'Siang', 'Malam'] as ShiftType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setShiftType(type)}
                    className={`py-3 rounded-xl text-sm font-bold border transition ${
                      shiftType === type 
                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Kategori Handover</label>
              <div className="grid grid-cols-2 gap-2">
                {(['MHE & Peralatan', 'Operasional & Target', 'Kebersihan & 5R', 'Administrasi & Dokumen', 'Infrastruktur Gudang', 'K3 & Insiden', 'Lainnya'] as HandoverCategory[]).map(cat => {
                  let Icon = Package;
                  if (cat === 'MHE & Peralatan') Icon = Settings2;
                  if (cat === 'Operasional & Target') Icon = SearchCheck;
                  if (cat === 'Kebersihan & 5R' || (cat as string) === 'Kebersihan & 5S') Icon = Sparkles;
                  if (cat === 'Administrasi & Dokumen') Icon = CheckSquare;
                  if (cat === 'Infrastruktur Gudang') Icon = Trash2;
                  if (cat === 'K3 & Insiden') Icon = ShieldAlert;
                  if (cat === 'Lainnya') Icon = HelpCircle;
                  
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setHandoverCategory(cat)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                        handoverCategory === cat 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Skala Prioritas / Status Kondisi</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Aman', 'Perlu Perhatian', 'Urgent'] as ConditionStatus[]).map(status => {
                  const isActive = conditionStatus === status;
                  let colors = 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800';
                  
                  if (isActive) {
                    if (status === 'Aman') colors = 'bg-emerald-600 border-emerald-500 text-white';
                    if (status === 'Perlu Perhatian') colors = 'bg-amber-600 border-amber-500 text-white';
                    if (status === 'Urgent') colors = 'bg-rose-600 border-rose-500 text-white';
                  }

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setConditionStatus(status)}
                      className={`py-3 rounded-xl text-xs sm:text-sm font-bold border transition ${colors}`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Catatan Serah Terima / Tugas Tertunda</label>
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan catatan penting, masalah peralatan, atau tugas yang belum selesai untuk shift selanjutnya..."
                className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                required
              />
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950">
          <button
            type="submit"
            form="handover-form"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Mengirim...' : 'Kirim Log Serah Terima'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
