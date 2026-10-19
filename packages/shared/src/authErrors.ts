import { copy } from './copy';

// Firebase throws things like "Firebase: Error (auth/invalid-email)". Nobody
// signing up for a scavenger hunt should ever read that; the sentences are
// in the copy catalog.
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  return copy.authErrors[code] ?? copy.authErrors.fallback;
}

// Checked before the request so people are told as they type, rather than
// after a round trip
export function emailLooksValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const MIN_PASSWORD_LENGTH = 6;
