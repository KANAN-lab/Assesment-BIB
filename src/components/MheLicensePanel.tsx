import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Truck,
  ShieldAlert,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Download,
  Trash2,
  Edit3,
  Calendar,
  Building2,
  FileCheck,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Award,
  Sparkles,
  UploadCloud,
  Camera,
  Loader2,
  ScanLine,
  UserCheck,
  Info
} from 'lucide-react';
import { MheLicenseEntity, LicenseType, LicenseStatus } from '../types/license';
import { LicenseService } from '../lib/licenseService';
import { WorkerProfile } from '../types/assessment';
import { WorkerAvatar } from './WorkerAvatar';
import { PaginationControls } from './PaginationControls';
import { SioAiService, ExtractedSioData } from '../lib/sioAiService';
import { uploadFileToGoogleDrive } from '../lib/googleDriveService';
import { SwalService } from '../domain/SwalService';

interface MheLicensePanelProps {
  workers: WorkerProfile[];
}

export const MheLicensePanel: React.FC<MheLicensePanelProps> = ({ workers }) => {
  const [licenses, setLicenses] = useState<MheLicenseEntity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<MheLicenseEntity | null>(null);

  // Form Fields
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formWorkerName, setFormWorkerName] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formDivision, setFormDivision] = useState('');
  const [formLicenseType, setFormLicenseType] = useState<LicenseType | ''>('');
  const [formLicenseNumber, setFormLicenseNumber] = useState('');
  const [formAuthority, setFormAuthority] = useState('Kementerian Ketenagakerjaan RI');
  const [formIssuedDate, setFormIssuedDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // AI OCR / Vision State
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedSioFile, setUploadedSioFile] = useState<File | null>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [extractedMeta, setExtractedMeta] = useState<ExtractedSioData | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = () => {
    setLicenses(LicenseService.getAllLicenses());
  };

  useEffect(() => {
    loadData();
    LicenseService.checkAndDispatchExpiryAlerts();
    const handleUpdate = () => loadData();
    window.addEventListener('gappy_licenses_updated', handleUpdate);
    return () => window.removeEventListener('gappy_licenses_updated', handleUpdate);
  }, []);

  const stats = useMemo(() => {
    return {
      total: licenses.length,
      active: licenses.filter((l) => l.status === 'active').length,
      expiringSoon: licenses.filter((l) => l.status === 'expiring_soon').length,
      expired: licenses.filter((l) => l.status === 'expired').length,
    };
  }, [licenses]);

  const filteredLicenses = useMemo(() => {
    return licenses.filter((l) => {
      const matchSearch =
        l.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDiv = divisionFilter === 'all' || l.division.toUpperCase() === divisionFilter.toUpperCase();
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchType = typeFilter === 'all' || l.licenseType === typeFilter;
      return matchSearch && matchDiv && matchStatus && matchType;
    });
  }, [licenses, searchQuery, divisionFilter, statusFilter, typeFilter]);

  const paginatedLicenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLicenses.slice(start, start + pageSize);
  }, [filteredLicenses, currentPage]);

  const resetForm = () => {
    setFormWorkerId('');
    setFormWorkerName('');
    setFormEmployeeId('');
    setFormDivision('');
    setFormLicenseType('');
    setFormLicenseNumber('');
    setFormAuthority('Kementerian Ketenagakerjaan RI');
    setFormIssuedDate('');
    setFormExpiryDate('');
    setFormNotes('');
    setImagePreview(null);
    setExtractedMeta(null);
    setAiError(null);
    setIsAiScanning(false);
  };

  const handleOpenAddModal = (autoTriggerUpload = false) => {
    setEditingLicense(null);
    resetForm();
    setIsModalOpen(true);
    if (autoTriggerUpload) {
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 200);
    }
  };

  const handleOpenEditModal = (license: MheLicenseEntity) => {
    setEditingLicense(license);
    setFormWorkerId(license.workerId);
    setFormWorkerName(license.workerName);
    setFormEmployeeId(license.employeeId);
    setFormDivision(license.division);
    setFormLicenseType(license.licenseType);
    setFormLicenseNumber(license.licenseNumber);
    setFormAuthority(license.issuingAuthority);
    setFormIssuedDate(license.issuedDate);
    setFormExpiryDate(license.expiryDate);
    setFormNotes(license.notes || '');
    setImagePreview(null);
    setExtractedMeta(null);
    setAiError(null);
    setIsAiScanning(false);
    setIsModalOpen(true);
  };

  const handleWorkerSelect = (workerId: string) => {
    setFormWorkerId(workerId);
    const selected = workers.find((w) => w.id === workerId);
    if (selected) {
      setFormWorkerName(selected.name);
      setFormEmployeeId(selected.employeeId);
      setFormDivision(selected.division);
    }
  };

  // AI OCR Vision Image Processing Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedSioFile(file);

    // Reset input for repeated selections
    e.target.value = '';

    try {
      setIsAiScanning(true);
      setAiError(null);

      // Create preview object URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Call Gemini Multimodal SIO Vision Extractor
      const extracted = await SioAiService.extractSioFromImage(file, workers);
      setExtractedMeta(extracted);

      // Auto populate form fields
      if (extracted.licenseNumber) {
        setFormLicenseNumber(extracted.licenseNumber);
      }
      if (extracted.licenseType) {
        setFormLicenseType(extracted.licenseType);
      }
      if (extracted.issuedDate) {
        setFormIssuedDate(extracted.issuedDate);
      }
      if (extracted.expiryDate) {
        setFormExpiryDate(extracted.expiryDate);
      }
      if (extracted.issuingAuthority) {
        setFormAuthority(extracted.issuingAuthority);
      }
      if (extracted.notes) {
        setFormNotes(extracted.notes);
      }

      // Auto match worker from existing list
      if (extracted.matchedWorker) {
        setFormWorkerId(extracted.matchedWorker.id);
        setFormWorkerName(extracted.matchedWorker.name);
        setFormEmployeeId(extracted.matchedWorker.employeeId);
        setFormDivision(extracted.matchedWorker.division);
        showToast(`✨ SIO terdeteksi atas nama ${extracted.matchedWorker.name} (${extracted.matchedWorker.employeeId})!`);
      } else if (extracted.workerName) {
        setFormWorkerName(extracted.workerName);
        showToast(`✨ AI berhasil mengekstrak SIO untuk "${extracted.workerName}"`);
      }
    } catch (err: any) {
      console.error('[AI SIO Error]:', err);
      setAiError(err.message || 'Gagal membaca foto SIO dengan AI Vision. Pastikan foto jelas dan API Key aktif.');
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleSaveLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWorkerId || !formLicenseType || !formLicenseNumber.trim() || !formIssuedDate || !formExpiryDate) {
      SwalService.warning('Data Wajib Belum Lengkap', 'Mohon lengkapi semua data wajib: Pilih Pekerja, Jenis Sertifikasi SIO, Nomor SIO, Tanggal Terbit, dan Tanggal Kedaluwarsa.');
      return;
    }

    let gdriveDocumentUrl = editingLicense?.documentUrl;
    if (uploadedSioFile) {
      try {
        setIsUploadingToDrive(true);
        const uploadRes = await uploadFileToGoogleDrive(uploadedSioFile, {
          workerId: formWorkerId,
          workerName: formWorkerName,
          moduleCategory: 'SIO_MHE',
          customFilename: `SIO_${formLicenseNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.jpg`,
        });
        if (uploadRes.directUrl || uploadRes.webViewLink) {
          gdriveDocumentUrl = uploadRes.directUrl || uploadRes.webViewLink;
        }
      } catch (err) {
        console.warn('Gagal mengunggah SIO ke Google Drive:', err);
      } finally {
        setIsUploadingToDrive(false);
      }
    }

    if (editingLicense) {
      LicenseService.updateLicense(editingLicense.id, {
        workerId: formWorkerId,
        workerName: formWorkerName,
        employeeId: formEmployeeId,
        division: formDivision,
        licenseType: formLicenseType as LicenseType,
        licenseNumber: formLicenseNumber.trim().toUpperCase(),
        issuingAuthority: formAuthority.trim(),
        issuedDate: formIssuedDate,
        expiryDate: formExpiryDate,
        notes: formNotes.trim(),
        documentUrl: gdriveDocumentUrl,
      });
      showToast(`SIO ${formLicenseNumber} berhasil diperbarui!`);
    } else {
      LicenseService.addLicense({
        workerId: formWorkerId,
        workerName: formWorkerName,
        employeeId: formEmployeeId,
        division: formDivision,
        licenseType: formLicenseType as LicenseType,
        licenseNumber: formLicenseNumber.trim().toUpperCase(),
        issuingAuthority: formAuthority.trim(),
        issuedDate: formIssuedDate,
        expiryDate: formExpiryDate,
        notes: formNotes.trim(),
        documentUrl: gdriveDocumentUrl,
      });
      showToast(`SIO baru untuk ${formWorkerName} berhasil didaftarkan!`);
    }

    setIsModalOpen(false);
    setUploadedSioFile(null);
    loadData();
  };

  const handleDeleteLicense = async (id: string, num: string) => {
    const isConfirmed = await SwalService.confirm({
      title: 'Hapus Catatan SIO?',
      text: `Hapus catatan SIO "${num}" dari sistem? Data kepemilikan lisensi operator ini akan dihapus permanen.`,
      confirmButtonText: 'Ya, Hapus SIO',
      isDestructive: true,
    });
    if (isConfirmed) {
      LicenseService.deleteLicense(id);
      showToast(`SIO ${num} berhasil dihapus.`);
      loadData();
    }
  };

  const getStatusBadge = (status: LicenseStatus, days: number) => {
    switch (status) {
      case 'expired':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0">
            <ShieldAlert className="w-3.5 h-3.5" /> Kedaluwarsa ({Math.abs(days)}h lalu)
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Segera Habis ({days} hari)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" /> Aktif ({days} hari)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Header Banner */}
      <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Pelacak SIO & Lisensi Alat Berat (MHE)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Monitoring Surat Izin Operator (Forklift, Reach Truck, Truk) & Sertifikasi K3 Legal Kemenaker RI
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => LicenseService.exportLicensesCSV(filteredLicenses)}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Ekspor rekap SIO ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleOpenAddModal(false)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-950"
          >
            <Plus className="w-4 h-4" />
            <span>Daftarkan SIO Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3.5 space-y-1">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-bold">
            <span>Total Lisensi</span>
            <FileCheck className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.total}</div>
          <div className="text-[10px] text-zinc-500">Tersertifikasi di sistem</div>
        </div>

        <div className="card p-3.5 space-y-1 border-emerald-500/20 bg-emerald-950/10">
          <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold">
            <span>SIO Aktif Valid</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.active}</div>
          <div className="text-[10px] text-emerald-400/70">100% Layak Operasi</div>
        </div>

        <div className="card p-3.5 space-y-1 border-amber-500/30 bg-amber-950/15">
          <div className="flex items-center justify-between text-amber-400 text-[11px] font-bold">
            <span>Segera Habis (≤30h)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 flex items-center gap-2">
            {stats.expiringSoon}
            {stats.expiringSoon > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <div className="text-[10px] text-amber-400/80">Perlu perpanjangan</div>
        </div>

        <div className="card p-3.5 space-y-1 border-rose-500/30 bg-rose-950/15">
          <div className="flex items-center justify-between text-rose-400 text-[11px] font-bold">
            <span>SIO Kedaluwarsa</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{stats.expired}</div>
          <div className="text-[10px] text-rose-400/80">Dilarang operasi MHE</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Cari nama, NIP, nomor SIO..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Division Filter */}
          <div className="relative">
            <select
              value={divisionFilter}
              onChange={(e) => { setDivisionFilter(e.target.value); setCurrentPage(1); }}
              className="w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">Semua Divisi</option>
              <option value="WFG">WFG — Finished Goods</option>
              <option value="WRM">WRM — Raw Material</option>
              <option value="TIM">TIM — Timbangan</option>
              <option value="EXP">EXP — Ekspedisi</option>
              <option value="GA">GA — General Affairs</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">Semua Status Legalitas</option>
              <option value="active">🟢 SIO Aktif Valid</option>
              <option value="expiring_soon">🟡 Segera Habis (≤ 30 Hari)</option>
              <option value="expired">🔴 SIO Kedaluwarsa</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* License Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">Semua Jenis Lisensi</option>
              <option value="SIO Forklift (Kelas II)">SIO Forklift (Kelas II)</option>
              <option value="SIO Reach Truck (Kelas I)">SIO Reach Truck (Kelas I)</option>
              <option value="SIM B2 Umum (Ekspedisi)">SIM B2 Umum (Ekspedisi)</option>
              <option value="Ahli K3 Umum Kemenaker">Ahli K3 Umum Kemenaker</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* License Table List */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900/80 text-zinc-400 font-bold border-b border-zinc-800 text-[11px]">
                <th className="py-3 px-3.5">Personel & NIP</th>
                <th className="py-3 px-3">Divisi</th>
                <th className="py-3 px-3">Jenis Lisensi</th>
                <th className="py-3 px-3">Nomor SIO / Sertifikat</th>
                <th className="py-3 px-3">Masa Berlaku</th>
                <th className="py-3 px-3">Status Legal</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {paginatedLicenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-zinc-700 opacity-60" />
                    Belum ada data lisensi SIO terdaftar. Klik <b>" Daftarkan SIO Baru"</b> atau <b>" Scan SIO (AI Vision)"</b> untuk menambahkan.
                  </td>
                </tr>
              ) : (
                paginatedLicenses.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-900/50 transition">
                    {/* Personel */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <WorkerAvatar name={l.workerName} className="w-8 h-8 rounded-lg" />
                        <div>
                          <div className="font-bold text-white text-xs">{l.workerName}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{l.employeeId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Divisi */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">
                        {l.division}
                      </span>
                    </td>

                    {/* Jenis Lisensi */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-200">{l.licenseType}</div>
                      <div className="text-[10px] text-zinc-500 truncate max-w-44">{l.issuingAuthority}</div>
                    </td>

                    {/* Nomor SIO */}
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-amber-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[11px] select-all">
                        {l.licenseNumber}
                      </span>
                    </td>

                    {/* Masa Berlaku */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-300">
                        {new Date(l.expiryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        Terbit: {new Date(l.issuedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      {getStatusBadge(l.status, l.daysRemaining)}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(l)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition"
                          title="Edit / Perpanjang SIO"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLicense(l.id, l.licenseNumber)}
                          className="p-1.5 bg-zinc-800 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-400 rounded-lg transition"
                          title="Hapus Catatan SIO"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <PaginationControls
          currentPage={currentPage}
          totalItems={filteredLicenses.length}
          pageSize={pageSize}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>

      {/* ─── MODAL DAFTAR / PERPANJANG SIO DENGAN AI SCANNER ─── */}
      {isModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
        >
          <div
            className="relative w-full max-w-2xl card-elevated p-6 space-y-4 border border-amber-500/30 overflow-hidden"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {editingLicense ? 'Perbarui / Perpanjang SIO MHE' : 'Daftarkan SIO / Lisensi Alat Berat Baru'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Unggah foto kartu SIO untuk ekstraksi otomatis oleh AI Vision atau isi formulir secara manual
                </p>
              </div>
            </div>

            {/* ─── AI OCR / VISION SCANNER DROPZONE ─── */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-900 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      AI Vision SIO Extractor
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                        Kemnaker RI
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Auto-extract nomor registrasi, nama operator, masa berlaku, dan pejabat pengesah
                    </div>
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAiScanning}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-950"
                  >
                    {isAiScanning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menganalisis...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{imagePreview ? 'Ganti Foto SIO' : 'Upload Foto SIO'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Scanner Animation / Preview */}
              {isAiScanning && (
                <div className="relative rounded-xl border border-indigo-500/40 bg-zinc-950 p-4 text-center overflow-hidden">
                  <div className="absolute inset-0 bg-indigo-500/10 animate-pulse pointer-events-none" />
                  <div className="flex items-center justify-center gap-2 text-indigo-300 text-xs font-bold">
                    <ScanLine className="w-4 h-4 animate-bounce text-indigo-400" />
                    <span>Gappy AI sedang membaca nomor lisensi, nama pekerja, & tanggal berlaku...</span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {aiError && (
                <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Image Preview & Extracted Summary Bar */}
              {imagePreview && !isAiScanning && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <img
                    src={imagePreview}
                    alt="SIO Preview"
                    className="w-16 h-12 object-cover rounded-lg border border-zinc-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0 text-[11px]">
                    <div className="text-zinc-200 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Hasil Analisis AI Vision:</span>
                    </div>
                    <div className="text-zinc-400 text-[10px] truncate mt-0.5">
                      {extractedMeta?.licenseNumber ? (
                        <>No: <span className="text-amber-300 font-mono font-bold">{extractedMeta.licenseNumber}</span> · Exp: {extractedMeta.expiryDate || '-'}</>
                      ) : (
                        'Foto berhasil dimuat. Field formulir di bawah siap disimpan.'
                      )}
                    </div>
                  </div>
                  {extractedMeta?.matchedWorker && (
                    <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                      <UserCheck className="w-3 h-3" /> Auto-Matched
                    </span>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSaveLicense} className="space-y-4">
              {/* Pilih Pekerja */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">Pilih Pekerja / Operator Terdaftar:</label>
                  {extractedMeta?.workerName && (
                    <span className="text-[10px] text-indigo-300 font-medium">
                      Nama di SIO: <b>{extractedMeta.workerName}</b>
                    </span>
                  )}
                </div>
                <select
                  value={formWorkerId}
                  onChange={(e) => handleWorkerSelect(e.target.value)}
                  className={`w-full bg-zinc-900 border rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500 font-bold ${!formWorkerId ? 'text-zinc-500 border-zinc-800' : 'text-white border-amber-500/50'
                    }`}
                  required
                >
                  <option value="" disabled>-- Pilih Pekerja / Operator Terdaftar --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id} className="text-white bg-zinc-900">
                      {w.name} ({w.employeeId}) — {w.role} [{w.division}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenis Lisensi */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Jenis Sertifikasi / SIO:</label>
                <select
                  value={formLicenseType}
                  onChange={(e) => setFormLicenseType(e.target.value as any)}
                  className={`w-full bg-zinc-900 border rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500 font-semibold ${!formLicenseType ? 'text-zinc-500 border-zinc-800' : 'text-white border-amber-500/50'
                    }`}
                  required
                >
                  <option value="" disabled>-- Pilih Jenis Sertifikasi / SIO --</option>
                  <option value="SIO Forklift (Kelas II)" className="text-white bg-zinc-900">SIO Forklift (Kelas II - Operator Forklift)</option>
                  <option value="SIO Reach Truck (Kelas I)" className="text-white bg-zinc-900">SIO Reach Truck (Kelas I - High-Rack)</option>
                  <option value="SIM B2 Umum (Ekspedisi)" className="text-white bg-zinc-900">SIM B2 Umum (Driver Wingbox/Ekspedisi)</option>
                  <option value="Ahli K3 Umum Kemenaker" className="text-white bg-zinc-900">Ahli K3 Umum Kemenaker</option>
                  <option value="Petugas P3K (First Aid)" className="text-white bg-zinc-900">Petugas P3K (First Aid)</option>
                  <option value="Auditor SMK3 / 5S" className="text-white bg-zinc-900">Auditor SMK3 / 5S</option>
                </select>
              </div>

              {/* Nomor SIO & Lembaga Penerbit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Nomor SIO / Sertifikat:</label>
                  <input
                    type="text"
                    value={formLicenseNumber}
                    onChange={(e) => setFormLicenseNumber(e.target.value)}
                    placeholder="Contoh: 6343120624/A-OFK2/32/VI/2024"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-amber-300 font-mono font-bold uppercase focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Lembaga Penerbit:</label>
                  <input
                    type="text"
                    value={formAuthority}
                    onChange={(e) => setFormAuthority(e.target.value)}
                    placeholder="Contoh: Kementerian Ketenagakerjaan RI"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Tanggal Terbit & Tanggal Kedaluwarsa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Tanggal Diterbitkan:</label>
                  <input
                    type="date"
                    value={formIssuedDate}
                    onChange={(e) => setFormIssuedDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Tanggal Kedaluwarsa (Masa Berlaku):</label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    required
                  />
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Catatan / Detail Ekstraksi AI:</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Detail unit / penandatangan lisensi..."
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition shadow-md shadow-amber-950"
                >
                  {editingLicense ? 'Simpan Perubahan' : 'Simpan Lisensi SIO'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
