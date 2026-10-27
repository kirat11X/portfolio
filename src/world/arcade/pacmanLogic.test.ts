import { describe, expect, it } from 'vitest';
import {
  advanceGhost,
  advancePlayer,
  canMove,
  chaseTarget,
  chooseDirection,
  countPellets,
  createPacGame,
  HOUSE_CENTER,
  HOUSE_EXIT,
  MAZE_COLS,
  MAZE_ROWS,
  MAZE_TEMPLATE,
  parseMaze,
  pathDirection,
  setWanted,
  stepPac,
  type Ghost,
  type PacState,
  type Player,
  type Tile,
} from './pacmanLogic';

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

function run(state: PacState, seconds: number, rng = seq([0.1, 0.5, 0.9])) {
  let s = state;
  for (let t = 0; t < seconds; t += 1 / 60) s = stepPac(s, 1 / 60, rng);
  return s;
}

describe('maze', () => {
  it('is rectangular, symmetric and has pellets', () => {
    for (const row of MAZE_TEMPLATE) {
      expect(row.length).toBe(MAZE_COLS);
      expect([...row].reverse().join('').replace('P', '.')).toBe(row.replace('P', '.'));
    }
    expect(MAZE_TEMPLATE.length).toBe(MAZE_ROWS);
    expect(countPellets(parseMaze())).toBeGreaterThan(150);
  });

  it('every pellet is reachable from the start', () => {
    const maze = parseMaze();
    const seen = new Set<string>(['9,15']);
    const queue = [{ x: 9, y: 15 }];
    while (queue.length) {
      const p = queue.shift()!;
      for (const dir of ['up', 'down', 'left', 'right'] as const) {
        if (!canMove(maze, p, dir, 'player')) continue;
        const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
        const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
        const n = { x: (p.x + dx + MAZE_COLS) % MAZE_COLS, y: p.y + dy };
        const k = `${n.x},${n.y}`;
        if (!seen.has(k)) {
          seen.add(k);
          queue.push(n);
        }
      }
    }
    maze.forEach((row, y) =>
      row.forEach((tile, x) => {
        if (tile === 'pellet' || tile === 'power') expect(seen.has(`${x},${y}`), `${x},${y}`).toBe(true);
      }),
    );
  });

  it('keeps the player out of the ghost house but lets returning ghosts through the door', () => {
    const maze = parseMaze();
    expect(canMove(maze, HOUSE_EXIT, 'down', 'player')).toBe(false);
    expect(canMove(maze, HOUSE_EXIT, 'down', 'ghost')).toBe(false);
    expect(canMove(maze, HOUSE_EXIT, 'down', 'ghost-door')).toBe(true);
  });
});

