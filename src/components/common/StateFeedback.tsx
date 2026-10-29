import React from 'react';
import { AlertCircle, RefreshCw, FolderSearch } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderSearch,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`p-8 sm:p-12 text-center rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center max-w-xl mx-auto my-6 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3.5 shadow-2xs">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          {action.icon && <action.icon className="w-3.5 h-3.5" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
};

export interface TableEmptyRowProps {
  colSpan: number;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}

export const TableEmptyRow: React.FC<TableEmptyRowProps> = ({
  colSpan,
  icon: Icon = FolderSearch,
  title,
  description,
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 px-4 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-700">{title}</p>
          {description && (
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">{description}</p>
          )}
        </div>
      </td>
    </tr>
  );
};

export interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'Gagal Memuat Data',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in ${className}`}
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-slate-600 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Coba Lagi</span>
        </button>
      )}
    </div>
  );
};
