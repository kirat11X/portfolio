import { WORLD_EXHIBITS } from '@/world/config/exhibits';
import {
  ARENA,
  AVENUES,
  BUILDING_LOTS,
  DISTRICTS,
  HUB_PROPS,
  ISLAND,
  LANDMARKS,
  PLAZAS,
  PORTALS,
  type DistrictId,
} from '@/world/config/layout';
import { cn } from '@/lib/cn';

// A schematic, top-down plan of the 3D district drawn from the same layout data
// the world is built from (world X → map x, world Z → map y, north up). It is an
// illustration, not a screenshot, and it carries no links: navigation lives in
// the buttons around it.

const MARGIN = 2;
const VIEW = {
  x: ISLAND.minX - MARGIN,
  z: ISLAND.minZ - MARGIN,
  w: ISLAND.maxX - ISLAND.minX + MARGIN * 2,
  h: ISLAND.maxZ - ISLAND.minZ + MARGIN * 2,
};
const VIEW_BOX = `${VIEW.x} ${VIEW.z} ${VIEW.w} ${VIEW.h}`;
const DEG = 180 / Math.PI;

type Tone = 'eng' | 'cre' | 'neutral';

const TONE: Record<DistrictId, Tone> = {
  hub: 'neutral',
  engineering: 'eng',
  creative: 'cre',
  about: 'neutral',
  gaming: 'neutral',
};

const plazaTint: Record<Tone, string> = {
  eng: 'fill-eng/[0.08] stroke-eng/55',
  cre: 'fill-cre/[0.09] stroke-cre/55',
  neutral: 'fill-contrast/[0.03] stroke-contrast/20',
};

const accentFill: Record<Tone, string> = {
  eng: 'fill-eng',
  cre: 'fill-cre',
  neutral: 'fill-fg-muted',
};

const labelTone: Record<Tone, string> = {
  eng: 'text-eng',
  cre: 'text-cre',
  neutral: 'text-fg-muted',
};

const LABELLED: Array<Exclude<DistrictId, 'hub'>> = ['engineering', 'creative', 'about', 'gaming'];

const DESCRIPTION =
  'Map of the 3D district. Two avenues cross at a central plaza: the engineering lab is to the west, the creative studio to the east, the archive (about, résumé and contact) to the north and the gaming zone to the south, with a car-soccer arena beyond it.';

/** Percentage position of a world coordinate inside the map. */
const pctX = (x: number) => `${((x - VIEW.x) / VIEW.w) * 100}%`;
const pctZ = (z: number) => `${((z - VIEW.z) / VIEW.h) * 100}%`;

const spawn = DISTRICTS.hub.spawn;

