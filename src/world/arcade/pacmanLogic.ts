// Pure rules for "Pac-Maze": an original 19×21 tile maze, a chomper, four
// ghosts with distinct targeting, pellets, power pellets, lives and levels.
// Entities move tile-to-tile; `progress` (0..1) interpolates toward the next
// tile so the view can render smoothly. No DOM here.

export const MAZE_TEMPLATE = [
  '###################',
  '#o.......#.......o#',
  '#.##.###.#.###.##.#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.###.#.###.####',
  '####.#.......#.####',
  '####.#.##-##.#.####',
  '  ....#GGGGG#....  ',
  '####.#.#####.#.####',
  '####.#.......#.####',
  '####.#.#####.#.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
] as const;

export const MAZE_COLS = MAZE_TEMPLATE[0].length;
export const MAZE_ROWS = MAZE_TEMPLATE.length;

export type Tile = 'wall' | 'empty' | 'pellet' | 'power' | 'door' | 'house';
export type Dir = 'up' | 'down' | 'left' | 'right';
export type Vec = { x: number; y: number };

export const DIRS: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
/** Tie-break order when two moves are equally good (classic up > left > down > right). */
export const DIR_ORDER: Dir[] = ['up', 'left', 'down', 'right'];
export const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const PLAYER_START: Vec = { x: 9, y: 15 };
export const HOUSE_EXIT: Vec = { x: 9, y: 7 };
export const HOUSE_CENTER: Vec = { x: 9, y: 9 };
export const TUNNEL_ROW = 9;

export type Maze = Tile[][];

export function parseMaze(template: readonly string[] = MAZE_TEMPLATE): Maze {
  return template.map((row) =>
    [...row].map((char): Tile => {
      switch (char) {
        case '#':
          return 'wall';
        case '.':
          return 'pellet';
        case 'o':
          return 'power';
        case '-':
          return 'door';
        case 'G':
          return 'house';
        default:
          return 'empty';
      }
    }),
  );
}

export function countPellets(maze: Maze): number {
  let count = 0;
  for (const row of maze) for (const tile of row) if (tile === 'pellet' || tile === 'power') count++;
  return count;
}

function wrapX(x: number, cols: number) {
  return ((x % cols) + cols) % cols;
}

export function tileAt(maze: Maze, x: number, y: number): Tile {
  if (y < 0 || y >= maze.length) return 'wall';
  return maze[y][wrapX(x, maze[0].length)];
}

/** Can an entity step from (x, y) toward `dir`? Ghosts may use the door when leaving or returning home. */
export function canMove(maze: Maze, pos: Vec, dir: Dir, through: 'player' | 'ghost' | 'ghost-door'): boolean {
  const d = DIRS[dir];
  const tile = tileAt(maze, pos.x + d.x, pos.y + d.y);
  if (tile === 'wall') return false;
  if (tile === 'door' || tile === 'house') return through === 'ghost-door';
  return true;
}

export function stepPos(maze: Maze, pos: Vec, dir: Dir): Vec {
  const d = DIRS[dir];
  return { x: wrapX(pos.x + d.x, maze[0].length), y: pos.y + d.y };
}

function dist2(a: Vec, b: Vec) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

/**
 * Classic greedy ghost choice at a tile centre: never reverse (unless it is the
 * only way), pick the open neighbour closest to the target, ties by DIR_ORDER.
 */
export function chooseDirection(maze: Maze, pos: Vec, current: Dir, target: Vec, through: 'ghost' | 'ghost-door' = 'ghost'): Dir {
  const options = DIR_ORDER.filter((dir) => dir !== OPPOSITE[current] && canMove(maze, pos, dir, through));
  if (options.length === 0) return OPPOSITE[current];
  let best = options[0];
  let bestDistance = Infinity;
  for (const dir of options) {
    const distance = dist2(stepPos(maze, pos, dir), target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = dir;
    }
  }
  return best;
}

/** First step of a shortest path (BFS) from `from` to `to`, used by ghosts going home / leaving home. */
export function pathDirection(maze: Maze, from: Vec, to: Vec): Dir | null {
  if (from.x === to.x && from.y === to.y) return null;
  const cols = maze[0].length;
  const key = (p: Vec) => p.y * cols + p.x;
  const first = new Map<number, Dir>();
  const queue: Vec[] = [from];
  const seen = new Set<number>([key(from)]);
  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const dir of DIR_ORDER) {
      if (!canMove(maze, node, dir, 'ghost-door')) continue;
      const next = stepPos(maze, node, dir);
      const k = key(next);
      if (seen.has(k)) continue;
      seen.add(k);
      const origin = node === from ? dir : first.get(key(node))!;
      first.set(k, origin);
      if (next.x === to.x && next.y === to.y) return origin;
      queue.push(next);
    }
  }
  return null;
}

