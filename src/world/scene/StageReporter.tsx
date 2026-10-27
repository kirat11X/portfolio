import { useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useLoadingStore } from '@/lib/loadingStore';
import { useWorldStore, type QualityTier } from '../state/worldStore';

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Reports the truthful `world` → `shaders` → `frame` stages. Must sit inside the
 * same Suspense boundary as the city and the vehicle: its effect only runs once
 * everything in that boundary has committed.
 */
export function StageReporter() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const phase = useRef<'compiling' | 'compiled' | 'rendered' | 'done'>('compiling');

  useEffect(() => {
    const store = useLoadingStore.getState();
    store.complete('world');
    store.start('shaders');
    let cancelled = false;
    let compile: Promise<unknown>;
    try {
      compile = gl.compileAsync(scene, camera);
    } catch (error) {
      compile = Promise.reject(error);
    }
    compile.then(
      () => {
        if (cancelled) return;
        const loading = useLoadingStore.getState();
        loading.complete('shaders');
        loading.start('frame');
        phase.current = 'compiled';
      },
      (error: unknown) => {
        if (!cancelled) useLoadingStore.getState().fail('shaders', `The 3D world's shaders could not be compiled (${errorText(error)}).`);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);

  useFrame(() => {
    // useFrame runs before R3F renders, so the frame after "compiled" proves one was drawn.
    if (phase.current === 'compiled') phase.current = 'rendered';
    else if (phase.current === 'rendered') {
      phase.current = 'done';
      useLoadingStore.getState().complete('frame');
    }
  });

  return null;
}

/** A lost WebGL context ends the world; the host falls back to the classic view. */
export function ContextLossGuard() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = () => {
      // R3F also forces a context loss while unmounting, after the canvas left the page.
      if (!canvas.isConnected) return;
      useLoadingStore.getState().fail('frame', 'WebGL context lost');
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => canvas.removeEventListener('webglcontextlost', onLost);
  }, [gl]);
  return null;
}

const TIERS: QualityTier[] = ['low', 'medium', 'high'];

/** Pixel ratio below 1 used as the last step on devices that struggle even at 'low'. */
const MIN_DPR = 0.75;

/**
 * Steps the quality tier down when the frame rate stays low, and back up (never
 * above the device's starting tier) when it recovers. Below 'low' it drops the
 * pixel ratio as a last resort (and restores it first on recovery). drei stops
 * adjusting after a few flip-flops so the picture does not keep changing.
 */
export function QualityMonitor() {
  const ceiling = useRef(TIERS.indexOf(useWorldStore.getState().quality));
  const setDpr = useThree((s) => s.setDpr);
  const reduced = useRef(false);
  const shift = useCallback(
    (direction: -1 | 1) => {
      const { quality, setQuality } = useWorldStore.getState();
      const index = TIERS.indexOf(quality);
      if (direction < 0 && index === 0) {
        if (!reduced.current) {
          reduced.current = true;
          setDpr(Math.min(MIN_DPR, window.devicePixelRatio || 1));
        }
        return;
      }
      if (direction > 0 && reduced.current) {
        reduced.current = false;
        setDpr(1);
        return;
      }
      const next = Math.max(0, Math.min(ceiling.current, index + direction));
      if (next !== index) setQuality(TIERS[next]);
    },
    [setDpr],
  );
  const onDecline = useCallback(() => shift(-1), [shift]);
  const onIncline = useCallback(() => shift(1), [shift]);
  return <PerformanceMonitor iterations={10} ms={250} threshold={0.75} flipflops={3} onDecline={onDecline} onIncline={onIncline} />;
}
