import { Session } from '@supabase/supabase-js';

export const DEMO_USER_ID = 'demo-guru-smkmuhiba';

export const DEMO_SESSION: Session = {
  access_token: 'demo-access-token-muhiba',
  refresh_token: 'demo-refresh-token-muhiba',
  expires_in: 86400,
  token_type: 'bearer',
  user: {
    id: DEMO_USER_ID,
    app_metadata: { provider: 'demo' },
    user_metadata: {
      nama_guru: 'Hendra Prabu S.Kom (Mode Demo)',
      nama_sekolah: 'SMK Muhammadiyah Bawang',
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'demo@smkmuhbawang.sch.id',
  },
} as unknown as Session;

export function isDemoSession(session: Session | null): boolean {
  if (!session) return false;
  return session.user?.id === DEMO_USER_ID || session.user?.app_metadata?.provider === 'demo';
}

export function isDemoActive(): boolean {
  try {
    return typeof window !== 'undefined' && sessionStorage.getItem('smk_demo_active') === 'true';
  } catch {
    return false;
  }
}

export function startDemoSession(): void {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('smk_demo_active', 'true');
    }
  } catch {}
}

export function clearDemoSession(): void {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('smk_demo_active');
    }
  } catch {}
}
