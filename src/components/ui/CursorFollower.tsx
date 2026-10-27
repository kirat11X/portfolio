import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/motion';
import './cursor.css';

// A sci-fi targeting reticle that trails the pointer. Purely decorative: the
// native cursor stays visible, it's aria-hidden, and it only runs for fine
// pointers (mouse/trackpad) when motion isn't reduced. Over anything clickable
// — links, buttons, or 3D objects that set a pointer cursor — it "locks on":
// the brackets tighten around a larger frame. Clicks emit a short ripple.

const INTERACTIVE = 'a[href], button, [role="button"], input, select, textarea, label, summary, [tabindex]:not([tabindex="-1"])';

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(INTERACTIVE)) return true;
  // The 3D world sets cursor:pointer on its canvas over exhibits, doors and badges.
  return getComputedStyle(target).cursor === 'pointer';
}

function useFinePointer(): boolean {
  const [fine, setFine] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFine(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return fine;
}

export function CursorFollower() {
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const enabled = fine && !reduced;
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const ripples = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const dotEl = dot.current;
    const ringEl = ring.current;
    const rippleHost = ripples.current;
    if (!dotEl || !ringEl || !rippleHost) return;

    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let lock = 0;
    let lockTarget = 0;
    let visible = false;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const follow = 1 - Math.exp(-dt * 18);
      rx += (x - rx) * follow;
      ry += (y - ry) * follow;
      lock += (lockTarget - lock) * (1 - Math.exp(-dt * 14));
      const size = 30 + lock * 18;
      ringEl.style.transform = `translate3d(${rx - size / 2}px, ${ry - size / 2}px, 0) rotate(${lock * 45}deg)`;
      ringEl.style.width = ringEl.style.height = `${size}px`;
      ringEl.style.setProperty('--lock', lock.toFixed(3));
      dotEl.style.transform = `translate3d(${x - 3}px, ${y - 3}px, 0)`;
      frame = requestAnimationFrame(tick);
    };

    const show = (on: boolean) => {
      if (visible === on) return;
      visible = on;
      dotEl.style.opacity = ringEl.style.opacity = on ? '1' : '0';
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      x = event.clientX;
      y = event.clientY;
      if (!visible) {
        rx = x;
        ry = y;
      }
      show(true);
    };
    const onOver = (event: PointerEvent) => {
      lockTarget = isInteractive(event.target) ? 1 : 0;
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      const ripple = document.createElement('span');
      ripple.className = 'cursor-ripple';
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      rippleHost.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    };
    // The canvas changes its own cursor without pointerover firing; re-check on move.
    const onMoveCheck = (event: PointerEvent) => {
      if (event.target instanceof HTMLCanvasElement) lockTarget = isInteractive(event.target) ? 1 : 0;
    };
    const onLeave = () => show(false);

    frame = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointermove', onMoveCheck, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointermove', onMoveCheck);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[95] print:hidden">
      <div ref={ripples} />
      <div ref={ring} className="cursor-ring" style={{ opacity: 0 }}>
        <span className="cursor-bracket cursor-bracket-tl" />
        <span className="cursor-bracket cursor-bracket-tr" />
        <span className="cursor-bracket cursor-bracket-bl" />
        <span className="cursor-bracket cursor-bracket-br" />
      </div>
      <div ref={dot} className="cursor-dot" style={{ opacity: 0 }} />
    </div>
  );
}
