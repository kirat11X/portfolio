import { useNavigate } from 'react-router-dom';
import { interact, describeInteractable } from '../scene/actions';
import { useHudStore } from '../scene/uiState';
import { useArcadeStore } from '../arcade/arcadeStore';
import { useConsentStore } from '../game/consentStore';
import { useRaceStore } from '../game/raceStore';
import { useWorldStore } from '../state/worldStore';
import { Kbd } from './Kbd';
import { useIsTouch } from './useMedia';

/** "Press E to view …" when the vehicle is parked on an exhibit pad, at a door or at a Gaming Zone prop. */
export function ProximityPrompt() {
  const focusedId = useWorldStore((s) => s.focusedId);
  const panelOpen = useWorldStore((s) => s.selectedExhibitId !== null);
  const showcase = useHudStore((s) => s.showcase);
  const closeup = useHudStore((s) => s.closeup);
  const arcadeOpen = useArcadeStore((s) => s.open !== null);
  const consentOpen = useConsentStore((s) => s.cardOpen);
  const raceBusy = useRaceStore((s) => s.phase !== 'idle');
  const touch = useIsTouch();
  const navigate = useNavigate();
  const info = describeInteractable(focusedId);
  if (!info || panelOpen || showcase || closeup || arcadeOpen || raceBusy) return null;
  if (consentOpen && focusedId === 'server:ram') return null;
  const verb = info.verb.charAt(0).toUpperCase() + info.verb.slice(1);

  return (
    <button
      key={focusedId}
      type="button"
      onClick={() => interact(focusedId, navigate)}
      className="glass-strong pointer-events-auto inline-flex max-w-[min(30rem,100%)] items-center gap-2.5 rounded-full py-2 pl-2.5 pr-4 text-left text-[13.5px] text-fg-muted shadow-panel animate-rise hover:border-line-strong"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: info.accent, boxShadow: `0 0 10px 1px ${info.accent}` }}
      />
      {touch ? (
        <span className="line-clamp-2">
          {verb} <span className="font-medium text-fg">{info.name}</span>
          {info.detail && <span className="text-fg-subtle"> — {info.detail}</span>}
        </span>
      ) : (
        <span className="line-clamp-2">
          Press <Kbd className="mx-0.5 align-[1px] text-fg">E</Kbd> to {info.verb} <span className="font-medium text-fg">{info.name}</span>
          {info.detail && <span className="text-fg-subtle"> — {info.detail}</span>}
        </span>
      )}
    </button>
  );
}
