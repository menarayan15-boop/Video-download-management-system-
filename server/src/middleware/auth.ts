import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/constants.js';
import prisma from '../database/client.js';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.vyntra_token) {
      token = req.cookies.vyntra_token;
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as { id: string; role: Role };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true, role: true },
    });

    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    // If token invalid, proceed without authenticated user
    next();
  }
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to continue.',
      code: 'UNAUTHORIZED',
    });
    return;
  }
  next();
};

export const requireRole = (roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient privileges for this action',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
};
