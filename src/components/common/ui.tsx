import { ArrowUpRight, ChevronRight } from 'lucide-react';
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
        <h1 className="text-[22px] font-semibold leading-8 tracking-[-0.015em] text-ink">{title}</h1>
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

export interface Metric {
  label: string;
  /** null = no data or rule yet; the cell reads "Set up". */
  value: number | null;
  href: string;
  note?: string;
  tone?: 'danger';
  /** Span the full row on phones (used to avoid a lone cell at the end of a 2-column grid). */
  wideOnMobile?: boolean;
}

/**
 * A row of clickable metrics in one panel, separated by hairlines. `columns` is a Tailwind
 * grid-cols class list written out in full, e.g. "grid-cols-2 sm:grid-cols-5".
 */
export function MetricStrip({ items, columns, size = 'lg', label }: { items: Metric[]; columns: string; size?: 'lg' | 'md'; label?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-line" role="list" aria-label={label}>
      <div className={`grid gap-px ${columns}`}>
        {items.map((m) => {
          const color = m.value === null ? 'text-ink-3' : m.tone === 'danger' && m.value > 0 ? 'text-p1' : 'text-ink';
          return (
            <a
              key={m.label}
              role="listitem"
              href={m.href}
              className={`group relative flex min-w-0 flex-col bg-surface px-3.5 transition-colors hover:bg-[#fbfaf8] sm:px-4 ${size === 'lg' ? 'py-3.5' : 'py-2.5'} ${m.wideOnMobile ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <span className="pr-4 text-[12px] font-medium leading-4 text-ink-2">{m.label}</span>
              <span className={`font-semibold tracking-[-0.02em] ${color} ${size === 'lg' ? 'mt-1.5 text-[28px] leading-8' : 'mt-1 text-[22px] leading-7'}`}>
                {m.value === null ? <span className="text-[13px] font-medium leading-7">Set up →</span> : m.value}
              </span>
              {m.note && <span className="mt-0.5 text-2xs leading-4 text-ink-3">{m.note}</span>}
              <ArrowUpRight size={13} aria-hidden className="absolute right-2.5 top-3 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, actions, children, footer, className = '' }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 px-4 pb-2 pt-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="text-[12px] text-ink-3">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="px-2 pb-2 sm:px-3">{children}</div>
      {footer && <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 sm:px-5">{footer}</div>}
    </section>
  );
}

const AVATAR_COLORS = ['#1f6f5c', '#2f6bd8', '#b8255f', '#c26a00', '#692ec2', '#148fad', '#57534e'];

export function Avatar({ name, id, size = 22 }: { name: string; id: string; size?: number }) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), backgroundColor: id === 'unassigned' ? '#b5b0a7' : AVATAR_COLORS[hash % AVATAR_COLORS.length] }}
    >
      {id === 'unassigned' ? '–' : initials || '?'}
    </span>
  );
}

export function Tabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-md border border-line bg-surface p-0.5 [scrollbar-width:none]" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-3 text-[13px] font-medium transition-colors ${value === o.value ? 'bg-ink text-white' : 'text-ink-2 hover:bg-hover'}`}
        >
          {o.label}
          {o.count !== undefined && <span className={`text-[11px] tabular-nums ${value === o.value ? 'text-white/70' : 'text-ink-3'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** "Show 50 more" paging for long lists, so hundreds of rows are never rendered at once. */
export function ShowMore({ shown, total, onMore, step = 50 }: { shown: number; total: number; onMore: () => void; step?: number }) {
  if (shown >= total) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-2.5">
      <span className="text-[12px] text-ink-3">
        Showing {shown} of {total}
      </span>
      <button type="button" className="btn-secondary h-7" onClick={onMore}>
        Show {Math.min(step, total - shown)} more
      </button>
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: ReactNode }) {
  return (
    <div className={`rounded-md border px-3 py-2 text-[12.5px] ${tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-line bg-canvas text-ink-2'}`}>{children}</div>
  );
}
