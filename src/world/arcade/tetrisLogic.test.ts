import { describe, expect, it } from 'vitest';
import {
  applyAction,
  clearLines,
  collides,
  COLS,
  createBoard,
  createGame,
  dropDistance,
  gravityInterval,
  kicksFor,
  levelForLines,
  lineScore,
  lockPiece,
  newBag,
  PIECES,
  pieceCells,
  ROWS,
  SHAPES,
  spawnPiece,
  tick,
  tryRotate,
  LOCK_DELAY,
  type Board,
  type Piece,
} from './tetrisLogic';

const sorted = (cells: readonly (readonly [number, number])[]) => cells.map(([x, y]) => `${x},${y}`).sort();
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('shapes and rotation', () => {
  it('every piece has four cells in all four rotations; O never changes', () => {
    for (const type of PIECES) for (const state of SHAPES[type]) expect(state).toHaveLength(4);
    expect(sorted(SHAPES.O[1])).toEqual(sorted(SHAPES.O[0]));
  });

  it('T rotates clockwise through SRS states', () => {
    expect(sorted(SHAPES.T[1])).toEqual(sorted([[1, 0], [1, 1], [2, 1], [1, 2]]));
    expect(sorted(SHAPES.T[2])).toEqual(sorted([[0, 1], [1, 1], [2, 1], [1, 2]]));
  });

  it('four rotations return to the start', () => {
    const board = createBoard();
    let piece: Piece = { ...spawnPiece('T'), y: 5 };
    for (let i = 0; i < 4; i++) piece = tryRotate(board, piece, 1)!;
    expect(piece).toEqual({ ...spawnPiece('T'), y: 5 });
  });

  it('kick tables are y-down and start with the identity', () => {
    expect(kicksFor('T', 0, 1)[0]).toEqual([0, 0]);
    // Guideline 0>R second test (-1, 0), third (-1, +1 up) -> y-down -1.
    expect(kicksFor('T', 0, 1)[2]).toEqual([-1, -1]);
    expect(kicksFor('I', 0, 1)[1]).toEqual([-2, 0]);
  });

  it('wall-kicks an I piece off the right wall', () => {
    const board = createBoard();
    // Vertical I hugging the right wall (state R has its cells in column 2 of the box).
    const piece: Piece = { type: 'I', rot: 1, x: COLS - 3, y: 5 };
    expect(collides(board, piece)).toBe(false);
    const rotated = tryRotate(board, piece, 1);
    expect(rotated).not.toBeNull();
    expect(collides(board, rotated!)).toBe(false);
    expect(rotated!.x).not.toBe(piece.x);
  });

  it('refuses a rotation when every kick is blocked', () => {
    const board: Board = createBoard().map((row) => row.map(() => 'Z'));
    // Carve a 1-wide vertical shaft that only fits a vertical I.
    for (let y = 0; y < ROWS; y++) board[y][4] = null;
    const piece: Piece = { type: 'I', rot: 1, x: 2, y: 8 };
    expect(collides(board, piece)).toBe(false);
    expect(tryRotate(board, piece, 1)).toBeNull();
  });
});

describe('collision, drop and lines', () => {
  it('detects walls and floor; cells above the well are free', () => {
    const board = createBoard();
    expect(collides(board, { type: 'O', rot: 0, x: -1, y: 0 })).toBe(true);
    expect(collides(board, { type: 'O', rot: 0, x: COLS - 1, y: 0 })).toBe(true);
    expect(collides(board, { type: 'O', rot: 0, x: 0, y: ROWS - 1 })).toBe(true);
    expect(collides(board, { type: 'O', rot: 0, x: 0, y: -1 })).toBe(false);
  });

  it('drops to the floor', () => {
    const board = createBoard();
    const piece = spawnPiece('O');
    expect(dropDistance(board, piece)).toBe(ROWS - 2);
  });

  it('clears full rows and shifts the rest down', () => {
    let board = createBoard();
    board[ROWS - 1] = board[ROWS - 1].map(() => 'I');
    board[ROWS - 2] = board[ROWS - 2].map((_, x) => (x === 0 ? null : 'J'));
    board[ROWS - 3][3] = 'T';
    const result = clearLines(board);
    expect(result.cleared).toEqual([ROWS - 1]);
    board = result.board;
    expect(board).toHaveLength(ROWS);
    expect(board[ROWS - 1][0]).toBeNull();
    expect(board[ROWS - 1][1]).toBe('J');
    expect(board[ROWS - 2][3]).toBe('T');
  });

  it('lockPiece flags a top-out', () => {
    expect(lockPiece(createBoard(), { type: 'O', rot: 0, x: 0, y: -1 }).toppedOut).toBe(true);
    expect(pieceCells({ type: 'O', rot: 0, x: 0, y: 0 })).toHaveLength(4);
  });
});

