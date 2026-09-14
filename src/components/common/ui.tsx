import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { projectColor } from '../../lib/priority';

export function ProjectDot({ color, size = 8 }: { color?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: projectColor(color) }}
    />
  );
}

/** ▶ when collapsed, ▼ when expanded. */
export function Chevron({ collapsed, className = '' }: { collapsed: boolean; className?: string }) {
  return (
    <ChevronRight
      aria-hidden
      size={15}
      strokeWidth={2.25}
      className={`shrink-0 text-ink-3 transition-transform duration-150 ${collapsed ? '' : 'rotate-90'} ${className}`}
    />
  );
}

export function Count({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-[12px] tabular-nums text-ink-3 ${className}`}>{children}</span>;
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-3">{icon}</div>}
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-[13px] text-ink-2">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-8 tracking-[-0.01em] text-ink">{title}</h1>
        {subtitle && <div className="mt-0.5 text-[13px] text-ink-2">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-hover/70" style={{ width: `${88 - ((i * 13) % 30)}%` }} />
      ))}
    </div>
  );
}
