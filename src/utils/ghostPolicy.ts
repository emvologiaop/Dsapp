export const GHOST_MODE_MIN_ACCOUNT_AGE_DAYS = 7;
export const GHOST_POST_RATE_LIMIT_HOURS = 24;

function toDate(value?: string | Date | null, fallback: Date = new Date()): Date {
  if (!value) return fallback;
  return value instanceof Date ? value : new Date(value);
}

export function getAccountAgeInDays(createdAt?: string | Date | null, now: Date = new Date()): number {
  if (!createdAt) return Number.MAX_SAFE_INTEGER;
  const created = toDate(createdAt, now);
  return Math.floor((now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
}

export function canUseGhostMode(createdAt?: string | Date | null, now: Date = new Date()): boolean {
  if (!createdAt) return true;
  const created = toDate(createdAt, now);
  const ageMs = now.getTime() - created.getTime();
  const minMs = GHOST_MODE_MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000;
  return ageMs >= minMs;
}

export function getGhostPostCooldownRemainingMs(lastGhostPostAt?: string | Date | null, now: Date = new Date()): number {
  if (!lastGhostPostAt) return 0;
  const lastPost = toDate(lastGhostPostAt, now);
  const cooldownMs = GHOST_POST_RATE_LIMIT_HOURS * 60 * 60 * 1000;
  return Math.max(0, cooldownMs - (now.getTime() - lastPost.getTime()));
}

export function isGhostPostRateLimited(lastGhostPostAt?: string | Date | null, now: Date = new Date()): boolean {
  return getGhostPostCooldownRemainingMs(lastGhostPostAt, now) > 0;
}

export function stripMentionsFromGhostContent(text: string): string {
  return (text || '').replace(/@(\w+)/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
