# Spesifikasi Lengkap: Interactive SOP Micro-Deck & Learning Academy
## Employee Logistics Assessment Platform — PT. DAYA ANUGRAH MULYA
**Dokumen Versi**: 2.0.0 (Enterprise Micro-Learning, Multi-Format Interactive Deck, Voice-Over, Compliance Heatmap & Gappy AI Assistant)  
**Status**: Approved Master Specification  
**Author**: Antigravity AI & Engineering Team  
**Perusahaan**: PT. DAYA ANUGRAH MULYA  

---

## 1. Ringkasan Eksekutif & Visi Modul

Modul **Interactive SOP Micro-Deck** dirancang untuk mendisrupsi metode pelatihan konvensional yang mengandalkan dokumen PDF tebal statis. Sistem mengonversi seluruh Standar Operasional Prosedur (SOP), kaidah K3, dan instruksi kerja teknis ke dalam format **Kartu Slideshow Mikro (*Interactive Micro-Decks*)** yang interaktif, visual, tergamifikasi, dan dapat dipelajari dalam waktu 2–4 menit di smartphone maupun desktop.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              EKOSISTEM SOP MICRO-DECK PT. DAYA ANUGRAH MULYA                │
├───────────────────────────────┬───────────────────────────────┬─────────────┤
│      1. LEARNING VIEWER       │       2. GAMIFIKASI BIB       │   3. CMS    │
│  - 9 Tipe Format Slide        │  - +50 PTS Reward per Modul   │ - Visual    │
│  - Story-Bar Progress         │  - +2.5 Nilai BIB Benchmark   │   Deck      │
│  - TTS Audio Narasi Suara     │  - Learning Path & Tier Badge │   Builder   │
│  - Interactive Diagram Hotspot│  - Anti-Speedrun Validation   │ - Heatmap   │
│  - Gappy AI SOP Explainer     │  - Micro-Certificate Digital  │   Audit ISO │
└───────────────────────────────┴───────────────────────────────┴─────────────┘
```

---

## 2. Arsitektur Domain Model & Tipe Data (TypeScript)

Arsitektur data dirancang dengan pemisahan tegas antara entity deck, slide polymorphic, tracking progres pembacaan, dan analitik kepatuhan.

```ts
// src/types/sop.ts

export type SopCategory = 
  | 'K3 & Safety' 
  | 'Operasional MHE' 
  | 'Warehouse & Staging' 
  | 'Inbound & Timbangan' 
  | 'Outbound & Ekspedisi'
  | '5S & Continuous Improvement'
  | 'Tanggap Darurat & Lingkungan';

export type SopDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Mandatory Compliance';

/** 9 Tipe Slide Interaktif yang Didukung Engine */
export type SopSlideType = 
  | 'step_instruction'    // 1. Panduan langkah kerja bernomor urut & berikon
  | 'dos_and_donts'       // 2. Komparasi visual perbuatan benar (DO) vs salah (DON'T)
  | 'safety_alert'        // 3. Peringatan bahaya kritis & Golden Rules K3
  | 'interactive_hotspot' // 4. Diagram gambar dengan titik inspeksi interaktif
  | 'decision_tree'       // 5. Pohon keputusan alur tindakan cepat di lapangan
  | 'video_demonstration' // 6. Video pendek/animasi gerakan teknis operasional
  | 'faq_accordion'       // 7. Tanya-jawab seputar kendala umum di lapangan
  | 'glossary_card'       // 8. Istilah teknis, jargon logistik, dan singkatan
  | 'quiz_checkpoint';    // 9. Kuis evaluasi pemahaman akhir sebelum klaim poin

// ─── Sub-Interfaces Format Slide ──────────────────────────────────────────

export interface SopStepItem {
  stepNumber: number;
  title: string;
  description: string;
  iconName?: string;
  keyHighlight?: string;
}

export interface SopDoDontItem {
  doTitle: string;
  doText: string;
  doTip?: string;
  dontTitle: string;
  dontText: string;
  dontWarning?: string;
}

export interface SopHotspotPoint {
  id: string;
  xPercent: number;          // Posisi X (0 - 100%) pada gambar
  yPercent: number;          // Posisi Y (0 - 100%) pada gambar
  label: string;
  description: string;
  status: 'critical' | 'check' | 'safe';
}

export interface SopDecisionNode {
  condition: string;
  actionRequired: string;
  responsibleRole?: string;
  isEscalateToSupervisor?: boolean;
}

