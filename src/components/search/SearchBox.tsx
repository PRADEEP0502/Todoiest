import { FolderKanban, Hash, Search, SquareCheck, Tag, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { href, navigate } from '../../hooks/useRoute';
import { searchWorkspace, plainText, type SearchResult } from '../../lib/search';
import { useWorkspace } from '../../store/workspace';
import { Avatar, ProjectDot } from '../common/ui';

interface SearchBoxProps {
  autoFocus?: boolean;
  onDone?: () => void;
  /** Render results inline (mobile overlay) instead of as a dropdown. */
  inline?: boolean;
}

export function SearchBox({ autoFocus, onDone, inline }: SearchBoxProps) {
  const { index, snapshot } = useWorkspace();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);

  // Labels and people are searchable too; counts are active tasks.
  const extras = useMemo(() => {
    const labels = new Map<string, number>();
    const holders = new Map<string, number>();
    for (const l of snapshot?.labels ?? []) labels.set(l.name, 0);
    for (const t of snapshot?.tasks ?? []) {
      for (const l of t.labels) labels.set(l, (labels.get(l) ?? 0) + 1);
      if (t.responsible_uid) holders.set(t.responsible_uid, (holders.get(t.responsible_uid) ?? 0) + 1);
    }
    const people = Object.values(snapshot?.people ?? {}).map((person) => ({ person, count: holders.get(person.id) ?? 0 }));
    return { labels, people };
  }, [snapshot]);
  const results = useMemo(() => (index ? searchWorkspace(index, query, extras) : null), [index, query, extras]);
  const flat: SearchResult[] = results ? [...results.projects, ...results.sections, ...results.tasks, ...results.labels, ...results.people] : [];

  // "/" or Ctrl/⌘+K focuses search from anywhere.
  useEffect(() => {
    if (inline) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [inline]);

  const choose = (result: SearchResult) => {
    // Sections and tasks open inside their project; the project page expands just the path to them.
    if (result.kind === 'project') navigate(href.project(result.id));
    else if (result.kind === 'section') navigate(href.project(result.section.project_id, { sectionId: result.id }));
    else if (result.kind === 'task') navigate(href.project(result.task.project_id, { taskId: result.id }));
    else if (result.kind === 'label') navigate(href.label(result.name));
    else navigate(href.holder(result.id));
    setQuery('');
    setOpen(false);
    input.current?.blur();
    onDone?.();
  };

  const showResults = (inline || open) && query.trim().length > 0 && results;

  return (
    <div ref={root} className="relative w-full">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          ref={input}
          autoFocus={autoFocus}
          type="search"
          value={query}
          placeholder="Search tasks, projects, people…"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, flat.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && flat[active]) {
              choose(flat[active]);
            } else if (e.key === 'Escape') {
              setQuery('');
              setOpen(false);
              input.current?.blur();
              onDone?.();
            }
          }}
          className="field h-11 rounded-full border-black/[0.05] pl-10 pr-16 shadow-pill [&::-webkit-search-cancel-button]:hidden"
          aria-label="Search"
          aria-expanded={!!showResults}
          role="combobox"
          aria-controls="search-results"
        />
        {query ? (
          <button type="button" onClick={() => setQuery('')} className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" aria-label="Clear search">
            <X size={14} />
          </button>
        ) : (
          !inline && (
            <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-black/[0.06] bg-canvas px-1.5 text-2xs text-ink-3 lg:block">
              Ctrl K
            </kbd>
          )
        )}
      </div>

      {showResults && (
        <div
          id="search-results"
          role="listbox"
          className={
            inline
              ? 'mt-3'
              : 'absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-3xl border border-black/[0.05] bg-surface p-2 shadow-pop lg:min-w-[34rem]'
          }
        >
          {flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-2">Nothing matches “{query.trim()}”.</p>
          ) : (
            <>
              <ResultGroup title="Projects" results={results.projects} offset={0} active={active} onChoose={choose} onHover={setActive} />
              <ResultGroup title="Sections" results={results.sections} offset={results.projects.length} active={active} onChoose={choose} onHover={setActive} />
              <ResultGroup
                title={results.total - results.projects.length - results.sections.length > results.tasks.length ? `Tasks (top ${results.tasks.length})` : 'Tasks'}
                results={results.tasks}
                offset={results.projects.length + results.sections.length}
                active={active}
                onChoose={choose}
                onHover={setActive}
              />
              <ResultGroup title="Labels" results={results.labels} offset={results.projects.length + results.sections.length + results.tasks.length} active={active} onChoose={choose} onHover={setActive} />
              <ResultGroup
                title="People"
                results={results.people}
                offset={results.projects.length + results.sections.length + results.tasks.length + results.labels.length}
                active={active}
                onChoose={choose}
                onHover={setActive}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({
  title,
  results,
  offset,
  active,
  onChoose,
  onHover,
}: {
  title: string;
  results: SearchResult[];
  offset: number;
  active: number;
  onChoose: (r: SearchResult) => void;
  onHover: (i: number) => void;
}) {
  const { index } = useWorkspace();
  if (!results.length) return null;
  return (
    <div className="py-1">
      <div className="eyebrow px-2.5 pb-1 pt-1">{title}</div>
      {results.map((result, i) => {
        let icon: ReactNode;
        let name: string;
        if (result.kind === 'project') {
          icon = <ProjectDot color={result.project.color} />;
          name = result.project.name;
        } else if (result.kind === 'section') {
          icon = <Hash size={13} className="text-ink-3" />;
          name = result.section.name;
        } else if (result.kind === 'task') {
          icon = <SquareCheck size={13} className="text-ink-3" />;
          name = plainText(result.task.content);
        } else if (result.kind === 'label') {
          icon = <Tag size={13} className="text-ink-3" />;
          name = `${result.name} · ${result.count} active`;
        } else {
          icon = <Avatar id={result.id} name={result.person.name} size={16} />;
          name = `${result.person.name} · ${result.count} active`;
        }
        const trail = result.path.slice(0, -1);
        const projectColor =
          result.kind === 'section' ? index?.projectById.get(result.section.project_id)?.color : result.kind === 'task' ? index?.projectById.get(result.task.project_id)?.color : undefined;
        return (
          <button
            key={`${result.kind}-${result.id}`}
            type="button"
            role="option"
            aria-selected={offset + i === active}
            onMouseEnter={() => onHover(offset + i)}
            onClick={() => onChoose(result)}
            className={`flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left ${offset + i === active ? 'bg-canvas' : ''}`}
          >
            <span className="mt-[3px] flex w-4 shrink-0 justify-center">{icon}</span>
            <span className="min-w-0 flex-1">
              {trail.length > 0 && (
                <span className="flex items-center gap-1.5 truncate text-2xs text-ink-3">
                  {projectColor && <ProjectDot color={projectColor} size={6} />}
                  {trail.map((part, j) => (
                    <span key={j} className="truncate">
                      {j > 0 && <span className="mr-1.5">→</span>}
                      {part}
                    </span>
                  ))}
                </span>
              )}
              <span className="block truncate text-[13.5px] text-ink">{name}</span>
            </span>
            {result.kind === 'project' && <FolderKanban size={13} className="mt-1 shrink-0 text-ink-3" />}
          </button>
        );
      })}
    </div>
  );
}
