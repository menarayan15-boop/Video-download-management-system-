import dotenv from 'dotenv';
dotenv.config();

import prisma from './client.js';
import { discoveryService } from '../modules/discovery/discovery.service.js';

async function main() {
  console.log('🚀 Starting initial Vyntra Content Discovery ingestion...');

  // Ensure all 20 categories and providers exist
  await discoveryService.seedCategoriesAndProviders();

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });

  console.log(`Found ${categories.length} active categories.`);

  // Ingest initial discovery videos for top categories
  const targetCategories = [
    'space-astronomy',
    'technology-ai',
    'nature-wildlife',
    'human-body-health',
    'general-science',
    'history-archaeology',
    'education-learning',
    'engineering-inventions',
  ];

  for (const slug of targetCategories) {
    const cat = categories.find((c) => c.slug === slug);
    if (!cat) continue;

    console.log(`\n📡 Discovering videos for: ${cat.name} (${cat.slug})...`);
    try {
      const res = await discoveryService.syncCategory(cat.id, { limitPerCategory: 6 });
      console.log(`  -> Discovered: ${res.discovered}, Imported: ${res.imported}, Skipped: ${res.skipped}`);
    } catch (err: any) {
      console.warn(`  ⚠️ Discovery error for ${cat.name}:`, err.message);
    }

    // Short pause between categories
    await new Promise((r) => setTimeout(r, 1500));
  }

  const videoCount = await prisma.video.count();
  console.log(`\n🎉 Discovery ingestion complete! Total videos in Neon DB: ${videoCount}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal discovery error:', err);
  process.exit(1);
});
