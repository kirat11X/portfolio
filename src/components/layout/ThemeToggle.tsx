import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useResolvedTheme, useThemeStore, type ThemePreference } from '@/lib/theme';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  Icon: LucideIcon;
}

const OPTIONS: readonly ThemeOption[] = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

/** Moves between options with the arrow keys (plus Home/End); returns the new index or null. */
function stepIndex(event: KeyboardEvent, index: number, vertical: boolean): number | null {
  const next = vertical ? 'ArrowDown' : 'ArrowRight';
  const prev = vertical ? 'ArrowUp' : 'ArrowLeft';
  if (event.key === next) return (index + 1) % OPTIONS.length;
  if (event.key === prev) return (index - 1 + OPTIONS.length) % OPTIONS.length;
  if (event.key === 'Home') return 0;
  if (event.key === 'End') return OPTIONS.length - 1;
  return null;
}

/**
 * Compact theme menu for the desktop navbar: an icon button showing the current
 * theme that opens a small menu of System / Light / Dark (menuitemradio items).
 */
export function ThemeMenu({ className, note }: { className?: string; note?: string }) {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const resolved = useResolvedTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const current = OPTIONS.find((option) => option.value === preference) ?? OPTIONS[0];
  const ButtonIcon = preference === 'system' ? (resolved === 'light' ? Sun : Moon) : current.Icon;

  useEffect(() => {
    if (!open) return;
    const index = OPTIONS.findIndex((option) => option.value === useThemeStore.getState().preference);
    itemRefs.current[Math.max(0, index)]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    const active = itemRefs.current.findIndex((node) => node === document.activeElement);
    const next = stepIndex(event, Math.max(0, active), true);
    if (next !== null) {
      event.preventDefault();
      itemRefs.current[next]?.focus();
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Theme: ${current.label}`}
        title={`Theme: ${current.label}`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-contrast/[0.05] hover:text-fg',
          open && 'bg-contrast/[0.06] text-fg',
        )}
      >
        <ButtonIcon className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Colour theme"
          onKeyDown={onMenuKeyDown}
          className={cn(
            'glass-strong absolute right-0 top-[calc(100%+0.375rem)] z-10 rounded-2xl p-1.5 shadow-panel animate-fade',
            note ? 'w-56' : 'w-40',
          )}
        >
          {OPTIONS.map(({ value, label, Icon }, index) => {
            const checked = value === preference;
            return (
              <button
                key={value}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={-1}
                onClick={() => {
                  setPreference(value);
                  close(true);
                }}
                className={cn(
                  'flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors duration-150',
                  'hover:bg-contrast/[0.06] focus-visible:bg-contrast/[0.06] focus-visible:outline-offset-0',
                  checked ? 'text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                <Icon className={cn('h-4 w-4', checked ? 'text-eng' : 'text-fg-subtle')} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {checked && <span className="h-1.5 w-1.5 rounded-full bg-eng" aria-hidden="true" />}
              </button>
            );
          })}
          {note && <p className="px-3 pb-2 pt-1.5 text-xs leading-relaxed text-fg-subtle">{note}</p>}
        </div>
      )}
    </div>
  );
}

/** Segmented System / Light / Dark radio group (the mobile menu). */
export function ThemeSwitch({ className, labelledBy }: { className?: string; labelledBy?: string }) {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = stepIndex(event, index, false) ?? stepIndex(event, index, true);
    if (next === null) return;
    event.preventDefault();
    setPreference(OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : 'Colour theme'}
      className={cn('inline-flex rounded-full border border-line bg-contrast/[0.02] p-1', className)}
    >
      {OPTIONS.map(({ value, label, Icon }, index) => {
        const checked = value === preference;
        return (
          <button
            key={value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => setPreference(value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-200',
              checked ? 'bg-ink-900 text-fg shadow-panel ring-1 ring-line-strong' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon className={cn('h-4 w-4', checked && 'text-eng')} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
