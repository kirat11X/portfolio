// Every static neon sign: landmark wordmarks, rooftop billboards, the hub
// monolith name (from the profile) and the tagline.

import { neon, palette } from '@/styles/tokens';
import { profileData } from '@/data/profile';
import { safeText } from './lib/text';
import { LANDMARKS } from '../config/layout';
import { CITY_PLAN } from './buildingPlan';
import { MONOLITH } from './bake/hub';
import { NeonText } from './NeonText';

const TAGLINE = 'SOFTWARE · ML · VISION · VISUALS';

/** First name from the profile, uppercased (e.g. "KRITANSH"). */
const NAME = safeText(profileData.name.trim().split(/\s+/)[0] ?? '').toUpperCase() || 'PORTFOLIO';
/** Usable width of the slab face and the per-character advance of Unbounded Bold (+ tracking), in em. */
const NAME_WIDTH = MONOLITH.width - 0.36;
const NAME_TRACKING = 0.08;
const NAME_SIZE = Math.min(0.6, NAME_WIDTH / (NAME.length * (0.9 + NAME_TRACKING)));

function LandmarkSigns() {
  const e = LANDMARKS.engineering;
  const c = LANDMARKS.creative;
  const a = LANDMARKS.about;
  const g = LANDMARKS.gaming;
  return (
    <>
      <NeonText color={neon.cyan} intensity={2.6} fontSize={1.0} letterSpacing={0.06} anchorY="bottom" position={[e.maxX - 0.56, 9.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        ENGINEERING
      </NeonText>
      <NeonText color={neon.violet} intensity={2.6} fontSize={0.66} letterSpacing={0.07} position={[c.minX - 0.1, 7.15, 0]} rotation={[0, -Math.PI / 2, 0]} flicker={5}>
        CREATIVE STUDIO
      </NeonText>
      <NeonText color={neon.blue} intensity={3.4} fontSize={1.2} letterSpacing={0.1} anchorY="bottom" position={[0, 7.38, a.maxZ - 0.56]}>
        THE ARCHIVE
      </NeonText>
      <NeonText color={neon.orange} intensity={2.7} fontSize={1.02} letterSpacing={0.06} anchorY="bottom" position={[0, 6.48, g.minZ + 0.56]} rotation={[0, Math.PI, 0]}>
        GAMING ZONE
      </NeonText>
    </>
  );
}

function Billboards() {
  return (
    <>
      {CITY_PLAN.billboards.map((b) => (
        <NeonText
          key={b.id}
          color={b.color}
          intensity={2.4}
          font={b.font}
          fontSize={b.fontSize}
          letterSpacing={0.04}
          position={[b.x, b.y, b.z]}
          rotation={[0, b.rotationY, 0]}
          flicker={b.flicker ? 3 : 0}
        >
          {b.text}
        </NeonText>
      ))}
    </>
  );
}

function MonolithName() {
  const z = MONOLITH.depth / 2 + 0.012;
  return (
    <>
      {[0, Math.PI].map((rot) => {
        const dz = rot === 0 ? z : -z;
        return (
          <group key={rot} position={[0, 0, dz]} rotation={[0, rot, 0]}>
            <NeonText
              color={neon.white}
              intensity={2.7}
              font="displayBold"
              fontSize={NAME_SIZE}
              letterSpacing={NAME_TRACKING}
              maxWidth={NAME_WIDTH}
              textAlign="center"
              anchorY="bottom"
              position={[0, 2.06, 0]}
            >
              {NAME}
            </NeonText>
            <NeonText color={palette.fgMuted} intensity={1.15} font="mono" fontSize={0.1} letterSpacing={0.14} position={[0, 1.66, 0]}>
              {TAGLINE}
            </NeonText>
          </group>
        );
      })}
    </>
  );
}

export function Signs() {
  return (
    <group name="signs">
      <LandmarkSigns />
      <Billboards />
      <MonolithName />
    </group>
  );
}
