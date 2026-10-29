// Bitcoin mainnet address validation.
//
// Three forms are in use and all three are accepted, because which one a
// wallet hands you is the wallet's choice, not the user's:
//
//   P2PKH   legacy, starts "1"
//   P2SH    starts "3"
//   Bech32  native segwit, starts "bc1q" (and "bc1p" for taproot)
//
// This is a shape check, not a checksum check. It is here to stop an
// obviously wrong value — a Tron address, an ETH address, a truncated
// paste — being saved as the receiving wallet. A wrong-but-well-formed
// address can't be caught this way, which is why the deposit flow also
// verifies on-chain that funds actually arrived at it.

const P2PKH_OR_P2SH = /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/;
const BECH32 = /^bc1[02-9ac-hj-np-z]{11,71}$/;

export function isValidBitcoinAddress(address: string): boolean {
  const trimmed = address.trim();
  return P2PKH_OR_P2SH.test(trimmed) || BECH32.test(trimmed.toLowerCase());
}

// A Bitcoin txid is a 64-character hex string — the same shape as a TRON
// transaction hash, so the existing validator's rules carry over. It is
// restated here so the deposit flow has no residual Tron import.
const TXID_RE = /^(0x)?[0-9a-fA-F]{64}$/;

export function isValidTxid(hash: string): boolean {
  return TXID_RE.test(hash.trim());
}

export function normalizeTxid(hash: string): string {
  const trimmed = hash.trim();
  return trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
}
