import React from 'react';
import { Share2, Check, Copy, ExternalLink } from 'lucide-react';

interface AgendaShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareLink: string;
  shareQrUrl: string;
  copiedLink: boolean;
  copyShareLink: () => void;
}

export const AgendaShareModal: React.FC<AgendaShareModalProps> = ({
  isOpen,
  onClose,
  shareLink,
  shareQrUrl,
  copiedLink,
  copyShareLink,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
          <Share2 className="w-6 h-6" />
        </div>

        <div>
          <h3 className="font-bold text-slate-900 text-lg">Bagikan Agenda Mengajar</h3>
          <p className="text-xs text-slate-500 mt-1">
            Tautan publik aman dilindungi token unik. Pihak sekolah, kepala sekolah, atau pengawas dapat memeriksa agenda kegiatan belajar mengajar secara langsung.
          </p>
        </div>

        {shareQrUrl && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
            <img src={shareQrUrl} alt="QR Code Share" className="w-48 h-48 mx-auto" />
            <p className="text-[10px] text-slate-400 mt-1">Scan QR Code dengan kamera smartphone</p>
          </div>
        )}

        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 text-left">
          <input
            type="text"
            readOnly
            value={shareLink}
            className="w-full bg-transparent text-xs font-mono text-slate-700 px-2 focus:outline-none"
          />
          <button
            onClick={copyShareLink}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Tersalin' : 'Salin'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2">
          <div className="flex items-center gap-2">
            <a
              href={shareLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs text-indigo-700 font-bold flex items-center gap-1 transition"
              title="Buka Halaman Preview Publik di Tab Baru"
            >
              Tab Baru <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => {
                window.location.href = shareLink;
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs text-emerald-700 font-bold flex items-center gap-1 transition cursor-pointer"
              title="Buka Preview Publik Langsung di Halaman Ini"
            >
              Buka Langsung
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
