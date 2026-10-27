import { Film, Play } from 'lucide-react';
import type { MediaItem } from '@/types';
import { Tag } from '@/components/ui/Tag';
import { Masonry } from './Masonry';
import { mediaRatio } from './media';

interface MediaGalleryProps {
  items: MediaItem[];
  /** Opens the lightbox at `index` (an index into `items`). */
  onOpen: (index: number) => void;
  /** Accessible name of the list, e.g. "<title> gallery". */
  label: string;
}

const fallbackRatio = (item: MediaItem) => (item.kind === 'image' ? 4 / 3 : 16 / 9);
const itemRatio = (item: MediaItem) => mediaRatio(item, fallbackRatio(item));
const itemKey = (item: MediaItem, index: number) => `${index}:${item.src}`;

/** A project's images and clips in a masonry grid; each one opens the lightbox. */
export function MediaGallery({ items, onOpen, label }: MediaGalleryProps) {
  return (
    <Masonry
      items={items}
      getKey={itemKey}
      getRatio={itemRatio}
      label={label}
      renderItem={(item, index) => <GalleryItem item={item} index={index} onOpen={onOpen} />}
    />
  );
}

interface GalleryItemProps {
  item: MediaItem;
  index: number;
  onOpen: (index: number) => void;
}

function GalleryItem({ item, index, onOpen }: GalleryItemProps) {
  const ratio = itemRatio(item);
  const thumb = item.kind === 'image' ? item.src : item.poster;

  return (
    <figure>
      <button
        type="button"
        onClick={() => onOpen(index)}
        aria-haspopup="dialog"
        className="group/item relative block w-full overflow-hidden rounded-card border border-line bg-ink-900 text-left transition-colors duration-300 hover:border-cre/45"
      >
        {thumb ? (
          <img
            src={thumb}
            alt={item.alt}
            width={item.width}
            height={item.height}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            style={{ aspectRatio: ratio }}
          />
        ) : (
          <span className="grid w-full place-items-center bg-ink-850 text-fg-subtle" style={{ aspectRatio: ratio }}>
            <Film className="h-7 w-7" aria-hidden="true" />
            <span className="sr-only">{item.alt}</span>
          </span>
        )}
        {item.kind !== 'image' && (
          <span className="glass absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg">
            <Play className="h-3 w-3 fill-current" aria-hidden="true" />
            Video
          </span>
        )}
        {item.placeholder && (
          <Tag tone="signal" className="absolute left-3 top-3 bg-ink-950/80">
            Placeholder
          </Tag>
        )}
        <span className="sr-only">, open in the viewer</span>
      </button>
      {item.caption && <figcaption className="mt-2.5 px-1 text-sm leading-relaxed text-fg-subtle">{item.caption}</figcaption>}
    </figure>
  );
}
