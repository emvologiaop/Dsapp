import { isValidObjectId } from './validation.js';

type RequestLike = {
  method?: string;
  path?: string;
  ip?: string;
  headers?: Record<string, any>;
  body?: Record<string, any>;
  params?: Record<string, any>;
  query?: Record<string, any>;
};

export function getRequestOrigin(req: RequestLike): string | null {
  const origin = req.headers?.origin;
  if (typeof origin === 'string' && origin.trim()) return origin;

  const referer = req.headers?.referer;
  if (typeof referer === 'string' && referer.trim()) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

export function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

export function shouldBypassOriginCheck(req: RequestLike): boolean {
  const method = (req.method || 'GET').toUpperCase();
  const path = req.path || '';
  return method === 'GET' || method === 'HEAD' || path === '/api/telegram/webhook';
}

export function getActorRateLimitKey(req: RequestLike): string {
  const candidates = [
    req.body?.userId,
    req.body?.reporterId,
    req.params?.targetId,
    req.params?.userId,
    req.query?.userId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && isValidObjectId(candidate)) {
      return candidate;
    }
  }

  return req.ip || 'unknown';
}
