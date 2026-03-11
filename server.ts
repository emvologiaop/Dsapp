import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import crypto from 'crypto';
import { connectDB } from './src/db.js';
import { initBot } from './bot/index.js';
import { User } from './src/models/User.js';
import { Post } from './src/models/Post.js';
import { Message } from './src/models/Message.js';
import { Notification } from './src/models/Notification.js';
import { Share } from './src/models/Share.js';
import { Comment } from './src/models/Comment.js';
import { Reel } from './src/models/Reel.js';
import { VideoView } from './src/models/VideoView.js';
import { uploadVideo, uploadImage, uploadMultipleImages } from './src/middleware/upload.js';
import { processVideo, processImage } from './src/services/videoProcessor.js';
import { uploadToR2, generateUniqueFilename } from './src/services/r2Storage.js';
import { getPersonalizedReels, getTrendingReels } from './src/services/recommendationService.js';
import { authenticate, requireAdmin } from './src/middleware/auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.APP_URL
  ? [process.env.APP_URL]
  : ['http://localhost:3000', 'http://localhost:5173'];

const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins },
});

const PORT = process.env.PORT || 3000;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));
// Use higher limit only for upload endpoints
app.use('/api/posts', express.json({ limit: '50mb' }));
app.use('/api/reels', express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

connectDB().catch(console.error);
initBot(io);

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return resolve(false);
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derivedKey));
    });
  });
}

// ── Socket.IO ─────────────────────────────────────────────────────────────────
// Track online users
const onlineUsers = new Map<string, string>(); // userId -> socketId

