-- ==============================================================================
-- MIGRATION: 002_security_additive.sql
-- FASE 1: SQL ADDITIVE (IDEMPOTENT & BACKWARD COMPATIBLE)
-- ==============================================================================
-- Catatan: Skrip ini aman dijalankan langsung di database yang sedang aktif
-- tanpa mengganggu versi klien yang lama.
-- ==============================================================================

-- 1. Tambah kolom share_token TEXT UNIQUE DEFAULT gen_random_uuid()::text di public_shares
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'public_shares' 
      AND column_name = 'share_token'
  ) THEN
    ALTER TABLE public.public_shares ADD COLUMN share_token TEXT;
  END IF;
END $$;

-- Backfill baris yang sudah ada dengan UUID acak jika share_token masih kosong
UPDATE public.public_shares 
SET share_token = gen_random_uuid()::text 
WHERE share_token IS NULL;

-- Atur DEFAULT gen_random_uuid()::text untuk baris baru
ALTER TABLE public.public_shares 
ALTER COLUMN share_token SET DEFAULT gen_random_uuid()::text;

-- Pastikan ada constraint UNIQUE pada share_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'public_shares_share_token_key'
  ) THEN
    ALTER TABLE public.public_shares ADD CONSTRAINT public_shares_share_token_key UNIQUE (share_token);
  END IF;
END $$;

-- Buat index untuk pencarian cepat berdasarkan share_token
CREATE INDEX IF NOT EXISTS idx_public_shares_share_token ON public.public_shares(share_token);


-- 2. Perluas CHECK constraint kolom type agar menerima 'agenda'
DO $$
DECLARE
  v_con_name text;
BEGIN
  FOR v_con_name IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.public_shares'::regclass 
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.public_shares DROP CONSTRAINT IF EXISTS ' || quote_ident(v_con_name);
  END LOOP;
END $$;

ALTER TABLE public.public_shares 
ADD CONSTRAINT public_shares_type_check 
CHECK (type IN ('absen', 'nilai', 'tabungan', 'agenda'));


-- 3. Buat RPC get_public_share(p_key text, p_since timestamptz default null)
-- SECURITY DEFINER, SET search_path = public, GRANT EXECUTE ke anon dan authenticated.
-- Mencari satu baris yang share_token = p_key ATAU id = p_key (hanya selama masa transisi).
-- Jika updated_at <= p_since, kembalikan {"unchanged": true}.
-- Tidak ada wildcard atau listing query.
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
  -- Tolak input kosong atau berbahaya (tidak boleh ada mode list / wildcard)
  IF p_key IS NULL OR trim(p_key) = '' THEN
    RETURN NULL;
  END IF;

  SELECT 
    id,
    share_token,
    type,
    class_id,
    title,
    payload,
    created_at,
    updated_at
  INTO v_row
  FROM public.public_shares
  WHERE (share_token = p_key OR id = p_key)
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
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_share(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_share(text, timestamptz) TO anon, authenticated;


-- 4. UPDATE payload yang sudah ada:
-- Hapus key noHpOrangTua dan catatanUmum dari array payload->'students',
-- dan samarkan nisn (tampilkan 4 digit terakhir).
UPDATE public.public_shares
SET payload = jsonb_set(
  payload,
  '{students}',
  COALESCE(
    (
      SELECT jsonb_agg(
        CASE
          WHEN s->>'nisn' IS NOT NULL AND length(s->>'nisn') > 4 THEN
            jsonb_set(
              s - 'noHpOrangTua' - 'catatanUmum' - 'no_hp_orang_tua' - 'catatan_umum',
              '{nisn}',
              to_jsonb(repeat('*', length(s->>'nisn') - 4) || right(s->>'nisn', 4))
            )
          ELSE
            s - 'noHpOrangTua' - 'catatanUmum' - 'no_hp_orang_tua' - 'catatan_umum'
        END
      )
      FROM jsonb_array_elements(payload->'students') AS s
    ),
    '[]'::jsonb
  )
)
WHERE payload IS NOT NULL
  AND payload ? 'students'
  AND jsonb_typeof(payload->'students') = 'array';

-- Reload schema cache PostgREST
NOTIFY pgrst, 'reload schema';
