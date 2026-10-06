import { randomInt } from "node:crypto";

// No 0/O or 1/I so refs read cleanly when spoken aloud on stage.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** `ESC-7KQ2M9XA` style reference. */
export function mockRef(prefix: string, length = 8): string {
  let suffix = "";
  for (let i = 0; i < length; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${suffix}`;
}

export function numericCode(digits: number): string {
  return String(randomInt(10 ** digits)).padStart(digits, "0");
}
