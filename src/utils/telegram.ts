const DEFAULT_BOT_USERNAME = 'DDU_social_BOT';

export function normalizeTelegramUsername(botUsername?: string): string {
  const normalized = (botUsername || '').replace(/^@+/, '').trim();
  return normalized || DEFAULT_BOT_USERNAME;
}

export function getTelegramHandle(botUsername?: string): string {
  return `@${normalizeTelegramUsername(botUsername)}`;
}

export function getTelegramProfileUrl(botUsername?: string): string {
  return `https://t.me/${normalizeTelegramUsername(botUsername)}`;
}

export function getTelegramDeepLink(code: string, botUsername?: string): string {
  const u = normalizeTelegramUsername(botUsername);
  const safe = encodeURIComponent(code || '');
  return `https://t.me/${u}?start=${safe}`;
}

export function resolveTelegramWebhookUrl(input: {
  explicitUrl?: string;
  appUrl?: string;
  vercelUrl?: string;
}): string | null {
  const explicit = (input.explicitUrl || '').trim();
  if (explicit) return explicit;
  const base =
    (input.appUrl || '').trim() ||
    (input.vercelUrl ? `https://${input.vercelUrl}` : '');
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/api/telegram/webhook`;
}
