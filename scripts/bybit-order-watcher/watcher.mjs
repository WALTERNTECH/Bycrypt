#!/usr/bin/env node
// Bybit order watcher — connects to Bybit's private v5 WebSocket feed and
// logs full details of every order the moment it's received/updated/filled.
//
// Usage:
//   npm install
//   cp .env.example .env   # then fill in your API key/secret
//   npm start
//
// Read-only by design: only ever subscribes to private data streams. Never
// place a Bybit API key here with "Trade" or "Withdraw" permission — a
// "read-only" key is all this needs.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "logs");
fs.mkdirSync(LOG_DIR, { recursive: true });

const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;
const USE_TESTNET = /^true$/i.test(process.env.BYBIT_TESTNET ?? "false");

if (!API_KEY || !API_SECRET) {
  console.error("Set BYBIT_API_KEY and BYBIT_API_SECRET in scripts/bybit-order-watcher/.env first.");
  process.exit(1);
}

const WS_URL = USE_TESTNET
  ? "wss://stream-testnet.bybit.com/v5/private"
  : "wss://stream.bybit.com/v5/private";

// Topics: "order" fires on every status change (New, PartiallyFilled,
// Filled, Cancelled, Rejected, ...) with the full order record.
// "execution" fires once per fill with exact fill price/qty/fee.
const TOPICS = ["order", "execution", "wallet"];

const PING_INTERVAL_MS = 20_000;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 60_000;

let reconnectDelay = RECONNECT_BASE_MS;
let pingTimer = null;

function logLine(text) {
  const stamp = new Date().toISOString();
  console.log(`[${stamp}] ${text}`);
}

function appendToFile(record) {
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(LOG_DIR, `orders-${day}.jsonl`);
  fs.appendFileSync(file, JSON.stringify(record) + "\n");
}

function sign(expires) {
  return crypto.createHmac("sha256", API_SECRET).update(`GET/realtime${expires}`).digest("hex");
}

function fmtMoney(n) {
  if (n === undefined || n === null || n === "") return "-";
  return n;
}

function describeOrder(o) {
  return (
    `ORDER  ${o.orderStatus?.padEnd(15) ?? ""} ${o.symbol} ${o.side} ${o.orderType} ` +
    `qty=${fmtMoney(o.qty)} price=${fmtMoney(o.price)} avgPrice=${fmtMoney(o.avgPrice)} ` +
    `filled=${fmtMoney(o.cumExecQty)} execValue=${fmtMoney(o.cumExecValue)} fee=${fmtMoney(o.cumExecFee)} ` +
    `orderId=${o.orderId}`
  );
}

function describeExecution(e) {
  return (
    `FILL   ${e.symbol} ${e.side} qty=${fmtMoney(e.execQty)} price=${fmtMoney(e.execPrice)} ` +
    `fee=${fmtMoney(e.execFee)} orderId=${e.orderId} execId=${e.execId}`
  );
}

function connect() {
  logLine(`Connecting to ${WS_URL} (${USE_TESTNET ? "TESTNET" : "MAINNET"})...`);
  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    const expires = Date.now() + 10_000;
    ws.send(JSON.stringify({ op: "auth", args: [API_KEY, expires, sign(expires)] }));
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // Auth response
    if (msg.op === "auth") {
      if (msg.success) {
        logLine("Authenticated. Subscribing to: " + TOPICS.join(", "));
        ws.send(JSON.stringify({ op: "subscribe", args: TOPICS }));
        reconnectDelay = RECONNECT_BASE_MS;
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: "ping" }));
        }, PING_INTERVAL_MS);
      } else {
        logLine("Auth FAILED: " + JSON.stringify(msg));
      }
      return;
    }

    if (msg.op === "subscribe") {
      if (!msg.success) logLine("Subscribe FAILED: " + JSON.stringify(msg));
      return;
    }

    if (msg.op === "pong" || msg.ret_msg === "pong") return;

    // Data push
    if (msg.topic === "order" && Array.isArray(msg.data)) {
      for (const o of msg.data) {
        logLine(describeOrder(o));
        appendToFile({ receivedAt: new Date().toISOString(), topic: "order", data: o });
      }
    } else if (msg.topic === "execution" && Array.isArray(msg.data)) {
      for (const e of msg.data) {
        logLine(describeExecution(e));
        appendToFile({ receivedAt: new Date().toISOString(), topic: "execution", data: e });
      }
    } else if (msg.topic === "wallet" && Array.isArray(msg.data)) {
      appendToFile({ receivedAt: new Date().toISOString(), topic: "wallet", data: msg.data });
    }
  });

  ws.on("close", (code) => {
    clearInterval(pingTimer);
    logLine(`Connection closed (code ${code}). Reconnecting in ${Math.round(reconnectDelay / 1000)}s...`);
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
  });

  ws.on("error", (err) => {
    logLine("WebSocket error: " + err.message);
  });
}

connect();

process.on("SIGINT", () => {
  logLine("Shutting down.");
  process.exit(0);
});
