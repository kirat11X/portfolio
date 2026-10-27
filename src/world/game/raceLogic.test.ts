import { describe, expect, it } from 'vitest';
import { RACE, gateEnds } from '../config/layout';
import { cleanName, crossedGate, formatRaceTime, insertLap, isRaceRecord, RACE_GATES, segmentsIntersect, sortBoard, type LapEntry } from './raceLogic';

describe('segmentsIntersect', () => {
  it('finds crossing segments and rejects misses and parallels', () => {
    expect(segmentsIntersect(0, -1, 0, 1, -1, 0, 1, 0)).toBe(true);
    expect(segmentsIntersect(0, 0.5, 0, 1, -1, 0, 1, 0)).toBe(false);
    expect(segmentsIntersect(2, -1, 2, 1, -1, 0, 1, 0)).toBe(false);
    expect(segmentsIntersect(-1, 1, 1, 1, -1, 0, 1, 0)).toBe(false);
  });
});

describe('crossedGate', () => {
  it('counts a crossing only in the direction of travel', () => {
    const gate = RACE.finish; // heading north (−z), at z = 7
    expect(crossedGate(gate, gate.x, gate.z + 1, gate.x, gate.z - 1)).toBe(true);
    expect(crossedGate(gate, gate.x, gate.z - 1, gate.x, gate.z + 1)).toBe(false);
  });

  it('ignores paths that pass beside the posts', () => {
    const gate = RACE.finish;
    const x = gate.x + gate.width;
    expect(crossedGate(gate, x, gate.z + 1, x, gate.z - 1)).toBe(false);
  });

  it('works for every gate of the lap along its own heading', () => {
    for (const gate of RACE_GATES) {
      const fx = -Math.sin(gate.rotationY);
      const fz = -Math.cos(gate.rotationY);
      expect(crossedGate(gate, gate.x - fx, gate.z - fz, gate.x + fx, gate.z + fz)).toBe(true);
      const [[ax, az], [bx, bz]] = gateEnds(gate);
      expect(Math.hypot(bx - ax, bz - az)).toBeCloseTo(gate.width, 6);
    }
  });
});

describe('formatRaceTime', () => {
  it('formats m:ss.cc', () => {
    expect(formatRaceTime(0)).toBe('0:00.00');
    expect(formatRaceTime(65.327)).toBe('1:05.32');
    expect(formatRaceTime(9.999)).toBe('0:09.99');
  });
});

describe('leaderboard', () => {
  const lap = (time: number, at: number, name = 'You'): LapEntry => ({ name, time, at });

  it('sorts by time, then by who set it first', () => {
    const sorted = sortBoard([lap(80, 3), lap(70, 2), lap(70, 1), lap(90, 0)]);
    expect(sorted.map((e) => [e.time, e.at])).toEqual([
      [70, 1],
      [70, 2],
      [80, 3],
      [90, 0],
    ]);
  });

  it('keeps the top five and reports the new lap’s place', () => {
    const board = [lap(60, 1), lap(65, 2), lap(70, 3), lap(75, 4), lap(80, 5)];
    const fast = insertLap(board, lap(62, 6));
    expect(fast.rank).toBe(1);
    expect(fast.board).toHaveLength(5);
    expect(fast.board.at(-1)?.time).toBe(75);
    const slow = insertLap(board, lap(99, 7));
    expect(slow.rank).toBeNull();
    expect(slow.board).toEqual(board);
  });

  it('cleans names and validates stored records', () => {
    expect(cleanName('   ')).toBe('You');
    expect(cleanName('  Speedy   Gonzales the Third  ')).toBe('Speedy Gonzales');
    expect(isRaceRecord({ board: [lap(70, 1)] })).toBe(true);
    expect(isRaceRecord({ board: [{ name: 'x', time: -1, at: 0 }] })).toBe(false);
    expect(isRaceRecord(null)).toBe(false);
  });
});
