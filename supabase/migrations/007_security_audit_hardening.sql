-- ==============================================================================
-- MIGRASI 007: AUDIT KEAMANAN MENYELURUH (RLS PERKETAT & RPC PUBLIC SHARE SCOPED)
-- Repository: Absenhndx07 / SMK Muhammadiyah Bawang
-- ==============================================================================
-- PANDUAN EKSEKUSI DI SUPABASE SQL EDITOR:
-- 1. Buka Supabase Dashboard -> Project Absenhndx07 -> SQL Editor
-- 2. Buat "New Query", tempelkan seluruh kode ini, lalu klik "Run" (Ctrl+Enter)
-- 3. Pastikan pesan keluaran adalah "Success. No rows returned".
-- ==============================================================================
-- RINGKASAN KEAMANAN:
-- 1. get_public_share RPC:
--    - SECURITY DEFINER dengan search_path terkunci ke public, pg_temp.
--    - Validasi token/id, cek is_active (revoked) dan expires_at (expired).
--    - Payload sanitization: menapis nomor HP orang tua, catatan pribadi, dan menyamarkan NISN.
--    - Membatasi atribut payload sesuai tipe share ('absen', 'nilai', 'tabungan', 'agenda').
--    - Tidak membocorkan user_id guru atau data guru lain.
-- 2. Audit Row Level Security (RLS):
--    - Memastikan RLS aktif di seluruh tabel sensitif.
--    - Mencabut seluruh izin akses tabel langsung dari role 'anon'.
--    - Menegakkan kepemilikan multi-tenant ketat (auth.uid() = user_id dan class_id milik guru).
--    - Klausa WITH CHECK pada setiap INSERT dan UPDATE untuk mencegah cross-tenant injection.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. CABUT SELURUH AKSES LANGSUNG DARI ROLE 'anon' KE TABEL DATABASE
-- ------------------------------------------------------------------------------
-- Akses publik HANYA diizinkan melalui RPC get_public_share yang terisolasi.
REVOKE ALL ON TABLE public.teacher_profiles FROM anon;
REVOKE ALL ON TABLE public.classes FROM anon;
REVOKE ALL ON TABLE public.students FROM anon;
REVOKE ALL ON TABLE public.attendance_sessions FROM anon;
REVOKE ALL ON TABLE public.student_grades FROM anon;
REVOKE ALL ON TABLE public.grade_columns FROM anon;
REVOKE ALL ON TABLE public.teaching_agendas FROM anon;
REVOKE ALL ON TABLE public.saving_transactions FROM anon;
REVOKE ALL ON TABLE public.public_shares FROM anon;

-- ------------------------------------------------------------------------------
-- 2. PASTIKAN RLS AKTIF PADA SEMUA TABEL
-- ------------------------------------------------------------------------------
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. PERKUAT RLS POLICY UNTUK ROLE 'authenticated'
-- ------------------------------------------------------------------------------

-- 3.1. TEACHER PROFILES
DROP POLICY IF EXISTS "Teacher profiles select own" ON public.teacher_profiles;
CREATE POLICY "Teacher profiles select own"
ON public.teacher_profiles FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Teacher profiles insert own" ON public.teacher_profiles;
CREATE POLICY "Teacher profiles insert own"
ON public.teacher_profiles FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Teacher profiles update own" ON public.teacher_profiles;
CREATE POLICY "Teacher profiles update own"
ON public.teacher_profiles FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Teacher profiles delete own" ON public.teacher_profiles;
CREATE POLICY "Teacher profiles delete own"
ON public.teacher_profiles FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- 3.2. CLASSES
DROP POLICY IF EXISTS "Classes select own" ON public.classes;
CREATE POLICY "Classes select own"
ON public.classes FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Classes insert own" ON public.classes;
CREATE POLICY "Classes insert own"
ON public.classes FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Classes update own" ON public.classes;
CREATE POLICY "Classes update own"
ON public.classes FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Classes delete own" ON public.classes;
CREATE POLICY "Classes delete own"
ON public.classes FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- 3.3. STUDENTS (Relasi Kepemilikan Kelas)
DROP POLICY IF EXISTS "Students select own" ON public.students;
CREATE POLICY "Students select own"
ON public.students FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.students.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Students insert own" ON public.students;
CREATE POLICY "Students insert own"
ON public.students FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.students.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Students update own" ON public.students;
CREATE POLICY "Students update own"
ON public.students FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.students.class_id
      AND c.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.students.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Students delete own" ON public.students;
