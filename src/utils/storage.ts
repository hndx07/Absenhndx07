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
export async function migrateLegacyLocalStorageToSupabase(): Promise<{
  success: boolean;
  importedCount: number;
  failedCount: number;
  message: string;
}> {
  let importedCount = 0;
  let failedCount = 0;

  try {
    // 1. Classes
    const rawClasses = localStorage.getItem(LEGACY_KEYS.CLASSES);
    if (rawClasses) {
      const parsed: ClassRoom[] = JSON.parse(rawClasses);
      for (const cls of parsed) {
        try {
          await createClass(cls);
          importedCount++;
        } catch {
          failedCount++;
        }
      }
    }

    // 2. Students
    const rawStudents = localStorage.getItem(LEGACY_KEYS.STUDENTS);
    if (rawStudents) {
      const parsed: Student[] = JSON.parse(rawStudents);
      try {
        await batchInsertStudents(parsed);
        importedCount += parsed.length;
      } catch {
        failedCount += parsed.length;
      }
    }

    // 3. Attendance
    const rawAtt = localStorage.getItem(LEGACY_KEYS.ATTENDANCE);
    if (rawAtt) {
      const parsed: AttendanceSession[] = JSON.parse(rawAtt);
      for (const sess of parsed) {
        try {
          await saveAttendanceSession(sess);
          importedCount++;
        } catch {
          failedCount++;
        }
      }
    }

    // 4. Grades
    const rawGrades = localStorage.getItem(LEGACY_KEYS.GRADES);
    if (rawGrades) {
      const parsed: StudentGrade[] = JSON.parse(rawGrades);
      for (const gr of parsed) {
        try {
          await saveStudentGrade(gr);
          importedCount++;
        } catch {
          failedCount++;
        }
      }
    }

    // 5. Agendas
    const rawAgd = localStorage.getItem(LEGACY_KEYS.AGENDAS);
    if (rawAgd) {
      const parsed: TeachingAgenda[] = JSON.parse(rawAgd);
      for (const ag of parsed) {
        try {
          await saveTeachingAgenda(ag);
          importedCount++;
        } catch {
          failedCount++;
        }
      }
    }

    // 6. Savings
    const rawSavings = localStorage.getItem(LEGACY_KEYS.SAVINGS);
    if (rawSavings) {
      const parsed: SavingTransaction[] = JSON.parse(rawSavings);
      for (const tx of parsed) {
        try {
          await saveSavingTransaction(tx);
          importedCount++;
        } catch {
          failedCount++;
        }
      }
    }

    // Mark as migrated and clean up legacy data
    for (const key of Object.values(LEGACY_KEYS)) {
      localStorage.removeItem(key);
    }
    localStorage.setItem('smk_migrated_to_supabase', new Date().toISOString());

    return {
      success: true,
      importedCount,
      failedCount,
      message: `Migrasi selesai! ${importedCount} data berhasil dipindahkan ke PostgreSQL Supabase. ${failedCount > 0 ? `(${failedCount} data gagal)` : ''}`,
    };
  } catch (err: any) {
    return {
      success: false,
      importedCount,
      failedCount,
      message: `Terjadi kendala saat migrasi: ${err?.message || 'Error tidak diketahui'}`,
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
