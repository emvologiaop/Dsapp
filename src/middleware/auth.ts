import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
    }
  }
}

/**
 * Simple authentication middleware
 * Checks if userId is provided in request body or query
 * In a production app, this would verify a JWT token
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been banned', reason: user.banReason });
    }

    req.userId = userId;
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Authorization middleware to check if user is admin
 * Must be used after authenticate middleware
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(403).json({ error: 'Authorization failed' });
  }
}