io.on('connection', (socket) => {
  socket.on('join_chat', (userId: string) => {
    socket.join(`user_${userId}`);
    onlineUsers.set(userId, socket.id);
    // Broadcast user online status
    io.emit('user_status', { userId, status: 'online' });
  });

  socket.on('disconnect', () => {
    // Find and remove user from online users
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user_status', { userId, status: 'offline' });
        break;
      }
    }
  });

  // Typing indicator
  socket.on('typing', (data: { senderId: string; receiverId: string; isTyping: boolean }) => {
    io.to(`user_${data.receiverId}`).emit('user_typing', {
      userId: data.senderId,
      isTyping: data.isTyping
    });
  });

  socket.on('send_private_message', async (data: { senderId: string; receiverId: string; text: string; imageUrl?: string; replyToId?: string }) => {
    try {
      const message = await Message.create({
        senderId: data.senderId,
        receiverId: data.receiverId,
        text: data.text,
        imageUrl: data.imageUrl,
        replyToId: data.replyToId,
        status: 'sent',
      });

      const populatedMessage = await Message.findById(message._id)
        .populate('replyToId', 'text senderId')
        .lean();

      // Send to receiver
      io.to(`user_${data.receiverId}`).emit('receive_private_message', populatedMessage);

      // Send back to sender with delivered status
      io.to(`user_${data.senderId}`).emit('message_status', {
        messageId: message._id.toString(),
        status: 'delivered'
      });

      // Update status to delivered
      await Message.findByIdAndUpdate(message._id, { status: 'delivered' });

      const sender = await User.findById(data.senderId).lean();
      if (sender) {
        const notification = await Notification.create({
          userId: data.receiverId,
          type: 'message',
          content: `${sender.name} sent you a message`,
          relatedUserId: data.senderId,
        });
        io.to(`user_${data.receiverId}`).emit('new_notification', { ...notification.toObject(), id: notification._id.toString() });
      }
    } catch (error) {
      console.error('Socket send_private_message error:', error);
    }
  });

  // Message read receipt
  socket.on('message_read', async (data: { messageIds: string[]; userId: string }) => {
    try {
      await Message.updateMany(
        { _id: { $in: data.messageIds }, receiverId: data.userId },
        { isRead: true, readAt: new Date(), status: 'seen' }
      );

      // Notify sender(s) about read status
      const messages = await Message.find({ _id: { $in: data.messageIds } }).lean();
      messages.forEach(msg => {
        io.to(`user_${msg.senderId}`).emit('message_status', {
          messageId: msg._id.toString(),
          status: 'seen',
          readAt: new Date()
        });
      });
    } catch (error) {
      console.error('Socket message_read error:', error);
    }
  });

  // Add reaction to message
  socket.on('add_reaction', async (data: { messageId: string; userId: string; emoji: string }) => {
    try {
      const message = await Message.findById(data.messageId);
      if (!message) return;

      // Remove existing reaction from this user
      message.reactions = message.reactions.filter(
        (r: any) => r.userId.toString() !== data.userId
      );

      // Add new reaction
      message.reactions.push({
        userId: data.userId as any,
        emoji: data.emoji,
        createdAt: new Date()
      });

      await message.save();

      const updatedMessage = await Message.findById(data.messageId).lean();

      // Notify both users
      io.to(`user_${message.senderId}`).emit('message_reaction', updatedMessage);
      io.to(`user_${message.receiverId}`).emit('message_reaction', updatedMessage);
    } catch (error) {
      console.error('Socket add_reaction error:', error);
    }
  });

  // Remove reaction from message
  socket.on('remove_reaction', async (data: { messageId: string; userId: string }) => {
    try {
      const message = await Message.findById(data.messageId);
      if (!message) return;

      message.reactions = message.reactions.filter(
        (r: any) => r.userId.toString() !== data.userId
      );

      await message.save();

      const updatedMessage = await Message.findById(data.messageId).lean();

      // Notify both users
      io.to(`user_${message.senderId}`).emit('message_reaction', updatedMessage);
      io.to(`user_${message.receiverId}`).emit('message_reaction', updatedMessage);
    } catch (error) {
      console.error('Socket remove_reaction error:', error);
    }
  });

  // Delete/unsend message
  socket.on('delete_message', async (data: { messageId: string; userId: string }) => {
    try {
      const message = await Message.findById(data.messageId);
      if (!message || message.senderId.toString() !== data.userId) return;

      message.deletedAt = new Date();
      message.deletedBy = data.userId as any;
      await message.save();

      // Notify both users
      io.to(`user_${message.senderId}`).emit('message_deleted', { messageId: data.messageId });
      io.to(`user_${message.receiverId}`).emit('message_deleted', { messageId: data.messageId });
    } catch (error) {
      console.error('Socket delete_message error:', error);
    }
  });
});

