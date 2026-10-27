import { FLOOR, SKYLINE } from './scenery';

/**
 * The night-district backdrop, anchored to the bottom of the sign: a horizon
 * glow with a slow cyan → violet drift, a distant skyline, the horizon line and
 * a perspective street grid rolling toward the viewer. CSS + static SVG only.
 */
export function Horizon() {
  return (
    <div className="ldr-horizon" aria-hidden="true">
      <div className="ldr-glow" />
      <div className="ldr-glow ldr-glow--alt" />
      <div className="ldr-floor">
        <div className="ldr-floor-grid">
          <svg viewBox={`0 0 ${FLOOR.width} ${FLOOR.height}`} preserveAspectRatio="xMidYMin slice" focusable="false">
            <path className="ldr-floor-lines" d={FLOOR.spokes} vectorEffect="non-scaling-stroke" />
            <path className="ldr-floor-lines" d={FLOOR.rows} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>
      <svg
        className="ldr-skyline"
        viewBox={`0 0 ${SKYLINE.width} ${SKYLINE.height}`}
        preserveAspectRatio="xMidYMax meet"
        focusable="false"
      >
        <path className="ldr-skyline-body" d={SKYLINE.body} />
        <path className="ldr-skyline-lit" d={SKYLINE.windows} />
        <path className="ldr-skyline-lit-alt" d={SKYLINE.windowsAlt} />
      </svg>
      <div className="ldr-horizon-line" />
    </div>
  );
}
