-- ==============================================================================
-- SCHEMA POSTGRESQL & ROW LEVEL SECURITY (RLS) UNTUK APLIKASI ABSENSI & NILAI
-- SMK MUHAMMADIYAH BAWANG (100% SUPABASE NATIVE)
-- Jalankan seluruh query ini di SQL Editor Dashboard Supabase Anda:
-- Dashboard Supabase -> Project -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL TEACHER PROFILES
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_teacher_user_id UNIQUE(user_id)
);

-- 3. TABEL KELAS (CLASSES)
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_kelas TEXT NOT NULL,
  mata_pelajaran TEXT NOT NULL,
  kkm INTEGER DEFAULT 75,
  jurusan TEXT,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABEL SISWA (STUDENTS)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  no INTEGER NOT NULL,
  nisn TEXT,
  nama TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('L', 'P')),
  catatan_umum TEXT,
  no_hp_orang_tua TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABEL SESI ABSENSI (ATTENDANCE SESSIONS)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  pertemuan_ke INTEGER NOT NULL,
  topik_materi TEXT,
  records JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABEL NILAI SISWA (STUDENT GRADES)
CREATE TABLE IF NOT EXISTS public.student_grades (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABEL KOLOM ASESMEN / FORMATIF (GRADE COLUMNS)
CREATE TABLE IF NOT EXISTS public.grade_columns (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  tanggal DATE,
  keterangan TEXT,
  bobot NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABEL AGENDA MENGAJAR (TEACHING AGENDAS)
CREATE TABLE IF NOT EXISTS public.teaching_agendas (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  hari TEXT,
  jam_ke TEXT,
  rentang_jam TEXT,
  materi_ajar TEXT NOT NULL,
  kegiatan TEXT,
  catatan TEXT,
  hadir_count INTEGER DEFAULT 0,
  tidak_hadir_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TABEL TRANSAKSI TABUNGAN & KAS (SAVING TRANSACTIONS)
CREATE TABLE IF NOT EXISTS public.saving_transactions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  is_class_cash BOOLEAN DEFAULT false,
  tanggal DATE NOT NULL,
  tipe TEXT CHECK (tipe IN ('masuk', 'keluar')) NOT NULL,
  jumlah NUMERIC NOT NULL,
  keterangan TEXT,
  pencatat TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. TABEL PUBLIC SHARES (UNTUK SHARE LINK ORANG TUA/SISWA)
CREATE TABLE IF NOT EXISTS public.public_shares (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES public.classes(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('absen', 'nilai', 'tabungan')) NOT NULL,
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON public.classes(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON public.attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_grades_class_id ON public.student_grades(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_user_id ON public.student_grades(user_id);
CREATE INDEX IF NOT EXISTS idx_grade_columns_class_id ON public.grade_columns(class_id);
CREATE INDEX IF NOT EXISTS idx_agendas_class_id ON public.teaching_agendas(class_id);
CREATE INDEX IF NOT EXISTS idx_agendas_user_id ON public.teaching_agendas(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_class_id ON public.saving_transactions(class_id);
CREATE INDEX IF NOT EXISTS idx_savings_user_id ON public.saving_transactions(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- A. TEACHER PROFILES RLS
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

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


-- B. CLASSES RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

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


-- C. STUDENTS RLS (Relasi: students -> classes.user_id = auth.uid())
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students select own" ON public.students;
CREATE POLICY "Students select own"
ON public.students FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.students.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Students insert own" ON public.students;
CREATE POLICY "Students insert own"
ON public.students FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.students.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Students update own" ON public.students;
CREATE POLICY "Students update own"
ON public.students FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.students.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.students.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Students delete own" ON public.students;
CREATE POLICY "Students delete own"
ON public.students FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE public.classes.id = public.students.class_id
      AND public.classes.user_id = (SELECT auth.uid())
  )
);


-- D. ATTENDANCE SESSIONS RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Attendance select own" ON public.attendance_sessions;
CREATE POLICY "Attendance select own"
ON public.attendance_sessions FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Attendance insert own" ON public.attendance_sessions;
CREATE POLICY "Attendance insert own"
ON public.attendance_sessions FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Attendance update own" ON public.attendance_sessions;
CREATE POLICY "Attendance update own"
ON public.attendance_sessions FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Attendance delete own" ON public.attendance_sessions;
CREATE POLICY "Attendance delete own"
ON public.attendance_sessions FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- E. STUDENT GRADES RLS
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Grades select own" ON public.student_grades;
CREATE POLICY "Grades select own"
ON public.student_grades FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Grades insert own" ON public.student_grades;
CREATE POLICY "Grades insert own"
ON public.student_grades FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Grades update own" ON public.student_grades;
CREATE POLICY "Grades update own"
ON public.student_grades FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Grades delete own" ON public.student_grades;
CREATE POLICY "Grades delete own"
ON public.student_grades FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- F. GRADE COLUMNS RLS
ALTER TABLE public.grade_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Grade columns select own" ON public.grade_columns;
CREATE POLICY "Grade columns select own"
ON public.grade_columns FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Grade columns insert own" ON public.grade_columns;
CREATE POLICY "Grade columns insert own"
ON public.grade_columns FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Grade columns update own" ON public.grade_columns;
CREATE POLICY "Grade columns update own"
ON public.grade_columns FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Grade columns delete own" ON public.grade_columns;
CREATE POLICY "Grade columns delete own"
ON public.grade_columns FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- G. TEACHING AGENDAS RLS
ALTER TABLE public.teaching_agendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teaching agendas select own" ON public.teaching_agendas;
CREATE POLICY "Teaching agendas select own"
ON public.teaching_agendas FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Teaching agendas insert own" ON public.teaching_agendas;
CREATE POLICY "Teaching agendas insert own"
ON public.teaching_agendas FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Teaching agendas update own" ON public.teaching_agendas;
CREATE POLICY "Teaching agendas update own"
ON public.teaching_agendas FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Teaching agendas delete own" ON public.teaching_agendas;
CREATE POLICY "Teaching agendas delete own"
ON public.teaching_agendas FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- H. SAVING TRANSACTIONS RLS
ALTER TABLE public.saving_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Savings select own" ON public.saving_transactions;
CREATE POLICY "Savings select own"
ON public.saving_transactions FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Savings insert own" ON public.saving_transactions;
CREATE POLICY "Savings insert own"
ON public.saving_transactions FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Savings update own" ON public.saving_transactions;
CREATE POLICY "Savings update own"
ON public.saving_transactions FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Savings delete own" ON public.saving_transactions;
CREATE POLICY "Savings delete own"
ON public.saving_transactions FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- I. PUBLIC SHARES RLS
-- Hanya share ID yang valid yang bisa diakses secara publik (anon & authenticated)
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view valid shares" ON public.public_shares;
CREATE POLICY "Public can view valid shares"
ON public.public_shares FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Users can manage own shares" ON public.public_shares;
CREATE POLICY "Users can manage own shares"
ON public.public_shares FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Realtime Publication for public_shares & attendance
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_shares;
