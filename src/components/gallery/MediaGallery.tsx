import { useState } from 'react';
import { CirclePlay, Expand } from 'lucide-react';
import type { MediaItem } from '@/types';
import { Lightbox } from '@/components/ui/Lightbox';
import { Tag } from '@/components/ui/Tag';
import { cn } from '@/lib/cn';

interface MediaGalleryProps {
  items: MediaItem[];
  /** Used to name the viewer dialog, e.g. the project title. */
  title: string;
  className?: string;
}

const noun: Record<MediaItem['kind'], string> = { image: 'image', video: 'video', embed: 'video' };

/** Screenshot / media thumbnails that open in the shared Lightbox. */
export function MediaGallery({ items, title, className }: MediaGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const media = items.filter((item) => item.src.trim().length > 0);
  if (media.length === 0) return null;

  return (
    <>
      <ul className={cn('grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2', className)}>
        {media.map((item, index) => (
          <li key={item.src}>
            <figure>
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                className="group relative block w-full overflow-hidden rounded-card border border-line bg-ink-900 transition-colors hover:border-line-strong"
              >
                <span className="sr-only">
                  Open {noun[item.kind]} {index + 1} of {media.length}: {item.alt}
                </span>
                <Thumbnail item={item} />
                {item.placeholder && (
                  <Tag tone="signal" className="absolute left-3 top-3 bg-ink-950/80">
                    Placeholder
                  </Tag>
                )}
                {item.kind === 'image' ? (
                  <span
                    aria-hidden="true"
                    className="glass absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full text-fg opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <Expand className="h-4 w-4" />
                  </span>
                ) : (
                  <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
                    <span className="glass grid h-14 w-14 place-items-center rounded-full text-fg transition-transform duration-300 group-hover:scale-105">
                      <CirclePlay className="h-6 w-6" />
                    </span>
                  </span>
                )}
              </button>
              {item.caption && <figcaption className="mt-2.5 text-sm leading-relaxed text-fg-muted">{item.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
      <Lightbox items={media} index={openIndex} onClose={() => setOpenIndex(null)} onIndexChange={setOpenIndex} label={`${title}: media viewer`} />
    </>
  );
}

function Thumbnail({ item }: { item: MediaItem }) {
  const src = item.kind === 'image' ? item.src : item.poster;
  if (!src) {
    return <span aria-hidden="true" className="block aspect-[16/10] w-full bg-gradient-to-br from-ink-800 to-void" />;
  }
  return (
    <img
      src={src}
      alt=""
      width={item.width}
      height={item.height}
      loading="lazy"
      decoding="async"
      className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.02]"
    />
  );
}
