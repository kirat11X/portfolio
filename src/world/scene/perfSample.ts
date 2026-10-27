// Latest dev-only render sample, written by <PerfProbe> and read by window.__world.perf().

export interface PerfSample {
  calls: number;
  triangles: number;
  /** Mean interval between frames (ms) over the last window. */
  frameMs: number;
  /** Mean main-thread time from the first frame callback to the end of the last render call (ms). */
  cpuMs: number;
  /** Worst frame interval in the last window (ms). */
  worstMs: number;
  programs: number;
  geometries: number;
  textures: number;
  dpr: number;
  quality: string;
  frames: number;
  /** Time the camera's one-off building measurement took (ms, behind the loader). */
  occluderMs: number;
}

export const perfSample: PerfSample = {
  calls: 0,
  triangles: 0,
  frameMs: 0,
  cpuMs: 0,
  worstMs: 0,
  programs: 0,
  geometries: 0,
  textures: 0,
  dpr: 1,
  quality: '',
  frames: 0,
  occluderMs: 0,
};
