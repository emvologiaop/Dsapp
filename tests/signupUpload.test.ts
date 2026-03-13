import { describe, it, expect } from 'vitest';
import express from 'express';
import { createServer } from 'http';
import { uploadImage } from '../src/middleware/upload';

const SMALL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAn8B9G/zrFEAAAAASUVORK5CYII=';

describe('signup avatar upload middleware', () => {
  it('processes multipart signup payload with avatar', async () => {
    const app = express();
    app.post('/api/auth/signup', uploadImage.single('avatar'), (req, res) => {
      res.json({
        receivedName: req.body.name,
        receivedUsername: req.body.username,
        avatarType: req.file?.mimetype,
        avatarSize: req.file?.size,
      });
    });

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as import('net').AddressInfo;
    const url = `http://127.0.0.1:${address.port}/api/auth/signup`;

    const form = new FormData();
    form.set('name', 'Test User');
    form.set('username', 'tester');
    form.set(
      'avatar',
      new Blob([Buffer.from(SMALL_PNG_BASE64, 'base64')], { type: 'image/png' }),
      'avatar.png'
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: form as any,
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.receivedName).toBe('Test User');
      expect(data.receivedUsername).toBe('tester');
      expect(data.avatarType).toBe('image/png');
      expect(data.avatarSize).toBeGreaterThan(0);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });
});
