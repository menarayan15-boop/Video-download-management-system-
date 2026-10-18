import jwt from 'jsonwebtoken';
import prisma from '../../database/client.js';
import { CONFIG } from '../../config/constants.js';
import { getQuotaPeriod, hashIdempotencyKey } from './quota.utils.js';
import { DownloadStatus } from '@prisma/client';

export interface QuotaSummary {
  planName: string;
  downloadLimit: number;
  consumed: number;
  reserved: number;
  remaining: number;
  periodStart: Date;
  periodEnd: Date;
  timezone: string;
  resetTime: Date;
}

export class DownloadService {
  /**
   * Retrieves live quota status for a user based on their active plan
   */
  static async getUserQuota(userId: string): Promise<QuotaSummary> {
    // 1. Get user active subscription or default to Free
    const activeSub = await prisma.userSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    let plan: any = activeSub?.plan;
    if (!plan) {
      plan = await prisma.subscriptionPlan.findUnique({
        where: { name: 'FREE' },
      });
      if (!plan) {
        throw new Error('Default Free plan not found in database');
      }
    }

    // 2. Compute quota period boundaries
    const period = getQuotaPeriod(plan.quotaPeriod, new Date());

    // 3. Count consumed in this period
    const consumedAggregate = await prisma.downloadOperation.aggregate({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: {
          gte: period.start,
          lte: period.end,
        },
      },
      _sum: {
        quotaConsumed: true,
      },
    });
    const consumed = consumedAggregate._sum.quotaConsumed || 0;

    // 4. Count active reservations in this period (RESERVED or TRANSFERRING and not expired)
    const activeReservations = await prisma.downloadOperation.aggregate({
      where: {
        userId,
        status: { in: ['RESERVED', 'TRANSFERRING', 'AUTHORIZED'] },
        expiresAt: { gt: new Date() },
        quotaPeriodStart: { gte: period.start },
        quotaPeriodEnd: { lte: period.end },
      },
      _sum: {
        quotaReserved: true,
      },
    });
    const reserved = activeReservations._sum.quotaReserved || 0;

    const remaining = Math.max(0, plan.downloadLimit - (consumed + reserved));

