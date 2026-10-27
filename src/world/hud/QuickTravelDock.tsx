import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { DISTRICTS, DISTRICT_ORDER, type DistrictId } from '../config/layout';
import { DISTRICT_INFO } from '../scene/destinations';
import { useRaceStore } from '../game/raceStore';
import { useWorldStore } from '../state/worldStore';
import { Kbd } from './Kbd';
import { useIsTouch } from './useMedia';

/** One button per district; the active one is pressed. Scrolls sideways on narrow screens. */
export function QuickTravelDock() {
  const activeDistrict = useWorldStore((s) => s.activeDistrict);
  const requestTravel = useWorldStore((s) => s.requestTravel);
  const touch = useIsTouch();
  const racing = useRaceStore((s) => s.phase === 'countdown' || s.phase === 'running');
  const listRef = useRef<HTMLUListElement>(null);
  const [hint, setHint] = useState<DistrictId | null>(null);

  // Keep the pressed district visible when the dock is scrolled.
  useEffect(() => {
    const list = listRef.current;
    const button = activeDistrict ? list?.querySelector<HTMLElement>(`[data-district="${activeDistrict}"]`) : null;
    if (!list || !button || list.scrollWidth <= list.clientWidth) return;
    const left = button.offsetLeft - (list.clientWidth - button.offsetWidth) / 2;
    list.scrollTo({ left, behavior: 'smooth' });
  }, [activeDistrict]);

  return (
    <nav
      aria-label="Quick travel"
      aria-description={racing ? 'Off during the time trial' : undefined}
      className={cn('glass pointer-events-auto relative max-w-full rounded-full p-0.5 shadow-panel transition-opacity', racing && 'opacity-45')}
    >
      {hint && (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-line-strong bg-ink-900/95 px-3 py-1 text-[12px] font-medium text-fg shadow-panel"
        >
          <span style={{ color: DISTRICTS[hint].accent }}>{DISTRICTS[hint].label}</span>
          <span className="text-fg-muted"> · {DISTRICT_INFO[hint].subtitle}</span>
        </p>
      )}
      <ul ref={listRef} className="no-scrollbar flex snap-x gap-1 overflow-x-auto rounded-full p-0.5">
        {DISTRICT_ORDER.map((id, index) => {
          const district = DISTRICTS[id];
          const pressed = activeDistrict === id;
          return (
            <li key={id} className="snap-center">
              <button
                type="button"
                data-district={id}
                aria-pressed={pressed}
                aria-describedby={`dock-${id}`}
                onClick={() => requestTravel(id)}
                onMouseEnter={() => setHint(id)}
                onMouseLeave={() => setHint((current) => (current === id ? null : current))}
                onFocus={() => setHint(id)}
                onBlur={() => setHint((current) => (current === id ? null : current))}
                className={cn(
                  'inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap focus-visible:outline-offset-[-3px]',
                  'transition-[background-color,color,box-shadow] duration-200 ease-out-expo',
                  pressed
                    ? 'bg-white/[0.09] text-fg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14)]'
                    : 'text-fg-muted hover:bg-white/[0.05] hover:text-fg',
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full transition-shadow duration-300"
                  style={{ backgroundColor: district.accent, boxShadow: pressed ? `0 0 10px 1px ${district.accent}` : undefined }}
                />
                {district.label}
                {!touch && (
                  <Kbd decorative className="ml-0.5 hidden md:inline-flex">
                    {index + 1}
                  </Kbd>
                )}
              </button>
              <span id={`dock-${id}`} className="sr-only">
                {DISTRICT_INFO[id].subtitle}
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
