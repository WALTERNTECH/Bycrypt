# Bycrypt

Automated crypto trading & custody platform. Built from the Bycrypt PRD and
Technical Design Document (v1.0), adapted per client decisions to:

- **Next.js 14 + Supabase** instead of separate NestJS APIs + Redis/BullMQ
  (same schema, same API contracts, same security requirements — less
  infrastructure to run).
- **Crypto-only** market data for v1 (Binance, no API key required). Stocks
  and futures were dropped from scope.
- **Two apps, one database**: the public site and the admin dashboard are
  fully isolated applications (separate deploys, separate auth, separate
  domains), talking to the same Supabase Postgres project — matching TDD
  Section 6.4.

## Structure

```
bycrypt/
├── apps/
│   ├── web/     # Public site — users only (deposit, invest, withdraw, live markets)
│   └── admin/   # Admin dashboard — staff only, TOTP-gated
├── supabase/
│   └── migrations/   # Full schema, RLS policies, scheduled jobs (applied already)
└── scripts/
    └── seed-admin.mjs   # One-time super_admin creation (never via public signup)
```

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase — Postgres, Auth (JWT + built-in TOTP/MFA), Row Level
  Security, pg_cron (investment maturity sweep)
- **Charts**: TradingView Lightweight Charts
- **Market data**: Binance public REST + WebSocket, fetched directly from
  the browser (no backend relay needed)
- **Deposit verification**: TronWeb + TronGrid, run synchronously in a
  Next.js Route Handler on deposit submission, with poll-driven retry
  instead of a job queue
- **Hosting**: Render (two web services)

## Environment variables

See `.env.example` in each app. Required for both:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API (**secret**, server-only) |
| `TRONGRID_API_KEY` | Optional — raises TronGrid's public rate limit |

The **receiving TRC20 wallet address** is *not* an env var — it's stored in
`platform_config` in the database and edited from the admin app's Config
page, so it can change without a redeploy.

## First-time setup after deploy

1. In the admin app's Config page (or directly in Supabase), set
   `receiving_wallet_address` to the real TRC20 address. Deposits are
   disabled on the public site until this is a real address.
2. Create the first super_admin:
   ```bash
   SUPABASE_URL=https://rxqbguwxgxxxsrrkjadc.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
   node scripts/seed-admin.mjs "you@example.com" "a-strong-password" "Your Name"
   ```
3. Log in to the admin app — you'll be prompted to enroll TOTP immediately;
   there is no admin access without it.
4. Verify the deposit flow end-to-end with a small real TRC20/USDT transfer
   before announcing the platform is live.

## What's intentionally NOT implemented

- **The trading bot itself.** Per the PRD/TDD, the bot's trading account
  and execution are the client's own infrastructure, outside this
  codebase. `accrued_return` is a value admins log manually (Investments
  page) against actual trading performance.
- **Automated crypto payouts.** Bycrypt never holds a TRON private key or
  broadcasts transactions. Admins approve a withdrawal, send the payout
  manually from the platform's own wallet, then record the resulting
  tx_hash — this matches PRD Section 10 ("Bycrypt's system does not
  custody funds long-term").
- **Email/SMS notifications.** In-app notifications are fully wired,
  console-only for now — add Resend/SendGrid + Africa's Talking credentials
  later to enable delivery (Section 6.3 of the TDD).
- **Stocks & futures market data.**
