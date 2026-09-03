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
  Layers,
  Sparkles,
  X,
  Loader2,
  Download,
  Copy,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  FileText,
  Smartphone,
  ShieldAlert,
  ListOrdered,
  FileCheck2,
  Upload,
  Target,
  Sliders,
  Maximize2,
} from 'lucide-react';
import {
  SopModule,
  SopCategory,
  SopDifficulty,
  SopSlide,
  SopSlideType,
  SopPresentationFormat,
  SopHotspotPoint,
} from '../types/sop';
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

  // Create/Edit Module Wizard State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creationStep, setCreationStep] = useState<1 | 2>(1); // 1: Pilih Format Dasar, 2: Multi-Slide Editor
  const [formFormat, setFormFormat] = useState<SopPresentationFormat>('micro_deck');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Basic Module Meta Fields
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

  // Dynamic Multi-Slide Array & Active Slide Selector
  const [editingSlides, setEditingSlides] = useState<SopSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Initialize Default Slide Template based on chosen format
  const initializeSlidesForFormat = (format: SopPresentationFormat) => {
    setFormFormat(format);
    if (format === 'interactive_simulator') {
      setFormCode(`SOP-WMS-${Math.floor(Math.random() * 90 + 10)}`);
      setFormTitle('Simulasi WMS: Alur Putaway Palet & Scan Barcode');
      setFormDesc('Latihan interaktif multi-langkah operasional Handheld Scanner WMS.');
      setFormCategory('Warehouse & Staging');
      setEditingSlides([
        {
          id: `sl-${Date.now()}-1`,
          slideNumber: 1,
          slideType: 'interactive_simulator',
          title: 'Langkah 1: Buka Menu Inbound Putaway',
          subtitle: 'Pilih opsi penerimaan barang pada menu scanner',
          audioNarrationText: 'Pada layar scanner, ketuk tombol menu Putaway berwarna biru.',
          imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
          simulatorConfig: {
            taskInstruction: 'Ketuk tombol [PUTAWAY STORAGE] di layar scanner',
            targetXPercent: 20,
            targetYPercent: 40,
            targetWidthPercent: 60,
            targetHeightPercent: 20,
            hintText: 'Cari tombol menu tengah [PUTAWAY STORAGE] berbingkai hijau.',
            highlightLabel: '👉 [PUTAWAY]',
            successMessage: 'Bagus! Menu Putaway Storage berhasil dibuka.',
          },
        },
        {
          id: `sl-${Date.now()}-2`,
          slideNumber: 2,
          slideType: 'interactive_simulator',
          title: 'Langkah 2: Konfirmasi Posisi Rak Gudang',
          subtitle: 'Kunci barcode lokasi rak tujuan sebelum menaruh palet',
          audioNarrationText: 'Arahkan laser scanner ke tiang rak dan tekan tombol F4 Konfirmasi.',
          imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80',
          simulatorConfig: {
            taskInstruction: 'Klik tombol hijau [F4 - CONFIRM LOCATION] di bagian bawah layar',
            targetXPercent: 25,
            targetYPercent: 70,
            targetWidthPercent: 50,
            targetHeightPercent: 18,
            hintText: 'Tekan tombol konfirmasi di baris bawah layar.',
            highlightLabel: '⚡ [F4] CONFIRM',
            successMessage: 'Tepat! Lokasi rak RAK-A-04-02 berhasil terverifikasi.',
          },
        },
        {
          id: `sl-${Date.now()}-3`,
          slideNumber: 3,
          slideType: 'quiz_checkpoint',
          title: 'Evaluasi: Integritas Data WMS',
          subtitle: 'Uji pemahaman prosedur barcode lokasi',
          audioNarrationText: 'Selesaikan kuis evaluasi pemahaman untuk mengklaim poin reward.',
          quiz: {
            id: `q-${Date.now()}`,
            question: 'Apa akibatnya jika fisik palet ditaruh di rak A-02 tetapi sistem WMS mencatat rak A-05?',
            options: [
              'Terjadi selisih stok (discrepancy) saat proses picking barang',
              'Sistem WMS akan otomatis memperbaikinya sendiri',
              'Tidak berdampak apapun terhadap operasional',
              'Barang otomatis hilang dari database',
            ],
            correctAnswerIndex: 0,
            explanation: 'Selisih barcode fisik dan sistem menyebabkan picker gagal menemukan barang fisik saat proses muat order.',
            points: 50,
          },
        },
      ]);
    } else if (format === 'spot_the_mistake') {
      setFormCode(`SOP-SPOT-${Math.floor(Math.random() * 90 + 10)}`);
      setFormTitle('Hazard Hunt: Deteksi Anomali Penumpukan Palet & APD');
      setFormDesc('Uji kejelian visual mencari potensi bahaya K3 pada foto lapangan.');
      setFormCategory('K3 & Safety');
      setEditingSlides([
        {
          id: `sl-${Date.now()}-1`,
          slideNumber: 1,
          slideType: 'spot_the_mistake',
          title: 'Tantangan 1: Inspeksi Tumpukan Palet',
          subtitle: 'Cari tumpukan palet yang miring atau melebihi batas aman',
          audioNarrationText: 'Perhatikan susunan palet pada foto. Temukan anomali K3 yang berisiko jatuh.',
          imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
          spotMistakeConfig: {
            challengePrompt: '⚠️ Temukan 1 muatan palet kardus yang miring (overhang > 10cm)!',
            targetXPercent: 55,
            targetYPercent: 35,
            toleranceRadiusPercent: 18,
            hazardName: 'Tumpukan Miring Overhang (> 10cm)',
            explanation: 'Muatan tanpa wrapping kencang dan miring > 2 derajat berisiko fatal roboh menimpa pejalan kaki.',
            timeLimitSeconds: 25,
          },
        },
        {
          id: `sl-${Date.now()}-2`,
          slideNumber: 2,
          slideType: 'quiz_checkpoint',
          title: 'Evaluasi: Batas Toleransi Tumpukan',
          subtitle: 'Uji batas aman gravitasi muatan',
          audioNarrationText: 'Jawab pertanyaan kuis evaluasi K3 berikut.',
          quiz: {
            id: `q-${Date.now()}`,
            question: 'Berapakah batas tinggi maksimum tumpukan palet kardus yang aman di area staging?',
            options: [
              'Maksimum 3 susun atau sesuai garis batas dinding',
              'Setinggi jangkauan garpu forklift',
              'Bebas tergantung sisa ruang kosong',
              'Maksimum 10 susun',
            ],
            correctAnswerIndex: 0,
            explanation: 'Batas 3 susun memastikan stabilitas beban dan mencegah beban bawah amblas.',
            points: 50,
          },
        },
      ]);
    } else if (format === 'visual_hotspot') {
      setFormCode(`SOP-MHE-${Math.floor(Math.random() * 90 + 10)}`);
      setFormTitle('Diagram Inspeksi 360 Pre-Use Forklift');
      setFormDesc('Pemeriksaan komponen kritis unit forklift sebelum shift operasional.');
      setFormCategory('Operasional MHE');
      setEditingSlides([
        {
          id: `sl-${Date.now()}-1`,
          slideNumber: 1,
          slideType: 'interactive_hotspot',
          title: 'Diagram Titik Kritis Forklift',
          subtitle: 'Ketuk setiap pin untuk melihat panduan inspeksi komponen',
          content: 'Lakukan pemeriksaan visual dan mekanis pada seluruh titik pin yang ditandai.',
          audioNarrationText: 'Periksa kondisi garpu, sistem hidrolik, dan ban forklift.',
          imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80',
          hotspots: [
            { id: 'hs-1', xPercent: 30, yPercent: 40, label: 'Garpu (Forks)', description: 'Pastikan tidak retak dan ketebalan tumit > 90%.', status: 'critical' },
            { id: 'hs-2', xPercent: 70, yPercent: 60, label: 'Roda & Ban Padat', description: 'Periksa tidak ada benda tajam tertancap atau ban pecah.', status: 'check' },
          ],
        },
        {
          id: `sl-${Date.now()}-2`,
          slideNumber: 2,
          slideType: 'quiz_checkpoint',
          title: 'Evaluasi: Pre-Use Inspection Checklist',
          subtitle: 'Uji tindakan saat ditemukan cacat kritis',
          quiz: {
            id: `q-${Date.now()}`,
            question: 'Apa yang wajib dilakukan jika ditemukan kebocoran oli hidrolik pada garpu saat inspeksi?',
            options: [
              'Pasang tag OUT OF SERVICE dan lapor Supervisor/Mekanik',
              'Tetap gunakan dengan beban ringan',
              'Lap ceceran oli dengan majun lalu operasikan seperti biasa',
              'Tutup kebocoran dengan lakban',
            ],
            correctAnswerIndex: 0,
            explanation: 'Unit wajib di-tag out segera untuk mencegah kegagalan hidrolik fatal saat mengangkat beban.',
            points: 50,
          },
        },
      ]);
    } else if (format === 'document_reader') {
      setFormCode(`SOP-DOC-${Math.floor(Math.random() * 90 + 10)}`);
      setFormTitle('Dokumen SOP Resmi: Tanggap Darurat & Spill Kit');
      setFormDesc('Modul dokumen digital instruksi penanganan tumpahan bahan kimia.');
      setFormCategory('Tanggap Darurat & Lingkungan');
      setEditingSlides([
        {
          id: `sl-${Date.now()}-1`,
          slideNumber: 1,
          slideType: 'document_reader',
          title: 'Halaman 1: Prosedur Isolasi Area Tumpahan',
          subtitle: 'Berkas: SOP-Tanggap-Darurat-B3.pdf',
          content: 'Langkah awal: Pasang safety cone, gunakan APD respirator kimia, dan bendung tumpahan menggunakan absorbent boom.',
          audioNarrationText: 'Segera isolasi area dan gunakan perlengkapan Spill Kit sesuai instruksi lembar kerja.',
          imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
          documentConfig: { fileName: 'SOP-Tanggap-Darurat-B3.pdf', currentPage: 1, totalPdfPages: 2, extractedSummaryText: 'Isolasi area tumpahan segera.' },
        },
        {
          id: `sl-${Date.now()}-2`,
          slideNumber: 2,
          slideType: 'quiz_checkpoint',
          title: 'Evaluasi: Kepatuhan Spill Kit',
          subtitle: 'Uji prosedur penanganan tumpahan',
          quiz: {
            id: `q-${Date.now()}`,
            question: 'Di mana limbah absorbent bekas tumpahan oli/B3 wajib dibuang?',
            options: [
              'Drum khusus Limbah B3 berlabel resmi',
              'Tempat sampah umum warna hijau',
              'Dibiarkan di sudut gudang',
              'Dibuang ke saluran air got',
            ],
            correctAnswerIndex: 0,
            explanation: 'Limbah B3 wajib dikumpulkan pada wadah drum tertutup berlabel khusus limbah B3 berizin.',
            points: 50,
          },
        },
      ]);
    } else {
      // Default: Micro-Deck Standar
      setFormCode(`SOP-K3-${Math.floor(Math.random() * 90 + 10)}`);
      setFormTitle('Standar K3 & Keselamatan Operasional Logistik');
      setFormDesc('Pedoman wajib kepatuhan keselamatan kerja dan pencegahan insiden.');
      setFormCategory('K3 & Safety');
      setEditingSlides([
        {
          id: `sl-${Date.now()}-1`,
          slideNumber: 1,
          slideType: 'step_instruction',
          title: 'Langkah Kerja Standar Operasional',
          subtitle: 'Patuhi urutan 3 langkah kerja aman berikut',
          audioNarrationText: 'Langkah 1 pemeriksaan awal. Langkah 2 pelaksanaan aman. Langkah 3 verifikasi penataan.',
          steps: [
            { stepNumber: 1, title: 'Persiapan & APD', description: 'Gunakan helm, rompi reflektif, dan safety shoes.', iconName: 'CheckSquare' },
            { stepNumber: 2, title: 'Pelaksanaan Kerja', description: 'Ikuti batas kecepatan MHE maks 10 km/jam.', iconName: 'Play' },
            { stepNumber: 3, title: 'Housekeeping 5S', description: 'Pastikan lorong bebas hambatan setelah selesai.', iconName: 'CheckCircle2' },
          ],
        },
        {
          id: `sl-${Date.now()}-2`,
          slideNumber: 2,
          slideType: 'dos_and_donts',
          title: 'Kaidah Aman (DO) vs Larangan Kritis (DON\'T)',
          subtitle: 'Golden rules keselamatan seluruh personel',
          audioNarrationText: 'Patuhi kaidah DO dan hindari larangan keras DON\'T.',
          dosAndDonts: [
            {
              doTitle: 'Selalu Bunyikan Klakson di Persimpangan',
              doText: 'Klakson memberi peringatan kepada pejalan kaki di blind spot.',
              dontTitle: 'Dilarang Mengoperasikan HP Saat Berkendara',
              dontText: 'Distraksi ponsel merupakan pemicu utama tabrakan forklift.',
            },
          ],
        },
        {
          id: `sl-${Date.now()}-3`,
          slideNumber: 3,
          slideType: 'quiz_checkpoint',
          title: 'Evaluasi: Pemahaman Golden Rules K3',
          subtitle: 'Uji pemahaman aturan keselamatan',
          quiz: {
            id: `q-${Date.now()}`,
            question: 'Berapakah batas kecepatan maksimum MHE (Forklift/Reach Truck) di dalam area gudang?',
            options: ['10 km/jam', '25 km/jam', 'Bebas sesuai urgensi', '50 km/jam'],
            correctAnswerIndex: 0,
            explanation: 'Batas kecepatan 10 km/jam memberi jarak pengereman aman dan visibilitas cukup.',
            points: 50,
          },
        },
      ]);
    }
    setActiveSlideIndex(0);
    setCreationStep(2);
  };

  // Load modules from Supabase / Local cache
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

  // Slide Management Helpers
  const currentActiveSlide: SopSlide | undefined = editingSlides[activeSlideIndex];

  const handleUpdateActiveSlide = (updates: Partial<SopSlide>) => {
    setEditingSlides((prev) => {
      const next = [...prev];
      if (next[activeSlideIndex]) {
        next[activeSlideIndex] = { ...next[activeSlideIndex], ...updates };
      }
      return next;
    });
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      if (onToast) onToast('Ukuran file gambar maksimal 8MB!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      if (typeof loadEvt.target?.result === 'string') {
        handleUpdateActiveSlide({ imageUrl: loadEvt.target.result });
        if (onToast) onToast('Gambar/Screenshot berhasil dimuat!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddSlide = (type: SopSlideType) => {
    const newSlideNumber = editingSlides.length + 1;
    let newSlide: SopSlide;

    if (type === 'interactive_simulator') {
      newSlide = {
        id: `sl-${Date.now()}-${newSlideNumber}`,
        slideNumber: newSlideNumber,
        slideType: 'interactive_simulator',
        title: `Langkah ${newSlideNumber}: Simulasi Klik Aplikasi`,
        subtitle: 'Instruksi klik tombol target interaktif',
        audioNarrationText: 'Ketuk tombol target yang ditunjuk pada layar.',
        imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
        simulatorConfig: {
          taskInstruction: 'Klik tombol target yang menyala di layar',
          targetXPercent: 30,
          targetYPercent: 40,
          targetWidthPercent: 40,
          targetHeightPercent: 20,
          hintText: 'Perhatikan kotak berbingkai hijau di layar.',
          highlightLabel: '👉 KLIK DI SINI',
          successMessage: 'Langkah berhasil!',
        },
      };
    } else if (type === 'spot_the_mistake') {
      newSlide = {
        id: `sl-${Date.now()}-${newSlideNumber}`,
        slideNumber: newSlideNumber,
        slideType: 'spot_the_mistake',
        title: `Tantangan ${newSlideNumber}: Hazard Hunt`,
        subtitle: 'Temukan anomali K3 pada foto lapangan',
        audioNarrationText: 'Amati foto dan temukan letak kesalahan prosedur keselamatan.',
        imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
        spotMistakeConfig: {
          challengePrompt: 'Temukan 1 pelanggaran atau anomali pada foto!',
          targetXPercent: 50,
          targetYPercent: 50,
          toleranceRadiusPercent: 15,
          hazardName: 'Potensi Bahaya Tersembunyi',
          explanation: 'Kondisi tidak aman ini berisiko memicu kecelakaan kerja.',
          timeLimitSeconds: 20,
        },
      };
    } else if (type === 'interactive_hotspot') {
      newSlide = {
        id: `sl-${Date.now()}-${newSlideNumber}`,
        slideNumber: newSlideNumber,
        slideType: 'interactive_hotspot',
        title: `Diagram Inspeksi ${newSlideNumber}`,
        subtitle: 'Titik inspeksi interaktif',
        content: 'Ketuk pin untuk detail inspeksi komponen.',
        imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80',
        hotspots: [
          { id: `hs-${Date.now()}`, xPercent: 50, yPercent: 50, label: 'Komponen Utama', description: 'Pastikan dalam kondisi siap pakai.', status: 'check' },
        ],
      };
    } else if (type === 'dos_and_donts') {
      newSlide = {
        id: `sl-${Date.now()}-${newSlideNumber}`,
        slideNumber: newSlideNumber,
        slideType: 'dos_and_donts',
        title: 'Kaidah Aman (DO) vs Larangan (DON\'T)',
        subtitle: 'Komparasi visual keselamatan kerja',
        dosAndDonts: [
          { doTitle: 'Praktik Benar (DO)', doText: 'Lakukan sesuai panduan resmi.', dontTitle: 'Larangan (DON\'T)', dontText: 'Hindari tindakan berbahaya ini.' },
        ],
      };
    } else if (type === 'quiz_checkpoint') {
      newSlide = {
        id: `sl-${Date.now()}-${newSlideNumber}`,
        slideNumber: newSlideNumber,
        slideType: 'quiz_checkpoint',
        title: `Kuis Checkpoint Evaluasi #${newSlideNumber}`,
        subtitle: 'Verifikasi pemahaman materi',
        quiz: {
          id: `q-${Date.now()}`,
          question: 'Pertanyaan evaluasi pemahaman SOP:',
          options: ['Pilihan Jawaban Benar', 'Pilihan Jawaban Salah 1', 'Pilihan Jawaban Salah 2', 'Pilihan Jawaban Salah 3'],
          correctAnswerIndex: 0,
          explanation: 'Penjelasan rinci mengapa jawaban ini tepat sesuai standar operasional.',
          points: 50,
        },
      };
    } else {
      newSlide = {
        id: `sl-${Date.now()}-${newSlideNumber}`,
        slideNumber: newSlideNumber,
        slideType: 'step_instruction',
        title: `Instruksi Langkah Kerja #${newSlideNumber}`,
        subtitle: 'Panduan langkah operasional',
        steps: [
          { stepNumber: 1, title: 'Persiapan', description: 'Lakukan pengecekan awal.' },
          { stepNumber: 2, title: 'Eksekusi', description: 'Laksanakan tugas sesuai SOP.' },
        ],
      };
    }

    setEditingSlides((prev) => [...prev, newSlide]);
    setActiveSlideIndex(editingSlides.length);
    onToast?.(`Slide ${newSlideNumber} (${type}) berhasil ditambahkan.`);
  };

  const handleDeleteSlide = (index: number) => {
    if (editingSlides.length <= 1) {
      setFormError('Modul wajib memiliki minimal 1 slide.');
      return;
    }
    const next = editingSlides.filter((_, i) => i !== index).map((s, i) => ({ ...s, slideNumber: i + 1 }));
    setEditingSlides(next);
    setActiveSlideIndex(Math.max(0, index - 1));
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= editingSlides.length) return;

    const next = [...editingSlides];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;

    const renumbered = next.map((s, i) => ({ ...s, slideNumber: i + 1 }));
    setEditingSlides(renumbered);
    setActiveSlideIndex(targetIdx);
  };

  const handleDuplicateSlide = (index: number) => {
    const toDup = editingSlides[index];
    const dupSlide: SopSlide = {
      ...toDup,
      id: `sl-${Date.now()}-${editingSlides.length + 1}`,
      title: `${toDup.title} (Salinan)`,
      slideNumber: editingSlides.length + 1,
    };
    const next = [...editingSlides.slice(0, index + 1), dupSlide, ...editingSlides.slice(index + 1)].map((s, i) => ({
      ...s,
      slideNumber: i + 1,
    }));
    setEditingSlides(next);
    setActiveSlideIndex(index + 1);
    onToast?.('Slide berhasil diduplikasi.');
  };

  // Handle Save New SOP Module
  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formTitle.trim()) {
      setFormError('Kode SOP dan Judul Modul wajib diisi.');
      return;
    }
    if (editingSlides.length === 0) {
      setFormError('Modul harus memiliki minimal 1 slide.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
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
        slides_data: editingSlides,
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
        slides: editingSlides,
        isMandatory: formIsMandatory,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      localStorage.setItem('bib_sop_custom_modules_v2', JSON.stringify(localCustom));

      onToast?.(`Modul SOP ${formCode.toUpperCase()} (${editingSlides.length} Slide) berhasil diterbitkan!`);
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
      const localCustom = JSON.parse(localStorage.getItem('bib_sop_custom_modules_v2') || '[]');
      const filtered = localCustom.filter((m: any) => m.id !== item.id);
      localStorage.setItem('bib_sop_custom_modules_v2', JSON.stringify(filtered));

      setModules((prev) => prev.filter((m) => m.id !== item.id));
      onToast?.(`Modul ${item.code} berhasil dihapus.`);
    } catch (e) {
      console.error('Error deleting SOP module:', e);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Kode SOP', 'Judul Modul', 'Kategori', 'Kesulitan', 'Jumlah Slide', 'Poin Reward', 'Wajib Kepatuhan'];
    const rows = filteredModules.map((m) => [
      m.code,
      `"${m.title.replace(/"/g, '""')}"`,
      m.category,
      m.difficulty,
      m.slides.length,
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
            Studio pembuatan modul pelatihan multi-slide, simulasi klik WMS, hazard hunt, dan kuis kepatuhan
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
            onClick={() => {
              setIsCreateModalOpen(true);
              setCreationStep(1);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-purple-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Modul SOP Baru</span>
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
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => setPreviewingModule(item)}
                  className="flex-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Putar ({item.slides.length} Slide)</span>
                </button>

                <button
                  onClick={async () => {
                    try {
                      const { SopPdfExporter } = await import('../lib/sopPdfExporter');
                      await SopPdfExporter.exportSopPosterPDF(item);
                      onToast?.(`Poster A4 SOP ${item.code} berhasil diunduh!`);
                    } catch (err) {
                      console.error('PDF export error:', err);
                      onToast?.('Gagal mengunduh poster PDF.');
                    }
                  }}
                  className="p-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition flex items-center gap-1 text-[11px] font-bold px-2"
                  title="Cetak Poster A4 / Cheatsheet PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">A4 PDF</span>
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

      {/* ─── 4. DYNAMIC MULTI-SLIDE STUDIO MODAL PORTAL ─── */}
      {isCreateModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in">
            <div className="card-elevated w-full max-w-4xl max-h-[94vh] flex flex-col p-5 sm:p-6 relative border border-zinc-700/80 shadow-2xl overflow-y-auto custom-scrollbar">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {creationStep === 1
                        ? 'Langkah 1: Pilih Konsep Dasar Modul'
                        : `Langkah 2: Studio Multi-Slide Deck (${editingSlides.length} Slide Aktif)`}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {creationStep === 1
                        ? 'Tentukan format utama modul sebelum menyusun alur slide interaktif'
                        : 'Kelola alur multi-slide, koordinat klik simulator, foto anomali, dan kuis pemahaman'}
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
                <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {/* ─── STEP 1: PILIH FORMAT DASAR ─── */}
              {creationStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    <div
                      onClick={() => initializeSlidesForFormat('micro_deck')}
                      className="p-4 rounded-xl border-2 bg-zinc-900 border-zinc-800 hover:border-purple-500 cursor-pointer transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">📖</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-900 text-purple-200">Standar</span>
                        </div>
                        <h4 className="font-bold text-white text-xs mb-1">Micro-Deck Interaktif</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Slide instruksi langkah berurutan, perbandingan DOs & DON'Ts, narasi audio, dan kuis checkpoint.
                        </p>
                      </div>
                      <span className="text-[10px] text-purple-400 font-semibold mt-3">Mulai dengan template 3 slide →</span>
                    </div>

                    <div
                      onClick={() => initializeSlidesForFormat('interactive_simulator')}
                      className="p-4 rounded-xl border-2 bg-zinc-900 border-zinc-800 hover:border-indigo-500 cursor-pointer transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">🎮</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-900 text-indigo-200">Simulator</span>
                        </div>
                        <h4 className="font-bold text-white text-xs mb-1">WMS / App Click Simulator</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Alur simulasi beruntun screenshot WMS/Scanner dengan zona target klik interaktif di setiap langkah.
                        </p>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-semibold mt-3">Mulai simulasi multi-step →</span>
                    </div>

                    <div
                      onClick={() => initializeSlidesForFormat('spot_the_mistake')}
                      className="p-4 rounded-xl border-2 bg-zinc-900 border-zinc-800 hover:border-amber-500 cursor-pointer transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">🔍</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900 text-amber-200">Game K3</span>
                        </div>
                        <h4 className="font-bold text-white text-xs mb-1">Spot-the-Mistake / Hazard Hunt</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Tantangan kejelian visual mencari pelanggaran susunan palet/APD pada foto lapangan dengan timer.
                        </p>
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold mt-3">Mulai tantangan visual →</span>
                    </div>

                    <div
                      onClick={() => initializeSlidesForFormat('visual_hotspot')}
                      className="p-4 rounded-xl border-2 bg-zinc-900 border-zinc-800 hover:border-emerald-500 cursor-pointer transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">📌</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-200">Diagram</span>
                        </div>
                        <h4 className="font-bold text-white text-xs mb-1">Visual Hotspot Diagram</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Foto alat/mesin resolusi tinggi dengan pin titik inspeksi interaktif yang berkedip.
                        </p>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold mt-3">Mulai diagram inspeksi →</span>
                    </div>

                  </div>
                </div>
              )}

              {/* ─── STEP 2: DYNAMIC MULTI-SLIDE DECK BUILDER ─── */}
              {creationStep === 2 && (
                <form onSubmit={handleSaveModule} className="space-y-4">
                  
                  {/* Metadata Row */}
                  <div className="bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                        1. Informasi Umum Modul
                      </span>
                      <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                        Format: {formFormat.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Kode SOP *</label>
                        <input
                          type="text"
                          value={formCode}
                          onChange={(e) => setFormCode(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white uppercase font-mono"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-zinc-400 mb-1">Judul Modul Pelatihan *</label>
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Kategori</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value as SopCategory)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
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
                        <label className="block text-[11px] text-zinc-400 mb-1">Tingkat Kesulitan</label>
                        <select
                          value={formDifficulty}
                          onChange={(e) => setFormDifficulty(e.target.value as SopDifficulty)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Mandatory Compliance">Mandatory Compliance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Poin Reward (PTS)</label>
                        <input
                          type="number"
                          value={formPoints}
                          onChange={(e) => setFormPoints(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ─── 🎞️ SLIDE FILMSTRIP & TIMELINE NAVIGATION ─── */}
                  <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-white">
                          Timeline Slide ({editingSlides.length} Slide)
                        </span>
                      </div>
                      
                      {/* Add Slide Quick Menu */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-[10px] text-zinc-400 mr-1 hidden sm:inline">+ Tambah:</span>
                        <button
                          type="button"
                          onClick={() => handleAddSlide('interactive_simulator')}
                          className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <Smartphone className="w-3 h-3" /> Simulator
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSlide('spot_the_mistake')}
                          className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700/60 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <ShieldAlert className="w-3 h-3" /> Hazard Hunt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSlide('step_instruction')}
                          className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <ListOrdered className="w-3 h-3" /> Langkah
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSlide('quiz_checkpoint')}
                          className="px-2 py-1 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700/60 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <HelpCircle className="w-3 h-3" /> Kuis
                        </button>
                      </div>
                    </div>

                    {/* Filmstrip Strip Horizontal Badges */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {editingSlides.map((slide, idx) => {
                        const isActive = idx === activeSlideIndex;
                        let typeIcon = '📖';
                        if (slide.slideType === 'interactive_simulator') typeIcon = '🎮';
                        if (slide.slideType === 'spot_the_mistake') typeIcon = '🔍';
                        if (slide.slideType === 'interactive_hotspot') typeIcon = '📌';
                        if (slide.slideType === 'quiz_checkpoint') typeIcon = '❓';

                        return (
                          <div
                            key={slide.id || idx}
                            onClick={() => setActiveSlideIndex(idx)}
                            className={`px-3 py-2 rounded-xl border-2 cursor-pointer transition shrink-0 flex items-center gap-2 select-none ${
                              isActive
                                ? 'bg-purple-950/60 border-purple-500 shadow-md shadow-purple-900/40'
                                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <span className="text-sm">{typeIcon}</span>
                            <div className="text-left">
                              <div className="text-[10px] font-black text-white">
                                Slide #{idx + 1}
                              </div>
                              <div className="text-[9px] text-zinc-400 truncate max-w-[90px]">
                                {slide.title || slide.slideType}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ─── ✏️ ACTIVE SLIDE DETAIL EDITOR WORKSPACE ─── */}
                  {currentActiveSlide && (
                    <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3 animate-fade-in">
                      
                      {/* Slide Toolbar */}
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-300">
                            Mengedit Slide #{activeSlideIndex + 1}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                            Tipe: {currentActiveSlide.slideType}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(activeSlideIndex, 'up')}
                            disabled={activeSlideIndex === 0}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded text-xs"
                            title="Geser ke kiri/naik"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(activeSlideIndex, 'down')}
                            disabled={activeSlideIndex === editingSlides.length - 1}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 rounded text-xs"
                            title="Geser ke kanan/turun"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateSlide(activeSlideIndex)}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs"
                            title="Duplikasi Slide"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSlide(activeSlideIndex)}
                            className="p-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded text-xs ml-1"
                            title="Hapus Slide Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Common Slide Title & Subtitle */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">Judul Slide</label>
                          <input
                            type="text"
                            value={currentActiveSlide.title}
                            onChange={(e) => handleUpdateActiveSlide({ title: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">Sub-judul / Instruksi Singkat</label>
                          <input
                            type="text"
                            value={currentActiveSlide.subtitle || ''}
                            onChange={(e) => handleUpdateActiveSlide({ subtitle: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* ── TYPE: INTERACTIVE SIMULATOR ── */}
                      {currentActiveSlide.slideType === 'interactive_simulator' && (
                        <div className="space-y-3 bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-500/30">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-indigo-300 font-bold flex items-center gap-1.5">
                              🎮 Konfigurasi Screenshot & Zona Target Klik
                            </label>
                            <span className="text-[10px] text-zinc-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                              Full Screen (Zero Crop)
                            </span>
                          </div>

                          {/* Image Source: URL or File Upload */}
                          <div className="space-y-1.5">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={currentActiveSlide.imageUrl || ''}
                                onChange={(e) => handleUpdateActiveSlide({ imageUrl: e.target.value })}
                                placeholder="URL Gambar Screenshot WMS atau Unggah File..."
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                              />
                              <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-md">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Unggah File</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageFileUpload}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <p className="text-[10px] text-zinc-400">
                              Mendukung format PNG, JPG, atau WebP dari scanner PDA, aplikasi WMS, atau desktop. Gambar tampil utuh 100% tanpa terpotong.
                            </p>
                          </div>

                          {/* Zero-Crop Hitbox Canvas Stage */}
                          <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col items-center justify-center min-h-[280px] max-h-[580px] overflow-auto shadow-inner">
                            <div
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (rect.width === 0 || rect.height === 0) return;
                                const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                const w = currentActiveSlide.simulatorConfig?.targetWidthPercent || 30;
                                const h = currentActiveSlide.simulatorConfig?.targetHeightPercent || 15;
                                handleUpdateActiveSlide({
                                  simulatorConfig: {
                                    ...(currentActiveSlide.simulatorConfig || {
                                      taskInstruction: 'Klik tombol target di layar',
                                      hintText: 'Perhatikan tombol yang menyala',
                                    }),
                                    targetXPercent: Math.max(0, Math.min(100 - w, clickX - Math.round(w / 2))),
                                    targetYPercent: Math.max(0, Math.min(100 - h, clickY - Math.round(h / 2))),
                                    targetWidthPercent: w,
                                    targetHeightPercent: h,
                                  },
                                });
                              }}
                              className="relative inline-block max-w-full rounded-lg overflow-hidden shadow-2xl border-2 border-indigo-500/60 cursor-crosshair select-none bg-black transition-all"
                            >
                              <img
                                src={currentActiveSlide.imageUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80'}
                                alt="Simulator screen"
                                className="max-h-[480px] w-auto max-w-full block pointer-events-none object-contain"
                              />
                              {/* Visual Target Hitbox */}
                              <div
                                style={{
                                  left: `${currentActiveSlide.simulatorConfig?.targetXPercent || 30}%`,
                                  top: `${currentActiveSlide.simulatorConfig?.targetYPercent || 40}%`,
                                  width: `${currentActiveSlide.simulatorConfig?.targetWidthPercent || 30}%`,
                                  height: `${currentActiveSlide.simulatorConfig?.targetHeightPercent || 15}%`,
                                }}
                                className="absolute border-2 border-emerald-400 bg-emerald-500/25 rounded flex items-center justify-center pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all"
                              >
                                <span className="text-[10px] font-black text-emerald-200 bg-black/85 px-1.5 py-0.5 rounded border border-emerald-500/40 shadow">
                                  {currentActiveSlide.simulatorConfig?.highlightLabel || '👉 TARGET'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1">
                              💡 Ketuk langsung titik tombol pada gambar di atas, atau sesuaikan ukuran & posisinya lewat slider di bawah:
                            </span>
                          </div>

                          {/* Hitbox Customization Controls */}
                          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-3">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-indigo-400" />
                                Penyesuaian Dimensi & Posisi Kotak Target (Hitbox)
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                Pos: X={currentActiveSlide.simulatorConfig?.targetXPercent || 30}%, Y={currentActiveSlide.simulatorConfig?.targetYPercent || 40}% | Dim: {currentActiveSlide.simulatorConfig?.targetWidthPercent || 30}% × {currentActiveSlide.simulatorConfig?.targetHeightPercent || 15}%
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                              <div>
                                <label className="block text-zinc-400 mb-1">
                                  Lebar Target: <span className="text-white font-bold">{currentActiveSlide.simulatorConfig?.targetWidthPercent || 30}%</span>
                                </label>
                                <input
                                  type="range"
                                  min={5}
                                  max={90}
                                  value={currentActiveSlide.simulatorConfig?.targetWidthPercent || 30}
                                  onChange={(e) => {
                                    const w = Number(e.target.value);
                                    const curX = currentActiveSlide.simulatorConfig?.targetXPercent || 30;
                                    handleUpdateActiveSlide({
                                      simulatorConfig: {
                                        ...(currentActiveSlide.simulatorConfig || { targetXPercent: 30, targetYPercent: 40, targetHeightPercent: 15, taskInstruction: '', hintText: '' }),
                                        targetWidthPercent: w,
                                        targetXPercent: Math.min(curX, 100 - w),
                                      },
                                    });
                                  }}
                                  className="w-full accent-indigo-500 cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="block text-zinc-400 mb-1">
                                  Tinggi Target: <span className="text-white font-bold">{currentActiveSlide.simulatorConfig?.targetHeightPercent || 15}%</span>
                                </label>
                                <input
                                  type="range"
                                  min={5}
                                  max={70}
                                  value={currentActiveSlide.simulatorConfig?.targetHeightPercent || 15}
                                  onChange={(e) => {
                                    const h = Number(e.target.value);
                                    const curY = currentActiveSlide.simulatorConfig?.targetYPercent || 40;
                                    handleUpdateActiveSlide({
                                      simulatorConfig: {
                                        ...(currentActiveSlide.simulatorConfig || { targetXPercent: 30, targetYPercent: 40, targetWidthPercent: 30, taskInstruction: '', hintText: '' }),
                                        targetHeightPercent: h,
                                        targetYPercent: Math.min(curY, 100 - h),
                                      },
                                    });
                                  }}
                                  className="w-full accent-indigo-500 cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="block text-zinc-400 mb-1">
                                  Posisi X (Kiri-Kanan): <span className="text-white font-bold">{currentActiveSlide.simulatorConfig?.targetXPercent || 30}%</span>
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={100 - (currentActiveSlide.simulatorConfig?.targetWidthPercent || 30)}
                                  value={currentActiveSlide.simulatorConfig?.targetXPercent || 30}
                                  onChange={(e) => {
                                    handleUpdateActiveSlide({
                                      simulatorConfig: {
                                        ...(currentActiveSlide.simulatorConfig || { targetYPercent: 40, targetWidthPercent: 30, targetHeightPercent: 15, taskInstruction: '', hintText: '' }),
                                        targetXPercent: Number(e.target.value),
                                      },
                                    });
                                  }}
                                  className="w-full accent-emerald-500 cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="block text-zinc-400 mb-1">
                                  Posisi Y (Atas-Bawah): <span className="text-white font-bold">{currentActiveSlide.simulatorConfig?.targetYPercent || 40}%</span>
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={100 - (currentActiveSlide.simulatorConfig?.targetHeightPercent || 15)}
                                  value={currentActiveSlide.simulatorConfig?.targetYPercent || 40}
                                  onChange={(e) => {
                                    handleUpdateActiveSlide({
                                      simulatorConfig: {
                                        ...(currentActiveSlide.simulatorConfig || { targetXPercent: 30, targetWidthPercent: 30, targetHeightPercent: 15, taskInstruction: '', hintText: '' }),
                                        targetYPercent: Number(e.target.value),
                                      },
                                    });
                                  }}
                                  className="w-full accent-emerald-500 cursor-pointer"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                              <div>
                                <label className="block text-[10px] text-zinc-400 mb-0.5">Label pada Kotak Target</label>
                                <input
                                  type="text"
                                  value={currentActiveSlide.simulatorConfig?.highlightLabel || ''}
                                  onChange={(e) =>
                                    handleUpdateActiveSlide({
                                      simulatorConfig: {
                                        ...(currentActiveSlide.simulatorConfig || { targetXPercent: 30, targetYPercent: 40, targetWidthPercent: 30, targetHeightPercent: 15, taskInstruction: '', hintText: '' }),
                                        highlightLabel: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="Cth: [PUTAWAY STORAGE] atau 👉 KLIK INI"
                                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-zinc-400 mb-0.5">Pesan Berhasil (Saat Sukses Klik)</label>
                                <input
                                  type="text"
                                  value={currentActiveSlide.simulatorConfig?.successMessage || ''}
                                  onChange={(e) =>
                                    handleUpdateActiveSlide({
                                      simulatorConfig: {
                                        ...(currentActiveSlide.simulatorConfig || { targetXPercent: 30, targetYPercent: 40, targetWidthPercent: 30, targetHeightPercent: 15, taskInstruction: '', hintText: '' }),
                                        successMessage: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="Cth: Tepat! Menu Putaway Terbuka."
                                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-zinc-400 mb-0.5">Tugas untuk Pekerja</label>
                                <input
                                  type="text"
                                  value={currentActiveSlide.simulatorConfig?.taskInstruction || ''}
                                  onChange={(e) =>
                                    handleUpdateActiveSlide({
                                      simulatorConfig: {
                                        ...(currentActiveSlide.simulatorConfig || { targetXPercent: 30, targetYPercent: 40, targetWidthPercent: 30, targetHeightPercent: 15, hintText: '' }),
                                        taskInstruction: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-zinc-400 mb-0.5">Petunjuk jika Salah (Hint)</label>
                                <input
                                  type="text"
                                  value={currentActiveSlide.simulatorConfig?.hintText || ''}
                                  onChange={(e) =>
                                    handleUpdateActiveSlide({
                                      simulatorConfig: {
                                        ...(currentActiveSlide.simulatorConfig || { targetXPercent: 30, targetYPercent: 40, targetWidthPercent: 30, targetHeightPercent: 15, taskInstruction: '' }),
                                        hintText: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── TYPE: SPOT THE MISTAKE (HAZARD HUNT) ── */}
                      {currentActiveSlide.slideType === 'spot_the_mistake' && (
                        <div className="space-y-3 bg-amber-950/20 p-3.5 rounded-xl border border-amber-500/30">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                              🔍 Konfigurasi Foto Lapangan & Titik Bahaya (Hazard Hunt)
                            </label>
                            <span className="text-[10px] text-zinc-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                              Full Photo (Zero Crop)
                            </span>
                          </div>

                          {/* Photo Source: URL or File Upload */}
                          <div className="space-y-1.5">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={currentActiveSlide.imageUrl || ''}
                                onChange={(e) => handleUpdateActiveSlide({ imageUrl: e.target.value })}
                                placeholder="URL Foto Lapangan atau Unggah File..."
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                              />
                              <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-md">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Unggah Foto</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageFileUpload}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <p className="text-[10px] text-zinc-400">
                              Foto dokumentasi lapangan K3/inspeksi gudang tampil utuh 100%. Bebas menentukan letak anomali bahaya di sudut manapun.
                            </p>
                          </div>

                          {/* Zero-Crop Hazard Canvas Stage */}
                          <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col items-center justify-center min-h-[280px] max-h-[580px] overflow-auto shadow-inner">
                            <div
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (rect.width === 0 || rect.height === 0) return;
                                const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                handleUpdateActiveSlide({
                                  spotMistakeConfig: {
                                    ...(currentActiveSlide.spotMistakeConfig || {
                                      challengePrompt: 'Temukan bahaya!',
                                      hazardName: 'Bahaya K3',
                                      explanation: 'Penjelasan K3',
                                      toleranceRadiusPercent: 15,
                                    }),
                                    targetXPercent: clickX,
                                    targetYPercent: clickY,
                                  },
                                });
                              }}
                              className="relative inline-block max-w-full rounded-lg overflow-hidden shadow-2xl border-2 border-amber-500/60 cursor-crosshair select-none bg-black transition-all"
                            >
                              <img
                                src={currentActiveSlide.imageUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80'}
                                alt="Spot preview"
                                className="max-h-[480px] w-auto max-w-full block pointer-events-none object-contain"
                              />
                              {/* Visual Target Tolerance Radius Indicator */}
                              <div
                                style={{
                                  left: `${currentActiveSlide.spotMistakeConfig?.targetXPercent || 50}%`,
                                  top: `${currentActiveSlide.spotMistakeConfig?.targetYPercent || 50}%`,
                                  width: `${(currentActiveSlide.spotMistakeConfig?.toleranceRadiusPercent || 15) * 2}%`,
                                  height: `${(currentActiveSlide.spotMistakeConfig?.toleranceRadiusPercent || 15) * 2}%`,
                                }}
                                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-rose-500 bg-rose-500/25 animate-pulse pointer-events-none flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.7)]"
                              >
                                <span className="text-xs bg-black/80 px-1 py-0.5 rounded-full border border-rose-500/60 shadow">
                                  ⚠️
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1">
                              💡 Klik langsung pada foto lapangan di atas untuk menetapkan titik bahaya, atau atur slider posisi & toleransi di bawah:
                            </span>
                          </div>

                          {/* Hazard Hunt Customization Controls */}
                          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-3">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                Pengaturan Titik Target & Radius Toleransi Klik
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                Posisi: X={currentActiveSlide.spotMistakeConfig?.targetXPercent || 50}%, Y={currentActiveSlide.spotMistakeConfig?.targetYPercent || 50}% | Toleransi: ±{currentActiveSlide.spotMistakeConfig?.toleranceRadiusPercent || 15}%
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                              <div>
                                <label className="block text-zinc-400 mb-1">
                                  Radius Toleransi: <span className="text-white font-bold">{currentActiveSlide.spotMistakeConfig?.toleranceRadiusPercent || 15}%</span>
                                </label>
                                <input
                                  type="range"
                                  min={5}
                                  max={30}
                                  value={currentActiveSlide.spotMistakeConfig?.toleranceRadiusPercent || 15}
                                  onChange={(e) => {
                                    handleUpdateActiveSlide({
                                      spotMistakeConfig: {
                                        ...(currentActiveSlide.spotMistakeConfig || { targetXPercent: 50, targetYPercent: 50, challengePrompt: '', hazardName: '', explanation: '' }),
                                        toleranceRadiusPercent: Number(e.target.value),
                                      },
                                    });
                                  }}
                                  className="w-full accent-rose-500 cursor-pointer"
                                />
                                <span className="text-[9px] text-zinc-500">Semakin besar, semakin mudah diklik pekerja</span>
                              </div>
                              <div>
                                <label className="block text-zinc-400 mb-1">
                                  Posisi Horisontal X: <span className="text-white font-bold">{currentActiveSlide.spotMistakeConfig?.targetXPercent || 50}%</span>
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={currentActiveSlide.spotMistakeConfig?.targetXPercent || 50}
                                  onChange={(e) => {
                                    handleUpdateActiveSlide({
                                      spotMistakeConfig: {
                                        ...(currentActiveSlide.spotMistakeConfig || { targetYPercent: 50, toleranceRadiusPercent: 15, challengePrompt: '', hazardName: '', explanation: '' }),
                                        targetXPercent: Number(e.target.value),
                                      },
                                    });
                                  }}
                                  className="w-full accent-amber-500 cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="block text-zinc-400 mb-1">
                                  Posisi Vertikal Y: <span className="text-white font-bold">{currentActiveSlide.spotMistakeConfig?.targetYPercent || 50}%</span>
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={currentActiveSlide.spotMistakeConfig?.targetYPercent || 50}
                                  onChange={(e) => {
                                    handleUpdateActiveSlide({
                                      spotMistakeConfig: {
                                        ...(currentActiveSlide.spotMistakeConfig || { targetXPercent: 50, toleranceRadiusPercent: 15, challengePrompt: '', hazardName: '', explanation: '' }),
                                        targetYPercent: Number(e.target.value),
                                      },
                                    });
                                  }}
                                  className="w-full accent-amber-500 cursor-pointer"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-800">
                              <div>
                                <label className="block text-[10px] text-zinc-400 mb-0.5">Tantangan untuk Pekerja</label>
                                <input
                                  type="text"
                                  value={currentActiveSlide.spotMistakeConfig?.challengePrompt || ''}
                                  onChange={(e) =>
                                    handleUpdateActiveSlide({
                                      spotMistakeConfig: {
                                        ...(currentActiveSlide.spotMistakeConfig || { targetXPercent: 50, targetYPercent: 50, toleranceRadiusPercent: 15, hazardName: '', explanation: '' }),
                                        challengePrompt: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="Cth: Temukan 1 potensi bahaya pada foto!"
                                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-zinc-400 mb-0.5">Nama Bahaya K3</label>
                                <input
                                  type="text"
                                  value={currentActiveSlide.spotMistakeConfig?.hazardName || ''}
                                  onChange={(e) =>
                                    handleUpdateActiveSlide({
                                      spotMistakeConfig: {
                                        ...(currentActiveSlide.spotMistakeConfig || { targetXPercent: 50, targetYPercent: 50, toleranceRadiusPercent: 15, challengePrompt: '', explanation: '' }),
                                        hazardName: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="Cth: Tumpukan Miring Overhang (> 10cm)"
                                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-zinc-400 mb-0.5">Batas Waktu Tantangan (Detik)</label>
                                <input
                                  type="number"
                                  min={5}
                                  max={60}
                                  value={currentActiveSlide.spotMistakeConfig?.timeLimitSeconds || 20}
                                  onChange={(e) =>
                                    handleUpdateActiveSlide({
                                      spotMistakeConfig: {
                                        ...(currentActiveSlide.spotMistakeConfig || { targetXPercent: 50, targetYPercent: 50, toleranceRadiusPercent: 15, challengePrompt: '', hazardName: '', explanation: '' }),
                                        timeLimitSeconds: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] text-zinc-400 mb-0.5">Penjelasan & Prosedur K3 Benar (Muncul setelah terungkap)</label>
                              <textarea
                                rows={2}
                                value={currentActiveSlide.spotMistakeConfig?.explanation || ''}
                                onChange={(e) =>
                                  handleUpdateActiveSlide({
                                    spotMistakeConfig: {
                                      ...(currentActiveSlide.spotMistakeConfig || { targetXPercent: 50, targetYPercent: 50, toleranceRadiusPercent: 15, challengePrompt: '', hazardName: '' }),
                                      explanation: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Jelaskan mengapa kondisi ini berbahaya dan bagaimana tindakan korektif K3 yang wajib dilakukan..."
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── TYPE: QUIZ CHECKPOINT ── */}
                      {currentActiveSlide.slideType === 'quiz_checkpoint' && (
                        <div className="space-y-3 bg-purple-950/20 p-3 rounded-xl border border-purple-500/30">
                          <label className="block text-[11px] text-purple-300 font-bold">
                            ❓ Konfigurasi Pertanyaan Kuis Checkpoint
                          </label>
                          <input
                            type="text"
                            value={currentActiveSlide.quiz?.question || ''}
                            onChange={(e) =>
                              handleUpdateActiveSlide({
                                quiz: {
                                  ...(currentActiveSlide.quiz || { id: `q-${Date.now()}`, options: ['A', 'B', 'C', 'D'], correctAnswerIndex: 0, explanation: '' }),
                                  question: e.target.value,
                                },
                              })
                            }
                            placeholder="Tuliskan pertanyaan evaluasi..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(currentActiveSlide.quiz?.options || ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D']).map((opt, optIdx) => (
                              <div key={optIdx}>
                                <label className="block text-[10px] text-zinc-400 mb-0.5">
                                  Pilihan {String.fromCharCode(65 + optIdx)} {optIdx === currentActiveSlide.quiz?.correctAnswerIndex && '★ (KUNCI BENAR)'}
                                </label>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const currentOpts = [...(currentActiveSlide.quiz?.options || ['A', 'B', 'C', 'D'])];
                                    currentOpts[optIdx] = e.target.value;
                                    handleUpdateActiveSlide({
                                      quiz: {
                                        ...(currentActiveSlide.quiz || { id: `q-${Date.now()}`, correctAnswerIndex: 0, explanation: '', question: '' }),
                                        options: currentOpts,
                                      },
                                    });
                                  }}
                                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-zinc-400 mb-0.5">Kunci Jawaban Benar</label>
                              <select
                                value={currentActiveSlide.quiz?.correctAnswerIndex || 0}
                                onChange={(e) =>
                                  handleUpdateActiveSlide({
                                    quiz: {
                                      ...(currentActiveSlide.quiz || { id: `q-${Date.now()}`, options: ['A', 'B', 'C', 'D'], explanation: '', question: '' }),
                                      correctAnswerIndex: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                              >
                                <option value={0}>Pilihan A</option>
                                <option value={1}>Pilihan B</option>
                                <option value={2}>Pilihan C</option>
                                <option value={3}>Pilihan D</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-400 mb-0.5">Penjelasan Jawaban</label>
                              <input
                                type="text"
                                value={currentActiveSlide.quiz?.explanation || ''}
                                onChange={(e) =>
                                  handleUpdateActiveSlide({
                                    quiz: {
                                      ...(currentActiveSlide.quiz || { id: `q-${Date.now()}`, options: ['A', 'B', 'C', 'D'], correctAnswerIndex: 0, question: '' }),
                                      explanation: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Mengapa jawaban ini benar..."
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setCreationStep(1)}
                      className="w-1/3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2.5 rounded-xl text-xs transition"
                    >
                      ← Ganti Format Dasar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-2/3 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
                    >
                      {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Simpan & Terbitkan Modul ({editingSlides.length} Slide)</span>
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
