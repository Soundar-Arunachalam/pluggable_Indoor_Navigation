import React from 'react';
import { useUIStore, Toast } from '../../stores/uiStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ICONS: Record<Toast['type'], React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  error: <AlertCircle className="w-4 h-4 text-rose-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
};

const BG: Record<Toast['type'], string> = {
  success: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800',
  error: 'border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800',
  info: 'border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800',
  warning: 'border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800',
};

const TEXT: Record<Toast['type'], string> = {
  success: 'text-emerald-900 dark:text-emerald-200',
  error: 'text-rose-900 dark:text-rose-200',
  info: 'text-blue-900 dark:text-blue-200',
  warning: 'text-amber-900 dark:text-amber-200',
};

export const ToastStack: React.FC = () => {
  const { toasts, dismissToast } = useUIStore();

  return (
    <div className="fixed bottom-6 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl max-w-sm pointer-events-auto
            animate-in slide-in-from-right-4 duration-200 ${BG[toast.type]}`}
        >
          {ICONS[toast.type]}
          <p className={`text-xs font-semibold flex-1 ${TEXT[toast.type]}`}>{toast.message}</p>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