describe('movement', () => {
  it('player turns at a tile centre when the queued direction opens', () => {
    const maze = parseMaze();
    // From (9,15) heading left, (8,15) is open; (8,14) is open above it.
    let player: Player = { pos: { x: 9, y: 15 }, dir: 'left', wanted: 'up', progress: 0, moving: false };
    player = advancePlayer(maze, player, 1);
    expect(player.pos).toEqual({ x: 8, y: 15 });
    player = advancePlayer(maze, player, 0.5);
    expect(player.dir).toBe('up');
    expect(player.progress).toBeCloseTo(0.5);
  });

  it('player stops against a wall and wraps through the tunnel', () => {
    const maze = parseMaze();
    const stuck = advancePlayer(maze, { pos: { x: 1, y: 19 }, dir: 'left', wanted: 'left', progress: 0, moving: true }, 1);
    expect(stuck.pos).toEqual({ x: 1, y: 19 });
    expect(stuck.moving).toBe(false);
    const wrapped = advancePlayer(maze, { pos: { x: 0, y: 9 }, dir: 'left', wanted: 'left', progress: 0, moving: true }, 1);
    expect(wrapped.pos).toEqual({ x: MAZE_COLS - 1, y: 9 });
  });

  it('ghost picks the open non-reversing move closest to its target', () => {
    const maze = parseMaze();
    // At (9,7) heading left: options left / right (up is a wall, down is the door).
    expect(chooseDirection(maze, { x: 9, y: 7 }, 'left', { x: 18, y: 7 })).toBe('left'); // cannot reverse to right
    expect(chooseDirection(maze, { x: 9, y: 7 }, 'up', { x: 18, y: 7 })).toBe('right');
    expect(chooseDirection(maze, { x: 9, y: 7 }, 'up', { x: 0, y: 7 })).toBe('left');
  });

  it('BFS routes eaten ghosts home through the door', () => {
    const maze = parseMaze();
    expect(pathDirection(maze, HOUSE_EXIT, HOUSE_CENTER)).toBe('down');
    expect(pathDirection(maze, { x: 1, y: 1 }, HOUSE_CENTER)).not.toBeNull();
  });

  it('ghosts have distinct chase targets', () => {
    const state = createPacGame();
    const player = { ...state.player, pos: { x: 9, y: 15 }, dir: 'left' as const };
    const [spark, ambush, flank, drift] = state.ghosts;
    expect(chaseTarget(spark, player, state.ghosts)).toEqual({ x: 9, y: 15 });
    expect(chaseTarget(ambush, player, state.ghosts)).toEqual({ x: 5, y: 15 });
    expect(chaseTarget(flank, player, state.ghosts)).not.toEqual({ x: 9, y: 15 });
    const near: Ghost = { ...drift, pos: { x: 10, y: 15 } };
    expect(chaseTarget(near, player, state.ghosts)).toEqual(drift.home);
  });

  it('a ghost step advances by distance and decides at centres', () => {
    const state = { ...createPacGame(), phase: 'playing' as const };
    const spark = state.ghosts[0];
    const moved = advanceGhost(state, spark, 1.5, Math.random);
    expect(moved.progress).toBeCloseTo(0.5);
    expect(Math.abs(moved.pos.x - spark.pos.x) + Math.abs(moved.pos.y - spark.pos.y)).toBe(1);
  });

  it('releases house ghosts over time', () => {
    const state = run(createPacGame(), 1.6 + 3);
    expect(state.ghosts.find((g) => g.name === 'ambush')!.mode).not.toBe('house');
  });
});

describe('game flow', () => {
  it('starts after the ready countdown and eats pellets', () => {
    let s = createPacGame();
    s = setWanted(s, 'left');
    s = run(s, 1.6 + 0.5);
    expect(s.phase).toBe('playing');
    expect(s.score).toBeGreaterThan(0);
    expect(s.pellets).toBeLessThan(countPellets(parseMaze()));
  });

  it('power pellets frighten ghosts and eating one scores 200', () => {
    let s: PacState = { ...createPacGame(), phase: 'playing', phaseTimer: 0 };
    // Put the chomper next to a power pellet and a ghost in the corridor beyond.
    s = { ...s, player: { pos: { x: 2, y: 1 }, dir: 'left', wanted: 'left', progress: 0, moving: true } };
    s = run(s, 0.3, seq([0.5]));
    expect(s.fright).toBeGreaterThan(0);
    s = { ...s, ghosts: s.ghosts.map((g, i) => (i === 0 ? { ...g, pos: { ...s.player.pos }, progress: 0, mode: 'active' } : g)) };
    const before = s.score;
    s = stepPac(s, 1 / 120, seq([0.5]));
    expect(s.score - before).toBe(200);
    expect(s.ghosts[0].mode).toBe('eaten');
  });

  it('touching a ghost costs a life and the last life ends the game', () => {
    let s: PacState = { ...createPacGame(), phase: 'playing', phaseTimer: 0, lives: 1 };
    s = { ...s, ghosts: s.ghosts.map((g, i) => (i === 0 ? { ...g, pos: { ...s.player.pos }, progress: 0 } : g)) };
    s = stepPac(s, 1 / 120);
    expect(s.phase).toBe('dying');
    expect(s.lives).toBe(0);
    s = run(s, 2);
    expect(s.phase).toBe('over');
  });

  it('clearing every pellet advances the level', () => {
    let s: PacState = { ...createPacGame(), phase: 'playing', phaseTimer: 0 };
    const maze = s.maze.map((row) => row.map((t): Tile => (t === 'pellet' || t === 'power' ? 'empty' : t)));
    maze[15][8] = 'pellet';
    s = { ...s, maze, pellets: 1, player: { ...s.player, wanted: 'left' } };
    s = run(s, 0.4);
    expect(s.phase).toBe('cleared');
    s = run(s, 2);
    expect(s.level).toBe(2);
    expect(s.phase).toBe('ready');
    expect(s.pellets).toBe(countPellets(parseMaze()));
  });
});