export type GhostName = 'spark' | 'ambush' | 'flank' | 'drift';
export type GhostMode = 'house' | 'leaving' | 'active' | 'eaten';

export interface Ghost {
  name: GhostName;
  pos: Vec;
  dir: Dir;
  progress: number;
  mode: GhostMode;
  /** Seconds until a ghost in the house is released. */
  release: number;
  /** Scatter corner. */
  home: Vec;
}

export interface Player {
  pos: Vec;
  dir: Dir;
  wanted: Dir;
  progress: number;
  moving: boolean;
}

export type Phase = 'ready' | 'playing' | 'dying' | 'cleared' | 'over';

export interface PacState {
  maze: Maze;
  pellets: number;
  player: Player;
  ghosts: Ghost[];
  score: number;
  lives: number;
  level: number;
  phase: Phase;
  /** Seconds left in the current phase (ready / dying / cleared). */
  phaseTimer: number;
  /** Seconds remaining of power-pellet fright. */
  fright: number;
  /** Ghosts eaten during the current fright (for 200/400/800/1600). */
  combo: number;
  /** Scatter/chase schedule clock. */
  modeClock: number;
  /** Total play time (drives animation). */
  time: number;
  /** Floating score popups. */
  popups: { pos: Vec; value: number; ttl: number }[];
}

const GHOST_SETUP: { name: GhostName; pos: Vec; dir: Dir; mode: GhostMode; release: number; home: Vec }[] = [
  { name: 'spark', pos: { ...HOUSE_EXIT }, dir: 'left', mode: 'active', release: 0, home: { x: MAZE_COLS - 2, y: -2 } },
  { name: 'ambush', pos: { x: 9, y: 9 }, dir: 'up', mode: 'house', release: 1.5, home: { x: 1, y: -2 } },
  { name: 'flank', pos: { x: 8, y: 9 }, dir: 'up', mode: 'house', release: 4.5, home: { x: MAZE_COLS - 1, y: MAZE_ROWS } },
  { name: 'drift', pos: { x: 10, y: 9 }, dir: 'up', mode: 'house', release: 7.5, home: { x: 0, y: MAZE_ROWS } },
];

function freshActors(level: number): Pick<PacState, 'player' | 'ghosts'> {
  const releaseScale = Math.max(0.4, 1 - (level - 1) * 0.15);
  return {
    player: { pos: { ...PLAYER_START }, dir: 'left', wanted: 'left', progress: 0, moving: false },
    ghosts: GHOST_SETUP.map((g) => ({ ...g, pos: { ...g.pos }, home: { ...g.home }, progress: 0, release: g.release * releaseScale })),
  };
}

export const READY_TIME = 1.6;

export function createPacGame(level = 1, score = 0, lives = 3): PacState {
  const maze = parseMaze();
  return {
    maze,
    pellets: countPellets(maze),
    ...freshActors(level),
    score,
    lives,
    level,
    phase: 'ready',
    phaseTimer: READY_TIME,
    fright: 0,
    combo: 0,
    modeClock: 0,
    time: 0,
    popups: [],
  };
}

// Tiles per second.
export function playerSpeed(level: number) {
  return 7.2 + Math.min(level - 1, 5) * 0.35;
}
export function ghostSpeed(level: number, ghost: Ghost, frightened: boolean, maze: Maze) {
  if (ghost.mode === 'eaten') return 14;
  if (ghost.mode === 'house' || ghost.mode === 'leaving') return 4.5;
  const tunnel = ghost.pos.y === TUNNEL_ROW && (ghost.pos.x < 2 || ghost.pos.x > maze[0].length - 3);
  const base = 6.6 + Math.min(level - 1, 5) * 0.4;
  if (frightened) return base * 0.55;
  return tunnel ? base * 0.6 : base;
}
export function frightDuration(level: number) {
  return Math.max(2, 7 - (level - 1) * 1);
}

/** Alternates scatter and chase: 6 s scatter, 20 s chase, repeating (scatter shortens with level). */
export function isScatter(modeClock: number, level: number) {
  const scatter = Math.max(3, 6 - (level - 1));
  const cycle = scatter + 20;
  return modeClock % cycle < scatter;
}

