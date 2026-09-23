import React, { useState } from 'react';
import {
  FileCheck2,
  Plus,
  Trash2,
  FileText,
  Layers,
  HelpCircle,
  Download,
  Printer,
} from 'lucide-react';
import { ClassRoom, TeacherProfile, KisiKisiItem, KartuSoalItem } from '../types';
import { exportToWordDocument } from '../utils/exportUtils';

interface KisiKisiViewProps {
  currentClass: ClassRoom;
  teacher: TeacherProfile;
}

const defaultKisiKisi: KisiKisiItem[] = [
  {
    id: 'kisi_1',
    no: 1,
    elemen: 'Perencanaan dan Pengalamatan Jaringan',
    capaianPembelajaran: 'Menerapkan pengalamatan IP Address pada jaringan komputer lokal',
    tujuanPembelajaran: 'Menghitung pembagian subnet mask VLSM dengan tepat',
    materi: 'Subnetting IPv4 Class C',
    indikatorSoal: 'Disajikan studi kasus kebutuhan host jaringan bengkel otomotif, siswa dapat menentukan network ID dan broadcast ID yang tepat.',
    levelKognitif: 'C3',
    bentukSoal: 'Pilihan Ganda',
    nomorSoal: 1,
  },
  {
    id: 'kisi_2',
    no: 2,
    elemen: 'Pemasangan Perangkat Jaringan',
    capaianPembelajaran: 'Menginstalasi pengkabelan terstruktur sesuai standar industri',
    tujuanPembelajaran: 'Menjelaskan urutan standar EIA/TIA 568B',
    materi: 'Kabel UTP Straight Through',
    indikatorSoal: 'Peserta didik dapat menganalisis urutan pin ke-3 dan pin ke-6 pada kabel straight yang benar.',
    levelKognitif: 'C4',
    bentukSoal: 'Pilihan Ganda',
    nomorSoal: 2,
  },
  {
    id: 'kisi_3',
    no: 3,
    elemen: 'Keamanan Jaringan & Troubleshooting',
    capaianPembelajaran: 'Melakukan troubleshooting gangguan konektivitas jaringan',
    tujuanPembelajaran: 'Menganalisis kegagalan ping dan firewall',
    materi: 'Mikrotik Firewall Filter Rule',
    indikatorSoal: 'Disajikan topologi dan topologi ping request timed out, siswa merumuskan langkah perbaikan pada chain input router.',
    levelKognitif: 'C5',
    bentukSoal: 'Uraian',
    nomorSoal: 3,
  },
];

const defaultKartuSoal: KartuSoalItem[] = [
  {
    id: 'kartu_1',
    noSoal: 1,
    bentukSoal: 'Pilihan Ganda',
    kompetensi: 'Perencanaan dan Pengalamatan Jaringan',
    materi: 'Subnetting IPv4',
    indikator: 'Menentukan broadcast ID dari IP 192.168.10.65/26',
    butirSoal: 'Sebuah laboratorium komputer di SMK Muhammadiyah Bawang memiliki alokasi IP Address 192.168.10.65 dengan subnet mask 255.255.255.192 (/26). Berapakah alamat Broadcast ID dari subnet tersebut?\nA. 192.168.10.63\nB. 192.168.10.127\nC. 192.168.10.128\nD. 192.168.10.191\nE. 192.168.10.255',
    kunciJawaban: 'B. 192.168.10.127',
    pedomanPenskoran: 'Jawaban benar = Skor 1, Jawaban salah = Skor 0',
  },
  {
    id: 'kartu_2',
    noSoal: 2,
    bentukSoal: 'Uraian / Praktik',
    kompetensi: 'Troubleshooting Mikrotik',
    materi: 'Firewall & NAT Rule',
    indikator: 'Menganalisis client yang tidak dapat mengakses internet',
    butirSoal: 'Jelaskan secara runtut langkah diagnosa jika PC Client di laboratorium TKJ telah mendapatkan IP otomatis dari DHCP Router, namun tetap tidak bisa membuka website (DNS Failure)!',
    kunciJawaban: '1. Periksa ping ke gateway router.\n2. Cek konfigurasi IP DNS di IP -> DNS pada Mikrotik.\n3. Periksa NAT Masquerade pada IP -> Firewall -> NAT.\n4. Uji ping ke 8.8.8.8 kemudian ke google.com.',
    pedomanPenskoran: 'Skor maksimal 10: Runtut & benar = 10, Kurang lengkap = 6-8, Salah konsep = 2-4.',
  },
];

