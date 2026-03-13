export const GHOST_MODE_MIN_ACCOUNT_AGE_DAYS = 7;
export const GHOST_POST_RATE_LIMIT_HOURS = 24;

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getAccountAgeInDays(createdAt?: string | Date | null, now: Date = new Date()): number {
  const createdAtDate = toDate(createdAt);
  if (!createdAtDate) return 0;
  return Math.max(0, Math.floor((now.getTime() - createdAtDate.getTime()) / DAY_IN_MS));
}

export function canUseGhostMode(createdAt?: string | Date | null, now: Date = new Date()): boolean {
  return getAccountAgeInDays(createdAt, now) >= GHOST_MODE_MIN_ACCOUNT_AGE_DAYS;
}

export function getGhostPostCooldownRemainingMs(lastGhostPostAt?: string | Date | null, now: Date = new Date()): number {
  const lastGhostPostDate = toDate(lastGhostPostAt);
  if (!lastGhostPostDate) return 0;
  const unlockTime = lastGhostPostDate.getTime() + (GHOST_POST_RATE_LIMIT_HOURS * HOUR_IN_MS);
  return Math.max(0, unlockTime - now.getTime());
}

export function isGhostPostRateLimited(lastGhostPostAt?: string | Date | null, now: Date = new Date()): boolean {
  return getGhostPostCooldownRemainingMs(lastGhostPostAt, now) > 0;
}

export function stripMentionsFromGhostContent(content: string): string {
  if (typeof content !== 'string') return '';
  return content.replace(/(^|[^\w])@([a-zA-Z0-9_]+)/g, (_match, prefix: string, username: string) => `${prefix}${username}`);
}