CREATE POLICY "Students delete own"
ON public.students FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.students.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);


-- 3.4. ATTENDANCE SESSIONS
DROP POLICY IF EXISTS "Attendance select own" ON public.attendance_sessions;
CREATE POLICY "Attendance select own"
ON public.attendance_sessions FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.attendance_sessions.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Attendance insert own" ON public.attendance_sessions;
CREATE POLICY "Attendance insert own"
ON public.attendance_sessions FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.attendance_sessions.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Attendance update own" ON public.attendance_sessions;
CREATE POLICY "Attendance update own"
ON public.attendance_sessions FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.attendance_sessions.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Attendance delete own" ON public.attendance_sessions;
CREATE POLICY "Attendance delete own"
ON public.attendance_sessions FOR DELETE TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.attendance_sessions.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);


-- 3.5. STUDENT GRADES
DROP POLICY IF EXISTS "Grades select own" ON public.student_grades;
CREATE POLICY "Grades select own"
ON public.student_grades FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.student_grades.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);

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

DROP POLICY IF EXISTS "Grades delete own" ON public.student_grades;
CREATE POLICY "Grades delete own"
ON public.student_grades FOR DELETE TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.student_grades.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);


-- 3.6. GRADE COLUMNS
DROP POLICY IF EXISTS "Grade columns select own" ON public.grade_columns;
CREATE POLICY "Grade columns select own"
ON public.grade_columns FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.grade_columns.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Grade columns insert own" ON public.grade_columns;
CREATE POLICY "Grade columns insert own"
ON public.grade_columns FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.grade_columns.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Grade columns update own" ON public.grade_columns;
CREATE POLICY "Grade columns update own"
ON public.grade_columns FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.grade_columns.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Grade columns delete own" ON public.grade_columns;
CREATE POLICY "Grade columns delete own"
ON public.grade_columns FOR DELETE TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.grade_columns.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);


-- 3.7. TEACHING AGENDAS
DROP POLICY IF EXISTS "Teaching agendas select own" ON public.teaching_agendas;
CREATE POLICY "Teaching agendas select own"
ON public.teaching_agendas FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND (
    class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = public.teaching_agendas.class_id
        AND c.user_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Teaching agendas insert own" ON public.teaching_agendas;
CREATE POLICY "Teaching agendas insert own"
ON public.teaching_agendas FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND (
    class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = public.teaching_agendas.class_id
        AND c.user_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Teaching agendas update own" ON public.teaching_agendas;
CREATE POLICY "Teaching agendas update own"
ON public.teaching_agendas FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND (
    class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = public.teaching_agendas.class_id
        AND c.user_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Teaching agendas delete own" ON public.teaching_agendas;
CREATE POLICY "Teaching agendas delete own"
ON public.teaching_agendas FOR DELETE TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND (
    class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = public.teaching_agendas.class_id
        AND c.user_id = (SELECT auth.uid())
    )
  )
);


-- 3.8. SAVING TRANSACTIONS
DROP POLICY IF EXISTS "Savings select own" ON public.saving_transactions;
CREATE POLICY "Savings select own"
ON public.saving_transactions FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.saving_transactions.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);

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

DROP POLICY IF EXISTS "Savings delete own" ON public.saving_transactions;
CREATE POLICY "Savings delete own"
ON public.saving_transactions FOR DELETE TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = public.saving_transactions.class_id
      AND c.user_id = (SELECT auth.uid())
  )
);


-- 3.9. PUBLIC SHARES
DROP POLICY IF EXISTS "Users can manage own shares" ON public.public_shares;
CREATE POLICY "Users can manage own shares"
ON public.public_shares FOR ALL TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND (
    class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = public.public_shares.class_id
        AND c.user_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND (
    class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = public.public_shares.class_id
        AND c.user_id = (SELECT auth.uid())
    )
  )
);

