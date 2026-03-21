export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('ddu_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.authToken === 'string' && parsed.authToken.trim()) {
      return parsed.authToken;
    }
  } catch {
    // ignore localStorage parse errors
  }
  return null;
}

export function withAuthHeaders(headers?: HeadersInit): HeadersInit {
  const token = getStoredAuthToken();
  if (!token) return headers || {};

  const nextHeaders = new Headers(headers || {});
  if (!nextHeaders.has('Authorization')) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  }
  return nextHeaders;
}
