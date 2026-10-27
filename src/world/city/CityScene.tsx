// The night-time neon district: everything static or ambient in the world.
// Rendered by World.tsx inside its Canvas (and by dev/city-preview.html).
// Gameplay owns the camera, vehicle, input and HUD; this owns the look.

import { Environment, Lightformer } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { neon } from '@/styles/tokens';
import { useWorldStore } from '../state/worldStore';
import { COLORS, MOON_DIR } from './constants';
import { CityClock } from './lib/cityClock';
import { Sky } from './Sky';
import { StaticCity } from './StaticCity';
import { Signs } from './Signs';
import { Kinetics } from './Kinetics';
import { NeuralNet } from './NeuralNet';
import { EducationDisplay } from './EducationDisplay';
import { PdcSign } from './PdcSign';
import { Exhibits } from './Exhibits';
import { Portals } from './Portals';
import { Skyline } from './Skyline';
import { Ambient } from './Ambient';
import { SocialBadges } from './SocialBadges';
import { GamingZone } from './Gaming';

/** Baked once into a cube map: gives glossy asphalt and glass neon reflections. */
function NightEnvironment() {
  return (
    <Environment frames={1} resolution={128} environmentIntensity={0.45}>
      <color attach="background" args={['#05060c']} />
      <Lightformer form="rect" intensity={2.2} color={neon.cyan} position={[-30, 4, 0]} rotation-y={Math.PI / 2} scale={[14, 5, 1]} />
      <Lightformer form="rect" intensity={2.2} color={neon.violet} position={[30, 4, 0]} rotation-y={-Math.PI / 2} scale={[14, 5, 1]} />
      <Lightformer form="rect" intensity={1.6} color={neon.blue} position={[0, 4, -30]} scale={[14, 5, 1]} />
      <Lightformer form="rect" intensity={1.3} color={neon.orange} position={[0, 4, 30]} rotation-y={Math.PI} scale={[14, 5, 1]} />
      <Lightformer form="ring" intensity={0.9} color="#8fa6ff" position={[0, 40, 0]} rotation-x={Math.PI / 2} scale={18} />
      <Lightformer form="rect" intensity={0.5} color={neon.amber} position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[60, 60, 1]} />
    </Environment>
  );
}

export function CityScene() {
  const quality = useWorldStore((s) => s.quality);
  const dpr = useThree((s) => s.viewport.dpr);
  const pointLights = quality !== 'low';
  return (
    <>
      <color attach="background" args={[COLORS.void]} />
      <fog attach="fog" args={[COLORS.fog, 70, 210]} />
      <CityClock />
      <hemisphereLight args={['#7488d0', '#0d0e18', 0.75]} />
      <directionalLight color="#a9b9ff" intensity={0.55} position={[MOON_DIR.x * 60, MOON_DIR.y * 60 + 20, MOON_DIR.z * 60]} />
      {/* Always mounted: toggling lights changes the light count baked into every
          lit shader and would recompile them all on a quality change. Low just dims them. */}
      <pointLight color="#d8e8ff" intensity={pointLights ? 30 : 0} distance={24} decay={2} position={[0, 7.5, 2.5]} />
      <pointLight color={neon.cyan} intensity={pointLights ? 60 : 0} distance={22} decay={2} position={[-27, 2.6, 0]} />
      <pointLight color={neon.violet} intensity={pointLights ? 60 : 0} distance={22} decay={2} position={[27, 2.6, 0]} />
      <NightEnvironment />
      <Sky stars={quality === 'low' ? 350 : 700} />
      <Skyline count={quality === 'high' ? 150 : quality === 'medium' ? 110 : 70} />
      <StaticCity />
      <Signs />
      <Kinetics />
      <NeuralNet />
      <EducationDisplay />
      <PdcSign />
      <Exhibits />
      <Portals />
      <SocialBadges />
      <GamingZone />
      <Ambient quality={quality} dpr={dpr} />
    </>
  );
}
