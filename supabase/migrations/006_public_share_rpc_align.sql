-- ==============================================================================
-- MIGRASI 006: PENYELARASAN RPC get_public_share (STATUS DETEKSI REVOKED & EXPIRED)
-- ==============================================================================
--
-- PANDUAN MENJALANKAN DI SUPABASE SQL EDITOR:
-- 1. Buka Supabase Dashboard -> Project Absenhndx07 / SMK Muhammadiyah Bawang
-- 2. Pilih menu "SQL Editor" di bilah navigasi kiri
-- 3. Buat "New Query", salin seluruh isi berkas ini, lalu klik tombol "Run" (Ctrl+Enter)
-- 4. Verifikasi output "Success. No rows returned".
--
-- KARAKTERISTIK KEAMANAN:
-- - Idempotent: Menggunakan CREATE OR REPLACE FUNCTION.
-- - SECURITY DEFINER dengan search_path aman (public, pg_temp) untuk mencegah privilege hijacking.
-- - Privasi Terjaga: Saat status revoked / expired, TIDAK PERNAH mengembalikan payload nilai/absensi siswa.
-- - Backward Compatible: Tetap mendukung pencocokan via share_token maupun id legacy.
-- - RLS: Tidak melonggarkan RLS tabel inti guru. Akses publik hanya melalui fungsi ini.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_share(
  p_key text,
  p_since timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
BEGIN
  -- 1. Validasi input: tolak kunci kosong atau spasi
  IF p_key IS NULL OR trim(p_key) = '' THEN
    RETURN NULL;
  END IF;

  -- 2. Ambil metadata dan payload share berdasarkan share_token (prioritas utama) atau id (fallback link lama)
  SELECT 
    id,
    share_token,
    type,
    class_id,
    title,
    payload,
    is_active,
    expires_at,
    created_at,
    updated_at
  INTO v_row
  FROM public.public_shares
  WHERE (share_token = p_key OR id = p_key)
  ORDER BY 
    CASE WHEN share_token = p_key THEN 0 ELSE 1 END ASC,
    updated_at DESC
  LIMIT 1;

  -- 3. Jika rekaman tidak ditemukan sama sekali
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 4. Validasi status aktif (Revoked): Jangan bocorkan payload
  IF v_row.is_active IS FALSE THEN
    RETURN jsonb_build_object(
      'error', 'revoked',
      'id', v_row.id,
      'is_active', false,
      'updated_at', v_row.updated_at
    );
  END IF;

  -- 5. Validasi kedaluwarsa (Expired): Jangan bocorkan payload
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at <= now() THEN
    RETURN jsonb_build_object(
      'error', 'expired',
      'id', v_row.id,
      'expires_at', v_row.expires_at,
      'updated_at', v_row.updated_at
    );
  END IF;

  -- 6. Optimasi Bandwidth: Jika data tidak berubah sejak p_since, kirim penanda unchanged
  IF p_since IS NOT NULL AND v_row.updated_at <= p_since THEN
    RETURN jsonb_build_object(
      'unchanged', true,
      'id', v_row.id,
      'updated_at', v_row.updated_at
    );
  END IF;

  -- 7. Kembalikan data lengkap untuk tautan valid dan aktif
  RETURN jsonb_build_object(
    'id', v_row.id,
    'share_token', v_row.share_token,
    'type', v_row.type,
    'class_id', v_row.class_id,
    'title', v_row.title,
    'payload', v_row.payload,
    'is_active', v_row.is_active,
    'expires_at', v_row.expires_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

-- Pastikan hak eksekusi hanya untuk anon dan authenticated
REVOKE ALL ON FUNCTION public.get_public_share(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_share(text, timestamptz) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_share(text, timestamptz) IS 
  'Mengambil data public share secara aman dengan pengecekan is_active dan expires_at, mengembalikan kode error spesifik tanpa membocorkan payload siswa.';

COMMIT;