// ── Auth Routes ────────────────────────────────────────────────────────────────

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, username, email, password, age, gender, department } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'Name, username, email and password are required' });
    }
    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (existing) {
      return res.status(409).json({ error: 'Email or username already in use' });
    }
    const telegramAuthCode = crypto.randomInt(100000, 1000000).toString();
    const user = await User.create({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: await hashPassword(password),
      age: age ? Number(age) : undefined,
      gender,
      department,
      telegramAuthCode,
    });
    res.status(201).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        department: user.department,
        telegramAuthCode: user.telegramAuthCode,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        department: user.department,
        telegramAuthCode: user.telegramAuthCode,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/verify-telegram/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const user = await User.findOne({ telegramAuthCode: code });
    res.json({ verified: !!(user && user.telegramChatId) });
  } catch (error) {
    console.error('GET /api/auth/verify-telegram error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── Post Routes ────────────────────────────────────────────────────────────────

app.get('/api/posts', async (req, res) => {
  try {
    const { userId } = req.query;
    const posts = await Post.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'name username avatarUrl')
      .lean();

    let followingSet = new Set<string>();
    if (userId) {
      const currentUser = await User.findById(userId).lean();
      if (currentUser) {
        followingSet = new Set(currentUser.followingIds.map((id) => id.toString()));
      }
    }

    const enriched = posts.map((post: any) => ({
      ...post,
      likesCount: post.likedBy.length,
      isLiked: userId ? post.likedBy.some((id: any) => id.toString() === userId.toString()) : false,
      isBookmarked: userId ? post.bookmarkedBy.some((id: any) => id.toString() === userId.toString()) : false,
      isFollowing: post.userId ? followingSet.has(post.userId._id.toString()) : false,
    }));

    res.json(enriched);
  } catch (error) {
    console.error('GET /api/posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { userId, content, isAnonymous, mediaUrl, mediaUrls } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ error: 'userId and content are required' });
    }
    const post = await Post.create({
      userId,
      content,
      isAnonymous: Boolean(isAnonymous),
      mediaUrl,
      mediaUrls: mediaUrls || []
    });
    const populated = await Post.findById(post._id).populate('userId', 'name username avatarUrl').lean();
    res.status(201).json(populated);
  } catch (error) {
    console.error('POST /api/posts error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    const post = await Post.findByIdAndUpdate(postId, { $addToSet: { likedBy: userId } }, { new: true }).populate('userId', 'name');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (!post.isAnonymous && post.userId && (post.userId as any)._id.toString() !== userId) {
      const liker = await User.findById(userId).lean();
      if (liker) {
        const notification = await Notification.create({
          userId: (post.userId as any)._id,
          type: 'like',
          content: `${liker.name} liked your post`,
          relatedUserId: userId,
          relatedPostId: postId,
        });
        io.to(`user_${(post.userId as any)._id.toString()}`).emit('new_notification', { ...notification.toObject(), id: notification._id.toString() });
      }
    }
    res.json({ postId, userId, liked: true, likesCount: post.likedBy.length });
  } catch (error) {
    console.error('POST /api/posts/:postId/like error:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

app.delete('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    const post = await Post.findByIdAndUpdate(postId, { $pull: { likedBy: userId } }, { new: true });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ postId, userId, liked: false, likesCount: post.likedBy.length });
  } catch (error) {
    console.error('DELETE /api/posts/:postId/like error:', error);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
});

app.post('/api/posts/:postId/bookmark', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    await Post.findByIdAndUpdate(postId, { $addToSet: { bookmarkedBy: userId } });
    res.json({ postId, userId, bookmarked: true });
  } catch (error) {
    console.error('POST /api/posts/:postId/bookmark error:', error);
    res.status(500).json({ error: 'Failed to bookmark post' });
  }
});

app.delete('/api/posts/:postId/bookmark', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    await Post.findByIdAndUpdate(postId, { $pull: { bookmarkedBy: userId } });
    res.json({ postId, userId, bookmarked: false });
  } catch (error) {
    console.error('DELETE /api/posts/:postId/bookmark error:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

app.post('/api/posts/:postId/share', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, receiverIds } = req.body;
    if (!Array.isArray(receiverIds) || receiverIds.length === 0) {
      return res.status(400).json({ error: 'receiverIds is required' });
    }
    const sender = await User.findById(userId).lean();
    if (!sender) return res.status(404).json({ error: 'User not found' });

    const shares = receiverIds.map((receiverId: string) => ({ postId, senderId: userId, receiverId }));
    await Share.insertMany(shares);
    await Post.findByIdAndUpdate(postId, { $inc: { sharesCount: receiverIds.length } });

    for (const receiverId of receiverIds) {
      const notification = await Notification.create({
        userId: receiverId,
        type: 'share',
        content: `${sender.name} shared a post with you`,
        relatedUserId: userId,
        relatedPostId: postId,
      });
      io.to(`user_${receiverId}`).emit('new_notification', { ...notification.toObject(), id: notification._id.toString() });
    }
    res.json({ postId, userId, receiverIds, shared: true });
  } catch (error) {
    console.error('POST /api/posts/:postId/share error:', error);
    res.status(500).json({ error: 'Failed to share post' });
  }
});

app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ postId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name username avatarUrl')
      .lean();
    res.json(comments);
  } catch (error) {
    console.error('GET /api/posts/:postId/comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, content, isAnonymous } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ error: 'userId and content are required' });
    }
    const comment = await Comment.create({ postId, userId, content, isAnonymous: Boolean(isAnonymous) });
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    const populated = await Comment.findById(comment._id).populate('userId', 'name username avatarUrl').lean();

    const post = await Post.findById(postId).lean();
    if (post && !post.isAnonymous && post.userId.toString() !== userId) {
      const commenter = await User.findById(userId).lean();
      if (commenter) {
        const notification = await Notification.create({
          userId: post.userId,
          type: 'comment',
          content: `${commenter.name} commented on your post`,
          relatedUserId: userId,
          relatedPostId: postId,
        });
        io.to(`user_${post.userId.toString()}`).emit('new_notification', { ...notification.toObject(), id: notification._id.toString() });
      }
    }
    res.status(201).json(populated);
  } catch (error) {
    console.error('POST /api/posts/:postId/comments error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ── User Routes ────────────────────────────────────────────────────────────────

app.post('/api/users/:targetId/follow', async (req, res) => {
  try {
    const { targetId } = req.params;
    const { userId } = req.body;
    if (userId === targetId) return res.status(400).json({ error: 'Cannot follow yourself' });

    await User.findByIdAndUpdate(userId, { $addToSet: { followingIds: targetId } });
    await User.findByIdAndUpdate(targetId, { $addToSet: { followerIds: userId } });

    const follower = await User.findById(userId).lean();
    if (follower) {
      const notification = await Notification.create({
        userId: targetId,
        type: 'follow',
        content: `${follower.name} started following you`,
        relatedUserId: userId,
      });
      io.to(`user_${targetId}`).emit('new_notification', { ...notification.toObject(), id: notification._id.toString() });
    }
    res.json({ userId, targetId, following: true });
  } catch (error) {
    console.error('POST /api/users/:targetId/follow error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

app.delete('/api/users/:targetId/follow', async (req, res) => {
  try {
    const { targetId } = req.params;
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { $pull: { followingIds: targetId } });
    await User.findByIdAndUpdate(targetId, { $pull: { followerIds: userId } });
    res.json({ userId, targetId, following: false });
  } catch (error) {
    console.error('DELETE /api/users/:targetId/follow error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

app.get('/api/users/:userId/mutuals', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const followingSet = new Set(user.followingIds.map((id) => id.toString()));
    const mutualIds = user.followerIds.filter((id) => followingSet.has(id.toString()));
    const mutuals = await User.find({ _id: { $in: mutualIds } }).select('name username avatarUrl').lean();

    res.json(mutuals.map((u) => ({ id: u._id.toString(), name: u.name, username: u.username, avatarUrl: u.avatarUrl || '' })));
  } catch (error) {
    console.error('GET /api/users/:userId/mutuals error:', error);
    res.status(500).json({ error: 'Failed to fetch mutuals' });
  }
});

app.get('/api/users/:userId/inbox', async (req, res) => {
  try {
    const { userId } = req.params;
    const shares = await Share.find({ receiverId: userId })
      .sort({ createdAt: -1 })
      .populate('senderId', 'name username avatarUrl')
      .populate({ path: 'postId', populate: { path: 'userId', select: 'name username avatarUrl' } })
      .lean();

    const result = shares.map((share: any) => ({
      shareId: share._id.toString(),
      sender: {
        id: share.senderId._id.toString(),
        name: share.senderId.name,
        username: share.senderId.username,
        avatarUrl: share.senderId.avatarUrl || '',
      },
      post: {
        ...share.postId,
        likesCount: share.postId.likedBy?.length || 0,
        commentsCount: share.postId.commentsCount || 0,
        sharesCount: share.postId.sharesCount || 0,
        isLiked: share.postId.likedBy?.some((id: any) => id.toString() === userId) || false,
        isBookmarked: share.postId.bookmarkedBy?.some((id: any) => id.toString() === userId) || false,
      },
    }));
    res.json(result);
  } catch (error) {
    console.error('GET /api/users/:userId/inbox error:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

app.get('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentUserId } = req.query;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isFollowing = currentUserId
      ? user.followerIds.some((id) => id.toString() === currentUserId.toString())
      : false;

    res.json({
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl || '',
      bio: user.bio || '',
      website: user.website || '',
      location: user.location || '',
      department: user.department || '',
      isVerified: user.isVerified || false,
      followersCount: user.followerIds.length,
      followingCount: user.followingIds.length,
      isFollowing,
    });
  } catch (error) {
    console.error('GET /api/users/:userId/profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, username, bio, website, location, department } = req.body;

    // Check if username is taken (if changed)
    if (username) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        username: username?.toLowerCase(),
        bio,
        website,
        location,
        department,
      },
      { new: true }
    ).lean();

    if (!updatedUser) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      username: updatedUser.username,
      avatarUrl: updatedUser.avatarUrl || '',
      bio: updatedUser.bio || '',
      website: updatedUser.website || '',
      location: updatedUser.location || '',
      department: updatedUser.department || '',
      isVerified: updatedUser.isVerified || false,
    });
  } catch (error) {
    console.error('PUT /api/users/:userId/profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/users/:userId/posts', async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ userId, isAnonymous: false })
      .sort({ createdAt: -1 })
      .populate('userId', 'name username avatarUrl')
      .lean();

    res.json(posts);
  } catch (error) {
    console.error('GET /api/users/:userId/posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.get('/api/users/:userId/reels', async (req, res) => {
  try {
    const { userId } = req.params;
    const reels = await Reel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(reels);
  } catch (error) {
    console.error('GET /api/users/:userId/reels error:', error);
    res.status(500).json({ error: 'Failed to fetch reels' });
  }
});

app.get('/api/users/:userId/chats', async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({ $or: [{ senderId: userId }, { receiverId: userId }] })
      .sort({ createdAt: -1 })
      .lean();

    // Collect last message per unique conversation partner (no N+1)
    const seen = new Map<string, { text: string; createdAt: Date }>();
    for (const msg of messages) {
      const otherId = msg.senderId.toString() === userId ? msg.receiverId.toString() : msg.senderId.toString();
      if (!seen.has(otherId)) {
        seen.set(otherId, { text: msg.text, createdAt: msg.createdAt });
      }
    }

    const uniqueUserIds = Array.from(seen.keys());
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select('name username avatarUrl').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const conversations = uniqueUserIds
      .map((otherId) => {
        const u = userMap.get(otherId);
        if (!u) return null;
        return {
          user: { id: otherId, name: u.name, username: u.username, avatarUrl: u.avatarUrl || '' },
          lastMessage: seen.get(otherId),
        };
      })
      .filter(Boolean);

    res.json(conversations);
  } catch (error) {
    console.error('GET /api/users/:userId/chats error:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// ── Message Routes ─────────────────────────────────────────────────────────────

app.get('/api/messages/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();
    res.json(messages);
  } catch (error) {
    console.error('GET /api/messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ── Notification Routes ────────────────────────────────────────────────────────

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
    res.json(notifications.map((n) => ({ ...n, id: n._id.toString() })));
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/notifications/:id/read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ── Telegram Webhook ───────────────────────────────────────────────────────────
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/telegram/webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ── Reels Routes ───────────────────────────────────────────────────────────────

app.get('/api/reels', async (req, res) => {
  try {
    const { userId, page = '0', trending = 'false' } = req.query;
    const offset = parseInt(page as string) * 30;

    let reels;

    if (trending === 'true' || !userId) {
      // Show trending content for new users or when explicitly requested
      reels = await getTrendingReels(30, offset);
    } else {
      // Show personalized recommendations
      try {
        reels = await getPersonalizedReels(userId as string, 30, offset);

        // Fallback to trending if personalization fails or returns empty
        if (reels.length === 0) {
          reels = await getTrendingReels(30, offset);
        }
      } catch (error) {
        console.error('Personalization error, falling back to trending:', error);
        reels = await getTrendingReels(30, offset);
      }
    }

    // Enrich with user-specific data
    const enriched = reels.map((reel: any) => ({
      ...reel,
      userId: reel.user ? { _id: reel.user._id, name: reel.user.name, username: reel.user.username, avatarUrl: reel.user.avatarUrl } : null,
      likesCount: reel.likedBy?.length || 0,
      isLiked: userId ? reel.likedBy?.some((id: any) => id.toString() === userId.toString()) : false,
    }));

    res.json(enriched);
  } catch (error) {
    console.error('GET /api/reels error:', error);
    res.status(500).json({ error: 'Failed to fetch reels' });
  }
});

app.post('/api/reels', async (req, res) => {
  try {
    const { userId, caption, videoData, isAnonymous } = req.body;
    if (!userId || !videoData) {
      return res.status(400).json({ error: 'userId and videoData are required' });
    }
    // Store base64 data URL as the video URL (suitable for moderate-size videos)
    const reel = await Reel.create({
      userId,
      videoUrl: videoData,
      caption: caption || '',
      isAnonymous: Boolean(isAnonymous),
    });
    const populated = await Reel.findById(reel._id).populate('userId', 'name username avatarUrl').lean();
    res.status(201).json(populated);
  } catch (error) {
    console.error('POST /api/reels error:', error);
    res.status(500).json({ error: 'Failed to create reel' });
  }
});

app.post('/api/reels/:reelId/like', async (req, res) => {
  try {
    const { reelId } = req.params;
    const { userId } = req.body;
    const reel = await Reel.findByIdAndUpdate(reelId, { $addToSet: { likedBy: userId } }, { new: true });
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    res.json({ reelId, userId, liked: true, likesCount: reel.likedBy.length });
  } catch (error) {
    console.error('POST /api/reels/:reelId/like error:', error);
    res.status(500).json({ error: 'Failed to like reel' });
  }
});

app.delete('/api/reels/:reelId/like', async (req, res) => {
  try {
    const { reelId } = req.params;
    const { userId } = req.body;
    const reel = await Reel.findByIdAndUpdate(reelId, { $pull: { likedBy: userId } }, { new: true });
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    res.json({ reelId, userId, liked: false, likesCount: reel.likedBy.length });
  } catch (error) {
    console.error('DELETE /api/reels/:reelId/like error:', error);
    res.status(500).json({ error: 'Failed to unlike reel' });
  }
});

app.get('/api/reels/:reelId/comments', async (req, res) => {
  try {
    const { reelId } = req.params;
    const comments = await Comment.find({ postId: reelId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name username avatarUrl')
      .lean();
    res.json(comments);
  } catch (error) {
    console.error('GET /api/reels/:reelId/comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/reels/:reelId/comments', async (req, res) => {
  try {
    const { reelId } = req.params;
    const { userId, text, isAnonymous } = req.body;
    if (!userId || !text) {
      return res.status(400).json({ error: 'userId and text are required' });
    }

    const comment = await Comment.create({
      postId: reelId,
      userId,
      content: text,
      isAnonymous: Boolean(isAnonymous),
    });

    await Reel.findByIdAndUpdate(reelId, { $inc: { commentsCount: 1 } });

    if (comment) {
      const populated = await Comment.findById(comment._id)
        .populate('userId', 'name username avatarUrl')
        .lean();

      res.status(201).json(populated);
    } else {
      res.status(500).json({ error: 'Failed to create comment' });
    }
  } catch (error) {
    console.error('POST /api/reels/:reelId/comments error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ── R2 Storage Endpoints ──────────────────────────────────────────────────────

// Upload video to R2 with processing (transcoding, thumbnail)
app.post('/api/reels/upload-r2', uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { userId, caption, isAnonymous } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Process video (transcode, generate thumbnail, upload to R2)
    const processedVideo = await processVideo(req.file.buffer, req.file.originalname);

    // Create reel with R2 URLs
    const reel = await Reel.create({
      userId,
      videoUrl: processedVideo.qualities[0]?.url || processedVideo.originalUrl, // Default to first quality
      videoQualities: processedVideo.qualities,
      thumbnailUrl: processedVideo.thumbnail,
      duration: processedVideo.duration,
      originalUrl: processedVideo.originalUrl,
      caption: caption || '',
      isAnonymous: Boolean(isAnonymous),
    });

    const populated = await Reel.findById(reel._id).populate('userId', 'name username avatarUrl').lean();
    res.status(201).json(populated);
  } catch (error) {
    console.error('POST /api/reels/upload-r2 error:', error);
    res.status(500).json({ error: 'Failed to upload video to R2' });
  }
});

// Upload image to R2
app.post('/api/images/upload-r2', uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageUrl = await processImage(req.file.buffer, req.file.originalname);
    res.status(200).json({ url: imageUrl });
  } catch (error) {
    console.error('POST /api/images/upload-r2 error:', error);
    res.status(500).json({ error: 'Failed to upload image to R2' });
  }
});

// Upload multiple images to R2
app.post('/api/images/upload-multiple-r2', uploadMultipleImages.array('images', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const uploadPromises = req.files.map(file =>
      processImage(file.buffer, file.originalname)
    );

    const imageUrls = await Promise.all(uploadPromises);
    res.status(200).json({ urls: imageUrls });
  } catch (error) {
    console.error('POST /api/images/upload-multiple-r2 error:', error);
    res.status(500).json({ error: 'Failed to upload images to R2' });
  }
});

// Stream video chunk from R2 (for chunked streaming)
app.get('/api/stream/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const range = req.headers.range;

    // In a real implementation, you would:
    // 1. Get video metadata from DB
    // 2. Fetch the appropriate quality version
    // 3. Stream the video with range support

    // For now, return a simple response
    res.status(501).json({
      error: 'Streaming endpoint not yet implemented',
      message: 'Videos should be accessed directly from R2 public URL with CDN'
    });
  } catch (error) {
    console.error('GET /api/stream/:videoId error:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

// Record video view
app.post('/api/reels/:reelId/view', async (req, res) => {
  try {
    const { reelId } = req.params;
    const { userId, watchDuration, totalDuration } = req.body;

    if (!userId || watchDuration === undefined || totalDuration === undefined) {
      return res.status(400).json({ error: 'userId, watchDuration, and totalDuration are required' });
    }

    const watchPercentage = (watchDuration / totalDuration) * 100;
    const completed = watchPercentage >= 80;

    // Check if view already exists (update if so)
    const existingView = await VideoView.findOne({ reelId, userId });

    if (existingView) {
      // Update if this is a longer watch duration
      if (watchDuration > existingView.watchDuration) {
        existingView.watchDuration = watchDuration;
        existingView.watchPercentage = watchPercentage;
        existingView.completed = completed;
        await existingView.save();
      }
    } else {
      // Create new view record
      await VideoView.create({
        reelId,
        userId,
        watchDuration,
        totalDuration,
        watchPercentage,
        completed,
      });
    }

    res.json({ success: true, completed });
  } catch (error) {
    console.error('POST /api/reels/:reelId/view error:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

app.post('/api/reels/:reelId/share', async (req, res) => {
  try {
    const { reelId } = req.params;
    const { userId, targetUserIds } = req.body;
    if (!userId || !targetUserIds || !Array.isArray(targetUserIds)) {
      return res.status(400).json({ error: 'userId and targetUserIds array are required' });
    }

    const reel = await Reel.findById(reelId).populate('userId', 'name username');
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    for (const targetUserId of targetUserIds) {
      await Share.create({
        senderId: userId,
        postId: reelId,
        receiverId: targetUserId,
      });

      const sender = await User.findById(userId).lean();
      if (sender) {
        const notification = await Notification.create({
          userId: targetUserId,
          type: 'share',
          content: `${sender.name} shared a reel with you`,
          relatedUserId: userId,
          relatedPostId: reelId,
        });
        io.to(`user_${targetUserId}`).emit('new_notification', {
          ...notification.toObject(),
          id: notification._id.toString(),
        });
      }
    }

    await Reel.findByIdAndUpdate(reelId, { $inc: { sharesCount: targetUserIds.length } });

    res.json({ success: true });
  } catch (error) {
    console.error('POST /api/reels/:reelId/share error:', error);
    res.status(500).json({ error: 'Failed to share reel' });
  }
});

// ── Admin Routes ───────────────────────────────────────────────────────────────

// Get all users (admin only)
app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const skip = (page - 1) * limit;

    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    } : {};

    const [users, total] = await Promise.all([
      User.find(searchQuery)
        .select('-password -telegramAuthCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(searchQuery)
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Ban user (admin only)
app.post('/api/admin/users/:userId/ban', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Ban reason is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot ban admin users' });
    }

    user.isBanned = true;
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;
    user.banReason = reason;
    await user.save();

    res.json({ success: true, user: { id: user._id, isBanned: user.isBanned } });
  } catch (error) {
    console.error('POST /api/admin/users/:userId/ban error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban user (admin only)
app.post('/api/admin/users/:userId/unban', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBanned = false;
    user.bannedAt = undefined;
    user.bannedBy = undefined;
    user.banReason = undefined;
    await user.save();

    res.json({ success: true, user: { id: user._id, isBanned: user.isBanned } });
  } catch (error) {
    console.error('POST /api/admin/users/:userId/unban error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Delete post (admin only)
app.delete('/api/admin/posts/:postId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = req.user._id;
    await post.save();

    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/posts/:postId error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Delete reel (admin only)
app.delete('/api/admin/reels/:reelId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { reelId } = req.params;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    reel.isDeleted = true;
    reel.deletedAt = new Date();
    reel.deletedBy = req.user._id;
    await reel.save();

    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/reels/:reelId error:', error);
    res.status(500).json({ error: 'Failed to delete reel' });
  }
});

// Get admin statistics
app.get('/api/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      bannedUsers,
      totalPosts,
      deletedPosts,
      totalReels,
      deletedReels,
      recentUsers,
      recentPosts
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBanned: true }),
      Post.countDocuments(),
      Post.countDocuments({ isDeleted: true }),
      Reel.countDocuments(),
      Reel.countDocuments({ isDeleted: true }),
      User.find().select('name username createdAt').sort({ createdAt: -1 }).limit(5),
      Post.find({ isDeleted: false }).populate('userId', 'name username').sort({ createdAt: -1 }).limit(5)
    ]);

    res.json({
      stats: {
        users: {
          total: totalUsers,
          banned: bannedUsers,
          active: totalUsers - bannedUsers
        },
        posts: {
          total: totalPosts,
          deleted: deletedPosts,
          active: totalPosts - deletedPosts
        },
        reels: {
          total: totalReels,
          deleted: deletedReels,
          active: totalReels - deletedReels
        }
      },
      recent: {
        users: recentUsers,
        posts: recentPosts
      }
    });
  } catch (error) {
    console.error('GET /api/admin/stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get all posts (admin only)
app.get('/api/admin/posts', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find()
        .populate('userId', 'name username avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments()
    ]);

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GET /api/admin/posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get all reels (admin only)
app.get('/api/admin/reels', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [reels, total] = await Promise.all([
      Reel.find()
        .populate('userId', 'name username avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Reel.countDocuments()
    ]);

    res.json({
      reels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GET /api/admin/reels error:', error);
    res.status(500).json({ error: 'Failed to fetch reels' });
  }
});

// Serve React app for all other routes (SPA fallback)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`DDU Social server running on http://localhost:${PORT}`);
});

export default app;
