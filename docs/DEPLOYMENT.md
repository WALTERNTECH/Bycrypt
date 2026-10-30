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

## Simulated positions (test accounts)

Set `profiles.is_simulated = true` on an account and its open positions
drift steadily in their own favour, so the full path — open, watch it climb,
hit the target, auto-close, see the wallet and total assets move — runs in a
couple of minutes rather than waiting on a market that may never oblige.

It answers one question a real market will not answer on demand: *does a
winning position actually credit the wallet.*

```sql
-- turn it on for one account
update public.profiles set is_simulated = true  where id = '<user id>';
-- turn it off
update public.profiles set is_simulated = false where id = '<user id>';
-- who currently has it
select p.id, p.full_name, u.email from public.profiles p
  join auth.users u on u.id = p.id where p.is_simulated;
```

Why a column and not an environment variable, which is what this was first
built as: as a variable it was the whole deployment or nothing. It put a
banner across every screen, and it left the platform one forgotten variable
away from showing simulated figures to real depositors. As a property of an
account it cannot reach anyone who does not carry the flag, and deleting the
test account removes it.

What a flagged account gets:

- A small **Demo** chip beside the avatar. It renders from the same flag, so
  it cannot appear for a real user.
- Withdrawals refused in `request_withdrawal()` with `simulated_account`.
  The balance on such an account is not real money and must not be able to
  leave as though it were — refused at the database rather than relying on
  an operator noticing it in the payout queue.

The drift is deterministic and derived from how long the position has been
open, so the browser and the server compute the same figure and settlement
pays exactly what the screen showed.

## Email change and password recovery

Both depend on a mail provider, because this Supabase project has no SMTP —
the same reason signup is handled server-side. Credentials come from
`secure_config` (RLS on, no policies, service-role only) or from env.

**Password recovery.** `/forgot-password` asks Supabase for a recovery link
with `generateLink`, so the token is Supabase's own single-use expiring one;
only delivery is ours. The reply is identical whether or not the address has
an account — otherwise the endpoint becomes a way to find out who banks here.
`/reset-password` accepts both token shapes (fragment tokens and a `?code=`)
and strips the credential out of the address bar once read.

**Email change.** `/account` → Change email. The current password is
required: the email address is where password resets go, so whoever controls
it controls the account, and a merely-open session must not be able to take
it. The password is checked on a throwaway client that persists nothing, so
the check cannot disturb the caller's session. The old address is emailed
that it happened, which is what makes an unauthorised change visible to the
person it was taken from.

Two things must be set up for these to work end to end:

1. **A verified sending domain in Resend**, with `admin_notification_from`
   set to an address on it. The fallback sender is `onboarding@resend.dev`,
   which Resend only delivers to the account owner's own address — so resets
   to real users silently fail until a domain is verified. The admin
   console's email diagnostics will send a test.
2. **`<site>/reset-password` added to Supabase's Redirect URLs**
   (Authentication → URL Configuration). Without it Supabase ignores the
   `redirectTo` and sends people to the Site URL instead.

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

## cPanel (Spaceship)

```bash
node scripts/build-cpanel.mjs
```

Writes `build/cpanel/krypton-web-cpanel.zip` and `krypton-admin-cpanel.zip`.
Each is a self-contained Node application built from Next's standalone
output: the server plus only the node_modules it actually reaches, about
6MB rather than the ~400MB a full install would be. **Do not run NPM
Install on the server** — everything needed is in the zip, and a full
install is where shared hosting usually runs out of memory.

This is not a static site. It needs a long-running Node process, so it is
set up through cPanel's **Setup Node.js App**, not by dropping files into
public_html. Each app gets its own application and its own domain or
subdomain. Full instructions are in the README inside each zip.

The zip is written by the script rather than by system tooling because a
zip built with Windows tooling can carry backslashes in its entry names,
and those extract on a Linux host as files with backslashes in the
filename instead of as directories.

Worth knowing before moving: Next on shared hosting is workable but
fragile. Passenger stops an idle process, so the first request after a
quiet spell pays the whole cold start, and memory limits are tight. The
Vercel deployment is the more reliable home for this stack.

## Building the zip

```bash
node scripts/build-zip.mjs --latest
```

Writes `build/krypton-<date>-<sha>.zip` from the current commit. Uncommitted
work is not in it and the script says so. It refuses to vouch for a bundle
containing env files, `node_modules` or build output.
