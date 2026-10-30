# PANDUAN KEAMANAN & HARDENING ABSENHNDX07
**SMK Muhammadiyah Bawang — Aplikasi Presensi, Penilaian, Jurnal & Tabungan Siswa**

Dokumen ini memuat panduan lengkap konfigurasi keamanan tingkat tinggi (High-Priority Security Hardening) untuk arsitektur Supabase + React pada aplikasi **Absenhndx07**.

---

## 1. Public Share RPC (`get_public_share`)

Akses publik terhadap data presensi, nilai, tabungan, dan jurnal guru **tidak pernah membaca tabel database secara langsung**. Seluruh akses anonim melewati fungsi PostgREST RPC `public.get_public_share`.

### Karakteristik & Jaminan Keamanan:
1. **`SECURITY DEFINER` dengan `search_path` Terkunci**:
   - Didefinisikan dengan `SET search_path = public, pg_temp` untuk mencegah serangan *search_path hijacking*.
2. **Validasi Kriptografis Token & Backward Compatibility**:
   - Menerima `p_key` berupa `share_token` acak 64 karakter heksadesimal (`crypto.getRandomValues`).
   - Masih mendukung fallback ID lama selama masa transisi.
3. **Pengecekan Status Aktif (`is_active` / Revoked)**:
   - Jika guru mencabut tautan (`is_active = false`), RPC seketika mengembalikan `error: "revoked"` **tanpa membocorkan payload data**.
4. **Pengecekan Kedaluwarsa (`expires_at` / Expired)**:
   - Jika masa berlaku telah lewat (`expires_at <= now()`), RPC mengembalikan `error: "expired"` **tanpa membocorkan payload data**.
5. **Optimasi Bandwidth (`p_since`)**:
   - Jika payload tidak berubah sejak `p_since`, mengembalikan `{ "unchanged": true }` (mirip HTTP 304) untuk meminimalkan beban server dan kuota bandwidth.
6. **Sanitasi Data Sensitif Siswa & Scope Enforcement**:
   - Field identitas privat seperti `no_hp_orang_tua` dan `catatan_umum` dihapus dari array `students`.
   - NISN siswa disamarkan (*masked*), hanya menyisakan 4 digit terakhir (contoh: `******1234`).
   - Membatasi field sesuai scope tipe (`absen` hanya data absensi, `nilai` hanya data nilai & formatif, `tabungan` hanya transaksi keuangan, `agenda` hanya jurnal mengajar).
7. **Pencegahan Akses Tabel Langsung**:
   - Role `anon` dicabut dari izin `SELECT` tabel `public.public_shares`. Tabel ini juga dikeluarkan dari broadcast `supabase_realtime`.

---

## 2. Row Level Security (RLS) Matrix

Seluruh tabel sensitif mewajibkan RLS aktif (`ENABLE ROW LEVEL SECURITY`) dan kepemilikan data multi-tenant terverifikasi:

| Tabel | Role Anonim | Role Terotentikasi (Guru) | Mekanisme Validasi Kepemilikan |
| :--- | :--- | :--- | :--- |
| `teacher_profiles` | DITOLAK | Akses Penuh Profil Sendiri | `auth.uid() = user_id` |
| `classes` | DITOLAK | Akses Penuh Kelas Milik Sendiri | `auth.uid() = user_id` |
| `students` | DITOLAK | Akses Siswa di Kelas Milik Sendiri | `EXISTS (classes.id = students.class_id AND classes.user_id = auth.uid())` |
| `attendance_sessions` | DITOLAK | Akses Sesi Kelas Milik Sendiri | `auth.uid() = user_id` & relasi `class_id` milik guru |
| `student_grades` | DITOLAK | Akses Nilai Kelas Milik Sendiri | `auth.uid() = user_id` & relasi `class_id` + `student_id` valid di kelasnya |
| `grade_columns` | DITOLAK | Akses Kolom Nilai Kelas Sendiri | `auth.uid() = user_id` & relasi `class_id` milik guru |
| `teaching_agendas` | DITOLAK | Akses Agenda Mengajar Sendiri | `auth.uid() = user_id` & relasi `class_id` milik guru (atau umum) |
| `saving_transactions` | DITOLAK | Akses Transaksi Tabungan Sendiri | `auth.uid() = user_id` & relasi `class_id` + `student_id` valid di kelasnya |
| `public_shares` | DITOLAK | Kelola Tautan Share Sendiri | `auth.uid() = user_id` & relasi `class_id` milik guru |

> **Catatan Penting:** Semua operasi `INSERT` dan `UPDATE` menerapkan klausul `WITH CHECK` yang ketat untuk mencegah upaya injeksi data ke kelas milik pendidik lain.

---

## 3. Isolasi Total Mode Demo (Zero Production Writes)

