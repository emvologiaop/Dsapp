/**
 * Input validation and sanitization utilities
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Removes potentially dangerous HTML tags and script content
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format
 * - 3-20 characters
 * - Only alphanumeric, underscore, and hyphen
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Sanitize and validate caption/post content
 * - Maximum length: 2000 characters
 * - Remove XSS attempts
 */
export function sanitizeContent(content: string, maxLength: number = 2000): string {
  if (typeof content !== 'string') {
    return '';
  }

  const sanitized = sanitizeText(content);
  return sanitized.substring(0, maxLength);
}

/**
 * Validate password strength
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) {
    return false;
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumber;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize filename to prevent directory traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\./g, '_.')  // Replace .. with _.
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace all other special chars with _
    .substring(0, 255);
}

/**
 * Validate and sanitize search query
 */
export function sanitizeSearchQuery(query: string, maxLength: number = 100): string {
  if (typeof query !== 'string') {
    return '';
  }

  // Remove special regex characters to prevent regex injection
  const sanitized = query
    .replace(/[.*+?^${}()|[\]\\]/g, '')
    .trim();

  return sanitized.substring(0, maxLength);
}
