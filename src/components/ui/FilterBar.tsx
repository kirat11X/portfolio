import { cn } from '@/lib/cn';

export interface FilterOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface FilterBarProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the button group, e.g. "Filter engineering projects". */
  label: string;
  tone?: 'eng' | 'cre';
  className?: string;
}

/** A row of toggle buttons for filtering a collection. Scrolls horizontally on small screens. */
export function FilterBar<T extends string>({ options, value, onChange, label, tone = 'eng', className }: FilterBarProps<T>) {
  const active =
    tone === 'eng'
      ? 'border-eng/50 bg-eng/[0.12] text-fg shadow-glow-eng'
      : 'border-cre/50 bg-cre/[0.12] text-fg shadow-glow-cre';
  return (
    <div role="group" aria-label={label} className={cn('no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:px-0', className)}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors duration-200',
              selected ? active : 'border-line bg-contrast/[0.02] text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn('font-mono text-[11px]', selected ? 'text-fg' : 'text-fg-subtle')}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
