import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../database/client.js';
import { AuthRequest } from '../../middleware/auth.js';
import { DownloadService } from './download.service.js';

const requestDownloadSchema = z.object({
  videoId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(128),
});

export const getQuota = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const quota = await DownloadService.getUserQuota(userId);
    res.json({
      success: true,
      data: quota,
    });
  } catch (error) {
    next(error);
  }
};

export const getDownloads = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { status, sort } = req.query;

    const where: any = { userId };

    if (status && status !== 'all') {
      if (status === 'completed') where.status = 'COMPLETED';
      else if (status === 'in_progress') where.status = { in: ['RESERVED', 'TRANSFERRING', 'AUTHORIZED'] };
      else if (status === 'failed') where.status = 'FAILED';
      else if (status === 'cancelled') where.status = 'CANCELLED';
    }

    const orderBy: any = {};
    if (sort === 'oldest') {
      orderBy.requestedAt = 'asc';
    } else {
      orderBy.requestedAt = 'desc';
    }

    const downloads = await prisma.downloadOperation.findMany({
      where,
      orderBy,
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            durationSeconds: true,
            fileSizeBytes: true,
            creator: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
        },
        subscription: {
          include: { plan: true },
        },
      },
    });

    const safeDownloads = downloads.map((d) => ({
      ...d,
      fileSizeBytes: d.fileSizeBytes ? d.fileSizeBytes.toString() : null,
      video: {
        ...d.video,
        fileSizeBytes: d.video.fileSizeBytes.toString(),
      },
      downloadToken: ['RESERVED', 'TRANSFERRING', 'AUTHORIZED', 'COMPLETED'].includes(d.status)
        ? DownloadService.generateDownloadToken(d.id, userId, d.videoId)
        : null,
    }));

    res.json({
      success: true,
      data: safeDownloads,
    });
  } catch (error) {
    next(error);
  }
};

export const requestDownload = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { videoId, idempotencyKey } = requestDownloadSchema.parse(req.body);

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await DownloadService.requestDownload(userId, videoId, idempotencyKey, {
      ip: clientIp,
      userAgent,
    });

    const fileSizeBytesStr = result.operation.fileSizeBytes ? result.operation.fileSizeBytes.toString() : null;

    res.status(result.isExisting ? 200 : 201).json({
      success: true,
      message: result.isExisting
        ? 'Retrieved existing download operation for idempotency key'
        : 'Download authorized and quota reserved successfully',
      data: {
        operation: {
          ...result.operation,
          fileSizeBytes: fileSizeBytesStr,
        },
        downloadToken: result.downloadToken,
        streamUrl: `/api/v1/downloads/stream/${result.downloadToken}`,
        isExisting: result.isExisting,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDownloadById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const op = await prisma.downloadOperation.findUnique({
      where: { id },
      include: {
        video: true,
        history: {
          orderBy: { eventTimestamp: 'desc' },
        },
      },
    });

    if (!op || (op.userId !== userId && req.user!.role !== 'ADMIN')) {
      res.status(404).json({ success: false, error: 'Download operation not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...op,
        fileSizeBytes: op.fileSizeBytes ? op.fileSizeBytes.toString() : null,
        video: {
          ...op.video,
          fileSizeBytes: op.video.fileSizeBytes.toString(),
        },
        downloadToken: DownloadService.generateDownloadToken(op.id, op.userId, op.videoId),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const retryDownload = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = await DownloadService.retryDownload(userId, id);

    res.json({
      success: true,
      message: 'Download reservation refreshed. Ready to transfer.',
      data: {
        operation: {
          ...result.operation,
          fileSizeBytes: result.operation.fileSizeBytes ? result.operation.fileSizeBytes.toString() : null,
        },
        downloadToken: result.downloadToken,
        streamUrl: `/api/v1/downloads/stream/${result.downloadToken}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelDownload = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const cancelled = await DownloadService.cancelDownload(userId, id);

    res.json({
      success: true,
      message: 'Download cancelled and quota reservation released',
      data: cancelled,
    });
  } catch (error) {
    next(error);
  }
};

export const completeDownloadExplicit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const op = await prisma.downloadOperation.findUnique({ where: { id } });
    if (!op || op.userId !== userId) {
      res.status(404).json({ success: false, error: 'Operation not found' });
      return;
    }

    const completed = await DownloadService.completeDownload(id);
    res.json({
      success: true,
      data: completed,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Secure media streaming & download endpoint with HTTP range support
 */
export const streamDownloadMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;
    const { operation, video } = await DownloadService.startDownloadTransfer(token);

    // If source is a public/cloud video URL, we can stream or redirect securely
    // In our robust architecture, we support direct ranged streaming pipe
    const cleanTitle = video.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `${cleanTitle}.mp4`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');

    if (!video.videoUrl) {
      await DownloadService.failDownload(operation.id, 'NO_DIRECT_URL');
      res.status(400).json({ success: false, error: 'Direct download is not available for this media' });
      return;
    }

    // Fetch upstream media
    const upstreamRes = await fetch(video.videoUrl, {
      headers: req.headers.range ? { range: req.headers.range } : undefined,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      await DownloadService.failDownload(operation.id, 'UPSTREAM_FETCH_FAILED');
      res.status(502).json({ success: false, error: 'Failed to stream media from source' });
      return;
    }

    if (upstreamRes.headers.get('content-length')) {
      res.setHeader('Content-Length', upstreamRes.headers.get('content-length')!);
    }
    if (upstreamRes.headers.get('content-range')) {
      res.setHeader('Content-Range', upstreamRes.headers.get('content-range')!);
      res.status(206);
    }

    // Convert Web ReadableStream to Node stream
    const reader = upstreamRes.body?.getReader();
    if (!reader) {
      res.status(500).send('Stream error');
      return;
    }

    req.on('close', async () => {
      // If closed before finishing and not already completed
      if (!res.writableEnded) {
        console.log(`[Download Transfer] Client disconnected prematurely for op: ${operation.id}`);
      }
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }

    res.end();

    // Mark completed once streamed
    await DownloadService.completeDownload(operation.id);
  } catch (error) {
    next(error);
  }
};
