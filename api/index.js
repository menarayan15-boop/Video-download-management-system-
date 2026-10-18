// Vercel Serverless API Handler for Vyntra Platform
export default async function handler(req, res) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Health endpoint
  if (pathname === '/api/health' || pathname === '/api/v1/health') {
    return res.status(200).json({
      status: 'healthy',
      platform: 'Vyntra',
      tagline: 'Watch. Connect. Discover.',
      timestamp: new Date().toISOString(),
      environment: 'production',
    });
  }

  // 26 Categories
  const categories = [
    {
      id: 'cat-technology-ai',
      name: 'Technology & Artificial Intelligence',
      slug: 'technology-ai',
      description: 'AI, machine learning, robotics, coding, cybersecurity, and future computing systems.',
      icon: 'Cpu',
      displayOrder: 1,
      subcategories: [
        { id: 'sub-ai-1', name: 'AI & Deep Learning', slug: 'ai-deep-learning' },
        { id: 'sub-ai-2', name: 'Machine Learning', slug: 'machine-learning' },
        { id: 'sub-ai-3', name: 'Robotics', slug: 'robotics' },
      ],
    },
    {
      id: 'cat-space-astronomy',
      name: 'Space & Astronomy',
      slug: 'space-astronomy',
      description: 'NASA missions, planets, galaxies, black holes, cosmology, and deep space exploration.',
      icon: 'Orbit',
      displayOrder: 2,
      subcategories: [
        { id: 'sub-space-1', name: 'NASA Missions', slug: 'nasa-missions' },
        { id: 'sub-space-2', name: 'Planets & Solar System', slug: 'planets-solar-system' },
        { id: 'sub-space-3', name: 'Galaxies & Deep Space', slug: 'galaxies-deep-space' },
      ],
    },
    {
      id: 'cat-nature-wildlife',
      name: 'Nature & Wildlife',
      slug: 'nature-wildlife',
      description: 'Wildlife documentaries, oceans, marine life, ecosystems, natural wonders, and wildlife conservation.',
      icon: 'Trees',
      displayOrder: 3,
      subcategories: [
        { id: 'sub-nature-1', name: 'Wildlife Documentaries', slug: 'wildlife-documentaries' },
        { id: 'sub-nature-2', name: 'Oceans & Marine Life', slug: 'oceans-marine-animals' },
      ],
    },
    {
      id: 'cat-human-body-health',
      name: 'Human Body & Health Science',
      slug: 'human-body-health',
      description: 'Human anatomy, brain, cardiovascular system, genetics, nutrition, immunity, and medical physiology.',
      icon: 'HeartPulse',
      displayOrder: 4,
      subcategories: [
        { id: 'sub-health-1', name: 'Brain & Nervous System', slug: 'brain-neuroscience' },
        { id: 'sub-health-2', name: 'Human Anatomy', slug: 'human-anatomy' },
      ],
    },
    {
      id: 'cat-general-science',
      name: 'General Science',
      slug: 'general-science',
      description: 'Physics, chemistry, biology, quantum physics, laboratory experiments, and scientific breakthroughs.',
      icon: 'Atom',
      displayOrder: 5,
    },
    {
      id: 'cat-history-civilizations',
      name: 'History & Civilizations',
      slug: 'history-civilizations',
      description: 'Ancient empires, world wars, archaeology discoveries, historical leaders, and cultural heritage.',
      icon: 'Landmark',
      displayOrder: 6,
    },
    {
      id: 'cat-education-learning',
      name: 'Education & Academic Learning',
      slug: 'education-learning',
      description: 'Mathematics, philosophy, literature, university lectures, speed study techniques, and open courses.',
      icon: 'GraduationCap',
      displayOrder: 7,
    },
    {
      id: 'cat-business-finance',
      name: 'Business, Economics & Finance',
      slug: 'business-finance',
      description: 'Stock markets, startup ecosystems, macroeconomics, investing, real estate, and financial literacy.',
      icon: 'TrendingUp',
      displayOrder: 8,
    },
    {
      id: 'cat-geography-earth',
      name: 'Earth Sciences & Geography',
      slug: 'geography-earth',
      description: 'Geology, volcanoes, climate systems, tectonic plates, weather extremes, and cartography.',
      icon: 'Globe',
      displayOrder: 9,
    },
    {
      id: 'cat-cinematic',
      name: 'Cinematic & 4K Visuals',
      slug: 'cinematic',
      description: 'Breathtaking 4K cinematography, film production, color grading, and visual masterpieces.',
      icon: 'Film',
      displayOrder: 10,
    },
    {
      id: 'cat-development',
      name: 'Web & App Development',
      slug: 'development',
      description: 'Full-stack engineering, React, TypeScript, cloud architecture, and modern UI engineering.',
      icon: 'Code',
      displayOrder: 11,
    },
    {
      id: 'cat-music-audio',
      name: 'Music & Audio Studio',
      slug: 'music-audio',
      description: 'Synthesizers, acoustic performances, master mixing, and electronic soundscapes.',
      icon: 'Music',
      displayOrder: 12,
    },
  ];

  // Verified Video Catalog
  const videos = [
    {
      id: '89286c13-a5d0-4e56-8dae-894335293707',
      title: 'Mastering Full-Stack React & Node Performance Optimization',
      description: 'Practical tactics to trim bundle size, implement concurrency-safe database operations, eliminate rendering bottlenecks, and achieve sub-100ms response times.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
      provider: 'VYNTRA',
      durationSeconds: 154,
      viewsCount: 9780,
      creatorName: 'Alex Dev',
      publishedAt: '2026-10-17T17:14:40.982Z',
      category: categories.find((c) => c.slug === 'development'),
      creator: {
        id: 'alex_dev',
        username: 'alex_dev',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        role: 'CREATOR',
      },
    },
    {
      id: 'f8545588-space-featured-01',
      title: 'James Webb Space Telescope: Revealing Deep Cosmic Dawn & Earliest Galaxies',
      description: 'Journey millions of light-years across spacetime as the Webb observatory captures high-redshift infant galaxies and gravitational lensing clusters.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/BigBuckBunny_124/BigBuckBunny_512kb.mp4',
      provider: 'NASA',
      durationSeconds: 420,
      viewsCount: 48320,
      creatorName: 'NASA Astrophysics',
      publishedAt: '2026-10-15T12:00:00.000Z',
      category: categories.find((c) => c.slug === 'space-astronomy'),
    },
    {
      id: 'f63ee068-nature-featured-02',
      title: 'Cinematic Iceland: Volcanic Glaciers & Aurora Borealis in 4K HDR',
      description: 'An immersive cinematic expedition capturing volcanic eruptions, glacial valleys, and dancing celestial auroras across the Arctic skies.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1600&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4',
      provider: 'VYNTRA',
      durationSeconds: 310,
      viewsCount: 28944,
      creatorName: 'Elena Vance',
      publishedAt: '2026-10-16T14:30:00.000Z',
      category: categories.find((c) => c.slug === 'cinematic'),
    },
    {
      id: '7ce4a02f-synth-waves-03',
      title: 'Ambient Modular Synth Session: Midnight Analog Waves',
      description: 'A continuous live improvisation using analog oscillators, tape delays, and generative CV routing.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
      provider: 'VYNTRA',
      durationSeconds: 182,
      viewsCount: 16505,
      creatorName: 'Marcus Vance',
      publishedAt: '2026-10-16T20:10:00.000Z',
      category: categories.find((c) => c.slug === 'music-audio'),
    },
    {
      id: '5033eb6b-neural-networks-05',
      title: 'Understand Artificial Neural Networks from Mathematical First Principles',
      description: 'Comprehensive intuitive guide covering forward propagation, loss landscapes, backpropagation, and gradient descent.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4',
      provider: 'YOUTUBE',
      durationSeconds: 520,
      viewsCount: 21400,
      creatorName: 'Gate Smashers',
      publishedAt: '2026-10-17T11:00:00.000Z',
      category: categories.find((c) => c.slug === 'technology-ai'),
    },
    {
      id: '6b29cf12-deep-ocean-06',
      title: 'The Abyssal Zone: Strange Creatures of the Ocean Floor',
      description: 'Documentary footage exploring hydrothermal vents and bioluminescent organisms adapted to crushing deep-sea pressure.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
      provider: 'VYNTRA',
      durationSeconds: 380,
      viewsCount: 18720,
      creatorName: 'Ocean Exploration Institute',
      publishedAt: '2026-10-17T15:20:00.000Z',
      category: categories.find((c) => c.slug === 'nature-wildlife'),
    },
    {
      id: '8a12d43e-human-brain-07',
      title: 'How Synapses Form Memories: Neuroplasticity Visualized in 3D',
      description: 'Stunning biological animation explaining dendritic spines, long-term potentiation, and how sleep consolidates memory traces.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/BigBuckBunny_124/BigBuckBunny_512kb.mp4',
      provider: 'VYNTRA',
      durationSeconds: 290,
      viewsCount: 15300,
      creatorName: 'NeuroScience Lab',
      publishedAt: '2026-10-18T05:30:00.000Z',
      category: categories.find((c) => c.slug === 'human-body-health'),
    },
  ];

  // Endpoint routing
  if (pathname.includes('/featured-video') && !pathname.includes('/featured-videos')) {
    return res.status(200).json({ success: true, data: videos[0] });
  }

  if (pathname.includes('/featured-videos')) {
    return res.status(200).json({ success: true, data: videos.slice(0, 6) });
  }

  if (pathname.includes('/categories') && !pathname.includes('/videos')) {
    return res.status(200).json({ success: true, data: categories });
  }

  // Category specific videos: /categories/:slug/videos
  const catMatch = pathname.match(/\/categories\/([^/]+)\/videos/);
  if (catMatch) {
    const slug = catMatch[1];
    const catVideos = videos.filter((v) => v.category?.slug === slug);
    return res.status(200).json({
      success: true,
      data: {
        videos: catVideos.length > 0 ? catVideos : videos.slice(0, 4),
        total: catVideos.length > 0 ? catVideos.length : 4,
      },
    });
  }

  if (pathname.includes('/recommendations')) {
    return res.status(200).json({ success: true, data: videos.slice(0, 4) });
  }

  if (pathname.includes('/videos')) {
    const sort = url.searchParams.get('sort');
    let sortedVideos = [...videos];
    if (sort === 'most_viewed') {
      sortedVideos.sort((a, b) => b.viewsCount - a.viewsCount);
    }
    return res.status(200).json({
      success: true,
      data: {
        videos: sortedVideos,
        pagination: { total: sortedVideos.length, page: 1, limit: 12 },
      },
    });
  }

  // Fallback for general api requests
  return res.status(200).json({
    success: true,
    data: { message: 'Vyntra Serverless API active', endpoint: pathname },
  });
}
