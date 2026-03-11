import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Reel } from '../models/Reel.js';
import { isValidObjectId } from '../utils/validation.js';

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
 *
 * @remarks
 * In a production app, this would verify a JWT token instead of accepting userId directly.
 * This is a simplified implementation for demonstration purposes.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 *
 * @returns 401 if authentication fails, otherwise calls next()
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate ObjectId format to prevent injection attacks
    if (!isValidObjectId(userId as string)) {
      return res.status(401).json({ error: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been banned', reason: user.banReason });
    }

    req.userId = userId as string;
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
 *
 * @param req - Express request object (must have user set by authenticate)
 * @param res - Express response object
 * @param next - Express next function
 *
 * @returns 403 if user is not admin, otherwise calls next()
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
 *
 * @param req - Express request object (must have user set by authenticate, postId in params)
 * @param res - Express response object
 * @param next - Express next function
 *
 * @returns 403 if user doesn't own the post, 404 if post not found, otherwise calls next()
 */
export async function requirePostOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { postId } = req.params;

    // Validate postId format
    if (!isValidObjectId(postId)) {
      return res.status(400).json({ error: 'Invalid post ID format' });
    }

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
 *
 * @param req - Express request object (must have user set by authenticate, reelId in params)
 * @param res - Express response object
 * @param next - Express next function
 *
 * @returns 403 if user doesn't own the reel, 404 if reel not found, otherwise calls next()
 */
export async function requireReelOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { reelId } = req.params;

    // Validate reelId format
    if (!isValidObjectId(reelId)) {
      return res.status(400).json({ error: 'Invalid reel ID format' });
    }

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
