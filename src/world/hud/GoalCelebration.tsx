import { useEffect, useRef, useState } from 'react';
import { getReducedMotion } from '@/lib/motion';
import { neon } from '@/styles/tokens';
import { useSoccerStore } from '../game/soccerStore';

const COLORS = [neon.orange, neon.cyan, neon.magenta, neon.amber, neon.emerald, neon.white];
const PIECES = 42;

/** GOAL! toast, a screen flash and confetti (reduced motion: just the toast). */
export function GoalCelebration() {
  const lastGoal = useSoccerStore((s) => s.lastGoal);
  const goals = useSoccerStore((s) => s.goals);
  const [shown, setShown] = useState<{ serial: number; goals: number } | null>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const seen = useRef(lastGoal?.serial ?? 0);

  useEffect(() => {
    if (!lastGoal || lastGoal.serial === seen.current) return;
    seen.current = lastGoal.serial;
    setShown({ serial: lastGoal.serial, goals });
    const timer = window.setTimeout(() => setShown((s) => (s?.serial === lastGoal.serial ? null : s)), 2200);
    if (!getReducedMotion()) {
      flashRef.current?.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 650, easing: 'ease-out' });
      const host = confettiRef.current;
      if (host) {
        host.replaceChildren();
        for (let i = 0; i < PIECES; i++) {
          const piece = document.createElement('span');
          const size = 6 + Math.random() * 6;
          piece.style.cssText = `position:absolute;left:50%;top:38%;width:${size}px;height:${size * 0.45}px;border-radius:2px;background:${COLORS[i % COLORS.length]};box-shadow:0 0 8px ${COLORS[i % COLORS.length]}`;
          host.appendChild(piece);
          const angle = Math.random() * Math.PI * 2;
          const reach = 140 + Math.random() * 260;
          const dx = Math.cos(angle) * reach;
          const dy = Math.sin(angle) * reach * 0.7 - 80;
          piece
            .animate(
              [
                { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
                { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 260}px)) rotate(${(Math.random() - 0.5) * 900}deg)`, opacity: 0 },
              ],
              { duration: 1400 + Math.random() * 600, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)', fill: 'forwards' },
            )
            .finished.then(() => piece.remove())
            .catch(() => undefined);
        }
      }
    }
    return () => window.clearTimeout(timer);
  }, [lastGoal, goals]);

  return (
    <>
      <p className="sr-only" aria-live="assertive">
        {shown ? `Goal! ${shown.goals} this visit.` : ''}
      </p>
      <div ref={flashRef} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0" style={{ background: `radial-gradient(circle at 50% 40%, ${neon.orange}aa, transparent 65%)` }} />
      <div ref={confettiRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" />
      {shown && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[34%] flex flex-col items-center">
          <span
            key={shown.serial}
            className="font-display text-[64px] font-bold leading-none tracking-tight animate-rise sm:text-[96px]"
            style={{ color: neon.orange, textShadow: `0 0 28px ${neon.orange}` }}
          >
            GOAL!
          </span>
          <span className="mt-2 rounded-full border border-line-strong bg-ink-900/90 px-3 py-1 text-[13px] font-medium text-fg">
            {shown.goals} this visit
          </span>
        </div>
      )}
    </>
  );
}
