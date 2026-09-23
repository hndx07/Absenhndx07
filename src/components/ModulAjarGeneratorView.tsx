import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Download,
  BookOpen,
  FileText,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';
import { ClassRoom, TeacherProfile, ModuleAjarForm } from '../types';
import { exportToWordDocument } from '../utils/exportUtils';

interface ModulAjarGeneratorViewProps {
  currentClass: ClassRoom;
  teacher: TeacherProfile;
}

export const ModulAjarGeneratorView: React.FC<ModulAjarGeneratorViewProps> = ({
  currentClass,
  teacher,
}) => {
  const [form, setForm] = useState<ModuleAjarForm>({
    fase: 'E (Kelas X)',
    mataPelajaran: currentClass.mataPelajaran,
    kelas: currentClass.namaKelas,
    topik: 'Dasar-dasar Jaringan Komputer, Topologi & Pengkabelan UTP',
    alokasiWaktu: '4 x 45 Menit (1 Pertemuan)',
    pendekatan: 'Deep Learning (Mindful, Meaningful, Joyful Learning)',
    metode: 'Project Based Learning (PjBL) terintegrasi Teaching Factory',
    capaianPembelajaran:
      'Peserta didik mampu memahami prinsip dasar jaringan komputer, topologi jaringan, pengkabelan, serta menerapkan prosedur K3LH pada bengkel/lab TKJ.',
    alurTujuanPembelajaran:
      '1. Mengidentifikasi macam-macam topologi jaringan.\n2. Melakukan proses crimping kabel UTP straight & cross sesuai standar TIA/EIA-568B.\n3. Melakukan pengujian konektivitas fisik menggunakan LAN Cable Tester.',
    tujuanPembelajaran:
      'Setelah mengikuti pembelajaran berbasis PjBL, peserta didik dapat membuat kabel jaringan straight-through dengan kerapian dan fungsionalitas 100% serta menaati SOP keselamatan kerja.',
    sintaksPembelajaran:
      '1. Penentuan Pertanyaan Mendasar: Menonton simulasi kegagalan transmisi data kabel buruk.\n2. Mendesain Perencanaan Proyek: Membagi peran teknisi & quality control.\n3. Menyusun Jadwal: Estimasi waktu crimping 25 menit.\n4. Monitoring Progres: Guru membimbing penataan pin warna kabel.\n5. Menguji Hasil: Uji nyala 8 pin LED pada LAN Tester.\n6. Evaluasi Pengalaman: Refleksi kendala dan keberhasilan.',
    integrasiHardSoftSkill:
      'Hard Skill: Pengupasan kabel, crimping RJ45, pengoperasian tester.\nSoft Skill: Komunikasi tim, ketelitian, ketahanan menghadapi kendala (resilience), dan kerapian kerja.',
    integrasiK3BudayaKerja:
      'Penerapan 5R (Ringkas, Rapi, Resik, Rawat, Rajin) di meja kerja lab, pemakaian alat pemotong sesuai SOP, pencegahan cedera tangan, dan pembuangan sisa kupasan kabel pada tempatnya.',
    karakterKemuhammadiyahan:
      'Menanamkan nilai Al-Islam dan Kemuhammadiyahan: Shiddiq (jujur dalam uji coba), Amanah (menjaga alat lab milik persyarikatan), Fathonah (cerdas menyelesaikan masalah), Tabligh (berbagi ilmu ke sesama kawan). Menghayati Janji Pelajar Muhammadiyah.',
    tujuhKebiasaanAnakHebat:
      '1. Bangun pagi & tertib ibadah\n2. Berbakti kepada orang tua dan guru\n3. Gemar berinfak dan peduli sesama\n4. Menjaga kebersihan & lingkungan lab\n5. Gemar membaca & literasi teknologi\n6. Tangguh & pantang menyerah\n7. Berakhlak mulia di dunia nyata & maya',
    strukturLkpd:
      'LKPD Praktik: Judul, Alat dan Bahan, Prosedur Keselamatan Kerja, Langkah Percobaan, Tabel Pengujian 8 Pin Kabel, Analisis Kendala & Solusi, Rubrik Penilaian Diri.',
  });

  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleGeneratePrompt = () => {
    const promptText = `
### PROMPT REKAYASA MODUL AJAR & LKPD KURIKULUM MERDEKA
**Satuan Pendidikan:** SMK Muhammadiyah Bawang, Kab. Batang, Jawa Tengah
**Guru Penyusun:** ${teacher.namaGuru} (NBM/NIP: ${teacher.nbm || teacher.nip})
**Mata Pelajaran:** ${form.mataPelajaran}
**Fase / Kelas:** ${form.fase} / ${form.kelas}
**Topik Pembelajaran:** ${form.topik}
**Alokasi Waktu:** ${form.alokasiWaktu}

---
Anda adalah pakar kurikulum vokasi SMK dan konsultan pendidikan Kurikulum Merdeka. Buatkan dokumen lengkap **MODUL AJAR DAN LKPD (LEMBAR KERJA PESERTA DIDIK)** yang siap cetak dengan ketentuan berikut:

1. **IDENTITAS & INFORMASI UMUM**
   - Nama Guru: ${teacher.namaGuru}
   - Sekolah: SMK Muhammadiyah Bawang
   - Fase / Tingkat: ${form.fase}
   - Model Pembelajaran: ${form.metode}
   - Pendekatan: ${form.pendekatan}
   - Profil Pelajar Pancasila & Karakter Kemuhammadiyahan: ${form.karakterKemuhammadiyahan}

2. **KOMPONEN INTI**
   - **Capaian Pembelajaran (CP):** ${form.capaianPembelajaran}
   - **Alur Tujuan Pembelajaran (ATP):** ${form.alurTujuanPembelajaran}
   - **Tujuan Pembelajaran (TP):** ${form.tujuanPembelajaran}
   - **Pemahaman Bermakna & Pertanyaan Pemantik:** Buat pertanyaan pemantik yang merangsang daya nalar kritis siswa vokasi.

3. **LANGKAH-LANGKAH PEMBELAJARAN (SINTAKS OPERASIONAL)**
   ${form.sintaksPembelajaran}
   - Rincikan kegiatan: Pendahuluan (15 menit), Inti (${form.metode}) (150 menit), Penutup & Refleksi (15 menit).

4. **INTEGRASI BUDAYA KERJA & NILAI KEKHASAN**
   - **Hard Skill & Soft Skill:** ${form.integrasiHardSoftSkill}
   - **K3LH & 5R Industri:** ${form.integrasiK3BudayaKerja}
   - **7 Kebiasaan Anak Indonesia Hebat:** ${form.tujuhKebiasaanAnakHebat}

5. **LEMBAR KERJA PESERTA DIDIK (LKPD) OPERASIONAL**
   - Struktur LKPD: ${form.strukturLkpd}
   - Sediakan tabel pengamatan data riil dan rubrik penskoran asesmen formatif (Aspek Sikap, Keterampilan Praktik, dan Pengetahuan).

Hasilkan dokumen ini dengan format markdown yang sangat rapi, profesional, dan berstandar administrasi SMK Pusat Keunggulan.
    `.trim();

    setGeneratedPrompt(promptText);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPromptDoc = () => {
    const htmlContent = `
      <h2>PROMPT MODUL AJAR KURIKULUM MERDEKA</h2>
      <p><strong>Topik:</strong> ${form.topik} | <strong>Fase/Kelas:</strong> ${form.fase} (${form.kelas})</p>
      <pre style="white-space: pre-wrap; background:#f8fafc; padding:15px; border:1px solid #e2e8f0; font-family:monospace; font-size:10pt;">
${generatedPrompt}
      </pre>
    `;
    exportToWordDocument(`Prompt_Modul_Ajar_${form.topik.slice(0, 20)}`, htmlContent);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
              Kurikulum Merdeka 2026
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600">SMK Muhammadiyah Bawang</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Generator Prompt Modul Ajar & LKPD
          </h2>
          <p className="text-xs text-slate-500">
            Penyusun prompt AI otomatis berstandar Deep Learning, PjBL/PBL, K3 5R Industri & Karakter Kemuhammadiyahan
          </p>
        </div>

        <button
          onClick={handleGeneratePrompt}
          className="px-5 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/25 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Generate Prompt Modul Ajar
        </button>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            1. Identitas & Rancangan Pembelajaran
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Fase</label>
              <select
                value={form.fase}
                onChange={(e) => setForm({ ...form, fase: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
              >
                <option value="E (Kelas X)">Fase E (Kelas X SMK)</option>
                <option value="F (Kelas XI)">Fase F (Kelas XI SMK)</option>
                <option value="F (Kelas XII)">Fase F (Kelas XII SMK)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Alokasi Waktu</label>
              <input
                type="text"
                value={form.alokasiWaktu}
                onChange={(e) => setForm({ ...form, alokasiWaktu: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Topik / Materi Pokok</label>
            <input
              type="text"
              value={form.topik}
              onChange={(e) => setForm({ ...form, topik: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Pendekatan</label>
              <input
                type="text"
                value={form.pendekatan}
                onChange={(e) => setForm({ ...form, pendekatan: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Model Pembelajaran</label>
              <input
                type="text"
                value={form.metode}
                onChange={(e) => setForm({ ...form, metode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Capaian Pembelajaran (CP)</label>
            <textarea
              rows={2}
              value={form.capaianPembelajaran}
              onChange={(e) => setForm({ ...form, capaianPembelajaran: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tujuan Pembelajaran (TP)</label>
            <textarea
              rows={2}
              value={form.tujuanPembelajaran}
              onChange={(e) => setForm({ ...form, tujuanPembelajaran: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs leading-relaxed"
            />
          </div>
        </div>

        {/* Column 2: Specifics & Values */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-purple-600" />
            2. Budaya Kerja, K3, Kemuhammadiyahan & 7 Kebiasaan
          </h3>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">K3LH & Budaya Kerja 5R Industri</label>
            <textarea
              rows={2}
              value={form.integrasiK3BudayaKerja}
              onChange={(e) => setForm({ ...form, integrasiK3BudayaKerja: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Karakter Kemuhammadiyahan & Al-Islam</label>
            <textarea
              rows={2}
              value={form.karakterKemuhammadiyahan}
              onChange={(e) => setForm({ ...form, karakterKemuhammadiyahan: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">7 Kebiasaan Anak Indonesia Hebat</label>
            <textarea
              rows={2}
              value={form.tujuhKebiasaanAnakHebat}
              onChange={(e) => setForm({ ...form, tujuhKebiasaanAnakHebat: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Desain LKPD Praktik Siswa</label>
            <textarea
              rows={2}
              value={form.strukturLkpd}
              onChange={(e) => setForm({ ...form, strukturLkpd: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Generated Output Box */}
      {generatedPrompt && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-base text-white">
                Prompt Siap Pakai untuk AI (Gemini / ChatGPT / Claude)
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Tersalin ke Clipboard!' : 'Salin Prompt Lengkap'}
              </button>
              <button
                onClick={downloadPromptDoc}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
              >
                <Download className="w-4 h-4" />
                Unduh Word
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-2xl bg-slate-950/80 text-indigo-200 text-xs font-mono max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800/80">
            {generatedPrompt}
          </pre>
        </div>
      )}
    </div>
  );
};
