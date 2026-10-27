// Pure rules for "Blocks", the arcade's falling-block game: a 10×20 well, the
// seven tetrominoes with SRS-style rotation and wall kicks, 7-bag randomiser,
// hold, ghost, lock delay, line clears, scoring and levels. No DOM here.

export const COLS = 10;
export const ROWS = 20;
export const PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;
export type PieceType = (typeof PIECES)[number];
export type Rotation = 0 | 1 | 2 | 3;
export type Cell = PieceType | null;
export type Board = Cell[][];

export interface Piece {
  type: PieceType;
  rot: Rotation;
  /** Top-left of the piece's bounding box, in cells (y down; may be negative above the well). */
  x: number;
  y: number;
}

type Point = readonly [number, number];

/** Spawn-state cells inside each piece's bounding box (y down). */
const SPAWN: Record<PieceType, { size: number; cells: Point[] }> = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

function rotateCW(cells: Point[], size: number): Point[] {
  return cells.map(([x, y]) => [size - 1 - y, x] as const);
}

/** SHAPES[type][rot] = the four cells for that rotation state. */
export const SHAPES: Record<PieceType, Point[][]> = Object.fromEntries(
  PIECES.map((type) => {
    const { size, cells } = SPAWN[type];
    const states: Point[][] = [cells];
    for (let i = 1; i < 4; i++) states.push(type === 'O' ? cells : rotateCW(states[i - 1], size));
    return [type, states];
  }),
) as Record<PieceType, Point[][]>;

// SRS kick offsets, written y-up as in the guideline and flipped to y-down below.
const KICKS_JLSTZ: Record<string, Point[]> = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICKS_I: Record<string, Point[]> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export function kicksFor(type: PieceType, from: Rotation, to: Rotation): Point[] {
  if (type === 'O') return [[0, 0]];
  const table = type === 'I' ? KICKS_I : KICKS_JLSTZ;
  return table[`${from}>${to}`].map(([x, y]) => [x, 0 - y] as const);
}

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

export function pieceCells(piece: Piece): Point[] {
  return SHAPES[piece.type][piece.rot].map(([x, y]) => [piece.x + x, piece.y + y] as const);
}

/** True when the piece overlaps a wall, the floor or a settled block. Cells above the well are free. */
export function collides(board: Board, piece: Piece): boolean {
  for (const [x, y] of pieceCells(piece)) {
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && board[y][x] !== null) return true;
  }
  return false;
}

export function spawnPiece(type: PieceType): Piece {
  const size = SPAWN[type].size;
  return { type, rot: 0, x: Math.floor((COLS - size) / 2), y: type === 'I' ? -1 : 0 };
}

/** Rotates with SRS kicks; returns the first position that fits, or null. */
export function tryRotate(board: Board, piece: Piece, dir: 1 | -1): Piece | null {
  const to = (((piece.rot + dir) % 4) + 4) % 4 as Rotation;
  for (const [dx, dy] of kicksFor(piece.type, piece.rot, to)) {
    const candidate = { ...piece, rot: to, x: piece.x + dx, y: piece.y + dy };
    if (!collides(board, candidate)) return candidate;
  }
  return null;
}

export function tryMove(board: Board, piece: Piece, dx: number, dy: number): Piece | null {
  const candidate = { ...piece, x: piece.x + dx, y: piece.y + dy };
  return collides(board, candidate) ? null : candidate;
}

/** How many rows the piece can fall before landing. */
export function dropDistance(board: Board, piece: Piece): number {
  let distance = 0;
  while (!collides(board, { ...piece, y: piece.y + distance + 1 })) distance++;
  return distance;
}

export function ghostPiece(board: Board, piece: Piece): Piece {
  return { ...piece, y: piece.y + dropDistance(board, piece) };
}

/** Writes the piece into a copy of the board. `toppedOut` when any cell is above the well. */
export function lockPiece(board: Board, piece: Piece): { board: Board; toppedOut: boolean } {
  const next = board.map((row) => row.slice());
  let toppedOut = false;
  for (const [x, y] of pieceCells(piece)) {
    if (y < 0) toppedOut = true;
    else next[y][x] = piece.type;
  }
  return { board: next, toppedOut };
}

/** Removes full rows; returns the new board and the indices that were cleared. */
export function clearLines(board: Board): { board: Board; cleared: number[] } {
  const cleared: number[] = [];
  const kept: Board = [];
  board.forEach((row, y) => {
    if (row.every((cell) => cell !== null)) cleared.push(y);
    else kept.push(row);
  });
  while (kept.length < ROWS) kept.unshift(Array<Cell>(COLS).fill(null));
  return { board: kept, cleared };
}

const LINE_POINTS = [0, 100, 300, 500, 800];

export function lineScore(lines: number, level: number): number {
  return (LINE_POINTS[lines] ?? 800) * level;
}

export function levelForLines(lines: number): number {
  return 1 + Math.floor(lines / 10);
}

