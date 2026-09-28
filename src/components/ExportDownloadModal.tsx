import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Table,
  FileCode,
  Sparkles,
} from 'lucide-react';

export interface ExportDownloadPayload {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileType: 'excel' | 'pdf' | 'template' | 'word' | 'csv';
  fileSizeStr?: string;
  blob?: Blob;
  blobUrl?: string;
  dataUri?: string;
  csvContent?: string;
  tsvClipboardContent?: string;
  previewHeaders?: string[];
  previewRows?: (string | number)[][];
  totalRows?: number;
}

export function triggerSafeDownload(
  source: Blob | string,
  fileName: string,
  mimeType = 'application/octet-stream'
): boolean {
  try {
    let url = '';
    let shouldRevoke = false;

    if (typeof source === 'string') {
      url = source;
    } else if (source instanceof Blob) {
      url = URL.createObjectURL(source);
      shouldRevoke = true;
    } else {
      return false;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      try {
        document.body.removeChild(a);
        if (shouldRevoke) {
          // Keep object URL active for 2 minutes so manual clicks / re-downloads succeed
          setTimeout(() => URL.revokeObjectURL(url), 120000);
        }
      } catch {
        // ignore cleanup errors
      }
    }, 250);

    return true;
  } catch (err) {
    console.warn('triggerSafeDownload error:', err);
    return false;
  }
}

