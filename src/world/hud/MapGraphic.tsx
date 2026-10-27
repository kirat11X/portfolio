import { useEffect, useRef, type MouseEvent } from 'react';
import { WORLD_EXHIBITS } from '../config/exhibits';
import { ARENA, AVENUES, BUILDING_LOTS, DISTRICTS, DISTRICT_ORDER, INTERACTIVE_SPOTS, ISLAND, LANDMARKS, PLAZAS, PORTALS, type DistrictId } from '../config/layout';
import { DISTRICT_INFO, portalShortLabel } from '../scene/destinations';
import { RACE_GATES, RACE_START_PAD } from '../game/raceLogic';
import { useRaceStore } from '../game/raceStore';
import { soccer } from '../game/soccerStore';
import { runtime } from '../scene/runtime';
import { vehiclePose } from '../state/worldStore';

const PAD = 3;
const VIEW = { x: ISLAND.minX - PAD, z: ISLAND.minZ - PAD, w: ISLAND.maxX - ISLAND.minX + PAD * 2, h: ISLAND.maxZ - ISLAND.minZ + PAD * 2 };
const VIEWBOX = `${VIEW.x} ${VIEW.z} ${VIEW.w} ${VIEW.h}`;
/** Width / height of the map (the svg sets it as its CSS aspect-ratio). */
const MAP_ASPECT = VIEW.w / VIEW.h;
const INK = '#07080e';

/** Where each district's name sits: a little off-centre so it does not cover the plaza marker. */
/** Door label placement: [dx, dz, anchor] relative to the door. */
const DOOR_LABEL: Record<string, [number, number, 'start' | 'middle' | 'end']> = {
  'portal:engineering': [3.4, -2.2, 'start'],
  'portal:creative': [-3.4, -2.2, 'end'],
  'portal:about': [-0.6, 3.4, 'end'],
  'portal:resume': [0, 5.8, 'middle'],
  'portal:contact': [0.6, 3.4, 'start'],
};

const LABEL_AT: Record<DistrictId, [number, number]> = {
  hub: [0, 6.2],
  engineering: [-24, -10.4],
  creative: [24, -10.4],
  about: [0, -14.6],
  gaming: [0, 14.8],
};

interface MapGraphicProps {
  /** Full map: full names, subtitles and door labels. Compact: short names. */
  detailed?: boolean;
  onDistrict?: (id: DistrictId) => void;
  /** Clicks on the island that are not a district. */
  onGround?: (x: number, z: number) => void;
  className?: string;
}

