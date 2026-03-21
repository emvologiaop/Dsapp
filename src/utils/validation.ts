const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

export const SIGNUP_YEAR_OPTIONS = ['remedial', '1', '2', '3', '4', '5', '6', '7'] as const;
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'] as const;

type SignupValidationInput = {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  department?: string;
  year?: string;
};

export function normalizeSignupInput(input: SignupValidationInput) {
  return {
    name: (input.name || '').trim().replace(/\s+/g, ' '),
    username: (input.username || '').trim().toLowerCase(),
    email: (input.email || '').trim().toLowerCase(),
    password: input.password || '',
    confirmPassword: input.confirmPassword || '',
    department: (input.department || '').trim().replace(/\s+/g, ' '),
    year: (input.year || '').trim(),
  };
}

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
  return /^[a-z0-9_.]{3,20}$/.test((input || '').trim());
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

export function getPasswordValidationMessage(): string {
  return 'Password must be at least 8 characters and include uppercase, lowercase, and a number.';
}

export function validateAvatarFile(file?: { size: number; type: string } | null): string | null {
  if (!file) return null;
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])) {
    return 'Avatar must be a JPG, PNG, WebP, or GIF image.';
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return 'Avatar must be 5MB or smaller.';
  }
  return null;
}

export function getSignupValidationErrors(input: SignupValidationInput): string[] {
  const normalized = normalizeSignupInput(input);
  const errors: string[] = [];

  if (normalized.name.length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }
  if (normalized.name.length > 60) {
    errors.push('Full name must be 60 characters or fewer.');
  }
  if (!isValidUsername(normalized.username)) {
    errors.push('Username must be 3-20 lowercase letters, numbers, underscores, or periods.');
  }
  if (!isValidEmail(normalized.email)) {
    errors.push('Enter a valid email address.');
  }
  if (!isValidPassword(normalized.password)) {
    errors.push(getPasswordValidationMessage());
  }
  if (!normalized.confirmPassword) {
    errors.push('Please confirm your password.');
  } else if (normalized.password !== normalized.confirmPassword) {
    errors.push('Password confirmation does not match.');
  }
  if (normalized.department.length < 2) {
    errors.push('Department must be at least 2 characters.');
  }
  if (normalized.department.length > 80) {
    errors.push('Department must be 80 characters or fewer.');
  }
  if (!SIGNUP_YEAR_OPTIONS.includes(normalized.year as (typeof SIGNUP_YEAR_OPTIONS)[number])) {
    errors.push('Select a valid academic year.');
  }

  return errors;
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