-- Pastikan tabel public_shares tidak masuk ke publikasi realtime broadcast publik
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
-- 4. RPC FUNCTION get_public_share: SECURITY DEFINER DENGAN SANITASI SCOPED
-- ------------------------------------------------------------------------------
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
  v_clean_payload jsonb;
  v_clean_students jsonb;
BEGIN
  -- 1. Validasi input: tolak kunci kosong atau spasi
  IF p_key IS NULL OR trim(p_key) = '' THEN
    RETURN NULL;
  END IF;

  -- 2. Ambil baris share berdasarkan share_token (prioritas utama) atau id
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

  -- 3. Jika rekaman tidak ditemukan
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 4. Validasi status aktif (Revoked): jangan bocorkan payload
  IF v_row.is_active IS FALSE THEN
    RETURN jsonb_build_object(
      'error', 'revoked',
      'id', v_row.id,
      'is_active', false,
      'updated_at', v_row.updated_at
    );
  END IF;

  -- 5. Validasi kedaluwarsa (Expired): jangan bocorkan payload
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

  -- 7. Sanitasi Payload berdasarkan Scope & Privasi Siswa
  v_clean_payload := COALESCE(v_row.payload, '{}'::jsonb);

  -- 7.1. Bersihkan field data murid jika terdapat daftar students dalam payload
  IF jsonb_typeof(v_clean_payload->'students') = 'array' THEN
    SELECT COALESCE(
      jsonb_agg(
        -- Hapus nomor HP orang tua dan catatan internal, samarkan NISN (hanya 4 digit terakhir)
        jsonb_build_object(
          'id', elem->>'id',
          'no', elem->'no',
          'nama', elem->>'nama',
          'gender', elem->>'gender',
          'nisn', CASE 
            WHEN length(elem->>'nisn') > 4 THEN 
              repeat('*', length(elem->>'nisn') - 4) || right(elem->>'nisn', 4)
            ELSE elem->>'nisn'
          END,
          'saldo', elem->'saldo',
          'tanggalInput', elem->'tanggalInput',
          'lastTransactionDate', elem->'lastTransactionDate'
        )
      ),
      '[]'::jsonb
    )
    INTO v_clean_students
    FROM jsonb_array_elements(v_clean_payload->'students') AS elem;

    v_clean_payload := jsonb_set(v_clean_payload, '{students}', v_clean_students);
  END IF;

  -- 7.2. Batasi atribut payload sesuai tipe scope (absen / nilai / tabungan / agenda)
  -- Hapus field internal atau lintas batas yang tidak seharusnya ada di scope tersebut
  IF v_row.type = 'absen' THEN
    v_clean_payload := v_clean_payload - 'grades' - 'gradeColumns' - 'transactions' - 'cashTransactions' - 'allTransactions';
  ELSIF v_row.type = 'nilai' THEN
    v_clean_payload := v_clean_payload - 'sessions' - 'transactions' - 'cashTransactions' - 'allTransactions' - 'agendas';
  ELSIF v_row.type = 'tabungan' THEN
    v_clean_payload := v_clean_payload - 'sessions' - 'grades' - 'gradeColumns' - 'agendas';
  ELSIF v_row.type = 'agenda' THEN
    v_clean_payload := v_clean_payload - 'sessions' - 'grades' - 'gradeColumns' - 'students' - 'transactions' - 'cashTransactions';
  END IF;

  -- 8. Kembalikan data lengkap untuk tautan valid dan aktif
  RETURN jsonb_build_object(
    'id', v_row.id,
    'share_token', v_row.share_token,
    'type', v_row.type,
    'class_id', v_row.class_id,
    'title', v_row.title,
    'payload', v_clean_payload,
    'is_active', v_row.is_active,
    'expires_at', v_row.expires_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

-- Hak eksekusi RPC hanya untuk anon dan authenticated
REVOKE ALL ON FUNCTION public.get_public_share(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_share(text, timestamptz) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_share(text, timestamptz) IS 
  'Mengambil data public share secara aman dengan validasi token, is_active, expires_at, serta sanitasi payload scoped tanpa membocorkan data sensitif guru/siswa.';

-- Muat ulang cache schema PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
