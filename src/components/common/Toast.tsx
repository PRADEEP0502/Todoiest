import React from 'react';
import { useTaskStore } from '../../store/TaskContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useTaskStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all ${
              isSuccess
                ? 'bg-white border-emerald-200 text-slate-800'
                : isError
                ? 'bg-white border-red-200 text-slate-800'
                : 'bg-white border-blue-200 text-slate-800'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {isError && <AlertTriangle className="w-4 h-4 text-red-600" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-blue-600" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900">{toast.title}</p>
              {toast.message && (
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{toast.message}</p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
