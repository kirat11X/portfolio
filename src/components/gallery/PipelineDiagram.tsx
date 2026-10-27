import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PipelineStep } from '@/types';
import { cn } from '@/lib/cn';
import { stepNumber } from './projectMeta';

interface PipelineDiagramProps {
  steps: PipelineStep[];
  /** Accessible name for the list of stages, e.g. "Pipeline stages". */
  label?: string;
  className?: string;
}

type Columns = 1 | 2 | 3 | 4;

/**
 * Stages per row. The diagram measures its own width (container queries):
 * below 36rem it stacks vertically; from 36rem rows of up to three; from 45rem
 * a single row for up to four stages, rows of three for five or six, rows of
 * four beyond that (so seven reads 4 + 3, never 3 + 3 + 1).
 */
function midColumns(count: number): Columns {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 4) return 2;
  return 3;
}

function wideColumns(count: number): Columns {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 4;
  if (count <= 6) return 3;
  return 4;
}

const midGrid: Record<Columns, string> = {
  1: '@min-[36rem]:grid-cols-1',
  2: '@min-[36rem]:grid-cols-2',
  3: '@min-[36rem]:grid-cols-3',
  4: '@min-[36rem]:grid-cols-4',
};

const wideGrid: Record<Columns, string> = {
  1: '@min-[45rem]:grid-cols-1',
  2: '@min-[45rem]:grid-cols-2',
  3: '@min-[45rem]:grid-cols-3',
  4: '@min-[45rem]:grid-cols-4',
};

/**
 * An architecture or data-flow pipeline drawn as connected stages.
 * Underneath it is an ordered list, so the sequence is announced without the
 * drawing; the connectors are decorative. The layout follows the space it is
 * given: left to right when wide, top to bottom when narrow.
 */
export function PipelineDiagram({ steps, label = 'Pipeline stages', className }: PipelineDiagramProps) {
  const stages = steps.filter((step) => step.label.trim().length > 0);
  if (stages.length === 0) return null;
  const mid = midColumns(stages.length);
  const wide = wideColumns(stages.length);

  return (
    <div
      className={cn(
        '@container rounded-card border border-line p-4 sm:p-6',
        // A faint dot grid: the drawing board the stages sit on.
        'bg-ink-950 bg-[radial-gradient(rgb(var(--contrast-rgb)/0.07)_1px,transparent_1.5px)] [background-size:18px_18px]',
        className,
      )}
    >
      <ol aria-label={label} className={cn('grid grid-cols-1 gap-8', midGrid[mid], wideGrid[wide])}>
        {stages.map((step, index) => {
          const last = index === stages.length - 1;
          const rowEndMid = (index + 1) % mid === 0;
          const rowEndWide = (index + 1) % wide === 0;
          return (
            <li key={`${stepNumber(index)}-${step.label}`} className="relative flex">
              <div className="flex w-full gap-3.5 rounded-2xl border border-line bg-ink-900 p-4 shadow-panel @min-[36rem]:flex-col @min-[36rem]:gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-eng/35 bg-eng/10 font-mono text-[11px] tabular-nums text-eng"
                >
                  {stepNumber(index)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-fg">{step.label}</p>
                  {step.detail && <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{step.detail}</p>}
                </div>
              </div>

              {!last && (
                // Downward connector between stacked stages (narrow layout).
                <span aria-hidden="true" className="absolute left-[31px] top-full flex h-8 -translate-x-1/2 flex-col items-center @min-[36rem]:hidden">
                  <span className="w-px flex-1 bg-gradient-to-b from-eng/25 to-eng/60" />
                  <ChevronDown className="-mt-1.5 h-3 w-3 text-eng/80" strokeWidth={2.5} />
                </span>
              )}
              {!last && (
                // Rightward connector to the next stage in the same row (wide layouts).
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-full top-[31px] hidden w-8 -translate-y-1/2 items-center',
                    !rowEndMid && '@min-[36rem]:flex',
                    rowEndWide ? '@min-[45rem]:hidden' : '@min-[45rem]:flex',
                  )}
                >
                  <span className="h-px flex-1 bg-gradient-to-r from-eng/25 to-eng/60" />
                  <ChevronRight className="-ml-1.5 h-3 w-3 text-eng/80" strokeWidth={2.5} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
