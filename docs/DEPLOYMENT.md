# Running Krypton

Two Next.js apps out of one repository:

| App | Path | Production |
|---|---|---|
| Customer app | `apps/web` | https://web-kappa-six-tj55wxcgtb.vercel.app |
| Admin console | `apps/admin` | https://krypton-admin.vercel.app |

Database, auth and row-level security are Supabase (project `wbduprgcuuxbgsjnixcf`).

## Environment

Both apps need these. They are set per Vercel project and are **not** in the
repository or in the zip.

| Variable | Apps | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web, admin | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web, admin | Public key, RLS applies |
| `SUPABASE_SERVICE_ROLE_KEY` | web, admin | **Bypasses every RLS policy.** Env panel only — never in a file inside a web-served app root, never in `platform_config` |
| `ADMIN_APP_URL` | web | Used in admin alert emails |
| `RESEND_API_KEY` | web, admin | Optional; alert emails are skipped without it |
| `NEXT_PUBLIC_KRYPTON_SIM_MARKET` | web | Optional. See below |

## Simulated market mode

`NEXT_PUBLIC_KRYPTON_SIM_MARKET=1` makes an open position drift steadily in
its own favour, so the full path — open, watch it climb, hit the target,
auto-close, see the wallet and total assets move — runs in a couple of
minutes instead of waiting on a market that may never oblige.

It exists to answer one question a real market will not answer on demand:
*does a winning position actually credit the wallet.*

- The drift is deterministic and derived from how long the position has been
  open, so the browser and the server compute the same figure and settlement
  pays exactly what the screen showed.
- Every screen carries a black banner saying the figures are simulated while
  it is on.
- It is an environment variable rather than a flag in the code so there is
  nothing to find and strip out later. **A deployment that does not set it
  cannot be in this mode.**

**Before production: delete the variable and redeploy.** Confirm by checking
that the banner is gone.

```bash
vercel env rm NEXT_PUBLIC_KRYPTON_SIM_MARKET production
vercel --prod
```

## Market data

`lib/market.ts` asks Bybit, then OKX, then Coinbase, then Binance, and takes
the first real answer.

This is not redundancy for its own sake. Binance answers HTTP 451 to US IP
addresses and Vercel runs these functions in `iad1`; Bybit is blocked from
there too. When the app called Binance alone, every server-side price lookup
returned `null` and four separate features silently fell back to defaults —
positions opened on the wrong side with no entry price, settlement credited
the stake exactly so closing never moved the wallet, and deposits could not
be priced at all. Nothing threw, so nothing surfaced.

Check which venues a deployment can actually reach:

```
GET /api/health/market
```

It returns a price per venue, the region, and whether candles resolve. If
`ok` is false, orders open without an entry price, settlement credits the
stake exactly, and deposits cannot start. Two reachable venues is the
minimum worth running on.

## Deposits

Bitcoin only, to the address in `platform_config.receiving_wallet_address`.

There is no transaction ID to paste. Each pending deposit is issued its own
exact amount — the dollar figure converted to BTC, rounded to the nearest
hundred satoshis, plus a tag of 1–99 satoshis that no other pending deposit
holds. Pressing Verify scans the receiving address for a payment of exactly
that amount with at least 2 confirmations.

The tag is what makes this safe. On one shared address, two people depositing
the same dollar figure are otherwise indistinguishable, and whoever pressed
Verify first would take the other's money. It caps concurrent pending
deposits at 99; past that the route says so rather than issuing an amount
that could be confused with someone else's.

The depositor sends up to about a hundred satoshis away from what they asked
for and is credited the USD value of whatever actually arrives, so the
difference lands in the amount sent, never in the amount received.

## Building the zip

```bash
node scripts/build-zip.mjs --latest
```

Writes `build/krypton-<date>-<sha>.zip` from the current commit. Uncommitted
work is not in it and the script says so. It refuses to vouch for a bundle
containing env files, `node_modules` or build output.
