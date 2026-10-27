import { useEffect, useId, useRef } from 'react';
import { Car, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CAR_ORDER, CARS, carStats, useCarStore, type CarId } from '../game/cars';
import { DESIGNS, type Station } from '../scene/vehicles/designs';
import { useConsentStore } from '../game/consentStore';
import { useHudStore } from '../scene/uiState';

const SCALE = 40;
type Pt = [number, number];

/** Car-space (z, y) → SVG (nose to the right). */
const px = (z: number, y: number): Pt => [-z * SCALE, -y * SCALE];

/** Smooth closed path through points (Catmull-Rom → cubic Bézier). */
function smoothPath(points: Pt[], closed = true): string {
  const n = points.length;
  const at = (i: number) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return closed ? `${d} Z` : d;
}

/** Side profile of a lofted shape: along the top, back along the bottom. */
function profile(stations: Station[], lift: number): string {
  const top = stations.map((s) => px(s.z, s.yt + lift));
  const bottom = [...stations].reverse().map((s) => px(s.z, s.yb + lift));
  return smoothPath([...top, ...bottom]);
}

interface Art {
  body: string;
  cabin: string;
  waist: number;
  wheels: Array<{ x: number; y: number; r: number }>;
}

const ART: Record<CarId, Art> = Object.fromEntries(
  CAR_ORDER.map((id) => {
    const d = DESIGNS[id];
    const midY = (d.body.reduce((sum, s) => sum + (s.yb + s.yt) / 2, 0) / d.body.length + d.ride) * -SCALE;
    const wheels = d.wheels.filter((w) => w.x > 0).map((w) => ({ x: -w.z * SCALE, y: -d.wheelRadius * SCALE, r: d.wheelRadius * SCALE }));
    return [id, { body: profile(d.body, d.ride), cabin: profile(d.cabin, d.ride), waist: midY, wheels }];
  }),
) as Record<CarId, Art>;

function Wheel({ x, y, r, rim, accent, spokes }: { x: number; y: number; r: number; rim: string; accent: string; spokes: number }) {
  const rr = r * (spokes > 6 ? 0.74 : 0.58);
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#101116" stroke="#2a2d3a" strokeWidth={1} />
      <circle cx={x} cy={y} r={rr} fill="#07080c" stroke={accent} strokeWidth={1.1} />
      {Array.from({ length: spokes }, (_, i) => {
        const a = (i / spokes) * Math.PI * 2;
        return <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * rr * 0.9} y2={y + Math.sin(a) * rr * 0.9} stroke={rim} strokeWidth={spokes > 6 ? 1 : 2.2} strokeLinecap="round" />;
      })}
      <circle cx={x} cy={y} r={rr * 0.28} fill={rim} />
    </g>
  );
}

/** Side-view illustration generated from the same loft stations as the 3D model. */
function CarPreview({ id, className }: { id: CarId; className?: string }) {
  const def = CARS[id];
  const art = ART[id];
  const uid = useId().replace(/:/g, '');
  const clip = `${uid}-clip`;
  const shade = `${uid}-shade`;
  const glow = `${uid}-glow`;
  const pod = id === 'pod';
  return (
    <svg viewBox="-60 -62 120 68" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.35} />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="1" stopColor="#000000" stopOpacity={0.35} />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor={def.accent} stopOpacity={0.75} />
          <stop offset="1" stopColor={def.accent} stopOpacity={0} />
        </radialGradient>
        <clipPath id={clip}>
          <path d={art.body} />
        </clipPath>
      </defs>
      <ellipse cx={0} cy={1} rx={56} ry={6} fill={`url(#${glow})`} />
      {pod && (
        <g fill={def.accent} opacity={0.75}>
          <path d="M-31 -9 L-24 -9 L-21 0 L-34 0 Z" opacity={0.5} />
          <path d="M23 -9 L30 -9 L33 0 L20 0 Z" opacity={0.5} />
        </g>
      )}
      {id === 'kestrel' && (
        <g>
          <path d="M-38.5 -33 L-44 -46 L-40.5 -46 L-35 -33 Z" fill={def.body} />
          <path d="M-52 -45 Q-44 -48.5 -34 -47 L-34 -44.5 Q-44 -45.5 -52 -43 Z" fill={def.body} />
          <rect x={-54} y={-50} width={21} height={8} rx={1.6} fill={def.detail} />
        </g>
      )}
      <path d={art.cabin} fill={def.glassGlow} stroke={def.accent} strokeOpacity={0.5} strokeWidth={0.8} />
      <path d={art.cabin} fill={`url(#${shade})`} />
      <path d={art.body} fill={def.body} />
      <g clipPath={`url(#${clip})`}>
        <rect x={-70} y={art.waist + (id === 'kestrel' ? 4 : id === 'stingray' ? 3 : 1)} width={140} height={60} fill={def.livery} />
        {id === 'kestrel' && <rect x={-70} y={art.waist + 2.2} width={140} height={1.8} fill={def.detail} />}
        <rect x={-70} y={art.waist - 0.2} width={140} height={1.2} fill={def.accent} />
        <path d={art.body} fill={`url(#${shade})`} />
      </g>
      {pod && (
        <g fill={def.livery}>
          <rect x={-35} y={-12} width={16} height={5} rx={2.5} />
          <rect x={19} y={-12} width={16} height={5} rx={2.5} />
          <line x1={-34} y1={-24} x2={-37} y2={-44} stroke="#2a3150" strokeWidth={1} />
          <circle cx={-37} cy={-45} r={2} fill={def.accent} />
        </g>
      )}
      {art.wheels.map((w) => (
        <Wheel key={w.x} {...w} rim={def.rim} accent={def.accent} spokes={id === 'stingray' ? 10 : 6} />
      ))}
    </svg>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="w-[4.5rem] shrink-0 text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">{label}</span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.round(value * 100)}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </span>
    </span>
  );
}

