import { StudentGrade } from '../types';

export interface MerdekaAssessmentResult {
  predikat: 'A' | 'B' | 'C' | 'D';
  predikatLabel: string;
  deskripsi: string;
  deskripsiSingkat: string;
  isTuntas: boolean;
}

export function getKurikulumMerdekaAssessment(
  score: number | null | undefined,
  arg2?: string | number,
  arg3?: number | string,
  arg4?: string
): MerdekaAssessmentResult {
  let nama = 'Murid';
  let kkm = 75;
  let mataPelajaran = '';

  if (typeof arg2 === 'number') {
    kkm = arg2;
    mataPelajaran = typeof arg3 === 'string' ? arg3 : '';
    nama = arg4 || 'Murid';
  } else {
    nama = typeof arg2 === 'string' ? arg2 : 'Murid';
    kkm = typeof arg3 === 'number' ? arg3 : 75;
    mataPelajaran = arg4 || '';
  }

  if (score === null || score === undefined) {
    return {
      predikat: 'D',
      predikatLabel: 'Belum Ada Nilai',
      deskripsi: `Ananda ${nama} belum memiliki rekaman nilai untuk ${mataPelajaran || 'mata pelajaran ini'}.`,
      deskripsiSingkat: 'Belum ada penilaian',
      isTuntas: false,
    };
  }

  const rounded = Math.round(score);

  if (rounded >= 90) {
    return {
      predikat: 'A',
      predikatLabel: 'Sangat Baik',
      deskripsi: `Ananda ${nama} menunjukkan penguasaan yang sangat baik dan istimewa dalam seluruh capaian pembelajaran ${mataPelajaran ? `mata pelajaran ${mataPelajaran}` : 'materi ajar'}, mampu menganalisis konsep secara mandiri serta memiliki nalar kritis yang tinggi.`,
      deskripsiSingkat: 'Sangat Baik - Menguasai seluruh TP dengan istimewa',
      isTuntas: true,
    };
  }

  if (rounded >= 80) {
    return {
      predikat: 'B',
      predikatLabel: 'Baik',
      deskripsi: `Ananda ${nama} menunjukkan penguasaan yang baik dan konsisten dalam mencapai tujuan pembelajaran ${mataPelajaran ? `mata pelajaran ${mataPelajaran}` : ''}, mampu menyelesaikan penugasan praktik maupun teori dengan cermat dan tepat.`,
      deskripsiSingkat: 'Baik - Memenuhi capaian TP dengan konsisten',
      isTuntas: true,
    };
  }

  if (rounded >= kkm) {
    return {
      predikat: 'C',
      predikatLabel: 'Cukup',
      deskripsi: `Ananda ${nama} menunjukkan penguasaan yang cukup dalam mencapai tujuan pembelajaran, telah memenuhi Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) dan disarankan terus meningkatkan keaktifan belajar.`,
      deskripsiSingkat: 'Cukup - Memenuhi kriteria ketercapaian KKTP',
      isTuntas: true,
    };
  }

  return {
    predikat: 'D',
    predikatLabel: 'Perlu Bimbingan',
    deskripsi: `Ananda ${nama} memerlukan bimbingan, pendampingan, serta remedial lebih lanjut dalam memahami materi dan menuntaskan capaian pembelajaran secara optimal.`,
    deskripsiSingkat: 'Perlu Bimbingan & Pendampingan Remedial TP',
    isTuntas: false,
  };
}

export interface ComputedScoreResult {
  finalScore: number;
  sumInputted: number;
  countInputted: number;
  formatifAvg: number;
  predicate: 'A' | 'B' | 'C' | 'D';
  predicateLabel: string;
  merdekaDeskripsi: string;
  merdekaDeskripsiSingkat: string;
  isPassed: boolean;
  hasAnyScore: boolean;
}

export function calculateGradeMetrics(
  grade?: Partial<StudentGrade> | null,
  studentName = 'Murid',
  kkm = 75
): ComputedScoreResult {
  if (!grade) {
    const defaultAssess = getKurikulumMerdekaAssessment(0, studentName, kkm);
    return {
      finalScore: 0,
      sumInputted: 0,
      countInputted: 0,
      formatifAvg: 0,
      predicate: defaultAssess.predikat,
      predicateLabel: defaultAssess.predikatLabel,
      merdekaDeskripsi: '',
      merdekaDeskripsiSingkat: '',
      isPassed: false,
      hasAnyScore: false,
    };
  }

  const formatifKeys: (keyof StudentGrade)[] = [
    'formatif1',
    'formatif2',
    'formatif3',
    'formatif4',
    'formatif5',
    'formatif6',
    'formatif7',
    'formatif8',
    'formatif9',
    'formatif10',
  ];

  const formatifValues: number[] = [];
  formatifKeys.forEach((k) => {
    const val = grade[k];
    if (val !== null && val !== undefined && (val as unknown) !== '' && !isNaN(Number(val))) {
      formatifValues.push(Number(val));
    }
  });

  const stsVal =
    grade.sumatifTengah !== null &&
    grade.sumatifTengah !== undefined &&
    (grade.sumatifTengah as unknown) !== '' &&
    !isNaN(Number(grade.sumatifTengah))
      ? Number(grade.sumatifTengah)
      : null;

  const sasVal =
    grade.sumatifAkhir !== null &&
    grade.sumatifAkhir !== undefined &&
    (grade.sumatifAkhir as unknown) !== '' &&
    !isNaN(Number(grade.sumatifAkhir))
      ? Number(grade.sumatifAkhir)
      : null;

  let sumInputted = 0;
  let countInputted = 0;

  formatifValues.forEach((v) => {
    sumInputted += v;
    countInputted++;
  });

  if (stsVal !== null) {
    sumInputted += stsVal;
    countInputted++;
  }
  if (sasVal !== null) {
    sumInputted += sasVal;
    countInputted++;
  }

  const hasAnyScore = countInputted > 0;
  const formatifAvg =
    formatifValues.length > 0
      ? Math.round(formatifValues.reduce((a, b) => a + b, 0) / formatifValues.length)
      : 0;

  let finalScore = 0;
  if (hasAnyScore) {
    if (formatifValues.length > 0 && stsVal !== null && sasVal !== null) {
      // 50% Formatif + 25% STS + 25% SAS
      finalScore = Math.round(formatifAvg * 0.5 + stsVal * 0.25 + sasVal * 0.25);
    } else {
      finalScore = Math.round(sumInputted / countInputted);
    }
  }

  const assessment = getKurikulumMerdekaAssessment(
    hasAnyScore ? finalScore : 0,
    studentName,
    kkm
  );

  return {
    finalScore,
    sumInputted,
    countInputted,
    formatifAvg,
    predicate: assessment.predikat,
    predicateLabel: assessment.predikatLabel,
    merdekaDeskripsi: assessment.deskripsi,
    merdekaDeskripsiSingkat: assessment.deskripsiSingkat,
    isPassed: hasAnyScore && finalScore >= kkm,
    hasAnyScore,
  };
}
