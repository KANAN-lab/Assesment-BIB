import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, User, Loader2, Package, SearchCheck, CheckSquare, Settings2, Trash2, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import { HandoverManager } from '../lib/handoverService';
import { ShiftType, ConditionStatus, HandoverCategory, HandoverInput } from '../types/handover';
import { WorkerProfile } from '../types/assessment';
import { fetchAllWorkers } from '../lib/supabaseService';

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkerId: string;
}

export function ShiftHandoverModal({ isOpen, onClose, currentWorkerId }: ShiftHandoverModalProps) {
  const [shiftType, setShiftType] = useState<ShiftType>('Pagi');
  const [handoverCategory, setHandoverCategory] = useState<HandoverCategory>('MHE & Peralatan');
  const [conditionStatus, setConditionStatus] = useState<ConditionStatus>('Aman');
  const [notes, setNotes] = useState('');
  const [nextSupervisorId, setNextSupervisorId] = useState<string>('');
  
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAllWorkers().then(data => {
        // Exclude current worker from the list
        setWorkers(data.filter(w => w.id !== currentWorkerId));
      }).catch(err => {
        console.error('Error fetching workers:', err);
      });
      
      // Reset form
      setShiftType('Pagi');
      setHandoverCategory('MHE & Peralatan');
      setConditionStatus('Aman');
      setNotes('');
      setNextSupervisorId('');
      setError(null);
    }
  }, [isOpen, currentWorkerId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Catatan handover tidak boleh kosong.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const input: HandoverInput = {
        shiftType,
        handoverCategory,
        conditionStatus,
        notes: notes.trim(),
        nextSupervisorId: nextSupervisorId || null
      };

      await HandoverManager.submitHandover(currentWorkerId, input);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim handover.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div 
        className="bg-zinc-950 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
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
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-zinc-900 transition"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto">
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
                <select
                  value={nextSupervisorId}
                  onChange={(e) => setNextSupervisorId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none"
                >
                  <option value="">-- Semua Tim / General --</option>
                  {workers.map((w: WorkerProfile) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                  ))}
                </select>
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
    </div>
  );
}
