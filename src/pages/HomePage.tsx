import { Link } from 'react-router-dom';
import { ClassicHome } from '@/components/home/ClassicHome';
import { navItems } from '@/data/navigation';
import { profileData } from '@/data/profile';
import { useViewStore } from '@/lib/viewMode';
import { usePageTitle } from '@/lib/usePageTitle';

/**
 * The home route. In world mode the 3D world is drawn by <WorldHost> in the
 * layout; this page only provides the document outline for assistive tech and
 * search engines. In classic mode (chosen, or no WebGL) it is the 2D overview.
 */
export default function HomePage() {
  const mode = useViewStore((s) => s.mode);
  usePageTitle();

  if (mode === 'classic') return <ClassicHome />;

  return (
    <div className="sr-only">
      <h1>
        {profileData.name} — {profileData.title}
      </h1>
      <p>{profileData.tagline}</p>
      <p>
        This page is an interactive 3D district. Every section is also available through the site navigation and the
        world's quick-travel controls.
      </p>
      <ul>
        {navItems
          .filter((item) => item.path !== '/')
          .map((item) => (
            <li key={item.path}>
              <Link to={item.path}>{item.label}</Link>
            </li>
          ))}
      </ul>
    </div>
  );
}
