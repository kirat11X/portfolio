import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { ArrowUp, Cat, RotateCcw, Sparkles } from 'lucide-react';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { generateMeow, SUGGESTED_PROMPTS, typingDelay, type MeowBlock } from './meow';

interface ChatMessage {
  id: number;
  role: 'user' | 'cat';
  blocks: MeowBlock[];
  plain: string;
}

interface ChatState {
  messages: ChatMessage[];
  typing: boolean;
  add(message: Omit<ChatMessage, 'id'>): void;
  setTyping(typing: boolean): void;
  reset(): void;
}

let nextId = 1;

/** In-memory only: the conversation survives closing the cabinet, not a reload. */
const useChatStore = create<ChatState>((set) => ({
  messages: [],
  typing: false,
  add: (message) => set((state) => ({ messages: [...state.messages, { ...message, id: nextId++ }] })),
  setTyping: (typing) => set({ typing }),
  reset: () => set({ messages: [], typing: false }),
}));

function Blocks({ blocks }: { blocks: MeowBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.kind === 'code') {
          return (
            <figure key={index} className="overflow-hidden rounded-xl border border-line bg-void/70">
              <figcaption className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-[0.68rem] text-fg-subtle">
                <span>{block.lang}</span>
                <span aria-hidden="true">🐾</span>
              </figcaption>
              <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[0.8rem] leading-relaxed text-eng">
                <code>{block.text}</code>
              </pre>
            </figure>
          );
        }
        if (block.kind === 'list') {
          return (
            <ol key={index} className="list-decimal space-y-1 pl-5 marker:font-mono marker:text-fg-subtle">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function CatAvatar() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-eng/50 bg-eng/10 text-eng shadow-[0_0_14px_-4px_rgb(var(--eng-rgb)/0.8)]" aria-hidden="true">
      <Cat className="size-4" />
    </span>
  );
}

export default function CatGptGame() {
  const reduced = useReducedMotion();
  const messages = useChatStore((s) => s.messages);
  const typing = useChatStore((s) => s.typing);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      window.clearTimeout(timer.current);
      // A reply in flight is dropped on close; never leave the indicator stuck.
      useChatStore.getState().setTyping(false);
    };
  }, []);

  useEffect(() => {
    const list = listRef.current;
    list?.scrollTo?.({ top: list.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [messages, typing, reduced]);

  const send = (text: string) => {
    const content = text.trim();
    const store = useChatStore.getState();
    if (!content || store.typing) return;
    store.add({ role: 'user', blocks: [{ kind: 'text', text: content }], plain: content });
    setDraft('');
    // Suggestion chips unmount after the first message; keep focus in the composer.
    inputRef.current?.focus({ preventScroll: true });
    store.setTyping(true);
    const reply = generateMeow(Math.random, { prompt: content });
    timer.current = window.setTimeout(() => {
      const latest = useChatStore.getState();
      latest.setTyping(false);
      latest.add({ role: 'cat', blocks: reply.blocks, plain: reply.plain });
    }, typingDelay(reply));
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line pb-2.5">
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <span className="font-medium text-fg">CatGPT</span>
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[0.65rem] text-fg-subtle">meow-1 mini</span>
        </p>
        <button
          type="button"
          onClick={() => {
            window.clearTimeout(timer.current);
            useChatStore.getState().reset();
            inputRef.current?.focus();
          }}
          disabled={empty && !typing}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[0.7rem] text-fg-muted transition-colors hover:bg-contrast/[0.06] hover:text-contrast disabled:opacity-40"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          New chat
        </button>
      </div>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with CatGPT"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-2 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border border-eng/40 bg-eng/10 text-eng shadow-glow-eng">
              <Cat className="size-7" aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <h3 className="font-display text-display-sm">How can I help you today?</h3>
              <p className="text-sm text-fg-muted">Ask anything. The answer is meow.</p>
            </div>
            <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="flex items-center gap-2 rounded-xl border border-line bg-contrast/[0.03] px-3 py-2.5 text-left text-sm text-fg-muted transition-colors hover:border-eng/40 hover:text-contrast"
                >
                  <Sparkles className="size-3.5 shrink-0 text-eng" aria-hidden="true" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.map((message) =>
              message.role === 'user' ? (
                <li key={message.id} className="flex justify-end">
                  <span className="sr-only">You said: </span>
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-contrast/[0.08] px-4 py-2.5 text-sm text-fg">
                    {message.plain}
                  </div>
                </li>
              ) : (
                <li key={message.id} className="flex gap-3">
                  <CatAvatar />
                  <div className="min-w-0 flex-1 pt-1 text-sm leading-relaxed text-fg">
                    <span className="sr-only">CatGPT replied: </span>
                    <Blocks blocks={message.blocks} />
                  </div>
                </li>
              ),
            )}
            {typing && (
              <li className="flex items-center gap-3">
                <CatAvatar />
                <span className="flex items-center gap-1 pt-1" role="status" aria-label="CatGPT is typing">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className={cn('size-1.5 rounded-full bg-eng', !reduced && 'animate-bounce')}
                      style={reduced ? { opacity: 0.4 + i * 0.25 } : { animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
              </li>
            )}
          </ul>
        )}
      </div>

      <form
        className="shrink-0"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-ink-850/80 p-2 focus-within:border-eng/60">
          <label htmlFor="catgpt-input" className="sr-only">
            Message CatGPT
          </label>
          <textarea
            id="catgpt-input"
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={500}
            placeholder="Message CatGPT…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send(draft);
              }
            }}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!draft.trim() || typing}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-eng text-ink-950 transition-opacity disabled:opacity-35"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-center font-mono text-[0.65rem] text-fg-subtle">CatGPT can make mistakes. It mostly says meow. Nothing leaves your browser.</p>
      </form>
    </div>
  );
}
