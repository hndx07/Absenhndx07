import React from 'react';
import { Share2, ExternalLink, Eye } from 'lucide-react';

interface GradesShareModalProps {
  isOpen: boolean;
  shareQrUrl: string;
  shareLink: string;
  copiedLink: boolean;
  onCopyLink: () => void;
  onClose: () => void;
}

export const GradesShareModal: React.FC<GradesShareModalProps> = ({
  isOpen,
  shareQrUrl,
  shareLink,
  copiedLink,
  onCopyLink,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-[1.5px] animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
          <Share2 className="w-6 h-6" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-full border border-purple-200 mb-2">
            <span>🔒 Mode Publik (Read-Only Terisolasi)</span>
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Tautan Publik Nilai Aktif</h3>
          <p className="text-xs text-slate-500 mt-1">
            Murid dan orang tua dapat membuka tautan ini tanpa login untuk melihat transparansi buku nilai secara aman dan read-only.
          </p>
        </div>

        {shareQrUrl && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
            <img src={shareQrUrl} alt="QR Code Link Publik" className="w-48 h-48 mx-auto" />
          </div>
        )}

        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl text-xs">
          <input
            type="text"
            readOnly
            value={shareLink}
            className="bg-transparent flex-1 font-mono text-slate-700 truncate px-2 outline-none"
          />
          <button
            type="button"
            onClick={onCopyLink}
            className="px-3 py-1.5 bg-white rounded-xl shadow-xs text-indigo-600 font-bold hover:bg-indigo-50 transition shrink-0 cursor-pointer"
          >
            {copiedLink ? 'Tersalin!' : 'Salin'}
          </button>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <a
            href={shareLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Buka Halaman Preview Publik (Tab Baru)
          </a>

          <button
            type="button"
            onClick={() => {
              window.location.href = shareLink;
            }}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-purple-600/20 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Buka Preview Langsung di Halaman Ini
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-2xl cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