export function DistrictMap({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label={DESCRIPTION}
      className={cn('@container relative w-full select-none', className)}
      style={{ aspectRatio: VIEW.w / VIEW.h }}
    >
      <svg viewBox={VIEW_BOX} className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
        <rect
          x={ISLAND.minX}
          y={ISLAND.minZ}
          width={ISLAND.maxX - ISLAND.minX}
          height={ISLAND.maxZ - ISLAND.minZ}
          rx={ISLAND.cornerRadius}
          className="fill-ink-900 stroke-contrast/10"
          strokeWidth={0.3}
        />

        {BUILDING_LOTS.map((lot) => (
          <rect
            key={lot.id}
            x={lot.minX}
            y={lot.minZ}
            width={lot.maxX - lot.minX}
            height={lot.maxZ - lot.minZ}
            rx={0.8}
            className="fill-contrast/[0.035] stroke-contrast/[0.08]"
            strokeWidth={0.2}
          />
        ))}

        {[...AVENUES, ...ARENA.accessRoads].map((road) => (
          <rect
            key={`${road.minX}:${road.minZ}`}
            x={road.minX}
            y={road.minZ}
            width={road.maxX - road.minX}
            height={road.maxZ - road.minZ}
            className="fill-ink-800"
          />
        ))}
        <g className="stroke-contrast/20" strokeWidth={0.25} strokeDasharray="1.4 1.8">
          <line x1={0} y1={-33} x2={0} y2={33} />
          <line x1={-33} y1={0} x2={33} y2={0} />
        </g>

        <rect
          x={ARENA.pitch.minX}
          y={ARENA.pitch.minZ}
          width={ARENA.pitch.maxX - ARENA.pitch.minX}
          height={ARENA.pitch.maxZ - ARENA.pitch.minZ}
          className="fill-contrast/[0.03] stroke-contrast/15"
          strokeWidth={0.2}
        />
        <line x1={ARENA.pitch.minX} y1={ARENA.center.z} x2={ARENA.pitch.maxX} y2={ARENA.center.z} className="stroke-contrast/15" strokeWidth={0.2} />
        {ARENA.walls.map((wall) => (
          <rect key={wall.id} x={wall.minX} y={wall.minZ} width={wall.maxX - wall.minX} height={wall.maxZ - wall.minZ} className="fill-contrast/30" />
        ))}

        {PLAZAS.map((plaza) => (
          <g key={plaza.id}>
            <circle cx={plaza.x} cy={plaza.z} r={plaza.r} className="fill-ink-900" />
            <circle cx={plaza.x} cy={plaza.z} r={plaza.r} className={plazaTint[TONE[plaza.id]]} strokeWidth={0.3} />
          </g>
        ))}

        {Object.entries(LANDMARKS).map(([id, building]) => (
          <rect
            key={id}
            x={building.minX}
            y={building.minZ}
            width={building.maxX - building.minX}
            height={building.maxZ - building.minZ}
            rx={0.6}
            className="fill-ink-700 stroke-contrast/15"
            strokeWidth={0.2}
          />
        ))}

        {PORTALS.map((portal) => {
          // Doors span the building face: along Z on east/west fronts, along X on north/south fronts.
          const alongX = Math.abs(Math.sin(portal.rotationY)) < 0.5;
          return (
            <rect
              key={portal.id}
              x={portal.x - (alongX ? 1.2 : 0.35)}
              y={portal.z - (alongX ? 0.35 : 1.2)}
              width={alongX ? 2.4 : 0.7}
              height={alongX ? 0.7 : 2.4}
              rx={0.2}
              className={accentFill[TONE[portal.district]]}
            />
          );
        })}

        {WORLD_EXHIBITS.map((exhibit) => (
          <rect
            key={exhibit.id}
            x={-1.3}
            y={-0.28}
            width={2.6}
            height={0.56}
            rx={0.2}
            transform={`translate(${exhibit.slot.x} ${exhibit.slot.z}) rotate(${-exhibit.slot.rotationY * DEG})`}
            className={cn(accentFill[TONE[exhibit.district]], 'opacity-80')}
          />
        ))}

        <rect
          x={-HUB_PROPS.monolith.r * 0.7}
          y={-HUB_PROPS.monolith.r * 0.7}
          width={HUB_PROPS.monolith.r * 1.4}
          height={HUB_PROPS.monolith.r * 1.4}
          rx={0.3}
          transform="rotate(45)"
          className="fill-ink-700 stroke-contrast/40"
          strokeWidth={0.25}
        />
        {HUB_PROPS.signposts.map((post) => (
          <circle key={`${post.x}:${post.z}`} cx={post.x} cy={post.z} r={post.r} className="fill-contrast/35" />
        ))}

        {/* The vehicle at its starting spot, pointing the way it faces. */}
        <path
          d="M0 -1.7 L1.15 1.25 L0 0.6 L-1.15 1.25 Z"
          transform={`translate(${spawn.x} ${spawn.z}) rotate(${-spawn.heading * DEG})`}
          className="fill-fg"
        />
      </svg>

      {LABELLED.map((id) => {
        const district = DISTRICTS[id];
        return (
          <span
            key={id}
            className={cn(
              // Scales with the map (container units, never below 8px); the chip masks the plaza ring behind it.
              'absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-ink-900/90 px-[0.6em] py-[0.45em] font-mono text-[length:max(8px,2.5cqw)] font-medium uppercase leading-none tracking-[0.08em]',
              labelTone[TONE[id]],
            )}
            style={{ left: pctX(district.center[0]), top: pctZ(district.center[1]) }}
          >
            {district.shortLabel}
          </span>
        );
      })}
    </div>
  );
}
