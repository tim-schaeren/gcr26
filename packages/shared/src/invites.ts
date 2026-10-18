// Invite codes are typed in by hand, outdoors, often in a hurry — so the
// alphabet leaves out characters people confuse: I/1, O/0, and lowercase.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const JOIN_CODE_LENGTH = 6;

export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

// What a player typed, turned into what we store. Characters a code can never
// contain — including the lookalikes I, O, 0 and 1 — are dropped rather than
// guessed at, so a typo fails to match instead of joining the wrong game.
export function normalizeJoinCode(input: string): string {
  return (input ?? '')
    .toUpperCase()
    .split('')
    .filter(c => ALPHABET.includes(c))
    .join('')
    .slice(0, JOIN_CODE_LENGTH);
}

export function isValidJoinCode(code: string): boolean {
  return code.length === JOIN_CODE_LENGTH && [...code].every(c => ALPHABET.includes(c));
}
