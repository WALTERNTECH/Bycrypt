const TRON_ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export function isValidTronAddress(address: string): boolean {
  return TRON_ADDRESS_RE.test(address.trim());
}