export interface SopFaqItem {
  question: string;
  answer: string;
}

export interface SopGlossaryItem {
  term: string;
  definition: string;
  practicalExample?: string;
}

export interface SopQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  points: number;
}

// ─── Main Slide Interface ──────────────────────────────────────────────────

export interface SopSlide {
  id: string;
  slideNumber: number;
  slideType: SopSlideType;
  title: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  audioNarrationText?: string;   // Teks khusus untuk di-voiceover oleh Text-to-Speech
  alertLevel?: 'warning' | 'critical' | 'info';
  
  // Dynamic payloads based on slideType
  steps?: SopStepItem[];
  dosAndDonts?: SopDoDontItem[];
  hotspots?: SopHotspotPoint[];
  decisionNodes?: SopDecisionNode[];
  faqList?: SopFaqItem[];
  glossaryList?: SopGlossaryItem[];
  videoUrl?: string;
  quiz?: SopQuizQuestion;
}

// ─── Main Deck Module Interface ───────────────────────────────────────────

export interface SopModule {
  id: string;
  code: string;                  // Cth: 'SOP-MHE-01'
  title: string;
  description: string;
  category: SopCategory;
  difficulty: SopDifficulty;
  targetDivisions: string[];     // ['WFG', 'WRM', 'TIM', 'ALL']
  targetRoles: string[];         // ['Operator Forklift', 'Checker', 'ALL']
  estimatedMinutes: number;      // Cth: 3 (estimasi durasi)
  pointsReward: number;          // Default: 50 PTS
  badgeIcon: string;             // Lucide Icon identifier
  slides: SopSlide[];
  isMandatory: boolean;          // Apakah modul wajib baca kepatuhan
  deadlineDays?: number;         // Batas hari penyelesaian sejak akun aktif
  version: string;               // Cth: 'v2.1'
  isActive: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Worker Progress & Compliance Tracking ─────────────────────────────────

export interface WorkerSopProgress {
  id: string;
  workerId: string;
  sopId: string;
  lastSlideViewed: number;
  isCompleted: boolean;
  completedAt?: string;
  pointsAwarded: boolean;
  quizScore?: number;
  timeSpentSeconds: number;
  bookmarkedSlideIds: string[];
  personalNotes?: string;
}

export interface SopComplianceOverview {
  totalModules: number;
  completedCount: number;
  mandatoryCompletedRatio: number; // 0.0 - 1.0 (0% - 100%)
  totalPointsEarnedFromSop: number;
  nextRecommendedModule?: SopModule;
}
```

---

## 3. Rincian 9 Format Slide Interaktif

Setiap modul SOP terdiri dari **4 hingga 8 slide terpadu** yang menggabungkan berbagai format berikut:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   KATALOG 9 FORMAT SLIDE INTERAKTIF                      │
├────────────────────────────────┬─────────────────────────────────────────┤
│ 1. step_instruction            │ Alur proses 1, 2, 3 dengan ikon & badge │
│ 2. dos_and_donts               │ Kolom Hijau (Safe) vs Kolom Merah (Risk)│
│ 3. safety_alert                │ Golden Rules K3 & batas toleransi aman  │
│ 4. interactive_hotspot         │ Gambar peralatan dengan titik klik info │
│ 5. decision_tree               │ Logika cabang ("Jika A, lakukan B")     │
│ 6. video_demonstration         │ Video pendek/GIF simulasi cara kerja    │
│ 7. faq_accordion               │ Jawaban atas dilema nyata di lapangan   │
│ 8. glossary_card               │ Kamus istilah logistik & akronim        │
│ 9. quiz_checkpoint             │ Soal validasi pemahaman akhir (+50 PTS) │
└────────────────────────────────┴─────────────────────────────────────────┘
```

### 3.1. `step_instruction` (Langkah Kerja Terstruktur)
* **Visual**: Urutan langkah kerja vertikal/grid dengan nomor langkah dalam lingkaran emerald bercahaya.
* **Fitur**: Setiap langkah memiliki judul, detail instruksi, dan *Key Highlight* (kotak tips cepat).

### 3.2. `dos_and_donts` (Komparasi Benar vs Salah)
* **Visual**: Split panel 2 kolom simetris:
  * **Sisi Kiri (Hijau - DOs)**: Praktik kerja aman dengan centang `✓`, tip efisiensi kerja.
  * **Sisi Kanan (Merah - DONTs)**: Praktik kerja salah dengan silang `✗`, risiko bahaya yang ditimbulkan.

### 3.3. `safety_alert` (Poin Kritis & Golden Rules K3)
* **Visual**: Card berlatar gelap dengan aksen border merah/amber dan lencana berkedip lembut `⚠️ SAFETY CRITICAL`.
* **Fungsi**: Menekankan batas toleransi yang **dilarang dilanggar** (misal: *Kecepatan forklift maksimal 10 km/jam di dalam ruangan*).

### 3.4. `interactive_hotspot` (Diagram Interaktif Titik Inspeksi)
* **Visual**: Gambar skematik peralatan (misal: unit Forklift atau Roster Rak Gudang) dengan titik-titik pin interaktif bernomor.
* **Interaksi**: Saat pekerja menekan titik pin, muncul popup tooltip menjelaskan komponen yang wajib diperiksa (misal: Titik 1 = Garpu/Forks, Titik 2 = Tabung Hidrolik, Titik 3 = Rantai Pengangkat).

### 3.5. `decision_tree` (Pohon Keputusan Alur Cepat)
* **Visual**: Kartu kondisi logika bercabang:
  * *Kondisi*: *"Palet ditemukan miring > 5 derajat saat inbound"*
  * *Tindakan*: *"Hentikan pembongkaran, foto kondisi awal, buat Berita Acara Kerusakan (BAK), eskalasikan ke Supervisor."*

### 3.6. `video_demonstration` (Simulasi & Video Pendek)
* **Visual**: Video player tertanam (*embedded HD video/GIF loop*) dengan kontrol play/pause yang mendemonstrasikan gerakan fisik yang benar (misal: cara mengangkat barang berat manual dengan menekuk lutut, bukan membungkukkan punggung).

### 3.7. `faq_accordion` (Tanya-Jawab Lapangan)
* **Visual**: Accordion interaktif yang membahas skenario abu-abu yang sering ditemui pekerja di lantai operasional.

### 3.8. `glossary_card` (Kamus Istilah & Akronim Logistik)
* **Visual**: Kartu kosakata interaktif yang mendefinisikan istilah teknis (FIFO, FEFO, SKU, BAK, ODOL, Staging Area, Red Tag Area, Reachtruck, Counterbalance).

### 3.9. `quiz_checkpoint` (Kuis Uji Pemahaman Akhir)
* **Visual**: Pertanyaan verifikasi pemahaman dengan pilihan ganda `A, B, C, D`.
* **Mekanisme**:
  * Pilihan salah memunculkan feedback edukatif dan meminta user mencoba lagi.
  * Pilihan benar memunculkan penjelasan lengkap, confetti selebrasi, dan tombol **"Selesaikan Modul & Klaim +50 PTS"**.

---

## 4. Spesifikasi UI / UX Slideshow Viewer

Sesuai dengan standar **[`Style.md`](file:///d:/Coding%20Session/Komar/Style.md)** (Dark Glassmorphism, Zero AI-Slop):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ─── ─── ─── [██████████] ─── ─── ─── (Story Bar Slide 4 of 6)    [🔊] [✕] │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🚜 OPERASIONAL MHE: SOP-MHE-01                                              │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                         KONTEN SLIDE AKTIF                              │ │
│ │                                                                         │ │
│ │  [ DOS: Benar ]                          [ DONTS: Salah ]               │ │
│ │  ✓ Klakson di blind spot                 ✗ Membawa muatan halangi pandang││
│ │  ✓ Tinggi garpu 15-20cm                  ✗ Berjalan dengan tiang naik   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ [🤖 Tanya Gappy tentang Slide ini]                       [🔖 Simpan Catatan]│
├─────────────────────────────────────────────────────────────────────────────┤
│ [ ← Slide Sebelumnya ]           (3s Anti-Skip)      [ Slide Selanjutnya → ] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1. Fitur Interaksi Unggulan Viewer:
1. **Story-Bar Segmented Progress Indicator**:
   * Garis progres di atas layar yang terbagi sejumlah slide.
   * Slide selesai: `bg-emerald-500`, Slide aktif: `bg-purple-500 animate-pulse`, Slide tersisa: `bg-zinc-800`.
2. **Text-to-Speech (TTS) Narasi Suara Bahasa Indonesia**:
   * Tombol ikon speaker `🔊` yang membacakan teks SOP menggunakan *Web Speech Synthesis API*.
   * Sangat membantu pekerja lapangan saat ingin mendengarkan instruksi sambil mengistirahatkan mata.
3. **Anti-Speedrun Validation Timer (3 Detik)**:
   * Tombol *Selanjutnya* menampilkan hitung mundur `3s... 2s... 1s...` sebelum berubah menjadi aktif (`bg-purple-600`) guna menjamin pekerja membaca konten secara layak.
4. **"Tanya Gappy tentang SOP ini" (In-Slide AI Assistant)**:
   * Tombol pintar di sudut slide yang membuka panel chat mini dengan **Gappy AI**.
   * Gappy AI menjawab keraguan pekerja yang dibatasi ketat pada konteks SOP yang sedang dibuka (*Strict In-Context Answering*).
5. **Navigasi Keyboard & Sentuh (Multi-Platform)**:
   * Desktop: Tombol panah kiri `←` (mundur), panah kanan `→` (maju), dan `Esc` (tutup).
   * Mobile/Tablet: Tombol jempol bawah yang ramah sentuhan (*min-height 48px*).
6. **Modal Root Isolation (`createPortal`)**:
   * Seluruh modal viewer di-render ke `document.body` dengan `z-[9999]` dan backdrop `bg-black/90 backdrop-blur-md` untuk tampilan full-screen 100% tanpa terpotong navbar.

---

## 5. Integrasi Gamifikasi & Poin BIB

Setiap interaksi dengan modul SOP terhubung langsung ke mesin kalkulasi penilaian kinerja:

1. **Reward Poin Langsung**:
   * Setiap modul yang diselesaikan memberikan **+50 Poin Reward (PTS)**.
2. **Peningkatan Skor BIB Benchmark (35%)**:
   * Menyelesaikan seluruh SOP wajib (*Mandatory SOPs*) meningkatkan komponen skor **BIB Benchmark** sebesar **+2.5 poin** per modul (maksimal kontribusi +10 poin).
3. **Koleksi Badge SOP di Profil Staf**:
   * 🥇 **Badge "SOP Explorer"**: Menyelesaikan 3 modul SOP pertama.
   * 🏆 **Badge "Safety Literate"**: Menyelesaikan seluruh modul kategori *K3 & Safety*.
   * 👑 **Badge "Master of Operations"**: Menyelesaikan $\ge 10$ modul SOP lintas divisi.
4. **Pencatatan Audit Trail**:
   * Penyelesaian modul tercatat otomatis di `activity_log` dan dapat dilihat oleh Supervisor pada tab log audit.

---

## 6. Skema Database Supabase PostgreSQL Lengkap

```sql
-- ============================================================
-- BIB Logistics Platform — Schema Setup: Interactive SOP Decks
-- ============================================================

-- ─── 1. Master Table: sop_modules ───────────────────────────
CREATE TABLE IF NOT EXISTS sop_modules (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code              TEXT UNIQUE NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  category          TEXT NOT NULL CHECK (category IN (
                      'K3 & Safety', 
                      'Operasional MHE', 
                      'Warehouse & Staging', 
                      'Inbound & Timbangan', 
                      'Outbound & Ekspedisi',
                      '5S & Continuous Improvement',
                      'Tanggap Darurat & Lingkungan'
                    )),
  difficulty        TEXT NOT NULL DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Mandatory Compliance')),
  target_divisions  JSONB NOT NULL DEFAULT '["ALL"]'::jsonb,
  target_roles      JSONB NOT NULL DEFAULT '["ALL"]'::jsonb,
  estimated_minutes INTEGER NOT NULL DEFAULT 3,
  points_reward     INTEGER NOT NULL DEFAULT 50,
  badge_icon        TEXT NOT NULL DEFAULT 'BookOpen',
  slides_data       JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_mandatory      BOOLEAN NOT NULL DEFAULT false,
  deadline_days     INTEGER DEFAULT 14,
  version           TEXT NOT NULL DEFAULT 'v1.0',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  author            TEXT DEFAULT 'HSE & Ops Management',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Worker Progress Table: worker_sop_progress ───────────
CREATE TABLE IF NOT EXISTS worker_sop_progress (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id            TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  sop_id               TEXT NOT NULL REFERENCES sop_modules(id) ON DELETE CASCADE,
  last_slide_viewed    INTEGER NOT NULL DEFAULT 1,
  is_completed         BOOLEAN NOT NULL DEFAULT false,
  completed_at         TIMESTAMPTZ,
  points_awarded       BOOLEAN NOT NULL DEFAULT false,
  quiz_score           INTEGER DEFAULT 0,
  time_spent_seconds   INTEGER NOT NULL DEFAULT 0,
  bookmarked_slide_ids JSONB DEFAULT '[]'::jsonb,
  personal_notes       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(worker_id, sop_id)
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_sop_modules_category ON sop_modules(category, is_active);
CREATE INDEX IF NOT EXISTS idx_worker_sop_progress_worker ON worker_sop_progress(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_sop_progress_completed ON worker_sop_progress(worker_id, is_completed);

-- ─── 3. Row Level Security (RLS) Policies ────────────────────
ALTER TABLE sop_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_sop_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all read active sop_modules" ON sop_modules;
CREATE POLICY "Allow all read active sop_modules" ON sop_modules FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow admin write sop_modules" ON sop_modules;
CREATE POLICY "Allow admin write sop_modules" ON sop_modules FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for worker_sop_progress" ON worker_sop_progress;
CREATE POLICY "Allow all for worker_sop_progress" ON worker_sop_progress FOR ALL TO public USING (true) WITH CHECK (true);

-- ─── 4. Stored Procedure RPC: Complete SOP Atomically ─────────
CREATE OR REPLACE FUNCTION rpc_complete_sop_module(
  p_worker_id TEXT,
  p_sop_id TEXT,
  p_time_spent INTEGER DEFAULT 180,
  p_quiz_score INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points INTEGER;
  v_sop_title TEXT;
  v_sop_code TEXT;
  v_already_completed BOOLEAN;
  v_worker_exists BOOLEAN;
BEGIN
  -- 1. Validasi modul SOP
  SELECT points_reward, title, code INTO v_points, v_sop_title, v_sop_code 
  FROM sop_modules WHERE id = p_sop_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Modul SOP tidak ditemukan.');
  END IF;

  -- 2. Validasi pekerja
  SELECT EXISTS(SELECT 1 FROM workers WHERE id = p_worker_id) INTO v_worker_exists;
  IF NOT v_worker_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pekerja tidak ditemukan.');
  END IF;

  -- 3. Cek apakah sudah pernah selesai
  SELECT is_completed INTO v_already_completed
  FROM worker_sop_progress
  WHERE worker_id = p_worker_id AND sop_id = p_sop_id;

  IF v_already_completed = TRUE THEN
    RETURN jsonb_build_object(
      'success', true, 
      'already_completed', true, 
      'message', 'Modul SOP sudah pernah diselesaikan sebelumnya.'
    );
  END IF;

  -- 4. Upsert progress penyelesaian
  INSERT INTO worker_sop_progress (
    worker_id, sop_id, is_completed, completed_at, points_awarded, time_spent_seconds, quiz_score
  )
  VALUES (
    p_worker_id, p_sop_id, true, now(), true, p_time_spent, p_quiz_score
  )
  ON CONFLICT (worker_id, sop_id) DO UPDATE SET
    is_completed = true,
    completed_at = now(),
    points_awarded = true,
    time_spent_seconds = worker_sop_progress.time_spent_seconds + p_time_spent,
    quiz_score = p_quiz_score,
    updated_at = now();

  -- 5. Tambah Poin Reward dan Skor BIB Benchmark secara atomik
  UPDATE workers
  SET total_points = total_points + v_points,
      bib_benchmark = LEAST(100.0, bib_benchmark + 2.5),
      bib_total_score = ROUND(((bib_behavior * 0.35) + (bib_integrity * 0.30) + (LEAST(100.0, bib_benchmark + 2.5) * 0.35))::numeric, 2),
      updated_at = now()
  WHERE id = p_worker_id;

  -- 6. Catat aktivitas audit
  INSERT INTO activity_log (worker_id, action, detail)
  VALUES (p_worker_id, 'checklist_completed', 'Menyelesaikan modul SOP: ' || v_sop_code || ' — ' || v_sop_title || ' (+ ' || v_points || ' PTS)');

  RETURN jsonb_build_object(
    'success', true,
    'points_added', v_points,
    'sop_title', v_sop_title,
    'message', 'Selamat! Anda telah menyelesaikan ' || v_sop_title || ' dan memperoleh +' || v_points || ' PTS.'
  );
END;
$$;
```

---

## 7. Seed Data: 6 Modul SOP Unggulan Siap Pakai

Berikut adalah 6 modul SOP komprehensif bawaan sistem yang mencakup seluruh pilar operasional:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      KATALOG 6 MODUL SOP UNGGULAN                           │
├────────────┬─────────────────────────────────────────────────┬──────────────┤
│ Kode SOP   │ Judul Modul SOP                                 │ Kategori     │
├────────────┼─────────────────────────────────────────────────┼──────────────┤
│ SOP-MHE-01 │ Pengoperasian Forklift Aman di Area Gudang      │ MHE          │
│ SOP-WRH-02 │ Standar Susunan Palet & Interlocking Stacking   │ Warehouse    │
│ SOP-HSE-03 │ Tanggap Darurat Kebakaran & Penggunaan APAR PASS│ K3 & Safety  │
│ SOP-INB-04 │ Verifikasi Dokumen & Timbangan Truk Logistik    │ Inbound      │
│ SOP-5S-05  │ Budaya 5S & Standar Staging Loading Dock        │ 5S & Kaizen  │
│ SOP-OUT-06 │ Prosedur Segel Kontainer & Anti-ODOL Ekspedisi  │ Outbound     │
└────────────┴─────────────────────────────────────────────────┴──────────────┘
```

### 1. `SOP-MHE-01`: Pengoperasian Forklift Aman di Area Gudang (WFG & WRM)
* **Slide 1 (Step)**: Inspeksi Visual Pre-Use 8 Titik (Cek garpu, rem, klakson, lampu strobo, sabuk pengaman, APAR unit).
* **Slide 2 (DOs & DONTs)**: Kecepatan max 10 km/jam vs Menikung mendadak tanpa klakson di blind spot.
* **Slide 3 (Safety Alert)**: Batas tinggi garpu saat melaju membawa muatan **wajib 15–20 cm dari lantai**. Jika pandangan terhalang muatan tinggi, wajib mengemudi mundur (*reverse driving*).
* **Slide 4 (Interactive Hotspot)**: Diagram titik tumpu muatan (*Center of Gravity*).
* **Slide 5 (Quiz)**: *"Berapa tinggi garpu yang diizinkan saat forklift berjalan membawa muatan?"*

### 2. `SOP-WRH-02`: Standar Susunan Palet & Interlocking Stacking
* **Slide 1 (Step)**: Kriteria palet kayu standar layak pakai vs palet afkir berisiko roboh.
* **Slide 2 (DOs & DONTs)**: Kuncian pola silang (*Interlocking Stacking*) vs Pola lurus tanpa kuncian (*Column Stacking*).
* **Slide 3 (Safety Alert)**: Batas maksimal tumpukan barang di area staging: **Maksimum 3 Tier** atau mengikuti batas garis marka kuning di dinding gudang.
* **Slide 4 (Decision Tree)**: Alur penanganan jika ditemukan palet rusak di rak tingkat tinggi.
* **Slide 5 (Quiz)**: *"Mengapa susunan palet karton wajib menggunakan metode interlocking/silang?"*

### 3. `SOP-HSE-03`: Tanggap Darurat Kebakaran & Penggunaan APAR (Metode PASS)
* **Slide 1 (Step)**: Mengenal 3 Kelas Kebakaran Gudang (Kelas A: Kayu/Karton, Kelas B: Minyak/Oli, Kelas C: Panel Listrik).
* **Slide 2 (Step)**: 4 Langkah Metode **PASS** (Pull pin pengaman, Aim nozzle ke sumber api, Squeeze tuas semprot, Sweep sapukan sisi ke sisi).
* **Slide 3 (DOs & DONTs)**: Berdiri searah hembusan angin (jarak 2–3 meter) vs Menghalangi akses box APAR dengan tumpukan barang.
* **Slide 4 (Safety Alert)**: Lokasi Titik Kumpul (*Assembly Point*) dan nomor darurat tim tanggap darurat HSE.
* **Slide 5 (Quiz)**: *"Apa arti huruf 'A' pada metode PASS saat menggunakan APAR?"*

### 4. `SOP-INB-04`: Verifikasi Dokumen & Timbangan Truk Logistik
* **Slide 1 (Step)**: Kalibrasi Nol (*Zero Balance*) Timbangan Truk sebelum kendaraan naik.
* **Slide 2 (Step)**: Pencocokan fisik nomor polisi, Surat Jalan (Delivery Order), dan Packing List vendor.
* **Slide 3 (DOs & DONTs)**: Supir wajib turun saat penimbangan vs Mengubah data timbangan manual tanpa persetujuan timbangan.
* **Slide 4 (Decision Tree)**: Alur pembuatan Berita Acara Kerusakan (BAK) jika fisik barang inbound rusak/basah.
* **Slide 5 (Quiz)**: *"Dokumen apa yang wajib ditandatangani bersama supir jika terdapat selisih tonase barang inbound?"*

### 5. `SOP-5S-05`: Budaya 5S & Standar Staging Loading Dock
* **Slide 1 (Step)**: 5S Operasional (Ringkas, Rapi, Resik, Rawat, Rajin) di area loading dock.
* **Slide 2 (DOs & DONTs)**: Penggunaan *Wheel Chock* (ganjal roda) pada ban truk saat proses bongkar-muat vs Membiarkan ceceran oli di lantai.
* **Slide 3 (Safety Alert)**: Marka keselamatan lantai gudang (Kuning = Jalur Forklift, Putih = Staging Area, Zebra Merah-Putih = Area Terlarang APAR & Panel).
* **Slide 4 (Quiz)**: *"Kapan pembersihan ceceran oli forklift di lantai loading dock wajib dilakukan?"*

### 6. `SOP-OUT-06`: Prosedur Segel Kontainer & Anti-ODOL Ekspedisi
* **Slide 1 (Step)**: Prosedur pemasangan nomor segel kontainer (*Bottle Seal Verification*) sebelum keberangkatan armada.
* **Slide 2 (Step)**: Pengecekan distribusi beban muatan antar gandar truk untuk mencegah bahaya over-dimension over-load (ODOL).
* **Slide 3 (DOs & DONTs)**: Memastikan pintu kontainer terkunci rapat dan difoto bukti segel vs Melepas segel tanpa kehadiran penerima.
* **Slide 4 (Quiz)**: *"Mengapa nomor segel kontainer wajib dicocokkan dengan dokumen Surat Jalan Outbound?"*

---

## 8. Fitur Manajemen Konten (CMS) & Laporan Kepatuhan ISO

Bagi **Administrator** dan **Supervisor**, sistem menyediakan konsol manajemen tingkat lanjut:

1. **Visual Deck Editor (Admin Console)**:
   * Menambah dan mengedit modul SOP tanpa menyentuh kode database.
   * Menambah slide dinamis (memilih tipe: Step, DOs/DONTs, Alert, Diagram, Video, atau Kuis).
   * Drag-and-drop urutan slide.
2. **Kepatuhan Wajib Baca (*Mandatory SOP Compliance Heatmap*)**:
   * Dashboard matriks warna menampilkan persentase staf yang telah membaca SOP wajib per divisi (misal: *Divisi WFG: 95% Selesai, Divisi TIM: 80% Selesai*).
   * Fitur *Broadcast Reminder* untuk mengirimkan notifikasi pengumuman ke staf yang belum membaca SOP wajib.
3. **Ekspor Laporan Pelatihan SOP ke PDF & CSV**:
   * Menghasilkan dokumen resmi rekapitulasi pelatihan internal staf untuk pemenuhan audit sertifikasi **ISO 9001 (Mutu)** dan **ISO 45001 / SMK3 (Keselamatan Kerja)**.

---

## 9. Rencana Implementasi Bertahap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ROADMAP IMPLEMENTASI FITUR SOP DECK                      │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ Fase 1: Data & SQL│ - Buat src/types/sop.ts & src/data/sopDeckData.json     │
│                   │ - Update tabel sop_modules, progress, & RPC di SQL      │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Fase 2: UI Viewer │ - Buat SopSlideshowModal.tsx (Story bar, TTS, 9 format) │
│                   │ - Buat SopLibraryModal.tsx (Katalog, filter kategori)   │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Fase 3: Integrasi │ - Hubungkan RPC complete ke App.tsx & Navbar            │
│                   │ - Gappy AI Chat Assistant dalam slide                   │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Fase 4: CMS Admin │ - Tab Kelola SOP di Admin Console & Heatmap Kepatuhan   │
│                   │ - Ekspor Laporan ISO Compliance                         │
└───────────────────┴─────────────────────────────────────────────────────────┘
```
