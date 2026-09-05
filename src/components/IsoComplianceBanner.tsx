import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, BookOpen, Lock, FileCheck, Award, Info, X, CheckCircle2 } from 'lucide-react';

interface IsoStandardCard {
  code: string;
  name: string;
  category: string;
  badge: string;
  icon: React.ElementType;
  accentColor: string;
  borderColor: string;
  badgeBg: string;
  description: string;
  operationalDetails: string[];
}

const ISO_CARDS: IsoStandardCard[] = [
  {
    code: 'ISO 45001:2018',
    name: 'Sistem Manajemen K3',
    category: 'Keselamatan Kerja',
    badge: 'Standard HSE Global',
    icon: ShieldCheck,
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    description: 'Menjamin perlindungan keselamatan fisik personel, monitoring alat pelindung diri, dan pencegahan insiden di area kerja.',
    operationalDetails: [
      'Pemeriksaan kelayakan armada & pra-shift inspection',
      'Distribusi dan monitoring kondisi fisik APD',
      'Pelaporan insiden K3 & pencegahan kecelakaan kerja',
    ],
  },
  {
    code: 'ISO 9001:2015',
    name: 'Sistem Manajemen Mutu',
    category: 'Konsistensi & Mutu',
    badge: 'Quality Standard',
    icon: BookOpen,
    accentColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500/60',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    description: 'Standarisasi alur kerja operasional pergudangan, evaluasi kompetensi berkelanjutan, dan budaya perbaikan kualitas kerja.',
    operationalDetails: [
      'Prosedur kerja standar (SOP) terpusat & kuis harian',
      'Evaluasi berimbang (BIB: Behavior, Integrity, Benchmark)',
      'Standar kebersihan & keteraturan 5R / 5S gudang',
    ],
  },
  {
    code: 'ISO/IEC 27001:2022',
    name: 'Keamanan Informasi (ISMS)',
    category: 'Keamanan Data',
    badge: 'Data Security',
    icon: Lock,
    accentColor: 'text-purple-400',
    borderColor: 'border-purple-500/30 hover:border-purple-500/60',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    description: 'Menjaga keamanan identitas personel, kerahasiaan data pencapaian, serta integritas rekam jejak aktivitas operasional.',
    operationalDetails: [
      'Pemisahan hak akses (Role-Based Access Control)',
      'Kerahasiaan kredensial akun & ganti password awal',
      'Pencatatan log aktivitas sistem yang permanen',
    ],
  },
  {
    code: 'SMK3 PP 50/2012',
    name: 'Regulasi K3 Nasional & Permenaker',
    category: 'Kepatuhan Legal RI',
    badge: 'Regulasi Kemnaker RI',
    icon: FileCheck,
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/30 hover:border-amber-500/60',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    description: 'Kepatuhan mutlak terhadap peraturan perundangan K3 Republik Indonesia dan sertifikasi operator alat berat (SIO MHE).',
    operationalDetails: [
      'Validasi sertifikat SIO Forklift & Reach Truck Kemnaker',
      'Penerapan SMK3 PP 50/2012 di area logistik',
      'Monitoring berkala masa berlaku lisensi operator',
    ],
  },
];

export const IsoComplianceBanner: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<IsoStandardCard | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedCard) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setSelectedCard(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedCard]);

  return (
    <div className="space-y-3 pt-2">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Standar Kepatuhan & Mutu Operasional Gudang</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Audit Ready
              </span>
            </h3>
            <p className="text-[10px] text-zinc-400">
              Operasional PT. DAYA ANUGRAH MULYA mengacu pada standar mutu internasional dan keselamatan ketenagakerjaan RI.
            </p>
          </div>
        </div>

        <span className="text-[10px] text-zinc-500 font-mono self-start sm:self-auto">
          PT. DAYA ANUGRAH MULYA
        </span>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ISO_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.code}
              onClick={() => setSelectedCard(card)}
              className={`card p-3.5 border transition cursor-pointer flex flex-col justify-between bg-zinc-900/60 hover:bg-zinc-850 ${card.borderColor}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0">
                    <Icon className={`w-3.5 h-3.5 ${card.accentColor}`} />
                  </div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${card.badgeBg}`}>
                    {card.badge}
                  </span>
                </div>

                <div className="mt-2.5">
                  <div className="text-xs font-bold text-white">{card.code}</div>
                  <div className="text-[11px] font-medium text-zinc-300">{card.name}</div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                <span>{card.category}</span>
                <span className="text-purple-400 font-semibold hover:underline flex items-center gap-0.5">
                  <span>Detail</span>
                  <Info className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Detail Pop-up with createPortal */}
      {selectedCard &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
            onClick={() => setSelectedCard(null)}
          >
            <div
              ref={modalContainerRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-iso-title"
              className="relative w-full max-w-md max-h-[88vh] sm:max-h-[90vh] m-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl overflow-y-auto custom-scrollbar animate-scale-up text-xs focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <selectedCard.icon className={`w-4 h-4 ${selectedCard.accentColor}`} />
                  </div>
                  <div>
                    <h4 id="modal-iso-title" className="font-bold text-white text-sm">
                      {selectedCard.code}
                    </h4>
                    <p className="text-[11px] text-zinc-400">{selectedCard.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  ref={closeBtnRef}
                  onClick={() => setSelectedCard(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  aria-label="Tutup dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-zinc-300 leading-relaxed text-[11px]">
                {selectedCard.description}
              </p>

              <div className="space-y-2 pt-1">
                <span className="text-zinc-400 font-semibold text-[11px] block">
                  Implementasi Operasional di Gudang:
                </span>
                <div className="space-y-1.5">
                  {selectedCard.operationalDetails.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedCard(null)}
                  className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

