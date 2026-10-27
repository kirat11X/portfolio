import { useEffect, type RefObject } from 'react';
import { useReducedMotion } from '@/lib/motion';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

interface ExhibitHoverOptions {
  /** Maximum rotation in degrees at the card's edges. */
  maxTilt?: number;
}

/**
 * Gives a card the feel of a physical exhibit: a slight tilt toward the pointer
 * and a soft light that follows it. Only for precise pointers that can hover,
 * and never when reduced motion is requested (OS setting or the in-app toggle).
 *
 * The hook writes CSS custom properties (`--tilt-x`, `--tilt-y`, `--glow-x`,
 * `--glow-y`) and `data-fx="on"` straight onto the element, so pointer movement
 * never re-renders React. Styling lives with the component.
 */
export function useExhibitHover<T extends HTMLElement>(ref: RefObject<T | null>, { maxTilt = 2.4 }: ExhibitHoverOptions = {}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || reduced || typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia(FINE_POINTER);
    let frame = 0;
    let attached = false;

    const reset = () => {
      cancelAnimationFrame(frame);
      element.style.setProperty('--tilt-x', '0deg');
      element.style.setProperty('--tilt-y', '0deg');
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        const y = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
        // The edge nearest the pointer dips away slightly, like pressing on a mounted print.
        element.style.setProperty('--tilt-x', `${((0.5 - y) * 2 * maxTilt).toFixed(2)}deg`);
        element.style.setProperty('--tilt-y', `${((x - 0.5) * 2 * maxTilt).toFixed(2)}deg`);
        element.style.setProperty('--glow-x', `${(x * 100).toFixed(1)}%`);
        element.style.setProperty('--glow-y', `${(y * 100).toFixed(1)}%`);
      });
    };

    const attach = () => {
      if (attached) return;
      attached = true;
      element.dataset.fx = 'on';
      element.addEventListener('pointermove', onPointerMove);
      element.addEventListener('pointerleave', reset);
    };

    const detach = () => {
      if (!attached) return;
      attached = false;
      delete element.dataset.fx;
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerleave', reset);
      reset();
    };

    const sync = () => (media.matches ? attach() : detach());
    sync();
    media.addEventListener('change', sync);

    return () => {
      media.removeEventListener('change', sync);
      detach();
    };
  }, [ref, reduced, maxTilt]);
}
