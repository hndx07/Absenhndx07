-- ==============================================================================
-- WAJIB backup dulu (schema backup_YYYYMMDD) sebelum menjalankan file ini.
-- ==============================================================================
-- MIGRATION: 004_security_hardening.sql
-- FASE 1: SQL SECURITY HARDENING & ROW LEVEL SECURITY ENHANCEMENT
-- ==============================================================================
-- Idempotent: Aman dijalankan berulang kali, aman baik migrasi 003 sudah atau
-- belum dijalankan sebelumnya.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. HARDENING AKSES TABEL public_shares
-- ------------------------------------------------------------------------------
-- Hapus policy SELECT terbuka untuk publik (USING true) dan cabut semua akses anon
DROP POLICY IF EXISTS "Public can view valid shares" ON public.public_shares;
REVOKE ALL ON public.public_shares FROM anon;

-- Pastikan policy manajemen shares untuk user authenticated tetap ada & aman
DROP POLICY IF EXISTS "Users can manage own shares" ON public.public_shares;
CREATE POLICY "Users can manage own shares"
ON public.public_shares FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND (
    class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.classes
      WHERE public.classes.id = public.public_shares.class_id
        AND public.classes.user_id = (SELECT auth.uid())
    )
  )
);

-- ------------------------------------------------------------------------------
-- 2. KELUARKAN public_shares DARI PUBLIKASI supabase_realtime
-- ------------------------------------------------------------------------------
-- Menghentikan broadcast realtime public_shares ke publik demi mencegah kebocoran data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'public_shares'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.public_shares;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TAMBAH KOLOM is_active & expires_at PADA public_shares
-- ------------------------------------------------------------------------------
-- Semua baris lama otomatis is_active = true dan expires_at = NULL (tidak kedaluwarsa)
ALTER TABLE public.public_shares ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.public_shares ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

-- ------------------------------------------------------------------------------
-- 4. PERBARUI RPC FUNCTION get_public_share
-- ------------------------------------------------------------------------------
-- Pertahankan perilaku: cocok share_token ATAU id (fallback link lama tetap aktif)
-- SECURITY DEFINER, SET search_path = public, GRANT EXECUTE ke anon dan authenticated.
-- Tambah filter: is_active = true AND (expires_at IS NULL OR expires_at > now())
-- Prioritaskan kecocokan share_token dibanding id
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
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY 
    CASE WHEN share_token = p_key THEN 0 ELSE 1 END ASC,
    updated_at DESC
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

-- ------------------------------------------------------------------------------
-- 5. PERKETAT WITH CHECK PADA INSERT / UPDATE
-- ------------------------------------------------------------------------------

-- 5.1 STUDENT GRADES:
-- student_id harus murid dari class_id yang sama, dan kelas itu milik auth.uid().
DROP POLICY IF EXISTS "Grades insert own" ON public.student_grades;
CREATE POLICY "Grades insert own"
ON public.student_grades FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.students s ON s.class_id = c.id
    WHERE c.id = public.student_grades.class_id
      AND c.user_id = (SELECT auth.uid())
      AND s.id = public.student_grades.student_id
  )
);

DROP POLICY IF EXISTS "Grades update own" ON public.student_grades;
CREATE POLICY "Grades update own"
ON public.student_grades FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.students s ON s.class_id = c.id
    WHERE c.id = public.student_grades.class_id
      AND c.user_id = (SELECT auth.uid())
      AND s.id = public.student_grades.student_id
  )
);

-- 5.2 SAVING TRANSACTIONS:
-- student_id boleh NULL (kas kelas), atau murid dari class_id yang sama milik auth.uid().
DROP POLICY IF EXISTS "Savings insert own" ON public.saving_transactions;
CREATE POLICY "Savings insert own"
ON public.saving_transactions FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.saving_transactions.class_id
      AND c.user_id = (SELECT auth.uid())
  )
  AND (
    public.saving_transactions.student_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = public.saving_transactions.student_id
        AND s.class_id = public.saving_transactions.class_id
    )
  )
);

