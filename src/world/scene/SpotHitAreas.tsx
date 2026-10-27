import { useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { CylinderGeometry, MeshBasicMaterial } from 'three';
import { useLoadingStore } from '@/lib/loadingStore';
import { INTERACTIVE_SPOTS } from '../config/layout';
import { useWorldStore } from '../state/worldStore';
import { interact } from './actions';
import { DRAG_THRESHOLD_PX } from './tuning';

const noNavigate = () => undefined;

/**
 * Invisible click targets over the Gaming Zone props and the data server, so
 * clicking a cabinet, the PC or the server acts on it (like exhibit panels and
 * doors). They draw nothing and are see-through for ground picking.
 */
export function SpotHitAreas() {
  const resources = useMemo(
    () => ({
      geometry: new CylinderGeometry(1, 1, 1, 16).translate(0, 0.5, 0),
      material: new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      resources.geometry.dispose();
      resources.material.dispose();
    },
    [resources],
  );

  return (
    <group name="gameplay:spot-hit-areas">
      {INTERACTIVE_SPOTS.map((spot) => {
        const onClick = (event: ThreeEvent<MouseEvent>) => {
          if (!useLoadingStore.getState().entered || event.delta > DRAG_THRESHOLD_PX) return;
          event.stopPropagation();
          interact(spot.id, noNavigate);
        };
        return (
          <mesh
            key={spot.id}
            geometry={resources.geometry}
            material={resources.material}
            position={[spot.x, 0, spot.z]}
            scale={[spot.radius + 0.15, 2.6, spot.radius + 0.15]}
            onClick={onClick}
            onPointerOver={(event) => {
              event.stopPropagation();
              useWorldStore.getState().setHovered(spot.id);
            }}
            onPointerOut={() => {
              if (useWorldStore.getState().hoveredId === spot.id) useWorldStore.getState().setHovered(null);
            }}
          />
        );
      })}
    </group>
  );
}
