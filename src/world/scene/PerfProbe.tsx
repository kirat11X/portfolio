// Development-only performance readout for the real world (not the city preview).
// Counts draw calls / triangles over every pass of a frame (scene + post),
// CPU time spent in R3F callbacks + renderer calls, and the frame interval.
//   window.__world.perf()        → latest averaged sample
//   ?perf=1 in the URL           → small on-screen overlay
// Mounted by World.tsx only when import.meta.env.DEV.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { WebGLRenderer } from 'three';
import { useWorldStore } from '../state/worldStore';
import { perfSample } from './perfSample';

const WINDOW = 30;

/** Wraps renderer.render once so the probe knows when the last pass of a frame ended. */
function instrument(gl: WebGLRenderer, onRender: () => void): () => void {
  const original = gl.render;
  gl.render = function render(this: WebGLRenderer, ...args: Parameters<WebGLRenderer['render']>) {
    original.apply(this, args);
    onRender();
  };
  return () => {
    gl.render = original;
  };
}

export function PerfProbe() {
  const get = useThree((s) => s.get);
  const acc = useRef({ start: 0, lastRenderEnd: 0, prevStart: 0, sumFrame: 0, sumCpu: 0, worst: 0, n: 0, calls: 0, tris: 0 });

  useEffect(() => {
    const gl = get().gl;
    const autoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    const restore = instrument(gl, () => {
      acc.current.lastRenderEnd = performance.now();
    });
    return () => {
      restore();
      gl.info.autoReset = autoReset;
    };
  }, [get]);

  // Runs before every other callback: closes the previous frame and opens the next.
  useFrame(({ gl }) => {
    const a = acc.current;
    const now = performance.now();
    if (a.prevStart > 0) {
      const interval = now - a.prevStart;
      a.sumFrame += interval;
      a.worst = Math.max(a.worst, interval);
      a.sumCpu += Math.max(0, a.lastRenderEnd - a.start);
      a.calls = gl.info.render.calls;
      a.tris = gl.info.render.triangles;
      a.n++;
      if (a.n >= WINDOW) {
        perfSample.frameMs = a.sumFrame / a.n;
        perfSample.cpuMs = a.sumCpu / a.n;
        perfSample.worstMs = a.worst;
        perfSample.calls = a.calls;
        perfSample.triangles = a.tris;
        perfSample.programs = gl.info.programs?.length ?? 0;
        perfSample.geometries = gl.info.memory.geometries;
        perfSample.textures = gl.info.memory.textures;
        perfSample.dpr = gl.getPixelRatio();
        perfSample.quality = useWorldStore.getState().quality;
        perfSample.frames += a.n;
        a.sumFrame = 0;
        a.sumCpu = 0;
        a.worst = 0;
        a.n = 0;
      }
    }
    gl.info.reset();
    a.prevStart = now;
    a.start = now;
  }, -1000);

  return null;
}

/** `?perf=1` overlay (HTML, outside the canvas). */
export function PerfOverlay() {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = perfSample;
      if (ref.current) {
        ref.current.textContent =
          `${s.quality} dpr ${s.dpr.toFixed(2)}  ${(1000 / (s.frameMs || 1)).toFixed(0)} fps\n` +
          `frame ${s.frameMs.toFixed(1)} ms  worst ${s.worstMs.toFixed(1)}  cpu ${s.cpuMs.toFixed(1)}\n` +
          `calls ${s.calls}  tris ${(s.triangles / 1000).toFixed(0)}k  prog ${s.programs}  tex ${s.textures}`;
      }
    }, 500);
    return () => window.clearInterval(id);
  }, []);
  return (
    <pre
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed bottom-2 left-2 z-[60] m-0 rounded bg-black/70 px-2 py-1 font-mono text-[11px] leading-snug text-slate-300"
    />
  );
}
