import type { ArcadeGameId } from './arcadeStore';

export interface ArcadeGameMeta {
  id: ArcadeGameId;
  title: string;
  tagline: string;
  /** One neon accent per cabinet, as an RGB triple for glows. */
  accentRgb: string;
  accentClass: string;
}

export const ARCADE_GAMES: Record<ArcadeGameId, ArcadeGameMeta> = {
  tetris: {
    id: 'tetris',
    title: 'Blocks',
    tagline: 'Stack · clear · repeat',
    accentRgb: 'var(--eng-rgb)',
    accentClass: 'text-eng',
  },
  pacman: {
    id: 'pacman',
    title: 'Pac-Maze',
    tagline: 'Eat the dots · dodge the ghosts',
    accentRgb: 'var(--cre-rgb)',
    accentClass: 'text-cre',
  },
  catgpt: {
    id: 'catgpt',
    title: 'CatGPT',
    tagline: 'A large language meowdel',
    accentRgb: 'var(--eng-rgb)',
    accentClass: 'text-eng',
  },
};
