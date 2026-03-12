import { describe, it, expect } from 'vitest';
import express from 'express';
import compression from 'compression';
import path from 'path';
import { createServer } from 'http';

/**
 * Tests verifying the server performance middleware configuration.
 *
 * These tests use a lightweight Express app that mirrors the production
 * middleware stack (compression, static-file caching) without needing a
 * database or other external services.
 */
describe('Server Performance Enhancements', () => {
  // ── Compression ──────────────────────────────────────────────────────
  describe('compression middleware', () => {
    it('should gzip JSON responses when the client accepts gzip', async () => {
      const app = express();
      app.use(compression());
      app.get('/test', (_req, res) => {
        // Return a payload large enough for compression to kick in
        res.json({ data: 'x'.repeat(1024) });
      });

      const server = createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const addr = server.address() as import('net').AddressInfo;

      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/test`, {
          headers: { 'Accept-Encoding': 'gzip, deflate' },
        });

        expect(res.ok).toBe(true);
        // Compressed responses include the content-encoding header
        expect(res.headers.get('content-encoding')).toBe('gzip');
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((err) => (err ? reject(err) : resolve()))
        );
      }
    });

    it('should not compress when the client does not accept encoding', async () => {
      const app = express();
      app.use(compression());
      app.get('/test', (_req, res) => {
        res.json({ data: 'x'.repeat(1024) });
      });

      const server = createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const addr = server.address() as import('net').AddressInfo;

      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/test`, {
          headers: { 'Accept-Encoding': 'identity' },
        });

        expect(res.ok).toBe(true);
        expect(res.headers.get('content-encoding')).toBeNull();
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((err) => (err ? reject(err) : resolve()))
        );
      }
    });
  });

  // ── Static Asset Caching ─────────────────────────────────────────────
  describe('static asset caching', () => {
    it('should set no-cache for HTML and long-lived headers for hashed assets', async () => {
      const distDir = path.join(__dirname, '..', 'dist');
      const app = express();
      app.use(
        express.static(distDir, {
          maxAge: '1y',
          immutable: true,
          etag: true,
          lastModified: true,
          setHeaders(res, filePath) {
            if (filePath.endsWith('.html')) {
              res.setHeader('Cache-Control', 'no-cache');
            }
          },
        })
      );

      const server = createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const addr = server.address() as import('net').AddressInfo;
      const base = `http://127.0.0.1:${addr.port}`;

      try {
        // index.html must be served with no-cache
        const htmlRes = await fetch(`${base}/index.html`);
        expect(htmlRes.ok).toBe(true);
        // Consume the body so the connection can close
        await htmlRes.text();
        const cacheControl = htmlRes.headers.get('cache-control') ?? '';
        expect(cacheControl).toContain('no-cache');

        // A hashed JS asset should carry immutable + max-age headers
        const jsRes = await fetch(`${base}/assets/index-Dhb4A2wB.js`);
        expect(jsRes.ok).toBe(true);
        await jsRes.text();
        const jsCacheControl = jsRes.headers.get('cache-control') ?? '';
        expect(jsCacheControl).toContain('max-age=');
        expect(jsCacheControl).toContain('immutable');
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((err) => (err ? reject(err) : resolve()))
        );
      }
    });
  });
});
