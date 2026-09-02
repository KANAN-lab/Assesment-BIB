// src/components/SopManagementPanel.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Award,
  Layers,
  Sparkles,
  Truck,
  Flame,
  Scale,
  Boxes,
  ShieldCheck,
  X,
  Loader2,
  FileSpreadsheet,
  Download,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { SopModule, SopCategory, SopDifficulty, SopSlide, SopSlideType, SopPresentationFormat, SopHotspotPoint } from '../types/sop';
import { fetchAllSopModules } from '../lib/sopService';
import { supabase } from '../lib/supabaseClient';
import { SopSlideshowModal } from './SopSlideshowModal';

interface SopManagementPanelProps {
  currentAdminId?: string;
  onToast?: (msg: string) => void;
}

export const SopManagementPanel: React.FC<SopManagementPanelProps> = ({
  currentAdminId: _currentAdminId,
  onToast,
}) => {
  const [modules, setModules] = useState<SopModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [previewingModule, setPreviewingModule] = useState<SopModule | null>(null);

  // Create Module Modal State & Wizard
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creationStep, setCreationStep] = useState<1 | 2>(1); // 1: Pilih Format, 2: Form Builder
  const [formFormat, setFormFormat] = useState<SopPresentationFormat>('micro_deck');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Common Form Fields
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<SopCategory>('K3 & Safety');
  const [formDifficulty, setFormDifficulty] = useState<SopDifficulty>('Beginner');
  const [formTargetDivs, setFormTargetDivs] = useState<string[]>(['ALL']);
  const [formTargetRoles, setFormTargetRoles] = useState<string[]>(['ALL']);
  const [formEstMinutes, setFormEstMinutes] = useState(3);
  const [formPoints, setFormPoints] = useState(50);
  const [formIsMandatory, setFormIsMandatory] = useState(false);

  // Standard Micro-Deck Form States
  const [formSlide1Title, setFormSlide1Title] = useState('Instruksi Langkah Kerja Standar');
  const [formSlide1Subtitle, setFormSlide1Subtitle] = useState('Patuhi urutan langkah kerja operasional aman');
  const [formSlide1Step1, setFormSlide1Step1] = useState('Pemeriksaan fisik awal peralatan dan area kerja');
  const [formSlide1Step2, setFormSlide1Step2] = useState('Eksekusi penanganan muatan sesuai kaidah SOP');
  const [formSlide1Step3, setFormSlide1Step3] = useState('Pengecekan akhir dan penataan kembali peralatan');

  const [formSlide2DoTitle, setFormSlide2DoTitle] = useState('Selalu gunakan APD lengkap');
  const [formSlide2DoText, setFormSlide2DoText] = useState('Gunakan helm safety, rompi reflektif, dan safety shoes saat berada di area logistik.');
  const [formSlide2DontTitle, setFormSlide2DontTitle] = useState('Dilarang mengabaikan rambu K3');
  const [formSlide2DontText, setFormSlide2DontText] = useState('Dilarang melintas di bawah muatan terangkat atau mengoperasikan alat tanpa lisensi resmi.');

  // WMS / App Click Simulator States
  const [simImageUrl, setSimImageUrl] = useState('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80');
  const [simTaskInstruction, setSimTaskInstruction] = useState('Klik tombol [PUTAWAY STORAGE] di layar untuk melanjutkan');
  const [simTargetX, setSimTargetX] = useState(25);
  const [simTargetY, setSimTargetY] = useState(45);
  const [simTargetW, setSimTargetW] = useState(50);
  const [simTargetH, setSimTargetH] = useState(20);
  const [simHintText, setSimHintText] = useState('Klik pada tombol menu tengah berbingkai hijau.');
  const [simHighlightLabel, setSimHighlightLabel] = useState('👉 [PUTAWAY]');
  const [simSuccessMsg, setSimSuccessMsg] = useState('Tepat! Menu Putaway Storage berhasil dibuka.');

  // Spot-the-Mistake States
  const [spotImageUrl, setSpotImageUrl] = useState('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80');
  const [spotPrompt, setSpotPrompt] = useState('Temukan 1 tumpukan palet yang miring atau melebihi batas (overhang)!');
  const [spotTargetX, setSpotTargetX] = useState(55);
  const [spotTargetY, setSpotTargetY] = useState(40);
  const [spotRadius, setSpotRadius] = useState(15);
  const [spotHazardName, setSpotHazardName] = useState('Palet Miring & Overhang (> 10cm)');
  const [spotExplanation, setSpotExplanation] = useState('Muatan kardus melebihi bibir palet kayu tanpa pengikat berisiko jatuh menimpa orang.');
  const [spotTimeLimit, setSpotTimeLimit] = useState(20);

  // Document Reader States
  const [docFileName, setDocFileName] = useState('SOP-Instruksi-Kerja-Logistik.pdf');
  const [docSummaryText, setDocSummaryText] = useState('Ringkasan SOP: Wajib melakukan pemeriksaan visual 360 derajat sebelum mengoperasikan alat.');
  const [docTotalPages, setDocTotalPages] = useState(3);

  // Visual Hotspot States
  const [hotspotImageUrl, setHotspotImageUrl] = useState('https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80');
  const [hotspotsList, setHotspotsList] = useState<SopHotspotPoint[]>([
    { id: 'hs-1', xPercent: 30, yPercent: 40, label: 'Garpu Forklift (Forks)', description: 'Periksa tidak ada retak struktural atau ketebalan berkurang > 10%.', status: 'critical' },
    { id: 'hs-2', xPercent: 70, yPercent: 60, label: 'Roda & Ban', description: 'Pastikan ban padat tidak sobek dan baut roda terkunci kencang.', status: 'check' },
  ]);

  // Quiz Checkpoint (Universal across all formats)
  const [formQuizQuestion, setFormQuizQuestion] = useState('Apa tujuan utama pelaksanaan inspeksi pre-use pada peralatan kerja?');
  const [formQuizOptA, setFormQuizOptA] = useState('Memastikan alat dalam kondisi aman sebelum digunakan');
  const [formQuizOptB, setFormQuizOptB] = useState('Hanya formalitas administrasi');
  const [formQuizOptC, setFormQuizOptC] = useState('Menghabiskan sisa waktu shift');
  const [formQuizOptD, setFormQuizOptD] = useState('Menunggu instruksi rekan kerja');
  const [formQuizCorrectIdx, setFormQuizCorrectIdx] = useState(0);
  const [formQuizExplanation, setFormQuizExplanation] = useState('Inspeksi pre-use wajib dilakukan untuk mendeteksi potensi kerusakan alat sedini mungkin demi mencegah kecelakaan kerja fatal.');

  // Load modules
  const loadModules = async () => {
    setLoading(true);
    try {
      const data = await fetchAllSopModules();
      setModules(data);
    } catch (e) {
      console.error('Error loading SOP modules in admin:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  // Filter modules
  const filteredModules = modules.filter((m) => {
    const matchSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'Semua' || m.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // AI Auto-Fill Helper based on selected format
  const handleAiAutoFill = () => {
    if (formFormat === 'interactive_simulator') {
      setFormCode(`SOP-WMS-${Math.floor(Math.random() * 90 + 10)}`);
      setFormTitle('Simulasi WMS: Pemindaian Barcode Inbound & Putaway');
      setFormDesc('Latihan interaktif pengoperasian menu sistem WMS untuk operator penerimaan barang.');
      setFormCategory('Warehouse & Staging');
      setSimTaskInstruction('Klik tombol [F2 - SCAN PALLET] untuk memindai barcode surat jalan');
      setSimHighlightLabel('👉 [F2 SCAN]');
      setSimHintText('Perhatikan area tombol menu bawah berwarna hijau terang.');
      setSimSuccessMsg('Tepat sekali! Sistem siap membaca barcode muatan.');
      setFormQuizQuestion('Apa akibatnya jika operator salah memasukkan nomor lokasi rak di sistem WMS?');
      setFormQuizOptA('Terjadi selisih stok (discrepancy) saat proses picking barang');
      setFormQuizOptB('Sistem WMS otomatis memperbaikinya sendiri');
      setFormQuizOptC('Tidak berpengaruh apapun');
      setFormQuizOptD('Barang langsung otomatis hilang');
      setFormQuizCorrectIdx(0);
      setFormQuizExplanation('Lokasi rak yang keliru menyebabkan picker gagal menemukan barang fisik sehingga menghambat pengiriman.');
    } else if (formFormat === 'spot_the_mistake') {
      setFormCode(`SOP-SPOT-${Math.floor(Math.random() * 90 + 10)}`);
      setFormTitle('Hazard Hunt: Deteksi Anomali Penumpukan Palet & APD');
      setFormDesc('Uji kejelian operator dalam mengidentifikasi kondisi tidak aman di area gudang.');
      setFormCategory('K3 & Safety');
      setSpotPrompt('Temukan 1 muatan palet kardus yang miring dan berisiko roboh!');
      setSpotHazardName('Tumpukan Miring Overhang (> 10cm)');
      setSpotExplanation('Kardus tidak di-wrapping dengan kencang dan miring melebihi 2 derajat berisiko fatal runtuh.');
      setFormQuizQuestion('Berapa batas tinggi tumpukan palet kardus yang aman di area staging?');
      setFormQuizOptA('Maksimum 3 palet atau sesuai garis marka batas tinggi dinding');
      setFormQuizOptB('Setinggi jangkauan forklift tanpa batas');
      setFormQuizOptC('Bebas sesuai sisa ruang kosong');
      setFormQuizOptD('Maksimum 10 palet');
      setFormQuizCorrectIdx(0);
      setFormQuizExplanation('Batas tumpukan 3 palet menjaga kestabilan titik gravitasi muatan.');
    } else if (formFormat === 'visual_hotspot') {
      setFormCode(`SOP-MHE-${Math.floor(Math.random() * 90 + 10)}`);
      setFormTitle('Diagram Inspeksi 360 Pre-Use Forklift');
      setFormDesc('Panduan interaktif titik kritis pemeriksaan harian unit forklift sebelum digunakan.');
      setFormCategory('Operasional MHE');
    } else if (formFormat === 'document_reader') {
      setFormCode(`SOP-DOC-${Math.floor(Math.random() * 90 + 10)}`);
      setFormTitle('Instruksi Kerja Resmi: Prosedur Tanggap Darurat & Tumpahan');
      setFormDesc('Modul digital dokumen SOP penanganan tumpahan bahan kimia berbahaya (Spill Kit).');
      setFormCategory('Tanggap Darurat & Lingkungan');
    } else {
      setFormCode(`SOP-K3-${Math.floor(Math.random() * 90 + 10)}`);
      setFormTitle('Tata Tertib K3 & APD Standar Gudang');
      setFormDesc('Pedoman wajib kepatuhan keselamatan kerja dan penggunaan APD di area logistik.');
      setFormCategory('K3 & Safety');
    }
    onToast?.('✨ Konten modul berhasil di-generate oleh Gappy AI!');
  };

  // Handle Save New SOP Module
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formTitle.trim()) {
      setFormError('Kode SOP dan Judul Modul wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      let generatedSlides: SopSlide[] = [];

      if (formFormat === 'interactive_simulator') {
        generatedSlides = [
          {
            id: `sl-${Date.now()}-1`,
            slideNumber: 1,
            slideType: 'interactive_simulator',
            title: `Simulasi: ${formTitle}`,
            subtitle: formDesc,
            audioNarrationText: `Lakukan langkah simulasi: ${simTaskInstruction}.`,
            imageUrl: simImageUrl,
            simulatorConfig: {
              taskInstruction: simTaskInstruction,
              targetXPercent: simTargetX,
              targetYPercent: simTargetY,
              targetWidthPercent: simTargetW,
              targetHeightPercent: simTargetH,
              hintText: simHintText,
              highlightLabel: simHighlightLabel,
              successMessage: simSuccessMsg,
            },
          },
          {
            id: `sl-${Date.now()}-2`,
            slideNumber: 2,
            slideType: 'quiz_checkpoint',
            title: 'Kuis Evaluasi Pemahaman Simulasi',
            subtitle: 'Verifikasi pemahaman alur aplikasi sistem',
            audioNarrationText: `Uji pemahaman Anda: ${formQuizQuestion}`,
            quiz: {
              id: `q-${Date.now()}`,
              question: formQuizQuestion,
              options: [formQuizOptA, formQuizOptB, formQuizOptC, formQuizOptD],
              correctAnswerIndex: formQuizCorrectIdx,
              explanation: formQuizExplanation,
              points: formPoints,
            },
          }
        ];
      } else if (formFormat === 'spot_the_mistake') {
        generatedSlides = [
          {
            id: `sl-${Date.now()}-1`,
            slideNumber: 1,
            slideType: 'spot_the_mistake',
            title: `Hazard Hunt: ${formTitle}`,
            subtitle: formDesc,
            audioNarrationText: `Perhatikan gambar dengan cermat. ${spotPrompt}`,
            imageUrl: spotImageUrl,
            spotMistakeConfig: {
              challengePrompt: spotPrompt,
              targetXPercent: spotTargetX,
              targetYPercent: spotTargetY,
              toleranceRadiusPercent: spotRadius,
              hazardName: spotHazardName,
              explanation: spotExplanation,
              timeLimitSeconds: spotTimeLimit,
            },
          },
          {
            id: `sl-${Date.now()}-2`,
            slideNumber: 2,
            slideType: 'quiz_checkpoint',
            title: 'Kuis Evaluasi K3 Hazard Hunt',
            subtitle: 'Verifikasi tindakan pencegahan bahaya',
            audioNarrationText: `Uji pemahaman Anda: ${formQuizQuestion}`,
            quiz: {
              id: `q-${Date.now()}`,
              question: formQuizQuestion,
              options: [formQuizOptA, formQuizOptB, formQuizOptC, formQuizOptD],
              correctAnswerIndex: formQuizCorrectIdx,
              explanation: formQuizExplanation,
              points: formPoints,
            },
          }
        ];
      } else if (formFormat === 'visual_hotspot') {
        generatedSlides = [
          {
            id: `sl-${Date.now()}-1`,
            slideNumber: 1,
            slideType: 'interactive_hotspot',
            title: `Diagram Inspeksi: ${formTitle}`,
            subtitle: formDesc,
            content: 'Ketuk setiap titik pin interaktif pada gambar untuk melihat detail inspeksi komponen.',
            audioNarrationText: `Periksa seluruh titik inspeksi pada diagram.`,
            imageUrl: hotspotImageUrl,
            hotspots: hotspotsList,
          },
          {
            id: `sl-${Date.now()}-2`,
            slideNumber: 2,
            slideType: 'quiz_checkpoint',
            title: 'Kuis Evaluasi Inspeksi Diagram',
            subtitle: 'Verifikasi pemahaman komponen',
            audioNarrationText: `Uji pemahaman Anda: ${formQuizQuestion}`,
            quiz: {
              id: `q-${Date.now()}`,
              question: formQuizQuestion,
              options: [formQuizOptA, formQuizOptB, formQuizOptC, formQuizOptD],
              correctAnswerIndex: formQuizCorrectIdx,
              explanation: formQuizExplanation,
              points: formPoints,
            },
          }
        ];
      } else if (formFormat === 'document_reader') {
        generatedSlides = [
          {
            id: `sl-${Date.now()}-1`,
            slideNumber: 1,
            slideType: 'document_reader',
            title: `Dokumen: ${formTitle}`,
            subtitle: `Berkas: ${docFileName}`,
            content: docSummaryText,
            audioNarrationText: `Dokumen resmi ${docFileName}. ${docSummaryText}`,
            documentConfig: {
              fileName: docFileName,
              currentPage: 1,
              totalPdfPages: docTotalPages,
              extractedSummaryText: docSummaryText,
            },
          },
          {
            id: `sl-${Date.now()}-2`,
            slideNumber: 2,
            slideType: 'quiz_checkpoint',
            title: 'Kuis Evaluasi Pemahaman Dokumen',
            subtitle: 'Uji poin kepatuhan SOP resmi',
            audioNarrationText: `Uji pemahaman Anda: ${formQuizQuestion}`,
            quiz: {
              id: `q-${Date.now()}`,
              question: formQuizQuestion,
              options: [formQuizOptA, formQuizOptB, formQuizOptC, formQuizOptD],
              correctAnswerIndex: formQuizCorrectIdx,
              explanation: formQuizExplanation,
              points: formPoints,
            },
          }
        ];
      } else {
        // Standard Micro-Deck
        generatedSlides = [
          {
            id: `sl-${Date.now()}-1`,
            slideNumber: 1,
            slideType: 'step_instruction',
            title: formSlide1Title,
            subtitle: formSlide1Subtitle,
            audioNarrationText: `Langkah kerja ${formTitle}. ${formSlide1Step1}. ${formSlide1Step2}. ${formSlide1Step3}.`,
            steps: [
              { stepNumber: 1, title: 'Langkah 1: Persiapan', description: formSlide1Step1, iconName: 'CheckSquare' },
              { stepNumber: 2, title: 'Langkah 2: Operasional', description: formSlide1Step2, iconName: 'Play' },
              { stepNumber: 3, title: 'Langkah 3: Verifikasi', description: formSlide1Step3, iconName: 'CheckCircle2' },
            ],
          },
          {
            id: `sl-${Date.now()}-2`,
            slideNumber: 2,
            slideType: 'dos_and_donts',
            title: 'Kaidah Aman (DO) vs Larangan Kritis (DON\'T)',
            subtitle: 'Pedoman keselamatan wajib bagi seluruh staf operasional',
            audioNarrationText: `Perhatikan aturan aman dan larangan. Wajib: ${formSlide2DoTitle}. Dilarang: ${formSlide2DontTitle}.`,
            dosAndDonts: [
              {
                doTitle: formSlide2DoTitle,
                doText: formSlide2DoText,
                doTip: 'Patuhi kaidah K3 setiap saat.',
                dontTitle: formSlide2DontTitle,
                dontText: formSlide2DontText,
                dontWarning: 'Pelanggaran dapat dikenakan sanksi K3.',
              },
            ],
          },
          {
            id: `sl-${Date.now()}-3`,
            slideNumber: 3,
            slideType: 'quiz_checkpoint',
            title: 'Kuis Evaluasi Pemahaman SOP',
            subtitle: 'Jawab pertanyaan untuk memverifikasi pemahaman Anda',
            audioNarrationText: `Uji pemahaman Anda: ${formQuizQuestion}`,
            quiz: {
              id: `q-${Date.now()}`,
              question: formQuizQuestion,
              options: [formQuizOptA, formQuizOptB, formQuizOptC, formQuizOptD],
              correctAnswerIndex: formQuizCorrectIdx,
              explanation: formQuizExplanation,
              points: formPoints,
            },
          },
        ];
      }

      const newModuleRecord: any = {
        id: `sop-${formCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        code: formCode.trim().toUpperCase(),
        title: formTitle.trim(),
        description: formDesc.trim() || 'Standar operasional prosedur resmi PT DAM Indonesia.',
        category: formCategory,
        difficulty: formDifficulty,
        presentation_format: formFormat,
        target_divisions: formTargetDivs,
        target_roles: formTargetRoles,
        estimated_minutes: formEstMinutes,
        points_reward: formPoints,
        badge_icon: formFormat === 'interactive_simulator' ? 'Smartphone' : formFormat === 'spot_the_mistake' ? 'ShieldAlert' : 'BookOpen',
        slides_data: generatedSlides,
        is_mandatory: formIsMandatory,
        deadline_days: 14,
        version: 'v1.0',
        is_active: true,
        author: 'Supervisor / Admin Studio',
      };

      // 1. Try Supabase Insert
      const { error } = await supabase.from('sop_modules').insert([newModuleRecord]);
      if (error) {
        console.warn('Supabase insert fallback to local custom cache:', error);
      }

      // 2. Save locally
      const localCustom = JSON.parse(localStorage.getItem('bib_sop_custom_modules_v2') || '[]');
      localCustom.push({
        ...newModuleRecord,
        presentationFormat: formFormat,
        targetDivisions: formTargetDivs,
        targetRoles: formTargetRoles,
        estimatedMinutes: formEstMinutes,
        pointsReward: formPoints,
        slides: generatedSlides,
        isMandatory: formIsMandatory,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      localStorage.setItem('bib_sop_custom_modules_v2', JSON.stringify(localCustom));

      onToast?.(`Modul SOP ${formCode.toUpperCase()} (${formFormat}) berhasil dibuat!`);
      setIsCreateModalOpen(false);
      setCreationStep(1);
      loadModules();
    } catch (err: any) {
      setFormError(err.message || 'Gagal membuat modul SOP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete SOP module
  const handleDeleteModule = async (item: SopModule) => {
    if (!window.confirm(`Hapus modul ${item.code} (${item.title})?`)) return;

    try {
      await supabase.from('sop_modules').delete().eq('id', item.id);
      // Clean from local
      const localCustom = JSON.parse(localStorage.getItem('bib_sop_custom_modules_v2') || '[]');
      const filtered = localCustom.filter((m: any) => m.id !== item.id);
      localStorage.setItem('bib_sop_custom_modules_v2', JSON.stringify(filtered));

      setModules((prev) => prev.filter((m) => m.id !== item.id));
      onToast?.(`Modul SOP ${item.code} berhasil dihapus.`);
    } catch (e: any) {
      onToast?.(`Gagal menghapus: ${e.message}`);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Kode SOP', 'Judul Modul', 'Kategori', 'Tingkat', 'Divisi Target', 'Est Durasi (Menit)', 'Poin Reward', 'Wajib Kepatuhan'];
    const rows = modules.map((m) => [
      m.code,
      `"${m.title.replace(/"/g, '""')}"`,
      m.category,
      m.difficulty,
      `"${m.targetDivisions.join(', ')}"`,
      m.estimatedMinutes,
      m.pointsReward,
      m.isMandatory ? 'YA' : 'TIDAK',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Katalog_SOP_Logistik_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast?.('Ekspor katalog SOP CSV berhasil diunduh.');
  };

  const CATEGORIES = [
    'Semua',
    'Operasional MHE',
    'Warehouse & Staging',
    'K3 & Safety',
    'Inbound & Timbangan',
    '5S & Continuous Improvement',
    'Outbound & Ekspedisi',
  ];

  return (
    <div className="card p-5 space-y-4">
      {/* ─── 1. HEADER & ACTION ROW ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h3 className="font-bold text-white text-xs flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            Manajemen Modul SOP Micro-Deck & K3 Academy ({modules.length} Decks)
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Kelola materi pelatihan slideshow mikro, kaidah K3, kuis checkpoint, dan kepatuhan staf operasional
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition"
            title="Ekspor daftar modul SOP ke file CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-purple-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Modul SOP Baru</span>
          </button>
        </div>
      </div>

      {/* ─── 2. SEARCH & FILTER ROW ─── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode SOP, judul, atau kata kunci instruksi..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 custom-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3. MODULE LIST TABLE / CARDS ─── */}
      {loading ? (
        <div className="text-center py-16 text-xs text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" />
          Memuat daftar modul SOP...
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-xs border border-zinc-800 rounded-xl bg-zinc-950/40">
          Tidak ada modul SOP yang cocok dengan filter pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredModules.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700 transition space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] font-bold bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800/60">
                    {item.code}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.isMandatory && (
                      <span className="bg-amber-950/80 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-800/60 uppercase">
                        Wajib
                      </span>
                    )}
                    <span className="bg-zinc-800 text-zinc-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {item.slides.length} Slide
                    </span>
                  </div>
                </div>

                <h4 className="font-bold text-white text-xs mb-1 leading-snug">{item.title}</h4>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-2">
                  {item.description}
                </p>

                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <span className="bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300 font-semibold">
                    {item.category}
                  </span>
                  <span className="text-zinc-500">•</span>
                  <span>~{item.estimatedMinutes} menit</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-amber-400 font-bold">+{item.pointsReward} PTS</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewingModule(item)}
                  className="flex-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Preview Slide</span>
                </button>

                <button
                  onClick={() => handleDeleteModule(item)}
                  className="p-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg transition"
                  title="Hapus Modul SOP"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── 4. CREATE NEW SOP MODULE MODAL PORTAL ─── */}
      {isCreateModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in">
            <div className="card-elevated w-full max-w-3xl max-h-[92vh] flex flex-col p-5 sm:p-6 relative border border-zinc-700/80 shadow-2xl overflow-y-auto custom-scrollbar">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {creationStep === 1 ? 'Pilih Konsep Modul Pelatihan Interaktif' : `Studio Pembuatan SOP (${formFormat.toUpperCase()})`}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {creationStep === 1
                        ? 'Pilih 1 dari 5 format interaktif yang paling sesuai dengan materi pelatihan Anda'
                        : 'Lengkapi instruksi kerja, koordinat target interaktif, dan kuis pemahaman'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setCreationStep(1);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {/* ─── STEP 1: PILIH FORMAT KONSEP ─── */}
              {creationStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Concept 1: Micro-Deck */}
                    <div
                      onClick={() => setFormFormat('micro_deck')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        formFormat === 'micro_deck'
                          ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-900/30'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">📖</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-900 text-purple-200">
                            Paling Populer
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-xs mb-1">Micro-Deck Standar</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Slide instruksi langkah berurutan, komparasi visual DOs & DON'Ts, narasi audio TTS, dan kuis evaluasi.
                        </p>
                      </div>
                      <span className="text-[10px] text-purple-400 font-semibold mt-3">Cocok untuk: SOP Operasional & Kaidah APD</span>
                    </div>

                    {/* Concept 2: WMS Click Simulator */}
                    <div
                      onClick={() => setFormFormat('interactive_simulator')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        formFormat === 'interactive_simulator'
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-900/30'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">🎮</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-900 text-indigo-200">
                            Interaktif
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-xs mb-1">WMS / App Click Simulator</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Screenshot aplikasi WMS / Handheld scanner dengan zona target klik. Pekerja harus menekan tombol yang tepat untuk lolos.
                        </p>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-semibold mt-3">Cocok untuk: Tutorial Aplikasi & Scanner</span>
                    </div>

                    {/* Concept 3: Spot the Mistake */}
                    <div
                      onClick={() => setFormFormat('spot_the_mistake')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        formFormat === 'spot_the_mistake'
                          ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-900/30'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">🔍</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900 text-amber-200">
                            Game K3
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-xs mb-1">Spot-the-Mistake / Hazard Hunt</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Tantangan kejelian visual mencari anomali tumpukan palet, kerusakan APD, atau pelanggaran K3 pada foto lapangan dengan timer.
                        </p>
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold mt-3">Cocok untuk: Kampanye Keselamatan & Hazard</span>
                    </div>

                    {/* Concept 4: Visual Hotspot */}
                    <div
                      onClick={() => setFormFormat('visual_hotspot')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        formFormat === 'visual_hotspot'
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-900/30'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">📌</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-200">
                            Diagram 360
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-xs mb-1">Visual Hotspot Diagram</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Foto alat/mesin resolusi tinggi dengan pin titik inspeksi berkedip yang menampilkan instruksi saat diketuk.
                        </p>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold mt-3">Cocok untuk: Pre-Use Inspection MHE/Forklift</span>
                    </div>

                    {/* Concept 5: Document Reader */}
                    <div
                      onClick={() => setFormFormat('document_reader')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between sm:col-span-2 ${
                        formFormat === 'document_reader'
                          ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-900/30'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">📄</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900 text-blue-200">
                            Konverter Dokumen
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-xs mb-1">PDF & PPT Smart Reader</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Konversi dokumen PDF / slide presentasi ke antarmuka reader digital yang dilengkapi narasi audio AI dan kuis pemahaman otomatis.
                        </p>
                      </div>
                      <span className="text-[10px] text-blue-400 font-semibold mt-3">Cocok untuk: Pedoman Kebijakan & Regulasi Resmi</span>
                    </div>

                  </div>

                  {/* Next Step Button */}
                  <div className="flex justify-end pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setCreationStep(2)}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-purple-900/40 flex items-center gap-2"
                    >
                      <span>Lanjutkan ke Pengaturan Konten</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ─── STEP 2: FORM CONTENT BUILDER ─── */}
              {creationStep === 2 && (
                <form onSubmit={handleCreateModule} className="space-y-4">
                  
                  {/* AI Quick Generator Bar */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/30">
                    <div className="flex items-center gap-2 text-xs">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                      <span className="text-zinc-200 font-semibold">Gunakan Gappy AI untuk mengisi template format ini secara otomatis</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAiAutoFill}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition shadow flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>✨ Auto-Fill via AI</span>
                    </button>
                  </div>

                  {/* ── Section 1: Basic Module Info ── */}
                  <div className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                    <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                      1. Informasi Dasar Modul
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Kode SOP *</label>
                        <input
                          type="text"
                          value={formCode}
                          onChange={(e) => setFormCode(e.target.value)}
                          placeholder="cth. SOP-WMS-02"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-purple-500"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">Judul Modul SOP *</label>
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="cth. Simulasi Konfirmasi Putaway Inbound Scanner"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Kategori</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value as SopCategory)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                          required
                        >
                          <option value="K3 & Safety">K3 & Safety</option>
                          <option value="Operasional MHE">Operasional MHE</option>
                          <option value="Warehouse & Staging">Warehouse & Staging</option>
                          <option value="Inbound & Timbangan">Inbound & Timbangan</option>
                          <option value="Outbound & Ekspedisi">Outbound & Ekspedisi</option>
                          <option value="5S & Continuous Improvement">5S & Continuous Improvement</option>
                          <option value="Tanggap Darurat & Lingkungan">Tanggap Darurat & Lingkungan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Tingkat Kesulitan</label>
                        <select
                          value={formDifficulty}
                          onChange={(e) => setFormDifficulty(e.target.value as SopDifficulty)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                          required
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Mandatory Compliance">Mandatory Compliance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Poin Reward (PTS)</label>
                        <input
                          type="number"
                          min="10"
                          max="500"
                          value={formPoints}
                          onChange={(e) => setFormPoints(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Deskripsi Singkat</label>
                      <textarea
                        rows={2}
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        placeholder="Jelaskan tujuan dan ruang lingkup instruksi SOP ini..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* ── Section 2A: BUILDER FORMAT INTERACTIVE SIMULATOR ── */}
                  {formFormat === 'interactive_simulator' && (
                    <div className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-indigo-500/30">
                      <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🎮 2. Konfigurasi Screenshot & Zona Target Klik</span>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">URL Gambar Screenshot WMS / Handheld</label>
                        <input
                          type="text"
                          value={simImageUrl}
                          onChange={(e) => setSimImageUrl(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>

                      {/* Interactive Visual Hitbox Coordinate Picker */}
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Klik langsung pada gambar di bawah untuk memposisikan kotak tombol target:
                        </label>
                        <div
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                            const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                            setSimTargetX(Math.max(0, Math.min(80, clickX - Math.round(simTargetW / 2))));
                            setSimTargetY(Math.max(0, Math.min(80, clickY - Math.round(simTargetH / 2))));
                          }}
                          className="relative rounded-xl overflow-hidden border-2 border-indigo-500/50 bg-black cursor-crosshair max-h-56 flex items-center justify-center select-none"
                        >
                          <img src={simImageUrl} alt="Simulator preview" className="w-full h-full object-cover max-h-56 pointer-events-none" />
                          <div
                            style={{
                              left: `${simTargetX}%`,
                              top: `${simTargetY}%`,
                              width: `${simTargetW}%`,
                              height: `${simTargetH}%`,
                            }}
                            className="absolute border-2 border-emerald-400 bg-emerald-500/25 rounded flex items-center justify-center pointer-events-none shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                          >
                            <span className="text-[9px] font-black text-white bg-black/80 px-1 rounded">
                              {simHighlightLabel || 'TARGET'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 text-[10px] text-zinc-400 mt-1 font-mono">
                          <span>Posisi X: {simTargetX}%</span>
                          <span>Posisi Y: {simTargetY}%</span>
                          <span>Lebar: {simTargetW}%</span>
                          <span>Tinggi: {simTargetH}%</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Instruksi Tugas untuk Pekerja</label>
                          <input
                            type="text"
                            value={simTaskInstruction}
                            onChange={(e) => setSimTaskInstruction(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Label Highlight Tombol</label>
                          <input
                            type="text"
                            value={simHighlightLabel}
                            onChange={(e) => setSimHighlightLabel(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Petunjuk jika Salah Klik (Hint)</label>
                          <input
                            type="text"
                            value={simHintText}
                            onChange={(e) => setSimHintText(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Pesan Sukses saat Berhasil</label>
                          <input
                            type="text"
                            value={simSuccessMsg}
                            onChange={(e) => setSimSuccessMsg(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Section 2B: BUILDER FORMAT SPOT THE MISTAKE ── */}
                  {formFormat === 'spot_the_mistake' && (
                    <div className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-amber-500/30">
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🔍 2. Konfigurasi Foto Lapangan & Titik Bahaya Anomali</span>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">URL Foto Lapangan</label>
                        <input
                          type="text"
                          value={spotImageUrl}
                          onChange={(e) => setSpotImageUrl(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>

                      {/* Interactive Visual Anomaly Coordinate Picker */}
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Klik langsung pada foto untuk menandai letak anomali/bahaya K3:
                        </label>
                        <div
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                            const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                            setSpotTargetX(clickX);
                            setSpotTargetY(clickY);
                          }}
                          className="relative rounded-xl overflow-hidden border-2 border-amber-500/50 bg-black cursor-crosshair max-h-56 flex items-center justify-center select-none"
                        >
                          <img src={spotImageUrl} alt="Spot preview" className="w-full h-full object-cover max-h-56 pointer-events-none" />
                          <div
                            style={{
                              left: `${spotTargetX}%`,
                              top: `${spotTargetY}%`,
                            }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-rose-500 bg-rose-500/30 animate-pulse pointer-events-none flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.6)]"
                          >
                            <span className="text-xs">⚠️</span>
                          </div>
                        </div>
                        <div className="flex gap-2 text-[10px] text-zinc-400 mt-1 font-mono">
                          <span>Titik X: {spotTargetX}%</span>
                          <span>Titik Y: {spotTargetY}%</span>
                          <span>Toleransi Radius: {spotRadius}%</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Tantangan untuk Pekerja</label>
                        <input
                          type="text"
                          value={spotPrompt}
                          onChange={(e) => setSpotPrompt(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Nama Bahaya K3</label>
                          <input
                            type="text"
                            value={spotHazardName}
                            onChange={(e) => setSpotHazardName(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Batas Waktu (Detik)</label>
                          <input
                            type="number"
                            value={spotTimeLimit}
                            onChange={(e) => setSpotTimeLimit(Number(e.target.value))}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Penjelasan K3 Mengapa Berbahaya</label>
                        <textarea
                          rows={2}
                          value={spotExplanation}
                          onChange={(e) => setSpotExplanation(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* ── Section 2C: BUILDER FORMAT STANDARD MICRO-DECK ── */}
                  {formFormat === 'micro_deck' && (
                    <>
                      <div className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                        <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                          2. Slide 1: Instruksi Langkah Kerja (3 Langkah)
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Judul Slide 1</label>
                          <input
                            type="text"
                            value={formSlide1Title}
                            onChange={(e) => setFormSlide1Title(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={formSlide1Step1}
                            onChange={(e) => setFormSlide1Step1(e.target.value)}
                            placeholder="Langkah 1: Persiapan..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={formSlide1Step2}
                            onChange={(e) => setFormSlide1Step2(e.target.value)}
                            placeholder="Langkah 2: Pelaksanaan..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={formSlide1Step3}
                            onChange={(e) => setFormSlide1Step3(e.target.value)}
                            placeholder="Langkah 3: Pengecekan Akhir..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                          3. Slide 2: Kaidah Aman (DO) vs Larangan (DON'T)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-emerald-400">DO (Praktik Benar)</label>
                            <input
                              type="text"
                              value={formSlide2DoTitle}
                              onChange={(e) => setFormSlide2DoTitle(e.target.value)}
                              placeholder="Judul DO..."
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                            />
                            <textarea
                              rows={2}
                              value={formSlide2DoText}
                              onChange={(e) => setFormSlide2DoText(e.target.value)}
                              placeholder="Penjelasan detail DO..."
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-rose-400">DON'T (Larangan Keras)</label>
                            <input
                              type="text"
                              value={formSlide2DontTitle}
                              onChange={(e) => setFormSlide2DontTitle(e.target.value)}
                              placeholder="Judul DON'T..."
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                            />
                            <textarea
                              rows={2}
                              value={formSlide2DontText}
                              onChange={(e) => setFormSlide2DontText(e.target.value)}
                              placeholder="Penjelasan bahaya DON'T..."
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Section 3: UNIVERSAL QUIZ CHECKPOINT BUILDER ── */}
                  <div className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                    <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                      Evaluasi Kuis Checkpoint
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Pertanyaan Kuis *</label>
                      <input
                        type="text"
                        value={formQuizQuestion}
                        onChange={(e) => setFormQuizQuestion(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-0.5">Pilihan A</label>
                        <input
                          type="text"
                          value={formQuizOptA}
                          onChange={(e) => setFormQuizOptA(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-0.5">Pilihan B</label>
                        <input
                          type="text"
                          value={formQuizOptB}
                          onChange={(e) => setFormQuizOptB(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-0.5">Pilihan C</label>
                        <input
                          type="text"
                          value={formQuizOptC}
                          onChange={(e) => setFormQuizOptC(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-0.5">Pilihan D</label>
                        <input
                          type="text"
                          value={formQuizOptD}
                          onChange={(e) => setFormQuizOptD(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Kunci Jawaban Benar</label>
                      <select
                        value={formQuizCorrectIdx}
                        onChange={(e) => setFormQuizCorrectIdx(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                      >
                        <option value={0}>A — {formQuizOptA || 'Pilihan A'}</option>
                        <option value={1}>B — {formQuizOptB || 'Pilihan B'}</option>
                        <option value={2}>C — {formQuizOptC || 'Pilihan C'}</option>
                        <option value={3}>D — {formQuizOptD || 'Pilihan D'}</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setCreationStep(1)}
                      className="w-1/3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 rounded-xl text-xs transition"
                    >
                      ← Kembali Pilih Format
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-2/3 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
                    >
                      {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Simpan & Terbitkan Modul ({formFormat})</span>
                    </button>
                  </div>

                </form>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* ─── 5. SLIDESHOW PREVIEW MODAL ─── */}
      {previewingModule && (
        <SopSlideshowModal
          module={previewingModule}
          isAlreadyCompleted={true}
          workerId="admin-preview"
          onClose={() => setPreviewingModule(null)}
          onComplete={() => setPreviewingModule(null)}
        />
      )}
    </div>
  );
};
