import { useId, useRef, type RefObject } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ProjectSearchProps {
  value: string;
  onChange: (value: string) => void;
  /** Visible label above the field. */
  label?: string;
  placeholder?: string;
  /** Access to the input, e.g. to return focus after resetting filters. */
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}

/**
 * A labelled search field with a clear button. Escape clears it too.
 * Filtering happens as you type; there is nothing to submit.
 */
export function ProjectSearch({
  value,
  onChange,
  label = 'Search',
  placeholder = 'Title, topic or tool',
  inputRef,
  className,
}: ProjectSearchProps) {
  const id = useId();
  const localRef = useRef<HTMLInputElement | null>(null);
  const ref = inputRef ?? localRef;

  const clear = () => {
    onChange('');
    ref.current?.focus();
  };

  return (
    <div role="search" className={className}>
      <label htmlFor={id} className="eyebrow block text-fg-subtle">
        {label}
      </label>
      {/* mt-4 rather than mt-3 lines the field up with FilterBar, whose buttons sit in 4px of padding. */}
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
        <input
          ref={ref}
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && value) {
              event.preventDefault();
              onChange('');
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          className={cn(
            'h-11 w-full rounded-full border border-line bg-ink-900 pl-11 text-sm text-fg placeholder:text-fg-subtle',
            'transition-[border-color,background-color] duration-200 hover:border-line-strong focus:border-eng/50',
            '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
            value ? 'pr-12' : 'pr-4',
          )}
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-full text-fg-muted transition-colors hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
