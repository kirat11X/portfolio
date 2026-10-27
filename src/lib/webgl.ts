let cached: boolean | undefined;

/** True when the browser can create a WebGL2 or WebGL1 context. Cached. */
export function hasWebGL(): boolean {
  if (cached !== undefined) return cached;
  if (typeof document === 'undefined') return (cached = false);
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGLRenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    cached = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}
