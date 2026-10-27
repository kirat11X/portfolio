// Click-to-drive routing. A coarse occupancy grid of the island (colliders
// inflated by the vehicle radius) is searched with A*, then the path is
// string-pulled into a few straight legs the autopilot can follow smoothly.

import type { Collider } from '../config/colliders';
import { ISLAND, insideIsland } from '../config/layout';
import type { Waypoint } from './runtime';

const CELL = 0.5;
// A square grid covering the island's bounding rectangle (the island is not
// symmetric about the hub, so each axis has its own origin).
const ORIGIN_X = ISLAND.minX;
const ORIGIN_Z = ISLAND.minZ;
const N = Math.ceil(Math.max(ISLAND.maxX - ISLAND.minX, ISLAND.maxZ - ISLAND.minZ) / CELL);

export interface NavGrid {
  blocked: Uint8Array;
  colliders: readonly Collider[];
}

const cellCenterX = (i: number) => ORIGIN_X + (i + 0.5) * CELL;
const cellCenterZ = (i: number) => ORIGIN_Z + (i + 0.5) * CELL;
const cellIndexX = (v: number) => Math.min(N - 1, Math.max(0, Math.floor((v - ORIGIN_X) / CELL)));
const cellIndexZ = (v: number) => Math.min(N - 1, Math.max(0, Math.floor((v - ORIGIN_Z) / CELL)));

/** Rasterise colliders (inflated by `inflate`) and the island edge into a grid. */
export function buildNavGrid(colliders: readonly Collider[], inflate: number, edgeMargin = ISLAND.driveMargin + 0.2): NavGrid {
  const blocked = new Uint8Array(N * N);
  for (let iz = 0; iz < N; iz++) {
    const z = cellCenterZ(iz);
    for (let ix = 0; ix < N; ix++) {
      if (!insideIsland(cellCenterX(ix), z, edgeMargin)) blocked[iz * N + ix] = 1;
    }
  }
  for (const c of colliders) {
    const minX = c.kind === 'box' ? c.minX : c.x - c.r;
    const maxX = c.kind === 'box' ? c.maxX : c.x + c.r;
    const minZ = c.kind === 'box' ? c.minZ : c.z - c.r;
    const maxZ = c.kind === 'box' ? c.maxZ : c.z + c.r;
    const ix0 = cellIndexX(minX - inflate);
    const ix1 = cellIndexX(maxX + inflate);
    const iz0 = cellIndexZ(minZ - inflate);
    const iz1 = cellIndexZ(maxZ + inflate);
    for (let iz = iz0; iz <= iz1; iz++) {
      const z = cellCenterZ(iz);
      for (let ix = ix0; ix <= ix1; ix++) {
        const x = cellCenterX(ix);
        let inside: boolean;
        if (c.kind === 'box') {
          const dx = Math.max(c.minX - x, 0, x - c.maxX);
          const dz = Math.max(c.minZ - z, 0, z - c.maxZ);
          inside = dx * dx + dz * dz < inflate * inflate;
        } else {
          const reach = c.r + inflate;
          inside = (x - c.x) ** 2 + (z - c.z) ** 2 < reach * reach;
        }
        if (inside) blocked[iz * N + ix] = 1;
      }
    }
  }
  return { blocked, colliders };
}

function isBlockedAt(grid: NavGrid, x: number, z: number): boolean {
  return grid.blocked[cellIndexZ(z) * N + cellIndexX(x)] === 1;
}

/** Nearest free cell to `start` (breadth-first over rings), or -1. */
function nearestFree(grid: NavGrid, start: number, maxRadius = 14): number {
  if (!grid.blocked[start]) return start;
  const sx = start % N;
  const sz = Math.floor(start / N);
  for (let radius = 1; radius <= maxRadius; radius++) {
    let best = -1;
    let bestD = Infinity;
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        const x = sx + dx;
        const z = sz + dz;
        if (x < 0 || z < 0 || x >= N || z >= N) continue;
        const index = z * N + x;
        if (grid.blocked[index]) continue;
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = index;
        }
      }
    }
    if (best !== -1) return best;
  }
  return -1;
}

