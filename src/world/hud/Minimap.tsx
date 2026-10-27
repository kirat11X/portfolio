import { Maximize2 } from 'lucide-react';
import { engageAutopilot } from '../scene/autopilot';
import { worldColliders } from '../scene/actions';
import { useHudStore } from '../scene/uiState';
import { useWorldStore } from '../state/worldStore';
import { MapGraphic } from './MapGraphic';

/**
 * Corner overview map (desktop). Click a district to travel, anywhere else to
 * drive there; the expand button (or M) opens the full, labelled map dialog,
 * which offers the same destinations as real buttons.
 */
export function Minimap() {
  const requestTravel = useWorldStore((s) => s.requestTravel);
  const setMapOpen = useHudStore((s) => s.setMapOpen);
  return (
    <div className="glass pointer-events-auto absolute right-6 top-[4.25rem] hidden w-52 rounded-card p-2 shadow-panel lg:block">
      <MapGraphic
        className="w-full cursor-crosshair select-none"
        onDistrict={requestTravel}
        onGround={(x, z) => engageAutopilot(x, z, worldColliders())}
      />
      <button
        type="button"
        onClick={() => setMapOpen(true)}
        className="mt-1.5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full text-[12.5px] font-medium text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
      >
        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        Open map
        <kbd aria-hidden="true" className="rounded border border-line-strong px-1 font-mono text-[10px] text-fg-subtle">
          M
        </kbd>
      </button>
    </div>
  );
}
