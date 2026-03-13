import { describe, expect, it } from 'vitest';
import {
  canUseGhostMode,
  getAccountAgeInDays,
  getGhostPostCooldownRemainingMs,
  isGhostPostRateLimited,
  stripMentionsFromGhostContent,
} from '../src/utils/ghostPolicy';

describe('ghostPolicy', () => {
  it('requires accounts to be at least 7 days old for ghost mode', () => {
    const now = new Date('2026-03-12T12:00:00.000Z');

    expect(canUseGhostMode('2026-03-05T12:00:01.000Z', now)).toBe(false);
    expect(canUseGhostMode('2026-03-05T12:00:00.000Z', now)).toBe(true);
    expect(getAccountAgeInDays('2026-03-01T12:00:00.000Z', now)).toBe(11);
  });

  it('applies a 24 hour cooldown between ghost posts', () => {
    const now = new Date('2026-03-12T12:00:00.000Z');

    expect(isGhostPostRateLimited('2026-03-11T13:00:00.000Z', now)).toBe(true);
    expect(isGhostPostRateLimited('2026-03-11T12:00:00.000Z', now)).toBe(false);
    expect(getGhostPostCooldownRemainingMs('2026-03-11T18:00:00.000Z', now)).toBe(6 * 60 * 60 * 1000);
  });

  it('strips @mentions from ghost post content without removing usernames', () => {
    expect(stripMentionsFromGhostContent('Hey @alice and @bob, chill')).toBe('Hey alice and bob, chill');
    expect(stripMentionsFromGhostContent('(@campus) @roommate said hi')).toBe('(campus) roommate said hi');
  });
});