/** Closest drivable point to (x, z) according to the grid. */
export function nearestDrivable(grid: NavGrid, x: number, z: number): [number, number] | null {
  const start = cellIndexZ(z) * N + cellIndexX(x);
  if (!grid.blocked[start]) return [x, z];
  const free = nearestFree(grid, start);
  if (free === -1) return null;
  return [cellCenterX(free % N), cellCenterZ(Math.floor(free / N))];
}

/** True when a straight drive from a to b crosses no blocked cell. */
export function lineOfSight(grid: NavGrid, ax: number, az: number, bx: number, bz: number): boolean {
  const length = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(1, Math.ceil(length / (CELL * 0.5)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isBlockedAt(grid, ax + (bx - ax) * t, az + (bz - az) * t)) return false;
  }
  return true;
}

// Reused A* buffers (one search at a time, on click).
const gScore = new Float32Array(N * N);
const fScore = new Float32Array(N * N);
const parent = new Int32Array(N * N);
const state = new Uint8Array(N * N); // 0 unseen, 1 open, 2 closed
const heap: number[] = [];

function heapPush(node: number) {
  heap.push(node);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (fScore[heap[p]] <= fScore[heap[i]]) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}

function heapPop(): number {
  const top = heap[0];
  const last = heap.pop() as number;
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && fScore[heap[l]] < fScore[heap[m]]) m = l;
      if (r < heap.length && fScore[heap[r]] < fScore[heap[m]]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  }
  return top;
}

const SQRT2 = Math.SQRT2;

function octile(a: number, b: number): number {
  const dx = Math.abs((a % N) - (b % N));
  const dz = Math.abs(Math.floor(a / N) - Math.floor(b / N));
  return dx + dz + (SQRT2 - 2) * Math.min(dx, dz);
}

/**
 * Route from (sx, sz) to (tx, tz). Returns waypoints after the start (the last
 * one is the goal), or null when no route exists.
 */
export function findPath(grid: NavGrid, sx: number, sz: number, tx: number, tz: number): Waypoint[] | null {
  if (lineOfSight(grid, sx, sz, tx, tz) && !isBlockedAt(grid, tx, tz)) return [{ x: tx, z: tz }];

  const start = nearestFree(grid, cellIndexZ(sz) * N + cellIndexX(sx));
  const goal = nearestFree(grid, cellIndexZ(tz) * N + cellIndexX(tx));
  if (start === -1 || goal === -1) return null;

  state.fill(0);
  heap.length = 0;
  gScore[start] = 0;
  fScore[start] = octile(start, goal);
  parent[start] = -1;
  state[start] = 1;
  heapPush(start);

  let found = false;
  while (heap.length > 0) {
    const current = heapPop();
    if (state[current] === 2) continue;
    if (current === goal) {
      found = true;
      break;
    }
    state[current] = 2;
    const cx = current % N;
    const cz = Math.floor(current / N);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
        const next = nz * N + nx;
        if (grid.blocked[next] || state[next] === 2) continue;
        // No corner cutting.
        if (dx !== 0 && dz !== 0 && (grid.blocked[cz * N + nx] || grid.blocked[nz * N + cx])) continue;
        const tentative = gScore[current] + (dx !== 0 && dz !== 0 ? SQRT2 : 1);
        if (state[next] === 1 && tentative >= gScore[next]) continue;
        gScore[next] = tentative;
        fScore[next] = tentative + octile(next, goal);
        parent[next] = current;
        state[next] = 1;
        heapPush(next);
      }
    }
  }
  if (!found) return null;

  const cells: number[] = [];
  for (let node = goal; node !== -1; node = parent[node]) cells.push(node);
  cells.reverse();

  // String-pull: from each anchor, jump to the farthest cell still in sight.
  const points: Waypoint[] = cells.map((cell) => ({ x: cellCenterX(cell % N), z: cellCenterZ(Math.floor(cell / N)) }));
  const goalFree = !isBlockedAt(grid, tx, tz);
  points[points.length - 1] = goalFree ? { x: tx, z: tz } : points[points.length - 1];

  const result: Waypoint[] = [];
  let ax = sx;
  let az = sz;
  let i = 0;
  while (i < points.length - 1) {
    let j = i + 1;
    while (j + 1 < points.length && lineOfSight(grid, ax, az, points[j + 1].x, points[j + 1].z)) j++;
    result.push(points[j]);
    ax = points[j].x;
    az = points[j].z;
    i = j;
  }
  if (result.length === 0) result.push(points[points.length - 1]);
  return result;
}
