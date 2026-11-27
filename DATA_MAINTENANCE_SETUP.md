# Data & Pemeliharaan — Panduan Pemasangan

Fitur baru di **Administrator → Konfigurasi** (bagian bawah): backup, reset, dan pulihkan nilai.
Reset dan pulihkan wajib **kode OTP** yang dikirim ke email pemilik.

Semua perubahan bersifat **penambahan**: tabel/fungsi baru (`admin_*`, `maint_*`), satu Edge Function,
satu komponen baru, dan satu blok render di `AdminConsole.tsx`. Tidak ada tabel atau fungsi lama yang diubah.

## Urutan pemasangan (lakukan berurutan)

### 1. Jalankan SQL
Supabase Dashboard → **SQL Editor** → tempel isi `sql/migration_data_maintenance.sql` → Run.
Aman dijalankan ulang. Verifikasi (harus 3 baris, semua `true`):

```sql
select relname, relrowsecurity as rls_aktif from pg_class
where relname in ('admin_backups','admin_otp_requests','admin_maintenance_log');
```

### 2. Siapkan Resend
1. Buat akun di resend.com, lalu buat **API key**.
2. Tanpa domain sendiri, Resend hanya mengizinkan kirim **ke email pemilik akun Resend**.
   Jadi daftarkan akun Resend dengan email yang sama dengan penerima OTP.
3. Jangan taruh API key di kode, chat, atau repo.

### 3. Isi secret di Supabase
Dashboard → **Edge Functions → Secrets** (atau CLI):

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set MAINT_OTP_TO=email-penerima@gmail.com
# opsional:
supabase secrets set MAINT_OTP_FROM="Gappy Assessment <onboarding@resend.dev>"
supabase secrets set ALLOWED_ORIGIN=https://assesment-bib.vercel.app
```

### 4. Deploy Edge Function
```bash
supabase functions deploy send-maintenance-otp --project-ref sekmjwrbohjmlxpgydqx
```

### 5. Deploy aplikasi
Merge branch `feature/data-maintenance` setelah lolos uji di preview Vercel.

## Daftar uji sebelum dipakai sungguhan
1. Buka Konfigurasi → bagian **Data & Pemeliharaan** muncul, daftar backup kosong, tanpa error.
2. **Buat backup** → muncul di daftar → **CSV** terunduh dan isinya benar.
3. Reset: pilih **satu user uji** + satu jenis data → ketik `RESET` → email OTP masuk → masukkan kode.
   Pastikan hanya user itu yang berubah dan muncul backup otomatis.
4. Coba kode salah (harus ditolak), kode kedaluwarsa, dan kode dipakai dua kali (harus ditolak).
5. **Pulihkan** dari backup tadi dengan OTP → nilai user uji kembali.
6. Baru lakukan reset sungguhan.

## Aturan keamanan
- OTP 6 digit, hanya **hash**-nya yang disimpan, berlaku 5 menit, sekali pakai, maksimal 3 kali salah.
- OTP terikat pada aksi + daftar user + jenis data yang dipilih (kode untuk satu aksi tidak berlaku untuk aksi lain).
- Permintaan OTP dibatasi 1 per menit dan 5 per jam; total salah 9× per jam mengunci sementara.
- Kolom `password` tidak ikut backup dan tidak disentuh saat pulihkan.
- Backup disimpan maksimal 10 terakhir.

## Keterbatasan yang perlu diketahui
- Tabel lain di proyek ini memakai policy RLS terbuka (`USING (true)`), jadi orang yang memegang anon key
  tetap bisa menulis ke tabel nilai secara langsung tanpa OTP. OTP melindungi dari salah klik dan
  penyalahgunaan lewat aplikasi, **bukan** dari akses langsung ke API. Menutupnya butuh perubahan RLS
  (di luar lingkup fitur ini).
- Reset **tidak** mengubah riwayat penukaran reward, SP/sanksi, atau flag lain di luar daftar jenis data.
