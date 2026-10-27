import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play } from 'lucide-react';
import { useReducedMotion } from '@/lib/motion';
import {
  createPacGame,
  DIRS,
  MAZE_COLS,
  MAZE_ROWS,
  renderPos,
  setWanted,
  stepPac,
  type Dir,
  type Ghost,
  type GhostName,
  type Maze,
  type PacState,
} from './pacmanLogic';
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

const STORAGE_KEY = 'kirat:arcade:pacman';
const WALL = '#b48cff';
const CHOMPER = '#ffd447';
const GHOST_COLORS: Record<GhostName, string> = {
  spark: '#ff4d6d',
  ambush: '#ff8be0',
  flank: '#3ee0ff',
  drift: '#ff9f43',
};

type Status = 'title' | 'playing' | 'paused' | 'over';

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

const isWall = (maze: Maze, x: number, y: number) => y >= 0 && y < maze.length && x >= 0 && x < maze[0].length && maze[y][x] === 'wall';

/** Neon outlines along every wall edge that faces a corridor; rendered once per cell size. */
function renderWalls(maze: Maze, cell: number, reduced: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = prepareCanvas(canvas, MAZE_COLS * cell, MAZE_ROWS * cell)!;
  const trace = () => {
    ctx.beginPath();
    for (let y = 0; y < MAZE_ROWS; y++) {
      for (let x = 0; x < MAZE_COLS; x++) {
        if (!isWall(maze, x, y)) continue;
        const px = x * cell;
        const py = y * cell;
        const open = (nx: number, ny: number) => ny >= 0 && ny < MAZE_ROWS && nx >= 0 && nx < MAZE_COLS && !isWall(maze, nx, ny);
        if (open(x, y - 1)) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cell, py);
        }
        if (open(x, y + 1)) {
          ctx.moveTo(px, py + cell);
          ctx.lineTo(px + cell, py + cell);
        }
        if (open(x - 1, y)) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cell);
        }
        if (open(x + 1, y)) {
          ctx.moveTo(px + cell, py);
          ctx.lineTo(px + cell, py + cell);
        }
      }
    }
  };
  // Faint fill so wall blocks read as solid shapes.
  ctx.fillStyle = 'rgba(180,140,255,0.07)';
  for (let y = 0; y < MAZE_ROWS; y++) for (let x = 0; x < MAZE_COLS; x++) if (isWall(maze, x, y)) ctx.fillRect(x * cell, y * cell, cell, cell);
  ctx.lineCap = 'round';
  ctx.strokeStyle = WALL;
  if (!reduced) {
    ctx.save();
    ctx.shadowColor = WALL;
    ctx.shadowBlur = cell * 0.6;
    ctx.lineWidth = Math.max(1.5, cell * 0.12);
    ctx.globalAlpha = 0.7;
    trace();
    ctx.stroke();
    ctx.restore();
  }
  ctx.lineWidth = Math.max(1, cell * 0.08);
  trace();
  ctx.stroke();
  return canvas;
}