export const ExportDownloadModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<ExportDownloadPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState(false);
  const [activeTab, setActiveTab] = useState<'download' | 'preview'>('download');

  useEffect(() => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ExportDownloadPayload>;
      if (customEvent.detail) {
        setData(customEvent.detail);
        setIsOpen(true);
        setCopied(false);
        setDownloadSuccessNotice(false);
        setActiveTab('download');
      }
    };

    window.addEventListener('app:show-export-download', handleEvent);
    return () => {
      window.removeEventListener('app:show-export-download', handleEvent);
    };
  }, []);

  if (!isOpen || !data) return null;

  const handleManualDownload = () => {
    const source = data.blob || data.dataUri;
    if (source) {
      triggerSafeDownload(source, data.fileName);
      setDownloadSuccessNotice(true);
      setTimeout(() => setDownloadSuccessNotice(false), 4000);
    }
  };

  const handleDownloadCsv = () => {
    if (!data.csvContent) return;
    const blob = new Blob([data.csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvFileName = data.fileName.replace(/\.xlsx$/i, '') + '.csv';
    triggerSafeDownload(blob, csvFileName, 'text/csv');
    setDownloadSuccessNotice(true);
    setTimeout(() => setDownloadSuccessNotice(false), 4000);
  };

  const handleCopyClipboard = async () => {
    const content = data.tsvClipboardContent || data.csvContent;
    if (!content) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error('Copy to clipboard failed:', e);
    }
  };

  const handlePrintDocument = () => {
    if (data.fileType === 'pdf') {
      window.print();
    }
  };

  const isExcelOrTemplate = data.fileType === 'excel' || data.fileType === 'template';
  const isPdf = data.fileType === 'pdf';
  const directHref = data.dataUri || data.blobUrl || '#';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-850 dark:to-indigo-950/20">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
                isExcelOrTemplate
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                  : isPdf
                  ? 'bg-rose-500 text-white shadow-rose-500/20'
                  : 'bg-indigo-600 text-white shadow-indigo-600/20'
              }`}
            >
              {isExcelOrTemplate ? (
                <FileSpreadsheet className="w-6 h-6" />
              ) : isPdf ? (
                <FileText className="w-6 h-6" />
              ) : (
                <Download className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    isExcelOrTemplate
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                      : isPdf
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                      : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300'
                  }`}
                >
                  {data.fileType === 'template'
                    ? 'Template Excel'
                    : isExcelOrTemplate
                    ? 'Berkas Excel'
                    : isPdf
                    ? 'Dokumen PDF'
                    : 'Berkas Unduhan'}
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Berhasil Digenerate
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 leading-snug">
                {data.title || 'Unduh Berkas'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {data.description || 'Berkas Anda siap diunduh atau disalin ke aplikasi pengolah data.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (if preview available) */}
        {data.previewHeaders && data.previewHeaders.length > 0 && (
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-850/50 text-xs font-bold">
            <button
              onClick={() => setActiveTab('download')}
              className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'download'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Download className="w-4 h-4" />
              Opsi Unduhan Langsung
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'preview'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Table className="w-4 h-4" />
              Pratinjau Data ({data.totalRows || data.previewRows?.length || 0} Baris)
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {downloadSuccessNotice && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-200">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Perintah unduhan telah dikirim ke browser Anda! Silakan periksa folder Download.</span>
            </div>
          )}

          {activeTab === 'download' ? (
            <>
              {/* File Info Box */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="overflow-hidden">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Nama Berkas
                  </p>
                  <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {data.fileName}
                  </p>
                  {data.fileSizeStr && (
                    <p className="text-[11px] text-slate-400 mt-0.5">Perkiraan ukuran: {data.fileSizeStr}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Direct Native Anchor Tag */}
                  <a
                    href={directHref}
                    download={data.fileName}
                    onClick={handleManualDownload}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer ${
                      isExcelOrTemplate
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                        : isPdf
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    Unduh Sekarang
                  </a>
                </div>
              </div>

              {/* Multi-Strategy Download / Fallback Methods */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Opsi Alternatif Akses & Ekspor Data:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Copy to Clipboard (for Excel & Templates) */}
                  {isExcelOrTemplate && (data.tsvClipboardContent || data.csvContent) && (
                    <button
                      type="button"
                      onClick={handleCopyClipboard}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-900 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition text-left flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          {copied ? 'Tersalin ke Clipboard!' : 'Salin Data Tabel'}
                          {copied && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-bold">
                              Siap Tempel
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Bisa langsung di-paste (Ctrl+V) ke Excel atau Google Spreadsheet.
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Download as CSV */}
                  {isExcelOrTemplate && data.csvContent && (
                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-slate-900 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition text-left flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Unduh Format CSV (.csv)
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Format teks standar yang kompatibel dengan semua spreadsheet.
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Open in New Tab */}
                  {(data.blobUrl || data.dataUri) && (
                    <a
                      href={directHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 bg-white dark:bg-slate-900 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition text-left flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Buka di Tab Baru
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Tampilkan pratinjau dokumen langsung di peramban web.
                        </p>
                      </div>
                    </a>
                  )}

                  {/* Print Document (for PDF) */}
                  {isPdf && (
                    <button
                      type="button"
                      onClick={handlePrintDocument}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-slate-900 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition text-left flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Cetak Dokumen
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Buka dialog cetak browser atau simpan langsung sebagai PDF.
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Informative Help Box */}
              <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">💡 Petunjuk:</span>
                <span className="text-[11.5px] leading-relaxed">
                  Bila browser Anda memblokir unduhan otomatis karena setelan keamanan atau mode penjelajahan khusus, gunakan tombol{' '}
                  <strong>Unduh Sekarang</strong> atau klik <strong>Salin Data Tabel</strong> lalu langsung tempelkan di Excel dengan tombol <code>Ctrl + V</code>.
                </span>
              </div>
            </>
          ) : (
            /* Table Data Preview Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  Pratinjau Format &amp; Data:
                </p>
                <span className="text-slate-400">
                  Menampilkan contoh baris awal
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                      {data.previewHeaders?.map((h, i) => (
                        <th key={i} className="py-2.5 px-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.previewRows && data.previewRows.length > 0 ? (
                      data.previewRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                              {String(cell !== undefined && cell !== null ? cell : '')}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={data.previewHeaders?.length || 1} className="py-6 text-center text-slate-400">
                          Tidak ada baris data untuk ditampilkan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Aplikasi Guru SMK Muhammadiyah Bawang &bull; Sistem Terverifikasi
          </p>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
