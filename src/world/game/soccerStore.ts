// Car soccer: the ball's live state (mutable, per frame) and the score (zustand).

import { create } from 'zustand';
import { ARENA, type GoalDef } from '../config/layout';
import { placeCar, runtime } from '../scene/runtime';
import { VEHICLE } from '../scene/tuning';
import { createBall, goalScored, kickBall, onPitch, resetBall, stepBall, type Ball } from './ballPhysics';
import { readGameJson, writeGame } from './storage';

interface SoccerRecord {
  /** Most goals in one visit. */
  best: number;
  /** Every goal ever scored here. */
  total: number;
}

function isSoccerRecord(value: unknown): value is SoccerRecord {
  return Boolean(value) && typeof value === 'object' && Number.isFinite((value as SoccerRecord).best) && Number.isFinite((value as SoccerRecord).total);
}

interface SoccerState {
  /** Goals this visit. */
  goals: number;
  /** Goals this visit by net (for the stadium scoreboard: north net / south net). */
  northNet: number;
  southNet: number;
  best: number;
  total: number;
  /** The car is on the pitch (shows the scoreboard chip). */
  inArena: boolean;
  /** Last goal, for the celebration. */
  lastGoal: { goal: GoalDef['id']; serial: number } | null;
  setInArena: (inArena: boolean) => void;
  resetBall: () => void;
  reload: () => void;
}

const stored = () => readGameJson<SoccerRecord>('kirat:soccer', { best: 0, total: 0 }, isSoccerRecord);

/** Seconds between a goal and the kick-off reset. */
export const GOAL_RESET_SECONDS = 2.2;

export const soccer = {
  ball: createBall() as Ball,
  /** Sim time when the post-goal reset happens (0 = none pending). */
  resetAt: 0,
  /** Strongest kick since the ball visual last read it (it resets this to 0). */
  lastKick: 0,
  /** Strongest wall impact since the ball visual last read it. */
  wallHit: 0,
};

let goalSerial = 0;

export const useSoccerStore = create<SoccerState>((set, get) => ({
  goals: 0,
  northNet: 0,
  southNet: 0,
  best: stored().best,
  total: stored().total,
  inArena: false,
  lastGoal: null,
  setInArena: (inArena) => {
    if (get().inArena !== inArena) set({ inArena });
  },
  resetBall: () => {
    resetBall(soccer.ball);
    soccer.resetAt = 0;
  },
  reload: () => {
    const record = stored();
    set({ best: Math.max(record.best, get().goals), total: Math.max(record.total, get().total) });
  },
}));

function scoreGoal(goal: GoalDef) {
  const state = useSoccerStore.getState();
  const goals = state.goals + 1;
  const best = Math.max(state.best, goals);
  const total = state.total + 1;
  writeGame('kirat:soccer', JSON.stringify({ best, total }));
  useSoccerStore.setState({
    goals,
    best,
    total,
    northNet: state.northNet + (goal.id === 'north' ? 1 : 0),
    southNet: state.southNet + (goal.id === 'south' ? 1 : 0),
    lastGoal: { goal: goal.id, serial: ++goalSerial },
  });
}

/** Kick-off: ball to the centre spot and, if the car is on the pitch, the car to its kick-off spot. */
export function kickoff(): void {
  resetBall(soccer.ball);
  soccer.resetAt = 0;
  const car = runtime.car;
  if (onPitch(car.x, car.z, 1)) {
    const { x, z, heading } = ARENA.carKickoff;
    placeCar(x, z, heading);
    runtime.camera.snap = true;
  }
}

/** One physics sub-step for the ball (after the car moved). */
export function stepSoccer(dt: number): void {
  const ball = soccer.ball;
  const car = runtime.car;
  // Only the car on (or at the edge of) the pitch can touch the ball.
  if (Math.abs(car.x - ball.x) < 4 && Math.abs(car.z - ball.z) < 4) {
    const body = { x: car.x, z: car.z, vx: car.vx, vz: car.vz, heading: car.heading, radius: VEHICLE.radius, boosting: car.boosting };
    const kick = kickBall(ball, body);
    if (kick > 0) {
      car.vx = body.vx;
      car.vz = body.vz;
      soccer.lastKick = Math.max(soccer.lastKick, kick);
    }
  }
  soccer.wallHit = Math.max(soccer.wallHit, stepBall(ball, dt));
  if (soccer.resetAt === 0) {
    const goal = goalScored(ball);
    if (goal) {
      scoreGoal(goal);
      soccer.resetAt = runtime.time + GOAL_RESET_SECONDS;
    }
  }
}

/** Once per frame: pending kick-off and the in-arena flag. */
export function updateSoccerFrame(): void {
  if (soccer.resetAt > 0 && runtime.time >= soccer.resetAt) kickoff();
  const car = runtime.car;
  useSoccerStore.getState().setInArena(onPitch(car.x, car.z, 0.5));
}
