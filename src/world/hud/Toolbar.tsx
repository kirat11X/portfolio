import type { ReactNode } from 'react';
import { Camera, CircleHelp, LayoutGrid, Map as MapIcon, Waves } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useMotionStore, useReducedMotion } from '@/lib/motion';
import { toggleShowcase } from '../scene/showcase';
import { useHudStore } from '../scene/uiState';
import { useWorldStore } from '../state/worldStore';
import { CarPicker } from './CarPicker';

interface ToolButtonProps {
  label: string;
  /** Show the label from `lg` up (default) or never (icon only, name via sr-only). */
  iconOnly?: boolean;
  dataAttr?: string;
  icon: ReactNode;
  onClick: () => void;
  pressed?: boolean;
}

/**
 * Icon button that shows its label on very wide screens (2xl) only, so the row
 * stays clear of the landmark signs framed at the top centre; the label is
 * always its accessible name and a tooltip.
 */
function ToolButton({ label, icon, onClick, pressed, iconOnly, dataAttr }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      title={label}
      data-showcase-toggle={dataAttr}
      className={cn(
        'glass pointer-events-auto inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-[13px] font-medium shadow-panel 2xl:px-4',
        'transition-[border-color,color,background-color] duration-200 ease-out-expo',
        pressed ? 'border-eng/45 bg-eng/[0.1] text-fg' : 'text-fg-muted hover:border-line-strong hover:text-fg',
      )}
    >
      <span aria-hidden="true" className={cn('flex', pressed && 'text-eng')}>
        {icon}
      </span>
      <span className={iconOnly ? 'sr-only' : 'sr-only 2xl:not-sr-only'}>{label}</span>
    </button>
  );
}

export function Toolbar({ onRequestClassic }: { onRequestClassic: () => void }) {
  const reduced = useReducedMotion();
  const setUserReduced = useMotionStore((s) => s.setUserReduced);
  const setHelpOpen = useWorldStore((s) => s.setHelpOpen);
  const setMapOpen = useHudStore((s) => s.setMapOpen);
  const showcase = useHudStore((s) => s.showcase);
  return (
    <div className="absolute right-4 top-3 flex items-center gap-2 sm:right-6">
      <CarPicker />
      <ToolButton
        label="Orbit the city"
        iconOnly
        dataAttr=""
        icon={<Camera className="h-[18px] w-[18px]" />}
        pressed={showcase}
        onClick={toggleShowcase}
      />
      <ToolButton label="Map" icon={<MapIcon className="h-[18px] w-[18px]" />} onClick={() => setMapOpen(true)} />
      <ToolButton label="Controls and help" icon={<CircleHelp className="h-[18px] w-[18px]" />} onClick={() => setHelpOpen(true)} />
      <ToolButton
        label="Reduce motion"
        icon={<Waves className="h-[18px] w-[18px]" />}
        pressed={reduced}
        onClick={() => setUserReduced(!reduced)}
      />
      <ToolButton label="Classic view" icon={<LayoutGrid className="h-[18px] w-[18px]" />} onClick={onRequestClassic} />
    </div>
  );
}