/** Each ghost's chase target: distinct, simple personalities. */
export function chaseTarget(ghost: Ghost, player: Player, ghosts: Ghost[]): Vec {
  const p = player.pos;
  const d = DIRS[player.dir];
  switch (ghost.name) {
    case 'spark':
      // Hunts the chomper's tile directly.
      return { ...p };
    case 'ambush':
      // Aims four tiles ahead to cut the chomper off.
      return { x: p.x + d.x * 4, y: p.y + d.y * 4 };
    case 'flank': {
      // Mirrors Spark around a point two tiles ahead: pincer moves.
      const spark = ghosts.find((g) => g.name === 'spark') ?? ghost;
      const pivot = { x: p.x + d.x * 2, y: p.y + d.y * 2 };
      return { x: pivot.x * 2 - spark.pos.x, y: pivot.y * 2 - spark.pos.y };
    }
    case 'drift':
      // Chases from afar, loses interest up close and wanders to its corner.
      return dist2(ghost.pos, p) > 49 ? { ...p } : { ...ghost.home };
  }
}

/** Decide a ghost's next direction at a tile centre. `rng` drives frightened wandering. */
export function ghostDecision(state: PacState, ghost: Ghost, rng: () => number): Dir {
  const { maze } = state;
  if (ghost.mode === 'eaten') return pathDirection(maze, ghost.pos, HOUSE_CENTER) ?? 'up';
  if (ghost.mode === 'leaving') return pathDirection(maze, ghost.pos, HOUSE_EXIT) ?? 'up';
  if (state.fright > 0) {
    const options = DIR_ORDER.filter((dir) => dir !== OPPOSITE[ghost.dir] && canMove(maze, ghost.pos, dir, 'ghost'));
    if (options.length === 0) return OPPOSITE[ghost.dir];
    return options[Math.floor(rng() * options.length) % options.length];
  }
  const target = isScatter(state.modeClock, state.level) ? ghost.home : chaseTarget(ghost, state.player, state.ghosts);
  return chooseDirection(maze, ghost.pos, ghost.dir, target);
}

/** Moves a ghost by `distance` tiles, deciding at each tile centre. */
export function advanceGhost(state: PacState, ghost: Ghost, distance: number, rng: () => number): Ghost {
  let g = { ...ghost, pos: { ...ghost.pos } };
  if (g.mode === 'house') {
    // Bob in place until released.
    g.release -= distance / 4.5;
    if (g.release <= 0) g = { ...g, mode: 'leaving', progress: 0 };
    return g;
  }
  let remaining = distance;
  let guard = 0;
  while (remaining > 0 && guard++ < 8) {
    if (g.progress === 0) {
      // At a tile centre: arrivals and decisions.
      if (g.mode === 'leaving' && g.pos.x === HOUSE_EXIT.x && g.pos.y === HOUSE_EXIT.y) {
        g.mode = 'active';
        g.dir = 'left';
      } else if (g.mode === 'eaten' && g.pos.x === HOUSE_CENTER.x && g.pos.y === HOUSE_CENTER.y) {
        g.mode = 'leaving';
      }
      g.dir = ghostDecision(state, g, rng);
      const through = g.mode === 'active' ? 'ghost' : 'ghost-door';
      if (!canMove(state.maze, g.pos, g.dir, through)) return g;
    }
    const step = Math.min(remaining, 1 - g.progress);
    g.progress += step;
    remaining -= step;
    if (g.progress >= 1 - 1e-9) {
      g.pos = stepPos(state.maze, g.pos, g.dir);
      g.progress = 0;
    }
  }
  return g;
}

/** Moves the chomper by `distance` tiles, turning at tile centres when the queued direction opens. */
export function advancePlayer(maze: Maze, player: Player, distance: number): Player {
  const p = { ...player, pos: { ...player.pos } };
  // Instant reversal mid-tile feels responsive.
  if (p.progress > 0 && p.wanted === OPPOSITE[p.dir]) {
    p.pos = stepPos(maze, p.pos, p.dir);
    p.progress = 1 - p.progress;
    p.dir = p.wanted;
  }
  let remaining = distance;
  let guard = 0;
  p.moving = true;
  while (remaining > 0 && guard++ < 8) {
    if (p.progress === 0) {
      if (canMove(maze, p.pos, p.wanted, 'player')) p.dir = p.wanted;
      else if (!canMove(maze, p.pos, p.dir, 'player')) {
        p.moving = false;
        return p;
      }
    }
    const step = Math.min(remaining, 1 - p.progress);
    p.progress += step;
    remaining -= step;
    if (p.progress >= 1 - 1e-9) {
      p.pos = stepPos(maze, p.pos, p.dir);
      p.progress = 0;
    }
  }
  return p;
}

