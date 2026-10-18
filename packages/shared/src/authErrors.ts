// Firebase throws things like "Firebase: Error (auth/invalid-email)". Nobody
// signing up for a scavenger hunt should ever read that.
const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/missing-email': 'Enter your email address.',
  'auth/email-already-in-use':
    'There’s already an account with that email. Try signing in instead.',
  'auth/weak-password': 'Pick a password with at least 6 characters.',
  'auth/missing-password': 'Enter a password.',
  'auth/wrong-password': 'That email and password don’t match.',
  'auth/invalid-credential': 'That email and password don’t match.',
  'auth/user-not-found': 'No account with that email. Sign up first.',
  'auth/user-disabled': 'That account has been disabled.',
  'auth/too-many-requests':
    'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed':
    'Can’t reach the server. Check your connection.',
  'auth/requires-recent-login':
    'For safety, sign in again before doing that.',
};

export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  return MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

// Checked before the request so people are told as they type, rather than
// after a round trip
export function emailLooksValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const MIN_PASSWORD_LENGTH = 6;
