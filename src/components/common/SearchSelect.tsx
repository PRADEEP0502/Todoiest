import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface SearchOption {
  value: string;
  label: string;
  /** Small text on the right, e.g. a count. */
  hint?: string;
  /** Options with the same group are listed under one heading. */
  group?: string;
  /** Indent for nested items (sub-projects). */
  depth?: number;
  icon?: ReactNode;
}

interface SearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  /** Shown on the button when no option matches `value`. */
  placeholder?: string;
  /** Lets a <label htmlFor> point at the button. */
  id?: string;
  'aria-label'?: string;
  disabled?: boolean;
  /** Width classes for the button; defaults to full width like other fields. */
  className?: string;
  searchPlaceholder?: string;
}

const normalise = (text: string) => text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '');

/**
 * A dropdown with a search box, for every place a list is picked from. Works like a <select>
 * with the keyboard (↑ ↓ Enter Esc) and renders its list above everything else, so it is never
 * clipped inside a dialog or a scrolling panel.
 */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Choose…',
  id,
  'aria-label': ariaLabel,
  disabled,
  className = 'w-full',
  searchPlaceholder = 'Search…',
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const matches = useMemo(() => {
    const q = normalise(query.trim());
    if (!q) return options;
    return options.filter((o) => normalise(`${o.label} ${o.group ?? ''} ${o.hint ?? ''}`).includes(q));
  }, [options, query]);

  const close = (refocus = true) => {
    setOpen(false);
    setQuery('');
    setRect(null);
    if (refocus) button.current?.focus();
  };
  const choose = (option: SearchOption) => {
    onChange(option.value);
    close();
  };

  // Place the list under the button, and keep it there while the page or a dialog scrolls.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => button.current && setRect(button.current.getBoundingClientRect());
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  // The list mounts once it has been placed, so focus the search box then.
  const placed = rect !== null;
  useEffect(() => {
    if (open && placed) input.current?.focus();
  }, [open, placed]);

  useEffect(() => {
    if (!open) return;
    const current = matches.findIndex((o) => o.value === value);
    setActive(current >= 0 ? current : 0);
    const outside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!button.current?.contains(target) && !popover.current?.contains(target)) close(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
    // Only when opening: typing must not move the highlight back to the selected item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[active]) choose(matches[active]);
    } else if (e.key === 'Escape') {
      // Close only this list, not a dialog it sits in.
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  // Open upwards when there is not enough room below.
  const below = rect ? window.innerHeight - rect.bottom : 0;
  const up = rect ? below < 300 && rect.top > below : false;
  const width = rect ? Math.max(rect.width, 224) : 224;
  const left = rect ? Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) : 0;

  return (
    <>
      <button
        ref={button}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`field flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span className={`flex min-w-0 items-center gap-2 truncate ${selected ? '' : 'text-ink-3'}`}>
          {selected?.icon}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          {selected?.hint && <span className="shrink-0 text-ink-3">{selected.hint}</span>}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={popover}
            onKeyDown={onKey}
            // Clicks inside the list must not reach a dialog backdrop behind it.
            onMouseDown={(e) => e.stopPropagation()}
            style={{ position: 'fixed', left, width, ...(up ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) }}
            className="z-[70] overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
          >
            <div className="border-b border-line p-2">
              <label className="relative block">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
                <input
                  ref={input}
                  type="text"
                  role="combobox"
                  aria-expanded
                  aria-controls={listId}
                  aria-activedescendant={matches[active] ? `${listId}-${active}` : undefined}
                  aria-label={ariaLabel ? `Search ${ariaLabel}` : 'Search'}
                  className="field h-9 w-full pl-8 text-[13px]"
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <ul ref={list} id={listId} role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto py-1">
              {matches.length === 0 ? (
                <li className="px-3 py-2.5 text-center text-[13px] text-ink-3">No results found</li>
              ) : (
                matches.map((o, i) => (
                  <li key={o.value} role="presentation">
                    {o.group && o.group !== matches[i - 1]?.group && (
                      <span className="block px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">{o.group}</span>
                    )}
                    <button
                      type="button"
                      role="option"
                      id={`${listId}-${i}`}
                      data-index={i}
                      aria-selected={o.value === value}
                      tabIndex={-1}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(o)}
                      style={{ paddingLeft: 12 + (query ? 0 : (o.depth ?? 0) * 14) }}
                      className={`flex w-full items-center gap-2 py-2 pr-3 text-left text-[13px] text-ink ${i === active ? 'bg-canvas' : ''}`}
                    >
                      {o.icon}
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      {o.hint && <span className="shrink-0 text-[12px] text-ink-3">{o.hint}</span>}
                      <Check size={14} className={`shrink-0 text-accent ${o.value === value ? '' : 'invisible'}`} aria-hidden />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
