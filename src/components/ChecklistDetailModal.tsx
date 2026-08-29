import React, { useState, useMemo } from 'react';
import { X, ShieldCheck, CheckSquare, Square, AlertCircle, Award, UserCheck } from 'lucide-react';

interface ChecklistDetailModalProps {
  onClose: () => void;
  onCompleteChecklist: () => void;
  streakDays: number;
  workerRole?: string;
  workerDivision?: string;
}

export interface ChecklistItem {
  id: string;
  category: 'Safety APD' | 'Kondisi Peralatan & Sistem' | 'Dokumen & Legal SOP';
  label: string;
  description: string;
}

export function getPreShiftChecklistForRole(role: string = '', division: string = ''): ChecklistItem[] {
  const r = role.toLowerCase();
  const d = division.toLowerCase();

  if (r.includes('forklift') || r.includes('operator')) {
    return [
      {
        id: 'fl-1',
        category: 'Safety APD',
        label: 'APD Lengkap (Helm Safety, Rompi High-Vis, Safety Shoes)',
        description: 'Wajib menggunakan helm proyek berstandar SNI, rompi reflektif 3M, dan sepatu safety berujung besi.',
      },
      {
        id: 'fl-2',
        category: 'Safety APD',
        label: 'Sabuk Pengaman (Seatbelt) & Sarung Tangan Grip',
        description: 'Sabuk pengaman mengunci sempurna di kursi operator dan sarung tangan anti-slip terpasang.',
      },
      {
        id: 'fl-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Sistem Hidrolik, Mast, & Rantai Elevator',
        description: 'Tidak ada kebocoran oli hidrolik pada silinder, rantai elevator tegang presisi, dan garpu (fork) tidak bengkok.',
      },
      {
        id: 'fl-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Pemeriksaan Ban, Rem Kaki, & Handbrake',
        description: 'Tekanan ban solid/pneumatik aman, minyak rem cukup, dan fungsi rem kaki/tangan responsif.',
      },
      {
        id: 'fl-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Lampu Utama, Klakson Siren, & Beacon Rotating Light',
        description: 'Siren peringatan mundur dan lampu rotator kuning menyala terang untuk keamanan pejalan kaki.',
      },
      {
        id: 'fl-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Tabung APAR 3kg & Kebersihan Kabin Operator',
        description: 'APAR terpasang di bodi forklift dengan segel utuh dan kabin bebas dari botol/benda mengganjal pedal.',
      },
      {
        id: 'fl-7',
        category: 'Dokumen & Legal SOP',
        label: 'SIO (Surat Izin Operasi) & Form Pre-Use Checklist',
        description: 'SIO Kemenaker fisik/digital masih aktif dan Logsheet Pre-Use Forklift terisi sebelum operasi.',
      },
      {
        id: 'fl-8',
        category: 'Dokumen & Legal SOP',
        label: 'Verifikasi Pallet Load Tag & Zona Racking',
        description: 'Kapasitas muatan sesuai Load Chart Forklift dan lokasi penempatan palet di area racking terverifikasi.',
      },
    ];
  }

  if (r.includes('admin') && (d.includes('wfg') || r.includes('wfg'))) {
    return [
      {
        id: 'wfg-1',
        category: 'Safety APD',
        label: 'Sepatu Safety & Rompi High-Vis Admin Gudang',
        description: 'Wajib mengenakan safety shoes dan rompi reflektif saat memasuki lorong atau staging WFG.',
      },
      {
        id: 'wfg-2',
        category: 'Safety APD',
        label: 'ID Card Badge & Ergonomi Workstation Admin',
        description: 'ID Card terpasang, posisi layar monitor setinggi mata (50-70cm), dan pencahayaan meja memadai.',
      },
      {
        id: 'wfg-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Konektivitas Terminal WMS / SAP Finished Goods',
        description: 'Aplikasi WMS logistik login normal, database terhubung, dan jaringan LAN/Wi-Fi stabil.',
      },
      {
        id: 'wfg-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Printer Thermal Label & Kertas Surat Jalan',
        description: 'Ketersediaan pita ribbon thermal, kertas label barcode, dan stok form Surat Jalan WFG mencukupi.',
      },
      {
        id: 'wfg-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Baterai & Fungsi Handheld Barcode Scanner WFG',
        description: 'Daya baterai scanner >80%, laser pemindai bersih, dan sinkronisasi data SKU presisi.',
      },
      {
        id: 'wfg-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kebersihan & Kerapihan 5S Meja Kerja Admin',
        description: 'Meja kerja bebas tumpukan berkas acak, kabel komputer tertata aman tanpa bahaya tersandung.',
      },
      {
        id: 'wfg-7',
        category: 'Dokumen & Legal SOP',
        label: 'Jadwal Rencana Outbound & Dispatching List',
        description: 'Jadwal kebaruan armada pengiriman hari ini telah terverifikasi dengan tim Planner/Sales.',
      },
      {
        id: 'wfg-8',
        category: 'Dokumen & Legal SOP',
        label: 'Form Berita Acara Selisih Stock & Opname Log',
        description: 'Form rekonsiliasi persediaan WFG siap digunakan jika ditemukan discrepancy fisik vs sistem.',
      },
    ];
  }

  if (r.includes('ekspedisi') || (r.includes('admin') && (d.includes('ekspedisi') || r.includes('ekspedisi')))) {
    return [
      {
        id: 'eks-1',
        category: 'Safety APD',
        label: 'Sepatu Safety & Rompi High-Vis Reflektif Ekspedisi',
        description: 'Wajib mengenakan safety shoes dan rompi reflektif saat berjalan di area parkir armada truk.',
      },
      {
        id: 'eks-2',
        category: 'Safety APD',
        label: 'ID Card Badge & Helm Safety Inspeksi Armada',
        description: 'Helm proyek K3 terpasang saat melakukan pemeriksaan segel kontainer dan kargo truk.',
      },
      {
        id: 'eks-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Aplikasi TMS (Transport Management System) & GPS Fleet',
        description: 'Sistem penjadwalan rute pengiriman TMS online dan indikator GPS kendaraan aktif.',
      },
      {
        id: 'eks-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Printer Cetak Manifest & Kertas Surat Jalan Ekspedisi',
        description: 'Printer lembar jalan berfungsi lancar dan stok blanko Surat Jalan mencukupi.',
      },
      {
        id: 'eks-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Verifikasi Fisik Segel Kontainer & Pengunci Pintu Boks',
        description: 'Kondisi fisik segel nomor baja utuh dan pengunci engsel boks kargo bekerja presisi.',
      },
      {
        id: 'eks-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Pemeriksaan Batas Beban Muatan (Bebas ODOL)',
        description: 'Berat total muatan sesuai batas JBB KIR untuk mencegah risiko kecelakaan rem blong.',
      },
      {
        id: 'eks-7',
        category: 'Dokumen & Legal SOP',
        label: 'Dokumen Transport Manifest, Surat Jalan, & SIM Driver',
        description: 'Kelengkapan dokumen pengiriman resmi dan keabsahan SIM B/SIO driver terverifikasi.',
      },
      {
        id: 'eks-8',
        category: 'Dokumen & Legal SOP',
        label: 'Form Checklist POD (Proof of Delivery) & Log Incident',
        description: 'Formulir verifikasi penerimaan barang dan log kejadian kendala armada di jalan siap.',
      },
    ];
  }

  if (r.includes('timbangan') || (r.includes('admin') && (d.includes('wrm') || r.includes('wrm')))) {
    return [
      {
        id: 'wrm-1',
        category: 'Safety APD',
        label: 'APD Area Timbangan (Helm, Safety Shoes, Respirator)',
        description: 'APD helm, sepatu safety, dan masker debu/respirator siap digunakan saat inspeksi truk curah.',
      },
      {
        id: 'wrm-2',
        category: 'Safety APD',
        label: 'Rompi High-Vis & Jas Hujan Reflektif Outdoor',
        description: 'Rompi reflektif untuk visibilitas malam/hujan di area terbuka jembatan timbangan WRM.',
      },
      {
        id: 'wrm-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kalibrasi Zero Balance Sensor Jembatan Timbangan',
        description: 'Indikator timbangan menampilkan 0.00 kg saat kosong dan Load Cell bebas dari sisa tanah/batu.',
      },
      {
        id: 'wrm-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kamera CCTV Plat Nomor Truk & Lampu Traffic',
        description: 'Kamera ANPR pencatat plat nomor dan indikator lampu hijau/merah jembatan timbangan normal.',
      },
      {
        id: 'wrm-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Alat Uji Kadar Air / Moisture Tester Bahan Baku',
        description: 'Alat ukur kadar air sampel bahan baku (WRM) telah terkalibrasi dan baterai terisi penuh.',
      },
      {
        id: 'wrm-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Printer Nota Penimbangan & Software Inbound WRM',
        description: 'Printer cetak Struk Bruto/Tara/Netto berfungsi lancar dan kertas struk mencukupi.',
      },
      {
        id: 'wrm-7',
        category: 'Dokumen & Legal SOP',
        label: 'Pemeriksaan Surat Jalan Supplier & Sertifikat Uji Tera',
        description: 'Surat Jalan Inbound Supplier lengkap dan Dokumen Sertifikat Tera Resmi Timbangan aktif.',
      },
      {
        id: 'wrm-8',
        category: 'Dokumen & Legal SOP',
        label: 'Form Berita Acara Kerusakan & Selisih Tonase (BAK)',
        description: 'Form BAK siap untuk mencatat klaim jika selisih berat penimbangan melebihi toleransi SOP (1%).',
      },
    ];
  }

  if (r.includes('checker')) {
    return [
      {
        id: 'chk-1',
        category: 'Safety APD',
        label: 'APD Loading Dock (Helm, Rompi, Safety Shoes, Sarung Tangan)',
        description: 'APD helm safety, rompi high-vis, sepatu safety berujung besi, dan sarung tangan grip terpasang.',
      },
      {
        id: 'chk-2',
        category: 'Safety APD',
        label: 'Masker Filter & Peluit Safety Sinyal',
        description: 'Masker debu dan peluit pengatur aba-aba manuver truk di area loading dock siap.',
      },
      {
        id: 'chk-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Mobile Handheld Scanner Barcode & Terminal WMS',
        description: 'Handheld scanner terhubung ke sistem WMS, laser presisi, dan baterai cadangan siap.',
      },
      {
        id: 'chk-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Papan Uji / Clipboard, Senter Inspection, & Meteran',
        description: 'Senter LED pemeriksaan fisik container dan alat ukur dimensi/volume barang tersedia.',
      },
      {
        id: 'chk-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kondisi Dock Leveler & Pintu Roll Up Dock',
        description: 'Plat Dock Leveler berfungsi naik-turun aman dan rantai pengaman dock terpasang.',
      },
      {
        id: 'chk-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Pembersihan Staging Area Loading Dock (5S)',
        description: 'Lantai dock bebas dari kayu palet pecah, paku, plastik, atau genangan oli yang licin.',
      },
      {
        id: 'chk-7',
        category: 'Dokumen & Legal SOP',
        label: 'Dokumen Packing List, Surat Jalan, & Checklist Unloading',
        description: 'Packing list penyesuaian SKU barang dan lembar inspeksi pembongkaran siap diisi.',
      },
      {
        id: 'chk-8',
        category: 'Dokumen & Legal SOP',
        label: 'Stiker/Tag Merah Karantina (Quarantine Hold Tag)',
        description: 'Stiker penandaan fisik barang rusak/cacat kemasan siap untuk pemisahan ke area karantina.',
      },
    ];
  }

  if (r.includes('pic') || r.includes('supervisor') || r.includes('head')) {
    return [
      {
        id: 'spv-1',
        category: 'Safety APD',
        label: 'APD Lengkap Pengawas Area Operasional Gudang',
        description: 'Helm safety supervisor, rompi reflektif high-vis, sepatu safety, dan ID Card Pengawas.',
      },
      {
        id: 'spv-2',
        category: 'Safety APD',
        label: 'Alat P3K Portable & Peluit Darurat',
        description: 'Kotak P3K mini portable lengkap dan alat komunikasi darurat siap di area kerja.',
      },
      {
        id: 'spv-3',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Patroli 5S & Bebas Ganjalan Jalur Evakuasi / APAR',
        description: 'Verifikasi seluruh lorong gudang, pintu darurat, dan titik APAR tidak terhalang palet.',
      },
      {
        id: 'spv-4',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Inspeksi Kesiapan Kunci & LOTO (Lockout/Tagout) MHE',
        description: 'Sistem penguncian peralatan rusak terpasang tag penanda aman.',
      },
      {
        id: 'spv-5',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Pemeriksaan Kebersihan & Ventilasi Exhaust Gudang Logistik',
        description: 'Kipas exhaust gudang dan penerangan selasar berfungsi optimal untuk kenyamanan kerja.',
      },
      {
        id: 'spv-6',
        category: 'Kondisi Peralatan & Sistem',
        label: 'Kesiapan Aplikasi Console Supervisor & Tablet Audit BIB',
        description: 'Tablet/laptop audit matriks kompetensi terhubung ke jaringan dan baterai penuh.',
      },
      {
        id: 'spv-7',
        category: 'Dokumen & Legal SOP',
        label: 'Materi & Lembar Absensi Briefing Safety Toolbox Talk (TBT)',
        description: 'Materi pengarahan K3 harian dan lembar hadir seluruh staf shift siap dipimpin.',
      },
      {
        id: 'spv-8',
        category: 'Dokumen & Legal SOP',
        label: 'Form Laporan Insiden K3 / Near-Miss & Shift Logsheet',
        description: 'Formulir investigasi cepat kecelakaan/hampir celaka siap jika terjadi keadaan darurat.',
      },
    ];
  }

  // General Driver & Transport Checklist
  return [
    {
      id: 'gen-1',
      category: 'Safety APD',
      label: 'APD Lengkap Driver & Rompi Reflektif',
      description: 'Helm proyek/topi driver, sepatu safety/sepatu tertutup, dan rompi reflektif K3.',
    },
    {
      id: 'gen-2',
      category: 'Safety APD',
      label: 'Kotak P3K & Segitiga Pengaman Darurat Armada',
      description: 'Perlengkapan P3K dasar dan 2 buah segitiga pengaman darurat tersedia di kabin.',
    },
    {
      id: 'gen-3',
      category: 'Kondisi Peralatan & Sistem',
      label: 'Pemeriksaan Ban, Tekanan Angin, & Ban Cadangan',
      description: 'Alur ban >2mm, tidak benjol, dan kondisi ban serep terisi angin aman.',
    },
    {
      id: 'gen-4',
      category: 'Kondisi Peralatan & Sistem',
      label: 'Fungsi Pengereman, Handbrake, & Minyak Rem',
      description: 'Rem kaki responsif, minyak rem cukup, dan rem tangan mengunci sempurna.',
    },
    {
      id: 'gen-5',
      category: 'Kondisi Peralatan & Sistem',
      label: 'Lampu Utama, Lampu Sein, Hazard, & Klakson',
      description: 'Seluruh sistem penerangan dan sinyal berfungsi terang dan kaca lampu bersih.',
    },
    {
      id: 'gen-6',
      category: 'Kondisi Peralatan & Sistem',
      label: 'Tali Strapping / Terpal / Kunci Pintu Boks Cargo',
      description: 'Peralatan pengikat muatan dan kunci/segel kompartemen kargo dalam kondisi kuat.',
    },
    {
      id: 'gen-7',
      category: 'Dokumen & Legal SOP',
      label: 'STNK, SIM, & SIO/KIR Kendaraan Aktif',
      description: 'Membawa dokumen legal fisik kendaraan dan lisensi mengemudi yang masih berlaku.',
    },
    {
      id: 'gen-8',
      category: 'Dokumen & Legal SOP',
      label: 'Form Pre-Shift Checklist & Surat Jalan Pengiriman',
      description: 'Surat Jalan resmi terverifikasi dan aplikasi GPS/POD Mobile siap digunakan.',
    },
  ];
}

