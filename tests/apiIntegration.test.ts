import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticate } from '../src/middleware/auth';
import { createAuthToken } from '../src/utils/authToken';
import { User } from '../src/models/User';

describe('API integration middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('authenticates via bearer token', async () => {
    const app = express();
    app.use(express.json());
    vi.spyOn(User, 'findById').mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      role: 'student',
    } as any);

    app.get('/secure', authenticate, (req: any, res) => {
      res.json({ ok: true, userId: req.userId });
    });

    const token = createAuthToken({ userId: '507f1f77bcf86cd799439011', role: 'student' });
    const response = await request(app)
      .get('/secure')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, userId: '507f1f77bcf86cd799439011' });
  });

  it('falls back to body userId when token is absent', async () => {
    const app = express();
    app.use(express.json());
    vi.spyOn(User, 'findById').mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      role: 'student',
    } as any);

    app.post('/secure', authenticate, (req: any, res) => {
      res.json({ ok: true, userId: req.userId });
    });

    const response = await request(app)
      .post('/secure')
      .send({ userId: '507f1f77bcf86cd799439011' });

    expect(response.status).toBe(200);
    expect(response.body.userId).toBe('507f1f77bcf86cd799439011');
  });
});