export const KisiKisiView: React.FC<KisiKisiViewProps> = ({ currentClass, teacher }) => {
  const [kisiList, setKisiList] = useState<KisiKisiItem[]>(defaultKisiKisi);
  const [kartuList, setKartuList] = useState<KartuSoalItem[]>(defaultKartuSoal);
  const [activeTab, setActiveTab] = useState<'kisi' | 'kartu'>('kisi');

  const handleExportWord = () => {
    let contentHtml = '';
    if (activeTab === 'kisi') {
      const rows = kisiList
        .map(
          (k) => `
        <tr>
          <td style="text-align:center;">${k.no}</td>
          <td>${k.elemen}</td>
          <td>${k.capaianPembelajaran}</td>
          <td>${k.materi}</td>
          <td>${k.indikatorSoal}</td>
          <td style="text-align:center;">${k.levelKognitif}</td>
          <td style="text-align:center;">${k.bentukSoal}</td>
          <td style="text-align:center;">${k.nomorSoal}</td>
        </tr>
      `
        )
        .join('');

      contentHtml = `
        <h3 style="text-align:center;">KISI-KISI PENYUSUNAN ASESMEN SUMATIF / FORMATIF</h3>
        <p style="text-align:center;">
          Mata Pelajaran: <strong>${currentClass.mataPelajaran}</strong> | Kelas: <strong>${currentClass.namaKelas}</strong><br>
          Guru Pengampu: <strong>${teacher.namaGuru}</strong> | Tahun Ajaran: ${teacher.tahunAjaran}
        </p>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Elemen CP</th>
              <th>Capaian Pembelajaran</th>
              <th>Materi Pokok</th>
              <th>Indikator Soal</th>
              <th>Level</th>
              <th>Bentuk</th>
              <th>No Soal</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
      exportToWordDocument(`Kisi_Kisi_${currentClass.namaKelas}`, contentHtml);
    } else {
      const cardsHtml = kartuList
        .map(
          (k) => `
        <div style="border: 1px solid #333; padding: 12px; margin-bottom: 15px;">
          <h4 style="margin:0 0 8px 0;">KARTU SOAL NOMOR: ${k.noSoal} (${k.bentukSoal})</h4>
          <p><strong>Kompetensi:</strong> ${k.kompetensi} | <strong>Materi:</strong> ${k.materi}</p>
          <p><strong>Indikator:</strong> ${k.indikator}</p>
          <div style="background:#f1f5f9; padding:10px; margin:8px 0; border:1px dashed #64748b;">
            <strong>Butir Soal:</strong><br>
            <pre style="white-space: pre-wrap; font-family:sans-serif; margin:0;">${k.butirSoal}</pre>
          </div>
          <p><strong>Kunci Jawaban:</strong> ${k.kunciJawaban}</p>
          <p><strong>Pedoman Penskoran:</strong> ${k.pedomanPenskoran}</p>
        </div>
      `
        )
        .join('');

      contentHtml = `
        <h3 style="text-align:center;">KARTU SOAL ASESMEN KURIKULUM MERDEKA</h3>
        <p style="text-align:center;">SMK MUHAMMADIYAH BAWANG - BATANG</p>
        ${cardsHtml}
      `;
      exportToWordDocument(`Kartu_Soal_${currentClass.namaKelas}`, contentHtml);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
              {currentClass.namaKelas}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600">Asesmen Pembelajaran</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Kisi-kisi & Kartu Soal Asesmen
          </h2>
          <p className="text-xs text-slate-500">
            Penyusunan instrumen tes sumatif & formatif berstandar HOTS (Level Kognitif C1–C6)
          </p>
        </div>

        <button
          onClick={handleExportWord}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-blue-600/20"
        >
          <Download className="w-4 h-4" />
          Unduh Dokumen Word (.doc)
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('kisi')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'kisi'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Kisi-kisi Soal ({kisiList.length})
        </button>
        <button
          onClick={() => setActiveTab('kartu')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'kartu'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Kartu Soal ({kartuList.length})
        </button>
      </div>

      {/* Tab 1: Kisi-kisi Table */}
      {activeTab === 'kisi' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4 min-w-[150px]">Elemen / CP</th>
                  <th className="py-3 px-4 min-w-[140px]">Materi Pokok</th>
                  <th className="py-3 px-4 min-w-[200px]">Indikator Soal</th>
                  <th className="py-3 px-3 text-center w-16">Level</th>
                  <th className="py-3 px-3 text-center w-24">Bentuk</th>
                  <th className="py-3 px-3 text-center w-16">No Soal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {kisiList.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                      {k.no}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{k.elemen}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{k.capaianPembelajaran}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-indigo-700">
                      {k.materi}
                    </td>
                    <td className="py-3 px-4 text-slate-700 leading-relaxed">
                      {k.indikatorSoal}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-mono font-bold rounded-lg border border-purple-200">
                        {k.levelKognitif}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 font-medium">
                      {k.bentukSoal}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                      {k.nomorSoal}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Kartu Soal Cards */}
      {activeTab === 'kartu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kartuList.map((k) => (
            <div
              key={k.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-lg text-xs font-bold font-mono">
                  Soal No. {k.noSoal}
                </span>
                <span className="text-xs text-slate-500 font-semibold">{k.bentukSoal}</span>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-medium">
                  <strong>Kompetensi:</strong> {k.kompetensi} &bull; <strong>Materi:</strong> {k.materi}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>Indikator:</strong> {k.indikator}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                {k.butirSoal}
              </div>

              <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                <p className="text-emerald-700 font-bold">
                  Kunci Jawaban: <span className="font-normal text-slate-800">{k.kunciJawaban}</span>
                </p>
                <p className="text-slate-500">
                  Pedoman Penskoran: {k.pedomanPenskoran}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
