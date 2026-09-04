import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Truck, Sparkles, UploadCloud, Loader2, ScanLine,
  AlertTriangle, CheckCircle2, FileText, Info, Check
} from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { SioAiService, ExtractedSioData } from '../lib/sioAiService';
import { LicenseService } from '../lib/licenseService';
import { uploadFileToGoogleDrive } from '../lib/googleDriveService';
import { SwalService } from '../domain/SwalService';
import { SystemConfigService } from '../domain/SystemConfigService';
import { LicenseType, MheLicenseEntity } from '../types/license';

interface WorkerSioUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerProfile;
  onSuccess?: (license: MheLicenseEntity) => void;
}

export const WorkerSioUploadModal: React.FC<WorkerSioUploadModalProps> = ({
  isOpen,
  onClose,
  worker,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('Menyiapkan dokumen...');
  const [scanError, setScanError] = useState<string | null>(null);
  const [extractedMeta, setExtractedMeta] = useState<ExtractedSioData | null>(null);

  // Form Fields
  const [formLicenseType, setFormLicenseType] = useState<LicenseType>('SIO Forklift (Kelas II)');
  const [formLicenseNumber, setFormLicenseNumber] = useState('');
  const [formAuthority, setFormAuthority] = useState('Kementerian Ketenagakerjaan RI');
  const [formIssuedDate, setFormIssuedDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Menyimpan...');

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    e.target.value = '';

    try {
      setIsScanning(true);
      setScanError(null);

      // Create preview object URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Extract SIO using AI Vision
      setScanStatus('Mengompresi dokumen HD & menginisialisasi AI...');
      const extracted = await SioAiService.extractSioFromImage(file, [worker], (status) => {
        setScanStatus(status);
      });

      setExtractedMeta(extracted);

      // Pre-fill form fields
      if (extracted.licenseNumber) {
        setFormLicenseNumber(extracted.licenseNumber);
      }
      if (extracted.licenseType) {
        setFormLicenseType(extracted.licenseType);
      }
      if (extracted.issuingAuthority) {
        setFormAuthority(extracted.issuingAuthority);
      }
      if (extracted.issuedDate) {
        setFormIssuedDate(extracted.issuedDate);
      }
      if (extracted.expiryDate) {
        setFormExpiryDate(extracted.expiryDate);
      }
      if (extracted.notes) {
        setFormNotes(extracted.notes);
      }
    } catch (err: any) {
      console.error('[WorkerSioUpload] Scan Error:', err);
      setScanError(err?.message || 'Gagal membaca berkas SIO dengan AI Vision. Pastikan berkas jelas dan terbaca.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formLicenseNumber.trim() || !formIssuedDate || !formExpiryDate) {
      SwalService.warning(
        'Data Belum Lengkap',
        'Mohon lengkapi Nomor SIO, Tanggal Diterbitkan, dan Tanggal Kedaluwarsa lisensi.'
      );
      return;
    }

    if (new Date(formIssuedDate) > new Date(formExpiryDate)) {
      SwalService.warning(
        'Tanggal Tidak Valid',
        'Tanggal kedaluwarsa tidak boleh lebih lampau daripada tanggal diterbitkan.'
      );
      return;
    }

    setIsSaving(true);
    setSaveStatus('Mengunggah berkas ke Google Drive...');
    let gdriveDocumentUrl: string | undefined = undefined;

    // Upload to Google Drive if file exists
    if (uploadedFile) {
      try {
        const fileExt = uploadedFile.name.split('.').pop() || (uploadedFile.type === 'application/pdf' ? 'pdf' : 'jpg');
        const uploadRes = await uploadFileToGoogleDrive(uploadedFile, {
          workerId: worker.id,
          workerName: worker.name,
          moduleCategory: 'SIO_MHE',
          customFilename: `SIO_${formLicenseNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`,
        });
        if (uploadRes.directUrl || uploadRes.webViewLink) {
          gdriveDocumentUrl = uploadRes.directUrl || uploadRes.webViewLink;
        }
      } catch (uploadErr) {
        console.warn('[WorkerSioUpload] Gagal unggah ke Drive:', uploadErr);
      }
    }

    try {
      setSaveStatus('Sinkronisasi lisensi ke database K3 & klaim reward...');
      const rewardPts = SystemConfigService.getConfig().sioRegisteredRewardPoints || 100;

      // Check existing license to decide add or update
      const existingLicense = LicenseService.getLicenseByWorkerId(worker.id) || LicenseService.getLicenseByWorkerId(worker.employeeId);

      let savedLicense: MheLicenseEntity;
      if (existingLicense) {
        savedLicense = LicenseService.updateLicense(existingLicense.id, {
          licenseType: formLicenseType,
          licenseNumber: formLicenseNumber.trim().toUpperCase(),
          issuingAuthority: formAuthority.trim(),
          issuedDate: formIssuedDate,
          expiryDate: formExpiryDate,
          notes: formNotes.trim() || 'Diunggah mandiri oleh operator via AI Vision',
          documentUrl: gdriveDocumentUrl || existingLicense.documentUrl,
        }) || existingLicense;
      } else {
        savedLicense = LicenseService.addLicense({
          workerId: worker.id,
          workerName: worker.name,
          employeeId: worker.employeeId,
          division: worker.division,
          licenseType: formLicenseType,
          licenseNumber: formLicenseNumber.trim().toUpperCase(),
          issuingAuthority: formAuthority.trim(),
          issuedDate: formIssuedDate,
          expiryDate: formExpiryDate,
          notes: formNotes.trim() || 'Diunggah mandiri oleh operator via AI Vision',
          documentUrl: gdriveDocumentUrl,
        });
      }

      // Close modal first and notify parent before showing alert
      onSuccess?.(savedLicense);
      onClose();

      await SwalService.success(
        'SIO Berhasil Didaftarkan!',
        `Selamat! Lisensi ${formLicenseType} atas nama ${worker.name} berhasil terdaftar dan terverifikasi di sistem K3. Reward +${rewardPts} PTS telah ditambahkan ke akun Anda!`
      );
    } catch (err: any) {
      console.error('[WorkerSioUpload] Gagal simpan lisensi:', err);
      SwalService.error('Gagal Menyimpan SIO', err?.message || 'Terjadi kesalahan sistem saat menyimpan SIO.');
    } finally {
      setIsSaving(false);
    }
  };

  const isPdf = uploadedFile?.type === 'application/pdf' || uploadedFile?.name.toLowerCase().endsWith('.pdf');

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
    >
      <div
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-left space-y-4 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Unggah Lisensi SIO Mandiri</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                +{SystemConfigService.getConfig().sioRegisteredRewardPoints || 100} PTS
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Operator: <strong className="text-white">{worker.name}</strong> ({worker.employeeId}) [{worker.division}]
            </p>
          </div>
        </div>

        {/* AI Scanner Dropzone Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-900 border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  Gappy Vision SIO Extractor
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    Kemnaker RI
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400">
                  Foto kartu SIO atau dokumen PDF Anda untuk ekstraksi otomatis dalam 2 detik
                </div>
              </div>
            </div>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,application/pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-950 shrink-0"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{imagePreview ? 'Ganti Berkas' : 'Pilih Foto / PDF SIO'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Scanner Animation / Status */}
          {isScanning && (
            <div className="relative rounded-xl border border-indigo-500/40 bg-zinc-950 p-4 text-center overflow-hidden">
              <div className="absolute inset-0 bg-indigo-500/10 animate-pulse pointer-events-none" />
              <div className="flex items-center justify-center gap-2 text-indigo-300 text-xs font-bold">
                <ScanLine className="w-4 h-4 animate-bounce text-indigo-400" />
                <span>{scanStatus}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {scanError && (
            <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Image / PDF Preview & Extracted Summary */}
          {imagePreview && !isScanning && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
              {isPdf ? (
                <div className="w-14 h-12 rounded-lg border border-red-500/30 bg-red-950/30 flex flex-col items-center justify-center shrink-0 text-red-400">
                  <FileText className="w-5 h-5" />
                  <span className="text-[8px] font-bold mt-0.5">PDF SIO</span>
                </div>
              ) : (
                <img
                  src={imagePreview}
                  alt="SIO Preview"
                  className="w-14 h-12 object-cover rounded-lg border border-zinc-700 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0 text-[11px]">
                <div className="text-zinc-200 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Hasil Pembacaan AI:</span>
                </div>
                <div className="text-zinc-400 text-[10px] truncate mt-0.5">
                  {extractedMeta?.licenseNumber ? (
                    <>No: <span className="text-amber-300 font-mono font-bold">{extractedMeta.licenseNumber}</span> · Exp: {extractedMeta.expiryDate || '-'}</>
                  ) : (
                    'Dokumen siap. Periksa dan simpan form di bawah.'
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-zinc-300">Jenis Sertifikasi / SIO:</label>
            <select
              value={formLicenseType}
              onChange={(e) => setFormLicenseType(e.target.value as LicenseType)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white font-semibold focus:outline-none focus:border-amber-500"
              required
            >
              <option value="SIO Forklift (Kelas II)">SIO Forklift (Kelas II - Operator Forklift)</option>
              <option value="SIO Reach Truck (Kelas I)">SIO Reach Truck (Kelas I - High-Rack)</option>
              <option value="SIM B2 Umum (Ekspedisi)">SIM B2 Umum (Driver Wingbox/Ekspedisi)</option>
              <option value="Ahli K3 Umum Kemenaker">Ahli K3 Umum Kemenaker</option>
              <option value="Petugas P3K (First Aid)">Petugas P3K (First Aid)</option>
              <option value="Auditor SMK3 / 5S">Auditor SMK3 / 5S</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-bold text-zinc-300">Nomor SIO / Lisensi K3:</label>
              <input
                type="text"
                value={formLicenseNumber}
                onChange={(e) => setFormLicenseNumber(e.target.value)}
                placeholder="Contoh: 6343120624/A-OFK2/32/VI/2024"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-amber-300 font-mono font-bold uppercase focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-zinc-300">Lembaga Penerbit:</label>
              <input
                type="text"
                value={formAuthority}
                onChange={(e) => setFormAuthority(e.target.value)}
                placeholder="Kementerian Ketenagakerjaan RI"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-bold text-zinc-300">Tanggal Diterbitkan:</label>
              <input
                type="date"
                value={formIssuedDate}
                onChange={(e) => setFormIssuedDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-zinc-300">Tanggal Habis Masa Berlaku:</label>
              <input
                type="date"
                value={formExpiryDate}
                onChange={(e) => setFormExpiryDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-300">Catatan / Spesifikasi (Opsional):</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Contoh: Kapasitas angkut 3 Ton, Diesel Forklift"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl font-bold transition border border-zinc-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{saveStatus}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan & Verifikasi SIO (+100 PTS)</span>
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
