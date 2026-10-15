-- ==============================================================================
-- MIGRATION: 003_security_cutover.sql
-- FASE 3: SQL SECURITY CUTOVER
-- ==============================================================================
-- PERINGATAN KERAS: JALANKAN SETELAH FASE 1 DAN 2 TERDEPLOY DAN DIUJI!
-- JANGAN DIJALANKAN OTOMATIS SEBELUM KLIEN MENGGUNAKAN RPC get_public_share.
-- ==============================================================================

-- 1. DROP POLICY "Public can view valid shares" pada public_shares
-- Menutup celah SELECT USING (true) untuk anon/authenticated langsung ke tabel public_shares
DROP POLICY IF EXISTS "Public can view valid shares" ON public.public_shares;


-- 2. ALTER PUBLICATION supabase_realtime DROP TABLE public.public_shares
-- Menghentikan broadcast realtime tabel public_shares ke publik demi menghemat koneksi dan mencegah kebocoran data
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


-- 3. Perketat WITH CHECK di INSERT/UPDATE untuk:
-- attendance_sessions, student_grades, grade_columns, teaching_agendas, saving_transactions, dan public_shares:
-- class_id harus milik auth.uid() (untuk public_shares izinkan class_id NULL).

-- 3.1 ATTENDANCE SESSIONS
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


-- 3.2 STUDENT GRADES
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


-- 3.3 GRADE COLUMNS
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


-- 3.4 TEACHING AGENDAS
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


-- 3.5 SAVING TRANSACTIONS
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


-- 3.6 PUBLIC SHARES
-- Memperketat manajemen share: user_id harus milik auth.uid() dan class_id milik auth.uid() (izinkan class_id NULL untuk agenda_share_all)
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

-- Reload schema cache PostgREST
NOTIFY pgrst, 'reload schema';
