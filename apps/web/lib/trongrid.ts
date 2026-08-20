// Server-only. On-chain USDT-TRC20 deposit verification against TronGrid,
// following the algorithm specified in the Krypton (née Bycrypt) Technical Design
// Document, Section 5.3 ("Deposit verification — detailed contract").

import TronWeb from "tronweb";

export const USDT_TRC20_CONTRACT_MAINNET = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const MIN_CONFIRMATIONS = 19;
const TRONGRID_BASE = "https://api.trongrid.io";

export interface DepositVerificationResult {
  ok: boolean;
  reason?: string;
  amount?: number; // human units (USDT has 6 decimals)
  confirmations?: number;
}

function headers(): Record<string, string> {
  const key = process.env.TRONGRID_API_KEY;
  return key ? { "TRON-PRO-API-KEY": key } : {};
}

function toBase58(address: string): string {
  // TronGrid sometimes returns addresses hex-encoded (41-prefixed, 42 chars).
  if (/^41[0-9a-fA-F]{40}$/.test(address)) {
    try {
      return TronWeb.address.fromHex(address);
    } catch {
      return address;
    }
  }
  return address;
}

export async function verifyTrc20Deposit(
  txHash: string,
  expectedToAddress: string,
  usdtContractAddress: string = USDT_TRC20_CONTRACT_MAINNET
): Promise<DepositVerificationResult> {
  try {
    // 1. Fetch the transaction and confirm it succeeded on-chain.
    const txRes = await fetch(`${TRONGRID_BASE}/v1/transactions/${txHash}`, {
      headers: headers(),
      cache: "no-store"
    });
    if (!txRes.ok) return { ok: false, reason: "trongrid_unreachable" };
    const txJson = await txRes.json();
    const tx = txJson?.data?.[0];
    if (!tx) return { ok: false, reason: "transaction_not_found" };
    if (tx.ret?.[0]?.contractRet !== "SUCCESS") {
      return { ok: false, reason: "transaction_failed" };
    }

    // 2. Fetch decoded events, find the USDT-TRC20 Transfer event.
    const eventsRes = await fetch(`${TRONGRID_BASE}/v1/transactions/${txHash}/events`, {
      headers: headers(),
      cache: "no-store"
    });
    if (!eventsRes.ok) return { ok: false, reason: "trongrid_unreachable" };
    const eventsJson = await eventsRes.json();
    const transferEvent = (eventsJson?.data ?? []).find(
      (e: any) =>
        e.event_name === "Transfer" &&
        toBase58(e.contract_address) === usdtContractAddress
    );
    if (!transferEvent) {
      return { ok: false, reason: "no_matching_transfer_event" };
    }

    const toAddress = toBase58(transferEvent.result.to);
    if (toAddress !== expectedToAddress) {
      return { ok: false, reason: "wrong_destination_address" };
    }

    const rawValue = transferEvent.result.value as string;
    const amount = Number(rawValue) / 1e6;

    // 3. Confirmation depth.
    const blockRes = await fetch(`${TRONGRID_BASE}/wallet/getnowblock`, {
      headers: headers(),
      cache: "no-store"
    });
    const blockJson = await blockRes.json();
    const currentHeight = blockJson?.block_header?.raw_data?.number ?? 0;
    const txBlockNumber = tx.blockNumber ?? 0;
    const confirmations = txBlockNumber ? currentHeight - txBlockNumber : 0;

    if (confirmations < MIN_CONFIRMATIONS) {
      return { ok: false, reason: "insufficient_confirmations", amount, confirmations };
    }

    return { ok: true, amount, confirmations };
  } catch (err) {
    return { ok: false, reason: "verification_error" };
  }
}
