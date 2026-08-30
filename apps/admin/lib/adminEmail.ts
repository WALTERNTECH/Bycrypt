import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Instant admin alerts for the events support has to act on: a signup,
 * a deposit awaiting manual crediting, and a withdrawal awaiting payout.
 *
 * Rules that shape this module:
 *
 *  1. Sending must never break the user's action. A signup or deposit is
 *     the real work; the alert is a courtesy. Every failure path returns
 *     a result object rather than throwing, and callers fire it without
 *     blocking their response.
 *  2. Credentials are read from secure_config (RLS on, no policies, so
 *     service-role only) or from env, with env taking precedence. They
 *     are never put in platform_config, which is world-readable.
 *  3. Two transports are supported because the easiest credential to
 *     obtain differs by operator: an SMTP app password on a mailbox you
 *     already own, or a Resend API key.
 */

type AlertKind = "signup" | "deposit" | "withdrawal";

interface AlertInput {
  kind: AlertKind;
  userName: string;
  userEmail?: string | null;
  amount?: number | null;
  detail?: string | null;
  actionPath?: string;
}

export interface SendResult {
  ok: boolean;
  provider?: "smtp" | "resend";
  error?: string;
}

export interface EmailStatus {
  configured: boolean;
  provider: "smtp" | "resend" | null;
  to: string | null;
  from: string | null;
  /** Where each value came from, for the admin diagnostics panel. */
  source: Record<string, "env" | "database" | "default" | "missing">;
}

// Resolved per call rather than captured at module load: on
// cPanel/Passenger the process is panel-managed and env changes land on
// restart, so a module-scope capture is easy to get stale.
function adminBaseUrl(): string {
  return process.env.ADMIN_APP_URL ?? "https://krypton-admin.onrender.com";
}
const SEND_TIMEOUT_MS = 15_000;

const SECURE_KEYS = [
  "admin_notification_email",
  "admin_notification_from",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "resend_api_key"
] as const;

type SecureKey = (typeof SECURE_KEYS)[number];

const ENV_FOR: Record<SecureKey, string> = {
  admin_notification_email: "ADMIN_NOTIFICATION_EMAIL",
  admin_notification_from: "ADMIN_NOTIFICATION_FROM",
  smtp_host: "SMTP_HOST",
  smtp_port: "SMTP_PORT",
  smtp_user: "SMTP_USER",
  smtp_pass: "SMTP_PASS",
  resend_api_key: "RESEND_API_KEY"
};

interface Settings {
  values: Partial<Record<SecureKey, string>>;
  source: Record<string, "env" | "database" | "default" | "missing">;
}

async function loadSettings(): Promise<Settings> {
  const values: Partial<Record<SecureKey, string>> = {};
  const source: Record<string, "env" | "database" | "default" | "missing"> = {};

  let rows: { key: string; value: string }[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("secure_config").select("key, value");
    rows = data ?? [];
  } catch {
    // Fall through to env-only; a DB hiccup shouldn't disable env config.
  }
  const fromDb = new Map(rows.map((r) => [r.key, r.value]));

  for (const key of SECURE_KEYS) {
    const envVal = process.env[ENV_FOR[key]]?.trim();
    const dbVal = fromDb.get(key)?.trim();
    if (envVal) {
      values[key] = envVal;
      source[key] = "env";
    } else if (dbVal) {
      values[key] = dbVal;
      source[key] = "database";
    } else {
      source[key] = "missing";
    }
  }
  return { values, source };
}

function resolveProvider(v: Partial<Record<SecureKey, string>>): "smtp" | "resend" | null {
  if (v.smtp_host && v.smtp_user && v.smtp_pass) return "smtp";
  if (v.resend_api_key) return "resend";
  return null;
}

function defaultFrom(provider: "smtp" | "resend" | null, v: Partial<Record<SecureKey, string>>): string {
  if (v.admin_notification_from) return v.admin_notification_from;
  // SMTP servers reject a From that isn't the authenticated mailbox, so
  // default to the login rather than a generic address.
  if (provider === "smtp" && v.smtp_user) return `Krypton Alerts <${v.smtp_user}>`;
  return "Krypton Alerts <onboarding@resend.dev>";
}

export async function getEmailStatus(): Promise<EmailStatus> {
  const { values, source } = await loadSettings();
  const provider = resolveProvider(values);
  return {
    configured: provider !== null && Boolean(values.admin_notification_email),
    provider,
    to: values.admin_notification_email ?? null,
    from: provider ? defaultFrom(provider, values) : null,
    source
  };
}

/* ---------------------------------------------------------------- render */

const SUBJECTS: Record<AlertKind, (i: AlertInput) => string> = {
  signup: (i) => `New signup — ${i.userName}`,
  deposit: (i) => `Deposit to credit — ${i.userName}${i.amount ? ` · ${fmt(i.amount)} USDT` : ""}`,
  withdrawal: (i) => `Withdrawal to process — ${i.userName}${i.amount ? ` · ${fmt(i.amount)} USDT` : ""}`
};

