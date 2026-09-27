export type GradePredicate = 'A' | 'B' | 'C' | 'D' | '-';

export interface KurikulumMerdekaResult {
  predikat: GradePredicate;
  predikatLabel: string;
  isTuntas: boolean;
  deskripsi: string;
  deskripsiSingkat: string;
}

/**
 * Menghasilkan Predikat (A, B, C, D) dan Deskripsi Capaian Kompetensi
 * Otomatis sesuai standar Asesmen & Rapor Kurikulum Merdeka (Kemendikbudristek).
 *
 * Rentang Skala Kurikulum Merdeka:
 * - A (90 - 100): Sangat Baik / Mahir
 * - B (80 - 89): Baik / Cakap
 * - C (KKTP - 79): Cukup / Layak (Mencapai Kriteria Ketercapaian Tujuan Pembelajaran)
 * - D (< KKTP): Perlu Bimbingan / Baru Berkembang
 */
export function getKurikulumMerdekaAssessment(
  score: number | null | undefined,
  kkmOrKktp: number = 75,
  subjectName?: string,
  studentName?: string
): KurikulumMerdekaResult {
  if (score === null || score === undefined || isNaN(score)) {
    return {
      predikat: '-',
      predikatLabel: 'Belum Ada Nilai',
      isTuntas: false,
      deskripsi: 'Belum ada data nilai asesmen yang diinputkan.',
      deskripsiSingkat: 'Belum ada nilai',
    };
  }

  const kktp = Number(kkmOrKktp) || 75;
  const mapel = subjectName ? `mata pelajaran ${subjectName}` : 'tujuan pembelajaran';
  const name = studentName ? `${studentName} ` : '';

  if (score >= 90) {
    return {
      predikat: 'A',
      predikatLabel: 'Sangat Baik (Mahir)',
      isTuntas: true,
      deskripsi: `${name}menunjukkan penguasaan yang sangat baik dalam seluruh tujuan pembelajaran serta capaian kompetensi ${mapel}. Mampu menganalisis persoalan secara mandiri, bernalar kritis, dan kreatif.`,
      deskripsiSingkat: 'Sangat baik dalam penguasaan seluruh capaian kompetensi',
    };
  }

  if (score >= 80) {
    return {
      predikat: 'B',
      predikatLabel: 'Baik (Cakap)',
      isTuntas: true,
      deskripsi: `${name}menunjukkan penguasaan yang baik dalam mencapai tujuan pembelajaran ${mapel}. Mampu menyelesaikan asesmen dan penugasan materi dengan pemahaman konsep yang solid.`,
      deskripsiSingkat: 'Baik dalam mencapai tujuan pembelajaran materi',
    };
  }

  if (score >= kktp) {
    return {
      predikat: 'C',
      predikatLabel: 'Cukup (Mencapai KKTP)',
      isTuntas: true,
      deskripsi: `${name}menunjukkan penguasaan yang cukup dalam mencapai Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) ${mapel}. Perlu sedikit latihan penguatan dan pendalaman pada beberapa materi tertentu agar lebih optimal.`,
      deskripsiSingkat: 'Cukup dan telah mencapai kriteria ketuntasan (KKTP)',
    };
  }

  return {
    predikat: 'D',
    predikatLabel: 'Perlu Bimbingan',
    isTuntas: false,
    deskripsi: `${name}perlu bimbingan dan pendampingan intensif dari guru serta orang tua dalam memahami konsep dasar materi serta mencapai Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) ${mapel}.`,
    deskripsiSingkat: 'Perlu bimbingan intensif dan remedial kompetensi',
  };
}
