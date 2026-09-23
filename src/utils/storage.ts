import {
  TeacherProfile,
  ClassRoom,
  Student,
  AttendanceSession,
  StudentGrade,
  GradeColumn,
  TeachingAgenda,
  SavingTransaction,
} from '../types';
import {
  createClass,
  batchInsertStudents,
  saveAttendanceSession,
  saveStudentGrade,
  saveTeachingAgenda,
  saveSavingTransaction,
} from '../services/data';
import { checkSupabaseConnection } from '../services/supabase';

const LEGACY_KEYS = {
  CLASSES: 'smk_classes',
  STUDENTS: 'smk_students',
  ATTENDANCE: 'smk_attendance',
  GRADES: 'smk_grades',
  GRADE_COLUMNS: 'smk_grade_columns',
  AGENDAS: 'smk_agendas',
  SAVINGS: 'smk_savings',
};

// Check if any legacy local data exists in the user's browser
export function checkHasLegacyLocalData(): boolean {
  try {
    for (const key of Object.values(LEGACY_KEYS)) {
      const val = localStorage.getItem(key);
      if (val) {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return true;
        }
      }
    }
  } catch (e) {
    console.error('Error checking legacy local data:', e);
  }
  return false;
}

export function getLegacyDataSummary(): {
  classes: number;
  students: number;
  attendance: number;
  grades: number;
  agendas: number;
  savings: number;
} {
  const summary = {
    classes: 0,
    students: 0,
    attendance: 0,
    grades: 0,
    agendas: 0,
    savings: 0,
  };

  try {
    const cls = localStorage.getItem(LEGACY_KEYS.CLASSES);
    if (cls) summary.classes = JSON.parse(cls).length || 0;

    const std = localStorage.getItem(LEGACY_KEYS.STUDENTS);
    if (std) summary.students = JSON.parse(std).length || 0;

    const att = localStorage.getItem(LEGACY_KEYS.ATTENDANCE);
    if (att) summary.attendance = JSON.parse(att).length || 0;

    const grd = localStorage.getItem(LEGACY_KEYS.GRADES);
    if (grd) summary.grades = JSON.parse(grd).length || 0;

    const agd = localStorage.getItem(LEGACY_KEYS.AGENDAS);
    if (agd) summary.agendas = JSON.parse(agd).length || 0;

    const svg = localStorage.getItem(LEGACY_KEYS.SAVINGS);
    if (svg) summary.savings = JSON.parse(svg).length || 0;
  } catch (e) {
    console.warn('Error summarizing legacy data:', e);
  }

  return summary;
}

