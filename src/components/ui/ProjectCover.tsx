import { useState } from 'react';
import type { Project } from '@/types';
import { artDataUrl, type ArtAspect } from '@/lib/generativeArt';
import { cn } from '@/lib/cn';
import { Tag } from './Tag';

const aspectClass: Record<ArtAspect, string> = {
  landscape: 'aspect-[16/10]',
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
};

interface ProjectCoverProps {
  project: Project;
  aspect?: ArtAspect;
  /** Fill the parent instead of applying an aspect ratio. */
  fill?: boolean;
  className?: string;
  imgClassName?: string;
  loading?: 'lazy' | 'eager';
  /** Show the amber "Placeholder" label on stand-in content (default true). */
  showPlaceholderLabel?: boolean;
}

/**
 * A project's real cover image, or — when none exists yet — its deterministic
 * generative artwork. Generative art is abstract and decorative (alt=""), so it
 * never poses as a screenshot or as the person's creative work.
 */
export function ProjectCover({
  project,
  aspect = 'landscape',
  fill,
  className,
  imgClassName,
  loading = 'lazy',
  showPlaceholderLabel = true,
}: ProjectCoverProps) {
  const [failed, setFailed] = useState(false);
  const real = project.cover && project.cover.kind === 'image' && !failed ? project.cover : null;
  const isPlaceholder = Boolean(project.placeholder || real?.placeholder);

  return (
    <div className={cn('relative overflow-hidden bg-ink-900', !fill && aspectClass[aspect], fill && 'h-full w-full', className)}>
      {real ? (
        <img
          src={real.src}
          alt={real.alt}
          width={real.width}
          height={real.height}
          loading={loading}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', imgClassName)}
        />
      ) : (
        <img
          src={artDataUrl({ seed: project.slug, category: project.category, aspect })}
          alt=""
          aria-hidden="true"
          loading={loading}
          decoding="async"
          className={cn('h-full w-full object-cover', imgClassName)}
        />
      )}
      {isPlaceholder && showPlaceholderLabel && (
        <Tag tone="signal" className="absolute left-3 top-3 bg-ink-950/80">
          Placeholder
        </Tag>
      )}
    </div>
  );
}
