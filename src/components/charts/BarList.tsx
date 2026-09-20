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
  /** When given, the tooltip also shows each value's share of this total. */
  total?: number;
  /** Kept for existing callers; labels now size to the longest one automatically. */
  labelWidth?: 'narrow' | 'wide';
  /** The row whose filter is currently applied. */
  selectedId?: string | null;
}

/** Room kept at the end of the track for the value label, so the longest bar still fits. */
const VALUE_ROOM = '3rem';

/**
 * Horizontal bars for ranked counts. One series, so one colour and no legend. Bars grow from a
 * shared baseline, are exactly proportional to their values, and carry the value at the tip.
 * All rows share one label column sized to the longest label, so bars start at the same x.
 * Each row links to the underlying list.
 */
export function BarList({ entries, label, unit, total, selectedId }: BarListProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(1, ...entries.map((e) => e.value));

  return (
    <ol className="grid grid-cols-[minmax(0,max-content)_minmax(0,1fr)] gap-x-5 gap-y-0.5" aria-label={label}>
      {entries.map((entry) => {
        const ratio = entry.value / max;
        // Bar length = its share of the largest value, measured on the track minus the label room.
        const barWidth = entry.value > 0 ? `max(6px, calc((100% - ${VALUE_ROOM}) * ${ratio}))` : '0px';
        const isHovered = hovered === entry.id;
        const isSelected = selectedId === entry.id;
        const share = total ? Math.round((entry.value / total) * 100) : null;
        return (
          <li key={entry.id} className="col-span-2 grid grid-cols-subgrid">
            <a
              href={entry.href}
              onMouseEnter={() => setHovered(entry.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(entry.id)}
              onBlur={() => setHovered(null)}
              aria-label={`${entry.label}: ${entry.value} ${unit}${share !== null ? `, ${share}% of all` : ''}`}
              aria-current={isSelected ? 'true' : undefined}
              className={`col-span-2 grid grid-cols-subgrid items-center rounded-xl px-3 py-2 transition-colors ${isSelected ? 'bg-black/[0.06] ring-1 ring-black/10' : isHovered ? 'bg-black/[0.03]' : ''}`}
            >
              <span className="flex min-w-0 max-w-[11rem] items-center gap-2.5 sm:max-w-[15rem]">
                {entry.mark}
                <span className={`truncate text-[13.5px] text-ink ${isSelected ? 'font-semibold' : ''}`} title={entry.label}>
                  {entry.label}
                </span>
              </span>

              <span className="relative flex h-7 min-w-0 items-center">
                <span aria-hidden className="absolute inset-y-0.5 left-0 w-px bg-black/[0.08]" />
                <span
                  aria-hidden
                  className={`block h-3 shrink-0 rounded-r-[4px] bg-chart transition-[filter] ${isHovered ? 'brightness-[0.92]' : ''}`}
                  style={{ width: barWidth }}
                />
                <span className="ml-2.5 shrink-0 text-[13.5px] font-semibold tabular-nums text-ink">{entry.value}</span>

                {isHovered && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-[12px] leading-4 text-white shadow-pop"
                    // Anchored over the bar's start so it never covers the labels in the next rows.
                    style={{ left: 0 }}
                  >
                    <span className="block font-semibold">{entry.label}</span>
                    <span className="block text-white/70">
                      {entry.value} {unit}
                      {share !== null ? ` · ${share}% of all` : ''}
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