export const ChecklistDetailModal: React.FC<ChecklistDetailModalProps> = ({
  onClose,
  onCompleteChecklist,
  streakDays,
  workerRole = 'Operator Forklift',
  workerDivision = 'WFG',
}) => {
  const checklistItems = useMemo(
    () => getPreShiftChecklistForRole(workerRole, workerDivision),
    [workerRole, workerDivision]
  );

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setErrorMsg(null);
  };

  const isAllChecked = checkedIds.size === checklistItems.length;
  const progressPercent = Math.round((checkedIds.size / checklistItems.length) * 100);

  const handleSubmit = () => {
    if (!isAllChecked) {
      setErrorMsg(`Semua ${checklistItems.length} item inspeksi WAJIB dicentang sebelum menyelesaikan Pre-Shift Check.`);
      return;
    }
    onCompleteChecklist();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in">
      <div className="card-elevated w-full max-w-lg p-6 relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Inspeksi Pre-Shift Harian</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                {workerRole}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Standar Inspeksi Spesifik Role ({workerDivision}) · Matriks Kompetensi K3
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800 shrink-0">
          <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
            <span className="text-zinc-300 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              Progress Inspeksi ({workerRole})
            </span>
            <span className={isAllChecked ? 'text-emerald-400' : 'text-indigo-400'}>
              {checkedIds.size} / {checklistItems.length} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isAllChecked ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Checklist items scrollable list */}
        <div className="overflow-y-auto space-y-2 pr-1 my-2 flex-1 scrollbar-thin">
          {checklistItems.map((item) => {
            const isChecked = checkedIds.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  isChecked
                    ? 'bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/15'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="mt-0.5 shrink-0 text-indigo-400">
                  {isChecked ? (
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5 text-zinc-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-bold ${
                        isChecked ? 'text-white' : 'text-zinc-200'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 mb-3 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
            <Award className="w-4 h-4" />
            <span>+30 Poin + Streak Harian</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isAllChecked}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isAllChecked
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Selesaikan Check (+30 Poin)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
