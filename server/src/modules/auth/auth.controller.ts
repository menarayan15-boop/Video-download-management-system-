import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../../database/client.js';
import { CONFIG } from '../../config/constants.js';
import { AuthRequest } from '../../middleware/auth.js';
import { Role } from '@prisma/client';

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['USER', 'CREATOR']).optional().default('USER'),
  biography: z.string().optional(),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email.toLowerCase() },
          { username: data.username.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: existingUser.email === data.email.toLowerCase()
          ? 'Email is already registered'
          : 'Username is already taken',
        code: 'CONFLICT',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user and auto-assign active FREE subscription plan
    const freePlan = await prisma.subscriptionPlan.findUnique({
      where: { name: 'FREE' },
    });

    const user = await prisma.user.create({
      data: {
        username: data.username.toLowerCase(),
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role as Role,
        biography: data.biography || `Welcome to my Vyntra profile!`,
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${data.username}`,
        ...(freePlan ? {
          subscriptions: {
            create: {
              planId: freePlan.id,
              status: 'ACTIVE',
              startsAt: new Date(),
            },
          },
        } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatarUrl: true,
        biography: true,
        createdAt: true,
      },
    });

    const token = jwt.sign({ id: user.id, role: user.role }, CONFIG.JWT_SECRET, {
      expiresIn: CONFIG.JWT_EXPIRES_IN as any,
    });

    res.cookie('vyntra_token', token, {
      httpOnly: true,
      secure: CONFIG.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.emailOrUsername.toLowerCase() },
          { username: data.emailOrUsername.toLowerCase() },
        ],
      },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please verify your email/username and password.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please verify your email/username and password.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, CONFIG.JWT_SECRET, {
      expiresIn: CONFIG.JWT_EXPIRES_IN as any,
    });

    res.cookie('vyntra_token', token, {
      httpOnly: true,
      secure: CONFIG.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { passwordHash, subscriptions, ...userData } = user;
    const activeSubscription = subscriptions[0] || null;

    res.json({
      success: true,
      data: {
        user: userData,
        subscription: activeSubscription,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('vyntra_token');
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            followers: true,
            following: true,
            videos: true,
            savedVideos: true,
            downloadOperations: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    const { passwordHash, subscriptions, ...safeUser } = user;
    const activeSubscription = subscriptions[0] || null;

    res.json({
      success: true,
      data: {
        user: safeUser,
        subscription: activeSubscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      // Return safe message without exposing whether user exists
      res.json({
        success: true,
        message: 'If the email exists in our system, password reset instructions have been sent.',
      });
      return;
    }

    // Generate a reset token
    const resetToken = jwt.sign({ id: user.id, purpose: 'pwd_reset' }, CONFIG.JWT_SECRET, {
      expiresIn: '1h',
    });

    // In production this sends via SMTP/SendGrid. For development we return reset token reference
    res.json({
      success: true,
      message: 'Password reset link generated.',
      data: {
        resetToken,
        resetUrl: `${CONFIG.FRONTEND_URL}/reset-password?token=${resetToken}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const decoded = jwt.verify(data.token, CONFIG.JWT_SECRET) as { id: string; purpose?: string };

    if (decoded.purpose !== 'pwd_reset') {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired password reset token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    const newHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: decoded.id },
      data: { passwordHash: newHash },
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You may now log in.',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid or expired reset token',
      code: 'INVALID_TOKEN',
    });
  }
};
