import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../database/client.js';
import { AuthRequest } from '../../middleware/auth.js';
import { DownloadService } from '../downloads/download.service.js';

const checkoutSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(['DAILY', 'MONTHLY', 'YEARLY']).optional().default('MONTHLY'),
  paymentMethod: z.string().optional().default('CARD_SIMULATED'),
});

export const getPlans = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    const parsedPlans = plans.map((p) => ({
      ...p,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }));

    res.json({
      success: true,
      data: parsedPlans,
    });
  } catch (error) {
    next(error);
  }
};

export const getMySubscription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    const subscription = await prisma.userSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    const quota = await DownloadService.getUserQuota(userId);

    res.json({
      success: true,
      data: {
        subscription: subscription ? {
          ...subscription,
          plan: {
            ...subscription.plan,
            features: typeof subscription.plan.features === 'string'
              ? JSON.parse(subscription.plan.features)
              : subscription.plan.features,
          },
        } : null,
        quota,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const checkoutSubscription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { planId } = checkoutSchema.parse(req.body);

    const targetPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!targetPlan || !targetPlan.isActive) {
      res.status(404).json({ success: false, error: 'Subscription plan not found or inactive' });
      return;
    }

    // Compute period expiration (30 days from now for paid, 1 day for daily)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (targetPlan.billingInterval === 'DAILY' ? 24 : 30 * 24) * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Deactivate existing active subscriptions
      await tx.userSubscription.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });

      // 2. Create new active subscription
      const newSub = await tx.userSubscription.create({
        data: {
          userId,
          planId: targetPlan.id,
          status: 'ACTIVE',
          startsAt: now,
          expiresAt: targetPlan.price > 0 ? expiresAt : null,
          autoRenew: true,
          paymentProviderReference: `SIM_TX_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        },
        include: { plan: true },
      });

      // 3. Create payment record if paid
      if (targetPlan.price > 0) {
        await tx.paymentRecord.create({
          data: {
            userId,
            subscriptionId: newSub.id,
            amount: targetPlan.price,
            currency: 'INR',
            status: 'SUCCESS',
            provider: 'DEV_SIMULATOR',
            providerTxId: newSub.paymentProviderReference,
          },
        });
      }

      // 4. Send notification
      await tx.notification.create({
        data: {
          userId,
          type: 'SUBSCRIPTION',
          title: 'Plan Upgraded',
          message: `Congratulations! Your subscription has been upgraded to ${targetPlan.displayName}. You now have ${targetPlan.downloadLimit} downloads per ${targetPlan.quotaPeriod.toLowerCase()}.`,
          link: '/downloads',
        },
      });

      return newSub;
    });

    res.json({
      success: true,
      message: `Successfully subscribed to ${targetPlan.displayName}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    const sub = await prisma.userSubscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { plan: true },
    });

    if (!sub) {
      res.status(404).json({ success: false, error: 'No active subscription found to cancel' });
      return;
    }

    const freePlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'FREE' } });

    await prisma.$transaction(async (tx) => {
      await tx.userSubscription.update({
        where: { id: sub.id },
        data: { autoRenew: false, status: 'CANCELLED' },
      });

      // Downgrade to Free
      if (freePlan && sub.planId !== freePlan.id) {
        await tx.userSubscription.create({
          data: {
            userId,
            planId: freePlan.id,
            status: 'ACTIVE',
            startsAt: new Date(),
          },
        });
      }
    });

    res.json({
      success: true,
      message: 'Subscription auto-renew cancelled. Switched to Free tier.',
    });
  } catch (error) {
    next(error);
  }
};
