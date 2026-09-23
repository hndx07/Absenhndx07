import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

const STORAGE_KEY_CONFIG = 'smk_supabase_config';

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        supabaseUrl: parsed.supabaseUrl || envUrl,
        supabaseAnonKey: parsed.supabaseAnonKey || envKey,
        autoSync: parsed.autoSync ?? false,
        lastSyncedAt: parsed.lastSyncedAt,
      };
    }
  } catch (e) {
    console.error('Error reading supabase config from storage', e);
  }

  return {
    supabaseUrl: envUrl,
    supabaseAnonKey: envKey,
    autoSync: false,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  // reinitialize client if needed
  cachedClient = null;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const config = getStoredSupabaseConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }

  try {
    cachedClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function checkSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      message: 'Kredensial Supabase URL / Anon Key belum diisi. Aplikasi beroperasi dalam mode Lokal/Browser-First.',
    };
  }

  try {
    const { error } = await client.from('classes').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        // relation does not exist
        return {
          ok: true,
          message: 'Tersambung ke Supabase! (Tabel belum dimigrasi. Silakan jalankan script SQL di Supabase SQL Editor)',
        };
      }
      return { ok: false, message: `Koneksi Supabase gagal: ${error.message}` };
    }
    return { ok: true, message: 'Tersambung ke Cloud Supabase (PostgreSQL & Realtime siap).' };
  } catch (e: any) {
    return { ok: false, message: e.message || 'Koneksi ke Supabase gagal dijangkau' };
  }
}

export async function signInWithEmailPassword(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client belum terkonfigurasi. Silakan lengkapi URL dan Anon Key di Pengaturan Supabase.');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUpWithEmailPassword(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client belum terkonfigurasi. Silakan lengkapi URL dan Anon Key di Pengaturan Supabase.');
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signInWithGoogleOAuth() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client belum terkonfigurasi. Silakan lengkapi URL dan Anon Key di Pengaturan Supabase.');
  }

  const redirectTo = window.location.origin;
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signOutSupabase() {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
}

// SQL Schema Helper to easily paste into Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- SCHEMA POSTGRESQL & RLS UNTUK SMK MUHAMMADIYAH BAWANG
-- Jalankan query ini di SQL Editor dashboard Supabase Anda

-- 1. Tabel Profil Guru
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_guru TEXT NOT NULL,
  nip TEXT,
  nbm TEXT,
  nama_sekolah TEXT DEFAULT 'SMK Muhammadiyah Bawang',
  mata_pelajaran_utama TEXT,
  tahun_ajaran TEXT DEFAULT '2025/2026',
  semester TEXT DEFAULT 'Genap',
  email TEXT,
  avatar_url TEXT,
  active_class_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Kelas
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_kelas TEXT NOT NULL,
  mata_pelajaran TEXT NOT NULL,
  kkm NUMERIC DEFAULT 75,
  jurusan TEXT,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Siswa
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  no INTEGER NOT NULL,
  nisn TEXT,
  nama TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('L', 'P')),
  catatan_umum TEXT,
  no_hp_orang_tua TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Sesi Absensi
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  pertemuan_ke INTEGER NOT NULL,
  topik_materi TEXT,
  records JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Nilai Siswa
CREATE TABLE IF NOT EXISTS student_grades (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  formatif1 NUMERIC,
  formatif2 NUMERIC,
  formatif3 NUMERIC,
  formatif4 NUMERIC,
  formatif5 NUMERIC,
  formatif6 NUMERIC,
  formatif7 NUMERIC,
  formatif8 NUMERIC,
  formatif9 NUMERIC,
  formatif10 NUMERIC,
  sumatif_tengah NUMERIC,
  sumatif_akhir NUMERIC,
  catatan TEXT,
  monthly_grades JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Jurnal Mengajar
CREATE TABLE IF NOT EXISTS teaching_agendas (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  hari TEXT NOT NULL,
  jam_ke TEXT NOT NULL,
  rentang_jam TEXT,
  materi_ajar TEXT NOT NULL,
  kegiatan TEXT,
  catatan TEXT,
  hadir_count INTEGER DEFAULT 0,
  tidak_hadir_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabel Tabungan & Kas Kelas
CREATE TABLE IF NOT EXISTS saving_transactions (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  is_class_cash BOOLEAN DEFAULT FALSE,
  tanggal DATE NOT NULL,
  tipe TEXT CHECK (tipe IN ('masuk', 'keluar')),
  jumlah NUMERIC NOT NULL,
  keterangan TEXT,
  pencatat TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabel Public Shares (Akses Publik Realtime untuk Wali Murid & Siswa Tanpa Login)
CREATE TABLE IF NOT EXISTS public_shares (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT,
  title TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for public_shares" ON public_shares FOR SELECT USING (true);
CREATE POLICY "Allow upsert public_shares" ON public_shares FOR ALL USING (true);

-- Enable Realtime for public_shares & attendance
ALTER PUBLICATION supabase_realtime ADD TABLE public_shares;
`;
