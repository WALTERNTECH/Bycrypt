# Bybit order watcher

Standalone script — not part of the Krypton web apps — that connects to
your Bybit account over its private v5 WebSocket feed and logs the full
details of every order the moment it's placed, updated, or filled: symbol,
side, order type, quantity, price, average fill price, cumulative filled
value, fees, status, order ID, timestamps.

## 1. Create a read-only Bybit API key

1. Log in to Bybit → **Profile → API Management → Create New Key**.
2. Choose **System-generated API Keys**, and under permissions enable only
   **read** access for Orders/Positions/Wallet.
3. **Do not enable Trade or Withdraw permission.** This tool never places
   orders or moves funds — it only listens.
4. Optionally restrict the key to your IP address for extra safety.
5. Copy the API Key and API Secret — the secret is shown once.

## 2. Configure

```bash
cd scripts/bybit-order-watcher
npm install
cp .env.example .env
```

Edit `.env` and paste in `BYBIT_API_KEY` / `BYBIT_API_SECRET`. Leave
`BYBIT_TESTNET=false` for your real account, or `true` to test against
Bybit's testnet first (with a separate testnet key from
https://testnet.bybit.com).

## 3. Run

```bash
npm start
```

You'll see one line per order/fill in the terminal, e.g.:

```
[2026-09-03T10:15:02.123Z] ORDER  Filled          BTCUSDT Buy Market qty=0.01 price=- avgPrice=61234.5 filled=0.01 execValue=612.345 fee=0.337 orderId=abc123...
[2026-09-03T10:15:02.140Z] FILL   BTCUSDT Buy qty=0.01 price=61234.5 fee=0.337 orderId=abc123... execId=xyz789...
```

Every event is also appended as raw JSON (one object per line) to
`logs/orders-YYYY-MM-DD.jsonl`, so nothing is lost even if you're not
watching the terminal — pipe or `tail -f` that file, or parse it into
whatever you build next (a database, a dashboard, an alert).

The connection auto-reconnects with backoff if it drops, and re-sends a
`ping` every 20s to satisfy Bybit's keepalive requirement.

## Notes

- This subscribes to the `order`, `execution`, and `wallet` private topics
  — see Bybit's [v5 WebSocket docs](https://bybit-exchange.github.io/docs/v5/websocket/private/order)
  for the full field reference of each payload.
- `.env` is gitignored — never commit real API keys.
- If you later want this feeding the Krypton admin dashboard (e.g. to
  auto-populate `accrued_return` instead of logging it by hand), the next
  step is writing each parsed order into a Supabase table from this same
  message handler.
