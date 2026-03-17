const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((input || '').trim());
}

export function isValidUsername(input: string): boolean {
  return /^[a-zA-Z0-9_.]{3,20}$/.test((input || '').trim());
}

export function isValidObjectId(input: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test((input || '').trim());
}

export function sanitizeContent(input: unknown, maxLength: number = 2000): string {
  return sanitizeText(input).slice(0, maxLength);
}

export function isValidPassword(input: string): boolean {
  const value = input || '';
  return /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && value.length >= 8;
}

export function isValidUrl(input: string): boolean {
  try {
    const parsed = new URL(input);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeFilename(input: string): string {
  const raw = (input || '').replace(/\.\./g, '_.').replace(/[\\/]/g, '_');
  const sanitized = raw.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.slice(0, 255);
}

export function sanitizeSearchQuery(input: unknown, maxLength: number = 100): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '')
    .slice(0, maxLength);
}
