"use client";

import { useEffect, useState } from "react";

interface Status {
  configured: boolean;
  provider: "smtp" | "resend" | null;
  to: string | null;
  from: string | null;
  source: Record<string, "env" | "database" | "default" | "missing">;
}

const FIELDS: { key: string; label: string; hint: string; secret?: boolean; placeholder?: string }[] = [
  {
    key: "admin_notification_email",
    label: "Send alerts to",
    hint: "Where signup, deposit and withdrawal alerts are delivered.",
    placeholder: "you@example.com"
  },
  {
    key: "smtp_host",
    label: "SMTP host",
    hint: "For Gmail use smtp.gmail.com. Leave the SMTP fields blank if you'd rather use a Resend key.",
    placeholder: "smtp.gmail.com"
  },
  { key: "smtp_port", label: "SMTP port", hint: "587 for STARTTLS, 465 for TLS.", placeholder: "587" },
  { key: "smtp_user", label: "SMTP username", hint: "Usually the full mailbox address.", placeholder: "you@gmail.com" },
  {
    key: "smtp_pass",
    label: "SMTP password",
    hint: "For Gmail this must be a 16-character App Password, not your normal password.",
    secret: true,
    placeholder: "••••••••••••••••"
  },
  {
    key: "resend_api_key",
    label: "Resend API key",
    hint: "Alternative to SMTP. Until you verify a domain in Resend, it only delivers to your own Resend account address.",
    secret: true,
    placeholder: "re_..."
  }
];

export function EmailSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function refresh() {
    const res = await fetch("/api/email/test");
    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save(key: string) {
    setError(null);
    setSavedKey(null);
    setSavingKey(key);
    const res = await fetch("/api/email/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: values[key] ?? "" })
    });
    setSavingKey(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not save.");
      return;
    }
    setSavedKey(key);
    setValues((v) => ({ ...v, [key]: "" }));
    refresh();
  }

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/email/test", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setTesting(false);
    setTestResult(
      res.ok
        ? { ok: true, message: `Sent via ${String(d.provider ?? "").toUpperCase()} — check the inbox.` }
        : { ok: false, message: d.error ?? "Send failed." }
    );
  }

  const field =
    "w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand";

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">Admin alert emails</p>
          <p className="mt-1 text-xs text-text-secondary">
            Sent the moment a user signs up, submits a deposit, or requests a withdrawal.
          </p>
        </div>
        {status && (
          <span
            className={`rounded-md border px-2.5 py-1 text-[11px] font-bold ${
              status.configured
                ? "border-positive/30 bg-positive/10 text-positive"
                : "border-negative/30 bg-negative/10 text-negative"
            }`}
          >
            {status.configured ? `Active · ${status.provider?.toUpperCase()}` : "Not configured"}
          </span>
        )}
      </div>

      {status && (
        <div className="mt-3 rounded-lg border border-border bg-panel-2 px-3 py-2 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-text-secondary">Destination</span>
            <span className="font-semibold text-text-primary">{status.to ?? "— not set —"}</span>
          </div>
          {status.from && (
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-text-secondary">From</span>
              <span className="font-semibold text-text-primary">{status.from}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {FIELDS.map((f) => {
          const src = status?.source?.[f.key];
          const isSet = src === "env" || src === "database";
          return (
            <div key={f.key}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary">{f.label}</label>
                <span
                  className={`text-[10px] font-bold ${
                    src === "env" ? "text-brand" : isSet ? "text-positive" : "text-text-tertiary"
                  }`}
                >
                  {src === "env" ? "set via env var" : isSet ? "set" : "not set"}
                </span>
              </div>
              <div className="mt-1 flex gap-2">
                <input
                  type={f.secret ? "password" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={isSet && f.secret ? "•••••••• (stored — type to replace)" : f.placeholder}
                  className={field}
                  autoComplete="off"
                />
                <button
                  onClick={() => save(f.key)}
                  disabled={savingKey === f.key}
                  className="shrink-0 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-ink hover:bg-brand-hover disabled:opacity-50"
                >
                  {savingKey === f.key ? "…" : "Save"}
                </button>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-text-tertiary">{f.hint}</p>
              {savedKey === f.key && <p className="mt-1 text-[10px] font-semibold text-positive">Saved.</p>}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs font-medium text-negative">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          onClick={sendTest}
          disabled={testing}
          className="rounded-lg border border-border-strong bg-panel-2 px-4 py-2 text-xs font-bold text-text-primary hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {testing ? "Sending…" : "Send test email"}
        </button>
        {testResult && (
          <p className={`text-xs font-medium ${testResult.ok ? "text-positive" : "text-negative"}`}>
            {testResult.message}
          </p>
        )}
      </div>
    </div>
  );
}
