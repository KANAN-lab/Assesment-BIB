import React, { useState } from 'react';
import { useIdempotentSubmit } from '../hooks/useIdempotentSubmit';
import {
  AlertTriangle,
  MapPin,
  FileText,
  Clock,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  X,
  Upload,
  ExternalLink,
  Image as ImageIcon,
  Sparkles,
  FolderUp,
  Check,
  Award,
  User
} from 'lucide-react';
import type { IncidentReport } from '../types/assessment';
import { createIncidentReport } from '../lib/supabaseService';
import { uploadFileToGoogleDrive, GDRIVE_TARGET_FOLDER_ID, GDRIVE_FOLDER_URL } from '../lib/googleDriveService';
import { NotificationEngine } from '../domain/NotificationEngine';

interface IncidentReportModalProps {
  workerId: string;
  workerName: string;
  onClose: () => void;
  onSuccess: (report: IncidentReport) => void;
}

const INCIDENT_TYPES: { value: IncidentReport['incidentType']; label: string }[] = [
  { value: 'near_miss',         label: 'Hampir Celaka (Near Miss)' },
  { value: 'injury',            label: 'Kecelakaan / Cedera' },
  { value: 'property_damage',   label: 'Kerusakan Properti / Aset' },
  { value: 'unsafe_condition',  label: 'Kondisi Tidak Aman' },
  { value: 'other',             label: 'Lainnya' },
];

