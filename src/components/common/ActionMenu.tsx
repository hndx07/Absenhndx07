import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

export interface ActionMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  description?: string;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
}

interface ActionMenuProps {
  label: string;
  icon?: LucideIcon;
  items: ActionMenuItem[];
  align?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  title?: string;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  label,
  icon: Icon,
  items,
  align = 'right',
  variant = 'secondary',
  className = '',
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const getButtonStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20';
      case 'outline':
        return 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:border-slate-700';
      case 'ghost':
        return 'bg-transparent hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-300';
      case 'secondary':
      default:
        return 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80';
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={title}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`min-h-[42px] px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer select-none ${getButtonStyles()}`}
      >
        {Icon && <Icon className="w-4 h-4 shrink-0" />}
        <span>{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 min-w-[200px] w-max max-w-xs rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          role="menu"
        >
          {items.map((item) => {
            const ItemIcon = item.icon;
            const isDanger = item.variant === 'danger';
            const isSuccess = item.variant === 'success';

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick();
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDanger
                    ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-rose-400'
                    : isSuccess
                    ? 'text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:text-emerald-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {ItemIcon && (
                  <ItemIcon
                    className={`w-4 h-4 shrink-0 ${
                      isDanger
                        ? 'text-rose-500'
                        : isSuccess
                        ? 'text-emerald-600'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="leading-tight truncate">{item.label}</div>
                  {item.description && (
                    <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5 truncate">
                      {item.description}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
