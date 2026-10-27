import { useEffect, useRef, useState } from 'react';
import { DISTRICTS, type DistrictId } from '../config/layout';
import { DISTRICT_INFO, districtTitle } from '../scene/destinations';
import { runtime } from '../scene/runtime';
import { useRaceStore } from '../game/raceStore';
import { useWorldStore } from '../state/worldStore';

/** Delay before a district change is shown, so crossing a zone edge does not flicker. */
const SETTLE_MS = 300;
const VISIBLE_MS = 2600;
/** The same district is not re-announced this soon unless another one came in between. */
const REPEAT_MS = 5000;

/** Brief toast under the navbar plus a polite live announcement when the district changes. */
export function DistrictToast() {
  const district = useWorldStore((s) => s.activeDistrict);
  const [toast, setToast] = useState<{ id: DistrictId; serial: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const serial = useRef(0);
  const firstRun = useRef(true);

  useEffect(() => {
    const first = firstRun.current;
    firstRun.current = false;
    if (!district) return;
    // Remounted after visiting another page: the district did not change.
    if (first && runtime.lastToast?.id === district) return;
    const timer = window.setTimeout(
      () => {
        const now = performance.now();
        const last = runtime.lastToast;
        if (last && last.id === district && now - last.at < REPEAT_MS) return;
        runtime.lastToast = { id: district, at: now };
        serial.current++;
        setToast({ id: district, serial: serial.current });
        setAnnouncement(`${districtTitle(district)}. ${DISTRICT_INFO[district].detail}`);
      },
      runtime.lastToast ? SETTLE_MS : 900,
    );
    return () => window.clearTimeout(timer);
  }, [district]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // During a race the timer owns the top of the screen; the change is still announced.
  const racing = useRaceStore((s) => s.phase !== 'idle');
  const def = toast && !racing ? DISTRICTS[toast.id] : null;
  return (
    <>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {def && toast && (
        <div
          key={toast.serial}
          aria-hidden="true"
          className="glass absolute inset-x-4 top-[4.25rem] flex items-start gap-3 rounded-card px-4 py-3 shadow-panel animate-rise md:inset-x-auto md:left-6 md:top-3 md:w-[22rem]"
        >
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: def.accent, boxShadow: `0 0 12px 1px ${def.accent}` }} />
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold tracking-[-0.01em] text-fg">
              {def.label}
              {toast.id !== 'hub' && <span style={{ color: def.accent }}> · {DISTRICT_INFO[toast.id].subtitle}</span>}
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{DISTRICT_INFO[toast.id].detail}</p>
          </div>
        </div>
      )}
    </>
  );
}
