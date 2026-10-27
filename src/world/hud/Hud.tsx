import { stopShowcase } from '../scene/showcase';
import { useWorldStore } from '../state/worldStore';
import { ConsentCard } from './ConsentCard';
import { ControlsHint } from './ControlsHint';
import { GameStatus, GamingActions } from './GameHud';
import { GoalCelebration } from './GoalCelebration';
import { RaceResults } from './RaceResults';
import { DistrictToast } from './DistrictToast';
import { ExhibitPanel } from './ExhibitPanel';
import { HelpDialog } from './HelpDialog';
import { MapDialog } from './MapDialog';
import { Minimap } from './Minimap';
import { ProximityPrompt } from './ProximityPrompt';
import { QuickTravelDock } from './QuickTravelDock';
import { Toolbar } from './Toolbar';

/**
 * HTML overlay for the world. Sits below the navbar band; the container lets
 * pointer events through to the canvas and only the controls catch them.
 */
export function Hud({ onRequestClassic }: { onRequestClassic: () => void }) {
  const panelOpen = useWorldStore((s) => s.selectedExhibitId !== null);
  return (
    <section
      aria-label="World controls"
      data-theme="dark"
      className="pointer-events-none absolute inset-x-0 bottom-0 top-(--nav-h) z-10 animate-fade"
      onClickCapture={(event) => {
        // Using any HUD control ends the showcase first (the camera button toggles it itself).
        const control = (event.target as Element).closest('button, a, svg');
        if (control && !control.closest('[data-showcase-toggle]')) stopShowcase();
      }}
    >
      <GoalCelebration />
      <DistrictToast />
      <GameStatus />
      <Toolbar onRequestClassic={onRequestClassic} />
      {!panelOpen && <Minimap />}
      <ControlsHint />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:px-6">
        <ConsentCard />
        <ProximityPrompt />
        <GamingActions />
        <ControlsHint compact />
        <QuickTravelDock />
      </div>
      <RaceResults />
      <ExhibitPanel />
      <HelpDialog onRequestClassic={onRequestClassic} />
      <MapDialog />
    </section>
  );
}