const rating = (value: number) => Math.max(1, Math.round(value * 5));

/**
 * Garage: toolbar button + popover with the three cars as a radio group.
 * Arrow keys move between cars, Enter/Space picks, Esc closes.
 */
export function CarPicker() {
  const open = useHudStore((s) => s.carMenuOpen);
  const setOpen = useHudStore((s) => s.setCarMenuOpen);
  const carId = useCarStore((s) => s.carId);
  const setCar = useCarStore((s) => s.setCar);
  const consent = useConsentStore((s) => s.status);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, setOpen]);

  useEffect(() => () => useHudStore.getState().setCarMenuOpen(false), []);

  const pick = (id: CarId) => {
    setCar(id);
  };

  const onRadioKey = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const nextId = CAR_ORDER[(index + delta + CAR_ORDER.length) % CAR_ORDER.length];
    pick(nextId);
    panelRef.current?.querySelector<HTMLElement>(`[data-car="${nextId}"]`)?.focus({ preventScroll: true });
  };

  const current = CARS[carId];
  // The popover anchors to the toolbar row (the nearest positioned ancestor), right-aligned.
  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        title={`Car: ${current.name}`}
        className={cn(
          'glass pointer-events-auto inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-[13px] font-medium shadow-panel 2xl:px-4',
          'transition-[border-color,color,background-color] duration-200 ease-out-expo',
          open ? 'border-line-strong text-fg' : 'text-fg-muted hover:border-line-strong hover:text-fg',
        )}
      >
        <span aria-hidden="true" className="flex" style={{ color: current.accent }}>
          <Car className="h-[18px] w-[18px]" />
        </span>
        <span className="sr-only 2xl:not-sr-only">Car: {current.name}</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          id={menuId}
          // Near-opaque so nothing underneath (the consent card, bright signs) reads through.
          style={{ backgroundColor: 'rgb(14 16 27 / 0.97)' }}
          className="glass-strong pointer-events-auto absolute right-0 top-full z-30 mt-2 w-[min(23rem,calc(100vw-2rem))] rounded-card p-3 shadow-panel animate-rise"
        >
          <p id={`${menuId}-label`} className="eyebrow px-1 text-fg-subtle">
            Garage
          </p>
          <div role="radiogroup" aria-labelledby={`${menuId}-label`} className="mt-2 space-y-1.5">
            {CAR_ORDER.map((id, index) => {
              const def = CARS[id];
              const stats = carStats(def);
              const checked = id === carId;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  data-car={id}
                  tabIndex={checked ? 0 : -1}
                  onClick={() => pick(id)}
                  onKeyDown={(event) => onRadioKey(event, index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors',
                    checked ? 'border-line-strong bg-white/[0.07]' : 'border-transparent hover:bg-white/[0.04]',
                  )}
                >
                  <span
                    className="relative flex h-[4.25rem] w-[7.5rem] shrink-0 items-end justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0c16]"
                    style={{ backgroundImage: `radial-gradient(120% 90% at 50% 110%, ${def.accent}2e, transparent 70%)` }}
                  >
                    <CarPreview id={id} className="h-[3.9rem] w-[7rem]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[14px] font-semibold text-fg">
                      {def.name}
                      {checked && <Check className="h-3.5 w-3.5" style={{ color: def.accent }} aria-hidden="true" />}
                    </span>
                    <span className="block text-[11.5px] leading-snug text-fg-muted">{def.tagline}</span>
                    <span className="sr-only">
                      {def.handling}. Speed {rating(stats.speed)} of 5, acceleration {rating(stats.acceleration)} of 5, turning {rating(stats.turning)} of 5.
                    </span>
                    <span aria-hidden="true" className="mt-1.5 flex flex-col gap-1">
                      <StatBar label="Speed" value={stats.speed} color={def.accent} />
                      <StatBar label="Accel" value={stats.acceleration} color={def.accent} />
                      <StatBar label="Turning" value={stats.turning} color={def.accent} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 px-1 text-[11.5px] leading-snug text-fg-subtle">
            {consent === 'granted' ? 'Your pick is remembered in this browser.' : 'Your pick lasts for this visit. Feed the data server RAM to keep it.'}
          </p>
        </div>
      )}
    </div>
  );
}
