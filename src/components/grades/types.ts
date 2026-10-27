import {
  ClassRoom,
  Student,
  StudentGrade,
  GradeColumn,
  TeacherProfile,
} from '../../types';

export interface GradesViewProps {
  currentClass: ClassRoom;
  students: Student[];
  grades: StudentGrade[];
  gradeColumns: GradeColumn[];
  teacher: TeacherProfile;
  onSaveGrade: (grade: StudentGrade) => void | Promise<void>;
  onSaveGradeColumns: (cols: GradeColumn[]) => void | Promise<void>;
}

export interface GradePreviewRow {
  rowNum: number;
  nisn: string;
  nama: string;
  studentId?: string;
  scores: Record<string, number | null>;
  catatan: string;
  status: 'valid' | 'duplicate' | 'not_found' | 'invalid';
  reason?: string;
}

export interface GradeFinalScoreResult {
  finalScore: number;
  sumInputted: number;
  countInputted: number;
  formatifAvg: number;
  predicate: string;
  predicateLabel: string;
  merdekaDeskripsi: string;
  merdekaDeskripsiSingkat: string;
  isPassed: boolean;
  hasAnyScore: boolean;
}

export interface ColumnSummary {
  tpSummaries: { sum: number; count: number; avg: number | string }[];
  sts: { sum: number; count: number; avg: number | string };
  sas: { sum: number; count: number; avg: number | string };
  totalAllSum: number;
}
