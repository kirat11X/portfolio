import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, Pause, Play, Repeat2, RotateCw } from 'lucide-react';
import { useReducedMotion } from '@/lib/motion';
import {
  applyAction,
  COLS,
  createGame,
  ghostPiece,
  pieceCells,
  ROWS,
  SHAPES,
  tick,
  type PieceType,
  type TetrisAction,
  type TetrisState,
} from './tetrisLogic';
import {
  prepareCanvas,
  readHighScore,
  useAnimationLoop,
  useArcadeKeys,
  useFitCell,
  useOnTabHidden,
  useTouchControls,
  writeHighScore,
} from './shared';
import { TouchButton } from './TouchButton';
import { GameOverlayCard, HudStat } from './GameChrome';

const STORAGE_KEY = 'kirat:arcade:tetris';

const COLORS: Record<PieceType, string> = {
  I: '#3ee0ff',
  O: '#ffd447',
  T: '#b48cff',
  S: '#4ade80',
  Z: '#ff5c8a',
  J: '#5b8cff',
  L: '#ff9f43',
};

type Status = 'ready' | 'playing' | 'paused' | 'over';

interface Hud {
  score: number;
  level: number;
  lines: number;
  hold: PieceType | null;
  canHold: boolean;
  next: PieceType[];
}

function hudOf(state: TetrisState): Hud {
  return {
    score: state.score,
    level: state.level,
    lines: state.lines,
    hold: state.hold,
    canHold: state.canHold,
    next: state.queue.slice(0, 3),
  };
}

function sameHud(a: Hud, b: Hud) {
  return (
    a.score === b.score &&
    a.level === b.level &&
    a.lines === b.lines &&
    a.hold === b.hold &&
    a.canHold === b.canHold &&
    a.next.join() === b.next.join()
  );
}

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha = 1) {
  const inset = Math.max(1, size * 0.06);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
  // Inner shade + top gloss give the neon tile some depth without per-cell blur.
  ctx.fillStyle = 'rgba(4,5,10,0.28)';
  ctx.fillRect(x + size * 0.22, y + size * 0.22, size * 0.56, size * 0.56);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + inset, y + inset, size - inset * 2, Math.max(1, size * 0.1));
  ctx.globalAlpha = 1;
}

function drawPreview(canvas: HTMLCanvasElement | null, type: PieceType | null, size: number, dim = false) {
  if (!canvas) return;
  const width = size * 4;
  const height = size * 2.5;
  const ctx = prepareCanvas(canvas, width, height);
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  if (!type) return;
  const cells = SHAPES[type][0];
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const w = Math.max(...xs) - Math.min(...xs) + 1;
  const h = Math.max(...ys) - Math.min(...ys) + 1;
  const ox = (width - w * size) / 2 - Math.min(...xs) * size;
  const oy = (height - h * size) / 2 - Math.min(...ys) * size;
  for (const [x, y] of cells) drawBlock(ctx, ox + x * size, oy + y * size, size, COLORS[type], dim ? 0.35 : 1);
}

