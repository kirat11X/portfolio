import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraDirector } from './cameraDirector';
import { perfSample } from './perfSample';

/** Drives the camera every frame (after the simulation, before rendering). */
export function CameraRig() {
  const scene = useThree((s) => s.scene);
  const director = useRef<CameraDirector | null>(null);

  useEffect(() => {
    director.current ??= new CameraDirector();
    const started = performance.now();
    director.current.measure(scene);
    if (import.meta.env.DEV) perfSample.occluderMs = performance.now() - started;
  }, [scene]);

  useFrame((state, delta) => {
    director.current ??= new CameraDirector();
    director.current.update(state, delta);
  }, -1);

  return null;
}