describe('scoring, levels and flow', () => {
  it('scores lines by level and levels every ten lines', () => {
    expect(lineScore(1, 1)).toBe(100);
    expect(lineScore(4, 2)).toBe(1600);
    expect(levelForLines(9)).toBe(1);
    expect(levelForLines(10)).toBe(2);
    expect(gravityInterval(1)).toBe(1);
    expect(gravityInterval(10)).toBeLessThan(gravityInterval(2));
  });

  it('7-bag deals one of each piece', () => {
    expect([...newBag(seeded(3))].sort()).toEqual([...PIECES].sort());
  });

  it('hard drop locks, scores 2 per cell and spawns the next piece', () => {
    const rng = seeded(7);
    const game = createGame(rng);
    const distance = dropDistance(game.board, game.active);
    const next = applyAction(game, 'hardDrop', rng);
    expect(next.score).toBe(distance * 2);
    expect(next.active.type).toBe(game.queue[0]);
    expect(next.board.flat().filter(Boolean)).toHaveLength(4);
  });

  it('a hard-dropped I clears a prepared line', () => {
    const rng = seeded(2);
    let game = createGame(rng);
    const board = createBoard();
    board[ROWS - 1] = board[ROWS - 1].map((_, x) => (x >= 3 && x <= 6 ? null : 'Z'));
    game = { ...game, board, active: spawnPiece('I') };
    const next = applyAction(game, 'hardDrop', rng);
    expect(next.lines).toBe(1);
    expect(next.lastClear).toEqual([ROWS - 1]);
    expect(next.score).toBeGreaterThanOrEqual(100);
    expect(next.board[ROWS - 1].every((c) => c === null)).toBe(true);
  });

  it('hold swaps once per piece', () => {
    const rng = seeded(4);
    const game = createGame(rng);
    const held = applyAction(game, 'hold', rng);
    expect(held.hold).toBe(game.active.type);
    expect(held.active.type).toBe(game.queue[0]);
    expect(applyAction(held, 'hold', rng)).toBe(held);
  });

  it('gravity moves the piece down and the lock delay settles it', () => {
    const rng = seeded(5);
    let game = createGame(rng);
    const y = game.active.y;
    game = tick(game, 1.01, rng);
    expect(game.active.y).toBe(y + 1);
    game = { ...game, active: { ...game.active, y: game.active.y + dropDistance(game.board, game.active) } };
    const before = game.locks;
    game = tick(game, LOCK_DELAY / 2, rng);
    expect(game.locks).toBe(before);
    game = tick(game, LOCK_DELAY, rng);
    expect(game.locks).toBe(before + 1);
  });

  it('ends the game when a new piece cannot spawn', () => {
    const rng = seeded(6);
    let game = createGame(rng);
    const board = createBoard().map((row, y) => (y < 2 ? row : row.map((_, x) => (x === 0 ? null : 'L'))));
    game = { ...game, board: board.map((row, y) => (y < 2 ? row.map((_, x) => (x >= 3 && x <= 6 ? 'S' : null)) : row)) };
    game = applyAction({ ...game, active: { ...spawnPiece('O'), y: -2 } }, 'hardDrop', rng);
    expect(game.over).toBe(true);
    expect(applyAction(game, 'left', rng)).toBe(game);
  });
});
