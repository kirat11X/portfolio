import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { stepNumber } from './projectMeta';

interface CaseStudySectionProps {
  /** Anchor id, e.g. "approach" (linkable as #approach). */
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}

/** One chapter of a case study: a ruled heading and its body. */
export function CaseStudySection({ id, title, children, className }: CaseStudySectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={cn('scroll-mt-[calc(var(--nav-h)+1.5rem)]', className)}>
      <h2 id={headingId} className="flex items-center gap-4 text-xl font-semibold tracking-[-0.015em] text-fg sm:text-2xl">
        <span className="shrink-0">{title}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-line-strong to-transparent" />
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

const bodyText = 'text-base leading-[1.75] text-fg-muted sm:text-[1.0625rem]';

/** Paragraphs of running text. Blank lines in the source start new paragraphs. */
export function Prose({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return (
    <div className={cn('max-w-[68ch] space-y-5', bodyText, className)}>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

/** Dash-marked list for contributions and learnings. */
export function BulletList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('max-w-[68ch] space-y-3.5', className)}>
      {items.map((item) => (
        <li key={item} className={cn('relative pl-7', bodyText)}>
          <span aria-hidden="true" className="absolute left-0 top-[0.85em] h-px w-3.5 bg-eng/70" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps joined by a hairline, for the approach. */
export function StepList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ol className={cn('max-w-[68ch]', className)}>
      {items.map((item, index) => (
        <li key={item} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 pb-8 last:pb-0">
          <span
            aria-hidden="true"
            className="relative z-[1] grid h-8 w-8 place-items-center rounded-full border border-line-strong bg-ink-950 font-mono text-[11px] tabular-nums text-eng"
          >
            {stepNumber(index)}
          </span>
          {index < items.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-4 top-8 w-px bg-line" />}
          <p className={cn('pt-[3px]', bodyText)}>{item}</p>
        </li>
      ))}
    </ol>
  );
}

/** Outcomes, set a little brighter than body text and ruled like a ledger. */
export function ResultList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('max-w-[68ch] divide-y divide-line border-y border-line', className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-4 py-4">
          <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rotate-45 bg-eng" />
          <span className="text-base leading-[1.7] text-fg sm:text-[1.0625rem]">{item}</span>
        </li>
      ))}
    </ul>
  );
}
