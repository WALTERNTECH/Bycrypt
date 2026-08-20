// TRON mainnet base58check addresses start with 'T' and are 34 chars,
// using the base58 alphabet (no 0, O, I, l).
const TRON_ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export function isValidTronAddress(address: string): boolean {
  return TRON_ADDRESS_RE.test(address.trim());
}

// A TRC20 transaction hash is a 64-char hex string (optionally 0x-prefixed).
const TX_HASH_RE = /^(0x)?[0-9a-fA-F]{64}$/;

export function isValidTxHash(hash: string): boolean {
  return TX_HASH_RE.test(hash.trim());
}

export function normalizeTxHash(hash: string): string {
  const trimmed = hash.trim();
  return trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
}
