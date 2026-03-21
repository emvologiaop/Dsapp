import type { NextFunction, Response } from 'express';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { extractBearerToken, verifyAuthToken } from '../utils/authToken.js';

type RequestWithEntities = any;

function getActorId(req: RequestWithEntities): string | undefined {
  const authHeader = req.headers?.authorization as string | undefined;
  const token = extractBearerToken(authHeader);
  if (token) {
    const payload = verifyAuthToken(token);
    if (payload?.userId) {
      return payload.userId;
    }
  }
  return req.body?.userId || req.params?.userId || req.query?.userId;
}

export async function authenticate(req: RequestWithEntities, res: Response, next: NextFunction) {
  try {
    const userId = getActorId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: RequestWithEntities, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export async function requirePostOwnership(req: RequestWithEntities, res: Response, next: NextFunction) {
  const post = await Post.findById(req.params.postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  if (!req.user || post.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'You do not own this post' });
  }
  req.post = post;
  next();
}
