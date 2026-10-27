// Plain-language descriptions of every place a visitor can reach, shared by the
// dock, prompts, toasts, minimap, full map and help dialog. Contact details are
// derived from the profile data, so they never drift from the real links.

import { profileData } from '@/data/profile';
import { neon } from '@/styles/tokens';
import { DISTRICTS, PORTALS, type DistrictId, type SpotId } from '../config/layout';

const contactChannels = (() => {
  const order = ['email', 'github', 'linkedin'] as const;
  const labels = order
    .map((kind) => profileData.socials.find((social) => social.kind === kind)?.label)
    .filter((label): label is string => Boolean(label));
  return labels.length ? labels.join(', ') : 'Ways to get in touch';
})();

export interface DistrictInfo {
  /** Short "what's here", shown under the district name (dock, map, toast). */
  subtitle: string;
  /** One line describing what the visitor will find. */
  detail: string;
}

export const DISTRICT_INFO: Record<DistrictId, DistrictInfo> = {
  hub: { subtitle: 'Start here', detail: DISTRICTS.hub.description },
  engineering: { subtitle: 'Engineering projects', detail: 'Software, ML, computer vision and research — with a door to the full gallery.' },
  creative: { subtitle: 'Creative work', detail: 'Photography, editing, video, motion and design — with a door to the full gallery.' },
  about: { subtitle: 'About · Résumé · Contact', detail: `Three doors: background and skills, the résumé, and ways to get in touch (${contactChannels}).` },
  gaming: {
    subtitle: 'Arcade · Car soccer · Time trial',
    detail: 'Three playable arcade cabinets and a gaming rig, the car-soccer arena to the south, and the start of the timed lap round the island.',
  },
};

/** "Gaming Zone — Arcade · Car soccer · Time trial" */
export function districtTitle(id: DistrictId): string {
  return id === 'hub' ? DISTRICTS.hub.label : `${DISTRICTS[id].label} — ${DISTRICT_INFO[id].subtitle}`;
}

const PORTAL_DETAIL: Record<string, string> = {
  'portal:engineering': 'every engineering project',
  'portal:creative': 'every creative piece',
  'portal:about': 'background, skills and interests',
  'portal:resume': 'experience and education',
  'portal:contact': contactChannels,
};

export function portalDetail(id: string): string | null {
  return PORTAL_DETAIL[id] ?? null;
}

/** Short label for a door marker on the map. */
export function portalShortLabel(id: string): string {
  const portal = PORTALS.find((p) => p.id === id);
  return portal ? portal.label.replace(' gallery', '') : '';
}

export interface SpotPrompt {
  /** "Press E to <verb> <name>". */
  verb: string;
  name: string;
  /** Prompt dot colour. */
  accent: string;
  detail: string | null;
  /** Help / map list line. */
  summary: string;
}

/** Wording for the Gaming Zone props and the data server. */
export const SPOT_PROMPTS: Record<SpotId, SpotPrompt> = {
  'arcade:tetris': { verb: 'play', name: 'BLOCKS', accent: neon.cyan, detail: 'falling-block puzzle', summary: 'Blocks — stack and clear lines' },
  'arcade:pacman': { verb: 'play', name: 'PAC-MAZE', accent: neon.violet, detail: 'eat the dots, dodge the ghosts', summary: 'Pac-Maze — a dot-eating maze chase' },
  'arcade:catgpt': { verb: 'chat with', name: 'CatGPT', accent: neon.cyan, detail: 'a large language meowdel', summary: 'CatGPT — chat with a very opinionated cat' },
  'pc:rig': { verb: 'look at', name: 'the gaming PC', accent: neon.orange, detail: null, summary: 'Gaming PC — a close look at the rig' },
  'server:ram': { verb: 'give', name: 'the server RAM', accent: neon.emerald, detail: 'choose what this browser remembers', summary: 'Data server — choose whether your car and scores are remembered' },
};

/** "Press E to play BLOCKS". */
export function spotPhrase(id: SpotId): string {
  const p = SPOT_PROMPTS[id];
  return `${p.verb} ${p.name}`;
}