/** Interpolated position in tile units (handles the tunnel wrap). */
export function renderPos(maze: Maze, pos: Vec, dir: Dir, progress: number): Vec {
  const d = DIRS[dir];
  return { x: pos.x + d.x * progress, y: pos.y + d.y * progress };
}

function wrappedDistance(a: Vec, b: Vec, cols: number) {
  let dx = Math.abs(a.x - b.x);
  dx = Math.min(dx, cols - dx);
  return Math.hypot(dx, a.y - b.y);
}

export function setWanted(state: PacState, dir: Dir): PacState {
  return { ...state, player: { ...state.player, wanted: dir } };
}

const STEP = 1 / 120;

/** Advances the whole game by `dt` seconds (internally in small fixed steps). */
export function stepPac(state: PacState, dt: number, rng: () => number = Math.random): PacState {
  let s = state;
  let left = Math.min(dt, 0.1);
  while (left > 1e-9) {
    const h = Math.min(STEP, left);
    s = substep(s, h, rng);
    left -= h;
  }
  return s;
}

function substep(state: PacState, h: number, rng: () => number): PacState {
  const s: PacState = { ...state, time: state.time + h, popups: state.popups.map((p) => ({ ...p, ttl: p.ttl - h })).filter((p) => p.ttl > 0) };
  if (s.phase === 'over') return s;
  if (s.phase === 'ready') {
    s.phaseTimer -= h;
    if (s.phaseTimer <= 0) s.phase = 'playing';
    return s;
  }
  if (s.phase === 'dying') {
    s.phaseTimer -= h;
    if (s.phaseTimer <= 0) {
      if (s.lives <= 0) return { ...s, phase: 'over' };
      return { ...s, ...freshActors(s.level), phase: 'ready', phaseTimer: READY_TIME, fright: 0, combo: 0 };
    }
    return s;
  }
  if (s.phase === 'cleared') {
    s.phaseTimer -= h;
    if (s.phaseTimer <= 0) return createPacGame(s.level + 1, s.score, s.lives);
    return s;
  }

  // Playing.
  if (s.fright > 0) {
    s.fright = Math.max(0, s.fright - h);
    if (s.fright === 0) s.combo = 0;
  } else {
    s.modeClock += h;
  }

  s.player = advancePlayer(s.maze, s.player, playerSpeed(s.level) * h);
  // Eat whatever is on the tile the chomper last reached.
  {
    const { x, y } = s.player.pos;
    const tile = s.maze[y]?.[x];
    if (tile === 'pellet' || tile === 'power') {
      s.maze = s.maze.map((row, ry) => (ry === y ? row.map((t, rx) => (rx === x ? 'empty' : t)) : row));
      s.pellets -= 1;
      if (tile === 'pellet') s.score += 10;
      else {
        s.score += 50;
        s.fright = frightDuration(s.level);
        s.combo = 0;
        // Frightened ghosts turn around.
        s.ghosts = s.ghosts.map((g) =>
          g.mode === 'active' ? { ...g, dir: OPPOSITE[g.dir], progress: g.progress > 0 ? 1 - g.progress : 0, pos: g.progress > 0 ? stepPos(s.maze, g.pos, g.dir) : g.pos } : g,
        );
      }
      if (s.pellets <= 0) return { ...s, phase: 'cleared', phaseTimer: 1.8 };
    }
  }

  const frightened = s.fright > 0;
  s.ghosts = s.ghosts.map((g) => advanceGhost(s, g, ghostSpeed(s.level, g, frightened && g.mode === 'active', s.maze) * h, rng));

  // Collisions.
  const pp = renderPos(s.maze, s.player.pos, s.player.dir, s.player.progress);
  for (let i = 0; i < s.ghosts.length; i++) {
    const g = s.ghosts[i];
    if (g.mode !== 'active') continue;
    const gp = renderPos(s.maze, g.pos, g.dir, g.progress);
    if (wrappedDistance(pp, gp, MAZE_COLS) > 0.6) continue;
    if (frightened) {
      const value = 200 * 2 ** s.combo;
      s.combo += 1;
      s.score += value;
      s.popups = [...s.popups, { pos: gp, value, ttl: 0.9 }];
      s.ghosts = s.ghosts.map((other, j) => (j === i ? { ...other, mode: 'eaten' } : other));
    } else {
      return { ...s, phase: 'dying', phaseTimer: 1.4, lives: s.lives - 1 };
    }
  }
  return s;
}
