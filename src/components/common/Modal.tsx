import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({ title, onClose, children, footer, width = 'max-w-lg' }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current;
    first?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-black/20 backdrop-blur-[2px] sm:items-start sm:p-6 sm:pt-[10vh]" onMouseDown={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        // A phone's browser bars change the height as you scroll, so the dialog is measured
        // against the viewport as it actually is (dvh) rather than its largest possible size.
        className={`flex max-h-[92dvh] w-full ${width} flex-col rounded-t-[28px] bg-surface shadow-pop outline-none sm:rounded-[28px]`}
      >
        {/* The little bar a sheet is grabbed by on a phone. */}
        <span aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-black/[0.08] sm:hidden" />
        <div className="flex items-start gap-3 border-b border-black/[0.05] px-5 py-3.5 sm:px-6 sm:py-4">
          {/* min-w-0 keeps a long title from sliding under the close button. */}
          <div className="min-w-0 flex-1 text-[13px] leading-5 text-ink-2">{title}</div>
          <button type="button" className="icon-btn -mr-1.5 -mt-1 shrink-0" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {/* min-h-0 lets this shrink inside the flex column; without it the body grows past the
            dialog and there is nothing to scroll. overscroll-contain keeps the page behind still. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.05] bg-surface px-5 py-3.5 sm:px-6 sm:py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
