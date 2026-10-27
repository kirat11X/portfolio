// CatGPT's entire language model. Pure and seeded by an injectable rng so the
// replies are testable; every reply is some variation on "meow".

export type MeowBlock =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string; lang: string }
  | { kind: 'list'; items: string[] };

export interface MeowReply {
  blocks: MeowBlock[];
  /** Plain-text rendering (for screen readers and copy). */
  plain: string;
}

type Rng = () => number;

const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length) % items.length];
const chance = (rng: Rng, p: number) => rng() < p;
const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

const SOUNDS = ['meow', 'mew', 'mrrp', 'mrow', 'meeow', 'mrrrow', 'nyaa', 'prrt', 'mraow', 'miau'] as const;
const ENDINGS = ['.', '.', '!', '?', '…', '!!', '?!', ''] as const;
const EMOJI = ['🐾', '😺', '🐈', '😼', '🐟', '🧶', '😸', '🐈‍⬛'] as const;
const ACTIONS = [
  '*knocks your message off the table*',
  '*stares at you, unblinking*',
  '*sits on the keyboard*',
  '*slow blinks*',
  '*chases a laser dot across the context window*',
  '*kneads the prompt*',
  '*ignores you, then purrs*',
  '*brings you a sock*',
  '*loafs*',
  '*pushes your coffee 2 cm closer to the edge*',
] as const;

/** One meow-ish word: stretched vowels, occasional trills. */
export function meowWord(rng: Rng): string {
  const base = pick(rng, SOUNDS);
  if (!chance(rng, 0.35)) return base;
  // Stretch a vowel or the trailing consonant.
  const match = /[aeiouw]+(?!.*[aeiouw])/i.exec(base);
  if (!match) return base;
  const repeat = int(rng, 2, 6);
  const stretched = match[0].slice(-1).repeat(repeat);
  return base.slice(0, match.index + match[0].length) + stretched + base.slice(match.index + match[0].length);
}

function casing(rng: Rng, text: string): string {
  const roll = rng();
  if (roll < 0.12) return text.toUpperCase();
  if (roll < 0.6) return text.charAt(0).toUpperCase() + text.slice(1);
  return text;
}

/** A short sentence of meows, e.g. "Mrrp? meeoww 🐾". */
export function meowSentence(rng: Rng, min = 1, max = 4): string {
  const count = int(rng, min, max);
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    let word = meowWord(rng);
    if (i < count - 1 && chance(rng, 0.25)) word += pick(rng, [',', '?', '…', '!'] as const);
    words.push(word);
  }
  let sentence = casing(rng, words.join(' ')) + pick(rng, ENDINGS);
  if (chance(rng, 0.3)) sentence += ` ${pick(rng, EMOJI)}`;
  return sentence;
}

export interface MeowOptions {
  /** The visitor's message; nudges the format (code questions get code blocks, etc). */
  prompt?: string;
}

function toPlain(blocks: MeowBlock[]): string {
  return blocks
    .map((block) => {
      if (block.kind === 'text') return block.text;
      if (block.kind === 'code') return block.text;
      return block.items.map((item, i) => `${i + 1}. ${item}`).join('\n');
    })
    .join('\n\n');
}

function codeBlock(rng: Rng): MeowBlock {
  const variants = [
    () => ({ lang: 'python', text: `def answer():\n    return "${meowWord(rng)}"` }),
    () => ({ lang: 'ts', text: `const reply = '${meowWord(rng)}'.repeat(${int(rng, 2, 9)});\nconsole.log(reply); // ${meowWord(rng)}` }),
    () => ({ lang: 'bash', text: `$ cat question.txt\n${meowSentence(rng, 2, 3)}` }),
    () => ({ lang: 'json', text: `{\n  "answer": "${meowWord(rng)}",\n  "confidence": "purr"\n}` }),
    () => ({ lang: 'sql', text: `SELECT ${meowWord(rng)} FROM laps WHERE warm = TRUE;` }),
  ];
  const { lang, text } = pick(rng, variants)();
  return { kind: 'code', lang, text };
}

function listBlock(rng: Rng): MeowBlock {
  const count = int(rng, 3, 5);
  return { kind: 'list', items: Array.from({ length: count }, () => meowSentence(rng, 1, 3)) };
}

/** Generates one CatGPT reply. */
export function generateMeow(rng: Rng = Math.random, options: MeowOptions = {}): MeowReply {
  const prompt = (options.prompt ?? '').toLowerCase();
  const wantsCode = /code|bug|debug|function|python|javascript|typescript|program|error|sql/.test(prompt);
  const wantsList = /list|steps|how (do|to|can)|plan|ideas|tips|explain/.test(prompt);
  const wantsPoem = /poem|haiku|song|verse|rhyme/.test(prompt);

  const blocks: MeowBlock[] = [];
  const roll = rng();

  if (wantsPoem && roll < 0.8) {
    const lines = int(rng, 3, 4);
    blocks.push({ kind: 'text', text: Array.from({ length: lines }, () => meowSentence(rng, 2, 4)).join('\n') });
    if (chance(rng, 0.5)) blocks.push({ kind: 'text', text: `— ${pick(rng, ['a haiku, probably', 'by Mittens, age 4', 'meow (remastered)'] as const)}` });
  } else if ((wantsCode && roll < 0.75) || (!wantsCode && roll < 0.1)) {
    blocks.push({ kind: 'text', text: meowSentence(rng, 2, 5) });
    blocks.push(codeBlock(rng));
    if (chance(rng, 0.5)) blocks.push({ kind: 'text', text: meowSentence(rng, 1, 2) });
  } else if ((wantsList && roll < 0.7) || (!wantsList && roll < 0.22)) {
    blocks.push({ kind: 'text', text: `${casing(rng, meowWord(rng))}! ${pick(rng, ['Here are', 'Great question. Here are', 'Sure thing. Here are'] as const)} ${int(rng, 3, 5)} ${meowWord(rng)}s:` });
    blocks.push(listBlock(rng));
  } else if (roll < 0.36) {
    blocks.push({ kind: 'text', text: pick(rng, ACTIONS) });
    if (chance(rng, 0.6)) blocks.push({ kind: 'text', text: meowSentence(rng, 1, 2) });
  } else if (roll < 0.46) {
    // The big one.
    blocks.push({ kind: 'text', text: `M${'E'.repeat(int(rng, 1, 3))}O${'W'.repeat(int(rng, 4, 9))}${'!'.repeat(int(rng, 0, 3))}` });
  } else if (roll < 0.58) {
    blocks.push({ kind: 'text', text: `${pick(rng, ['purr…', 'prrrrr…', '*purrs*', 'purr purr…'] as const)} ${meowSentence(rng, 1, 3).toLowerCase()}` });
  } else {
    const paragraphs = chance(rng, 0.3) ? 2 : 1;
    for (let i = 0; i < paragraphs; i++) blocks.push({ kind: 'text', text: meowSentence(rng, 1, i === 0 ? 6 : 10) });
  }

  return { blocks, plain: toPlain(blocks) };
}

/** Typing-indicator delay (ms): longer replies "think" a little longer. */
export function typingDelay(reply: MeowReply, rng: Rng = Math.random): number {
  return Math.min(1600, 450 + reply.plain.length * 8 + Math.floor(rng() * 350));
}

export const SUGGESTED_PROMPTS = [
  'Explain recursion like I’m five',
  'Write a haiku about Mondays',
  'Debug my Python function',
  'List 3 ideas for my weekend',
] as const;
