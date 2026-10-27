import { describe, expect, it } from 'vitest';
import { generateMeow, meowSentence, meowWord, typingDelay, SUGGESTED_PROMPTS } from './meow';

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const MEOWISH = /(m+e*o*w+|m+r+[aeo]*w*|m+e+w+|m+r+r*p+|n+y+a+|p+r+r*t+|m+i+a+u+|p+u+r+r+|m+e+o+w+)/i;

describe('meow generator', () => {
  it('words are always cat sounds', () => {
    const rng = seeded(9);
    for (let i = 0; i < 300; i++) expect(meowWord(rng)).toMatch(MEOWISH);
  });

  it('sentences contain only meows, punctuation and cat emoji', () => {
    const rng = seeded(11);
    for (let i = 0; i < 200; i++) {
      const sentence = meowSentence(rng, 1, 5);
      const words = sentence.replace(/\p{Extended_Pictographic}|\u200d|\ufe0f/gu, '').split(/\s+/).filter(Boolean);
      for (const word of words) expect(word.replace(/[.,!?…]/g, '')).toMatch(MEOWISH);
    }
  });

  it('every reply has content and a plain-text form', () => {
    const rng = seeded(13);
    for (let i = 0; i < 300; i++) {
      const reply = generateMeow(rng, { prompt: 'hello' });
      expect(reply.blocks.length).toBeGreaterThan(0);
      expect(reply.plain.trim().length).toBeGreaterThan(0);
    }
  });

  it('is varied: text, lists, code and actions all appear', () => {
    const rng = seeded(17);
    const kinds = new Set<string>();
    const texts = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const reply = generateMeow(rng);
      reply.blocks.forEach((b) => kinds.add(b.kind));
      texts.add(reply.plain);
      if (reply.plain.startsWith('*')) kinds.add('action');
    }
    expect(kinds).toEqual(new Set(['text', 'list', 'code', 'action']));
    expect(texts.size).toBeGreaterThan(300);
  });

  it('code questions usually get a code block, list requests a numbered list', () => {
    const rng = seeded(19);
    let code = 0;
    let list = 0;
    for (let i = 0; i < 200; i++) {
      if (generateMeow(rng, { prompt: 'Debug my Python function' }).blocks.some((b) => b.kind === 'code')) code++;
      if (generateMeow(rng, { prompt: 'List 3 ideas for my weekend' }).blocks.some((b) => b.kind === 'list')) list++;
    }
    expect(code).toBeGreaterThan(120);
    expect(list).toBeGreaterThan(110);
  });

  it('typing delay is short and bounded', () => {
    const rng = seeded(23);
    for (let i = 0; i < 100; i++) {
      const delay = typingDelay(generateMeow(rng), rng);
      expect(delay).toBeGreaterThanOrEqual(450);
      expect(delay).toBeLessThanOrEqual(1600);
    }
    expect(SUGGESTED_PROMPTS.length).toBeGreaterThanOrEqual(3);
  });
});
