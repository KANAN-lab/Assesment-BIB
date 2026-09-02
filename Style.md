# Style Guide — BIB Logistics Assessment Platform

> Referensi desain wajib untuk semua kontributor UI.  
> Design direction: **Industrial dark + Supabase-inspired** — slate/zinc base, emerald brand accent, warna ceria yang purposeful (bukan dekoratif).

---

## 1. Color Palette

### Background (Dark Industrial)
| Token | Hex | Usage |
|---|---|---|
| `bg-[#0d1117]` / `bg-zinc-950` | `#0d1117` | Background utama seluruh app |
| `bg-zinc-900` | `#18181b` | Card/panel utama |
| `bg-zinc-800` | `#27272a` | Input background, hover state, secondary card |
| `bg-zinc-700` | `#3f3f46` | Border aktif, divider |

> **Catatan**: Migrasi dari slate ke zinc untuk tone lebih industrial (zinc lebih warm/neutral vs slate yang lebih blue-tinted).

### Brand Accent (Emerald — energi & growth)
| Token | Usage |
|---|---|
| `emerald-500` / `emerald-400` | Primary CTA, active nav, brand indicator |
| `emerald-500/15` + `border-emerald-500/30` | Badge background, chip aktif |
| `text-emerald-400` | Label positif, skor tinggi, konfirmasi |

### Secondary Accent (Amber — streak & reward)
| Token | Usage |
|---|---|
| `amber-400` / `amber-300` | Streak counter, tier badge, reward highlight |
| `amber-500/10` + `border-amber-500/20` | Streak chip background |

### Functional Colors
| Token | Usage |
|---|---|
| `indigo-500` / `indigo-400` | Data/analytics accent (radar chart, skor indigo) |
| `cyan-400` | Secondary data line, checklist |
| `rose-400` | Error, critical alert, skor rendah |
| `sky-400` | Info state, pagination |

### Text
| Token | Usage |
|---|---|
| `text-white` / `font-black` | Heading utama, nama worker, angka penting |
| `text-zinc-200` | Body text default |
| `text-zinc-400` | Label, metadata, placeholder |
| `text-zinc-500` | Disabled state, micro label |

---

## 2. Typography

```
Font Stack: 'Inter', 'system-ui', sans-serif — import dari Google Fonts
```

| Element | Class |
|---|---|
| Page heading | `text-2xl font-black text-white tracking-tight` |
| Section heading | `text-base font-bold text-white` |
| Card title | `text-sm font-bold text-zinc-100` |
| Body | `text-sm text-zinc-300` |
| Label / caption | `text-xs text-zinc-400` |
| Micro label | `text-[10px] text-zinc-500 uppercase tracking-wider` |
| Number/metric | `font-mono` untuk angka yang butuh alignment |

---

## 3. Spacing & Radius

| Token | Value |
|---|---|
| Card padding (desktop) | `p-5` |
| Card padding (compact) | `p-4` |
| Section gap | `space-y-5` |
| Inner gap | `gap-4` |
| Border radius card | `rounded-2xl` (bukan `rounded-3xl` — lebih enterprise) |
| Border radius button | `rounded-xl` |
| Border radius chip | `rounded-md` (bukan `rounded-full` untuk enterprise look) |

---

## 4. Component Patterns

### Card
```
bg-zinc-900 rounded-2xl border border-zinc-800
```
Tidak pakai blur/backdrop — clean solid surface.

### Card Active / Selected
```
border-emerald-500/40 ring-1 ring-emerald-500/20
```

### Button — Primary CTA
```
bg-emerald-600 hover:bg-emerald-500
text-white font-bold text-xs px-4 py-2.5 rounded-xl
transition shadow-sm
```
Tidak ada gradient. Tidak ada hover:scale.

### Button — Secondary
```
bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
text-zinc-200 font-bold text-xs px-4 py-2.5 rounded-xl transition
```

### Button — Disabled
```
bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-default
```

### Badge / Chip
```
bg-emerald-500/10 border border-emerald-500/20
text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md
```

### Input Field
```
bg-zinc-800 border border-zinc-700 rounded-xl
text-white text-xs px-3 py-2
focus:outline-none focus:border-emerald-500/60
```

### Stat Tile (metric card)
```
bg-zinc-900 rounded-2xl p-4 border border-zinc-800
```
Label: `text-[10px] text-zinc-500 uppercase tracking-widest font-bold`  
Value: `text-2xl font-black text-white`  
Sub-label: `text-[11px] font-semibold` (warna sesuai semantic)

---

## 5. Animation Rules

| Situation | Animation |
|---|---|
| Page section masuk | `animate-fade-in` — opacity 0→1, 200ms |
| Button hover | `transition` only — NO scale |
| Loading spinner | `animate-spin` — Lucide `Loader2` |
| Reward claim | `canvas-confetti` — sekali, bukan loop |
| Tab switch | `transition-all` pada active indicator |

**Dilarang:**
- Infinite animation pada card
- Scale > `1.02` di manapun
- Gradient text (`bg-clip-text`)
- Blur blob / aurora background
- `hover:scale` pada list item atau card

---

## 6. Icon System

Gunakan **Lucide React** (`lucide-react`) exclusively. Tidak ada emoji sebagai ikon UI.

| Size | Class | Kapan |
|---|---|---|
| Small | `w-3.5 h-3.5` | Di dalam chip/badge/table |
| Default | `w-4 h-4` | Button icon, inline |
| Medium | `w-5 h-5` | Heading icon, card icon |
| Large | `w-6 h-6` | Empty state, section header |

---

## 7. Layout

