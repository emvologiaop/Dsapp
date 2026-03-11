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
import { Ad } from './src/models/Ad.js';
import { Report } from './src/models/Report.js';
import { Story } from './src/models/Story.js';
import { SystemSettings } from './src/models/SystemSettings.js';
import { uploadVideo, uploadImage, uploadMultipleImages } from './src/middleware/upload.js';
import { processVideo, processImage } from './src/services/videoProcessor.js';
import { uploadToR2, generateUniqueFilename } from './src/services/r2Storage.js';
import { getPersonalizedReels, getTrendingReels } from './src/services/recommendationService.js';
import { authenticate, requireAdmin, requirePostOwnership, requireReelOwnership } from './src/middleware/auth.js';

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
  skip: (req) => req.path === '/api/telegram/webhook',
});
app.use(limiter);

// Ensure MongoDB connection is ready before handling API requests
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error('Database connection failed:', errorMessage);

    // Provide more helpful error response based on the error type
    const response: any = {
      error: 'Service temporarily unavailable. Please try again shortly.',
    };

    // In development, include more details
    if (process.env.NODE_ENV !== 'production') {
      response.details = errorMessage;
      response.hint = 'Check VERCEL_MONGODB_SETUP.md for MongoDB Atlas configuration';
    }

    // Add specific hints for known issues
    if (errorMessage.includes('whitelist') || errorMessage.includes('IP')) {
      response.hint = 'MongoDB Atlas IP whitelist issue. Check Network Access settings.';
    }

    res.status(503).json(response);
  }
});

const bot = initBot(io);
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

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
      .select('userId content mediaUrl mediaUrls likedBy bookmarkedBy commentsCount sharesCount createdAt isAnonymous taggedUsers')
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
    const { userId, content, isAnonymous, mediaUrl, mediaUrls, taggedUsers } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ error: 'userId and content are required' });
    }

    // Extract mentions from content
    const mentions = extractMentions(content);

    const post = await Post.create({
      userId,
      content,
      isAnonymous: Boolean(isAnonymous),
      mediaUrl,
      mediaUrls: mediaUrls || [],
      taggedUsers: taggedUsers || [],
      mentions
    });

    // Send mention notifications
    if (mentions.length > 0 && !isAnonymous) {
      await sendMentionNotifications(userId, mentions, 'post', post._id.toString());
    }

    // Send tag notifications to tagged users
    if (taggedUsers && taggedUsers.length > 0 && !isAnonymous) {
      const tagger = await User.findById(userId).lean();
      if (tagger) {
        const filteredTaggedUsers = taggedUsers.filter((id: string) => id !== userId);
        if (filteredTaggedUsers.length > 0) {
          const tagNotifications = filteredTaggedUsers.map((taggedUserId: string) => ({
            userId: taggedUserId,
            type: 'tag',
            content: `${tagger.name} tagged you in a post`,
            relatedUserId: userId,
            relatedPostId: post._id,
          }));
          const createdTagNotifications = await Notification.insertMany(tagNotifications);
          createdTagNotifications.forEach((notif, idx) => {
            io.to(`user_${filteredTaggedUsers[idx]}`).emit('new_notification', {
              ...notif.toObject(),
              id: notif._id.toString(),
            });
          });
        }
      }
    }

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

    const shareNotifications = receiverIds.map((receiverId: string) => ({
      userId: receiverId,
      type: 'share',
      content: `${sender.name} shared a post with you`,
      relatedUserId: userId,
      relatedPostId: postId,
    }));
    const createdShareNotifications = await Notification.insertMany(shareNotifications);
    createdShareNotifications.forEach((notif, idx) => {
      io.to(`user_${receiverIds[idx]}`).emit('new_notification', { ...notif.toObject(), id: notif._id.toString() });
    });
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
      .limit(100)
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

// ── Comment Replies Routes ────────────────────────────────────────────────────

