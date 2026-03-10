import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './src/db.js';
import { initBot } from './bot/index.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Connect to MongoDB
connectDB().catch(console.error);

// Initialize Telegram bot
initBot();

// ── API Routes ────────────────────────────────────────────────────────────────

// GET /api/posts — fetch posts (optionally filtered by userId)
app.get('/api/posts', async (req, res) => {
  try {
    const { userId } = req.query;
    // TODO: query MongoDB for posts
    res.json([]);
  } catch (error) {
    console.error('GET /api/posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/posts — create a new post
app.post('/api/posts', async (req, res) => {
  try {
    const post = req.body;
    // TODO: save post to MongoDB
    res.status(201).json({ ...post, _id: Date.now().toString() });
  } catch (error) {
    console.error('POST /api/posts error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// POST /api/posts/:postId/like — like a post
app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    // TODO: add like in MongoDB
    res.json({ postId, userId, liked: true });
  } catch (error) {
    console.error('POST /api/posts/:postId/like error:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// DELETE /api/posts/:postId/like — unlike a post
app.delete('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    // TODO: remove like in MongoDB
    res.json({ postId, userId, liked: false });
  } catch (error) {
    console.error('DELETE /api/posts/:postId/like error:', error);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
});

// POST /api/posts/:postId/bookmark — bookmark a post
app.post('/api/posts/:postId/bookmark', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    // TODO: add bookmark in MongoDB
    res.json({ postId, userId, bookmarked: true });
  } catch (error) {
    console.error('POST /api/posts/:postId/bookmark error:', error);
    res.status(500).json({ error: 'Failed to bookmark post' });
  }
});

// DELETE /api/posts/:postId/bookmark — remove bookmark
app.delete('/api/posts/:postId/bookmark', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    // TODO: remove bookmark in MongoDB
    res.json({ postId, userId, bookmarked: false });
  } catch (error) {
    console.error('DELETE /api/posts/:postId/bookmark error:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// POST /api/posts/:postId/share — share a post with mutual followers
app.post('/api/posts/:postId/share', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, receiverIds } = req.body;
    // TODO: record share and notify recipients in MongoDB
    res.json({ postId, userId, receiverIds, shared: true });
  } catch (error) {
    console.error('POST /api/posts/:postId/share error:', error);
    res.status(500).json({ error: 'Failed to share post' });
  }
});

// POST /api/users/:targetId/follow — follow a user
app.post('/api/users/:targetId/follow', async (req, res) => {
  try {
    const { targetId } = req.params;
    const { userId } = req.body;
    // TODO: add follow relationship in MongoDB
    res.json({ userId, targetId, following: true });
  } catch (error) {
    console.error('POST /api/users/:targetId/follow error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /api/users/:targetId/follow — unfollow a user
app.delete('/api/users/:targetId/follow', async (req, res) => {
  try {
    const { targetId } = req.params;
    const { userId } = req.body;
    // TODO: remove follow relationship in MongoDB
    res.json({ userId, targetId, following: false });
  } catch (error) {
    console.error('DELETE /api/users/:targetId/follow error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// GET /api/users/:userId/mutuals — get mutual followers
app.get('/api/users/:userId/mutuals', async (req, res) => {
  try {
    const { userId } = req.params;
    // TODO: query MongoDB for mutual followers
    res.json([]);
  } catch (error) {
    console.error('GET /api/users/:userId/mutuals error:', error);
    res.status(500).json({ error: 'Failed to fetch mutuals' });
  }
});

// POST /api/telegram/webhook — Telegram bot webhook
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    // TODO: handle incoming Telegram webhook updates
    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/telegram/webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Serve React app for all other routes (SPA fallback)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DDU Social server running on http://localhost:${PORT}`);
});

export default app;
