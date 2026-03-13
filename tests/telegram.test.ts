import { describe, expect, it } from 'vitest';
import {
  getTelegramHandle,
  getTelegramProfileUrl,
  normalizeTelegramUsername,
  resolveTelegramWebhookUrl,
} from '../src/utils/telegram';

describe('telegram utilities', () => {
  it('normalizes telegram usernames with or without @', () => {
    expect(normalizeTelegramUsername('@DDU_social_BOT')).toBe('DDU_social_BOT');
    expect(normalizeTelegramUsername('DDU_social_BOT')).toBe('DDU_social_BOT');
    expect(normalizeTelegramUsername('')).toBe('DDU_social_BOT');
    expect(normalizeTelegramUsername('@@@')).toBe('DDU_social_BOT');
  });

  it('builds a handle and profile URL from the configured username', () => {
    expect(getTelegramHandle('@MyBot')).toBe('@MyBot');
    expect(getTelegramProfileUrl('@MyBot')).toBe('https://t.me/MyBot');
  });

  it('prefers explicit webhook URL and otherwise derives one from APP_URL', () => {
    expect(
      resolveTelegramWebhookUrl({
        explicitUrl: 'https://hooks.example.com/custom',
        appUrl: 'https://app.example.com',
        vercelUrl: 'fallback.vercel.app',
      })
    ).toBe('https://hooks.example.com/custom');

    expect(
      resolveTelegramWebhookUrl({
        appUrl: 'https://app.example.com/',
      })
    ).toBe('https://app.example.com/api/telegram/webhook');
  });

  it('falls back to Vercel host when APP_URL is unavailable', () => {
    expect(
      resolveTelegramWebhookUrl({
        vercelUrl: 'project.vercel.app',
      })
    ).toBe('https://project.vercel.app/api/telegram/webhook');
  });
});
