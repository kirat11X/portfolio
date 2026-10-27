import { useEffect, type RefObject } from 'react';
import { useLoadingStore } from '@/lib/loadingStore';
import { useWorldStore } from '../state/worldStore';
import { clamp } from './physics';
import { runtime } from './runtime';
import { stopShowcase } from './showcase';
import { CAMERA, DRAG_THRESHOLD_PX } from './tuning';

type Gesture = 'none' | 'pending' | 'orbit' | 'pinch';

interface PointerControlsProps {
  active: boolean;
  /** Element wrapping the canvas; receives the listeners. */
  stageRef: RefObject<HTMLDivElement | null>;
}

/**
 * Mouse/touch camera input on top of R3F's own pointer events:
 * drag → orbit (azimuth ±0.75 rad, slight pitch), wheel / pinch → zoom.
 * A press that turned into a drag never becomes a click, so dragging across an
 * exhibit or the ground does not select it or start the autopilot. Also owns
 * the canvas cursor (pointer over interactables, grab/grabbing while orbiting).
 */
export function PointerControls({ active, stageRef }: PointerControlsProps) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!active || !stage) return;
    const canvas = stage.querySelector('canvas');
    const pointers = new Map<number, { x: number; y: number }>();
    let gesture: Gesture = 'none';
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;
    let pinchStart = 0;
    let pinchZoom = 1;
    let suppressClick = false;

    const enabled = () => useLoadingStore.getState().entered;
    const updateCursor = () => {
      const hovered = useWorldStore.getState().hoveredId;
      if (canvas) canvas.style.cursor = gesture === 'orbit' ? 'grabbing' : gesture === 'pending' ? 'grab' : hovered ? 'pointer' : '';
    };
    const pinchDistance = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };

    const onDown = (event: PointerEvent) => {
      if (!enabled()) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      // A press during the showcase only ends it; it must not also drive or select.
      suppressClick = stopShowcase();
      if (pointers.size === 1) {
        gesture = 'pending';
        downX = lastX = event.clientX;
        downY = lastY = event.clientY;
      } else if (pointers.size === 2) {
        gesture = 'pinch';
        suppressClick = true;
        pinchStart = pinchDistance();
        pinchZoom = runtime.camera.zoom;
      }
      updateCursor();
    };

    const onMove = (event: PointerEvent) => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (gesture === 'pending' && Math.hypot(event.clientX - downX, event.clientY - downY) > DRAG_THRESHOLD_PX) {
        gesture = 'orbit';
        suppressClick = true;
        runtime.camera.dragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
        updateCursor();
      }
      if (gesture === 'orbit') {
        const control = runtime.camera;
        control.orbit = clamp(control.orbit - (event.clientX - lastX) * 0.0055, -CAMERA.maxOrbit, CAMERA.maxOrbit);
        control.pitchOffset = clamp(
          control.pitchOffset + (event.clientY - lastY) * 0.0032,
          CAMERA.minPitchOffset,
          CAMERA.maxPitchOffset,
        );
        lastX = event.clientX;
        lastY = event.clientY;
      } else if (gesture === 'pinch' && pointers.size >= 2) {
        const distance = pinchDistance();
        if (pinchStart > 0 && distance > 0) {
          runtime.camera.zoom = clamp((pinchZoom * pinchStart) / distance, CAMERA.minZoom, CAMERA.maxZoom);
        }
      }
    };

    const onUp = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return;
      if (pointers.size === 0) {
        gesture = 'none';
        runtime.camera.dragging = false;
      } else if (gesture === 'pinch') {
        // One finger left after a pinch: continue as an orbit without a jump.
        const [rest] = [...pointers.values()];
        gesture = 'orbit';
        runtime.camera.dragging = true;
        lastX = rest.x;
        lastY = rest.y;
      }
      updateCursor();
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.stopPropagation();
      event.preventDefault();
    };

    const onWheel = (event: WheelEvent) => {
      if (!enabled()) return;
      event.preventDefault();
      if (stopShowcase()) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const deltaY = clamp(event.deltaY * unit, -240, 240);
      runtime.camera.zoom = clamp(runtime.camera.zoom * Math.exp(deltaY * 0.0012), CAMERA.minZoom, CAMERA.maxZoom);
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') runtime.pointer.inside = true;
    };
    const onLeave = () => {
      runtime.pointer.inside = false;
    };

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointerenter', onEnter);
    stage.addEventListener('pointerleave', onLeave);
    stage.addEventListener('click', onClickCapture, true);
    stage.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    const unsubscribe = useWorldStore.subscribe((state, previous) => {
      if (state.hoveredId !== previous.hoveredId) updateCursor();
    });
    updateCursor();

    return () => {
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointerenter', onEnter);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('click', onClickCapture, true);
      stage.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      unsubscribe();
      runtime.camera.dragging = false;
      runtime.pointer.inside = false;
      if (canvas) canvas.style.cursor = '';
    };
  }, [active, stageRef]);

  return null;
}