const HEADLINES: Record<AlertKind, string> = {
  signup: "A new user just signed up",
  deposit: "A deposit is waiting to be credited",
  withdrawal: "A withdrawal is waiting to be processed"
};

const CTA: Record<AlertKind, string> = {
  signup: "View user",
  deposit: "Open deposit queue",
  withdrawal: "Open withdrawal queue"
};

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

function renderHtml(headline: string, cta: string, href: string, rows: [string, string][]): string {
  const rowsHtml = rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:8px 0;color:#6B7480;font-size:13px;">${escapeHtml(k)}</td>
          <td style="padding:8px 0;color:#12161C;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(v)}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F4F5F7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #E1E4EA;border-radius:14px;overflow:hidden;">
    <div style="padding:18px 22px;border-bottom:1px solid #E1E4EA;">
      <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;background:#F0B90B;color:#0A0D12;font-weight:800;border-radius:7px;font-size:14px;">K</span>
      <span style="margin-left:8px;font-weight:800;color:#12161C;font-size:15px;vertical-align:middle;">Krypton Admin</span>
    </div>
    <div style="padding:22px;">
      <p style="margin:0 0 14px;font-size:17px;font-weight:700;color:#12161C;">${escapeHtml(headline)}</p>
      <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
      <a href="${href}" style="display:inline-block;margin-top:20px;padding:11px 18px;background:#F0B90B;color:#0A0D12;font-weight:700;font-size:14px;text-decoration:none;border-radius:9px;">${escapeHtml(cta)}</a>
    </div>
    <div style="padding:14px 22px;background:#F4F5F7;color:#6B7480;font-size:11px;">
      Automated alert from Krypton. Change the destination in Admin &rarr; Config.
    </div>
  </div>
</body></html>`;
}

/* ------------------------------------------------------------------ send */

async function deliver(
  to: string,
  from: string,
  subject: string,
  html: string,
  provider: "smtp" | "resend",
  v: Partial<Record<SecureKey, string>>
): Promise<SendResult> {
  if (provider === "smtp") {
    const port = Number(v.smtp_port ?? 587);
    const transporter = nodemailer.createTransport({
      host: v.smtp_host,
      port,
      // 465 is implicit TLS; 587 upgrades via STARTTLS.
      secure: port === 465,
      auth: { user: v.smtp_user!, pass: v.smtp_pass! },
      connectionTimeout: SEND_TIMEOUT_MS,
      greetingTimeout: SEND_TIMEOUT_MS,
      socketTimeout: SEND_TIMEOUT_MS
    });
    await transporter.sendMail({ from, to, subject, html });
    return { ok: true, provider: "smtp" };
  }

  // A hung provider must not hold the request open indefinitely.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${v.resend_api_key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
      signal: ctl.signal
    });
    if (!res.ok) return { ok: false, provider: "resend", error: `${res.status} ${await res.text()}` };
    return { ok: true, provider: "resend" };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendAdminAlert(input: AlertInput): Promise<SendResult> {
  try {
    const { values } = await loadSettings();
    const provider = resolveProvider(values);
    const to = values.admin_notification_email;

    if (!provider) {
      console.warn(`[adminEmail] no mail provider configured — skipped ${input.kind} alert`);
      return { ok: false, error: "no_provider" };
    }
    if (!to) {
      console.warn("[adminEmail] no destination configured — skipped");
      return { ok: false, error: "no_destination" };
    }

    const when = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC"
    });

    const rows: [string, string][] = [["User", input.userName]];
    if (input.userEmail) rows.push(["Email", input.userEmail]);
    if (input.amount != null) rows.push(["Amount", `${fmt(input.amount)} USDT`]);
    if (input.detail) rows.push(["Details", input.detail]);
    rows.push(["Time", `${when} UTC`]);

    const result = await deliver(
      to,
      defaultFrom(provider, values),
      SUBJECTS[input.kind](input),
      renderHtml(HEADLINES[input.kind], CTA[input.kind], `${adminBaseUrl()}${input.actionPath ?? "/dashboard"}`, rows),
      provider,
      values
    );

    if (!result.ok) console.error(`[adminEmail] ${input.kind} alert failed: ${result.error}`);
    return result;
  } catch (err) {
    console.error("[adminEmail] unexpected failure", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Used by the admin diagnostics panel so failures are visible, not buried in logs. */
export async function sendTestEmail(): Promise<SendResult> {
  try {
    const { values } = await loadSettings();
    const provider = resolveProvider(values);
    const to = values.admin_notification_email;
    if (!provider) return { ok: false, error: "No mail provider configured — add SMTP details or a Resend API key." };
    if (!to) return { ok: false, error: "No destination address configured." };

    const when = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
    return await deliver(
      to,
      defaultFrom(provider, values),
      "Krypton — test alert",
      renderHtml("Email alerts are working", "Open dashboard", `${adminBaseUrl()}/dashboard`, [
        ["Provider", provider.toUpperCase()],
        ["Destination", to],
        ["Time", `${when} UTC`]
      ]),
      provider,
      values
    );
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
