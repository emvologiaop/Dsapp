import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleVerifyTelegramRequest } from '../server';
import { User } from '../src/models/User';

describe('Telegram verification endpoint', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const buildApp = () => {
    const app = express();
    app.get('/api/auth/verify-telegram/:code', handleVerifyTelegramRequest);
    return app;
  };

  it('verifies when the Telegram chat is already linked via userId fallback', async () => {
    const app = buildApp();

    vi.spyOn(User, 'findOne').mockResolvedValue(null as any);
    const save = vi.fn().mockResolvedValue(null);
    const linkedUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      department: 'Engineering',
      year: '1',
      role: 'user',
      createdAt: new Date(),
      telegramChatId: '123456',
      telegramAuthCode: '654321',
      telegramAuthCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      save,
    } as any;
    vi.spyOn(User, 'findById').mockResolvedValue(linkedUser);

    const res = await request(app)
      .get('/api/auth/verify-telegram/000000')
      .query({ userId: linkedUser._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.user?.telegramChatId).toBe('123456');
    expect(linkedUser.telegramAuthCode).toBeUndefined();
    expect(linkedUser.telegramAuthCodeExpiresAt).toBeUndefined();
    expect(save).toHaveBeenCalled();
  });

  it('returns an expiry error when the code is too old', async () => {
    const app = buildApp();

    vi.spyOn(User, 'findOne').mockResolvedValue({
      telegramAuthCodeExpiresAt: new Date(Date.now() - 1000),
      telegramChatId: undefined,
    } as any);
    const findByIdSpy = vi.spyOn(User, 'findById').mockResolvedValue(null as any);

    const res = await request(app).get('/api/auth/verify-telegram/999999');

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(false);
    expect(res.body.error).toMatch(/expired/i);
    expect(findByIdSpy).not.toHaveBeenCalled();
  });
});
