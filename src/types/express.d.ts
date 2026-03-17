import type { IPost } from '../models/Post';
import type { IReel } from '../models/Reel';
import type { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
      post?: IPost;
      reel?: IReel;
    }
  }
}

export {};