export default function BlocksGame() {
  const reduced = useReducedMotion();
  const touch = useTouchControls();
  const [initialGame] = useState(createGame);
  const gameRef = useRef<TetrisState>(initialGame);
  const [status, setStatusState] = useState<Status>('ready');
  const statusRef = useRef<Status>('ready');
  const [hud, setHud] = useState<Hud>(() => hudOf(initialGame));
  const [best, setBest] = useState(() => readHighScore(STORAGE_KEY));
  const [announcement, setAnnouncement] = useState('');
  const [newBest, setNewBest] = useState(false);
  const flash = useRef<{ rows: number[]; t: number }>({ rows: [], t: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holdRef = useRef<HTMLCanvasElement>(null);
  const nextRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { ref: wellRef, cell } = useFitCell(COLS, ROWS, 10, 40);

  const setStatus = useCallback((next: Status) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const commit = useCallback(
    (next: TetrisState) => {
      const prev = gameRef.current;
      if (next === prev) return;
      gameRef.current = next;
      if (next.locks !== prev.locks && next.lastClear.length > 0 && !reduced) {
        flash.current = { rows: next.lastClear, t: 0.22 };
      }
      const nextHud = hudOf(next);
      setHud((current) => (sameHud(current, nextHud) ? current : nextHud));
      if (next.over && !prev.over) {
        const previousBest = readHighScore(STORAGE_KEY);
        const isBest = next.score > previousBest;
        if (isBest) writeHighScore(STORAGE_KEY, next.score);
        setBest(Math.max(previousBest, next.score));
        setNewBest(isBest && next.score > 0);
        setStatus('over');
        setAnnouncement(
          `Game over. Score ${next.score}, ${next.lines} lines, level ${next.level}.${isBest && next.score > 0 ? ' New high score!' : ` High score ${previousBest}.`}`,
        );
      }
    },
    [reduced, setStatus],
  );

  const start = useCallback(() => {
    gameRef.current = createGame();
    flash.current = { rows: [], t: 0 };
    setHud(hudOf(gameRef.current));
    setNewBest(false);
    setAnnouncement('');
    setStatus('playing');
    surfaceRef.current?.focus({ preventScroll: true });
  }, [setStatus]);

  const act = useCallback(
    (action: TetrisAction) => {
      if (statusRef.current !== 'playing') return;
      commit(applyAction(gameRef.current, action));
    },
    [commit],
  );

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') setStatus('paused');
    else if (statusRef.current === 'paused') setStatus('playing');
  }, [setStatus]);

  useOnTabHidden(() => {
    if (statusRef.current === 'playing') setStatus('paused');
  });

  useArcadeKeys((key, phase) => {
    if (phase === 'up') return false;
    const current = statusRef.current;
    const code = key.code;
    if (code === 'KeyP') {
      togglePause();
      return true;
    }
    if (current !== 'playing') {
      if ((code === 'Enter' || code === 'Space') && !key.repeat) {
        if (current === 'paused') togglePause();
        else start();
        return true;
      }
      return false;
    }
    switch (code) {
      case 'ArrowLeft':
      case 'KeyA':
        act('left');
        return true;
      case 'ArrowRight':
      case 'KeyD':
        act('right');
        return true;
      case 'ArrowDown':
      case 'KeyS':
        act('softDrop');
        return true;
      case 'ArrowUp':
      case 'KeyW':
      case 'KeyX':
        if (!key.repeat) act('rotateCW');
        return true;
      case 'KeyZ':
      case 'ControlLeft':
      case 'ControlRight':
        if (!key.repeat) act('rotateCCW');
        return true;
      case 'Space':
        if (!key.repeat) act('hardDrop');
        return true;
      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        if (!key.repeat) act('hold');
        return true;
      default:
        return false;
    }
  });

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas || cell === 0) return;
    const width = COLS * cell;
    const height = ROWS * cell;
    const ctx = prepareCanvas(canvas, width, height);
    if (!ctx) return;
    const state = gameRef.current;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#080a12';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, height);
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(width, y * cell + 0.5);
    }
    ctx.stroke();

    state.board.forEach((row, y) =>
      row.forEach((type, x) => {
        if (type) drawBlock(ctx, x * cell, y * cell, cell, COLORS[type], 0.9);
      }),
    );

    if (statusRef.current !== 'ready' && !state.over) {
      const color = COLORS[state.active.type];
      const ghost = ghostPiece(state.board, state.active);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1, cell * 0.07);
      for (const [x, y] of pieceCells(ghost)) {
        if (y < 0) continue;
        ctx.strokeRect(x * cell + cell * 0.12, y * cell + cell * 0.12, cell * 0.76, cell * 0.76);
      }
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = reduced ? 0 : cell * 0.5;
      for (const [x, y] of pieceCells(state.active)) {
        if (y >= 0) drawBlock(ctx, x * cell, y * cell, cell, color);
      }
      ctx.restore();
    }

    if (flash.current.t > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(flash.current.t / 0.22) * 0.55})`;
      // Rows have already collapsed; flash the band where they were for a beat.
      const count = flash.current.rows.length;
      const bottom = Math.max(...flash.current.rows);
      ctx.fillRect(0, (bottom - count + 1) * cell, width, count * cell);
    }
  }

  useAnimationLoop((dt) => {
    if (statusRef.current === 'playing') commit(tick(gameRef.current, dt));
    if (flash.current.t > 0) flash.current.t = Math.max(0, flash.current.t - dt);
    draw();
  });

  // Hold / next previews only change with the HUD.
  const previewCell = touch ? 11 : 18;
  useEffect(() => {
    drawPreview(holdRef.current, hud.hold, previewCell, !hud.canHold);
    hud.next.forEach((type, index) => drawPreview(nextRefs.current[index] ?? null, type, index === 0 ? previewCell : previewCell * 0.8));
  }, [hud, previewCell]);

  const holdPanel = (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-contrast/[0.03] p-2">
      <span className="eyebrow text-fg-subtle">Hold</span>
      <canvas ref={holdRef} aria-label={hud.hold ? `Held piece: ${hud.hold}` : 'No piece held'} role="img" />
    </div>
  );
  const nextPanel = (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-contrast/[0.03] p-2">
      <span className="eyebrow text-fg-subtle">Next</span>
      <div className={touch ? 'flex items-center gap-1' : 'flex flex-col items-center gap-2'} role="img" aria-label={`Next pieces: ${hud.next.join(', ')}`}>
        {(touch ? hud.next.slice(0, 2) : hud.next).map((_, index) => (
          <canvas key={index} ref={(node) => { nextRefs.current[index] = node; }} aria-hidden="true" />
        ))}
      </div>
    </div>
  );
  const stats = (
    <dl className={touch ? 'grid grid-cols-3 gap-2' : 'grid gap-2'}>
      <HudStat label="Score" value={hud.score} />
      <HudStat label="Level" value={hud.level} />
      <HudStat label="Lines" value={hud.lines} />
      {!touch && <HudStat label="Best" value={Math.max(best, hud.score)} />}
    </dl>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {touch && (
        <div className="flex items-stretch gap-2">
          {holdPanel}
          <div className="min-w-0 flex-1">{stats}</div>
          {nextPanel}
        </div>
      )}
      <div className="flex min-h-0 flex-1 items-stretch justify-center gap-4">
        {!touch && (
          <div className="flex w-40 shrink-0 flex-col gap-3">
            {holdPanel}
            {stats}
          </div>
        )}
        <div ref={wellRef} className="relative flex min-h-0 min-w-0 flex-1 items-start justify-center md:max-w-[22rem]">
          <div
            ref={surfaceRef}
            tabIndex={0}
            role="application"
            aria-roledescription="game"
            aria-label="Blocks playfield. Arrow keys or WASD move, Up rotates, Space hard drops, C holds, P pauses."
            className="relative rounded-md shadow-[0_0_0_1px_rgb(var(--arcade-rgb)/0.45),0_0_32px_-6px_rgb(var(--arcade-rgb)/0.55)]"
            style={{ width: COLS * cell, height: ROWS * cell }}
            onPointerDown={(event) => {
              if (touch && statusRef.current === 'playing' && event.target === canvasRef.current) act('rotateCW');
            }}
          >
            <canvas ref={canvasRef} className="rounded-md" aria-hidden="true" />
            {status === 'ready' && (
              <GameOverlayCard title="Blocks" body={touch ? 'Tap the board to rotate.' : 'Arrows / WASD to move · Space to drop'} actionLabel="Start" onAction={start} />
            )}
            {status === 'paused' && <GameOverlayCard title="Paused" body="Press P to resume." actionLabel="Resume" onAction={togglePause} />}
            {status === 'over' && (
              <GameOverlayCard
                title="Game over"
                body={`Score ${hud.score}${newBest ? ' · New high score!' : ` · Best ${best}`}`}
                actionLabel="Play again"
                onAction={start}
              />
            )}
          </div>
        </div>
        {!touch && (
          <div className="flex w-40 shrink-0 flex-col gap-3">
            {nextPanel}
            <ul className="space-y-1 font-mono text-[0.7rem] leading-relaxed text-fg-subtle">
              <li><kbd className="text-fg-muted">← →</kbd> move</li>
              <li><kbd className="text-fg-muted">↑ / X</kbd> rotate ↻</li>
              <li><kbd className="text-fg-muted">Z</kbd> rotate ↺</li>
              <li><kbd className="text-fg-muted">↓</kbd> soft drop</li>
              <li><kbd className="text-fg-muted">Space</kbd> hard drop</li>
              <li><kbd className="text-fg-muted">C / Shift</kbd> hold</li>
              <li><kbd className="text-fg-muted">P</kbd> pause</li>
            </ul>
          </div>
        )}
      </div>
      {touch && (
        <div className="grid shrink-0 grid-cols-4 gap-2" aria-label="Game controls" role="group">
          <TouchButton label="Hold piece" onPress={() => act('hold')}>
            <Repeat2 className="size-5" aria-hidden="true" />
          </TouchButton>
          <TouchButton label="Rotate" onPress={() => act('rotateCW')}>
            <RotateCw className="size-5" aria-hidden="true" />
          </TouchButton>
          <TouchButton label="Hard drop" onPress={() => act('hardDrop')}>
            <ChevronsDown className="size-5" aria-hidden="true" />
          </TouchButton>
          <TouchButton label={status === 'paused' ? 'Resume' : 'Pause'} onPress={togglePause}>
            {status === 'paused' ? <Play className="size-5" aria-hidden="true" /> : <Pause className="size-5" aria-hidden="true" />}
          </TouchButton>
          <TouchButton label="Move left" repeat onPress={() => act('left')}>
            <ArrowLeft className="size-5" aria-hidden="true" />
          </TouchButton>
          <TouchButton label="Soft drop" repeat onPress={() => act('softDrop')} className="col-span-2">
            <ArrowDown className="size-5" aria-hidden="true" />
          </TouchButton>
          <TouchButton label="Move right" repeat onPress={() => act('right')}>
            <ArrowRight className="size-5" aria-hidden="true" />
          </TouchButton>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