// One-time migration: Import data from LocalStorage to Supabase
// Protected: NEVER removes localStorage unless database schema is ready and insertion is 100% verified
export async function migrateLegacyLocalStorageToSupabase(): Promise<{
  success: boolean;
  importedCount: number;
  failedCount: number;
  message: string;
}> {
  // SAFETY GATE: Verify Supabase database schema readiness first
  const health = await checkSupabaseConnection();
  if (!health.databaseSchemaReady) {
    return {
      success: false,
      importedCount: 0,
      failedCount: 0,
      message: `MIGRATION STATUS = BLOCKED: Schema database Supabase belum siap (${health.missingTables.length > 0 ? `Tabel belum ada: ${health.missingTables.join(', ')}` : health.message}). Data lokal Anda dijamin AMAN dan TIDAK dihapus. Silakan jalankan file supabase/migrations/001_initial_schema.sql di SQL Editor Supabase terlebih dahulu.`,
    };
  }

  let importedCount = 0;
  let failedCount = 0;

  try {
    // 1. Classes
    let classesFailed = 0;
    const rawClasses = localStorage.getItem(LEGACY_KEYS.CLASSES);
    if (rawClasses) {
      const parsed: ClassRoom[] = JSON.parse(rawClasses);
      for (const cls of parsed) {
        try {
          await createClass(cls);
          importedCount++;
        } catch (e) {
          console.error('Failed to migrate class:', cls.namaKelas, e);
          failedCount++;
          classesFailed++;
        }
      }
      // ONLY remove if completely successful
      if (classesFailed === 0 && parsed.length > 0) {
        localStorage.removeItem(LEGACY_KEYS.CLASSES);
      }
    }

    // 2. Students
    let studentsFailed = 0;
    const rawStudents = localStorage.getItem(LEGACY_KEYS.STUDENTS);
    if (rawStudents) {
      const parsed: Student[] = JSON.parse(rawStudents);
      try {
        await batchInsertStudents(parsed);
        importedCount += parsed.length;
        localStorage.removeItem(LEGACY_KEYS.STUDENTS);
      } catch (e) {
        console.error('Failed to migrate students:', e);
        failedCount += parsed.length;
        studentsFailed += parsed.length;
      }
    }

    // 3. Attendance
    let attendanceFailed = 0;
    const rawAtt = localStorage.getItem(LEGACY_KEYS.ATTENDANCE);
    if (rawAtt) {
      const parsed: AttendanceSession[] = JSON.parse(rawAtt);
      for (const sess of parsed) {
        try {
          await saveAttendanceSession(sess);
          importedCount++;
        } catch (e) {
          console.error('Failed to migrate attendance:', sess.tanggal, e);
          failedCount++;
          attendanceFailed++;
        }
      }
      if (attendanceFailed === 0 && parsed.length > 0) {
        localStorage.removeItem(LEGACY_KEYS.ATTENDANCE);
      }
    }

    // 4. Grades
    let gradesFailed = 0;
    const rawGrades = localStorage.getItem(LEGACY_KEYS.GRADES);
    if (rawGrades) {
      const parsed: StudentGrade[] = JSON.parse(rawGrades);
      for (const gr of parsed) {
        try {
          await saveStudentGrade(gr);
          importedCount++;
        } catch (e) {
          console.error('Failed to migrate grade:', gr.id, e);
          failedCount++;
          gradesFailed++;
        }
      }
      if (gradesFailed === 0 && parsed.length > 0) {
        localStorage.removeItem(LEGACY_KEYS.GRADES);
      }
    }

    // 5. Agendas
    let agendasFailed = 0;
    const rawAgd = localStorage.getItem(LEGACY_KEYS.AGENDAS);
    if (rawAgd) {
      const parsed: TeachingAgenda[] = JSON.parse(rawAgd);
      for (const ag of parsed) {
        try {
          await saveTeachingAgenda(ag);
          importedCount++;
        } catch (e) {
          console.error('Failed to migrate agenda:', ag.tanggal, e);
          failedCount++;
          agendasFailed++;
        }
      }
      if (agendasFailed === 0 && parsed.length > 0) {
        localStorage.removeItem(LEGACY_KEYS.AGENDAS);
      }
    }

    // 6. Savings
    let savingsFailed = 0;
    const rawSavings = localStorage.getItem(LEGACY_KEYS.SAVINGS);
    if (rawSavings) {
      const parsed: SavingTransaction[] = JSON.parse(rawSavings);
      for (const tx of parsed) {
        try {
          await saveSavingTransaction(tx);
          importedCount++;
        } catch (e) {
          console.error('Failed to migrate saving transaction:', tx.id, e);
          failedCount++;
          savingsFailed++;
        }
      }
      if (savingsFailed === 0 && parsed.length > 0) {
        localStorage.removeItem(LEGACY_KEYS.SAVINGS);
      }
    }

    // Only set migration timestamp if no overall failures
    if (failedCount === 0 && importedCount > 0) {
      localStorage.setItem('smk_migrated_to_supabase', new Date().toISOString());
    }

    return {
      success: failedCount === 0,
      importedCount,
      failedCount,
      message:
        failedCount === 0
          ? `Migrasi berhasil! ${importedCount} data berhasil dipindahkan ke PostgreSQL Supabase.`
          : `Migrasi selesai sebagian: ${importedCount} data berhasil, ${failedCount} data gagal. Data yang belum berhasil tetap AMAN di browser.`,
    };
  } catch (err: any) {
    return {
      success: false,
      importedCount,
      failedCount,
      message: `Terjadi kendala saat migrasi: ${err?.message || 'Error tidak diketahui'}. Data lokal tetap aman di browser.`,
    };
  }
}

// Backup current memory data to JSON file
export function exportDataToJsonBackup(data: {
  teacher: TeacherProfile | null;
  classes: ClassRoom[];
  students: Student[];
  attendance: AttendanceSession[];
  grades: StudentGrade[];
  gradeColumns: GradeColumn[];
  agendas: TeachingAgenda[];
  savings: SavingTransaction[];
}): string {
  const payload = {
    appName: 'Absenhndx07 - SMK Muhammadiyah Bawang',
    backupVersion: '2.0-supabase',
    exportedAt: new Date().toISOString(),
    ...data,
  };
  return JSON.stringify(payload, null, 2);
}
