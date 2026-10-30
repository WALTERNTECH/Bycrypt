"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { FormField, inputClass, buttonClass } from "@/components/FormField";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) {
        setError(data?.error ?? "Could not start a reset just now. Try again shortly.");
        return;
      }
      setSent(data?.message ?? "If that email has a Krypton account, a reset link is on its way.");
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        subtitle={sent}
        footer={
          <>
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-brand">
              Log in
            </Link>
          </>
        }
      >
        <div className="rounded-lg bg-surface-2 p-4">
          <p className="text-xs leading-relaxed text-text-secondary">
            The link works once and expires in an hour. If it doesn&apos;t arrive within a few
            minutes, check your spam folder and try again — and if it still doesn&apos;t come,
            Krypton Support can reset it for you.
          </p>
        </div>
        <button onClick={() => setSent(null)} className="mt-3 text-sm font-semibold text-brand">
          Use a different email
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter the email on your account and we'll send you a link to set a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-brand">
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Email">
          <input
            required
            type="email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </FormField>

        {error && <p className="text-sm text-negative">{error}</p>}

        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthCard>
  );
}