DROP POLICY IF EXISTS "Savings update own" ON public.saving_transactions;
CREATE POLICY "Savings update own"
ON public.saving_transactions FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.saving_transactions.class_id
      AND c.user_id = (SELECT auth.uid())
  )
  AND (
    public.saving_transactions.student_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = public.saving_transactions.student_id
        AND s.class_id = public.saving_transactions.class_id
    )
  )
);

-- 5.3 ATTENDANCE SESSIONS:
-- class_id milik auth.uid() (ulangi kebijakan 003 secara idempotent)
DROP POLICY IF EXISTS "Attendance insert own" ON public.attendance_sessions;
CREATE POLICY "Attendance insert own"
ON public.attendance_sessions FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.attendance_sessions.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Attendance update own" ON public.attendance_sessions;
CREATE POLICY "Attendance update own"
ON public.attendance_sessions FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.attendance_sessions.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

-- 5.4 GRADE COLUMNS:
-- class_id milik auth.uid() (ulangi kebijakan 003 secara idempotent)
DROP POLICY IF EXISTS "Grade columns insert own" ON public.grade_columns;
CREATE POLICY "Grade columns insert own"
ON public.grade_columns FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.grade_columns.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Grade columns update own" ON public.grade_columns;
CREATE POLICY "Grade columns update own"
ON public.grade_columns FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.grade_columns.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

-- 5.5 TEACHING AGENDAS:
-- class_id milik auth.uid() (ulangi kebijakan 003 secara idempotent)
DROP POLICY IF EXISTS "Teaching agendas insert own" ON public.teaching_agendas;
CREATE POLICY "Teaching agendas insert own"
ON public.teaching_agendas FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.teaching_agendas.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Teaching agendas update own" ON public.teaching_agendas;
CREATE POLICY "Teaching agendas update own"
ON public.teaching_agendas FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.teaching_agendas.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

-- ------------------------------------------------------------------------------
-- 6. TEACHER PROFILES: SINKRONISASI KOLOM KEPALA SEKOLAH DENGAN DATA.TS
-- ------------------------------------------------------------------------------
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS nama_kepala_sekolah TEXT;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS nip_kepala_sekolah TEXT;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS nbm_kepala_sekolah TEXT;

-- ------------------------------------------------------------------------------
-- 7. INDEKS OPTIMASI QUERY
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_tanggal ON public.attendance_sessions(class_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_saving_transactions_class_tanggal ON public.saving_transactions(class_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_teaching_agendas_user_tanggal ON public.teaching_agendas(user_id, tanggal DESC);

-- Refresh schema cache PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ==============================================================================
-- BLOK ROLLBACK (Jalankan hanya jika ingin mengembalikan ke kondisi sebelum 004):
-- ==============================================================================
/*
BEGIN;

-- 1. Kembalikan policy SELECT publik pada public_shares dan GRANT ke anon
CREATE POLICY "Public can view valid shares"
ON public.public_shares FOR SELECT TO anon, authenticated
USING (true);

GRANT SELECT ON public.public_shares TO anon;

-- 2. Kembalikan public_shares ke publikasi supabase_realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'public_shares'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.public_shares;
  END IF;
END $$;

-- 3. Kembalikan fungsi get_public_share tanpa filter is_active/expires_at
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

-- 4. Kembalikan kebijakan RLS student_grades dan saving_transactions ke versi 003
DROP POLICY IF EXISTS "Grades insert own" ON public.student_grades;
CREATE POLICY "Grades insert own"
ON public.student_grades FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.student_grades.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Grades update own" ON public.student_grades;
CREATE POLICY "Grades update own"
ON public.student_grades FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.student_grades.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Savings insert own" ON public.saving_transactions;
CREATE POLICY "Savings insert own"
ON public.saving_transactions FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.saving_transactions.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Savings update own" ON public.saving_transactions;
CREATE POLICY "Savings update own"
ON public.saving_transactions FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.saving_transactions.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

COMMIT;
*/
