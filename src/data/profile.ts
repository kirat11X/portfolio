import type { ProfileData } from '@/types';

// Kritansh Uppal's (Kirat's) public profile. Owned by the navigation &
// content-pages specialist; details below were supplied by Kirat.
//
// Leave a field or list empty rather than guessing: every page hides a
// section that has no data, so nothing like "add your details here" ever
// reaches visitors.
//
// - resumes: one entry per résumé track shown on /resume. PDFs live in
//   public/resume/. The creative PDF is printed from the site's own creative
//   track (npm run resume:creative) — regenerate it after editing that track.
export const profileData: ProfileData = {
  name: 'Kritansh Uppal',
  title: 'Software Engineer & Machine Learning Builder',
  tagline: 'Computer vision, machine learning systems, and full-stack engineering.',
  bio: [
    'I’m a Computer Science and Engineering undergraduate at Punjab Engineering College (PEC), Chandigarh, working at the intersection of computer vision, deep learning, and full-stack systems engineering.',
    'I have built high-speed projectile tracking pipelines at TBRL (DRDO), developed backend services at Zimo One, and created AI platforms spanning sports analytics, document intelligence, and multimodal generative tools.',
    'Outside software, I am an active competitive programmer (CodeChef 1568, Codeforces 1329, LeetCode 1612), a state gold medalist in table tennis, and lead creative branding and visual strategy for academic conferences.',
  ],
  status: 'Computer Science & Engineering Student at Punjab Engineering College',
  location: 'Chandigarh, India',
  socials: [
    { label: 'GitHub', href: 'https://github.com/kirat11X', kind: 'github' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kritansh-uppal', kind: 'linkedin' },
    { label: 'Email', href: 'mailto:kritansh.11.sss@gmail.com', kind: 'email' },
    { label: 'LeetCode', href: 'https://leetcode.com/u/kirat11X', kind: 'other' },
    { label: 'CodeChef', href: 'https://www.codechef.com/users/kirat11X', kind: 'other' },
    { label: 'Codeforces', href: 'https://codeforces.com/profile/kirat11X', kind: 'other' },
  ],
  resumes: [
    {
      id: 'sde',
      label: 'Software Engineering',
      shortLabel: 'SDE',
      focus: 'Backend, full-stack and systems roles.',
      pdfUrl: '/resume/kritansh-uppal-sde.pdf',
      skillCategories: ['Languages', 'Frameworks & libraries', 'Databases, tools & systems'],
      projectSlugs: [
        'personal-stream',
        'skillforge-ai-onboarding',
        'video-clipper',
        'intelligent-data-extraction-pecathon',
        'failure-synthesis-system',
      ],
    },
    {
      id: 'ml-cv',
      label: 'Machine Learning & Computer Vision',
      shortLabel: 'ML / CV',
      focus: 'Applied ML, computer vision and research roles.',
      pdfUrl: '/resume/kritansh-uppal-ml-cv.pdf',
      skillCategories: ['Machine learning & AI', 'Frameworks & libraries', 'Databases, tools & systems', 'Languages'],
      projectSlugs: [
        'growplay-table-tennis-analysis',
        'video-clipper',
        'intelligent-data-extraction-pecathon',
        'voice-clone-detection',
        'indian-anpr-research',
      ],
    },
    {
      id: 'data-product',
      label: 'Data Analytics & Product',
      shortLabel: 'Data & Product',
      focus: 'Data analytics, product and business-technology roles.',
      pdfUrl: '/resume/kritansh-uppal-data-product.pdf',
      skillCategories: ['Data & product', 'Machine learning & AI', 'Languages'],
      projectSlugs: [
        'profitlens-amex-challenge',
        'intelligent-data-extraction-pecathon',
        'skillforge-ai-onboarding',
        'business-entity-resolution',
      ],
    },
    {
      id: 'creative',
      label: 'Creative & Design',
      shortLabel: 'Creative',
      focus: 'Design, branding and visual-media roles.',
      headline: 'Visual design, branding & media',
      summary: [
        'Creative Head at WOPI, where I lead branding and visual strategy for an international academic conference.',
        'I work across photography, photo and video editing, motion graphics, UI/UX design in Figma and graphic design in Canva — alongside a Computer Science & Engineering degree at Punjab Engineering College, which lets me build the tools behind the visuals too.',
      ],
      pdfUrl: '/resume/kritansh-uppal-creative.pdf',
      skillCategories: ['Visual & design', 'Languages'],
      projectSlugs: ['video-clipper'],
    },
  ],
  skillGroups: [
    {
      category: 'Languages',
      items: ['Python', 'C++', 'Go', 'JavaScript', 'SQL'],
    },
    {
      category: 'Machine learning & AI',
      items: [
        'Machine Learning',
        'Computer Vision',
        'Object Detection',
        'NLP',
        'LLMs',
        'RAG Pipelines',
        'Feature Engineering',
        'Data Analytics',
      ],
    },
    {
      category: 'Frameworks & libraries',
      items: [
        'FastAPI',
        'React',
        'Gin',
        'Scikit-learn',
        'OpenCV',
        'LangChain',
        'SentenceTransformers',
        'FAISS',
        'NumPy',
        'Pandas',
        'Matplotlib',
        'Streamlit',
      ],
    },
    {
      category: 'Databases, tools & systems',
      items: [
        'MongoDB',
        'Firebase',
        'MySQL',
        'PostgreSQL',
        'Docker',
        'Git',
        'Linux',
        'YOLO',
        'ByteTrack',
        'RTMPose',
        'REST APIs',
        'Azure',
        'AWS',
      ],
    },
    {
      category: 'Data & product',
      items: [
        'Data Analytics',
        'Pandas',
        'NumPy',
        'BigQuery',
        'MongoDB',
        'Data Pipelines',
        'Competitive Analysis',
        'Risk Management',
        'Data Governance',
        'Microsoft Suite',
      ],
    },
    {
      category: 'Visual & design',
      items: [
        'Photography',
        'Photo editing',
        'Video editing',
        'Motion graphics',
        'UI/UX design in Figma',
        'Graphic design in Canva',
      ],
    },
  ],
  education: [
    {
      institution: 'Punjab Engineering College, Chandigarh',
      degree: 'Bachelor of Technology (B.Tech)',
      field: 'Computer Science & Engineering',
      period: 'Aug 2024 – May 2028 (Expected)',
      grade: 'CGPA: 8.82 / 10',
      highlights: [
        'Core coursework: Data Structures & Algorithms, Computer Vision, Machine Learning, Operating Systems, Database Management.',
      ],
    },
  ],
  experience: [
    {
      role: 'Research Intern',
      organisation: 'TBRL, DRDO',
      period: 'May 2026 – Jul 2026',
      location: 'Chandigarh',
      description:
        'Built automated blast-fragment kinematic analysis pipelines using high-speed imagery, enabling fragment detection, multi-object tracking, and velocity estimation.',
      highlights: [
        'Built a CV pipeline (YOLO, ByteTrack, optical flow, geometric methods) for fragment detection, tracking, and velocity estimation from high-speed imagery — achieving 70% detection with velocity accuracy within ±10% after calibration.',
        'Built and deployed a 5-stage end-to-end pipeline behind a Streamlit dashboard, containerized with Docker for local server testing, and packaged as a standalone air-gapped Windows installer (70 dependencies bundled) requiring zero internet connectivity.',
        'Researched impact-energy estimation from target-surface damage by integrating crater segmentation, depth reconstruction, and physics-based energy modeling of fragment impacts.',
      ],
      technologies: ['Python', 'Computer Vision', 'YOLO', 'ByteTrack', 'OpenCV', 'Streamlit', 'Docker', 'RTMPose'],
    },
    {
      role: 'Software Intern',
      organisation: 'Zimo One',
      period: 'Jun 2025 – Jul 2025',
      location: 'Remote',
      description:
        'Engineered backend services in Node.js and implemented REST API validation suites for internal tools.',
      highlights: [
        'Resolved 15+ production bugs in Node.js backend services, improving internal tool uptime by 12% for workflows used by 30+ team members.',
        'Implemented REST API validation using schema-based checks, reducing regression issues by 25% across multiple services.',
      ],
      technologies: ['Node.js', 'REST APIs', 'JavaScript', 'Git', 'Schema Validation'],
    },
  ],
  interests: [
    'Computer Vision & Deep Learning',
    'Generative AI & LLMs',
    'Autonomous Video Pipelines',
    'Data Structures & Algorithms',
    'Full-Stack System Architecture',
    'Multimodal Generative AI',
    'Computer Hardware (GPUs & CPUs)',
    'Table Tennis',
    'Photography & Cinematography',
    'UI/UX Design',
  ],
  achievements: [
    'Winner, PECathon 2025 — Open-to-all inter-college hackathon conducted during PECFEST with 50+ teams.',
    'CodeChef Rating: 1568 | Codeforces Rating: 1329 | LeetCode Contest Rating: 1612.',
    'Awarded by Punjab Governor Sh. Gulab Chand Kataria ji for excellence in sports.',
    'State Gold Medalist — Table Tennis, Chandigarh.',
  ],
  leadership: [
    {
      role: 'Creative Head',
      organisation: 'WOPI',
      description: 'Led branding and visual strategy for an international academic conference.',
    },
    {
      role: 'Assistant Cultural Clubs Secretary (ACCS)',
      organisation: 'Punjab Engineering College (PEC)',
      description: 'Liaise between student cultural clubs and college administration, coordinating official cultural initiatives.',
    },
    {
      role: 'Joint-Head',
      organisation: 'PECFEST',
      description: 'Coordinated logistics for 10+ events and managed 30+ volunteers serving 10000+ attendees at the college’s flagship festival.',
    },
  ],
};
