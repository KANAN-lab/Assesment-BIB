// src/components/SopManagementPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  Edit3,
  Volume2,
  VolumeX,
  Scale,
} from 'lucide-react';
import {
  SopModule,
  SopCategory,
  SopDifficulty,
  SopSlide,
  SopSlideType,
  SopPresentationFormat,
  SopHotspotPoint,
  SopStepItem,
  SopDoDontItem,
} from '../types/sop';
import { fetchAllSopModules } from '../lib/sopService';
import { supabase } from '../lib/supabaseClient';
import { SopSlideshowModal } from './SopSlideshowModal';
import { uploadFileToGoogleDrive, formatGoogleDriveImageUrl } from '../lib/googleDriveService';
import { safeLocalStorageSetItem, sanitizeDataForStorage } from '../lib/storageSanitizer';
import { SwalService } from '../domain/SwalService';

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
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [formFormat, setFormFormat] = useState<SopPresentationFormat>('micro_deck');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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

  // Voiceover TTS Testing & Narration State
  const [isTestingAudio, setIsTestingAudio] = useState<boolean>(false);
  const audioUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cleanup speech synthesis on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Generate complete narration text from current slide content
  const generateNarrationTextForSlide = (slide: SopSlide): string => {
    let text = `${slide.title}. `;
    if (slide.subtitle) {
      text += `${slide.subtitle}. `;
    }
    if (slide.slideType === 'step_instruction' && slide.steps && slide.steps.length > 0) {
      text += slide.steps
        .map((st) => `Langkah ${st.stepNumber}: ${st.title}. ${st.description}.${st.keyHighlight ? ` Tips penting: ${st.keyHighlight}.` : ''}`)
        .join(' ');
    } else if (slide.slideType === 'dos_and_donts' && slide.dosAndDonts && slide.dosAndDonts.length > 0) {
      text += slide.dosAndDonts
        .map((dd) => `Praktik benar: ${dd.doTitle}. ${dd.doText}. Larangan keras: ${dd.dontTitle}. ${dd.dontText}.`)
        .join(' ');
    } else if (slide.slideType === 'safety_alert') {
      text += `Peringatan keselamatan ${slide.alertLevel || 'kritis'}: ${slide.content || ''}. `;
      if (slide.steps && slide.steps.length > 0) {
        text += slide.steps.map((st) => `${st.title}: ${st.description}.`).join(' ');
      }
    } else if (slide.slideType === 'quiz_checkpoint' && slide.quiz) {
      text += `Pertanyaan evaluasi kuis: ${slide.quiz.question}. Pilihlah satu jawaban yang paling tepat.`;
    } else if (slide.slideType === 'interactive_simulator' && slide.simulatorConfig) {
      text += `Instruksi simulasi: ${slide.simulatorConfig.taskInstruction}. ${slide.simulatorConfig.hintText || ''}`;
    } else if (slide.slideType === 'spot_the_mistake' && slide.spotMistakeConfig) {
      text += `Tantangan Hazard Hunt: ${slide.spotMistakeConfig.challengePrompt}. Temukan letak bahaya pada foto.`;
    } else if (slide.content) {
      text += slide.content;
    }
    return text.trim();
  };

  // Preview test audio for voiceover narration
  const handleToggleTestAudio = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onToast) onToast('Browser Anda tidak mendukung Web Speech API Text-to-Speech.');
      return;
    }

    if (isTestingAudio) {
      window.speechSynthesis.cancel();
      audioUtteranceRef.current = null;
      setIsTestingAudio(false);
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      if (onToast) onToast('Teks narasi suara masih kosong. Tuliskan teks atau klik "Generate dari Materi" terlebih dahulu.');
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(
      (v) =>
        v.lang === 'id-ID' ||
        v.lang.toLowerCase().startsWith('id') ||
        v.name.toLowerCase().includes('indonesia') ||
        v.name.toLowerCase().includes('bahasa')
    );
    if (idVoice) {
      utterance.voice = idVoice;
    }

    audioUtteranceRef.current = utterance;

    utterance.onend = () => {
      audioUtteranceRef.current = null;
      setIsTestingAudio(false);
    };
    utterance.onerror = () => {
      audioUtteranceRef.current = null;
      setIsTestingAudio(false);
    };

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
      setIsTestingAudio(true);
    }, 60);
  };

  const handleGenerateNarrationForCurrentSlide = () => {
    if (!currentActiveSlide) return;
    const generated = generateNarrationTextForSlide(currentActiveSlide);
    if (!generated) {
      if (onToast) onToast('Tidak ada materi slide yang cukup untuk menyusun narasi otomatis.');
      return;
    }
    handleUpdateActiveSlide({ audioNarrationText: generated });
    if (onToast) onToast('✨ Teks narasi suara berhasil dibuat otomatis dari materi slide!');
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      if (onToast) onToast('Ukuran file gambar maksimal 15MB!');
      return;
    }

    // 1. Tampilkan preview instan di UI menggunakan Blob URL (0 byte storage overhead)
    const blobPreviewUrl = URL.createObjectURL(file);
    handleUpdateActiveSlide({ imageUrl: blobPreviewUrl });

    // 2. Unggah otomatis ke Google Drive di folder Administrator / Dokumen_SOP
    setIsUploadingImage(true);
    try {
      if (onToast) onToast('Mengunggah gambar slide ke Google Drive resmi...');
      const uploadRes = await uploadFileToGoogleDrive(file, {
        workerId: 'SYS-ADMIN',
        workerName: 'System Administrator',
        moduleCategory: 'Dokumen_SOP',
      });
      if (uploadRes.success && (uploadRes.directUrl || uploadRes.webViewLink)) {
        const finalUrl = uploadRes.directUrl || uploadRes.webViewLink;
        handleUpdateActiveSlide({ imageUrl: finalUrl });
        if (onToast) onToast('✓ Berkas slide SOP tersimpan di Google Drive!');
      } else {
        const err = uploadRes.error || 'Gagal menyimpan ke Google Drive';
        console.warn('Gagal upload gambar SOP ke Google Drive:', err);
        if (onToast) onToast(`⚠️ Upload GDrive gagal: ${err}`);
      }
    } catch (err: any) {
      console.warn('Gagal upload gambar SOP ke Google Drive:', err);
      if (onToast) onToast(`Gagal terhubung ke Google Drive: ${err?.message || err}`);
    } finally {
      setIsUploadingImage(false);
    }

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
        audioNarrationText: 'Amati diagram inspeksi interaktif berikut. Ketuk titik penanda untuk memeriksa kondisi fisik komponen.',
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
        audioNarrationText: 'Patuhi kaidah DO dan hindari larangan keras DONT.',
        dosAndDonts: [
          {
            doTitle: 'Praktik Benar (DO)',
            doText: 'Lakukan sesuai panduan resmi operasional.',
            doTip: 'Selalu lakukan pengecekan ganda',
            dontTitle: 'Larangan Keras (DON\'T)',
            dontText: 'Hindari tindakan berisiko bahaya ini.',
            dontWarning: 'Dapat memicu kecelakaan fatal',
          },
        ],
      };
    } else if (type === 'safety_alert') {
      newSlide = {
        id: `sl-${Date.now()}-${newSlideNumber}`,
        slideNumber: newSlideNumber,
        slideType: 'safety_alert',
        title: `Peringatan K3 & Golden Rules #${newSlideNumber}`,
        subtitle: 'Kepatuhan mutlak keselamatan kerja',
        audioNarrationText: 'Perhatikan peringatan keselamatan kritis berikut sebelum memulai pekerjaan.',
        alertLevel: 'critical',
        content: 'Wajib menghentikan pekerjaan (Stop Work Authority) jika ditemukan potensi bahaya di area kerja.',
      };
    } else if (type === 'quiz_checkpoint') {
      newSlide = {
        id: `sl-${Date.now()}-${newSlideNumber}`,
        slideNumber: newSlideNumber,
        slideType: 'quiz_checkpoint',
        title: `Kuis Checkpoint Evaluasi #${newSlideNumber}`,
        subtitle: 'Verifikasi pemahaman materi',
        audioNarrationText: 'Uji pemahaman Anda dengan menjawab pertanyaan kuis evaluasi berikut secara tepat.',
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
        audioNarrationText: 'Ikuti langkah-langkah kerja berikut secara berurutan.',
        steps: [
          { stepNumber: 1, title: 'Persiapan & Pengecekan APD', description: 'Periksa kelengkapan APD dan pastikan area aman.', keyHighlight: 'Cek kondisi kelayakan fisik' },
          { stepNumber: 2, title: 'Pelaksanaan Kerja Standar', description: 'Laksanakan tahapan pekerjaan sesuai standar operasional.', keyHighlight: 'Patuhi limit kecepatan & beban' },
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

  // Open modal in Create mode
  const handleOpenCreateModal = () => {
    setEditingModuleId(null);
    setFormCode('');
    setFormTitle('');
    setFormDesc('');
    setFormCategory('K3 & Safety');
    setFormDifficulty('Beginner');
    setFormFormat('micro_deck');
    setFormTargetDivs(['ALL']);
    setFormTargetRoles(['ALL']);
    setFormEstMinutes(3);
    setFormPoints(50);
    setFormIsMandatory(false);
    setEditingSlides([]);
    setFormError(null);
    setCreationStep(1);
    setIsCreateModalOpen(true);
  };

  // Open modal in Edit mode
  const handleOpenEditModal = (item: SopModule) => {
    setEditingModuleId(item.id);
    setFormCode(item.code || '');
    setFormTitle(item.title || '');
    setFormDesc(item.description || '');
    setFormCategory(item.category || 'K3 & Safety');
    setFormDifficulty(item.difficulty || 'Beginner');
    setFormFormat(item.presentationFormat || 'micro_deck');
    setFormTargetDivs(item.targetDivisions && item.targetDivisions.length > 0 ? item.targetDivisions : ['ALL']);
    setFormTargetRoles(item.targetRoles && item.targetRoles.length > 0 ? item.targetRoles : ['ALL']);
    setFormEstMinutes(item.estimatedMinutes || 3);
    setFormPoints(item.pointsReward || 50);
    setFormIsMandatory(!!item.isMandatory);

    const rawSlides = Array.isArray(item.slides) ? item.slides : [];
    const clonedSlides: SopSlide[] = JSON.parse(JSON.stringify(rawSlides));
    setEditingSlides(
      clonedSlides.length > 0
        ? clonedSlides
        : [
            {
              id: `sl-${Date.now()}-1`,
              slideNumber: 1,
              slideType: 'step_instruction',
              title: item.title || 'Panduan Langkah Kerja',
              subtitle: 'Ikuti langkah-langkah kerja operasional',
              audioNarrationText: 'Ikuti langkah-langkah kerja berikut secara berurutan.',
              steps: [
                { stepNumber: 1, title: 'Persiapan', description: 'Lakukan pengecekan dan siapkan alat kerja.' },
              ],
            },
          ]
    );
    setActiveSlideIndex(0);
    setFormError(null);
    setCreationStep(2);
    setIsCreateModalOpen(true);
  };

  // Handle Save (Create or Update) SOP Module
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

    // Validasi kelengkapan slide
    for (let i = 0; i < editingSlides.length; i++) {
      const sl = editingSlides[i];
      if (!sl.title.trim()) {
        setFormError(`Slide #${i + 1} belum memiliki Judul Slide.`);
        setActiveSlideIndex(i);
        return;
      }
      if (sl.slideType === 'step_instruction') {
        if (!sl.steps || sl.steps.length === 0) {
          setFormError(`Slide #${i + 1} (Langkah Kerja) wajib memiliki minimal 1 langkah kerja.`);
          setActiveSlideIndex(i);
          return;
        }
        for (let j = 0; j < sl.steps.length; j++) {
          if (!sl.steps[j].title.trim()) {
            setFormError(`Slide #${i + 1}, Langkah #${j + 1} belum memiliki Judul Langkah.`);
            setActiveSlideIndex(i);
            return;
          }
        }
      }
      if (sl.slideType === 'quiz_checkpoint' && sl.quiz) {
        if (!sl.quiz.question.trim()) {
          setFormError(`Slide #${i + 1} (Kuis Checkpoint) belum memiliki pertanyaan.`);
          setActiveSlideIndex(i);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const sanitizedSlides = sanitizeDataForStorage(editingSlides);

      if (editingModuleId) {
        // ── MODE UPDATE EXISTING MODULE ──
        const updatePayload = {
          code: formCode.toUpperCase().trim(),
          title: formTitle.trim(),
          description: formDesc.trim(),
          category: formCategory,
          difficulty: formDifficulty,
          target_divisions: formTargetDivs,
          target_roles: formTargetRoles,
          estimated_minutes: formEstMinutes,
          points_reward: formPoints,
          badge_icon: formFormat === 'interactive_simulator' ? 'Smartphone' : formFormat === 'spot_the_mistake' ? 'ShieldAlert' : 'BookOpen',
          slides_data: sanitizedSlides,
          is_mandatory: formIsMandatory,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('sop_modules')
          .update(updatePayload)
          .eq('id', editingModuleId);

        if (error) {
          console.warn('Supabase update fallback to local custom cache:', error);
        }

        const localCustom = JSON.parse(localStorage.getItem('bib_sop_custom_modules_v2') || '[]');
        const existingIdx = localCustom.findIndex((m: any) => m.id === editingModuleId);
        const updatedModuleObj: any = {
          id: editingModuleId,
          ...updatePayload,
          presentationFormat: formFormat,
          targetDivisions: formTargetDivs,
          targetRoles: formTargetRoles,
          estimatedMinutes: formEstMinutes,
          pointsReward: formPoints,
          slides: sanitizedSlides,
          isMandatory: formIsMandatory,
          isActive: true,
          updatedAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          localCustom[existingIdx] = { ...localCustom[existingIdx], ...updatedModuleObj };
        } else {
          localCustom.push(updatedModuleObj);
        }
        safeLocalStorageSetItem('bib_sop_custom_modules_v2', localCustom);

        setModules((prev) =>
          prev.map((m) => (m.id === editingModuleId ? { ...m, ...updatedModuleObj } : m))
        );

        onToast?.(`Modul SOP ${formCode.toUpperCase()} berhasil diperbarui!`);
      } else {
        // ── MODE CREATE NEW MODULE ──
        const newModuleId = `sop-${formCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
        const newModuleRecord = {
          id: newModuleId,
          code: formCode.toUpperCase().trim(),
          title: formTitle.trim(),
          description: formDesc.trim(),
          category: formCategory,
          difficulty: formDifficulty,
          target_divisions: formTargetDivs,
          target_roles: formTargetRoles,
          estimated_minutes: formEstMinutes,
          points_reward: formPoints,
          badge_icon: formFormat === 'interactive_simulator' ? 'Smartphone' : formFormat === 'spot_the_mistake' ? 'ShieldAlert' : 'BookOpen',
          slides_data: sanitizedSlides,
          is_mandatory: formIsMandatory,
          deadline_days: 14,
          version: 'v1.0',
          is_active: true,
          author: 'Supervisor / Admin Studio',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('sop_modules').insert([newModuleRecord]);
        if (error) {
          console.warn('Supabase insert fallback to local custom cache:', error);
        }

        const localCustom = JSON.parse(localStorage.getItem('bib_sop_custom_modules_v2') || '[]');
        const newModuleObj: any = {
          ...newModuleRecord,
          presentationFormat: formFormat,
          targetDivisions: formTargetDivs,
          targetRoles: formTargetRoles,
          estimatedMinutes: formEstMinutes,
          pointsReward: formPoints,
          slides: sanitizedSlides,
          isMandatory: formIsMandatory,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        localCustom.push(newModuleObj);
        safeLocalStorageSetItem('bib_sop_custom_modules_v2', localCustom);

        setModules((prev) => [newModuleObj, ...prev]);
        onToast?.(`Modul SOP ${formCode.toUpperCase()} (${editingSlides.length} Slide) berhasil diterbitkan!`);
      }

      setIsCreateModalOpen(false);
      setEditingModuleId(null);
      setCreationStep(1);
      loadModules();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan modul SOP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete SOP module
  const handleDeleteModule = async (item: SopModule) => {
    const isConfirmed = await SwalService.confirm({
      title: `Hapus Modul ${item.code}?`,
      text: `Apakah Anda yakin ingin menghapus modul "${item.title}"? Seluruh data materi dan quiz checklist terkait akan terhapus.`,
      confirmButtonText: 'Ya, Hapus Modul',
      isDestructive: true,
    });
    if (!isConfirmed) return;

    try {
      await supabase.from('sop_modules').delete().eq('id', item.id);
      const localCustom = JSON.parse(localStorage.getItem('bib_sop_custom_modules_v2') || '[]');
      const filtered = localCustom.filter((m: any) => m.id !== item.id);
      safeLocalStorageSetItem('bib_sop_custom_modules_v2', filtered);

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
    link.setAttribute('download', `Katalog_SOP_PT_DAYA_ANUGRAH_MULYA_${new Date().toISOString().slice(0, 10)}.csv`);
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
            onClick={handleOpenCreateModal}
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
                  onClick={() => handleOpenEditModal(item)}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg transition flex items-center gap-1 text-[11px] font-bold px-2.5"
                  title="Edit Modul SOP & Slide"
                >
                  <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">Edit</span>
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
                        : editingModuleId
                        ? `Mode Edit Modul: ${formCode || 'Modul SOP'} (${editingSlides.length} Slide)`
                        : `Langkah 2: Studio Multi-Slide Deck (${editingSlides.length} Slide Aktif)`}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {creationStep === 1
                        ? 'Tentukan format utama modul sebelum menyusun alur slide interaktif'
                        : editingModuleId
                        ? 'Perbarui alur slide, instruksi langkah kerja, kuis checkpoint, atau informasi umum modul'
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

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                      <div className="sm:col-span-3">
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

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Deskripsi Singkat Modul</label>
                      <textarea
                        rows={2}
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        placeholder="Tuliskan gambaran umum materi, tujuan pelatihan, atau standar operasional yang ditargetkan..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                        <label className="block text-[11px] text-zinc-400 mb-1">Estimasi Waktu (Menit)</label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={formEstMinutes}
                          onChange={(e) => setFormEstMinutes(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
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

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-zinc-800">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none">
                        <input
                          type="checkbox"
                          checked={formIsMandatory}
                          onChange={(e) => setFormIsMandatory(e.target.checked)}
                          className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-900 cursor-pointer"
                        />
                        <span className="font-bold text-amber-300">Modul Wajib Kepatuhan (Mandatory Compliance)</span>
                        <span className="text-[10px] text-zinc-400 hidden sm:inline">— Kuis & deck wajib diselesaikan seluruh personel</span>
                      </label>

                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <span className="font-semibold text-zinc-300">Target Divisi:</span>
                        <span className="bg-zinc-800 px-2 py-0.5 rounded text-[10px] text-purple-300 font-mono">
                          {formTargetDivs.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ─── 🎞️ SLIDE FILMSTRIP & TIMELINE NAVIGATION ─── */}
                  <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-purple-500/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-white">
                          Timeline Slide ({editingSlides.length} Slide)
                        </span>
                      </div>
                      
                      {/* Add Slide Quick Menu */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                        <span className="text-[10px] text-zinc-400 mr-1 hidden sm:inline">+ Tambah:</span>
                        <button
                          type="button"
                          onClick={() => handleAddSlide('step_instruction')}
                          className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                          title="Tambah Slide Langkah Kerja"
                        >
                          <ListOrdered className="w-3 h-3" /> Langkah Kerja
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSlide('dos_and_donts')}
                          className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                          title="Tambah Slide DOs & DON'Ts"
                        >
                          <Scale className="w-3 h-3" /> Do's & Don'ts
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSlide('safety_alert')}
                          className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                          title="Tambah Slide Peringatan Bahaya K3"
                        >
                          <ShieldAlert className="w-3 h-3" /> Peringatan K3
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSlide('interactive_simulator')}
                          className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                          title="Tambah Slide Simulator Klik WMS"
                        >
                          <Smartphone className="w-3 h-3" /> Simulator
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSlide('spot_the_mistake')}
                          className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700/60 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                          title="Tambah Slide Hazard Hunt"
                        >
                          <ShieldAlert className="w-3 h-3" /> Hazard Hunt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSlide('quiz_checkpoint')}
                          className="px-2 py-1 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700/60 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                          title="Tambah Slide Kuis Checkpoint"
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
                        if (slide.slideType === 'dos_and_donts') typeIcon = '⚖️';
                        if (slide.slideType === 'safety_alert') typeIcon = '🚨';
                        if (slide.slideType === 'step_instruction') typeIcon = '📋';

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
                          <label className="block text-[11px] text-zinc-400 mb-1">Judul Slide *</label>
                          <input
                            type="text"
                            value={currentActiveSlide.title}
                            onChange={(e) => handleUpdateActiveSlide({ title: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                            placeholder="Cth: Standar Pengoperasian MHE"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">Sub-judul / Instruksi Singkat</label>
                          <input
                            type="text"
                            value={currentActiveSlide.subtitle || ''}
                            onChange={(e) => handleUpdateActiveSlide({ subtitle: e.target.value })}
                            placeholder="Cth: Patuhi urutan 6 langkah kerja aman berikut"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* Common Audio Narration (TTS Voiceover) */}
                      <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <label className="text-[11px] text-purple-300 font-semibold flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                            <span>Teks Narasi Suara / Voiceover TTS</span>
                            <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">(Otomatis dibacakan saat pekerja membuka slide)</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleGenerateNarrationForCurrentSlide}
                              className="px-2.5 py-1 text-[11px] bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded-lg border border-purple-700/60 transition flex items-center gap-1 font-medium"
                              title="Rangkai kalimat narasi otomatis dari judul, instruksi langkah kerja, atau kuis di slide ini"
                            >
                              <Sparkles className="w-3 h-3 text-purple-300" />
                              <span>Generate dari Materi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleTestAudio(currentActiveSlide.audioNarrationText || '')}
                              className={`px-2.5 py-1 text-[11px] rounded-lg border transition flex items-center gap-1 font-medium ${
                                isTestingAudio
                                  ? 'bg-red-950/80 text-red-300 border-red-700 hover:bg-red-900 animate-pulse'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                              }`}
                              title={isTestingAudio ? 'Hentikan uji coba audio' : 'Dengarkan pratinjau suara narator dalam bahasa Indonesia'}
                            >
                              {isTestingAudio ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-purple-400" />}
                              <span>{isTestingAudio ? 'Stop' : 'Uji Suara'}</span>
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={2}
                          value={currentActiveSlide.audioNarrationText || ''}
                          onChange={(e) => handleUpdateActiveSlide({ audioNarrationText: e.target.value })}
                          placeholder="Tuliskan kalimat instruksi yang ingin diucapkan oleh sistem suara narator (atau klik 'Generate dari Materi')..."
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white resize-none placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
                        />
                      </div>

                      {/* ── TYPE: STEP INSTRUCTION (PANDUAN LANGKAH KERJA) ── */}
                      {currentActiveSlide.slideType === 'step_instruction' && (
                        <div className="space-y-3 bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/30">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                              <ListOrdered className="w-4 h-4 text-emerald-400" />
                              Daftar Urutan Langkah Kerja ({currentActiveSlide.steps?.length || 0} Langkah)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const curSteps = currentActiveSlide.steps || [];
                                const nextNum = curSteps.length + 1;
                                const newStep: SopStepItem = {
                                  stepNumber: nextNum,
                                  title: `Langkah ${nextNum}: `,
                                  description: '',
                                  keyHighlight: '',
                                };
                                handleUpdateActiveSlide({ steps: [...curSteps, newStep] });
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Langkah</span>
                            </button>
                          </div>

                          {/* Steps List */}
                          <div className="space-y-2.5">
                            {(!currentActiveSlide.steps || currentActiveSlide.steps.length === 0) ? (
                              <div className="text-center py-6 border border-dashed border-emerald-800/60 rounded-xl bg-zinc-950/40 text-xs text-zinc-400">
                                Belum ada langkah kerja. Klik tombol <strong className="text-emerald-300">+ Tambah Langkah</strong> di atas untuk menambahkan langkah kerja (bisa 6 langkah atau lebih).
                              </div>
                            ) : (
                              currentActiveSlide.steps.map((step, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 space-y-2 hover:border-emerald-500/40 transition"
                                >
                                  {/* Step header & reordering/delete controls */}
                                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-[11px] flex items-center justify-center">
                                        {sIdx + 1}
                                      </span>
                                      <span className="text-[11px] font-bold text-zinc-300">
                                        Langkah Kerja #{sIdx + 1}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (sIdx === 0) return;
                                          const steps = [...(currentActiveSlide.steps || [])];
                                          const temp = steps[sIdx];
                                          steps[sIdx] = steps[sIdx - 1];
                                          steps[sIdx - 1] = temp;
                                          const renumbered = steps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
                                          handleUpdateActiveSlide({ steps: renumbered });
                                        }}
                                        disabled={sIdx === 0}
                                        className="p-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-25 text-zinc-300 rounded text-xs"
                                        title="Pindah ke atas"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const steps = [...(currentActiveSlide.steps || [])];
                                          if (sIdx >= steps.length - 1) return;
                                          const temp = steps[sIdx];
                                          steps[sIdx] = steps[sIdx + 1];
                                          steps[sIdx + 1] = temp;
                                          const renumbered = steps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
                                          handleUpdateActiveSlide({ steps: renumbered });
                                        }}
                                        disabled={sIdx === (currentActiveSlide.steps?.length || 0) - 1}
                                        className="p-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-25 text-zinc-300 rounded text-xs"
                                        title="Pindah ke bawah"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const steps = (currentActiveSlide.steps || [])
                                            .filter((_, i) => i !== sIdx)
                                            .map((s, i) => ({ ...s, stepNumber: i + 1 }));
                                          handleUpdateActiveSlide({ steps });
                                        }}
                                        className="p-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded text-xs ml-1"
                                        title="Hapus langkah ini"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Inputs: Title, Description, Key Highlight */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div className="sm:col-span-2">
                                      <label className="block text-[10px] text-zinc-400 mb-0.5">Judul Langkah *</label>
                                      <input
                                        type="text"
                                        value={step.title}
                                        onChange={(e) => {
                                          const steps = [...(currentActiveSlide.steps || [])];
                                          steps[sIdx] = { ...steps[sIdx], title: e.target.value };
                                          handleUpdateActiveSlide({ steps });
                                        }}
                                        placeholder="Cth: Persiapan APD & Matriks Bahaya"
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-emerald-400 mb-0.5">💡 Tips / Key Highlight (Opsional)</label>
                                      <input
                                        type="text"
                                        value={step.keyHighlight || ''}
                                        onChange={(e) => {
                                          const steps = [...(currentActiveSlide.steps || [])];
                                          steps[sIdx] = { ...steps[sIdx], keyHighlight: e.target.value };
                                          handleUpdateActiveSlide({ steps });
                                        }}
                                        placeholder="Cth: Pastikan tali helm terkunci"
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-zinc-400 mb-0.5">Penjelasan / Deskripsi Detail Prosedur *</label>
                                    <textarea
                                      rows={2}
                                      value={step.description}
                                      onChange={(e) => {
                                        const steps = [...(currentActiveSlide.steps || [])];
                                        steps[sIdx] = { ...steps[sIdx], description: e.target.value };
                                        handleUpdateActiveSlide({ steps });
                                      }}
                                      placeholder="Jelaskan secara runtut tindakan teknis yang harus dilakukan pekerja..."
                                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white resize-none"
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── TYPE: DOS AND DON'TS ── */}
                      {currentActiveSlide.slideType === 'dos_and_donts' && (
                        <div className="space-y-3 bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-zinc-300 font-bold flex items-center gap-1.5">
                              <Scale className="w-4 h-4 text-cyan-400" />
                              Komparasi Aturan Benar (DO) vs Larangan (DON'T) ({currentActiveSlide.dosAndDonts?.length || 0} Pasangan)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const cur = currentActiveSlide.dosAndDonts || [];
                                const newItem: SopDoDontItem = {
                                  doTitle: '',
                                  doText: '',
                                  doTip: '',
                                  dontTitle: '',
                                  dontText: '',
                                  dontWarning: '',
                                };
                                handleUpdateActiveSlide({ dosAndDonts: [...cur, newItem] });
                              }}
                              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Pasangan</span>
                            </button>
                          </div>

                          <div className="space-y-3">
                            {(!currentActiveSlide.dosAndDonts || currentActiveSlide.dosAndDonts.length === 0) ? (
                              <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-400">
                                Belum ada pasangan DO & DON'T. Klik tombol <strong className="text-cyan-300">+ Tambah Pasangan</strong> di atas.
                              </div>
                            ) : (
                              currentActiveSlide.dosAndDonts.map((dd, ddIdx) => (
                                <div key={ddIdx} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                                  <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                                    <span className="text-xs font-bold text-zinc-300">Pasangan Aturan #{ddIdx + 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (currentActiveSlide.dosAndDonts || []).filter((_, i) => i !== ddIdx);
                                        handleUpdateActiveSlide({ dosAndDonts: updated });
                                      }}
                                      className="p-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded text-xs"
                                      title="Hapus pasangan ini"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* DO side */}
                                    <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded-lg space-y-2">
                                      <span className="text-[11px] font-black text-emerald-400 uppercase flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> DO (Praktik Benar)
                                      </span>
                                      <div>
                                        <label className="block text-[10px] text-zinc-400 mb-0.5">Judul Tindakan Benar *</label>
                                        <input
                                          type="text"
                                          value={dd.doTitle}
                                          onChange={(e) => {
                                            const list = [...(currentActiveSlide.dosAndDonts || [])];
                                            list[ddIdx] = { ...list[ddIdx], doTitle: e.target.value };
                                            handleUpdateActiveSlide({ dosAndDonts: list });
                                          }}
                                          placeholder="Cth: Selalu Bunyikan Klakson di Persimpangan"
                                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-zinc-400 mb-0.5">Penjelasan DO *</label>
                                        <textarea
                                          rows={2}
                                          value={dd.doText}
                                          onChange={(e) => {
                                            const list = [...(currentActiveSlide.dosAndDonts || [])];
                                            list[ddIdx] = { ...list[ddIdx], doText: e.target.value };
                                            handleUpdateActiveSlide({ dosAndDonts: list });
                                          }}
                                          placeholder="Alasan mengapa tindakan ini wajib..."
                                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white resize-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-emerald-400 mb-0.5">Tips Tambahan (Opsional)</label>
                                        <input
                                          type="text"
                                          value={dd.doTip || ''}
                                          onChange={(e) => {
                                            const list = [...(currentActiveSlide.dosAndDonts || [])];
                                            list[ddIdx] = { ...list[ddIdx], doTip: e.target.value };
                                            handleUpdateActiveSlide({ dosAndDonts: list });
                                          }}
                                          placeholder="Cth: Cek kaca cembung di sudut lorong"
                                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white"
                                        />
                                      </div>
                                    </div>

                                    {/* DONT side */}
                                    <div className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded-lg space-y-2">
                                      <span className="text-[11px] font-black text-rose-400 uppercase flex items-center gap-1">
                                        <X className="w-3.5 h-3.5" /> DON'T (Larangan Keras)
                                      </span>
                                      <div>
                                        <label className="block text-[10px] text-zinc-400 mb-0.5">Judul Larangan *</label>
                                        <input
                                          type="text"
                                          value={dd.dontTitle}
                                          onChange={(e) => {
                                            const list = [...(currentActiveSlide.dosAndDonts || [])];
                                            list[ddIdx] = { ...list[ddIdx], dontTitle: e.target.value };
                                            handleUpdateActiveSlide({ dosAndDonts: list });
                                          }}
                                          placeholder="Cth: Dilarang Mengoperasikan HP Saat Berkendara"
                                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-zinc-400 mb-0.5">Penjelasan DON'T *</label>
                                        <textarea
                                          rows={2}
                                          value={dd.dontText}
                                          onChange={(e) => {
                                            const list = [...(currentActiveSlide.dosAndDonts || [])];
                                            list[ddIdx] = { ...list[ddIdx], dontText: e.target.value };
                                            handleUpdateActiveSlide({ dosAndDonts: list });
                                          }}
                                          placeholder="Dampak buruk atau risiko bahayanya..."
                                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white resize-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-rose-400 mb-0.5">Peringatan Bahaya (Opsional)</label>
                                        <input
                                          type="text"
                                          value={dd.dontWarning || ''}
                                          onChange={(e) => {
                                            const list = [...(currentActiveSlide.dosAndDonts || [])];
                                            list[ddIdx] = { ...list[ddIdx], dontWarning: e.target.value };
                                            handleUpdateActiveSlide({ dosAndDonts: list });
                                          }}
                                          placeholder="Cth: Pelanggaran memicu sanksi SP-2"
                                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── TYPE: SAFETY ALERT ── */}
                      {currentActiveSlide.slideType === 'safety_alert' && (
                        <div className="space-y-3 bg-amber-950/20 p-3.5 rounded-xl border border-amber-500/30">
                          <label className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-amber-400" />
                            Konfigurasi Peringatan Bahaya Kritis & Golden Rules K3
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-zinc-400 mb-1">Tingkat Bahaya (Alert Level)</label>
                              <select
                                value={currentActiveSlide.alertLevel || 'critical'}
                                onChange={(e) => handleUpdateActiveSlide({ alertLevel: e.target.value as any })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                              >
                                <option value="critical">🔴 Critical (Bahaya Fatal / Jiwa)</option>
                                <option value="warning">🟡 Warning (Peringatan Insiden / Kerusakan)</option>
                                <option value="info">🔵 Info (Petunjuk Kepatuhan Standar)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-400 mb-1">Isi Peringatan / Golden Rule *</label>
                              <textarea
                                rows={2}
                                value={currentActiveSlide.content || ''}
                                onChange={(e) => handleUpdateActiveSlide({ content: e.target.value })}
                                placeholder="Tuliskan pesan peringatan keselamatan yang wajib dipatuhi pekerja..."
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

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
                                src={formatGoogleDriveImageUrl(currentActiveSlide.imageUrl) || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80'}
                                alt="Simulator screen"
                                className="max-h-[480px] w-auto max-w-full block pointer-events-none object-contain"
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80';
                                }}
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
                                src={formatGoogleDriveImageUrl(currentActiveSlide.imageUrl) || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80'}
                                alt="Spot preview"
                                className="max-h-[480px] w-auto max-w-full block pointer-events-none object-contain"
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80';
                                }}
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
                    {!editingModuleId && (
                      <button
                        type="button"
                        onClick={() => setCreationStep(1)}
                        className="w-1/3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2.5 rounded-xl text-xs transition"
                      >
                        ← Ganti Format Dasar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting || isUploadingImage}
                      className={`${
                        editingModuleId ? 'w-full' : 'w-2/3'
                      } bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30`}
                    >
                      {(isSubmitting || isUploadingImage) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>
                        {isUploadingImage
                          ? 'Mengunggah ke Drive...'
                          : isSubmitting
                          ? 'Menyimpan Perubahan...'
                          : editingModuleId
                          ? `Simpan Perubahan Modul (${editingSlides.length} Slide)`
                          : `Simpan & Terbitkan Modul (${editingSlides.length} Slide)`}
                      </span>
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
