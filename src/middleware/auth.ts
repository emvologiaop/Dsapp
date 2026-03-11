import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Reel } from '../models/Reel.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
      post?: any;
      reel?: any;
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

/**
 * Authorization middleware to check if user owns a post
 * Must be used after authenticate middleware
 */
export async function requirePostOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You do not have permission to modify this post' });
    }

    req.post = post;
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(403).json({ error: 'Authorization failed' });
  }
}

/**
 * Authorization middleware to check if user owns a reel
 * Must be used after authenticate middleware
 */
export async function requireReelOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { reelId } = req.params;
    const reel = await Reel.findById(reelId);

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    if (reel.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You do not have permission to modify this reel' });
    }

    req.reel = reel;
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(403).json({ error: 'Authorization failed' });
  }
}
