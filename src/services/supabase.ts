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

export interface SupabaseHealthStatus {
  ok: boolean;
  connected: boolean;
  databaseSchemaReady: boolean;
  authReady: boolean;
  readReady: boolean;
  writeReady: boolean;
  missingTables: string[];
  errorCode?: string;
  message: string;
}

export const REQUIRED_SUPABASE_TABLES = [
  'teacher_profiles',
  'classes',
  'students',
  'attendance_sessions',
  'student_grades',
  'grade_columns',
  'teaching_agendas',
  'saving_transactions',
  'public_shares',
] as const;

export async function checkSupabaseConnection(): Promise<SupabaseHealthStatus> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      connected: false,
      databaseSchemaReady: false,
      authReady: false,
      readReady: false,
      writeReady: false,
      missingTables: [...REQUIRED_SUPABASE_TABLES],
      errorCode: 'ENV_NOT_CONFIGURED',
      message:
        'VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diatur pada Environment Variables.',
    };
  }

  let client: SupabaseClient;
  try {
    client = getSupabaseClient();
  } catch (e: any) {
    return {
      ok: false,
      connected: false,
      databaseSchemaReady: false,
      authReady: false,
      readReady: false,
      writeReady: false,
      missingTables: [...REQUIRED_SUPABASE_TABLES],
      errorCode: 'CLIENT_INIT_ERROR',
      message: e.message || 'Gagal menginisialisasi klien Supabase.',
    };
  }

  // 1. Check Auth connection
  let authReady = false;
  try {
    const { error: authError } = await client.auth.getSession();
    if (!authError) {
      authReady = true;
    }
  } catch {
    authReady = false;
  }

  // 2. Check Database Schema Readiness across required tables
  const missingTables: string[] = [];
  let connectionError: string | null = null;
  let hasSchemaCacheError = false;

  for (const table of REQUIRED_SUPABASE_TABLES) {
    try {
      const { error } = await client.from(table).select('id').limit(1);
      if (error) {
        // PGRST205 / 42P01 / "Could not find the table ... in the schema cache"
        const isMissing =
          error.code === '42P01' ||
          error.code === 'PGRST205' ||
          error.message.includes('schema cache') ||
          error.message.includes('relation') ||
          error.message.includes('does not exist');

        if (isMissing) {
          missingTables.push(table);
          hasSchemaCacheError = true;
        } else {
          // If RLS blocked (e.g. 42501 permission denied because not logged in), the table DOES exist in schema cache!
          // Only actual missing table error adds to missingTables.
          if (error.code !== '42501' && !error.message.includes('JWT')) {
            connectionError = error.message;
          }
        }
      }
    } catch (err: any) {
      missingTables.push(table);
      connectionError = err.message;
    }
  }

  const databaseSchemaReady = missingTables.length === 0 && !hasSchemaCacheError;
  const connected = authReady || !connectionError || hasSchemaCacheError;
  const readReady = databaseSchemaReady;
  const writeReady = databaseSchemaReady;
  const isOk = connected && databaseSchemaReady && authReady;

  let message = 'Tersambung ke Cloud Supabase (PostgreSQL & Auth).';
  if (!connected) {
    message = connectionError || 'Tidak dapat terhubung ke endpoint Supabase.';
  } else if (!databaseSchemaReady) {
    message = `Tabel schema belum lengkap di Supabase (${missingTables.length} tabel belum terdeteksi: ${missingTables.join(', ')}). Silakan jalankan migration 001_initial_schema.sql di SQL Editor Supabase.`;
  }

  return {
    ok: isOk,
    connected,
    databaseSchemaReady,
    authReady,
    readReady,
    writeReady,
    missingTables,
    errorCode: missingTables.length > 0 ? 'SCHEMA_TABLES_MISSING' : undefined,
    message,
  };
}
