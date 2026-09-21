import { Search, X } from 'lucide-react';

/** A search box with a clear button, for narrowing the list on the page it sits on. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Read out by screen readers; the placeholder is not a label. */
  label: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.stopPropagation();
            onChange('');
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        className="field w-full pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" className="icon-btn absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => onChange('')} aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
