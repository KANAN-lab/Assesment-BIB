import React, { useState } from 'react';
import { BookOpen, X, Search, FileText, ExternalLink, ShieldCheck, Download, ChevronRight, CheckCircle2 } from 'lucide-react';

interface SopItem {
  id: string;
  title: string;
  category: 'K3 Safety' | 'Operasional' | 'Sistem' | 'Darurat';
  docNumber: string;
  revDate: string;
  summary: string;
  rules: string[];
}

const SOP_CATALOG: SopItem[] = [
  {
    id: 'sop-k3-01',
    title: 'SOP Pengoperasian Forklift & Material Handling',
    category: 'K3 Safety',
    docNumber: 'SOP-LOG-K3-001-R3',
    revDate: '15 Jan 2026',
    summary: 'Prosedur keselamatan pengoperasian forklift 2.5T-5T di area indoor/outdoor gudang.',
    rules: [
      'Pemeriksaan visual (Pre-use Inspection) wajib diisi sebelum kunci dihidupkan.',
      'Wajib menggunakan Helm Safety, Rompi High-Vis, dan Sepatu Safety berujung besi.',
      'Batas kecepatan maksimum dalam gudang adalah 10 km/jam.',
      'Dilarang mengangkat beban melebihi kapasitas nominal (Capacity Plate).',
      'Saat melintasi persimpangan atau blind spot, klakson wajib dibunyikan.',
    ],
  },
  {
    id: 'sop-k3-02',
    title: 'SOP Penanganan Bahan Berbahaya & Beracun (B3)',
    category: 'K3 Safety',
    docNumber: 'SOP-LOG-K3-004-R2',
    revDate: '01 Feb 2026',
    summary: 'Petunjuk penyimpanan, labeling, dan penanganan kargo kimia/pelumas di area logistik.',
    rules: [
      'Setiap kemasan B3 wajib memiliki MSDS (Material Safety Data Sheet) yang jelas.',
      'Penggunaan Respirator & Sarung Tangan Kimia wajib saat pemindahan drum.',
      'Tumpahan B3 wajib diserap menggunakan Spill Kit, bukan disiram air.',
    ],
  },
  {
    id: 'sop-op-01',
    title: 'SOP Loading & Unloading Armada Truk',
    category: 'Operasional',
    docNumber: 'SOP-LOG-OP-012-R4',
    revDate: '20 Jan 2026',
    summary: 'Alur kerja penerimaan dan pengeluaran barang di area Loading Dock A/B/C.',
    rules: [
      'Roda truk wajib diganjal (Wheel Chock) sebelum forklift masuk ke dalam bak truk.',
      'Verifikasi Dokumen Surat Jalan vs Surat Perintah Muat (SPM) wajib 100% cocok.',
      'Pekerja wajib melakukan inspeksi visual kondisi kemasan fisik pallet.',
    ],
  },
  {
    id: 'sop-em-01',
    title: 'Prosedur Tanggap Darurat & Evakuasi Bencana',
    category: 'Darurat',
    docNumber: 'SOP-LOG-EM-002-R1',
    revDate: '10 Feb 2026',
    summary: 'Langkah taktis penanganan kebakaran, gempa bumi, dan tumpahan B3 skala besar.',
    rules: [
      'Tekan tombol APAR/Alarm kebakaran terdekat dan teriak "KEBAKARAN!"',
      'Matikan arus listrik utama pada sakelar darurat.',
      'Evakuasi melalui Jalur Hijau menuju Assembly Point (Titik Kumpul Lapangan Depan).',
    ],
  },
];

interface SopLibraryModalProps {
  onClose: () => void;
}

export const SopLibraryModal: React.FC<SopLibraryModalProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedSop, setSelectedSop] = useState<SopItem | null>(SOP_CATALOG[0]);

  const categories = ['Semua', 'K3 Safety', 'Operasional', 'Darurat'];

  const filteredSops = SOP_CATALOG.filter((sop) => {
    const matchCat = selectedCategory === 'Semua' || sop.category === selectedCategory;
    const matchSearch =
      sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sop.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sop.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md animate-fade-in">
      <div className="card-elevated w-full max-w-4xl h-[85vh] p-6 flex flex-col relative border-cyan-500/20">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Perpustakaan SOP & Dokumen K3</h2>
              <p className="text-[10px] text-zinc-500">Standar Operasional Prosedur Logistik BIB Logistics</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search Controls */}
        <div className="py-3 flex flex-col sm:flex-row gap-3 border-b border-zinc-800 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari SOP, nomor dokumen, kata kunci..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body: Master Detail Layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4 pt-4">
          
          {/* Left Master List */}
          <div className="md:col-span-5 space-y-2 overflow-y-auto custom-scrollbar pr-1">
            {filteredSops.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-8">Dokumen tidak ditemukan.</p>
            ) : (
              filteredSops.map((sop) => (
                <div
                  key={sop.id}
                  onClick={() => setSelectedSop(sop)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedSop?.id === sop.id
                      ? 'bg-cyan-950/40 border-cyan-500/40 ring-1 ring-cyan-500/20'
                      : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300 uppercase">
                      {sop.category}
                    </span>
                    <span className="text-[9px] text-zinc-600 font-mono">{sop.docNumber}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{sop.title}</h4>
                  <p className="text-[10px] text-zinc-500 line-clamp-2 mt-1">{sop.summary}</p>
                </div>
              ))
            )}
          </div>

          {/* Right Detail Viewer */}
          <div className="md:col-span-7 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col overflow-y-auto custom-scrollbar">
            {selectedSop ? (
              <div className="space-y-4">
                <div className="border-b border-zinc-800 pb-3">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500 font-mono mb-1">
                    <span>{selectedSop.docNumber}</span>
                    <span>Revisi: {selectedSop.revDate}</span>
                  </div>
                  <h3 className="text-sm font-black text-white">{selectedSop.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{selectedSop.summary}</p>
                </div>

                <div>
                  <h5 className="text-xs font-black text-cyan-400 flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> Poin Kunci Kepatuhan (Compliance Points)
                  </h5>
                  <div className="space-y-2">
                    {selectedSop.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60">
                        <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-black shrink-0">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>Dokumen Resmi Terverifikasi HSEQ BIB Logistics</span>
                  <span className="flex items-center gap-1 text-cyan-400 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Berlaku Aktif 2026
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 py-12">
                <FileText className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-xs">Pilih dokumen SOP di sebelah kiri untuk melihat isi.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
