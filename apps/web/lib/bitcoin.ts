// Server-only. On-chain BTC deposit verification against a public Esplora
// explorer, mirroring the contract trongrid.ts provided for USDT-TRC20.
//
// Bitcoin is simpler to verify than a TRC20 transfer: it pays an address
// directly rather than moving a token balance inside a contract, so there
// is no contract to identify and no event log to decode. We fetch the
// transaction, sum the outputs that pay our receiving address, and check
// how deep it is buried.
//
// The one thing Bitcoin makes *harder* is the amount. A USDT-TRC20
// transfer is already denominated in dollars; a BTC transfer is not, and
// this platform's wallet is in USD. So the BTC amount has to be priced,
// which happens here at confirmation time. The rate used is returned with
// the result so it can be recorded against the deposit — without that,
// there is no way to audit why a given deposit credited the amount it did.

const ESPLORA_HOSTS = ["https://mempool.space/api", "https://blockstream.info/api"];

// ~20 minutes at a ten-minute block interval. Reorgs deeper than one
// block are rare, and this credits real money, so one confirmation is
// too thin and six (an hour) is needlessly slow for a deposit.
const MIN_CONFIRMATIONS = 2;

const SATS_PER_BTC = 100_000_000;

export interface BitcoinVerificationResult {
  ok: boolean;
  reason?: string;
  /** On-chain amount paid to our address, in BTC. */
  btcAmount?: number;
  /** btcAmount priced in USD at verification time. */
  usdAmount?: number;
  /** The BTC/USD rate used, recorded so the credit can be audited. */
  rateUsd?: number;
  confirmations?: number;
}

interface EsploraTx {
  txid: string;
  vout: { scriptpubkey_address?: string; value: number }[];
  status: { confirmed: boolean; block_height?: number };
}

/**
 * Esplora is served by several public hosts with an identical API. If the
 * first is down or rate-limiting we fall through to the next rather than
 * failing a deposit over one explorer having a bad day.
 */
async function esplora(path: string): Promise<Response | null> {
  for (const host of ESPLORA_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { cache: "no-store" });
      // 404 is a real answer ("no such transaction"), not host trouble, so
      // it is returned rather than triggering the fallback.
      if (res.ok || res.status === 404) return res;
    } catch {
      // Try the next host.
    }
  }
  return null;
}

/**
 * BTC/USD for pricing the deposit. Binance's public ticker is already the
 * price source this platform displays, so using it here keeps the figure
 * a user sees and the figure they are credited on the same feed.
 */
export async function fetchBtcUsdRate(): Promise<number | null> {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", {
      cache: "no-store"
    });
    if (!res.ok) return null;
    const json = await res.json();
    const price = Number(json?.price);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

export async function verifyBitcoinDeposit(
  txid: string,
  expectedToAddress: string
): Promise<BitcoinVerificationResult> {
  try {
    const txRes = await esplora(`/tx/${txid}`);
    if (!txRes) return { ok: false, reason: "explorer_unreachable" };
    if (txRes.status === 404) return { ok: false, reason: "transaction_not_found" };

    const tx = (await txRes.json()) as EsploraTx;
    if (!tx?.txid) return { ok: false, reason: "transaction_not_found" };

    // Sum every output paying our address. A sender may split the payment
    // across outputs, and taking only the first would under-credit them.
    const sats = (tx.vout ?? [])
      .filter((o) => o.scriptpubkey_address === expectedToAddress)
      .reduce((total, o) => total + (o.value ?? 0), 0);

    if (sats <= 0) return { ok: false, reason: "wrong_destination_address" };

    const btcAmount = sats / SATS_PER_BTC;

    // Unconfirmed transactions sit in the mempool with no block height.
    // They can still be replaced or dropped, so they are never credited.
    if (!tx.status?.confirmed || !tx.status.block_height) {
      return { ok: false, reason: "insufficient_confirmations", btcAmount, confirmations: 0 };
    }

    const tipRes = await esplora("/blocks/tip/height");
    if (!tipRes || !tipRes.ok) return { ok: false, reason: "explorer_unreachable" };
    const tipHeight = Number((await tipRes.text()).trim());
    if (!Number.isFinite(tipHeight)) return { ok: false, reason: "explorer_unreachable" };

    const confirmations = tipHeight - tx.status.block_height + 1;
    if (confirmations < MIN_CONFIRMATIONS) {
      return { ok: false, reason: "insufficient_confirmations", btcAmount, confirmations };
    }

    // Price it last. If the rate is unavailable the deposit stays pending
    // and is retried — crediting a USD wallet at a guessed rate would be
    // worse than waiting.
    const rateUsd = await fetchBtcUsdRate();
    if (!rateUsd) {
      return { ok: false, reason: "rate_unavailable", btcAmount, confirmations };
    }

    // Round to cents so the credited balance is a clean money figure.
    const usdAmount = Math.round(btcAmount * rateUsd * 100) / 100;

    return { ok: true, btcAmount, usdAmount, rateUsd, confirmations };
  } catch {
    return { ok: false, reason: "verification_error" };
  }
}
