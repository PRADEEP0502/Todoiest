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
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.04] text-ink-3">{icon}</div>
      )}
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-[13px] text-ink-2">{children}</div>}
    </div>
  );
}

/**
 * Large title in the style "Product overview": the last word fades to grey. A plain string is
 * split automatically; pass `fade` to choose the faded part explicitly.
 */
export function Headline({ children, fade, as: Tag = 'h1', size = 'lg' }: { children: ReactNode; fade?: string; as?: 'h1' | 'h2'; size?: 'lg' | 'md' }) {
  let lead: ReactNode = children;
  let tail = fade;
  if (typeof children === 'string' && fade === undefined) {
    const at = children.trimEnd().lastIndexOf(' ');
    if (at > 0) {
      lead = children.slice(0, at);
      tail = children.slice(at + 1);
    }
  }
  const sizing = size === 'lg' ? 'text-[30px] leading-[38px] sm:text-[38px] sm:leading-[46px]' : 'text-[22px] leading-8';
  return (
    <Tag className={`font-semibold tracking-[-0.035em] text-ink ${sizing}`}>
      {lead}
      {tail && (
        <>
          {' '}
          <span className="text-fade">{tail}</span>
        </>
      )}
    </Tag>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {typeof title === 'string' ? (
          <Headline>{title}</Headline>
        ) : (
          <h1 className="text-[30px] font-semibold leading-[38px] tracking-[-0.035em] text-ink sm:text-[38px] sm:leading-[46px]">{title}</h1>
        )}
        {subtitle && <div className="mt-1 text-[14px] text-ink-2">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-2xl bg-black/[0.045]" style={{ width: `${88 - ((i * 13) % 30)}%` }} />
      ))}
    </div>
  );
}

export interface Metric {
  label: string;
  /** null = no data or rule yet; the card reads "Set up". */
  value: number | null;
  href: string;
  note?: string;
  tone?: 'danger';
  /** Span the full row on phones (used to avoid a lone card at the end of a 2-column grid). */
  wideOnMobile?: boolean;
}

/**
 * Clickable metric cards with large figures. `columns` is a Tailwind grid-cols class list written
 * out in full, e.g. "grid-cols-2 sm:grid-cols-5".
 */
export function MetricStrip({ items, columns, size = 'lg', label }: { items: Metric[]; columns: string; size?: 'lg' | 'md'; label?: string }) {
  return (
    <div className={`grid gap-2.5 sm:gap-3 ${columns}`} role="list" aria-label={label}>
      {items.map((m) => {
        const danger = m.tone === 'danger' && (m.value ?? 0) > 0;
        return (
          <a
            key={m.label}
            role="listitem"
            href={m.href}
            className={`panel group relative flex min-w-0 flex-col transition-shadow hover:shadow-pill ${size === 'lg' ? 'px-4 py-4 sm:px-5' : 'rounded-[20px] px-4 py-3'} ${m.wideOnMobile ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <span className="flex items-center gap-1.5 pr-5 text-[12.5px] font-medium leading-4 text-ink-2">
              {danger && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-p1" aria-hidden />}
              <span className="truncate">{m.label}</span>
            </span>
            <span className={`font-semibold tracking-[-0.04em] ${size === 'lg' ? 'mt-2 text-[34px] leading-10' : 'mt-1.5 text-[26px] leading-8'}`}>
              {m.value === null ? (
                <span className="text-[13px] font-medium tracking-normal text-ink-3">Set up →</span>
              ) : (
                <span className={danger ? 'text-p1' : 'num-fade'}>{m.value}</span>
              )}
            </span>
            {m.note && <span className="mt-1 truncate text-2xs leading-4 text-ink-3">{m.note}</span>}
            <ArrowUpRight size={14} aria-hidden className="absolute right-3.5 top-3.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        );
      })}
    </div>
  );
}

/** A small rounded chip for context next to a figure, e.g. "12 added this week". */
export function Chip({ tone = 'neutral', children }: { tone?: 'good' | 'bad' | 'neutral'; children: ReactNode }) {
  const tones = {
    good: 'border-[#bfe6cf] bg-[#effaf3] text-[#1f8a55]',
    bad: 'border-[#f6cfc9] bg-[#fdf1ef] text-[#b3372c]',
    neutral: 'border-black/[0.06] bg-black/[0.03] text-ink-2',
  };
  return <span className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[12.5px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Panel({ title, subtitle, actions, children, footer, className = '' }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 px-5 pb-3 pt-5 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#3a3a3a]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="px-3 pb-3 sm:px-4">{children}</div>
      {footer && <div className="flex items-center justify-between gap-2 border-t border-black/[0.05] px-5 py-3 sm:px-6">{footer}</div>}
    </section>
  );
}

const AVATAR_COLORS = ['#1a7f53', '#2f6bd8', '#b8255f', '#c26a00', '#692ec2', '#148fad', '#57534e'];

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
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), backgroundColor: id === 'unassigned' ? '#b5b5b5' : AVATAR_COLORS[hash % AVATAR_COLORS.length] }}
    >
      {id === 'unassigned' ? '–' : initials || '?'}
    </span>
  );
}

/** Segmented control: a grey track with the selected option raised as a white pill. */
export function Tabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-full bg-black/[0.05] p-1 [scrollbar-width:none]" role="tablist" aria-label={label}>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-[background-color,box-shadow,color] ${selected ? 'bg-surface text-ink shadow-pill' : 'text-ink-2 hover:text-ink'}`}
          >
            {o.label}
            {o.count !== undefined && <span className={`text-[11.5px] tabular-nums ${selected ? 'text-ink-2' : 'text-ink-3'}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** "Show 50 more" paging for long lists, so hundreds of rows are never rendered at once. */
export function ShowMore({ shown, total, onMore, step = 50 }: { shown: number; total: number; onMore: () => void; step?: number }) {
  if (shown >= total) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-3">
      <span className="text-[12px] text-ink-3">
        Showing {shown} of {total}
      </span>
      <button type="button" className="btn-secondary h-8" onClick={onMore}>
        Show {Math.min(step, total - shown)} more
      </button>
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-[12.5px] ${tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-black/[0.05] bg-black/[0.025] text-ink-2'}`}>{children}</div>
  );
}