/** Seconds per gravity row: guideline-like curve, floored for playability. */
export function gravityInterval(level: number): number {
  const l = Math.max(0, level - 1);
  return Math.max(0.03, Math.pow(0.8 - l * 0.007, l));
}

/** 7-bag randomiser: each run of seven pieces holds one of each. */
export function newBag(rng: () => number): PieceType[] {
  const bag = [...PIECES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export const LOCK_DELAY = 0.5;
const MAX_LOCK_RESETS = 15;

export interface TetrisState {
  board: Board;
  active: Piece;
  queue: PieceType[];
  hold: PieceType | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  over: boolean;
  /** Seconds accumulated toward the next gravity row. */
  fall: number;
  /** Seconds the piece has rested on the stack. */
  lock: number;
  lockResets: number;
  /** Rows cleared by the last lock, for the flash effect. */
  lastClear: number[];
  /** Increments on every lock (lets the view detect clears). */
  locks: number;
}

export type TetrisAction =
  | 'left'
  | 'right'
  | 'rotateCW'
  | 'rotateCCW'
  | 'softDrop'
  | 'hardDrop'
  | 'hold';

function fillQueue(queue: PieceType[], rng: () => number): PieceType[] {
  const next = queue.slice();
  while (next.length < 7) next.push(...newBag(rng));
  return next;
}

export function createGame(rng: () => number = Math.random): TetrisState {
  const queue = fillQueue([], rng);
  const [first, ...rest] = queue;
  return {
    board: createBoard(),
    active: spawnPiece(first),
    queue: fillQueue(rest, rng),
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    over: false,
    fall: 0,
    lock: 0,
    lockResets: 0,
    lastClear: [],
    locks: 0,
  };
}

function spawnNext(state: TetrisState, type: PieceType, rng: () => number, extra: Partial<TetrisState>): TetrisState {
  const active = spawnPiece(type);
  const over = collides(extra.board ?? state.board, active);
  return { ...state, ...extra, active, over, fall: 0, lock: 0, lockResets: 0, queue: fillQueue(extra.queue ?? state.queue, rng) };
}

function settle(state: TetrisState, rng: () => number, bonus = 0): TetrisState {
  const locked = lockPiece(state.board, state.active);
  const { board, cleared } = clearLines(locked.board);
  const lines = state.lines + cleared.length;
  const score = state.score + bonus + lineScore(cleared.length, state.level);
  const [nextType, ...queue] = state.queue;
  const next = spawnNext(state, nextType, rng, {
    board,
    queue,
    lines,
    score,
    level: levelForLines(lines),
    canHold: true,
    lastClear: cleared,
    locks: state.locks + 1,
  });
  return locked.toppedOut ? { ...next, over: true } : next;
}

/** A successful move/rotate on the ground resets the lock timer (a limited number of times). */
function moved(state: TetrisState, active: Piece): TetrisState {
  const grounded = collides(state.board, { ...active, y: active.y + 1 });
  if (grounded && state.lockResets < MAX_LOCK_RESETS) {
    return { ...state, active, lock: 0, lockResets: state.lockResets + 1 };
  }
  return { ...state, active };
}

export function applyAction(state: TetrisState, action: TetrisAction, rng: () => number = Math.random): TetrisState {
  if (state.over) return state;
  const { board, active } = state;
  switch (action) {
    case 'left':
    case 'right': {
      const next = tryMove(board, active, action === 'left' ? -1 : 1, 0);
      return next ? moved(state, next) : state;
    }
    case 'rotateCW':
    case 'rotateCCW': {
      const next = tryRotate(board, active, action === 'rotateCW' ? 1 : -1);
      return next ? moved(state, next) : state;
    }
    case 'softDrop': {
      const next = tryMove(board, active, 0, 1);
      return next ? { ...state, active: next, fall: 0, score: state.score + 1 } : state;
    }
    case 'hardDrop': {
      const distance = dropDistance(board, active);
      return settle({ ...state, active: { ...active, y: active.y + distance } }, rng, distance * 2);
    }
    case 'hold': {
      if (!state.canHold) return state;
      if (state.hold === null) {
        const [nextType, ...queue] = state.queue;
        return spawnNext(state, nextType, rng, { hold: active.type, queue, canHold: false });
      }
      return spawnNext(state, state.hold, rng, { hold: active.type, canHold: false });
    }
  }
}

/** Advances gravity and the lock delay by `dt` seconds. */
export function tick(state: TetrisState, dt: number, rng: () => number = Math.random): TetrisState {
  if (state.over) return state;
  let next = state;
  const grounded = collides(next.board, { ...next.active, y: next.active.y + 1 });
  if (grounded) {
    const lock = next.lock + dt;
    return lock >= LOCK_DELAY ? settle(next, rng) : { ...next, lock, fall: 0 };
  }
  let fall = next.fall + dt;
  const interval = gravityInterval(next.level);
  let active = next.active;
  while (fall >= interval) {
    const moved = tryMove(next.board, active, 0, 1);
    if (!moved) {
      fall = 0;
      break;
    }
    active = moved;
    fall -= interval;
  }
  next = { ...next, active, fall, lock: 0 };
  return next;
}
