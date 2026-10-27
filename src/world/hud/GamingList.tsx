import type { ReactNode } from 'react';
import { ArrowUpRight, Flag, Gamepad2, MemoryStick, Monitor, Trophy } from 'lucide-react';
import { neon } from '@/styles/tokens';
import { useArcadeStore, type ArcadeGameId } from '../arcade/arcadeStore';
import { GAMING_SPOTS, type SpotId } from '../config/layout';
import { useConsentStore } from '../game/consentStore';
import { useRaceStore } from '../game/raceStore';
import { goToArena, openCloseup } from '../scene/actions';
import { SPOT_PROMPTS } from '../scene/destinations';

const ARCADE: Array<{ id: ArcadeGameId; spot: SpotId }> = [
  { id: 'tetris', spot: 'arcade:tetris' },
  { id: 'pacman', spot: 'arcade:pacman' },
  { id: 'catgpt', spot: 'arcade:catgpt' },
];

function Item({ icon, title, detail, onClick }: { icon: ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group -mx-2 flex w-[calc(100%+1rem)] items-start justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-white/[0.04]"
      >
        <span className="flex min-w-0 items-start gap-2.5">
          <span aria-hidden="true" className="mt-0.5 flex shrink-0" style={{ color: neon.orange }}>
            {icon}
          </span>
          <span>
            <span className="text-fg">{title}</span>
            <span className="block text-[12.5px] text-fg-subtle">{detail}</span>
          </span>
        </span>
        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted opacity-60 group-hover:opacity-100" aria-hidden="true" />
      </button>
    </li>
  );
}

/**
 * Every Gaming Zone activity as a real button (help and map dialogs): the three
 * cabinets, the PC close-up, the time trial, the soccer arena and the data
 * server's storage choice. `done` closes the dialog first.
 */
export function GamingList({ done }: { done: () => void }) {
  const racing = useRaceStore((s) => s.phase === 'countdown' || s.phase === 'running');
  const consent = useConsentStore((s) => s.status);
  const run = (action: () => void) => () => {
    done();
    action();
  };
  return (
    <ul className="grid gap-x-6 sm:grid-cols-2">
      {ARCADE.map(({ id, spot }) => (
        <Item
          key={id}
          icon={<Gamepad2 className="h-4 w-4" />}
          title={id === 'catgpt' ? 'Chat with CatGPT' : `Play ${SPOT_PROMPTS[spot].name}`}
          detail={SPOT_PROMPTS[spot].summary}
          onClick={run(() => useArcadeStore.getState().openGame(id))}
        />
      ))}
      <Item icon={<Monitor className="h-4 w-4" />} title="Look at the gaming PC" detail="A close look at the rig in the Gaming Zone" onClick={run(() => openCloseup(GAMING_SPOTS.pc))} />
      <Item
        icon={<Flag className="h-4 w-4" />}
        title={racing ? 'Restart the time trial' : 'Start the time trial'}
        detail="A timed lap round the island — pass every gate in order"
        onClick={run(() => useRaceStore.getState().start())}
      />
      <Item icon={<Trophy className="h-4 w-4" />} title="Go to car soccer" detail="Push the ball into either net; B resets the ball" onClick={run(() => goToArena())} />
      <Item
        icon={<MemoryStick className="h-4 w-4" />}
        title="Data server: what this browser remembers"
        detail={consent === 'granted' ? 'Fed: car and scores are kept here' : 'Hungry: car and scores last for this visit'}
        onClick={run(() => useConsentStore.getState().openCard())}
      />
    </ul>
  );
}
