import jwt from 'jsonwebtoken';

const DEFAULT_EXPIRY = '7d';

type AuthTokenPayload = {
  userId: string;
  role?: string;
};

function getJwtSecret(): string {
  return process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-insecure-jwt-secret-change-me';
}

export function createAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: DEFAULT_EXPIRY });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || typeof decoded !== 'object') return null;
    const userId = typeof decoded.userId === 'string' ? decoded.userId : '';
    if (!userId) return null;
    return {
      userId,
      role: typeof decoded.role === 'string' ? decoded.role : undefined,
    };
  } catch {
    return null;
  }
}

export function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) return null;
  const [scheme, value] = authorizationHeader.split(' ');
  if (!scheme || !value) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return value.trim() || null;
}
