// Hub signposts: each corner post carries two arrow blades, one for each
// avenue meeting at that corner, pointing in the true direction of the
// district. Text sits on the blade face that looks into the hub.

import { DISTRICTS, HUB_PROPS, type DistrictId } from '../config/layout';

export interface SignBlade {
  id: string;
  district: Exclude<DistrictId, 'hub'>;
  label: string;
  /** Post position. */
  x: number;
  z: number;
  y: number;
  /** Rotation about +Y that maps local +X onto the pointing direction. */
  rotY: number;
  length: number;
  /** Text placement (centre), its rotation and the reading direction. */
  text: { x: number; y: number; z: number; rotationY: number };
}

const DIRS: Record<Exclude<DistrictId, 'hub'>, [number, number]> = {
  engineering: [-1, 0],
  creative: [1, 0],
  about: [0, -1],
  gaming: [0, 1],
};

function blades(): SignBlade[] {
  const out: SignBlade[] = [];
  HUB_PROPS.signposts.forEach((post, i) => {
    const ew: Exclude<DistrictId, 'hub'> = post.x < 0 ? 'engineering' : 'creative';
    const ns: Exclude<DistrictId, 'hub'> = post.z < 0 ? 'about' : 'gaming';
    [ew, ns].forEach((district, k) => {
      const [dx, dz] = DIRS[district];
      const rotY = Math.atan2(-dz, dx);
      const length = 2.4;
      const y = k === 0 ? 3.02 : 2.4;
      // Inner face normal: toward the avenue the blade runs beside.
      const nx = dx === 0 ? -Math.sign(post.x) : 0;
      const nz = dz === 0 ? -Math.sign(post.z) : 0;
      const mid = 0.12 + length / 2;
      out.push({
        id: `sign-${i}-${district}`,
        district,
        label: DISTRICTS[district].shortLabel.toUpperCase(),
        x: post.x,
        z: post.z,
        y,
        rotY,
        length,
        text: {
          x: post.x + dx * mid + nx * 0.03,
          y,
          z: post.z + dz * mid + nz * 0.03,
          rotationY: Math.atan2(nx, nz),
        },
      });
    });
  });
  return out;
}

export const SIGN_BLADES: SignBlade[] = blades();
