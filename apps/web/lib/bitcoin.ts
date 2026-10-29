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
      // 404 ("no such transaction") and 400 ("that is not a Bitcoin
      // address") are real answers, not host trouble, so they are returned
      // rather than triggering the fallback — a second host would give the
      // same answer, and reporting it as an unreachable network sent
      // operators looking for an outage that was not there.
      if (res.ok || res.status === 404 || res.status === 400) return res;
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

/* ============================================================
   Verifying a deposit WITHOUT a transaction ID.

   Asking a depositor for a txid was asking them to go and find a
   64-character string in another app and paste it correctly. They should
   be able to send the coins and press one button.

   What the txid provided, though, was proof of ownership: it said "this
   particular payment is mine". With one shared receiving address and no
   txid, two people depositing the same dollar figure are
   indistinguishable, and whoever presses Verify first takes the other's
   money.

   The tag closes that. Each pending deposit is given its own exact
   amount: the dollar figure converted to BTC, rounded to the nearest
   hundred satoshis, plus a tag of 1-99 satoshis that no other pending
   deposit holds. Every expected amount is therefore bucket x 100 + tag,
   which stays unique whether or not two deposits are for the same dollar
   figure. The depositor sends at most about a hundred satoshis away from
   what they asked for, roughly ten cents at a six-figure BTC price, and
   is credited the USD value of whatever actually arrives — so the
   difference lands in the amount sent, never in the amount received.

   Ninety-nine slots caps concurrent pending deposits. Past that the
   deposit route says so and asks for a retry, rather than issuing an
   amount that could be mistaken for someone else's.
   ============================================================ */

/** Range of the per-deposit tag, in satoshis. */
export const AMOUNT_TAG_MIN = 1;
export const AMOUNT_TAG_MAX = 99;
const TAG_MODULUS = 100;

/**
 * Builds the exact BTC amount a deposit should receive.
 * `takenTags` are the tags already held by other pending deposits.
 */
export function buildExpectedAmount(
  usdAmount: number,
  rateUsd: number,
  takenTags: number[]
): { expectedBtc: number; tag: number } | null {
  if (!(usdAmount > 0) || !(rateUsd > 0)) return null;

  const taken = new Set(takenTags.filter((t) => Number.isInteger(t)));
  let tag = -1;
  // Start somewhere random so two deposits created in the same second
  // don't queue up on tag 1, then walk forward to the first free slot.
  const start = AMOUNT_TAG_MIN + Math.floor(Math.random() * AMOUNT_TAG_MAX);
  for (let i = 0; i < AMOUNT_TAG_MAX; i++) {
    const candidate = ((start - AMOUNT_TAG_MIN + i) % AMOUNT_TAG_MAX) + AMOUNT_TAG_MIN;
    if (!taken.has(candidate)) {
      tag = candidate;
      break;
    }
  }
  if (tag < 0) return null; // every tag in use — vanishingly unlikely

  const baseSats = Math.round((usdAmount / rateUsd) * SATS_PER_BTC);
  // Nearest bucket rather than the one below, so the drift is split
  // either side of the figure asked for instead of always shaving it
  // down. Below two buckets there is nothing to round into, so the tag
  // goes on top — it would distort a tiny amount rather than label it.
  const sats =
    baseSats < TAG_MODULUS * 2
      ? baseSats + tag
      : Math.round(baseSats / TAG_MODULUS) * TAG_MODULUS + tag;

  return { expectedBtc: sats / SATS_PER_BTC, tag };
}

interface EsploraAddressTx extends EsploraTx {
  status: { confirmed: boolean; block_height?: number };
}

export interface AddressScanResult {
  ok: boolean;
  reason?: string;
  txid?: string;
  btcAmount?: number;
  usdAmount?: number;
  rateUsd?: number;
  confirmations?: number;
}

/**
 * Looks for a payment of exactly `expectedBtc` to `address` that no other
 * deposit has already claimed.
 *
 * Matching is exact to the satoshi. Bitcoin fees are paid by the sender,
 * so the amount received is the amount sent — a tolerance here would
 * only make two tagged deposits collide again.
 */
export async function findPaymentToAddress(
  address: string,
  expectedBtc: number,
  claimedTxids: string[] = []
): Promise<AddressScanResult> {
  try {
    if (!(expectedBtc > 0)) return { ok: false, reason: "amount_not_set" };

    const expectedSats = Math.round(expectedBtc * SATS_PER_BTC);
    const claimed = new Set(claimedTxids.map((t) => t.toLowerCase()));

    const res = await esplora(`/address/${address}/txs`);
    if (!res) return { ok: false, reason: "explorer_unreachable" };
    if (res.status === 400) return { ok: false, reason: "invalid_address" };
    if (res.status === 404) return { ok: false, reason: "payment_not_found" };

    const txs = (await res.json()) as EsploraAddressTx[];
    if (!Array.isArray(txs)) return { ok: false, reason: "explorer_unreachable" };

    const tipRes = await esplora("/blocks/tip/height");
    if (!tipRes || !tipRes.ok) return { ok: false, reason: "explorer_unreachable" };
    const tipHeight = Number((await tipRes.text()).trim());
    if (!Number.isFinite(tipHeight)) return { ok: false, reason: "explorer_unreachable" };

    let waiting: AddressScanResult | null = null;

    for (const tx of txs) {
      if (!tx?.txid || claimed.has(tx.txid.toLowerCase())) continue;

      const sats = (tx.vout ?? [])
        .filter((o) => o.scriptpubkey_address === address)
        .reduce((total, o) => total + (o.value ?? 0), 0);

      if (sats !== expectedSats) continue;

      const btcAmount = sats / SATS_PER_BTC;

      if (!tx.status?.confirmed || !tx.status.block_height) {
        // Found, but still in the mempool where it can be replaced.
        waiting = { ok: false, reason: "insufficient_confirmations", btcAmount, confirmations: 0, txid: tx.txid };
        continue;
      }

      const confirmations = tipHeight - tx.status.block_height + 1;
      if (confirmations < MIN_CONFIRMATIONS) {
        waiting = { ok: false, reason: "insufficient_confirmations", btcAmount, confirmations, txid: tx.txid };
        continue;
      }

      const rateUsd = await fetchBtcUsdRate();
      if (!rateUsd) return { ok: false, reason: "rate_unavailable", btcAmount, confirmations, txid: tx.txid };

      return {
        ok: true,
        txid: tx.txid,
        btcAmount,
        usdAmount: Math.round(btcAmount * rateUsd * 100) / 100,
        rateUsd,
        confirmations
      };
    }

    return waiting ?? { ok: false, reason: "payment_not_found" };
  } catch {
    return { ok: false, reason: "verification_error" };
  }
}