function drawGhost(ctx: CanvasRenderingContext2D, ghost: Ghost, cx: number, cy: number, r: number, fright: number, time: number, reduced: boolean) {
  const frightened = fright > 0 && ghost.mode === 'active';
  const eaten = ghost.mode === 'eaten';
  const flashing = frightened && fright < 2 && !reduced && Math.floor(time * 6) % 2 === 0;
  const body = frightened ? (flashing ? '#f2f4f8' : '#5b5bff') : GHOST_COLORS[ghost.name];
  if (!eaten) {
    ctx.save();
    ctx.fillStyle = body;
    ctx.shadowColor = body;
    ctx.shadowBlur = reduced ? 0 : r * 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.1, r, Math.PI, 0);
    const bottom = cy + r * 0.85;
    ctx.lineTo(cx + r, bottom);
    // Three soft scallops along the hem; they sway while moving.
    const sway = reduced ? 0 : Math.sin(time * 10) * r * 0.08;
    const w = (r * 2) / 3;
    for (let i = 0; i < 3; i++) {
      const x0 = cx + r - w * i;
      ctx.quadraticCurveTo(x0 - w / 2 + sway, bottom - r * 0.35, x0 - w, bottom);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  if (frightened) {
    ctx.fillStyle = flashing ? '#ff4d6d' : '#f2f4f8';
    ctx.fillRect(cx - r * 0.42, cy - r * 0.3, r * 0.2, r * 0.22);
    ctx.fillRect(cx + r * 0.22, cy - r * 0.3, r * 0.2, r * 0.22);
    ctx.beginPath();
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.strokeStyle = ctx.fillStyle;
    for (let i = 0; i <= 4; i++) {
      const x = cx - r * 0.5 + (r / 4) * i;
      const y = cy + r * 0.3 + (i % 2 === 0 ? 0 : -r * 0.14);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    return;
  }
  // Eyes look where the ghost is heading.
  const look = DIRS[ghost.dir];
  for (const side of [-1, 1]) {
    const ex = cx + side * r * 0.38;
    const ey = cy - r * 0.2;
    ctx.fillStyle = '#f2f4f8';
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.27, r * 0.33, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10131f';
    ctx.beginPath();
    ctx.arc(ex + look.x * r * 0.12, ey + look.y * r * 0.14, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
}

const ANGLE: Record<Dir, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

export default function PacMazeGame() {
  const reduced = useReducedMotion();
  const touch = useTouchControls();
  const [initialGame] = useState(() => createPacGame());
  const gameRef = useRef<PacState>(initialGame);
  const [status, setStatusState] = useState<Status>('title');
  const statusRef = useRef<Status>('title');
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1 });
  const [best, setBest] = useState(() => readHighScore(STORAGE_KEY));
  const [announcement, setAnnouncement] = useState('');
  const [newBest, setNewBest] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const wallCache = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const { ref: fitRef, cell } = useFitCell(MAZE_COLS, MAZE_ROWS, 10, 34);

  const setStatus = useCallback((next: Status) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const start = useCallback(() => {
    gameRef.current = createPacGame();
    setHud({ score: 0, lives: 3, level: 1 });
    setNewBest(false);
    setAnnouncement('');
    setStatus('playing');
    surfaceRef.current?.focus({ preventScroll: true });
  }, [setStatus]);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') setStatus('paused');
    else if (statusRef.current === 'paused') {
      setStatus('playing');
      surfaceRef.current?.focus({ preventScroll: true });
    }
  }, [setStatus]);

  const steer = useCallback((dir: Dir) => {
    if (statusRef.current !== 'playing') return;
    gameRef.current = setWanted(gameRef.current, dir);
  }, []);

  useOnTabHidden(() => {
    if (statusRef.current === 'playing') setStatus('paused');
  });

  useArcadeKeys((key, phase) => {
    if (phase === 'up') return false;
    const current = statusRef.current;
    if (key.code === 'KeyP') {
      togglePause();
      return true;
    }
    if (current !== 'playing') {
      if ((key.code === 'Enter' || key.code === 'Space') && !key.repeat) {
        if (current === 'paused') togglePause();
        else start();
        return true;
      }
      return false;
    }
    const dir = KEY_DIRS[key.code];
    if (dir) {
      steer(dir);
      return true;
    }
    return false;
  });

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas || cell === 0) return;
    const width = MAZE_COLS * cell;
    const height = MAZE_ROWS * cell;
    const ctx = prepareCanvas(canvas, width, height);
    if (!ctx) return;
    const s = gameRef.current;
    ctx.fillStyle = '#07080e';
    ctx.fillRect(0, 0, width, height);

    const cacheKey = `${cell}:${reduced}`;
    if (wallCache.current?.key !== cacheKey) wallCache.current = { key: cacheKey, canvas: renderWalls(s.maze, cell, reduced) };
    ctx.drawImage(wallCache.current.canvas, 0, 0, width, height);

    // Ghost-house door.
    ctx.fillStyle = '#ff8be0';
    ctx.fillRect(9 * cell, 8 * cell + cell * 0.42, cell, Math.max(2, cell * 0.16));

    const pulse = reduced ? 1 : 0.75 + 0.25 * Math.sin(s.time * 8);
    for (let y = 0; y < MAZE_ROWS; y++) {
      for (let x = 0; x < MAZE_COLS; x++) {
        const tile = s.maze[y][x];
        if (tile === 'pellet') {
          ctx.fillStyle = 'rgba(255,230,200,0.85)';
          const r = Math.max(1.2, cell * 0.1);
          ctx.fillRect((x + 0.5) * cell - r, (y + 0.5) * cell - r, r * 2, r * 2);
        } else if (tile === 'power') {
          const px = (x + 0.5) * cell;
          const py = (y + 0.5) * cell;
          if (!reduced) {
            ctx.fillStyle = 'rgba(255,212,71,0.18)';
            ctx.beginPath();
            ctx.arc(px, py, cell * 0.48 * pulse, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#ffe9c2';
          ctx.beginPath();
          ctx.arc(px, py, cell * 0.28 * (reduced ? 1 : 0.85 + 0.15 * pulse), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const showActors = statusRef.current !== 'title';
    if (showActors) {
      for (const ghost of s.ghosts) {
        let p = renderPos(s.maze, ghost.pos, ghost.dir, ghost.progress);
        if (ghost.mode === 'house' && !reduced) p = { x: p.x, y: p.y + Math.sin(s.time * 6 + p.x) * 0.06 };
        if (s.phase === 'dying' && s.phaseTimer < 1) continue;
        drawGhost(ctx, ghost, (p.x + 0.5) * cell, (p.y + 0.5) * cell, cell * 0.46, s.fright, s.time, reduced);
      }

      const pp = renderPos(s.maze, s.player.pos, s.player.dir, s.player.progress);
      const cx = (pp.x + 0.5) * cell;
      const cy = (pp.y + 0.5) * cell;
      const r = cell * 0.46;
      let mouth = s.player.moving && s.phase === 'playing' ? 0.05 + 0.32 * Math.abs(Math.sin(s.time * 11)) : 0.22;
      let scale = 1;
      if (s.phase === 'dying') {
        // Folds open, then shrinks away.
        const t = 1 - s.phaseTimer / 1.4;
        mouth = Math.min(Math.PI * 0.98, 0.22 + t * Math.PI * 1.2);
        scale = t > 0.8 ? Math.max(0, 1 - (t - 0.8) * 5) : 1;
      }
      if (scale > 0) {
        ctx.save();
        ctx.fillStyle = CHOMPER;
        ctx.shadowColor = CHOMPER;
        ctx.shadowBlur = reduced ? 0 : cell * 0.7;
        ctx.translate(cx, cy);
        ctx.rotate(ANGLE[s.player.dir]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r * scale, mouth, Math.PI * 2 - mouth);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.font = `600 ${Math.max(9, cell * 0.5)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const popup of s.popups) {
        ctx.fillStyle = `rgba(62,224,255,${Math.min(1, popup.ttl * 2)})`;
        ctx.fillText(String(popup.value), (popup.pos.x + 0.5) * cell, (popup.pos.y + 0.5 - (0.9 - popup.ttl) * 0.6) * cell);
      }

      if (s.phase === 'ready' || s.phase === 'cleared') {
        ctx.font = `600 ${Math.max(10, cell * 0.7)}px "Unbounded", sans-serif`;
        ctx.fillStyle = s.phase === 'ready' ? CHOMPER : '#3ee0ff';
        ctx.fillText(s.phase === 'ready' ? 'READY' : 'CLEARED!', 9.5 * cell, 11.5 * cell);
      }
    }
  }

  useAnimationLoop((dt) => {
    if (statusRef.current === 'playing') {
      const prev = gameRef.current;
      const next = stepPac(prev, dt);
      gameRef.current = next;
      if (next.score !== prev.score || next.lives !== prev.lives || next.level !== prev.level) {
        setHud({ score: next.score, lives: next.lives, level: next.level });
      }
      if (next.level !== prev.level) setAnnouncement(`Maze cleared. Level ${next.level}.`);
      if (next.phase === 'over' && prev.phase !== 'over') {
        const previousBest = readHighScore(STORAGE_KEY);
        const isBest = next.score > previousBest;
        if (isBest) writeHighScore(STORAGE_KEY, next.score);
        setBest(Math.max(previousBest, next.score));
        setNewBest(isBest && next.score > 0);
        setStatus('over');
        setAnnouncement(
          `Game over. Score ${next.score}, reached level ${next.level}.${isBest && next.score > 0 ? ' New high score!' : ` High score ${previousBest}.`}`,
        );
      }
    }
    draw();
  });

  // Redraw static frame immediately when the cell size changes (e.g. paused + resize).
  useEffect(() => {
    wallCache.current = null;
  }, [cell]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const start = swipe.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) < 18) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const endSwipe = () => {
    swipe.current = null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <dl className="grid shrink-0 grid-cols-4 gap-2">
        <HudStat label="Score" value={hud.score} />
        <HudStat label="Best" value={Math.max(best, hud.score)} />
        <HudStat label="Level" value={hud.level} />
        <div className="rounded-xl border border-line bg-contrast/[0.03] px-3 py-2">
          <dt className="eyebrow text-[0.62rem] text-fg-subtle">Lives</dt>
          <dd className="flex h-[1.4rem] items-center gap-1">
            <span className="sr-only">{hud.lives}</span>
            {Array.from({ length: Math.max(0, hud.lives) }, (_, i) => (
              <svg key={i} viewBox="0 0 20 20" className="size-4 text-[#ffd447]" aria-hidden="true">
                <path d="M10 10 L18.5 5.5 A9 9 0 1 0 18.5 14.5 Z" fill="currentColor" />
              </svg>
            ))}
          </dd>
        </div>
      </dl>
      <div ref={fitRef} className="relative flex min-h-0 flex-1 items-center justify-center">
        <div
          ref={surfaceRef}
          tabIndex={0}
          role="application"
          aria-roledescription="game"
          aria-label="Pac-Maze. Arrow keys or WASD steer the chomper, P pauses. On touch, swipe the maze or use the arrow pad."
          className="relative touch-none rounded-md shadow-[0_0_0_1px_rgb(var(--arcade-rgb)/0.4),0_0_36px_-8px_rgb(var(--arcade-rgb)/0.55)]"
          style={{ width: MAZE_COLS * cell, height: MAZE_ROWS * cell }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endSwipe}
          onPointerCancel={endSwipe}
        >
          <canvas ref={canvasRef} className="rounded-md" aria-hidden="true" />
          {status === 'title' && (
            <GameOverlayCard
              title="Pac-Maze"
              body={touch ? 'Swipe or use the pad to steer. Power pellets turn the tables.' : 'Arrows / WASD to steer. Power pellets turn the tables.'}
              actionLabel="Start"
              onAction={start}
            />
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
      {touch ? (
        <div className="flex shrink-0 items-center justify-between gap-3">
          <TouchButton label={status === 'paused' ? 'Resume' : 'Pause'} onPress={togglePause} className="h-11">
            {status === 'paused' ? <Play className="size-5" aria-hidden="true" /> : <Pause className="size-5" aria-hidden="true" />}
          </TouchButton>
          <div className="grid grid-cols-3 grid-rows-2 gap-1.5" role="group" aria-label="Direction pad">
            <TouchButton label="Up" onPress={() => steer('up')} className="col-start-2 h-14 w-16">
              <ArrowUp className="size-5" aria-hidden="true" />
            </TouchButton>
            <TouchButton label="Left" onPress={() => steer('left')} className="col-start-1 row-start-2 h-14 w-16">
              <ArrowLeft className="size-5" aria-hidden="true" />
            </TouchButton>
            <TouchButton label="Down" onPress={() => steer('down')} className="col-start-2 row-start-2 h-14 w-16">
              <ArrowDown className="size-5" aria-hidden="true" />
            </TouchButton>
            <TouchButton label="Right" onPress={() => steer('right')} className="col-start-3 row-start-2 h-14 w-16">
              <ArrowRight className="size-5" aria-hidden="true" />
            </TouchButton>
          </div>
        </div>
      ) : (
        <p className="shrink-0 text-center font-mono text-[0.7rem] text-fg-subtle">
          <kbd className="text-fg-muted">← ↑ → ↓</kbd> / <kbd className="text-fg-muted">WASD</kbd> steer · <kbd className="text-fg-muted">P</kbd> pause ·
          power pellets make ghosts edible
        </p>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
