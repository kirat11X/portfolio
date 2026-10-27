import type { RefObject } from 'react';
import { worldColliders } from './actions';
import { Ball } from './Ball';
import { CameraRig } from './CameraRig';
import { GroundPicker } from './GroundPicker';
import { RaceGuide } from './RaceGuide';
import { Simulation } from './Simulation';
import { SpotHitAreas } from './SpotHitAreas';
import { TargetMarker } from './TargetMarker';
import { Vehicle } from './Vehicle';

interface GameSceneProps {
  fadeRef: RefObject<HTMLDivElement | null>;
}

/** Everything interactive in the world: vehicle, physics, camera and input. */
// Note: R3F does not re-render Canvas children while the canvas is hidden, so
// anything that depends on the world being active lives in World.tsx instead.
export function GameScene({ fadeRef }: GameSceneProps) {
  const colliders = worldColliders();

  return (
    <>
      <Vehicle />
      <Ball />
      <RaceGuide />
      <SpotHitAreas />
      <TargetMarker />
      <GroundPicker colliders={colliders} />
      <Simulation colliders={colliders} fadeRef={fadeRef} />
      <CameraRig />
    </>
  );
}
