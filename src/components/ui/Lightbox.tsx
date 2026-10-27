import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { MediaItem } from '@/types';
import { Tag } from './Tag';

interface LightboxProps {
  items: MediaItem[];
  /** Index of the open item, or null when closed. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  /** Accessible name for the dialog, e.g. the project title. */
  label?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

/** Full-screen media viewer: keyboard navigable, focus-trapped, restores focus on close. */
export function Lightbox({ items, index, onClose, onIndexChange, label = 'Media viewer' }: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = index !== null && items.length > 0;
  const count = items.length;

  const step = useCallback(
    (delta: number) => {
      if (index === null || count < 2) return;
      onIndexChange((index + delta + count) % count);
    },
    [index, count, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight') {
        step(1);
      } else if (event.key === 'ArrowLeft') {
        step(-1);
      } else if (event.key === 'Tab') {
        const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, step]);

  if (!open || index === null) return null;
  const item = items[index];

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      // Media is judged on a dark surround, whatever the site theme.
      data-theme="dark"
      className="fixed inset-0 z-[90] flex flex-col bg-void/95 backdrop-blur-xl animate-fade"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <p className="font-mono text-xs text-fg-muted" aria-live="polite">
          {index + 1} / {count}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="glass inline-flex h-11 w-11 items-center justify-center rounded-full text-fg hover:border-line-strong"
          aria-label="Close viewer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-20"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <figure className="flex max-h-full max-w-6xl flex-col items-center gap-3">
          <div className="relative">
            {item.kind === 'video' ? (
              <video
                key={item.src}
                src={item.src}
                poster={item.poster}
                controls
                playsInline
                className="max-h-[78vh] max-w-full rounded-card bg-black"
                aria-label={item.alt}
              />
            ) : item.kind === 'embed' ? (
              <iframe
                key={item.src}
                src={item.src}
                title={item.alt}
                className="aspect-video w-[min(90vw,64rem)] rounded-card bg-black"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <img
                key={item.src}
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                className="h-auto max-h-[78vh] w-auto max-w-full rounded-card object-contain"
              />
            )}
            {item.placeholder && (
              <Tag tone="signal" className="absolute left-3 top-3 bg-ink-950/80">
                Placeholder
              </Tag>
            )}
          </div>
          {item.caption && <figcaption className="max-w-2xl text-center text-sm text-fg-muted">{item.caption}</figcaption>}
        </figure>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              className="glass absolute left-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-fg hover:border-line-strong sm:left-6"
              aria-label="Previous item"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              className="glass absolute right-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-fg hover:border-line-strong sm:right-6"
              aria-label="Next item"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
