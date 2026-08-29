import React, { useState } from 'react';
import { AlertTriangle, MapPin, FileText, Clock, ShieldAlert, Loader2, CheckCircle2, X, Upload, ExternalLink, Image as ImageIcon, Sparkles, FolderUp, Check } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import type { IncidentReport } from '../types/assessment';
import { createIncidentReport } from '../lib/supabaseService';
import { uploadFileToGoogleDrive, GDRIVE_TARGET_FOLDER_ID, GDRIVE_FOLDER_URL } from '../lib/googleDriveService';

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
  const [incidentType, setIncidentType] = useState<IncidentReport['incidentType']>('near_miss');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentReport['severity']>('low');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
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
    if (!location.trim() || !description.trim()) {
      setError('Lokasi dan deskripsi wajib diisi.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let photoUrlData: string | undefined = undefined;

      // 1. Programmatic Automatic Upload directly to Google Drive Server
      if (photoFile) {
        setUploadStep('Mengunggah berkas terkompresi otomatis ke Google Drive...');
        const formattedDate = new Date().toISOString().slice(0, 10);
        const cleanWorkerName = workerName.replace(/[^a-zA-Z0-9]/g, '_');
        const gdriveFilename = `Bukti_K3_Insiden_${cleanWorkerName}_${formattedDate}.jpg`;

        const gdriveRes = await uploadFileToGoogleDrive(photoFile, gdriveFilename, GDRIVE_TARGET_FOLDER_ID);
        if (gdriveRes.webViewLink) {
          setGdriveFileUrl(gdriveRes.webViewLink);
        }
      }

      setUploadStep('Menyimpan laporan insiden ke Supabase Database...');

      if (photoFile && photoPreview) {
        photoUrlData = photoPreview;
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
      });

      setDone(true);
      setTimeout(() => onSuccess(report), 2500);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim laporan insiden.');
    } finally {
      setLoading(false);
      setUploadStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md animate-fade-in">
      <div className="card-elevated w-full max-w-lg p-6 border-orange-500/20 relative space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="text-sm font-black text-white">Laporan Insiden K3</h2>
              <p className="text-[10px] text-zinc-400">Dilaporkan oleh: <strong className="text-white">{workerName}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            <p className="text-sm font-bold text-emerald-300">Laporan Insiden K3 Berhasil Dikirim!</p>

            <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl space-y-2.5 text-xs text-left w-full max-w-md">
              <div className="font-bold text-white flex items-center gap-1.5 text-emerald-400">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                Upload Otomatis Ke Google Drive Berhasil!
              </div>

              <div className="space-y-1.5 text-zinc-300 text-[11px]">
                <div className="flex justify-between items-center bg-zinc-950 p-2 rounded border border-zinc-800">
                  <span className="text-zinc-400">Status Google Drive:</span>
                  <span className="text-emerald-400 font-bold font-mono">✅ TERKIRIM OTOMATIS</span>
                </div>
                {compressionRatio && (
                  <div className="flex justify-between items-center bg-zinc-950 p-2 rounded border border-zinc-800">
                    <span className="text-zinc-400">Kompresi HD Library:</span>
                    <span className="text-emerald-300 font-semibold">{compressionRatio}</span>
                  </div>
                )}
              </div>

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
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Jenis Insiden */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                <AlertTriangle className="w-3 h-3 inline mr-1 text-orange-400" />
                Jenis Insiden K3
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value as IncidentReport['incidentType'])}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-semibold"
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Tingkat Keparahan</label>
              <div className="grid grid-cols-4 gap-2">
                {SEVERITY_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeverity(s.value)}
                    className={`py-1.5 rounded-xl border text-[11px] font-bold transition ${
                      severity === s.value ? s.color : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lokasi & Waktu (2 Kolom) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1 text-zinc-400" />
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
                  <Clock className="w-3 h-3 inline mr-1 text-zinc-400" />
                  Waktu Kejadian
                </label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                <FileText className="w-3 h-3 inline mr-1 text-zinc-400" />
                Deskripsi Kejadian
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Jelaskan kronologi singkat, penyebab, dan dampaknya..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
              />
            </div>

            {/* Upload Bukti Foto & Automatic GDrive Server Integration */}
            <div className="space-y-2 border border-zinc-800/80 bg-zinc-950/60 p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Upload Bukti Foto (Library Compression)
                </label>
                <span className="text-[9px] font-mono text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                  Auto GDrive Sync
                </span>
              </div>

              {/* File Input & Compression Drop Area */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  id="incident-photo-upload"
                />
                <label
                  htmlFor="incident-photo-upload"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/50 hover:bg-zinc-900 p-3.5 rounded-xl cursor-pointer transition text-center group"
                >
                  {compressing ? (
                    <div className="flex flex-col items-center gap-1.5 text-xs text-emerald-400 py-1">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                      <span className="font-bold">Mengompresi Foto (Library browser-image-compression)...</span>
                      <span className="text-[10px] text-zinc-500">Mempertahankan Resolusi 2560px & Kualitas Tajam 90% HD</span>
                    </div>
                  ) : photoPreview ? (
                    <div className="flex items-center gap-3 w-full">
                      <img src={photoPreview} alt="Bukti Insiden" className="w-14 h-14 object-cover rounded-lg border border-zinc-700 shrink-0" />
                      <div className="text-left flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{photoFile?.name}</div>
                        {compressionRatio && (
                          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                            <Sparkles className="w-3 h-3 shrink-0" /> Tersimpan: {compressionRatio}
                          </div>
                        )}
                        <span className="inline-block mt-1 text-[9px] text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded font-bold">
                          Klik untuk ganti foto
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition" />
                      <span className="text-xs font-bold text-zinc-300">Pilih Foto Bukti Kejadian</span>
                      <span className="text-[10px] text-zinc-500">Dikompresi via library & di-upload otomatis ke Google Drive</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Direct GDrive Link */}
              <div className="flex items-center justify-end pt-1 text-[10px] text-zinc-400">
                <a
                  href={GDRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 transition underline"
                  title="Buka Folder Google Drive Target"
                >
                  <ExternalLink className="w-3 h-3" />
                  Buka Folder Google Drive
                </a>
              </div>
            </div>

            {uploadStep && (
              <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-950/60 border border-purple-500/30 rounded-xl px-3 py-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                <span>{uploadStep}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || compressing}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-orange-950"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
              {loading ? 'Mengunggah Berkas Otomatis ke Google Drive...' : 'Kirim Laporan Insiden K3'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
