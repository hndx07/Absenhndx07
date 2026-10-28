import React from 'react';
import {
  X,
  Settings,
  LogOut,
  RefreshCw,
  Download,
} from 'lucide-react';
import { ClassRoom, TeacherProfile } from '../../types';
import { SCHOOL_CONFIG } from '../../config/schoolConfig';
import { NavTab, NAV_ITEMS } from './types';

interface AppSidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeClass: ClassRoom;
  onOpenClassModal: () => void;
  teacher: TeacherProfile;
  onOpenProfile: () => void;
  onLogout: () => void;
  onManualRefresh: () => void;
  onDownloadBackup: () => void;
  isRefreshing?: boolean;
  // If provided, renders drawer close button and dismiss on navigation
  isDrawer?: boolean;
  onCloseDrawer?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  activeClass,
  onOpenClassModal,
  teacher,
  onOpenProfile,
  onLogout,
  onManualRefresh,
  onDownloadBackup,
  isRefreshing = false,
  isDrawer = false,
  onCloseDrawer,
}) => {
  const handleTabClick = (tabId: NavTab) => {
    onSelectTab(tabId);
    if (isDrawer && onCloseDrawer) {
      onCloseDrawer();
    }
  };

  return (
    <div className={`flex flex-col h-full ${isDrawer ? 'w-80 max-w-[85vw] bg-white text-slate-900 shadow-2xl border-r border-slate-200' : 'w-72 bg-white text-slate-900 shadow-sm border border-slate-200/80 rounded-3xl sticky top-24 my-6 overflow-hidden max-h-[calc(100vh-7.5rem)] no-print'}`}>
      {/* Drawer Header (only on mobile drawer) */}
      {isDrawer && (
        <div className="p-4 sm:p-5 border-b border-[#008276]/30 flex items-center justify-between gap-3 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white">
          <div className="flex items-center gap-3 truncate">
            <img
              src={SCHOOL_CONFIG.logoUrl}
              alt="Logo SMK Muhammadiyah Bawang"
              className="w-10 h-10 object-contain drop-shadow-sm rounded-xl p-0.5 bg-white border border-white/30 shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = SCHOOL_CONFIG.logoFallback;
              }}
            />
            <div className="truncate">
              <p className="font-extrabold text-sm text-white truncate">
                SMK Muhammadiyah Bawang
              </p>
              <p className="text-[11px] text-emerald-100 truncate">
                Sistem Pendidik & Presensi
              </p>
            </div>
          </div>
          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Class Info Box */}
      <div className="p-4 bg-emerald-50/60 border-b border-emerald-100">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
              Kelas Aktif
            </span>
            <p className="font-extrabold text-sm text-slate-900 truncate">
              {activeClass.namaKelas}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {activeClass.jurusan}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isDrawer && onCloseDrawer) onCloseDrawer();
              onOpenClassModal();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#009B62] text-white text-[11px] font-bold hover:bg-[#008276] transition shrink-0 cursor-pointer"
          >
            Ganti
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item.id)}
              className={`w-full text-left p-3 rounded-2xl transition flex items-start gap-3 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white shadow-md font-bold'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                  {item.label}
                </p>
                <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}

        {/* Cloud Status Box, Refresh & Backup */}
        <div className="pt-2 border-t border-slate-100 my-2 space-y-2">
          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-900">Cloud Supabase Aktif</p>
                <p className="text-[10px] text-emerald-700/80">PostgreSQL & RLS</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800">
              Aktif
            </span>
          </div>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={onManualRefresh}
            className="w-full p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 shadow-2xs"
            title="Muat ulang seluruh data langsung dari database Cloud Supabase"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-700 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Memperbarui...' : 'Refresh Data Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isDrawer && onCloseDrawer) onCloseDrawer();
              onDownloadBackup();
            }}
            className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            title="Download File Backup JSON Seluruh Data"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Download Backup (JSON)</span>
          </button>
        </div>
      </div>

      {/* Drawer Footer: Profil Pendidik & Logout */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/80 space-y-2">
        <button
          type="button"
          onClick={() => {
            if (isDrawer && onCloseDrawer) onCloseDrawer();
            onOpenProfile();
          }}
          className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white hover:bg-slate-100 text-left transition border border-slate-200/80 cursor-pointer shadow-2xs"
          title="Buka Pengaturan Profil Pendidik"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#009B62] to-[#292E82] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {teacher.namaGuru?.charAt(0) || 'G'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">
                {teacher.namaGuru}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {teacher.email}
              </p>
            </div>
          </div>
          <Settings className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (isDrawer && onCloseDrawer) onCloseDrawer();
            onLogout();
          }}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer shadow-2xs"
          title="Keluar dari Akun (Log Out)"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>Log Out Akun</span>
        </button>
      </div>
    </div>
  );
};
