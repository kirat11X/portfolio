import { useEffect } from 'react';
import { profileData } from '@/data/profile';

/** Sets the document title as "<title> · <name>", or just the site title. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    const site = `${profileData.name} — Engineering & Creative Portfolio`;
    document.title = title ? `${title} · ${profileData.name}` : site;
  }, [title]);
}
