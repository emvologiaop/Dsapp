import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { uploadVideo } from '../src/middleware/upload';
import { deleteFromR2, getKeyFromUrl, getPresignedUrl, uploadToR2 } from '../src/services/r2Storage';

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');

afterEach(() => {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) return;
  for (const entry of fs.readdirSync(LOCAL_UPLOADS_DIR)) {
    if (entry.startsWith('test-reel-')) {
      fs.unlinkSync(path.join(LOCAL_UPLOADS_DIR, entry));
    }
  }
});

describe('reel upload plumbing', () => {
  it('processes multipart reel payloads with the video upload middleware', async () => {
    const app = express();
    app.post('/api/reels/upload-r2', uploadVideo.single('video'), (req, res) => {
      res.json({
        userId: req.body.userId,
        caption: req.body.caption,
        isAnonymous: req.body.isAnonymous,
        videoType: req.file?.mimetype,
        videoSize: req.file?.size,
      });
    });

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as import('net').AddressInfo;
    const url = `http://127.0.0.1:${address.port}/api/reels/upload-r2`;

    const form = new FormData();
    form.set('userId', '507f1f77bcf86cd799439011');
    form.set('caption', 'Test reel');
    form.set('isAnonymous', 'false');
    form.set('video', new Blob([Buffer.from('not-a-real-video')], { type: 'video/mp4' }), 'test-reel.mp4');

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: form as any,
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.userId).toBe('507f1f77bcf86cd799439011');
      expect(data.caption).toBe('Test reel');
      expect(data.isAnonymous).toBe('false');
      expect(data.videoType).toBe('video/mp4');
      expect(data.videoSize).toBeGreaterThan(0);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });

  it('falls back to local uploads when R2 is not configured', async () => {
    const originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      ALLOW_LOCAL_UPLOAD_FALLBACK: process.env.ALLOW_LOCAL_UPLOAD_FALLBACK,
      R2_ENDPOINT: process.env.R2_ENDPOINT,
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    };

    process.env.R2_ENDPOINT = '';
    process.env.R2_ACCESS_KEY_ID = '';
    process.env.R2_SECRET_ACCESS_KEY = '';
    process.env.R2_BUCKET_NAME = '';
    process.env.R2_PUBLIC_URL = '';
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_LOCAL_UPLOAD_FALLBACK = '';

    const localUrl = await uploadToR2(
      Buffer.from('video-bytes'),
      'test-reel-video.mp4',
      'video/mp4',
      'test-reel-folder'
    );

    try {
      expect(localUrl).toBe('/uploads/test-reel-folder_test-reel-video.mp4');
      expect(fs.existsSync(path.join(LOCAL_UPLOADS_DIR, 'test-reel-folder_test-reel-video.mp4'))).toBe(true);
      expect(getKeyFromUrl(localUrl)).toBe('test-reel-folder_test-reel-video.mp4');
      await expect(getPresignedUrl(localUrl)).resolves.toBe(localUrl);
    } finally {
      await deleteFromR2(localUrl);
      process.env.R2_ENDPOINT = originalEnv.R2_ENDPOINT;
      process.env.R2_ACCESS_KEY_ID = originalEnv.R2_ACCESS_KEY_ID;
      process.env.R2_SECRET_ACCESS_KEY = originalEnv.R2_SECRET_ACCESS_KEY;
      process.env.R2_BUCKET_NAME = originalEnv.R2_BUCKET_NAME;
      process.env.R2_PUBLIC_URL = originalEnv.R2_PUBLIC_URL;
      process.env.NODE_ENV = originalEnv.NODE_ENV;
      process.env.ALLOW_LOCAL_UPLOAD_FALLBACK = originalEnv.ALLOW_LOCAL_UPLOAD_FALLBACK;
    }

    expect(fs.existsSync(path.join(LOCAL_UPLOADS_DIR, 'test-reel-folder_test-reel-video.mp4'))).toBe(false);
  });

  it('fails fast in production when R2 is not configured and local fallback is disabled', async () => {
    const originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      ALLOW_LOCAL_UPLOAD_FALLBACK: process.env.ALLOW_LOCAL_UPLOAD_FALLBACK,
      R2_ENDPOINT: process.env.R2_ENDPOINT,
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    };

    process.env.NODE_ENV = 'production';
    process.env.ALLOW_LOCAL_UPLOAD_FALLBACK = 'false';
    process.env.R2_ENDPOINT = '';
    process.env.R2_ACCESS_KEY_ID = '';
    process.env.R2_SECRET_ACCESS_KEY = '';
    process.env.R2_BUCKET_NAME = '';
    process.env.R2_PUBLIC_URL = '';

    try {
      await expect(
        uploadToR2(Buffer.from('video-bytes'), 'prod-test-reel.mp4', 'video/mp4', 'test-reel-folder')
      ).rejects.toThrow(/R2 storage is not configured/i);
    } finally {
      process.env.NODE_ENV = originalEnv.NODE_ENV;
      process.env.ALLOW_LOCAL_UPLOAD_FALLBACK = originalEnv.ALLOW_LOCAL_UPLOAD_FALLBACK;
      process.env.R2_ENDPOINT = originalEnv.R2_ENDPOINT;
      process.env.R2_ACCESS_KEY_ID = originalEnv.R2_ACCESS_KEY_ID;
      process.env.R2_SECRET_ACCESS_KEY = originalEnv.R2_SECRET_ACCESS_KEY;
      process.env.R2_BUCKET_NAME = originalEnv.R2_BUCKET_NAME;
      process.env.R2_PUBLIC_URL = originalEnv.R2_PUBLIC_URL;
    }
  });
});
