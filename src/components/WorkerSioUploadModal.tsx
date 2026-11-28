import React, { useState, useRef, useEffect, useMemo } from 'react';
import SearchableSelect, { SelectOption } from './ui/SearchableSelect';
import { createPortal } from 'react-dom';
import {
  X, Truck, Sparkles, UploadCloud, Loader2, ScanLine,
  AlertTriangle, CheckCircle2, FileText, Info, Check, Eye, ZoomIn
} from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { SioAiService, ExtractedSioData } from '../lib/sioAiService';
import { LicenseService } from '../lib/licenseService';
import { uploadFileToGoogleDrive } from '../lib/googleDriveService';
import { SwalService } from '../domain/SwalService';
import { SystemConfigService } from '../domain/SystemConfigService';
import { LicenseType, MheLicenseEntity } from '../types/license';
import { getTodayWibDateString } from '../lib/dateUtils';

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
  const sioRewardPts = SystemConfigService.getConfig().sioRegisteredRewardPoints || 100;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('Menyiapkan dokumen...');
  const [scanError, setScanError] = useState<string | null>(null);
  const [extractedMeta, setExtractedMeta] = useState<ExtractedSioData | null>(null);

  // Form Fields
  const [formLicenseType, setFormLicenseType] = useState<LicenseType | ''>('');
  const [formLicenseNumber, setFormLicenseNumber] = useState('');
  const [formAuthority, setFormAuthority] = useState('Kementerian Ketenagakerjaan RI');
  const [formIssuedDate, setFormIssuedDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Menyimpan...');
  const [isZoomingImage, setIsZoomingImage] = useState(false);

  const isExpired = useMemo(() => {
    if (!formExpiryDate) return false;
    const today = getTodayWibDateString();
    return formExpiryDate < today;
  }, [formExpiryDate]);

  const handleCleanLicenseNumber = () => {
    if (!formLicenseNumber) return;
    setFormLicenseNumber(formLicenseNumber.trim().toUpperCase().replace(/\s+/g, ' '));
  };

  // Lock scroll and listen for Escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

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

    if (!formLicenseType || !formLicenseNumber.trim() || !formIssuedDate || !formExpiryDate) {
      SwalService.warning(
        'Data Belum Lengkap',
        'Mohon pilih Jenis Sertifikasi / SIO, lengkapi Nomor SIO, Tanggal Diterbitkan, dan Tanggal Kedaluwarsa lisensi.'
      );
      return;
    }

    const today = getTodayWibDateString();
    if (formIssuedDate > today) {
      SwalService.warning(
        'Tanggal Terbit Tidak Valid',
        'Tanggal diterbitkan lisensi tidak boleh berada di masa depan.'
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
      const rewardPts = sioRewardPts;

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
        className={`relative w-full ${
          imagePreview ? 'max-w-4xl' : 'max-w-lg'
        } bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-left space-y-4 my-8 transition-all`}
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
                +{sioRewardPts} PTS
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Operator: <strong className="text-white">{worker.name}</strong> ({worker.employeeId}) [{worker.division}]
            </p>
          </div>
        </div>

        {/* AI Scanner Dropzone Header */}
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
        </div>

        {/* Content Area: Split View if Image Preview Available */}
        <div className={`grid ${imagePreview ? 'grid-cols-1 md:grid-cols-12 gap-5' : 'grid-cols-1'}`}>
          {/* Left Column: Visual Document Preview */}
          {imagePreview && (
            <div className="md:col-span-5 flex flex-col space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center group h-64 sm:h-72">
                {isPdf ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-red-400">
                    <FileText className="w-12 h-12 mb-2" />
                    <span className="text-xs font-bold">Dokumen PDF Terunggah</span>
                    <span className="text-[10px] text-zinc-500 mt-1">{uploadedFile?.name}</span>
                  </div>
                ) : (
                  <>
                    <img
                      src={imagePreview}
                      alt="Pratinjau SIO"
                      className="w-full h-full object-contain p-2"
                    />
                    <button
                      type="button"
                      onClick={() => setIsZoomingImage(true)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-[2px]"
                    >
                      <ZoomIn className="w-4 h-4" />
                      <span>Perbesar Dokumen</span>
                    </button>
                  </>
                )}
              </div>

              {/* Ekstraksi AI Highlight */}
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[11px] space-y-1">
                <div className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Hasil Pembacaan AI:</span>
                </div>
                <div className="text-zinc-400 text-[10px] leading-relaxed">
                  {extractedMeta?.licenseNumber ? (
                    <>
                      <div>No SIO: <span className="text-amber-300 font-mono font-bold">{extractedMeta.licenseNumber}</span></div>
                      <div>Masa Berlaku: {extractedMeta.expiryDate || '-'}</div>
                      <div>Instansi: {extractedMeta.issuingAuthority || '-'}</div>
                    </>
                  ) : (
                    <span>Foto terbaca. Silakan verifikasi dan koreksi isian di samping bila diperlukan.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Right Column: Verification & Human Correction Form */}
          <div className={imagePreview ? 'md:col-span-7' : 'w-full'}>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-300">Jenis Sertifikasi / SIO *</label>
                <SearchableSelect
                  value={formLicenseType}
                  onChange={(v) => setFormLicenseType(v as LicenseType)}
                  placeholder="-- Pilih Jenis Sertifikasi / SIO --"
                  searchPlaceholder="Cari jenis lisensi..."
                  options={[
                    { value: 'SIO Forklift (Kelas II)', label: 'SIO Forklift (Kelas II)', sublabel: 'Operator Forklift' },
                    { value: 'SIO Reach Truck (Kelas I)', label: 'SIO Reach Truck (Kelas I)', sublabel: 'High-Rack Operator' },
                    { value: 'SIM B2 Umum (Ekspedisi)', label: 'SIM B2 Umum (Ekspedisi)', sublabel: 'Driver Wingbox / Ekspedisi' },
                    { value: 'Ahli K3 Umum Kemenaker', label: 'Ahli K3 Umum Kemenaker' },
                    { value: 'Petugas P3K (First Aid)', label: 'Petugas P3K (First Aid)' },
                    { value: 'Auditor SMK3 / 5S', label: 'Auditor SMK3 / 5S' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-300">Nomor SIO / Lisensi K3 *</label>
                    <button
                      type="button"
                      onClick={handleCleanLicenseNumber}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline"
                      title="Rapikan format spasi & huruf kapital"
                    >
                      Rapikan Format
                    </button>
                  </div>
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
                  <label className="font-bold text-zinc-300">Lembaga Penerbit *</label>
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
                  <label className="font-bold text-zinc-300">Tanggal Diterbitkan *</label>
                  <input
                    type="date"
                    value={formIssuedDate}
                    onChange={(e) => setFormIssuedDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-300">Tanggal Habis Masa Berlaku *</label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className={`w-full bg-zinc-900 border rounded-xl p-2.5 font-bold focus:outline-none ${
                      isExpired ? 'border-amber-500 text-amber-300' : 'border-zinc-800 text-white focus:border-amber-500'
                    }`}
                    required
                  />
                  {isExpired && (
                    <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-0.5 animate-pulse">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Perhatian: Lisensi ini terdeteksi sudah habis masa berlaku</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-300">Catatan / Spesifikasi Alat (Opsional)</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Kapasitas angkut 3 Ton, Diesel Forklift"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800/80">
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
                      <span>Simpan & Verifikasi SIO (+{sioRewardPts} PTS)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Fullscreen Lightbox Zoom Modal */}
        {isZoomingImage && imagePreview && (
          <div
            className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md p-4 flex flex-col items-center justify-center animate-fade-in"
            onClick={() => setIsZoomingImage(false)}
          >
            <button
              type="button"
              onClick={() => setIsZoomingImage(false)}
              className="absolute top-4 right-4 p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white border border-zinc-800"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={imagePreview}
              alt="SIO Zoom"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
