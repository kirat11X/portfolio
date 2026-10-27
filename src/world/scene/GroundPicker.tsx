import { useCallback } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useLoadingStore } from '@/lib/loadingStore';
import type { Collider } from '../config/colliders';
import { useWorldStore } from '../state/worldStore';
import { engageAutopilot } from './autopilot';
import { pickDrivePoint } from './picking';
import { DRAG_THRESHOLD_PX } from './tuning';

/**
 * An invisible catch-all plane under the city. Exhibit panels and doors sit in
 * front of it and stop propagation, so only clicks on "nothing interactive"
 * arrive here and become drive targets.
 */
export function GroundPicker({ colliders }: { colliders: readonly Collider[] }) {
  const scene = useThree((s) => s.scene);

  const onClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!useLoadingStore.getState().entered || event.delta > DRAG_THRESHOLD_PX) return;
      event.stopPropagation();
      // Use the first visible surface under the pointer (a facade, a plaza, the
      // ground) so clicking a building drives to the street in front of it.
      const point = pickDrivePoint(event.ray, scene) ?? { x: event.point.x, z: event.point.z };
      const world = useWorldStore.getState();
      if (world.selectedExhibitId) world.selectExhibit(null);
      engageAutopilot(point.x, point.z, colliders);
    },
    [colliders, scene],
  );

  return (
    <mesh rotation-x={-Math.PI / 2} visible={false} onClick={onClick} name="gameplay:ground-picker">
      <planeGeometry args={[420, 420]} />
    </mesh>
  );
}
