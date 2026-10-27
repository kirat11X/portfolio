// Time-trial helpers: gate crossing, timing format and the local leaderboard.
// Pure functions so they can be unit tested.

import { RACE, gateEnds, type RaceGate } from '../config/layout';

/** Every gate of the lap in order: checkpoints, then the finish. */
export const RACE_GATES: RaceGate[] = [...RACE.checkpoints, RACE.finish];

/** Start pad: drive onto it (while no race is running) to start the countdown. */
export const RACE_START_PAD = { x: RACE.start.x, z: RACE.start.z, radius: 2.2 } as const;

function cross(ax: number, az: number, bx: number, bz: number): number {
  return ax * bz - az * bx;
}

/** True when segment p0→p1 intersects segment a→b (touching counts). */
export function segmentsIntersect(
  p0x: number,
  p0z: number,
  p1x: number,
  p1z: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): boolean {
  const rx = p1x - p0x;
  const rz = p1z - p0z;
  const sx = bx - ax;
  const sz = bz - az;
  const denom = cross(rx, rz, sx, sz);
  const qpx = ax - p0x;
  const qpz = az - p0z;
  if (Math.abs(denom) < 1e-12) return false; // parallel (incl. collinear): not a crossing
  const t = cross(qpx, qpz, sx, sz) / denom;
  const u = cross(qpx, qpz, rx, rz) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/** Did the car's path from (x0, z0) to (x1, z1) cross `gate` in its direction of travel? */
export function crossedGate(gate: RaceGate, x0: number, z0: number, x1: number, z1: number): boolean {
  const [[ax, az], [bx, bz]] = gateEnds(gate);
  if (!segmentsIntersect(x0, z0, x1, z1, ax, az, bx, bz)) return false;
  const fx = -Math.sin(gate.rotationY);
  const fz = -Math.cos(gate.rotationY);
  return (x1 - x0) * fx + (z1 - z0) * fz > 0;
}

/** "1:05.32" (m:ss.cc); hours never happen on one lap. */
export function formatRaceTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  const whole = Math.floor(rest);
  const hundredths = Math.min(99, Math.floor((rest - whole) * 100));
  return `${minutes}:${String(whole).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

/** Spoken form for screen readers: "1 minute 5.32 seconds". */
export function spokenRaceTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds - minutes * 60).toFixed(2);
  return minutes > 0 ? `${minutes} minute${minutes === 1 ? '' : 's'} ${rest} seconds` : `${rest} seconds`;
}

export interface LapEntry {
  name: string;
  /** Lap time in seconds. */
  time: number;
  /** When it was set (ms since epoch); breaks ties (earlier first). */
  at: number;
}

export interface RaceRecord {
  board: LapEntry[];
}

export const LEADERBOARD_SIZE = 5;
export const DEFAULT_RACER = 'You';

export function sortBoard(board: readonly LapEntry[]): LapEntry[] {
  return [...board].sort((a, b) => a.time - b.time || a.at - b.at);
}

/** Add a lap and keep the top five. `rank` is its 0-based place, or null if it did not make the board. */
export function insertLap(board: readonly LapEntry[], entry: LapEntry, size = LEADERBOARD_SIZE): { board: LapEntry[]; rank: number | null } {
  const sorted = sortBoard([...board, entry]).slice(0, size);
  const rank = sorted.indexOf(entry);
  return { board: sorted, rank: rank < 0 ? null : rank };
}

export function cleanName(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, 16).trim();
  return trimmed || DEFAULT_RACER;
}

export function isRaceRecord(value: unknown): value is RaceRecord {
  if (!value || typeof value !== 'object') return false;
  const board = (value as { board?: unknown }).board;
  return (
    Array.isArray(board) &&
    board.every(
      (e) =>
        e &&
        typeof e === 'object' &&
        typeof (e as LapEntry).name === 'string' &&
        Number.isFinite((e as LapEntry).time) &&
        (e as LapEntry).time > 0 &&
        Number.isFinite((e as LapEntry).at),
    )
  );
}
