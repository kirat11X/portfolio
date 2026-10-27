import { useState } from 'react';
import { VideoOff } from 'lucide-react';
import type { MediaItem } from '@/types';
import type { CaptionTrack } from '@/data/creativeProjects';
import { cn } from '@/lib/cn';

interface VideoPlayerProps {
  /** A `kind: 'video'` file (with `poster`) or a `kind: 'embed'` URL. */
  media: MediaItem;
  /** Used as the accessible name when the media item has no alt text. */
  title: string;
  /** WebVTT caption or subtitle tracks (video files only). */
  tracks?: CaptionTrack[];
  className?: string;
}

/**
 * Native, accessible video: browser controls, poster frame, inline playback on
 * phones, caption tracks, and no autoplay. Embeds render as a titled iframe.
 */
export function VideoPlayer({ media, title, tracks = [], className }: VideoPlayerProps) {
  const [failed, setFailed] = useState(false);
  const ratio = media.width && media.height ? media.width / media.height : 16 / 9;
  const name = media.alt.trim() || title;

  if (media.kind === 'embed') {
    return (
      <iframe
        src={media.src}
        title={name}
        loading="lazy"
        allow="fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className={cn('block w-full rounded-card border-0 bg-black', className)}
        style={{ aspectRatio: ratio }}
      />
    );
  }

  if (failed) {
    return (
      <div
        role="status"
        // A failed player keeps the video's black frame, so its text uses the dark palette.
        data-theme="dark"
        className={cn('flex w-full flex-col items-center justify-center gap-3 rounded-card bg-black/70 p-6 text-center', className)}
        style={{ aspectRatio: ratio }}
      >
        <VideoOff className="h-7 w-7 text-fg-subtle" aria-hidden="true" />
        <p className="text-sm text-fg-muted">This video couldn’t be loaded.</p>
        <a href={media.src} className="text-sm font-medium text-cre underline-offset-4 hover:underline">
          Open the video file
        </a>
      </div>
    );
  }

  return (
    <video
      src={media.src}
      poster={media.poster}
      width={media.width}
      height={media.height}
      controls
      playsInline
      preload="metadata"
      aria-label={name}
      onError={() => setFailed(true)}
      className={cn('block h-auto w-full rounded-card bg-black', className)}
      style={{ aspectRatio: ratio }}
    >
      {tracks.map((track) => (
        <track
          key={track.src}
          kind={track.kind ?? 'captions'}
          src={track.src}
          srcLang={track.srclang}
          label={track.label}
          default={track.default}
        />
      ))}
      <p>
        Your browser can’t play this video. <a href={media.src}>Download it</a> instead.
      </p>
    </video>
  );
}