/** Top-down map of the island with a live vehicle arrow. Decorative to assistive tech. */
export function MapGraphic({ detailed = false, onDistrict, onGround, className }: MapGraphicProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const targetRef = useRef<SVGCircleElement>(null);
  const ballRef = useRef<SVGCircleElement>(null);
  const gateRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      carRef.current?.setAttribute(
        'transform',
        `translate(${vehiclePose.x.toFixed(2)} ${vehiclePose.z.toFixed(2)}) rotate(${((-vehiclePose.heading * 180) / Math.PI).toFixed(1)})`,
      );
      const target = targetRef.current;
      if (target) {
        const { active, targetX, targetZ } = runtime.autopilot;
        target.setAttribute('visibility', active ? 'visible' : 'hidden');
        target.setAttribute('cx', targetX.toFixed(2));
        target.setAttribute('cy', targetZ.toFixed(2));
      }
      ballRef.current?.setAttribute('transform', `translate(${soccer.ball.x.toFixed(2)} ${soccer.ball.z.toFixed(2)})`);
      const gateMarker = gateRef.current;
      if (gateMarker) {
        const race = useRaceStore.getState();
        const gate = race.phase === 'countdown' || race.phase === 'running' ? RACE_GATES[race.next] : null;
        gateMarker.setAttribute('visibility', gate ? 'visible' : 'hidden');
        if (gate) gateMarker.setAttribute('transform', `translate(${gate.x} ${gate.z})`);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const onClick = (event: MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = VIEW.x + ((event.clientX - rect.left) / rect.width) * VIEW.w;
    const z = VIEW.z + ((event.clientY - rect.top) / rect.height) * VIEW.h;
    const plaza = PLAZAS.find((p) => Math.hypot(x - p.x, z - p.z) <= p.r + 1);
    if (plaza && onDistrict) onDistrict(plaza.id);
    else onGround?.(x, z);
  };

  const nameSize = detailed ? 2.7 : 3.6;
  const textStyle = { paintOrder: 'stroke' as const, stroke: INK, strokeWidth: detailed ? 0.9 : 1.1, strokeLinejoin: 'round' as const };

  return (
    <svg
      ref={svgRef}
      viewBox={VIEWBOX}
      aria-hidden="true"
      className={className}
      onClick={onDistrict || onGround ? onClick : undefined}
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', aspectRatio: MAP_ASPECT }}
    >
      <rect
        x={ISLAND.minX}
        y={ISLAND.minZ}
        width={ISLAND.maxX - ISLAND.minX}
        height={ISLAND.maxZ - ISLAND.minZ}
        rx={ISLAND.cornerRadius}
        fill="rgb(255 255 255 / 0.035)"
        stroke="rgb(255 255 255 / 0.18)"
        strokeWidth={0.5}
      />
      {AVENUES.map((a, i) => (
        <rect key={i} x={a.minX} y={a.minZ} width={a.maxX - a.minX} height={a.maxZ - a.minZ} fill="rgb(255 255 255 / 0.08)" />
      ))}
      {AVENUES.map((a, i) =>
        i === 0 ? (
          <line key={`c${i}`} x1={0} y1={a.minZ} x2={0} y2={a.maxZ} stroke="rgb(255 255 255 / 0.18)" strokeWidth={0.25} strokeDasharray="1.4 1.4" />
        ) : (
          <line key={`c${i}`} x1={a.minX} y1={0} x2={a.maxX} y2={0} stroke="rgb(255 255 255 / 0.18)" strokeWidth={0.25} strokeDasharray="1.4 1.4" />
        ),
      )}
      {ARENA.accessRoads.map((a, i) => (
        <rect key={`road${i}`} x={a.minX} y={a.minZ} width={a.maxX - a.minX} height={a.maxZ - a.minZ} fill="rgb(255 255 255 / 0.08)" />
      ))}
      <rect
        x={ARENA.pitch.minX}
        y={ARENA.pitch.minZ}
        width={ARENA.pitch.maxX - ARENA.pitch.minX}
        height={ARENA.pitch.maxZ - ARENA.pitch.minZ}
        fill={DISTRICTS.gaming.accent}
        fillOpacity={0.06}
      />
      <line x1={ARENA.pitch.minX} y1={ARENA.center.z} x2={ARENA.pitch.maxX} y2={ARENA.center.z} stroke="rgb(255 255 255 / 0.25)" strokeWidth={0.25} />
      <circle cx={ARENA.center.x} cy={ARENA.center.z} r={4.2} fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth={0.25} />
      {ARENA.walls.map((w) => (
        <rect key={w.id} x={w.minX} y={w.minZ} width={w.maxX - w.minX} height={w.maxZ - w.minZ} fill={DISTRICTS.gaming.accent} fillOpacity={0.75} />
      ))}
      <circle ref={ballRef} cx={0} cy={0} r={ARENA.ballRadius} fill="#f2f4f8" opacity={0.9} transform={`translate(${ARENA.ballSpawn.x} ${ARENA.ballSpawn.z})`} />
      <circle cx={RACE_START_PAD.x} cy={RACE_START_PAD.z} r={RACE_START_PAD.radius} fill="none" stroke={DISTRICTS.gaming.accent} strokeWidth={0.45} strokeDasharray="0.9 0.6" />
      {detailed && (
        <text x={RACE_START_PAD.x - 3.2} y={RACE_START_PAD.z + 0.7} textAnchor="end" fontSize={1.75} fontWeight={600} fill={DISTRICTS.gaming.accent} style={textStyle}>
          Race start
        </text>
      )}
      {detailed && (
        <text x={ARENA.center.x} y={ARENA.pitch.minZ + 6.5} textAnchor="middle" fontSize={2.2} fontWeight={600} fill={DISTRICTS.gaming.accent} style={textStyle}>
          Car-soccer arena
        </text>
      )}
      {BUILDING_LOTS.map((lot) => (
        <rect key={lot.id} x={lot.minX} y={lot.minZ} width={lot.maxX - lot.minX} height={lot.maxZ - lot.minZ} rx={0.8} fill="rgb(255 255 255 / 0.09)" />
      ))}
      {Object.entries(LANDMARKS).map(([id, l]) => (
        <rect
          key={id}
          x={l.minX}
          y={l.minZ}
          width={l.maxX - l.minX}
          height={l.maxZ - l.minZ}
          rx={0.8}
          fill="rgb(255 255 255 / 0.13)"
          stroke={DISTRICTS[id as DistrictId].accent}
          strokeOpacity={0.5}
          strokeWidth={0.35}
        />
      ))}
      {PLAZAS.map((p) => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.z}
          r={p.r}
          fill={DISTRICTS[p.id].accent}
          fillOpacity={0.06}
          stroke={DISTRICTS[p.id].accent}
          strokeOpacity={0.7}
          strokeWidth={0.5}
          className={onDistrict ? 'cursor-pointer' : undefined}
        />
      ))}
      <circle cx={0} cy={0} r={1.8} fill="rgb(255 255 255 / 0.5)" />
      {WORLD_EXHIBITS.map((e) => (
        <rect
          key={e.id}
          x={e.slot.x - 0.8}
          y={e.slot.z - 0.8}
          width={1.6}
          height={1.6}
          rx={0.3}
          fill={DISTRICTS[e.district].accent}
          opacity={0.9}
          transform={`rotate(${(-e.slot.rotationY * 180) / Math.PI} ${e.slot.x} ${e.slot.z})`}
        />
      ))}
      {INTERACTIVE_SPOTS.map((spot) => (
        <circle key={spot.id} cx={spot.x} cy={spot.z} r={spot.radius} fill={DISTRICTS.gaming.accent} opacity={0.9} />
      ))}
      {PORTALS.map((portal) => {
        const [dx, dz, anchor] = DOOR_LABEL[portal.id] ?? [0, 3, 'middle'];
        const accent = DISTRICTS[portal.district].accent;
        return (
          <g key={portal.id}>
            <rect
              x={portal.x - 1.2}
              y={portal.z - 0.6}
              width={2.4}
              height={1.2}
              rx={0.3}
              fill={accent}
              transform={`rotate(${(-portal.rotationY * 180) / Math.PI} ${portal.x} ${portal.z})`}
            />
            {detailed && (
              <text
                x={portal.x + dx}
                y={portal.z + dz + 0.6}
                textAnchor={anchor}
                fontSize={1.75}
                fontWeight={600}
                fill={accent}
                style={textStyle}
              >
                {portalShortLabel(portal.id)} door
              </text>
            )}
          </g>
        );
      })}
      {DISTRICT_ORDER.map((id) => {
        const [x, y] = LABEL_AT[id];
        return (
          <g key={id} pointerEvents="none">
            <text x={x} y={y} textAnchor="middle" fontSize={nameSize} fontWeight={700} fill="#f2f4f8" style={textStyle}>
              {detailed ? DISTRICTS[id].label : DISTRICTS[id].shortLabel}
            </text>
            {detailed && (
              <text x={x} y={y + 2.6} textAnchor="middle" fontSize={1.85} fontWeight={500} fill={DISTRICTS[id].accent} style={textStyle}>
                {DISTRICT_INFO[id].subtitle}
              </text>
            )}
          </g>
        );
      })}
      <g transform={`translate(${VIEW.x + VIEW.w - 4.5} ${VIEW.z + 4.5})`} pointerEvents="none">
        <circle r={3.2} fill={INK} fillOpacity={0.8} stroke="rgb(255 255 255 / 0.3)" strokeWidth={0.3} />
        <path d="M0 -2.4 L1.1 0.3 L0 -0.3 L-1.1 0.3 Z" fill="#3ee0ff" />
        <text y={2.3} textAnchor="middle" fontSize={1.9} fontWeight={700} fill="#f2f4f8">
          N
        </text>
      </g>
      <circle ref={gateRef} r={2.6} fill="none" stroke="#ffb547" strokeWidth={0.7} visibility="hidden" />
      <circle ref={targetRef} r={1.4} fill="none" stroke="#3ee0ff" strokeWidth={0.5} visibility="hidden" />
      <g ref={carRef} pointerEvents="none">
        <circle r={3.4} fill="#3ee0ff" opacity={0.2} />
        <path d="M0 -2.8 L2 2.1 L0 1.1 L-2 2.1 Z" fill="#f2f4f8" stroke={INK} strokeWidth={0.4} strokeLinejoin="round" />
      </g>
    </svg>
  );
}
