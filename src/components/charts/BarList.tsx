import { useState, type ReactNode } from 'react';

export interface BarEntry {
  id: string;
  label: string;
  value: number;
  href: string;
  /** Small identity mark before the label (project color dot, avatar initial…). */
  mark?: ReactNode;
  /** Extra detail shown in the hover tooltip. */
  detail?: string;
}

interface BarListProps {
  entries: BarEntry[];
  /** Accessible name for the list, e.g. "Top projects by active tasks". */
  label: string;
  unit: string;
  labelWidth?: 'narrow' | 'wide';
}

/**
 * Horizontal bars for ranked counts. One series, so one color and no legend; bars grow from a
 * shared baseline and carry their value at the tip. Each row is a link to the underlying list.
 */
export function BarList({ entries, label, unit, labelWidth = 'wide' }: BarListProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(1, ...entries.map((e) => e.value));
  const cols = labelWidth === 'wide' ? 'grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]' : 'grid-cols-[4rem_minmax(0,1fr)]';

  return (
    <ol className="space-y-0.5" aria-label={label}>
      {entries.map((entry) => {
        const pct = (entry.value / max) * 100;
        const isHovered = hovered === entry.id;
        return (
          <li key={entry.id}>
            <a
              href={entry.href}
              onMouseEnter={() => setHovered(entry.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(entry.id)}
              onBlur={() => setHovered(null)}
              aria-label={`${entry.label}: ${entry.value} ${unit}`}
              className={`grid ${cols} items-center gap-3 rounded-md px-2 py-1.5 transition-colors ${isHovered ? 'bg-canvas' : ''}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                {entry.mark}
                <span className="truncate text-[13px] text-ink">{entry.label}</span>
              </span>
              <span className="relative flex min-w-0 items-center gap-2 border-l border-line">
                <span
                  className={`block h-3.5 rounded-r-[4px] bg-chart ${isHovered ? 'brightness-90' : ''}`}
                  style={{ width: entry.value ? `max(4px, calc(${pct}% - 2.5rem))` : '0px' }}
                  aria-hidden
                />
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{entry.value}</span>
                {isHovered && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-[12px] text-white shadow-pop"
                    style={pct <= 55 ? { left: `max(0px, calc(${pct}% - 2.5rem))` } : { right: `calc(${100 - pct}% + 2.5rem)` }}
                  >
                    <span className="font-semibold">{entry.label}</span>
                    <span className="text-white/70">
                      {' '}
                      · {entry.value} {unit}
                      {entry.detail ? ` · ${entry.detail}` : ''}
                    </span>
                  </span>
                )}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