// Get replies to a specific comment
app.get('/api/comments/:commentId/replies', async (req, res) => {
  try {
    const { commentId } = req.params;
    const replies = await Comment.find({ parentCommentId: commentId })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('userId', 'name username avatarUrl')
      .lean();
    res.json(replies);
  } catch (error) {
    console.error('GET /api/comments/:commentId/replies error:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// Post a reply to a comment
app.post('/api/comments/:commentId/reply', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId, content, isAnonymous } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ error: 'userId and content are required' });
    }

    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ error: 'Parent comment not found' });
    }

    const reply = await Comment.create({
      postId: parentComment.postId,
      userId,
      content,
      isAnonymous: Boolean(isAnonymous),
      parentCommentId: commentId
    });

    // Increment reply count on parent comment
    await Comment.findByIdAndUpdate(commentId, { $inc: { replyCount: 1 } });

    const populated = await Comment.findById(reply._id)
      .populate('userId', 'name username avatarUrl')
      .lean();

    // Create notification for parent comment author
    if (parentComment.userId.toString() !== userId) {
      const replier = await User.findById(userId).lean();
      if (replier) {
        const notification = await Notification.create({
          userId: parentComment.userId,
          type: 'comment',
          content: `${replier.name} replied to your comment`,
          relatedUserId: userId,
          relatedPostId: parentComment.postId,
        });
        io.to(`user_${parentComment.userId.toString()}`).emit('new_notification', {
          ...notification.toObject(),
          id: notification._id.toString()
        });
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error('POST /api/comments/:commentId/reply error:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// ── Report Routes ──────────────────────────────────────────────────────────────

// Create a report (post, user, bug, or suggestion)
app.post('/api/reports', async (req, res) => {
  try {
    const { reporterId, type, targetId, reason, description } = req.body;
    if (!reporterId || !type || !reason) {
      return res.status(400).json({ error: 'reporterId, type, and reason are required' });
    }

    const report = await Report.create({
      reporterId,
      type,
      targetId,
      reason,
      description
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('POST /api/reports error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Get reports for a user (their own reports)
app.get('/api/reports/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const reports = await Report.find({ reporterId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(reports);
  } catch (error) {
    console.error('GET /api/reports/:userId error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Update Telegram notification preference
app.put('/api/users/:userId/telegram-notifications', async (req, res) => {
  try {
    const { userId } = req.params;
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { telegramNotificationsEnabled: enabled },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ telegramNotificationsEnabled: user.telegramNotificationsEnabled });
  } catch (error) {
    console.error('PUT /api/users/:userId/telegram-notifications error:', error);
    res.status(500).json({ error: 'Failed to update notification preference' });
  }
});

// User delete own post
app.delete('/api/posts/:postId', authenticate, requirePostOwnership, async (req, res) => {
  try {
    req.post.isDeleted = true;
    req.post.deletedAt = new Date();
    req.post.deletedBy = req.user._id;
    await req.post.save();

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/posts/:postId error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// User edit own post
app.put('/api/posts/:postId', authenticate, requirePostOwnership, async (req, res) => {
  try {
    const { content, mediaUrls } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    req.post.content = content;
    if (mediaUrls !== undefined) {
      req.post.mediaUrls = mediaUrls;
    }
    req.post.updatedAt = new Date();
    await req.post.save();

    const populated = await Post.findById(req.post._id)
      .populate('userId', 'name username avatarUrl')
      .lean();

    res.json(populated);
  } catch (error) {
    console.error('PUT /api/posts/:postId error:', error);
    res.status(500).json({ error: 'Failed to update post' });
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
      .populate({
        path: 'postId',
        select: 'content mediaUrl mediaUrls likedBy bookmarkedBy commentsCount sharesCount createdAt userId isAnonymous',
        populate: { path: 'userId', select: 'name username avatarUrl' },
      })
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({ userId, isAnonymous: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name username avatarUrl')
        .lean(),
      Post.countDocuments({ userId, isAnonymous: false }),
    ]);

    res.json({ posts, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('GET /api/users/:userId/posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.get('/api/users/:userId/reels', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [reels, total] = await Promise.all([
      Reel.find({ userId, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reel.countDocuments({ userId, isDeleted: { $ne: true } }),
    ]);

    res.json({ reels, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('GET /api/users/:userId/reels error:', error);
    res.status(500).json({ error: 'Failed to fetch reels' });
  }
});

app.get('/api/users/:userId/chats', async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({ $or: [{ senderId: userId }, { receiverId: userId }] })
      .select('senderId receiverId text createdAt')
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
        const u = userMap.get(otherId) as any;
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
      .select('text senderId receiverId createdAt status isRead reactions')
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
    if (!bot) {
      return res.status(503).json({ error: 'Telegram bot not initialized' });
    }

    if (TELEGRAM_WEBHOOK_SECRET) {
      const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
      const secretMatches = Array.isArray(headerSecret)
        ? headerSecret.includes(TELEGRAM_WEBHOOK_SECRET)
        : headerSecret === TELEGRAM_WEBHOOK_SECRET;

      if (!secretMatches) {
        return res.status(401).json({ error: 'Invalid webhook secret' });
      }
    }

    bot.processUpdate(req.body);
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
    const { userId, caption, videoData, isAnonymous, taggedUsers } = req.body;
    if (!userId || !videoData) {
      return res.status(400).json({ error: 'userId and videoData are required' });
    }

    // Extract mentions from caption
    const mentions = caption ? extractMentions(caption) : [];

    // Store base64 data URL as the video URL (suitable for moderate-size videos)
    const reel = await Reel.create({
      userId,
      videoUrl: videoData,
      caption: caption || '',
      isAnonymous: Boolean(isAnonymous),
      taggedUsers: taggedUsers || [],
      mentions
    });

    // Send mention notifications
    if (mentions.length > 0 && !isAnonymous) {
      await sendMentionNotifications(userId, mentions, 'reel', reel._id.toString());
    }

    // Send tag notifications to tagged users
    if (taggedUsers && taggedUsers.length > 0 && !isAnonymous) {
      const tagger = await User.findById(userId).lean();
      if (tagger) {
        const filteredTaggedUsers = taggedUsers.filter((id: string) => id !== userId);
        if (filteredTaggedUsers.length > 0) {
          const reelTagNotifications = filteredTaggedUsers.map((taggedUserId: string) => ({
            userId: taggedUserId,
            type: 'tag',
            content: `${tagger.name} tagged you in a reel`,
            relatedUserId: userId,
            relatedPostId: reel._id,
          }));
          const createdReelTagNotifications = await Notification.insertMany(reelTagNotifications);
          createdReelTagNotifications.forEach((notif, idx) => {
            io.to(`user_${filteredTaggedUsers[idx]}`).emit('new_notification', {
              ...notif.toObject(),
              id: notif._id.toString(),
            });
          });
        }
      }
    }

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
      .limit(100)
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

    // Fetch sender once outside the loop
    const sender = await User.findById(userId).lean();

    // Bulk create shares
    const reelShares = targetUserIds.map((targetUserId: string) => ({
      senderId: userId,
      postId: reelId,
      receiverId: targetUserId,
    }));
    await Share.insertMany(reelShares);

    if (sender) {
      const reelShareNotifications = targetUserIds.map((targetUserId: string) => ({
        userId: targetUserId,
        type: 'share',
        content: `${sender.name} shared a reel with you`,
        relatedUserId: userId,
        relatedPostId: reelId,
      }));
      const createdReelShareNotifications = await Notification.insertMany(reelShareNotifications);
      createdReelShareNotifications.forEach((notif, idx) => {
        io.to(`user_${targetUserIds[idx]}`).emit('new_notification', {
          ...notif.toObject(),
          id: notif._id.toString(),
        });
      });
    }

    await Reel.findByIdAndUpdate(reelId, { $inc: { sharesCount: targetUserIds.length } });

    res.json({ success: true });
  } catch (error) {
    console.error('POST /api/reels/:reelId/share error:', error);
    res.status(500).json({ error: 'Failed to share reel' });
  }
});

// User delete own reel
app.delete('/api/reels/:reelId', authenticate, requireReelOwnership, async (req, res) => {
  try {
    req.reel.isDeleted = true;
    req.reel.deletedAt = new Date();
    req.reel.deletedBy = req.user._id;
    await req.reel.save();

    res.json({ success: true, message: 'Reel deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/reels/:reelId error:', error);
    res.status(500).json({ error: 'Failed to delete reel' });
  }
});

// User edit own reel
app.put('/api/reels/:reelId', authenticate, requireReelOwnership, async (req, res) => {
  try {
    const { caption } = req.body;

    req.reel.caption = caption || '';
    req.reel.updatedAt = new Date();
    await req.reel.save();

    const populated = await Reel.findById(req.reel._id)
      .populate('userId', 'name username avatarUrl')
      .lean();

    res.json(populated);
  } catch (error) {
    console.error('PUT /api/reels/:reelId error:', error);
    res.status(500).json({ error: 'Failed to update reel' });
  }
});

// ── Search Routes ──────────────────────────────────────────────────────────────

// Global search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { query, type = 'all', limit = 10 } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchRegex = { $regex: query, $options: 'i' };
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);

    const results: any = {
      users: [],
      posts: [],
      reels: [],
    };

    // Search users
    if (type === 'all' || type === 'users') {
      results.users = await User.find({
        $or: [
          { name: searchRegex },
          { username: searchRegex },
        ],
      })
        .select('name username avatarUrl bio')
        .limit(limitNum)
        .lean();
    }

    // Search posts
    if (type === 'all' || type === 'posts') {
      results.posts = await Post.find({
        content: searchRegex,
        isDeleted: { $ne: true },
      })
        .select('userId content mediaUrl mediaUrls likedBy bookmarkedBy commentsCount sharesCount createdAt isAnonymous')
        .populate('userId', 'name username avatarUrl')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .lean();
    }

    // Search reels
    if (type === 'all' || type === 'reels') {
      results.reels = await Reel.find({
        caption: searchRegex,
        isDeleted: { $ne: true },
      })
        .select('userId caption thumbnailUrl duration likedBy bookmarkedBy commentsCount sharesCount createdAt isAnonymous')
        .populate('userId', 'name username avatarUrl')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .lean();
    }

    res.json(results);
  } catch (error) {
    console.error('GET /api/search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ── Helper Functions ───────────────────────────────────────────────────────────

// Extract @mentions from text
function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1].toLowerCase());
  }
  return [...new Set(mentions)]; // Remove duplicates
}

// Send mention notifications
async function sendMentionNotifications(
  mentionerUserId: string,
  mentions: string[],
  contentType: 'post' | 'comment' | 'reel',
  contentId: string
) {
  try {
    // Find all mentioned users and the mentioner in parallel
    const [mentionedUsers, mentioner] = await Promise.all([
      User.find({ username: { $in: mentions } }).lean(),
      User.findById(mentionerUserId).lean(),
    ]);

    if (!mentioner) return;

    const usersToNotify = mentionedUsers.filter(
      (user) => user._id.toString() !== mentionerUserId
    );

    if (usersToNotify.length === 0) return;

    // Bulk create notifications instead of one per user
    const mentionNotifications = usersToNotify.map((user) => ({
      userId: user._id,
      type: 'mention',
      content: `${mentioner.name} mentioned you in a ${contentType}`,
      relatedUserId: mentionerUserId,
      relatedPostId: contentType !== 'comment' ? contentId : undefined,
    }));
    const createdMentionNotifications = await Notification.insertMany(mentionNotifications);

    // Emit real-time notifications
    createdMentionNotifications.forEach((notif, idx) => {
      io.to(`user_${usersToNotify[idx]._id.toString()}`).emit('new_notification', {
        ...notif.toObject(),
        id: notif._id.toString(),
      });
    });
  } catch (error) {
    console.error('Error sending mention notifications:', error);
  }
}

// ── Story Routes ───────────────────────────────────────────────────────────────

// Get active stories from followed users and own stories
app.get('/api/stories', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get stories from followed users + own stories
    const followedIds = [...user.followingIds, userId];
    const now = new Date();

    const stories = await Story.find({
      userId: { $in: followedIds },
      isActive: true,
      expiresAt: { $gt: now }
    })
      .populate('userId', 'name username avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    // Group stories by user
    const storiesByUser = stories.reduce((acc: any, story: any) => {
      const userId = story.userId._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: story.userId,
          stories: [],
          hasViewed: false
        };
      }
      acc[userId].stories.push(story);
      // Check if current user has viewed all stories from this user
      const hasViewedAll = acc[userId].stories.every((s: any) =>
        s.views.some((v: any) => v.toString() === userId)
      );
      acc[userId].hasViewed = hasViewedAll;
      return acc;
    }, {});

    res.json(Object.values(storiesByUser));
  } catch (error) {
    console.error('GET /api/stories error:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Create a new story
app.post('/api/stories', uploadImage.single('media'), async (req, res) => {
  try {
    const { userId, caption, mediaType, duration } = req.body;

    if (!userId || !req.file) {
      return res.status(400).json({ error: 'userId and media are required' });
    }

    // Process and upload the media
    let mediaUrl: string;
    let thumbnailUrl: string | undefined;

    if (mediaType === 'video') {
      // For videos, we'd need video processing logic similar to reels
      // For now, using a simplified approach
      const filename = generateUniqueFilename('story-video.mp4');
      mediaUrl = await uploadToR2(req.file.buffer, filename, 'video/mp4');
      // Generate thumbnail if needed
    } else {
      // Image
      const processed = await processImage(req.file.buffer);
      const filename = generateUniqueFilename('story.jpg');
      mediaUrl = await uploadToR2(processed, filename, 'image/jpeg');
    }

    // Stories expire after 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await Story.create({
      userId,
      mediaUrl,
      mediaType: mediaType || 'image',
      thumbnailUrl,
      caption,
      duration: mediaType === 'video' ? parseInt(duration) : undefined,
      expiresAt,
      views: [],
      isActive: true
    });

    const populated = await Story.findById(story._id)
      .populate('userId', 'name username avatarUrl')
      .lean();

    res.status(201).json(populated);
  } catch (error) {
    console.error('POST /api/stories error:', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// View a story (mark as viewed)
app.post('/api/stories/:storyId/view', async (req, res) => {
  try {
    const { storyId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Add user to views if not already viewed
    if (!story.views.includes(userId as any)) {
      story.views.push(userId as any);
      await story.save();

      // Send notification to story owner
      if (story.userId.toString() !== userId) {
        const viewer = await User.findById(userId).lean();
        if (viewer) {
          const notification = await Notification.create({
            userId: story.userId,
            type: 'story_view',
            content: `${viewer.name} viewed your story`,
            relatedUserId: userId,
            relatedStoryId: storyId
          });

          io.to(`user_${story.userId.toString()}`).emit('new_notification', {
            ...notification.toObject(),
            id: notification._id.toString()
          });
        }
      }
    }

    res.json({ success: true, viewCount: story.views.length });
  } catch (error) {
    console.error('POST /api/stories/:storyId/view error:', error);
    res.status(500).json({ error: 'Failed to mark story as viewed' });
  }
});

// Delete a story
app.delete('/api/stories/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;
    const { userId } = req.query;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Only owner can delete
    if (story.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this story' });
    }

    story.isActive = false;
    await story.save();

    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/stories/:storyId error:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// Get stories for a specific user
app.get('/api/stories/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();

    const stories = await Story.find({
      userId,
      isActive: true,
      expiresAt: { $gt: now }
    })
      .populate('userId', 'name username avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    res.json(stories);
  } catch (error) {
    console.error('GET /api/stories/user/:userId error:', error);
    res.status(500).json({ error: 'Failed to fetch user stories' });
  }
});

// ── Tag & Mention Routes ───────────────────────────────────────────────────────

// Get posts where user is tagged
app.get('/api/users/:userId/tagged', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const posts = await Post.find({
      taggedUsers: userId,
      isDeleted: false
    })
      .populate('userId', 'name username avatarUrl isVerified')
      .populate('taggedUsers', 'name username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const reels = await Reel.find({
      taggedUsers: userId,
      isDeleted: false
    })
      .populate('userId', 'name username avatarUrl isVerified')
      .populate('taggedUsers', 'name username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ posts, reels });
  } catch (error) {
    console.error('GET /api/users/:userId/tagged error:', error);
    res.status(500).json({ error: 'Failed to fetch tagged content' });
  }
});

// Search users for tagging/mentioning (autocomplete)
app.get('/api/users/search/mentions', async (req, res) => {
  try {
    const { query, currentUserId } = req.query;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query is required' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: currentUserId } // Exclude current user
    })
      .select('name username avatarUrl isVerified')
      .limit(10)
      .lean();

    res.json(users);
  } catch (error) {
    console.error('GET /api/users/search/mentions error:', error);
    res.status(500).json({ error: 'Failed to search users' });
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

// ==================== Admin Ad Management Endpoints ====================

// Get all ads (with pagination and filtering)
app.get('/api/admin/ads', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const filter: any = {};
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const ads = await Ad.find(filter)
      .populate('createdBy', 'name username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalAds = await Ad.countDocuments(filter);

    res.json({
      ads,
      totalPages: Math.ceil(totalAds / limit),
      currentPage: page,
      totalAds,
    });
  } catch (error) {
    console.error('GET /api/admin/ads error:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// Get a single ad by ID
app.get('/api/admin/ads/:adId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { adId } = req.params;
    const ad = await Ad.findById(adId).populate('createdBy', 'name username email');

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json(ad);
  } catch (error) {
    console.error('GET /api/admin/ads/:adId error:', error);
    res.status(500).json({ error: 'Failed to fetch ad' });
  }
});

// Create a new ad
app.post('/api/admin/ads', authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const { title, content, imageUrl, linkUrl, isActive, startDate, endDate, targetAudience } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const ad = await Ad.create({
      title,
      content,
      imageUrl,
      linkUrl,
      isActive: isActive !== undefined ? isActive : true,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      targetAudience: targetAudience || 'all',
      createdBy: userId,
    });

    const populatedAd = await Ad.findById(ad._id).populate('createdBy', 'name username email');

    res.status(201).json(populatedAd);
  } catch (error) {
    console.error('POST /api/admin/ads error:', error);
    res.status(500).json({ error: 'Failed to create ad' });
  }
});

// Update an ad
app.put('/api/admin/ads/:adId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { adId } = req.params;
    const { title, content, imageUrl, linkUrl, isActive, startDate, endDate, targetAudience } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;

    const ad = await Ad.findByIdAndUpdate(adId, updateData, { new: true })
      .populate('createdBy', 'name username email');

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json(ad);
  } catch (error) {
    console.error('PUT /api/admin/ads/:adId error:', error);
    res.status(500).json({ error: 'Failed to update ad' });
  }
});

// Delete an ad
app.delete('/api/admin/ads/:adId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { adId } = req.params;

    const ad = await Ad.findByIdAndDelete(adId);

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json({ message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/admin/ads/:adId error:', error);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

// Get ad statistics
app.get('/api/admin/ads/stats/summary', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalAds = await Ad.countDocuments();
    const activeAds = await Ad.countDocuments({ isActive: true });
    const inactiveAds = await Ad.countDocuments({ isActive: false });

    const adStats = await Ad.aggregate([
      {
        $group: {
          _id: null,
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
        }
      }
    ]);

    const stats = adStats[0] || { totalImpressions: 0, totalClicks: 0 };

    res.json({
      totalAds,
      activeAds,
      inactiveAds,
      totalImpressions: stats.totalImpressions,
      totalClicks: stats.totalClicks,
      clickThroughRate: stats.totalImpressions > 0
        ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2)
        : '0.00',
    });
  } catch (error) {
    console.error('GET /api/admin/ads/stats/summary error:', error);
    res.status(500).json({ error: 'Failed to fetch ad statistics' });
  }
});

// ── Badge & Verification Routes ───────────────────────────────────────────────

// Get maintenance status (public)
app.get('/api/system/maintenance', async (_req, res) => {
  try {
    const settings = await SystemSettings.findOne();
    res.json({
      maintenanceMode: settings?.maintenanceMode ?? false,
      maintenanceMessage: settings?.maintenanceMessage ?? 'We are performing scheduled maintenance. We will be back shortly!',
    });
  } catch (error) {
    console.error('GET /api/system/maintenance error:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance status' });
  }
});

// Get/set maintenance mode (admin only)
app.get('/api/admin/maintenance', authenticate, requireAdmin, async (_req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({ maintenanceMode: false, maintenanceMessage: 'We are performing scheduled maintenance. We will be back shortly!' });
    }
    res.json(settings);
  } catch (error) {
    console.error('GET /api/admin/maintenance error:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance settings' });
  }
});

app.post('/api/admin/maintenance', authenticate, requireAdmin, async (req, res) => {
  try {
    const { maintenanceMode, maintenanceMessage } = req.body;
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings({});
    }
    if (typeof maintenanceMode === 'boolean') settings.maintenanceMode = maintenanceMode;
    if (typeof maintenanceMessage === 'string' && maintenanceMessage.trim()) settings.maintenanceMessage = maintenanceMessage;
    settings.updatedBy = req.user._id;
    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error('POST /api/admin/maintenance error:', error);
    res.status(500).json({ error: 'Failed to update maintenance settings' });
  }
});

// Submit verification request (user)
app.post('/api/users/:targetUserId/verification-request', authenticate, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    if (req.userId !== targetUserId) {
      return res.status(403).json({ error: 'You can only submit a verification request for yourself' });
    }
    const { realName, photoUrl, note } = req.body;
    if (!realName || !realName.trim()) {
      return res.status(400).json({ error: 'Real name is required' });
    }
    if (!photoUrl || !photoUrl.trim()) {
      return res.status(400).json({ error: 'Photo URL is required for verification' });
    }

    const user = await User.findById(targetUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.verificationStatus === 'pending') {
      return res.status(400).json({ error: 'You already have a pending verification request' });
    }
    if (user.verificationStatus === 'approved') {
      return res.status(400).json({ error: 'Your account is already verified' });
    }

    user.verificationStatus = 'pending';
    user.verificationRealName = realName.trim();
    user.verificationPhotoUrl = photoUrl.trim();
    user.verificationNote = note?.trim() || '';
    user.verificationRequestedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'Verification request submitted. An admin will review it shortly.' });
  } catch (error) {
    console.error('POST /api/users/:userId/verification-request error:', error);
    res.status(500).json({ error: 'Failed to submit verification request' });
  }
});

// Get pending verification requests (admin only)
app.get('/api/admin/verification-requests', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = (req.query.status as string) || 'pending';
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      User.find({ verificationStatus: status })
        .select('name username email avatarUrl verificationStatus verificationRealName verificationPhotoUrl verificationNote verificationRequestedAt badgeType')
        .sort({ verificationRequestedAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ verificationStatus: status }),
    ]);

    res.json({ requests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('GET /api/admin/verification-requests error:', error);
    res.status(500).json({ error: 'Failed to fetch verification requests' });
  }
});

// Grant/revoke badge (admin only)
app.post('/api/admin/users/:targetUserId/badge', authenticate, requireAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { badgeType, approve } = req.body; // badgeType: 'none'|'blue'|'gold', approve: boolean

    const user = await User.findById(targetUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const badge = badgeType as 'none' | 'blue' | 'gold';
    if (!['none', 'blue', 'gold'].includes(badge)) {
      return res.status(400).json({ error: 'Invalid badge type. Must be none, blue, or gold' });
    }

    user.badgeType = badge;
    user.isVerified = badge !== 'none';

    if (approve === true || badge !== 'none') {
      user.verificationStatus = 'approved';
      user.verificationReviewedAt = new Date();
      user.verificationReviewedBy = req.user._id;
    } else if (approve === false) {
      user.verificationStatus = 'rejected';
      user.verificationReviewedAt = new Date();
      user.verificationReviewedBy = req.user._id;
    }

    await user.save();

    res.json({ success: true, user: { id: user._id, badgeType: user.badgeType, isVerified: user.isVerified, verificationStatus: user.verificationStatus } });
  } catch (error) {
    console.error('POST /api/admin/users/:userId/badge error:', error);
    res.status(500).json({ error: 'Failed to update badge' });
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
