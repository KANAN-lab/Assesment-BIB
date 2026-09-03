import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  MapPin,
  UserCheck,
  Calendar,
  Building2,
  Sliders,
  Camera,
  Trash2,
  Edit2,
  CheckCircle,
  HelpCircle,
  Star,
  Upload,
  Loader2,
  X
} from 'lucide-react';
import { uploadFileToGoogleDrive } from '../lib/googleDriveService';
import { WorkerProfile } from '../types/assessment';
import {
  WarehouseZone5s,
  Audit5sRecord,
  Audit5sPillars,
  Rating5s,
  ZoneType,
} from '../types/audit5s';
import {
  Audit5sService,
  ZONE_TYPE_META,
  RATING_META,
} from '../lib/audit5sService';
import { IdempotencyEngine } from '../domain/IdempotencyEngine';

interface Audit5sPanelProps {
  workers: WorkerProfile[];
  currentUserName?: string;
  isSupervisor?: boolean;
}

export const Audit5sPanel: React.FC<Audit5sPanelProps> = ({
  workers = [],
  currentUserName = 'Petugas HSE & 5R',
  isSupervisor = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'leaderboard' | 'create_audit' | 'manage_zones' | 'history'>('leaderboard');
  const [zones, setZones] = useState<WarehouseZone5s[]>([]);
  const [records, setRecords] = useState<Audit5sRecord[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');

  // New Audit Form State
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [auditorName, setAuditorName] = useState(currentUserName);
  const [auditDate, setAuditDate] = useState(new Date().toISOString().slice(0, 10));
  const [scores, setScores] = useState<Audit5sPillars>({
    ringkas_seiri: 85,
    rapi_seiton: 85,
    resik_seiso: 85,
    rawat_seiketsu: 85,
    rajin_shitsuke: 85,
  });
  const [findingsDescription, setFindingsDescription] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [beforePhotoUrl, setBeforePhotoUrl] = useState('');
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');
  const [beforePhotoFile, setBeforePhotoFile] = useState<File | null>(null);
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  // Zone Management Form State
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState<ZoneType | ''>('');
  const [newZoneDivision, setNewZoneDivision] = useState('');
  const [newZonePicId, setNewZonePicId] = useState('');
  const [newZoneNotes, setNewZoneNotes] = useState('');

  const reloadData = () => {
    setZones(Audit5sService.getAllZones());
    setRecords(Audit5sService.getAllRecords());
  };

  useEffect(() => {
    reloadData();
    const handler = () => reloadData();
    window.addEventListener('gappy_5s_updated', handler);
    return () => window.removeEventListener('gappy_5s_updated', handler);
  }, []);

  // Stats KPI
  const stats = useMemo(() => Audit5sService.getStats(), [zones, records]);

  // Unique Divisions
  const divisions = useMemo(() => {
    const set = new Set<string>();
    workers.forEach((w) => {
      if (w.division && w.division.toUpperCase() !== 'SYSTEM') set.add(w.division);
    });
    return Array.from(set);
  }, [workers]);

  // Live Score Calculation
  const liveTotalScore = Math.round(
    (scores.ringkas_seiri +
      scores.rapi_seiton +
      scores.resik_seiso +
      scores.rawat_seiketsu +
      scores.rajin_shitsuke) /
      5
  );
  const liveRating = Audit5sService.calculateRating(liveTotalScore);

  // Submit New Audit Record
  const handleSubmitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZoneId) {
      alert('Pilih wilayah / zona gudang yang diaudit terlebih dahulu!');
      return;
    }

    const targetZone = zones.find((z) => z.id === selectedZoneId);
    const safeZoneName = targetZone ? targetZone.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Zona';

    let finalBeforeUrl = beforePhotoUrl.trim() || undefined;
    let finalAfterUrl = afterPhotoUrl.trim() || undefined;

    if (beforePhotoFile || afterPhotoFile) {
      setIsUploadingPhotos(true);
      try {
        if (beforePhotoFile) {
          const upRes = await uploadFileToGoogleDrive(beforePhotoFile, {
            workerId: currentUserName ? currentUserName.replace(/[^a-zA-Z0-9]/g, '_') : 'Auditor',
            workerName: auditorName || currentUserName || 'Auditor 5R',
            moduleCategory: 'Audit_5R_5S',
            customFilename: `5R_Before_${safeZoneName}_${Date.now()}.jpg`,
          });
          if (upRes.directUrl || upRes.webViewLink) {
            finalBeforeUrl = upRes.directUrl || upRes.webViewLink;
          }
        }
        if (afterPhotoFile) {
          const upRes = await uploadFileToGoogleDrive(afterPhotoFile, {
            workerId: currentUserName ? currentUserName.replace(/[^a-zA-Z0-9]/g, '_') : 'Auditor',
            workerName: auditorName || currentUserName || 'Auditor 5R',
            moduleCategory: 'Audit_5R_5S',
            customFilename: `5R_After_${safeZoneName}_${Date.now()}.jpg`,
          });
          if (upRes.directUrl || upRes.webViewLink) {
            finalAfterUrl = upRes.directUrl || upRes.webViewLink;
          }
        }
      } catch (err) {
        console.warn('Gagal mengunggah foto 5R ke Google Drive:', err);
      } finally {
        setIsUploadingPhotos(false);
      }
    }

    // Generate idempotency key dari konten audit (zona + tanggal + nama auditor + scores)
    const idemp = IdempotencyEngine.generateKey(
      auditorName || 'auditor',
      'audit5s',
      { selectedZoneId, auditDate, scores, auditorName }
    );
    const guard = IdempotencyEngine.guard(idemp);
    if (!guard.allowed) {
      alert(guard.reason || 'Data audit ini sudah dikirim. Harap tunggu sebelum mengirim ulang.');
      return;
    }

    try {
      Audit5sService.submitAuditRecord({
        zoneId: selectedZoneId,
        auditorName: auditorName || 'Pengawas 5R',
        auditDate,
        scores,
        findingsDescription: findingsDescription || undefined,
        correctiveAction: correctiveAction || undefined,
        beforePhotoUrl: finalBeforeUrl,
        afterPhotoUrl: finalAfterUrl,
        idempotencyKey: idemp,
      });
      IdempotencyEngine.release(idemp, true);
    } catch (err) {
      IdempotencyEngine.release(idemp, false);
      throw err;
    }

    // Reset Form
    setSelectedZoneId('');
    setFindingsDescription('');
    setCorrectiveAction('');
    setBeforePhotoUrl('');
    setAfterPhotoUrl('');
    setBeforePhotoFile(null);
    setAfterPhotoFile(null);
    setActiveSubTab('leaderboard');
  };

  // Submit New Zone
  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim() || !newZoneType || !newZoneDivision) {
      alert('Isi nama zona, tipe wilayah, dan divisi secara lengkap!');
      return;
    }

    const pic = workers.find((w) => w.id === newZonePicId);

    Audit5sService.addZone({
      name: newZoneName.trim(),
      zoneType: newZoneType,
      division: newZoneDivision,
      picWorkerId: pic?.id,
      picWorkerName: pic?.name,
      notes: newZoneNotes || undefined,
    });

    setNewZoneName('');
    setNewZoneType('');
    setNewZoneDivision('');
    setNewZonePicId('');
    setNewZoneNotes('');
  };

  const handleDeleteZone = (zoneId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus zona gudang ini?')) {
      Audit5sService.deleteZone(zoneId);
      reloadData();
    }
  };

  const openAuditForZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setActiveSubTab('create_audit');
  };

  // Filtered Zones
  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      if (divisionFilter !== 'all' && z.division !== divisionFilter) return false;
      if (ratingFilter !== 'all' && z.badgeRating !== ratingFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          z.name.toLowerCase().includes(q) ||
          z.division.toLowerCase().includes(q) ||
          (z.picWorkerName ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [zones, divisionFilter, ratingFilter, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── HEADER BANNER ─── */}
      <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-teal-500/20 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>Audit Standar 5R / 5S Wilayah Gudang (5S Warehouse Zone)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pusat Evaluasi Kerapian & Kebersihan Area Kerja (Ringkas, Rapi, Resik, Rawat, Rajin) dengan Insentif Poin BIB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => Audit5sService.exportAuditRecordsCSV(records)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Unduh Rekap Audit Format CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setActiveSubTab('create_audit')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-teal-950"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Audit 5R Baru</span>
          </button>
        </div>
      </div>

      {/* ─── KPI METRICS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card p-3.5 bg-zinc-900/60 border-zinc-800">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Zona Gudang</div>
          <div className="text-xl font-black text-white mt-1">{stats.totalZones}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Wilayah Terdaftar</div>
        </div>

        <div className="card p-3.5 bg-zinc-900/60 border-teal-500/20">
          <div className="text-[10px] text-teal-400/80 font-bold uppercase tracking-wider">Rata-rata Skor 5R</div>
          <div className="text-xl font-black text-teal-400 mt-1">{stats.avgScore}%</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Standar Target Min. 80%</div>
        </div>

        <div className="card p-3.5 bg-zinc-900/60 border-amber-500/20">
          <div className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">Zona Gold (&ge;90%)</div>
          <div className="text-xl font-black text-amber-400 mt-1">{stats.goldZones}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Sangat Unggul (+200 PTS)</div>
        </div>

        <div className="card p-3.5 bg-zinc-900/60 border-zinc-700">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Zona Silver (&ge;80%)</div>
          <div className="text-xl font-black text-zinc-200 mt-1">{stats.silverZones}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Sesuai SOP (+100 PTS)</div>
        </div>

        <div className="card p-3.5 bg-zinc-900/60 border-rose-500/20">
          <div className="text-[10px] text-rose-400/80 font-bold uppercase tracking-wider">Perlu Perbaikan</div>
          <div className="text-xl font-black text-rose-400 mt-1">{stats.improvementNeededZones}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Skor Kurang dari 70%</div>
        </div>

        <div className="card p-3.5 bg-zinc-900/60 border-indigo-500/20">
          <div className="text-[10px] text-indigo-400/80 font-bold uppercase tracking-wider">Insentif Dibagikan</div>
          <div className="text-xl font-black text-indigo-400 mt-1">+{stats.totalRewardPointsAwarded}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Poin Reward PIC</div>
        </div>
      </div>

      {/* ─── SUB-TABS NAVIGATION ─── */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-3 flex-wrap">
        <button
          onClick={() => setActiveSubTab('leaderboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'leaderboard'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-950'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Papan Klasemen & Status Zona ({zones.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('create_audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'create_audit'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-950'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Catat Audit 5R Baru</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'history'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-950'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Riwayat Sesi Audit ({records.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('manage_zones')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'manage_zones'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-950'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Manajemen Master Zona</span>
        </button>
      </div>

      {/* ─── SUB-TAB 1: LEADERBOARD & KARTU ZONA ─── */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/60">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama zona, divisi, atau PIC..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="all">Semua Divisi</option>
                {divisions.map((d) => (
                  <option key={d} value={d}>Divisi {d}</option>
                ))}
              </select>

              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="all">Semua Predikat</option>
                <option value="Gold">Predikat Gold</option>
                <option value="Silver">Predikat Silver</option>
                <option value="Bronze">Predikat Bronze</option>
                <option value="Perlu Perbaikan">Perlu Perbaikan</option>
              </select>
            </div>
          </div>

          {/* Zones Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredZones.map((zone) => {
              const typeMeta = ZONE_TYPE_META[zone.zoneType];
              const score = zone.lastAuditScore ?? 0;
              const rating = zone.badgeRating || 'Perlu Perbaikan';
              const rMeta = RATING_META[rating];

              return (
                <div key={zone.id} className="card p-5 space-y-4 bg-zinc-950 border-zinc-800 hover:border-teal-500/40 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{typeMeta?.icon || '📍'}</span>
                        <div>
                          <h4 className="font-bold text-white text-xs">{zone.name}</h4>
                          <span className="text-[10px] font-semibold text-zinc-400">Divisi {zone.division}</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${rMeta.badgeCls}`}>
                        {rating}
                      </span>
                    </div>

                    {/* Score Bar */}
                    <div className="space-y-1 mt-3">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-400">Skor Audit Terakhir:</span>
                        <span className="font-black text-white font-mono">{score}%</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className={`h-full rounded-full ${
                            score >= 90
                              ? 'bg-amber-400'
                              : score >= 80
                              ? 'bg-teal-400'
                              : score >= 70
                              ? 'bg-orange-400'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-zinc-800/80 text-xs text-zinc-400 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">PIC Wilayah:</span>
                        <span className="font-semibold text-white">{zone.picWorkerName || 'Belum ditugaskan'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Tanggal Audit:</span>
                        <span>{zone.lastAuditedDate || 'Belum pernah'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      +{rMeta.rewardPoints} PTS PIC
                    </span>
                    <button
                      onClick={() => openAuditForZone(zone.id)}
                      className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Audit Zona</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SUB-TAB 2: FORM CATAT AUDIT 5R BARU ─── */}
      {activeSubTab === 'create_audit' && (
        <form onSubmit={handleSubmitAudit} className="card p-6 space-y-6 bg-zinc-950 border-teal-500/30 shadow-xl max-w-4xl mx-auto">
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-white text-sm">Formulir Penilaian 5 Pilar Standar 5R / 5S</h3>
            </div>
            <span className="text-[11px] text-zinc-500">Ringkas · Rapi · Resik · Rawat · Rajin</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pilih Zona */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Pilih Wilayah / Zona Gudang yang Diaudit <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-semibold"
              >
                <option value="" disabled>-- Pilih Wilayah / Zona Gudang --</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} (Divisi {z.division}) — PIC: {z.picWorkerName || '-'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Tanggal Audit</label>
              <input
                type="date"
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Nama Auditor / Pengawas 5R</label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* 5 Pillars Sliders */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Evaluasi 5 Pilar Housekeeping (Skala 0 - 100%):
            </h4>

            {/* 1. Ringkas */}
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-black text-white">1. Ringkas (Seiri)</span>
                  <span className="text-[11px] text-zinc-400 ml-2">Pemisahan barang terpakai vs tidak terpakai, bebas red-tag & sampah</span>
                </div>
                <span className="font-black font-mono text-teal-400 text-sm">{scores.ringkas_seiri}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={scores.ringkas_seiri}
                onChange={(e) => setScores({ ...scores, ringkas_seiri: Number(e.target.value) })}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* 2. Rapi */}
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-black text-white">2. Rapi (Seiton)</span>
                  <span className="text-[11px] text-zinc-400 ml-2">Penataan posisi barang, batas marka jalan forklift, label identitas</span>
                </div>
                <span className="font-black font-mono text-teal-400 text-sm">{scores.rapi_seiton}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={scores.rapi_seiton}
                onChange={(e) => setScores({ ...scores, rapi_seiton: Number(e.target.value) })}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* 3. Resik */}
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-black text-white">3. Resik (Seiso)</span>
                  <span className="text-[11px] text-zinc-400 ml-2">Kebersihan lantai dari oli/ceceran cairan, peralatan kerja terawat</span>
                </div>
                <span className="font-black font-mono text-teal-400 text-sm">{scores.resik_seiso}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={scores.resik_seiso}
                onChange={(e) => setScores({ ...scores, resik_seiso: Number(e.target.value) })}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* 4. Rawat */}
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-black text-white">4. Rawat (Seiketsu)</span>
                  <span className="text-[11px] text-zinc-400 ml-2">Standarisasi visual control & jadwal kebersihan konsisten harian</span>
                </div>
                <span className="font-black font-mono text-teal-400 text-sm">{scores.rawat_seiketsu}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={scores.rawat_seiketsu}
                onChange={(e) => setScores({ ...scores, rawat_seiketsu: Number(e.target.value) })}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* 5. Rajin */}
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-black text-white">5. Rajin (Shitsuke)</span>
                  <span className="text-[11px] text-zinc-400 ml-2">Kedisiplinan personel merawat zona kerja & briefing harian K3</span>
                </div>
                <span className="font-black font-mono text-teal-400 text-sm">{scores.rajin_shitsuke}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={scores.rajin_shitsuke}
                onChange={(e) => setScores({ ...scores, rajin_shitsuke: Number(e.target.value) })}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Total Score & Rating Banner */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Kalkulasi Total Skor 5R:</div>
              <div className="text-2xl font-black text-white font-mono">{liveTotalScore}% / 100%</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Predikat Rating:</div>
              <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black border mt-0.5 ${RATING_META[liveRating.rating].badgeCls}`}>
                {liveRating.rating} (+{liveRating.points} PTS)
              </span>
            </div>
          </div>

          {/* Temuan & Tindakan Korektif */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Catatan Temuan Lapangan (Opsional)</label>
              <textarea
                value={findingsDescription}
                onChange={(e) => setFindingsDescription(e.target.value)}
                rows={3}
                placeholder="Temuan pallet melintang di marka jalan atau ceceran debu di rak..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Rencana Tindakan Korektif (Action Plan)</label>
              <textarea
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                rows={3}
                placeholder="Penataan ulang pallet staging dan pembersihan lantai sebelum pergantian shift..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Foto Kondisi Sebelum (Before) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300">
                Foto Kondisi Sebelum (Before)
              </label>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-bold text-teal-300 transition shadow-sm shrink-0">
                  <Camera className="w-4 h-4 text-teal-400" />
                  <span>{beforePhotoFile ? 'Ganti Foto' : 'Jepret / Unggah Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBeforePhotoFile(file);
                      const reader = new FileReader();
                      reader.onload = () => setBeforePhotoUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={beforePhotoUrl}
                    onChange={(e) => {
                      setBeforePhotoUrl(e.target.value);
                      setBeforePhotoFile(null);
                    }}
                    placeholder="Atau tempel link URL foto: https://..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              {beforePhotoUrl && (
                <div className="flex items-center gap-2.5 p-2 bg-zinc-950/80 border border-zinc-800 rounded-xl">
                  <img
                    src={beforePhotoUrl}
                    alt="Preview Before"
                    className="w-12 h-12 object-cover rounded-lg border border-zinc-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-300 truncate">
                      {beforePhotoFile ? beforePhotoFile.name : 'Link foto sebelum terpasang'}
                    </p>
                    <p className="text-[10px] text-teal-400">
                      {beforePhotoFile ? '✓ Siap diunggah otomatis ke Google Drive (Audit_5R_5S)' : 'Pratinjau Foto Aktif'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBeforePhotoFile(null);
                      setBeforePhotoUrl('');
                    }}
                    className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg"
                    title="Hapus foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Foto Kondisi Sesudah (After) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300">
                Foto Kondisi Sesudah (After)
              </label>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-bold text-teal-300 transition shadow-sm shrink-0">
                  <Camera className="w-4 h-4 text-teal-400" />
                  <span>{afterPhotoFile ? 'Ganti Foto' : 'Jepret / Unggah Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setAfterPhotoFile(file);
                      const reader = new FileReader();
                      reader.onload = () => setAfterPhotoUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={afterPhotoUrl}
                    onChange={(e) => {
                      setAfterPhotoUrl(e.target.value);
                      setAfterPhotoFile(null);
                    }}
                    placeholder="Atau tempel link URL foto: https://..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              {afterPhotoUrl && (
                <div className="flex items-center gap-2.5 p-2 bg-zinc-950/80 border border-zinc-800 rounded-xl">
                  <img
                    src={afterPhotoUrl}
                    alt="Preview After"
                    className="w-12 h-12 object-cover rounded-lg border border-zinc-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-300 truncate">
                      {afterPhotoFile ? afterPhotoFile.name : 'Link foto sesudah terpasang'}
                    </p>
                    <p className="text-[10px] text-teal-400">
                      {afterPhotoFile ? '✓ Siap diunggah otomatis ke Google Drive (Audit_5R_5S)' : 'Pratinjau Foto Aktif'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAfterPhotoFile(null);
                      setAfterPhotoUrl('');
                    }}
                    className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg"
                    title="Hapus foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('leaderboard')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-teal-950"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Hasil Audit 5R</span>
            </button>
          </div>
        </form>
      )}

      {/* ─── SUB-TAB 3: RIWAYAT SESI AUDIT ─── */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {records.length === 0 ? (
            <div className="card p-12 text-center text-zinc-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-zinc-700" />
              <div className="text-sm font-bold text-zinc-400">Belum Ada Sesi Audit 5R Tercatat</div>
              <p className="text-xs text-zinc-600">Lakukan audit berkala 5 pilar untuk mengevaluasi kerapian area gudang.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">No Audit & Tanggal</th>
                      <th className="p-3.5">Zona & Divisi</th>
                      <th className="p-3.5">Auditor</th>
                      <th className="p-3.5">Breakdown 5 Pilar</th>
                      <th className="p-3.5">Total Skor</th>
                      <th className="p-3.5">Predikat Rating</th>
                      <th className="p-3.5">Poin Insentif</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {records.map((rec) => {
                      const rMeta = RATING_META[rec.rating];
                      return (
                        <tr key={rec.id} className="hover:bg-zinc-900/40 transition">
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-white text-xs">{rec.auditRefNumber}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">{rec.auditDate}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-white">{rec.zoneName}</div>
                            <div className="text-[10px] text-zinc-500">Divisi {rec.division}</div>
                          </td>

                          <td className="p-3.5 font-semibold text-zinc-300">
                            {rec.auditorName}
                          </td>

                          <td className="p-3.5 font-mono text-[10px] text-zinc-400">
                            <div>R1: {rec.scores.ringkas_seiri}% · R2: {rec.scores.rapi_seiton}%</div>
                            <div>R3: {rec.scores.resik_seiso}% · R4: {rec.scores.rawat_seiketsu}% · R5: {rec.scores.rajin_shitsuke}%</div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-black text-white font-mono text-sm">{rec.totalScore}%</span>
                          </td>

                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${rMeta.badgeCls}`}>
                              {rec.rating}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span className="font-black text-teal-400 font-mono">
                              +{rec.allocatedRewardPoints} PTS
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => Audit5sService.generateAudit5sReportPDF(rec)}
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition inline-flex items-center"
                              title="Cetak Berita Acara Audit 5R PDF"
                            >
                              <Printer className="w-4 h-4 text-teal-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SUB-TAB 4: MANAJEMEN MASTER ZONA GUDANG ─── */}
      {activeSubTab === 'manage_zones' && (
        <div className="space-y-6">
          {/* Add Zone Form */}
          <form onSubmit={handleAddZone} className="card p-5 space-y-4 bg-zinc-950 border-zinc-800 max-w-2xl">
            <h4 className="font-bold text-white text-xs flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>Daftarkan Wilayah / Zona Gudang Baru</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Nama Zona Gudang <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="Misal: Loading Dock 5-8, Racking Aisle C..."
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Tipe Wilayah <span className="text-rose-400">*</span>
                </label>
                <select
                  value={newZoneType}
                  onChange={(e) => setNewZoneType(e.target.value as ZoneType)}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-semibold"
                >
                  <option value="" disabled>-- Pilih Tipe Wilayah --</option>
                  <option value="loading_dock">Loading & Unloading Dock</option>
                  <option value="racking_aisle">Lorong Racking Rak</option>
                  <option value="charging_bay">Ruang Charging MHE</option>
                  <option value="staging_area">Area Staging / Buffer</option>
                  <option value="weighbridge_pos">Pos Timbangan</option>
                  <option value="office_area">Ruang Administrasi</option>
                  <option value="other">Wilayah Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Divisi Penanggung Jawab <span className="text-rose-400">*</span>
                </label>
                <select
                  value={newZoneDivision}
                  onChange={(e) => setNewZoneDivision(e.target.value)}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-semibold"
                >
                  <option value="" disabled>-- Pilih Divisi --</option>
                  {divisions.map((d) => (
                    <option key={d} value={d}>Divisi {d}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  PIC Personel Penanggung Jawab 5R
                </label>
                <select
                  value={newZonePicId}
                  onChange={(e) => setNewZonePicId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-semibold"
                >
                  <option value="">-- Pilih PIC Pekerja (Opsional) --</option>
                  {workers
                    .filter((w) => w.division.toUpperCase() !== 'SYSTEM')
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.employeeId}) — {w.division}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-teal-950"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Master Zona</span>
              </button>
            </div>
          </form>

          {/* Zones Table */}
          <div className="card overflow-hidden">
            <div className="p-3.5 bg-zinc-950 border-b border-zinc-800 font-bold text-xs text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>Daftar Seluruh Master Zona Gudang ({zones.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nama Zona</th>
                    <th className="p-3">Tipe Wilayah</th>
                    <th className="p-3">Divisi</th>
                    <th className="p-3">PIC Penanggung Jawab</th>
                    <th className="p-3">Skor Terakhir</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {zones.map((z) => (
                    <tr key={z.id} className="hover:bg-zinc-900/40">
                      <td className="p-3 font-bold text-white">{z.name}</td>
                      <td className="p-3 text-zinc-400">{ZONE_TYPE_META[z.zoneType]?.label}</td>
                      <td className="p-3 font-semibold text-zinc-300">{z.division}</td>
                      <td className="p-3 text-zinc-400">{z.picWorkerName || '-'}</td>
                      <td className="p-3 font-mono font-bold text-white">{z.lastAuditScore ? `${z.lastAuditScore}%` : '-'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteZone(z.id)}
                          className="p-1.5 bg-zinc-800 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-400 rounded-lg transition"
                          title="Hapus Zona"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
