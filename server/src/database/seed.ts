import bcrypt from 'bcryptjs';
import prisma from './client.js';
import { DEFAULT_PLANS } from '../config/constants.js';

export async function seedDatabase() {
  console.log('🌱 Starting Vyntra database seeding...');

  // 1. Seed Subscription Plans
  console.log('Creating subscription plans...');
  for (const plan of DEFAULT_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name as any },
      update: {
        displayName: plan.displayName,
        price: plan.price,
        billingInterval: plan.billingInterval as any,
        downloadLimit: plan.downloadLimit,
        quotaPeriod: plan.quotaPeriod as any,
        deviceLimit: plan.deviceLimit,
        features: plan.features,
        badgeColor: plan.badgeColor,
        isActive: true,
      },
      create: {
        name: plan.name as any,
        displayName: plan.displayName,
        price: plan.price,
        billingInterval: plan.billingInterval as any,
        downloadLimit: plan.downloadLimit,
        quotaPeriod: plan.quotaPeriod as any,
        deviceLimit: plan.deviceLimit,
        features: plan.features,
        badgeColor: plan.badgeColor,
        isActive: true,
      },
    });
  }

  // 2. Seed Categories
  console.log('Creating categories...');
  const categoriesData = [
    { name: 'Technology & AI', slug: 'tech-ai', description: 'Artificial intelligence, software innovation, and deep tech explorations.', icon: 'Cpu' },
    { name: 'Web & App Development', slug: 'development', description: 'Full-stack engineering, React, TypeScript, Cloud architecture, and UI design.', icon: 'Code' },
    { name: 'Cinematic & 4K Visuals', slug: 'cinematic', description: 'Breathtaking 4K cinematography, film production, and visual masterpieces.', icon: 'Film' },
    { name: 'Music & Audio Studio', slug: 'music-audio', description: 'Synthesizers, acoustic performances, master mixing, and electronic rhythms.', icon: 'Music' },
    { name: 'Science & Cosmos', slug: 'science-nature', description: 'Astrophysics, quantum computing, ecology, and planetary discoveries.', icon: 'Compass' },
    { name: 'Gaming & High-FPS', slug: 'gaming', description: 'Competitive gameplay, esports tournaments, indie game dev highlights.', icon: 'Gamepad2' },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    createdCategories[cat.slug] = c.id;
  }

  // 3. Seed Users
  console.log('Creating users...');
  const defaultPassword = await bcrypt.hash('VyntraAdmin2026!', 10);
  const creatorPassword = await bcrypt.hash('CreatorPass2026!', 10);
  const demoPassword = await bcrypt.hash('DemoUser2026!', 10);

  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'FREE' } });
  const goldPlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'GOLD' } });
  const bronzePlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'BRONZE' } });

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vyntra.com' },
    update: { role: 'ADMIN' },
    create: {
      username: 'admin',
      email: 'admin@vyntra.com',
      passwordHash: defaultPassword,
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      biography: 'Vyntra System Administrator and platform architect.',
      subscriptions: goldPlan ? {
        create: {
          planId: goldPlan.id,
          status: 'ACTIVE',
          startsAt: new Date(),
        }
      } : undefined,
    },
  });

  // Creator 1: Alex Dev
  const creator1 = await prisma.user.upsert({
    where: { email: 'alex.dev@vyntra.com' },
    update: { role: 'CREATOR' },
    create: {
      username: 'alex_dev',
      email: 'alex.dev@vyntra.com',
      passwordHash: creatorPassword,
      role: 'CREATOR',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      biography: 'Lead Software Architect | Building distributed systems & modern web platforms.',
      subscriptions: goldPlan ? {
        create: {
          planId: goldPlan.id,
          status: 'ACTIVE',
          startsAt: new Date(),
        }
      } : undefined,
    },
  });

  // Creator 2: Elena Vance
  const creator2 = await prisma.user.upsert({
    where: { email: 'elena.cinema@vyntra.com' },
    update: { role: 'CREATOR' },
    create: {
      username: 'elena_cinema',
      email: 'elena.cinema@vyntra.com',
      passwordHash: creatorPassword,
      role: 'CREATOR',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      biography: 'Documentary director and cinematographer exploring high-contrast landscapes.',
      subscriptions: bronzePlan ? {
        create: {
          planId: bronzePlan.id,
          status: 'ACTIVE',
          startsAt: new Date(),
        }
      } : undefined,
    },
  });

  // Demo standard user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@vyntra.com' },
    update: {},
    create: {
      username: 'demouser',
      email: 'demo@vyntra.com',
      passwordHash: demoPassword,
      role: 'USER',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      biography: 'Tech enthusiast and avid video explorer on Vyntra.',
      subscriptions: freePlan ? {
        create: {
          planId: freePlan.id,
          status: 'ACTIVE',
          startsAt: new Date(),
        }
      } : undefined,
    },
  });

  // 4. Seed Videos
  console.log('Creating videos...');
  const videosData = [
    {
      title: 'Architecting Scalable Microservices with Event Streams',
      description: 'A deep-dive tutorial into constructing distributed event-driven systems with asynchronous messaging, idempotency mechanisms, and automated failover recovery.',
      creatorId: creator1.id,
      categoryId: createdCategories['development'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      storageKey: 'videos/architecture_microservices.mp4',
      durationSeconds: 596,
      fileSizeBytes: BigInt(158008374),
      viewsCount: 14250,
      downloadAllowed: true,
    },
    {
      title: 'Cinematic Iceland: Volcanic Glaciers in 4K HDR',
      description: 'Captured over four seasons across the southern ridge of Vatnajökull. Featuring slow camera sweeps, raw drone footage, and native binaural environmental audio.',
      creatorId: creator2.id,
      categoryId: createdCategories['cinematic'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      storageKey: 'videos/cinematic_iceland.mp4',
      durationSeconds: 653,
      fileSizeBytes: BigInt(210850200),
      viewsCount: 28940,
      downloadAllowed: true,
    },
    {
      title: 'Next-Gen Neural Networks and Autonomous Agents',
      description: 'Explore the newest breakthrough transformer architectures, multi-agent communication networks, and self-correcting logic chains in enterprise deployments.',
      creatorId: creator1.id,
      categoryId: createdCategories['tech-ai'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      storageKey: 'videos/neural_networks_nextgen.mp4',
      durationSeconds: 90,
      fileSizeBytes: BigInt(35000000),
      viewsCount: 8930,
      downloadAllowed: true,
    },
    {
      title: 'Ambient Modular Synth Session: Midnight Waves',
      description: 'Live hardware improvisation utilizing Eurorack modular synthesizers, tape echo delays, and warm analog oscillators recorded in a single continuous take.',
      creatorId: creator2.id,
      categoryId: createdCategories['music-audio'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      storageKey: 'videos/ambient_synth_session.mp4',
      durationSeconds: 120,
      fileSizeBytes: BigInt(48000000),
      viewsCount: 16500,
      downloadAllowed: true,
    },
    {
      title: 'Journey Across the Rings of Saturn: Astrophysical Voyage',
      description: 'High-precision computer simulation combined with Cassini probe telemetry reconstructing the intricate ring dynamics, shepherd moons, and cosmic dust storms.',
      creatorId: creator2.id,
      categoryId: createdCategories['science-nature'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      storageKey: 'videos/rings_of_saturn.mp4',
      durationSeconds: 734,
      fileSizeBytes: BigInt(295000000),
      viewsCount: 42100,
      downloadAllowed: true,
    },
    {
      title: 'Mastering Full-Stack React & Node Performance Optimization',
      description: 'Practical tactics to trim bundle size, implement concurrency-safe database operations, eliminate rendering bottlenecks, and achieve sub-100ms response times.',
      creatorId: creator1.id,
      categoryId: createdCategories['development'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      storageKey: 'videos/mastering_fullstack.mp4',
      durationSeconds: 154,
      fileSizeBytes: BigInt(62000000),
      viewsCount: 9780,
      downloadAllowed: true,
    },
  ];

  const createdVideos = [];
  for (const v of videosData) {
    const video = await prisma.video.create({
      data: v,
    });
    createdVideos.push(video);
  }

  // 5. Seed Interactions (Comments, Likes, Follows)
  console.log('Seeding interactions...');
  if (createdVideos.length > 0) {
    const v1 = createdVideos[0];
    const v2 = createdVideos[1];

    // Follows
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: demoUser.id, followingId: creator1.id } },
      update: {},
      create: { followerId: demoUser.id, followingId: creator1.id },
    });

    // Likes
    await prisma.like.upsert({
      where: { userId_videoId: { userId: demoUser.id, videoId: v1.id } },
      update: {},
      create: { userId: demoUser.id, videoId: v1.id },
    });

    // Comments with multilingual example
    const c1 = await prisma.comment.create({
      data: {
        userId: demoUser.id,
        videoId: v1.id,
        content: 'The section on idempotency keys and concurrency handling in PostgreSQL was exceptionally clear. Loved this!',
      },
    });

    // Creator reply
    await prisma.comment.create({
      data: {
        userId: creator1.id,
        videoId: v1.id,
        parentId: c1.id,
        content: 'Thank you @demouser! Concurrency safety is one of the most neglected topics in full-stack engineering.',
      },
    });

    // Comment on video 2 in Hindi with translation
    await prisma.comment.create({
      data: {
        userId: demoUser.id,
        videoId: v2.id,
        content: 'यह सिनेमैटोग्राफी सचमुच अद्भुत है! ड्रोन शॉट्स बहुत शानदार हैं।',
        translatedContent: 'This cinematography is truly incredible! The drone shots are magnificent.',
        translationLang: 'en',
      },
    });

    // Notification for creator1
    await prisma.notification.create({
      data: {
        userId: creator1.id,
        type: 'COMMENT',
        title: 'New Comment',
        message: 'demouser commented on your video "Architecting Scalable Microservices with Event Streams"',
        link: `/watch/${v1.id}`,
      },
    });
  }

  console.log('✅ Vyntra database seeding completed successfully!');
}

seedDatabase()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
