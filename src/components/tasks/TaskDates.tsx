import { agingOf, formatDays } from '../../lib/aging';
import { Lock, LockOpen, Pencil } from 'lucide-react';
import type { TaskDates } from '../../lib/taskDates';

type DateKind = 'cd' | 'idd' | 'dd';

const META: Record<DateKind, { short: string; long: string; locked: boolean; hint: string }> = {
  cd: { short: 'CD', long: 'Creation Date', locked: true, hint: 'Set automatically when the task was created. Read-only — it never changes.' },
  idd: { short: 'IDD', long: 'Issue Date', locked: true, hint: 'Recorded the first time a date was set. Read-only — it never changes.' },
  dd: { short: 'DD', long: 'Due Date', locked: false, hint: 'Todoist’s due date. Editable — change it whenever the work is rescheduled.' },
};

/** 🔒 for a date that can never change, ✏️ for the one that can. */
function Marker({ locked, size }: { locked: boolean; size: number }) {
  return locked ? (
    <Lock size={size} strokeWidth={2.25} className="shrink-0 text-ink-3" aria-label="locked, read-only" />
  ) : (
    <Pencil size={size} strokeWidth={2.25} className="shrink-0 text-accent" aria-label="editable" />
  );
}

interface Values {
  cd: string | null;
  idd: string | null;
  dd: string | null;
}

/** Why a date might be empty, in words, rather than a bare dash. */
const EMPTY: Record<DateKind, string> = {
  cd: 'Not recorded',
  idd: 'Entered once, then locked',
  dd: 'No due date',
};

/**
 * One line, for task rows and tables: `CD 16-09-2026 🔒 · IDD 20-09-2026 🔒 · DD 25-09-2026 ✏️`.
 * `only` limits it to some of the dates (tables have a Due date column of their own).
 */
