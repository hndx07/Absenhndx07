-- ==============================================================================
-- JANGAN DIJALANKAN SEKARANG.
-- Jalankan manual setelah guru membagikan ulang link lama (minimal 14 hari).
-- ==============================================================================
-- MIGRATION: 005_remove_id_fallback.sql
-- MASA TRANSISI SELESAI: PENGHAPUSAN FALLBACK BERBASIS ID TABEL
-- ==============================================================================
-- File ini HANYA boleh dijalankan secara manual setelah seluruh tautan lama telah
-- diperbarui dengan tautan berbasis share_token unik.
-- Setelah migrasi ini dieksekusi, pemanggilan get_public_share dengan ID internal
-- tabel public_shares TIDAK AKAN LAGI mengembalikan data.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_share(
  p_key text,
  p_since timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  -- Tolak input kosong atau berbahaya
  IF p_key IS NULL OR trim(p_key) = '' THEN
    RETURN NULL;
  END IF;

  -- HANYA mencocokkan share_token unik (tidak ada fallback ID tabel)
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
  WHERE share_token = p_key
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Jika data tidak berubah sejak p_since, kembalikan hanya penanda unchanged
  IF p_since IS NOT NULL AND v_row.updated_at <= p_since THEN
    RETURN jsonb_build_object('unchanged', true);
  END IF;

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

REVOKE ALL ON FUNCTION public.get_public_share(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_share(text, timestamptz) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