Aplikasi menyediakan fitur "Mode Demo" untuk simulasi dan uji coba fitur tanpa memerlukan kredensial akun riil.

### Mekanisme Perlindungan:
1. **Sesi Terisolasi**: Mode Demo ditandai di `sessionStorage` (`smk_demo_active = 'true'`) dan menggunakan identitas lokal `demo-guru-smkmuhiba`.
2. **Blokir Tulis Terpusat (`isProductionWriteAllowed()`)**:
   - Seluruh mutasi data (`createClass`, `updateClass`, `deleteClass`, `createStudent`, `updateStudent`, `deleteStudent`, `saveAttendanceSession`, `deleteAttendanceSession`, `saveStudentGrade`, `batchUpsertStudentGrades`, `saveGradeColumns`, `saveTeachingAgenda`, `saveSavingTransaction`, `createOrUpdatePublicShare`, `revokePublicShare`) memverifikasi `isProductionWriteAllowed()`.
   - Jika dalam mode demo, operasi tulis ke Supabase diabaikan (*no-op*), data disimpan murni di memori RAM / `SafeCache` lokal.
3. **`getAuthUser()` Mengembalikan `null`**:
   - Memastikan tidak ada token otentikasi lama yang dapat mengirim request mutasi ke endpoint REST Supabase.
4. **Pembersihan Otomatis Saat Logout**:
   - Saat guru menekan logout, fungsi `clearDemoSession()` membersihkan flag `sessionStorage` dan mengosongkan seluruh memori sesi.

---

## 4. Pengaturan Wajib Supabase Auth Dashboard

Untuk menjamin keamanan maksimal pada database produksi Supabase, administrator sekolah disarankan mengaktifkan konfigurasi berikut di **Supabase Dashboard** (`https://supabase.com/dashboard/project/<PROJECT_ID>/auth`):

### A. Konfirmasi Email (Email Confirmations)
- Buka: **Authentication** -> **Providers** -> **Email**.
- Aktifkan: **Confirm email** = `ON`.
- *Manfaat:* Mencegah pendaftaran akun guru dengan alamat email palsu atau tanpa izin.

### B. Kebijakan Kata Sandi (Password Policy)
- Buka: **Authentication** -> **Security & Protection** -> **Password Policy**.
- Rekomendasi:
  - Minimum length: `8` karakter (atau `10` karakter).
  - Require uppercase letter: `ON`.
  - Require lowercase letter: `ON`.
  - Require digits: `ON`.
  - Require symbols: `ON`.
  - Prevent password leaks (HaveIBeenPwned): `ON`.

### C. Proteksi Brute-Force & Rate Limiting
- Buka: **Authentication** -> **Rate Limits**.
- Pastikan pembatasan percobaan login per menit aktif (default Supabase: 30 request/menit untuk sign-in).

### D. Multi-Factor Authentication (MFA / 2FA - Opsional tapi Direkomendasikan)
- Buka: **Authentication** -> **MFA**.
- Aktifkan **TOTP (Time-based One-Time Password)** untuk login pendidik menggunakan aplikasi autentikator (Google Authenticator / Microsoft Authenticator).

### E. Proteksi Bot Login (Cloudflare Turnstile - Terintegrasi Opsional)
- Daftarkan akun di [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile).
- Buat widget untuk domain aplikasi.
- Masukkan Secret Key di Supabase Dashboard: **Authentication** -> **Bot Detection** -> **Turnstile**.
- Di file environment aplikasi, tambahkan:
  ```env
  VITE_TURNSTILE_SITE_KEY="0x4AAAAAA..."
  ```
- Form login aplikasi secara otomatis menampilkan widget Turnstile dan menyertakan `captchaToken` saat login. Jika variabel ini tidak diisi, login tetap berjalan normal tanpa kendala.

---

## 5. Cara Menjalankan Migrasi SQL di Supabase

1. Salin seluruh isi berkas `supabase/migrations/007_security_audit_hardening.sql` (atau `docs/supabase-schema.sql`).
2. Masuk ke **Supabase Dashboard** -> pilih proyek Anda.
3. Klik menu **SQL Editor** pada navigasi sebelah kiri.
4. Klik **New Query**, tempelkan kode SQL, lalu klik tombol **Run** (atau tekan `Ctrl + Enter`).
5. Pastikan muncul notifikasi **"Success. No rows returned"**.

### Query Verifikasi di SQL Editor:
Untuk memastikan seluruh RLS aktif dan anon diblokir:
```sql
-- Periksa status RLS seluruh tabel publik
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Periksa hak eksekusi RPC get_public_share
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'get_public_share';
```
Hasil yang diharapkan:
- Seluruh tabel `tablename` memiliki `rowsecurity = true`.
- `get_public_share` memiliki hak `EXECUTE` untuk role `anon` dan `authenticated`.