export function TaskDateLine({
  dates,
  only = ['cd', 'idd', 'dd'],
  routine = false,
  now = new Date(),
}: {
  dates: TaskDates;
  only?: DateKind[];
  routine?: boolean;
  /** Today, for the ages; pass a ticking clock so they roll over at midnight. */
  now?: Date;
}) {
  const shown = only.filter((k) => !(routine && k !== 'dd'));
  // A creation date Todoist only knows from its own record (not written in the title) is not shown here,
  // so a task listed as "No CD" never displays one.
  const cdInTitle = dates.cdFrom === 'title';
  const values: Values = { cd: cdInTitle ? dates.cd : null, idd: dates.idd, dd: dates.dd };
  // Nothing to say for a task with no dates at all.
  if (!shown.some((k) => values[k])) return null;
  // How many days ago CD and IDD were — they grow daily and never depend on DD.
  const age = agingOf({ cdKey: cdInTitle ? dates.cdKey : null, iddKey: dates.iddKey }, now);
  const spans = (
    [
      ['CD Age', age.cdAge, 'Days since the Creation Date (today − CD)', 'cd'],
      ['IDD Age', age.iddAge, 'Days since the Issue Date (today − IDD)', 'idd'],
    ] as const
  ).filter(([, , , kind]) => shown.includes(kind));
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] leading-4 text-ink-3">
      {shown.map((k) => {
        const m = META[k];
        return (
          <span key={k} className="inline-flex items-center gap-1" title={`${m.long} — ${m.hint}`}>
            <span className="font-semibold text-ink-2">{m.short}</span>
            <span className={`tabular-nums ${values[k] ? 'text-ink-2' : ''}`}>{values[k] ?? '—'}</span>
            <Marker locked={m.locked} size={10} />
          </span>
        );
      })}
      {spans.map(([label, days, title]) => (
        <span key={label} className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] px-1.5 text-ink-2" title={title}>
          <span className="font-semibold">{label}</span>
          <span className="tabular-nums">{formatDays(days)}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Three cards for the edit dialog. CD and IDD are plain read-only text; DD is echoed here and
 * edited in the Due date field below (`onEditDue` jumps to it). `note` explains the state of a date.
 */
export function TaskDateCards({
  dates,
  cdTime,
  routine,
  pending,
  iddEditor,
  ddPreview,
  onEditDue,
}: {
  dates: TaskDates;
  cdTime?: string | null;
  routine?: boolean;
  /** Dates that will be written when the form is saved, rather than already stored. */
  pending?: { cd?: boolean; idd?: boolean };
  /**
   * Present while the task has no issue date yet: shows a one-time date box instead of a locked
   * value. Whatever is entered is written on save and locked from then on.
   */
  iddEditor?: { value: string | null; onChange: (value: string | null) => void; dueDate: string | null };
  /** The due date as currently chosen in the form, which may not be saved yet. */
  ddPreview?: string | null;
  onEditDue?: () => void;
}) {
  const dd = ddPreview !== undefined ? ddPreview : dates.dd;
  const cards: { kind: DateKind; value: string | null; note: string }[] = [
    {
      kind: 'cd',
      value: routine ? null : dates.cd,
      note: routine
        ? 'Not kept for routine work'
        : pending?.cd
          ? 'Set automatically when you save'
          : dates.cd
            ? cdTime
              ? `Created at ${cdTime}`
              : dates.cdFrom === 'todoist'
                ? 'From Todoist’s creation time'
                : 'Written in the task title'
            : EMPTY.cd,
    },
    {
      kind: 'idd',
      value: routine ? null : dates.idd,
      note: routine
        ? 'Not kept for routine work'
        : pending?.idd
          ? 'Locked as soon as you save'
          : dates.idd
            ? 'Written in the task title'
            : EMPTY.idd,
    },
    { kind: 'dd', value: dd, note: dd ? 'Editable below' : EMPTY.dd },
  ];

  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Task dates">
      {cards.map(({ kind, value, note }) => {
        const m = META[kind];
        const editable = !m.locked;
        // The one moment an issue date can be typed: while the task has none. Then it is locked.
        if (kind === 'idd' && iddEditor && !routine) {
          return (
            <div key={kind} title="Enter the issue date once. After you save it is locked and can never be edited." className="block min-w-0 rounded-2xl border border-amber-300 bg-amber-50/60 px-3 py-2.5 text-left">
              <span className="flex items-center justify-between gap-1">
                <span className="text-[11.5px] font-semibold tracking-[0.04em] text-ink-2">IDD</span>
                <LockOpen size={13} strokeWidth={2.25} className="shrink-0 text-amber-700" aria-label="not locked yet — set once" />
              </span>
              <span className="mt-0.5 block text-[10.5px] leading-3 text-ink-3">Issue Date</span>
              <input
                type="date"
                aria-label="Issue date (IDD) — enter once"
                value={iddEditor.value ?? ''}
                onChange={(e) => iddEditor.onChange(e.target.value || null)}
                className="mt-1.5 h-8 w-full min-w-0 rounded-lg border border-black/[0.1] bg-white px-1.5 text-[13px] tabular-nums text-ink focus:border-black/30 focus:outline-none"
              />
              <span className="mt-1 block text-[11px] leading-[14px] text-amber-800">
                {pending?.idd ? 'Locked as soon as you save' : 'Enter once — then locked'}
                {iddEditor.dueDate && iddEditor.value !== iddEditor.dueDate && (
                  <>
                    {' · '}
                    <button type="button" onClick={() => iddEditor.onChange(iddEditor.dueDate)} className="font-medium underline underline-offset-2">
                      same as DD
                    </button>
                  </>
                )}
              </span>
            </div>
          );
        }
        const body = (
          <>
            <span className="flex items-center justify-between gap-1">
              <span className="text-[11.5px] font-semibold tracking-[0.04em] text-ink-2">{m.short}</span>
              <Marker locked={m.locked} size={13} />
            </span>
            <span className="mt-0.5 block text-[10.5px] leading-3 text-ink-3">{m.long}</span>
            <span className={`mt-1.5 block text-[15px] font-semibold tabular-nums tracking-[-0.01em] ${value ? 'text-ink' : 'text-ink-3'}`}>{value ?? '—'}</span>
            <span className="mt-1 block text-[11px] leading-[14px] text-ink-3">{note}</span>
          </>
        );
        const base = 'block min-w-0 rounded-2xl border px-3 py-2.5 text-left';
        return editable && onEditDue ? (
          <button
            key={kind}
            type="button"
            onClick={onEditDue}
            title={m.hint}
            className={`${base} border-accent/30 bg-accent-soft/50 transition-colors hover:bg-accent-soft`}
          >
            {body}
          </button>
        ) : (
          <div key={kind} title={m.hint} className={`${base} ${m.locked ? 'border-black/[0.06] bg-black/[0.025]' : 'border-accent/30 bg-accent-soft/50'}`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
