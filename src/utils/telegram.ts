export function normalizeTelegramUsername(username?: string, fallback = 'DDU_social_BOT') {
  const normalized = (username || fallback).trim().replace(/^@+/, '');
  return normalized || fallback;
}

export function getTelegramHandle(username?: string, fallback = 'DDU_social_BOT') {
  return `@${normalizeTelegramUsername(username, fallback)}`;
}

export function getTelegramProfileUrl(username?: string, fallback = 'DDU_social_BOT') {
  return `https://t.me/${normalizeTelegramUsername(username, fallback)}`;
}

export function resolveTelegramWebhookUrl({
  explicitUrl,
  appUrl,
  vercelUrl,
}: {
  explicitUrl?: string;
  appUrl?: string;
  vercelUrl?: string;
}) {
  if (explicitUrl?.trim()) {
    return explicitUrl.trim();
  }

  if (appUrl?.trim()) {
    return `${appUrl.trim().replace(/\/+$/, '')}/api/telegram/webhook`;
  }

  if (vercelUrl?.trim()) {
    const host = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    return `${host.replace(/\/+$/, '')}/api/telegram/webhook`;
  }

  return undefined;
}
