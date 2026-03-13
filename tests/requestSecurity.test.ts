import { describe, expect, it } from 'vitest';
import {
  getActorRateLimitKey,
  getRequestOrigin,
  isOriginAllowed,
  shouldBypassOriginCheck,
} from '../src/utils/requestSecurity';

describe('requestSecurity helpers', () => {
  it('extracts origin directly from the origin header', () => {
    expect(
      getRequestOrigin({
        headers: { origin: 'https://example.com' },
      })
    ).toBe('https://example.com');
  });

  it('falls back to referer origin when origin header is absent', () => {
    expect(
      getRequestOrigin({
        headers: { referer: 'https://example.com/profile?id=1' },
      })
    ).toBe('https://example.com');
  });

  it('allows missing origins for non-browser clients', () => {
    expect(isOriginAllowed(null, ['https://example.com'])).toBe(true);
  });

  it('rejects untrusted origins', () => {
    expect(isOriginAllowed('https://evil.com', ['https://example.com'])).toBe(false);
  });

  it('bypasses origin checks for safe methods and telegram webhook', () => {
    expect(shouldBypassOriginCheck({ method: 'GET', path: '/api/posts' })).toBe(true);
    expect(shouldBypassOriginCheck({ method: 'POST', path: '/api/telegram/webhook' })).toBe(true);
    expect(shouldBypassOriginCheck({ method: 'POST', path: '/api/posts' })).toBe(false);
  });

  it('builds rate limit keys from actor identifiers before falling back to ip', () => {
    expect(getActorRateLimitKey({ body: { userId: '507f1f77bcf86cd799439011' }, ip: '127.0.0.1' })).toBe('507f1f77bcf86cd799439011');
    expect(getActorRateLimitKey({ body: { reporterId: 'invalid-user' }, ip: '127.0.0.1' })).toBe('127.0.0.1');
    expect(getActorRateLimitKey({ params: { targetId: '507f1f77bcf86cd799439012' }, ip: '127.0.0.1' })).toBe('507f1f77bcf86cd799439012');
    expect(getActorRateLimitKey({ ip: '127.0.0.1' })).toBe('127.0.0.1');
  });
});