    return {
      planName: plan.name,
      downloadLimit: plan.downloadLimit,
      consumed,
      reserved,
      remaining,
      periodStart: period.start,
      periodEnd: period.end,
      timezone: period.timezone,
      resetTime: period.end,
    };
  }

  /**
   * Atomic, concurrency-safe download request with Idempotency Key validation
   */
  static async requestDownload(
    userId: string,
    videoId: string,
    idempotencyKey: string,
    metadata?: { ip?: string; userAgent?: string }
  ) {
    const keyHash = hashIdempotencyKey(userId, idempotencyKey);

    // Concurrency safe transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Check existing operation by idempotency key
      const existingOp = await tx.downloadOperation.findUnique({
        where: { idempotencyKeyHash: keyHash },
        include: { video: true },
      });

      if (existingOp) {
        // If already completed or currently reserved/transferring, return it without recharging
        if (existingOp.status === 'COMPLETED') {
          return {
            operation: existingOp,
            isExisting: true,
            status: existingOp.status,
            downloadToken: this.generateDownloadToken(existingOp.id, userId, existingOp.videoId),
          };
        }

        if (
          ['RESERVED', 'TRANSFERRING', 'AUTHORIZED'].includes(existingOp.status) &&
          existingOp.expiresAt &&
          existingOp.expiresAt > new Date()
        ) {
          return {
            operation: existingOp,
            isExisting: true,
            status: existingOp.status,
            downloadToken: this.generateDownloadToken(existingOp.id, userId, existingOp.videoId),
          };
        }
      }

      // 2. Validate video exists, is published, and download is allowed
      const video = await tx.video.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        throw { statusCode: 404, message: 'Video not found', code: 'VIDEO_NOT_FOUND' };
      }

      if (video.visibility !== 'PUBLIC') {
        throw { statusCode: 403, message: 'Private or unlisted videos cannot be downloaded', code: 'FORBIDDEN' };
      }

      if (!video.downloadAllowed) {
        throw { statusCode: 403, message: 'Creator has disabled downloads for this video', code: 'DOWNLOADS_DISABLED' };
      }

      // 3. Fetch user active plan
      const userSub = await tx.userSubscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });

      let plan: any = userSub?.plan;
      if (!plan) {
        plan = await tx.subscriptionPlan.findUnique({
          where: { name: 'FREE' },
        });
        if (!plan) {
          throw { statusCode: 500, message: 'System subscription plans uninitialized', code: 'SERVER_ERROR' };
        }
      }

      // 4. Calculate quota period
      const period = getQuotaPeriod(plan.quotaPeriod, new Date());

      // 5. Atomic check: count consumed + reserved in current period
      const consumedAgg = await tx.downloadOperation.aggregate({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            gte: period.start,
            lte: period.end,
          },
        },
        _sum: { quotaConsumed: true },
      });
      const consumed = consumedAgg._sum.quotaConsumed || 0;

      const reservedAgg = await tx.downloadOperation.aggregate({
        where: {
          userId,
          status: { in: ['RESERVED', 'TRANSFERRING', 'AUTHORIZED'] },
          expiresAt: { gt: new Date() },
          quotaPeriodStart: { gte: period.start },
          quotaPeriodEnd: { lte: period.end },
        },
        _sum: { quotaReserved: true },
      });
      const reserved = reservedAgg._sum.quotaReserved || 0;

      if (consumed + reserved >= plan.downloadLimit) {
        throw {
          statusCode: 429,
          message: `Download quota exceeded for your ${plan.name} plan (${plan.downloadLimit} download${plan.downloadLimit > 1 ? 's' : ''} per ${plan.quotaPeriod.toLowerCase()}). Upgrade your plan for higher allowances.`,
          code: 'QUOTA_EXHAUSTED',
          quota: {
            planName: plan.name,
            downloadLimit: plan.downloadLimit,
            consumed,
            reserved,
            remaining: 0,
            resetTime: period.end,
          },
        };
      }

      // 6. Create reservation record
      const expiresAt = new Date(Date.now() + CONFIG.RESERVATION_TIMEOUT_MINUTES * 60 * 1000);

      const operation = await tx.downloadOperation.create({
        data: {
          userId,
          videoId,
          subscriptionId: userSub?.id || null,
          idempotencyKeyHash: keyHash,
          status: 'RESERVED',
          quotaPeriodStart: period.start,
          quotaPeriodEnd: period.end,
          quotaReserved: 1,
          quotaConsumed: 0,
          requestedAt: new Date(),
          expiresAt,
          fileSizeBytes: video.fileSizeBytes,
        },
        include: { video: true },
      });

      // 7. Audit log creation
      await tx.downloadHistory.create({
        data: {
          downloadOperationId: operation.id,
          userId,
          videoId,
          eventType: 'RESERVATION_CREATED',
          status: 'RESERVED',
          metadata: JSON.stringify({
            planName: plan.name,
            downloadLimit: plan.downloadLimit,
            remainingAfterReservation: Math.max(0, plan.downloadLimit - (consumed + reserved + 1)),
            ip: metadata?.ip,
            userAgent: metadata?.userAgent,
          }),
        },
      });

      const downloadToken = this.generateDownloadToken(operation.id, userId, videoId);

      return {
        operation,
        isExisting: false,
        status: 'RESERVED',
        downloadToken,
      };
    });
  }

  /**
   * Generates tamper-proof short-lived signed download token
   */
  static generateDownloadToken(operationId: string, userId: string, videoId: string): string {
    return jwt.sign(
      {
        operationId,
        userId,
        videoId,
        type: 'MEDIA_DOWNLOAD',
      },
      CONFIG.JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  /**
   * Verifies token and transitions operation to TRANSFERRING
   */
  static async startDownloadTransfer(token: string) {
    let payload: any;
    try {
      payload = jwt.verify(token, CONFIG.JWT_SECRET);
      if (payload.type !== 'MEDIA_DOWNLOAD') {
        throw new Error('Invalid token type');
      }
    } catch (e) {
      throw { statusCode: 401, message: 'Download token is invalid or expired', code: 'INVALID_DOWNLOAD_TOKEN' };
    }

    const { operationId, userId, videoId } = payload;

    const operation = await prisma.downloadOperation.findUnique({
      where: { id: operationId },
      include: { video: true },
    });

    if (!operation || operation.userId !== userId || operation.videoId !== videoId) {
      throw { statusCode: 404, message: 'Download operation not found or mismatched', code: 'OPERATION_NOT_FOUND' };
    }

    if (operation.status === 'COMPLETED') {
      return { operation, video: operation.video, alreadyCompleted: true };
    }

    if (!['RESERVED', 'AUTHORIZED', 'TRANSFERRING'].includes(operation.status)) {
      throw {
        statusCode: 400,
        message: `Download operation cannot be started in state ${operation.status}`,
        code: 'INVALID_STATUS',
      };
    }

    if (operation.expiresAt && operation.expiresAt < new Date()) {
      throw { statusCode: 410, message: 'Download reservation has expired', code: 'RESERVATION_EXPIRED' };
    }

    // Transition to TRANSFERRING
    const updated = await prisma.downloadOperation.update({
      where: { id: operationId },
      data: {
        status: 'TRANSFERRING',
        startedAt: operation.startedAt || new Date(),
      },
      include: { video: true },
    });

    await prisma.downloadHistory.create({
      data: {
        downloadOperationId: operationId,
        userId,
        videoId,
        eventType: 'TRANSFER_STARTED',
        status: 'TRANSFERRING',
        metadata: JSON.stringify({ startedAt: new Date() }),
      },
    });

    return { operation: updated, video: updated.video, alreadyCompleted: false };
  }

  /**
   * Marks a download operation as COMPLETED and converts reserved quota to consumed quota
   */
  static async completeDownload(operationId: string) {
    return await prisma.$transaction(async (tx) => {
      const operation = await tx.downloadOperation.findUnique({
        where: { id: operationId },
        include: { video: true },
      });

      if (!operation) return null;
      if (operation.status === 'COMPLETED') return operation;

      const completed = await tx.downloadOperation.update({
        where: { id: operationId },
        data: {
          status: 'COMPLETED',
          quotaReserved: 0,
          quotaConsumed: 1,
          completedAt: new Date(),
        },
        include: { video: true },
      });

      await tx.downloadHistory.create({
        data: {
          downloadOperationId: operationId,
          userId: operation.userId,
          videoId: operation.videoId,
          eventType: 'DOWNLOAD_COMPLETED',
          status: 'COMPLETED',
          metadata: JSON.stringify({ completedAt: new Date(), videoTitle: operation.video.title }),
        },
      });

      // Send notification
      await tx.notification.create({
        data: {
          userId: operation.userId,
          type: 'DOWNLOAD_SUCCESS',
          title: 'Video Downloaded',
          message: `"${operation.video.title}" has been successfully downloaded.`,
          link: `/downloads`,
        },
      });

      return completed;
    });
  }

  /**
   * Records failure and safely releases reserved quota
   */
  static async failDownload(operationId: string, failureCode: string) {
    return await prisma.$transaction(async (tx) => {
      const operation = await tx.downloadOperation.findUnique({
        where: { id: operationId },
      });

      if (!operation || operation.status === 'COMPLETED') return;

      await tx.downloadOperation.update({
        where: { id: operationId },
        data: {
          status: 'FAILED',
          quotaReserved: 0,
          failureCode,
        },
      });

      await tx.downloadHistory.create({
        data: {
          downloadOperationId: operationId,
          userId: operation.userId,
          videoId: operation.videoId,
          eventType: 'DOWNLOAD_FAILED',
          status: 'FAILED',
          metadata: JSON.stringify({ failureCode, timestamp: new Date() }),
        },
      });
    });
  }

  /**
   * Retries an eligible failed or expired download
   */
  static async retryDownload(userId: string, operationId: string) {
    const existing = await prisma.downloadOperation.findUnique({
      where: { id: operationId },
      include: { video: true },
    });

    if (!existing || existing.userId !== userId) {
      throw { statusCode: 404, message: 'Download operation not found', code: 'NOT_FOUND' };
    }

    if (existing.status === 'COMPLETED') {
      return {
        operation: existing,
        downloadToken: this.generateDownloadToken(existing.id, userId, existing.videoId),
      };
    }

    // Re-check quota and reactivate reservation
    const quota = await this.getUserQuota(userId);
    if (quota.remaining <= 0) {
      throw {
        statusCode: 429,
        message: 'No remaining download quota available to retry this download.',
        code: 'QUOTA_EXHAUSTED',
      };
    }

    const expiresAt = new Date(Date.now() + CONFIG.RESERVATION_TIMEOUT_MINUTES * 60 * 1000);
    const updated = await prisma.downloadOperation.update({
      where: { id: operationId },
      data: {
        status: 'RESERVED',
        quotaReserved: 1,
        failureCode: null,
        expiresAt,
      },
      include: { video: true },
    });

    await prisma.downloadHistory.create({
      data: {
        downloadOperationId: operationId,
        userId,
        videoId: existing.videoId,
        eventType: 'OPERATION_RETRIED',
        status: 'RESERVED',
        metadata: JSON.stringify({ retriedAt: new Date() }),
      },
    });

    return {
      operation: updated,
      downloadToken: this.generateDownloadToken(updated.id, userId, updated.videoId),
    };
  }

  /**
   * Cancels a pending download operation and releases reserved quota
   */
  static async cancelDownload(userId: string, operationId: string) {
    const existing = await prisma.downloadOperation.findUnique({
      where: { id: operationId },
    });

    if (!existing || existing.userId !== userId) {
      throw { statusCode: 404, message: 'Download operation not found', code: 'NOT_FOUND' };
    }

    if (existing.status === 'COMPLETED') {
      throw { statusCode: 400, message: 'Cannot cancel a completed download', code: 'ALREADY_COMPLETED' };
    }

    const updated = await prisma.downloadOperation.update({
      where: { id: operationId },
      data: {
        status: 'CANCELLED',
        quotaReserved: 0,
      },
    });

    await prisma.downloadHistory.create({
      data: {
        downloadOperationId: operationId,
        userId,
        videoId: existing.videoId,
        eventType: 'OPERATION_CANCELLED',
        status: 'CANCELLED',
        metadata: JSON.stringify({ cancelledAt: new Date() }),
      },
    });

    return updated;
  }
}