- Max width konten: `max-w-7xl mx-auto`
- Padding horizontal: `px-4 sm:px-6 lg:px-8`
- Section gap: `space-y-5`
- Grid 2-col: `grid grid-cols-1 lg:grid-cols-2 gap-5`
- Mobile-first: semua layout dimulai dari satu kolom

---

## 8. Anti-Patterns (JANGAN LAKUKAN)

- ❌ `bg-gradient-to-r from-indigo-600 to-purple-600` pada tombol biasa
- ❌ `text-transparent bg-clip-text` untuk teks biasa
- ❌ `blur-3xl` blob sebagai background dekorasi
- ❌ `rounded-full` untuk card atau section besar
- ❌ Shadow berwarna di semua elemen — hanya loading/error state
- ❌ Copy marketing: "Supercharge your workflow", "Unlock your potential", "Gamified Excellence"
- ❌ Emoji sebagai icon UI fungsional
- ❌ `hover:scale-[1.02]` pada card/list-item — HANYA primary CTA jika benar-benar dibutuhkan
- ❌ Animasi Flame `animate-pulse` tanpa fungsi
- ❌ 3-card identical hero section (slop signature)

---

## 9. Mobile-Oriented Design Rules

Aplikasi ini banyak digunakan di lapangan (oleh Worker/Supervisor) via mobile phone.

- **Touch Targets**: Minimum ukuran tombol/area klik adalah `44px x 44px` (`min-h-[44px] min-w-[44px]`). Gunakan padding yang cukup (misal `py-3` pada tombol mobile).
- **Bottom Navigation / Fixed Bottom Actions**: Untuk aksi utama di mobile (seperti "Submit" atau "Scan QR"), letakkan tombol secara fixed di bawah (`fixed bottom-0 w-full`) agar mudah dijangkau jempol.
- **Scrollable Areas**: Gunakan `overflow-x-auto` dengan `snap-x` untuk daftar *badges*, *cards*, atau *tabs* yang banyak, hindari horizontal scroll bar yang terlihat (`scrollbar-hide`).
- **Modals/Drawers di Mobile**: 
  - Di layar kecil (`< sm`), modal sebaiknya berperilaku seperti *Bottom Sheet* / *Drawer* (muncul dari bawah, `rounded-t-2xl`, full width). 
  - Di layar besar, modal tetap di tengah layar (centered).
- **Responsive Typography**: Kurangi ukuran font heading di mobile (contoh: `text-xl` di mobile, `sm:text-2xl` di desktop) agar teks tidak terpotong.
- **Input Fields**: Pastikan `<input>` memiliki `text-[16px]` minimal pada layar mobile (iOS Safari akan auto-zoom jika font-size input kurang dari 16px).
- **Action Grid Symmetry (2-Column Mobile Balance)**:
  - Menu aksi cepat di beranda worker harus dijaga simetris dalam format **2 kolom** (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:flex`).
  - Pertahankan jumlah tombol genap (maksimal 8 tombol utama) agar tidak ada tombol 'ganjil' yang sendirian di baris bawah.
  - Seluruh tombol aksi wajib memiliki `min-h-[44px]` dan label teks dengan `truncate` agar rapi dan seragam.
- **Unified Personal Records & History Hub Pattern (Pusat Riwayat Terpadu)**:
  - Hindari membuat tombol riwayat terpisah-pisah untuk setiap modul (contoh: "Riwayat Insiden", "Ide Saya", "Riwayat Handover", "Riwayat Kudo").
  - Gabungkan seluruh riwayat dan arsip aktivitas personal pekerja ke dalam **SATU Modal Terpusat ber-Tab** (`WorkerHistoryCenterModal` / "Pusat Riwayat & Arsip").

---

## 10. Standard Modal & Form Focus Protocol (Portaled Stacking Context)

> [!IMPORTANT]
> **Aturan Wajib Pembuatan Modal & Formulir Baru**:
> Semua dialog modal, form input, dan popup interaktif **WAJIB** menggunakan `createPortal(..., document.body)` untuk mengisolasi modal dari stacking context, `overflow: hidden`, dan CSS transform parent container (terutama di sub-panel lazy load).

### Template Standar Modal & Form:
```tsx
import { createPortal } from 'react-dom';

return createPortal(
  <div
    className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
    onClick={onClose}
  >
    <div
      className="relative w-full max-w-lg max-h-[88vh] sm:max-h-[90vh] m-auto bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      onClick={(e) => e.stopPropagation()} // Mencegah click backdrop menutup form saat user klik input
    >
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 shrink-0">
        <h3 className="font-bold text-white text-sm">Judul Form</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body with Custom Scrollbar */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
        {/* Form Inputs */}
      </form>
    </div>
  </div>,
  document.body
);
```

### Checklist Verifikasi Form & Modal Baru:
1. [ ] **React Portal**: Selalu di-portal ke `document.body`.
2. [ ] **Layering / Stacking**: Gunakan `z-[9999]` dan `backdrop-blur-xl` dengan `bg-black/90`.
3. [ ] **Scroll Safety**: Gunakan `overflow-y-auto min-h-screen` pada backdrop overlay dan `max-h-[88vh] sm:max-h-[90vh]` pada modal wrapper agar form tidak terpotong di layar HP.
4. [ ] **Focus & Event Bubbling**: Pasang `onClick={(e) => e.stopPropagation()}` pada dialog card agar interaksi pada field input/select tidak memicu backdrop click.
5. [ ] **Select / Input Styling**: Input wajib memiliki `text-white bg-zinc-950 border-zinc-800 focus:border-amber-500` (atau emerald) dan `<option className="bg-zinc-900 text-white">` agar terbaca jelas di semua browser/OS.


