import { isValidObjectId } from './validation.js';

type HeaderValue = string | string[] | undefined;

interface RequestLike {
  method?: string;
  path?: string;
  originalUrl?: string;
  headers?: Record<string, HeaderValue>;
  body?: Record<string, any>;
  params?: Record<string, any>;
  query?: Record<string, any>;
  ip?: string;
}

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getHeaderValue(value: HeaderValue): string | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return typeof value === 'string' ? value : null;
}

export function getRequestOrigin(req: RequestLike): string | null {
  const originHeader = getHeaderValue(req.headers?.origin);
  if (originHeader) {
    return normalizeOrigin(originHeader);
  }

  const refererHeader = getHeaderValue(req.headers?.referer);
  if (refererHeader) {
    return normalizeOrigin(refererHeader);
  }

  return null;
}

export function isOriginAllowed(requestOrigin: string | null, allowedOrigins: string[]): boolean {
  if (!requestOrigin) {
    return true;
  }

  const normalizedAllowedOrigins = allowedOrigins
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));

  return normalizedAllowedOrigins.includes(requestOrigin);
}

export function shouldBypassOriginCheck(req: RequestLike): boolean {
  const method = (req.method || 'GET').toUpperCase();
  const path = req.path || req.originalUrl || '';

  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  return path.startsWith('/api/telegram/webhook');
}

export function getActorRateLimitKey(req: RequestLike): string {
  const actorId =
    req.body?.userId ||
    req.body?.reporterId ||
    req.body?.senderId ||
    req.params?.userId ||
    req.params?.targetId ||
    req.query?.userId;

  if (typeof actorId === 'string' && isValidObjectId(actorId)) {
    return actorId;
  }

  return req.ip || 'anonymous';
}
