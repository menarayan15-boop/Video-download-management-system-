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

  // 1. Health endpoint
  if (pathname === '/api/health' || pathname === '/api/v1/health') {
    return res.status(200).json({
      status: 'healthy',
      platform: 'Vyntra',
      tagline: 'Watch. Connect. Discover.',
      timestamp: new Date().toISOString(),
      environment: 'production',
    });
  }

  // 2. Subscription Plans (4 Specific Tiers)
  const subscriptionPlans = [
    {
      id: '7e593ef9-f76b-4aa2-ad4a-0d5bbb9418ed',
      name: 'FREE',
      displayName: 'Free Starter',
      price: 0,
      billingInterval: 'DAILY',
      downloadLimit: 1,
      quotaPeriod: 'DAILY',
      deviceLimit: 1,
      badgeColor: '#9CA3AF',
      isActive: true,
      features: [
        '1 Video Download per day',
        'Standard 720p & 1080p Streaming',
        'Full Community Access & Comments',
        'Multilingual Comment Translations',
        '1 Registered Device',
      ],
    },
    {
      id: '8fcf43e3-640e-47ae-ab7a-9adaa95e12e6',
      name: 'BRONZE',
      displayName: 'Bronze Creator',
      price: 199,
      billingInterval: 'MONTHLY',
      downloadLimit: 10,
      quotaPeriod: 'DAILY',
      deviceLimit: 2,
      badgeColor: '#CD7F32',
      isActive: true,
      features: [
        '10 Video Downloads per day',
        'Full HD 1080p Downloads & Streaming',
        'Priority Fast-Track Download Speeds',
        'Follow Unlimited Creators',
        '2 Registered Devices',
        'Ad-free Playback Experience',
      ],
    },
    {
      id: '2d0120fb-ea3a-4a70-80f2-252d18731ca5',
      name: 'SILVER',
      displayName: 'Silver Pro',
      price: 499,
      billingInterval: 'MONTHLY',
      downloadLimit: 25,
      quotaPeriod: 'DAILY',
      deviceLimit: 4,
      badgeColor: '#94A3B8',
      isActive: true,
      features: [
        '25 Video Downloads per day',
        'Ultra HD 4K Support',
        'High-Speed CDN Delivery',
        'Early Access to Exclusive Content',
        '4 Registered Devices',
        'Creator Direct Interaction Perks',
      ],
    },
    {
      id: 'ce7751e6-a0aa-4e2f-943d-03550d12575d',
      name: 'GOLD',
      displayName: 'Gold VIP',
      price: 999,
      billingInterval: 'MONTHLY',
      downloadLimit: 100,
      quotaPeriod: 'DAILY',
      deviceLimit: 10,
      badgeColor: '#F59E0B',
      isActive: true,
      features: [
        '100 Video Downloads per day',
        'Maximum Bitrate & Master Audio Quality',
        'Unrestricted Instant Batch Transfers',
        'VIP Creator Community Badge',
        'Up to 10 Registered Devices',
        'Dedicated Priority Support',
      ],
    },
  ];

  if (pathname.includes('/subscriptions/plans')) {
    return res.status(200).json({
      success: true,
      data: subscriptionPlans,
    });
  }

  if (pathname.includes('/subscriptions/me')) {
    return res.status(200).json({
      success: true,
      data: {
        subscription: null,
        plan: subscriptionPlans[0],
      },
    });
  }

  if (pathname.includes('/subscriptions/checkout')) {
    return res.status(200).json({
      success: true,
      data: {
        message: 'Plan activated successfully',
        plan: subscriptionPlans[2],
      },
    });
  }

  if (pathname.includes('/subscriptions/cancel')) {
    return res.status(200).json({
      success: true,
      data: {
        message: 'Subscription cancelled. Account returned to Free tier.',
      },
    });
  }

  // 3. Downloads & Quota
  if (pathname.includes('/downloads/quota')) {
    return res.status(200).json({
      success: true,
      data: {
        planName: 'FREE',
        downloadLimit: 1,
        consumed: 0,
        reserved: 0,
        remaining: 1,
        periodStart: new Date().toISOString(),
        periodEnd: new Date(Date.now() + 86400000).toISOString(),
        timezone: 'Asia/Kolkata',
        resetTime: 'Midnight IST',
      },
    });
  }

  if (pathname.includes('/downloads') && !pathname.includes('/quota')) {
    return res.status(200).json({
      success: true,
      data: [],
    });
  }

  // 4. Categories
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

  // 5. Video Catalog
  const videos = [
    {
      id: '89286c13-a5d0-4e56-8dae-894335293707',
      title: 'Mastering Full-Stack React & Node Performance Optimization',
      description: 'Practical tactics to trim bundle size, implement concurrency-safe database operations, eliminate rendering bottlenecks, and achieve sub-100ms response times.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
      provider: 'VYNTRA',
      playbackType: 'DIRECT',
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
      id: '5033eb6b-e4cb-4409-8a23-2a2df25bb765',
      title: 'Understand Artificial 🤖Neural Networks🦾 from Basics with Examples | Components | Working',
      description: 'A comprehensive visual breakdown of neural network architectures, hidden layers, weights, biases, and activation functions.',
      thumbnailUrl: 'https://i.ytimg.com/vi/1TmUwRALJW0/maxresdefault.jpg',
      videoUrl: null,
      embedUrl: 'https://www.youtube.com/embed/1TmUwRALJW0',
      provider: 'YOUTUBE',
      playbackType: 'EMBED_YOUTUBE',
      providerVideoId: '1TmUwRALJW0',
      durationSeconds: 520,
      viewsCount: 21400,
      creatorName: 'Gate Smashers',
      publishedAt: '2026-10-17T11:00:00.000Z',
      category: categories.find((c) => c.slug === 'technology-ai'),
      creator: {
        id: 'gate_smashers',
        username: 'gate_smashers',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
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
      playbackType: 'DIRECT',
      durationSeconds: 420,
      viewsCount: 48320,
      creatorName: 'NASA Astrophysics',
      publishedAt: '2026-10-15T12:00:00.000Z',
      category: categories.find((c) => c.slug === 'space-astronomy'),
      creator: {
        id: 'nasa_official',
        username: 'nasa_official',
        avatarUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=150&auto=format&fit=crop&q=80',
        role: 'CREATOR',
      },
    },
    {
      id: 'f63ee068-nature-featured-02',
      title: 'Cinematic Iceland: Volcanic Glaciers & Aurora Borealis in 4K HDR',
      description: 'An immersive cinematic expedition capturing volcanic eruptions, glacial valleys, and dancing celestial auroras across the Arctic skies.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1600&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4',
      provider: 'VYNTRA',
      playbackType: 'DIRECT',
      durationSeconds: 310,
      viewsCount: 28944,
      creatorName: 'Elena Vance',
      publishedAt: '2026-10-16T14:30:00.000Z',
      category: categories.find((c) => c.slug === 'cinematic'),
      creator: {
        id: 'elena_vance',
        username: 'elena_vance',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        role: 'CREATOR',
      },
    },
    {
      id: '7ce4a02f-synth-waves-03',
      title: 'Ambient Modular Synth Session: Midnight Analog Waves',
      description: 'A continuous live improvisation using analog oscillators, tape delays, and generative CV routing.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
      provider: 'VYNTRA',
      playbackType: 'DIRECT',
      durationSeconds: 182,
      viewsCount: 16505,
      creatorName: 'Marcus Vance',
      publishedAt: '2026-10-16T20:10:00.000Z',
      category: categories.find((c) => c.slug === 'music-audio'),
    },
    {
      id: 'b78ae258-f3aa-45aa-bf72-9f991a89cbf1',
      title: 'Architecting Scalable Microservices with Event Streams',
      description: 'Production blueprints for event-driven decoupled systems using Kafka, Redis Streams, and PostgreSQL.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
      provider: 'VYNTRA',
      playbackType: 'DIRECT',
      durationSeconds: 240,
      viewsCount: 14200,
      creatorName: 'DevOps Architecture Hub',
      publishedAt: '2026-10-17T09:00:00.000Z',
      category: categories.find((c) => c.slug === 'development'),
    },
    {
      id: '8da68c89-7c20-441c-b448-53db20e15096',
      title: 'Journey Across the Rings of Saturn: Astrophysical Voyage',
      description: 'Cassini orbital trajectory data recreated in photorealistic detail, exploring the Shepherd moons and icy rings.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/Sintel/sintel-1024-surround.mp4',
      provider: 'NASA',
      playbackType: 'DIRECT',
      durationSeconds: 380,
      viewsCount: 22800,
      creatorName: 'Planetary Science Institute',
      publishedAt: '2026-10-17T13:00:00.000Z',
      category: categories.find((c) => c.slug === 'space-astronomy'),
    },
    {
      id: 'b53ecfda-cb99-4e50-89f6-d3a4f447b25b',
      title: 'Neural Networks Explained in 5 minutes',
      description: 'Quick-paced conceptual guide outlining biological neurons, perceptrons, activation thresholds, and multi-layer networks.',
      thumbnailUrl: 'https://i.ytimg.com/vi/jmmW0F0biz0/maxresdefault.jpg',
      videoUrl: null,
      embedUrl: 'https://www.youtube.com/embed/jmmW0F0biz0',
      provider: 'YOUTUBE',
      playbackType: 'EMBED_YOUTUBE',
      providerVideoId: 'jmmW0F0biz0',
      durationSeconds: 300,
      viewsCount: 31200,
      creatorName: 'AI Simplified',
      publishedAt: '2026-10-17T18:00:00.000Z',
      category: categories.find((c) => c.slug === 'technology-ai'),
    },
    {
      id: 'd70bcd20-ba4a-4f90-9d20-6cfdececd910',
      title: "Perseverance Rover's Mastcam-Z Captures Ingenuity's Flight",
      description: 'Historic footage of powered flight on Mars recorded by the Mastcam-Z imager aboard Perseverance rover.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/BigBuckBunny_124/BigBuckBunny_512kb.mp4',
      provider: 'NASA',
      playbackType: 'DIRECT',
      durationSeconds: 190,
      viewsCount: 39100,
      creatorName: 'NASA Jet Propulsion Lab',
      publishedAt: '2026-10-16T11:00:00.000Z',
      category: categories.find((c) => c.slug === 'space-astronomy'),
    },
    {
      id: '4f038bcd-8bd1-4691-a2f2-66ca48750f92',
      title: 'But what is a neural network? | Deep learning chapter 1',
      description: 'An iconic, visually gorgeous exploration of what a neural network actually computes beneath the hood.',
      thumbnailUrl: 'https://i.ytimg.com/vi/aircAruvnKk/maxresdefault.jpg',
      videoUrl: null,
      embedUrl: 'https://www.youtube.com/embed/aircAruvnKk',
      provider: 'YOUTUBE',
      playbackType: 'EMBED_YOUTUBE',
      providerVideoId: 'aircAruvnKk',
      durationSeconds: 1150,
      viewsCount: 95400,
      creatorName: '3Blue1Brown',
      publishedAt: '2026-10-15T09:00:00.000Z',
      category: categories.find((c) => c.slug === 'technology-ai'),
    },
    {
      id: '6b29cf12-deep-ocean-06',
      title: 'The Abyssal Zone: Strange Creatures of the Ocean Floor',
      description: 'Documentary footage exploring hydrothermal vents and bioluminescent organisms adapted to crushing deep-sea pressure.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
      provider: 'VYNTRA',
      playbackType: 'DIRECT',
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
      playbackType: 'DIRECT',
      durationSeconds: 290,
      viewsCount: 15300,
      creatorName: 'NeuroScience Lab',
      publishedAt: '2026-10-18T05:30:00.000Z',
      category: categories.find((c) => c.slug === 'human-body-health'),
    },
  ];

  // 6. Featured endpoints
  if (pathname.includes('/featured-video') && !pathname.includes('/featured-videos')) {
    return res.status(200).json({ success: true, data: videos[0] });
  }

  if (pathname.includes('/featured-videos')) {
    return res.status(200).json({ success: true, data: videos.slice(0, 6) });
  }

  // 7. Categories endpoints
  if (pathname.includes('/categories') && !pathname.includes('/videos')) {
    return res.status(200).json({ success: true, data: categories });
  }

  // 8. Category videos: /categories/:slug/videos
  const catMatch = pathname.match(/\/categories\/([^/]+)\/videos/);
  if (catMatch) {
    const slug = catMatch[1];
    const catVideos = videos.filter((v) => v.category?.slug === slug || v.category?.id === slug);
    return res.status(200).json({
      success: true,
      data: {
        videos: catVideos.length > 0 ? catVideos : videos.slice(0, 4),
        total: catVideos.length > 0 ? catVideos.length : 4,
      },
    });
  }

  // 9. Recommendations
  if (pathname.includes('/recommendations')) {
    return res.status(200).json({ success: true, data: videos.slice(0, 4) });
  }

  // 10. Single Video by ID: /videos/:id (MUST MATCH BEFORE /videos LIST)
  const singleVideoMatch = pathname.match(/\/videos\/([^/?#]+)$/);
  if (singleVideoMatch) {
    const videoId = singleVideoMatch[1];
    let foundVideo = videos.find((v) => v.id === videoId || v.slug === videoId);
    if (!foundVideo) {
      // Find fallback video or adapt first video with requested ID
      foundVideo = {
        ...videos[0],
        id: videoId,
      };
    }
    const related = videos.filter((v) => v.id !== foundVideo.id).slice(0, 6);
    return res.status(200).json({
      success: true,
      data: {
        video: foundVideo,
        userState: {
          isLiked: false,
          isSaved: false,
          isFollowingCreator: false,
          watchProgress: null,
        },
        relatedVideos: related,
      },
    });
  }

  // 11. Videos List: /videos
  if (pathname.includes('/videos')) {
    const search = url.searchParams.get('search')?.toLowerCase();
    const categorySlug = url.searchParams.get('category');
    const sort = url.searchParams.get('sort');

    let filtered = [...videos];
    if (search) {
      filtered = filtered.filter(
        (v) =>
          v.title.toLowerCase().includes(search) ||
          v.description?.toLowerCase().includes(search)
      );
    }
    if (categorySlug) {
      filtered = filtered.filter((v) => v.category?.slug === categorySlug);
    }
    if (sort === 'most_viewed') {
      filtered.sort((a, b) => b.viewsCount - a.viewsCount);
    }
    return res.status(200).json({
      success: true,
      data: {
        videos: filtered,
        pagination: { total: filtered.length, page: 1, limit: 12 },
      },
    });
  }

  // 12. Social Interactions
  if (pathname.includes('/like')) {
    return res.status(200).json({ success: true, data: { liked: true } });
  }
  if (pathname.includes('/save')) {
    return res.status(200).json({ success: true, data: { saved: true } });
  }
  if (pathname.includes('/follow')) {
    return res.status(200).json({ success: true, data: { following: true } });
  }
  if (pathname.includes('/comments')) {
    return res.status(200).json({ success: true, data: [] });
  }

  // 13. Auth Check Fallback
  if (pathname.includes('/auth/me')) {
    return res.status(200).json({ success: true, data: null });
  }

  // General Fallback
  return res.status(200).json({
    success: true,
    data: { message: 'Vyntra Serverless API active', endpoint: pathname },
  });
}
