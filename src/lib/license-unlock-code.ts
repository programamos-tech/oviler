import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SALT_BYTES = 16;
const KEY_LEN = 32;
const SCRYPT_N = 16384;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Quita guiones y espacios; mayúsculas (para comparar con lo que escribe el usuario). */
export function normalizeUnlockCodeInput(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

/** Código legible tipo XXXX-XXXX-XXXX (sin I, O, 0, 1). */
export function generateUnlockCodePlain(): string {
  const bytes = randomBytes(12);
  let raw = "";
  for (let i = 0; i < 12; i++) {
    raw += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function hashUnlockCode(plainNormalized: string): { saltB64: string; hashB64: string } {
  const salt = randomBytes(SALT_BYTES);
  const saltB64 = salt.toString("base64");
  const hash = scryptSync(plainNormalized, saltB64, KEY_LEN, { N: SCRYPT_N });
  return { saltB64, hashB64: hash.toString("base64") };
}

export function verifyUnlockCode(
  plainNormalized: string,
  saltB64: string | null | undefined,
  hashB64: string | null | undefined
): boolean {
  if (!saltB64 || !hashB64 || !plainNormalized) return false;
  try {
    const hash = scryptSync(plainNormalized, saltB64, KEY_LEN, { N: SCRYPT_N });
    const expected = Buffer.from(hashB64, "base64");
    if (hash.length !== expected.length) return false;
    return timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}
