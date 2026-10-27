import { Clapperboard, Expand } from 'lucide-react';
import type { CreativeProject, MediaItem } from '@/types';
import type { BeforeAfterPair, CaptionTrack } from '@/data/creativeProjects';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { Tag } from '@/components/ui/Tag';
import { BeforeAfter } from './BeforeAfter';
import { DeviceFrame } from './DeviceFrame';
import { MediaStage } from './MediaStage';
import { VideoPlayer } from './VideoPlayer';
import { coverMedia, heroRatio, isPlaceholder, projectAspect, type HeroKind } from './media';

interface CreativeHeroProps {
  project: CreativeProject;
  kind: HeroKind;
  /** The video or embed to play (kind 'video'). */
  playable?: MediaItem;
  /** The before/after pair (kind 'comparison'). */
  comparison?: BeforeAfterPair;
  /** Caption tracks for the video. */
  tracks?: CaptionTrack[];
  /** Opens the lightbox on the cover (kinds 'image' and 'design'). */
  onOpenCover?: () => void;
}

/** Muted look for the stand-in "before" image, so the placeholder slider has something to reveal. */
const MUTED_BEFORE = 'grayscale brightness-[0.62] contrast-[0.88]';

/** The media-first hero of a creative project page. */
export function CreativeHero({ project, kind, playable, comparison, tracks, onOpenCover }: CreativeHeroProps) {
  const placeholder = isPlaceholder(project);
  const ratio = heroRatio(project, kind, playable, comparison);
  const cover = coverMedia(project);
  const badge = placeholder ? (
    <Tag tone="signal" className="bg-ink-950/80">
      Placeholder
    </Tag>
  ) : undefined;

  if (kind === 'comparison' && comparison) {
    const stub = Boolean(comparison.before.placeholder || comparison.after.placeholder);
    return (
      <MediaStage ratio={ratio} backdrop={comparison.after.src}>
        <BeforeAfter
          before={comparison.before}
          after={comparison.after}
          ratio={ratio}
          label={`Compare the unedited and edited versions of “${project.title}”`}
          beforeClassName={stub ? MUTED_BEFORE : undefined}
          badge={stub || placeholder ? (badge ?? <PlaceholderTag />) : undefined}
        />
      </MediaStage>
    );
  }

  if (kind === 'video' && playable) {
    return (
      <MediaStage ratio={ratio} backdrop={playable.poster ?? (project.cover?.kind === 'image' ? project.cover.src : undefined)} badge={badge}>
        <VideoPlayer media={playable} title={project.title} tracks={tracks} />
      </MediaStage>
    );
  }

  if (kind === 'video-slot') {
    return (
      <MediaStage ratio={ratio} backdrop={cover.src} badge={badge}>
        {/* The slot is a dimmed still of the (dark) cover art, so it stays dark in both themes. */}
        <div data-theme="dark" className="relative overflow-hidden rounded-card bg-ink-950" style={{ aspectRatio: ratio }}>
          <ProjectCover
            project={project}
            fill
            aspect={projectAspect(project)}
            loading="eager"
            showPlaceholderLabel={false}
            imgClassName="scale-105 opacity-40 blur-[2px] saturate-50"
          />
          <div className="absolute inset-0 grid place-items-center p-4 sm:p-6">
            <div className="glass-strong max-w-[17rem] rounded-card px-5 py-5 text-center">
              <Clapperboard className="mx-auto h-6 w-6 text-cre" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-fg">The video will play here</p>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                This slot shows abstract artwork until the original edit is added.
              </p>
            </div>
          </div>
        </div>
      </MediaStage>
    );
  }

  const portraitDevice = kind === 'design' && projectAspect(project) === 'portrait';
  const media =
    kind === 'design' ? (
      <DeviceFrame kind={portraitDevice ? 'phone' : 'browser'}>
        <ProjectCover project={project} fill aspect={portraitDevice ? 'portrait' : 'landscape'} loading="eager" showPlaceholderLabel={false} />
      </DeviceFrame>
    ) : (
      <div className="overflow-hidden rounded-card" style={{ aspectRatio: ratio }}>
        <ProjectCover project={project} fill aspect={projectAspect(project)} loading="eager" showPlaceholderLabel={false} />
      </div>
    );

  return (
    <MediaStage ratio={ratio} backdrop={cover.src} badge={badge}>
      {onOpenCover ? (
        <button
          type="button"
          onClick={onOpenCover}
          aria-haspopup="dialog"
          className="group/cover relative block w-full rounded-card text-left"
        >
          {media}
          <span className="glass absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-fg transition-colors duration-200 group-hover/cover:border-cre/50 group-hover/cover:text-contrast">
            <Expand className="h-4 w-4" aria-hidden="true" />
            View larger
          </span>
        </button>
      ) : (
        media
      )}
    </MediaStage>
  );
}

function PlaceholderTag() {
  return (
    <Tag tone="signal" className="bg-ink-950/80">
      Placeholder
    </Tag>
  );
}
