import { FolderKanban, Hash, Search, SquareCheck, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { href, navigate } from '../../hooks/useRoute';
import { searchWorkspace, plainText, type SearchResult } from '../../lib/search';
import { useUi } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import { ProjectDot } from '../common/ui';

interface SearchBoxProps {
  autoFocus?: boolean;
  onDone?: () => void;
  /** Render results inline (mobile overlay) instead of as a dropdown. */
  inline?: boolean;
}

export function SearchBox({ autoFocus, onDone, inline }: SearchBoxProps) {
  const { index } = useWorkspace();
  const { openTask } = useUi();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const results = useMemo(() => (index ? searchWorkspace(index, query) : null), [index, query]);
  const flat: SearchResult[] = results ? [...results.projects, ...results.sections, ...results.tasks] : [];

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
    if (result.kind === 'project') navigate(href.project(result.id));
    else if (result.kind === 'section') navigate(href.project(result.section.project_id, result.id));
    else openTask(result.id);
    setQuery('');
    setOpen(false);
    input.current?.blur();
    onDone?.();
  };

  const showResults = (inline || open) && query.trim().length > 0 && results;

  return (
    <div ref={root} className="relative w-full">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          ref={input}
          autoFocus={autoFocus}
          type="search"
          value={query}
          placeholder="Search tasks, projects and sections…"
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
          className="field h-9 bg-canvas pl-9 pr-14 [&::-webkit-search-cancel-button]:hidden"
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
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 text-2xs text-ink-3 lg:block">
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
              : 'absolute left-0 right-0 top-full z-40 mt-1.5 max-h-[70vh] overflow-y-auto rounded-lg border border-line bg-surface p-1.5 shadow-pop lg:min-w-[34rem]'
          }
        >
          {flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-2">No projects, sections or tasks match “{query.trim()}”.</p>
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
        } else {
          icon = <SquareCheck size={13} className="text-ink-3" />;
          name = plainText(result.task.content);
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