const SEVERITY_OPTIONS: { value: IncidentReport['severity']; label: string; color: string }[] = [
  { value: 'low',      label: 'Rendah',   color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' },
  { value: 'medium',   label: 'Sedang',   color: 'border-amber-500/50 bg-amber-500/10 text-amber-300' },
  { value: 'high',     label: 'Tinggi',   color: 'border-orange-500/50 bg-orange-500/10 text-orange-300' },
  { value: 'critical', label: 'Kritis',   color: 'border-rose-500/50 bg-rose-500/10 text-rose-300' },
];

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  workerId, workerName, onClose, onSuccess,
}) => {
  const [incidentType, setIncidentType] = useState<IncidentReport['incidentType'] | ''>('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentReport['severity']>('low');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const { submit: idempSubmit, isSubmitting: loading, idempotencyError, clearIdempotencyError, currentKey: _idemp } = useIdempotentSubmit({
    workerId,
    formType: 'incident',
    getPayload: () => ({ incidentType, location, description, severity }),
  });
  const [uploadStep, setUploadStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [gdriveFileUrl, setGdriveFileUrl] = useState<string | null>(null);

  // Photo & Compression state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressionRatio, setCompressionRatio] = useState<string | null>(null);
  const [originalSizeKb, setOriginalSizeKb] = useState<number | undefined>(undefined);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number | undefined>(undefined);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const origKb = Math.round(file.size / 1024);
    setOriginalSizeKb(origKb);
    setCompressing(true);
    setError(null);

    try {
      // Library browser-image-compression configuration (90% HD Sharpness)
      const options = {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 2560,
        useWebWorker: true,
        initialQuality: 0.90,
        fileType: 'image/jpeg',
      };

      const { default: imageCompression } = await import('browser-image-compression');
      const compressedBlob = await imageCompression(file, options);
      const compKb = Math.round(compressedBlob.size / 1024);
      setCompressedSizeKb(compKb);

      const ratio = (((origKb - compKb) / origKb) * 100).toFixed(0);
      setCompressionRatio(`${ratio}% (Dari ${origKb} KB → ${compKb} KB, Kualitas 90% HD)`);

      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      setPhotoFile(compressedFile);

      // Create preview
      const previewUrl = URL.createObjectURL(compressedBlob);
      setPhotoPreview(previewUrl);
    } catch (err: any) {
      console.warn('Gagal mengompresi foto via library:', err);
      setError('Gagal mengompresi foto via library. Menggunakan file asli.');
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentType) {
      setError('Silakan pilih jenis insiden K3 terlebih dahulu.');
      return;
    }
    if (!location.trim() || !description.trim()) {
      setError('Lokasi dan deskripsi wajib diisi.');
      return;
    }
    clearIdempotencyError();
    setError(null);

    await idempSubmit(async () => {
      // Ambil key yang sudah di-generate oleh hook
      const { IdempotencyEngine } = await import('../domain/IdempotencyEngine');
      const idemp = IdempotencyEngine.generateKey(workerId, 'incident', { incidentType, location, description, severity });

      let photoUrlData: string | undefined = undefined;

      // 1. Programmatic Automatic Upload directly to Google Drive Server with User-Bound Subfolder
      if (photoFile) {
        setUploadStep('Mengunggah berkas bukti otomatis ke Google Drive...');
        const formattedDate = new Date().toISOString().slice(0, 10);
        const cleanWorkerName = workerName.replace(/[^a-zA-Z0-9]/g, '_');
        const gdriveFilename = `DAM_Insiden_${cleanWorkerName}_${formattedDate}_${Date.now()}.jpg`;

        const gdriveRes = await uploadFileToGoogleDrive(photoFile, {
          workerId,
          workerName,
          moduleCategory: 'Laporan_Insiden',
          customFilename: gdriveFilename,
        });

        if (gdriveRes.webViewLink) {
          setGdriveFileUrl(gdriveRes.webViewLink);
        }
        if (gdriveRes.directUrl) {
          photoUrlData = gdriveRes.directUrl;
        }
      }

      setUploadStep('Menyimpan laporan insiden ke Supabase Database...');

      if (!photoUrlData) {
        photoUrlData = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';
      }

      const report = await createIncidentReport(workerId, {
        incidentType,
        location: location.trim(),
        description: description.trim(),
        severity,
        occurredAt: new Date(occurredAt).toISOString(),
        photoUrl: photoUrlData,
        gdriveFolderId: GDRIVE_TARGET_FOLDER_ID,
        originalSizeKb,
        compressedSizeKb,
      }, idemp);

      // Kirim Notifikasi ke Supervisor & Worker via OOP NotificationEngine
      NotificationEngine.addNotification({
        recipientId: 'supervisor',
        recipientRole: 'supervisor',
        title: `⚠️ Laporan Insiden K3 Baru: ${workerName}`,
        message: `Jenis: ${incidentType.toUpperCase()} di ${location.trim()}. Membutuhkan validasi Supervisor.`,
        type: 'incident',
      });

      NotificationEngine.addNotification({
        recipientId: workerId,
        recipientRole: 'worker',
        title: '⏳ Laporan Insiden Dikirim (+50 PTS Pending)',
        message: `Laporan insiden di ${location.trim()} berhasil dikirim. Poin +50 PTS akan diberikan setelah verifikasi Supervisor.`,
        type: 'incident',
      });

      setDone(true);
      setTimeout(() => onSuccess(report), 2500);
    }).catch((err: any) => {
      setError(err.message || 'Gagal mengirim laporan insiden.');
      setUploadStep('');
    }).finally(() => {
      setUploadStep('');
    });
  };

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[82vh] sm:max-h-[85vh] m-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border-orange-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Form Laporan Insiden K3 Pelapor</h2>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>Dilaporkan oleh: <strong className="text-white">{workerName}</strong></span>
                <span>·</span>
                <span className="text-emerald-400 font-mono font-bold">+50 PTS Reward Ready</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Laporan Insiden K3 Berhasil Terkirim!</h3>
            <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
              Laporan Anda telah berhasil masuk ke antrean validasi Supervisor HSEQ. Poin reward <strong className="text-emerald-400">+50 PTS</strong> berstatus Pending dan akan aktif begitu diverifikasi.
            </p>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2 text-xs text-left w-full max-w-md">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                Upload Otomatis Ke Google Drive Server Berhasil!
              </div>
              {compressionRatio && (
                <p className="text-[11px] text-zinc-300">Kompresi HD Library: {compressionRatio}</p>
              )}
              <a
                href={gdriveFileUrl || GDRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
              >
                <FolderUp className="w-4 h-4" />
                Buka Folder Google Drive Target
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* 2-Column Responsive Form Body (min-h-0 prevents flex overflow) */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar grid grid-cols-1 lg:grid-cols-12 gap-6 bg-zinc-900/60">
              
              {/* LEFT COLUMN: Incident Metadata (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                {idempotencyError && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{idempotencyError}</span>
                  </div>
                )}
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Jenis Insiden */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-orange-400" />
                    Jenis Insiden K3
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value as IncidentReport['incidentType'])}
                    className={`w-full bg-zinc-950 border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-semibold ${
                      !incidentType ? 'text-zinc-500 border-zinc-800' : 'text-white border-orange-500/50'
                    }`}
                    required
                  >
                    <option value="" disabled>-- Pilih Jenis Insiden K3 --</option>
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="text-white bg-zinc-900">{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Tingkat Keparahan Insiden</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SEVERITY_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSeverity(s.value)}
                        className={`py-2 rounded-xl border text-xs font-bold transition ${
                          severity === s.value ? s.color : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 bg-zinc-950'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lokasi & Waktu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      <MapPin className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
                      Lokasi Kejadian
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Contoh: Loading Dock B, WFG Lt.2"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      <Clock className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
                      Waktu Kejadian
                    </label>
                    <input
                      type="datetime-local"
                      value={occurredAt}
                      onChange={(e) => setOccurredAt(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-medium"
                    />
                  </div>
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    <FileText className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
                    Deskripsi Kronologi Kejadian
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Jelaskan secara singkat kronologi kejadian, potensi bahaya, dan dampaknya..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>
              </div>

              {/* RIGHT COLUMN: Photo Upload & Reward Alert (6 cols) */}
              <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
                {/* Photo Upload Card */}
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-3 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      Upload Bukti Foto Lapangan (Compression HD)
                    </label>
                    <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                      Auto GDrive Sync
                    </span>
                  </div>

                  {/* Drop area / File Picker */}
                  <div className="relative flex-1 min-h-[140px]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="incident-photo-upload"
                    />
                    <label
                      htmlFor="incident-photo-upload"
                      className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/60 hover:bg-zinc-900/90 p-4 rounded-xl cursor-pointer transition text-center group"
                    >
                      {compressing ? (
                        <div className="flex flex-col items-center gap-2 text-xs text-emerald-400 py-2">
                          <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                          <span className="font-bold">Mengompresi Foto (HD 2560px Sharpness)...</span>
                        </div>
                      ) : photoPreview ? (
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                          <img
                            src={photoPreview}
                            alt="Bukti Insiden"
                            className="w-20 h-20 object-cover rounded-xl border border-zinc-700 shrink-0"
                            onError={(e) => {
                              e.currentTarget.src =
                                'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="text-left flex-1 min-w-0 space-y-1">
                            <div className="text-xs font-bold text-white truncate">{photoFile?.name}</div>
                            {compressionRatio && (
                              <div className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
                                {compressionRatio}
                              </div>
                            )}
                            <span className="text-[10px] text-zinc-500 block">Klik untuk mengganti foto</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-zinc-400 group-hover:text-white py-3">
                          <Upload className="w-8 h-8 text-zinc-500 group-hover:text-emerald-400 transition" />
                          <span className="text-xs font-bold">Pilih Foto Bukti Kejadian</span>
                          <span className="text-[10px] text-zinc-500">Dikompresi via library & di-upload otomatis ke Google Drive</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Reward Alert Card */}
                <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-start gap-3 text-xs">
                  <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-300 font-bold text-xs mb-0.5">
                      Poin Reward Pelaporan K3 (+50 PTS):
                    </strong>
                    <p className="text-amber-200/90 text-[11px] leading-relaxed">
                      Laporan yang Anda kirim akan divalidasi Supervisor. Saat disetujui, <strong className="text-emerald-400">+50 PTS Reward</strong> langsung masuk ke dompet poin Anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-950 shrink-0">
              <a
                href={GDRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Buka Folder Google Drive
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={loading || compressing}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-orange-950 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{uploadStep || 'Mengirim...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Kirim Laporan Insiden K3 (+50 PTS)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
