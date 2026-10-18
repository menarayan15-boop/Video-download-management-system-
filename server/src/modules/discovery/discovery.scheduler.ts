import { discoveryService } from './discovery.service.js';
import prisma from '../../database/client.js';

class DiscoveryScheduler {
  private intervalTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private syncIntervalMinutes = 180; // 3 hours

  start(): void {
    if (this.intervalTimer) return;
    console.log(`⏱️ Vyntra Discovery Scheduler initialized (interval: ${this.syncIntervalMinutes}m)`);

    // Run scheduled job periodically
    this.intervalTimer = setInterval(() => {
      this.runScheduledDiscovery().catch((err) => {
        console.error('[DiscoveryScheduler] Scheduled sync error:', err.message);
      });
    }, this.syncIntervalMinutes * 60 * 1000);
  }

  stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  async runScheduledDiscovery(maxCategoriesPerRun = 4): Promise<void> {
    if (this.isSyncing) {
      console.log('[DiscoveryScheduler] Sync job already in progress, skipping iteration.');
      return;
    }

    this.isSyncing = true;
    try {
      console.log('🚀 [DiscoveryScheduler] Commencing scheduled discovery run...');

      // Find categories that haven't been synced recently
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        take: maxCategoriesPerRun,
        orderBy: { updatedAt: 'asc' },
      });

      for (const cat of categories) {
        try {
          console.log(`[DiscoveryScheduler] Discovering content for category: ${cat.name}`);
          await discoveryService.syncCategory(cat.id, { limitPerCategory: 6 });
          // Space between categories to respect API rate boundaries
          await new Promise((r) => setTimeout(r, 2000));
        } catch (err: any) {
          console.error(`[DiscoveryScheduler] Error syncing category ${cat.name}:`, err.message);
        }
      }
      console.log('✅ [DiscoveryScheduler] Scheduled discovery cycle complete.');
    } finally {
      this.isSyncing = false;
    }
  }
}

export const discoveryScheduler = new DiscoveryScheduler();
