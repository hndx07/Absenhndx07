import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.trim() !== '' &&
    supabaseAnonKey.trim() !== '' &&
    !supabaseUrl.includes('your-project')
  );
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (clientInstance) return clientInstance;

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Kredensial Supabase belum dikonfigurasi. Harap atur environment variable VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di Vercel atau file .env.'
    );
  }

  clientInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return clientInstance;
}

// Safe client getter for cases where client might be checked conditionally
export function getSafeSupabaseClient(): SupabaseClient | null {
  try {
    return getSupabaseClient();
  } catch {
    return null;
  }
}

// Auth API Methods
export async function signInWithEmailPassword(email: string, password: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmailPassword(
  email: string,
  password: string,
  metadata?: { nama_guru?: string }
) {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: metadata || {},
    },
  });
  if (error) throw error;
  return data;
}

export async function getAuthSession() {
  const client = getSafeSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.error('Failed to retrieve Supabase session:', error);
    return null;
  }
  return data.session;
}

export async function getAuthUser() {
  const client = getSafeSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error) {
    console.error('Failed to retrieve Supabase user:', error);
    return null;
  }
  return data.user;
}

export async function signOutSupabase() {
  const client = getSafeSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
}

export async function checkSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diatur pada Environment Variables.',
    };
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client.from('classes').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          ok: false,
          message: 'Tabel database belum dibuat di Supabase. Silakan jalankan script supabase-schema.sql di SQL Editor.',
        };
      }
      return {
        ok: false,
        message: `Koneksi Supabase error: ${error.message}`,
      };
    }
    return {
      ok: true,
      message: 'Tersambung ke Cloud Supabase (PostgreSQL & Auth).',
    };
  } catch (e: any) {
    return {
      ok: false,
      message: e.message || 'Tidak dapat terhubung ke Supabase.',
    };
  }
}
