import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// A user-chosen secondary key required to authorize deposits and
// withdrawals — separate from the login password. Stored as
// "<salt>:<hash>" (salted scrypt), never in plaintext.

export function isValidTransactionKey(key: string): boolean {
  return /^[A-Za-z0-9]{6,32}$/.test(key);
}

export function hashTransactionKey(key: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(key, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyTransactionKey(key: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const hashBuffer = Buffer.from(hash, "hex");
    const derived = scryptSync(key, salt, 64);
    if (derived.length !== hashBuffer.length) return false;
    return timingSafeEqual(derived, hashBuffer);
  } catch {
    return false;
  }
}
