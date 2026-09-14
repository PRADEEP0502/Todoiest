import { AlertCircle, Check, Info, X } from 'lucide-react';
import { useUi } from '../../store/ui';

export function Toasts() {
  const { toasts, dismiss } = useUi();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-[13px] text-white shadow-pop"
        >
          {toast.tone === 'error' ? (
            <AlertCircle size={16} className="shrink-0 text-red-300" />
          ) : toast.tone === 'success' ? (
            <Check size={16} className="shrink-0 text-emerald-300" />
          ) : (
            <Info size={16} className="shrink-0 text-white/60" />
          )}
          <span className="min-w-0 flex-1 truncate">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="shrink-0 rounded px-2 py-0.5 font-semibold text-emerald-300 hover:bg-white/10"
              onClick={() => {
                toast.action!.run();
                dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" className="shrink-0 text-white/50 hover:text-white" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
