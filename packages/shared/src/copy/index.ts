import { en, type Copy } from './en';
import { consoleEn, type ConsoleCopy } from './console.en';

// The words the app shows. There is one language so far; with more, this is
// where the one matching the phone's language would be chosen.
export const copy: Copy = en;

// The words the hosts' console shows
export const consoleCopy: ConsoleCopy = consoleEn;

export { en, consoleEn, type Copy, type ConsoleCopy };
