import React, { useState } from 'react';
import { useIdempotentSubmit } from '../hooks/useIdempotentSubmit';
import { createPortal } from 'react-dom';
import {
  ShieldAlert, Camera, X, AlertTriangle, CheckCircle2, User,
  MapPin, Calendar, Upload, Loader2, Sparkles, UserX, AlertOctagon
} from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import {
  FindingType,
  PatrolSeverity,
  WAREHOUSE_PATROL_ZONES,
  SafetyPatrolRecord,
  SEVERITY_CONFIG,
  FINDING_TYPE_CONFIG
} from '../types/safetyPatrol';
import { SafetyPatrolService } from '../domain/SafetyPatrolService';
import { uploadFileToGoogleDrive } from '../lib/googleDriveService';

interface SafetyPatrolModalProps {
  workers: WorkerProfile[];
  currentSupervisorName?: string;
  currentSupervisorId?: string;
  onClose: () => void;
  onSuccess: (record: SafetyPatrolRecord) => void;
}

export const SafetyPatrolModal: React.FC<SafetyPatrolModalProps> = ({
  workers,
  currentSupervisorName = 'Supervisor Logistik',
  currentSupervisorId = 'sup-default',
  onClose,
  onSuccess,
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState(WAREHOUSE_PATROL_ZONES[0].id);
  const [findingType, setFindingType] = useState<FindingType>('Unsafe Condition');
  const [severity, setSeverity] = useState<PatrolSeverity>('Medium');
  const [description, setDescription] = useState('');
  const [assignedPicId, setAssignedPicId] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const { submit: idempSubmit, isSubmitting: submitting, idempotencyError, clearIdempotencyError } = useIdempotentSubmit({
    workerId: currentSupervisorId,
    formType: 'patrol',
    getPayload: () => ({ selectedZoneId, findingType, severity, description: description.trim(), assignedPicId }),
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedZone = WAREHOUSE_PATROL_ZONES.find((z) => z.id === selectedZoneId) || WAREHOUSE_PATROL_ZONES[0];

  // Handle Photo input (File or Camera)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran foto terlalu besar (maks 5MB).');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Deskripsi observasi temuan harus diisi.');
      return;
    }

    const assignedWorker = workers.find((w) => w.id === assignedPicId || w.employeeId === assignedPicId);

    clearIdempotencyError();
    setErrorMsg(null);

    await idempSubmit(async () => {
      const { IdempotencyEngine } = await import('../domain/IdempotencyEngine');
      const idemp = IdempotencyEngine.generateKey(currentSupervisorId, 'patrol', {
        selectedZoneId,
        findingType,
        severity,
        description: description.trim(),
        assignedPicId,
      });

      let finalPhotoUrl: string | null = null;

      // Unggah foto temuan patroli K3 ke Google Drive folder user/supervisor
      if (photoFile) {
        const uploadRes = await uploadFileToGoogleDrive(photoFile, {
          workerId: currentSupervisorId,
          workerName: currentSupervisorName,
          moduleCategory: 'Safety_Patrol',
        });
        if (uploadRes.directUrl || uploadRes.webViewLink) {
          finalPhotoUrl = uploadRes.directUrl || uploadRes.webViewLink || null;
        }
      }

      const record = await SafetyPatrolService.createPatrolRecord({
        supervisorId: currentSupervisorId,
        supervisorName: currentSupervisorName,
        patrolDate: new Date().toISOString(),
        zoneId: selectedZone.id,
        zoneName: selectedZone.name,
        findingType,
        severity,
        description: description.trim(),
        photoUrl: finalPhotoUrl,
        assignedPicId: assignedWorker?.id || null,
        assignedPicName: assignedWorker?.name || null,
        status: findingType === 'Good Practice' ? 'Resolved' : 'Open',
        dueDate: findingType === 'Good Practice' ? null : dueDate,
        resolutionNotes: findingType === 'Good Practice' ? 'Praktik positif langsung dicatat & diapresiasi.' : null,
        resolvedAt: findingType === 'Good Practice' ? new Date().toISOString() : null,
        pointsAwarded: findingType === 'Good Practice',
      }, idemp);

      onSuccess(record);
      onClose();
    }).catch((err: any) => {
      setErrorMsg(err.message || 'Gagal menyimpan temuan patroli.');
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] m-auto card-elevated p-6 space-y-4 border border-orange-500/40 overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Inspeksi Cepat Gemba Walk & Safety Patrol</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">
                  K3 TOUR
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pencatatan langsung temuan bahaya/praktik positif di lapangan gudang (PT. DAYA ANUGRAH MULYA)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {idempotencyError && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{idempotencyError}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
            <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Tipe Temuan (Unsafe Act / Unsafe Condition / Good Practice) */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">1. Kategori Temuan Gemba Walk *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['Unsafe Condition', 'Unsafe Act', 'Good Practice'] as FindingType[]).map((type) => {
                const isSelected = findingType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFindingType(type)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 ${
                      isSelected
                        ? type === 'Good Practice'
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                          : type === 'Unsafe Act'
                          ? 'bg-rose-600/20 border-rose-500 text-rose-300 ring-1 ring-rose-500/40'
                          : 'bg-amber-600/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {type === 'Good Practice' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : type === 'Unsafe Act' ? (
                      <UserX className="w-4 h-4 shrink-0 text-rose-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    )}
                    <span className="truncate">{type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Zona Gudang & Tingkat Keparahan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">2. Area / Zona Gudang *</label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                {WAREHOUSE_PATROL_ZONES.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    [{zone.division}] {zone.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-500 mt-1">{selectedZone.description}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">3. Tingkat Keparahan (Severity) *</label>
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                {(['Low', 'Medium', 'High', 'Critical'] as PatrolSeverity[]).map((sev) => {
                  const isSel = severity === sev;
                  const cfg = SEVERITY_CONFIG[sev];
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition text-center ${
                        isSel
                          ? `${cfg.badgeClass} ring-1 ring-white/20`
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'
                      }`}
                    >
                      {sev}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Deskripsi Temuan Observasi */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">4. Deskripsi Observasi Temuan *</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Terlihat ceceran oli di depan pintu charging baterai #2, belum dipasang absorben dan cone tanda bahaya slip..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
              required
            />
          </div>

          {/* 4. Upload / Jepret Foto Bukti Lapangan */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              5. Lampiran Foto Bukti Temuan (Kamera / Galeri)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-bold text-zinc-300 transition flex items-center gap-2">
                <Camera className="w-4 h-4 text-orange-400" />
                <span>Ambil / Unggah Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>

              {photoPreview && (
                <div className="flex items-center gap-2">
                  <img
                    src={photoPreview}
                    alt="Pratinjau Temuan"
                    className="w-10 h-10 rounded-lg object-cover border border-zinc-700 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 5. PIC Tindak Lanjut & Target Selesai (Bila bukan Good Practice) */}
          {findingType !== 'Good Practice' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-800">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  6. Tugaskan PIC Tindak Lanjut
                </label>
                <select
                  value={assignedPicId}
                  onChange={(e) => setAssignedPicId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">-- Pilih Staf Operasional / PIC --</option>
                  {workers
                    .filter((w) => w.role !== 'System Administrator')
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.role} - {w.division})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  7. Batas Waktu Tindakan (Due Date)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-orange-950/50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Simpan Temuan Gemba Walk</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
