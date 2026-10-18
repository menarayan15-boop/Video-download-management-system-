import { createApp } from './app.js';
import { CONFIG } from './config/constants.js';
import prisma from './database/client.js';
import { discoveryService } from './modules/discovery/discovery.service.js';
import { discoveryScheduler } from './modules/discovery/discovery.scheduler.js';

const app = createApp();

const startServer = async () => {
  try {
    // Verify DB connectivity
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL database.');

    // Seed Discovery Categories & Video Providers
    await discoveryService.seedCategoriesAndProviders().catch((e) => {
      console.warn('Discovery category initialization notice:', e.message);
    });

    // Start background discovery scheduler
    discoveryScheduler.start();

    const server = app.listen(CONFIG.PORT, () => {
      console.log(`🚀 Vyntra Backend API Server running at http://localhost:${CONFIG.PORT}`);
      console.log(`🌐 Timezone configured for Quota boundaries: ${CONFIG.QUOTA_TIMEZONE}`);
    });

    const shutdown = async () => {
      console.log('\nGracefully shutting down Vyntra API server...');
      discoveryScheduler.stop();
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database connections closed. Goodbye!');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('❌ Failed to start Vyntra server:', error);
    process.exit(1);
  }
};

startServer();
