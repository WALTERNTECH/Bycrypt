import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Instant admin alerts for the events support has to act on: a signup,
 * a deposit awaiting manual crediting, and a withdrawal awaiting payout.
 *
 * Two rules govern everything here:
 *
 *  1. Sending must never break the user's action. A signup or deposit is
 *     the real work; the email is a courtesy. Every failure path returns
 *     quietly rather than throwing, and callers fire this without await
 *     blocking their response.
 *  2. The destination is read from platform_config at send time, so
 *     support can redirect alerts from the admin Config screen without a
 *     redeploy.
 *
 * Delivery uses Resend. With no RESEND_API_KEY set the module is inert —
 * it logs and returns — so the app runs fine before the key is added.
 */

type AlertKind = "signup" | "deposit" | "withdrawal";

interface AlertInput {
  kind: AlertKind;
  userName: string;
  userEmail?: string | null;
  amount?: number | null;
  detail?: string | null;
  /** Deep link into the admin dashboard for the queue that needs action. */
  actionPath?: string;
}

const ADMIN_BASE_URL = process.env.ADMIN_APP_URL ?? "https://krypton-admin.onrender.com";

const SUBJECTS: Record<AlertKind, (i: AlertInput) => string> = {
  signup: (i) => `New signup — ${i.userName}`,
  deposit: (i) =>
    `Deposit to credit — ${i.userName}${i.amount ? ` · ${fmt(i.amount)} USDT` : ""}`,
  withdrawal: (i) =>
    `Withdrawal to process — ${i.userName}${i.amount ? ` · ${fmt(i.amount)} USDT` : ""}`
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

function renderHtml(input: AlertInput, when: string): string {
  const rows: [string, string][] = [["User", input.userName]];
  if (input.userEmail) rows.push(["Email", input.userEmail]);
  if (input.amount != null) rows.push(["Amount", `${fmt(input.amount)} USDT`]);
  if (input.detail) rows.push(["Details", input.detail]);
  rows.push(["Time", when]);

  const rowsHtml = rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:8px 0;color:#6B7480;font-size:13px;">${escapeHtml(k)}</td>
          <td style="padding:8px 0;color:#12161C;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(v)}</td>
        </tr>`
    )
    .join("");

  const href = `${ADMIN_BASE_URL}${input.actionPath ?? "/dashboard"}`;

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F4F5F7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #E1E4EA;border-radius:14px;overflow:hidden;">
    <div style="padding:18px 22px;border-bottom:1px solid #E1E4EA;">
      <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;background:#F0B90B;color:#0A0D12;font-weight:800;border-radius:7px;font-size:14px;">K</span>
      <span style="margin-left:8px;font-weight:800;color:#12161C;font-size:15px;vertical-align:middle;">Krypton Admin</span>
    </div>
    <div style="padding:22px;">
      <p style="margin:0 0 14px;font-size:17px;font-weight:700;color:#12161C;">${escapeHtml(HEADLINES[input.kind])}</p>
      <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
      <a href="${href}" style="display:inline-block;margin-top:20px;padding:11px 18px;background:#F0B90B;color:#0A0D12;font-weight:700;font-size:14px;text-decoration:none;border-radius:9px;">${escapeHtml(CTA[input.kind])}</a>
    </div>
    <div style="padding:14px 22px;background:#F4F5F7;color:#6B7480;font-size:11px;">
      Automated alert from Krypton. Change the destination in Admin → Config.
    </div>
  </div>
</body></html>`;
}

export async function sendAdminAlert(input: AlertInput): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(`[adminEmail] RESEND_API_KEY not set — skipped ${input.kind} alert`);
      return;
    }

    const admin = createAdminClient();
    const { data: rows } = await admin
      .from("platform_config")
      .select("key, value")
      .in("key", ["admin_notification_email", "admin_notification_from"]);

    const cfg = new Map((rows ?? []).map((r) => [r.key, r.value]));
    const to = cfg.get("admin_notification_email");
    const from = cfg.get("admin_notification_from") || "Krypton Alerts <onboarding@resend.dev>";
    if (!to) {
      console.warn("[adminEmail] no admin_notification_email configured — skipped");
      return;
    }

    const when = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC"
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: SUBJECTS[input.kind](input),
        html: renderHtml(input, `${when} UTC`)
      })
    });

    if (!res.ok) {
      console.error(`[adminEmail] ${input.kind} alert failed: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    // Never let an alert failure surface to the user mid-signup/deposit.
    console.error("[adminEmail] unexpected failure", err);
  }
}
