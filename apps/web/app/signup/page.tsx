"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { SecretInput } from "@/components/SecretInput";
import { isValidTransactionKey } from "@/lib/transactionKey";

export default function SignupPage() {
  const router = useRouter();
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    setRefCode(new URLSearchParams(window.location.search).get("ref"));
  }, []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [transactionKey, setTransactionKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agreed) {
      setError("You must accept the Terms to continue.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!isValidTransactionKey(transactionKey)) {
      setError("Transaction key must be 6-32 letters/numbers.");
      return;
    }
    if (transactionKey !== confirmKey) {
      setError("Transaction keys don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          transaction_key: transactionKey,
          ref_code: refCode || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong creating your account.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Just the basics — deposit and manage investments in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand">
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="Full name">
          <input
            required
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
          />
        </FormField>
        <FormField label="Email">
          <input
            required
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </FormField>
        <FormField label="Password" hint="At least 8 characters.">
          <input
            required
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </FormField>

        <div className="rounded-lg border border-border bg-surface shadow-card-2 p-3.5">
          <p className="text-sm font-medium text-text-primary">Transaction key</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            A separate key you'll enter to authorize every deposit and withdrawal — keep it safe,
            it's not your login password.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <FormField label="Set transaction key">
              <SecretInput required value={transactionKey} onChange={setTransactionKey} placeholder="6-32 letters/numbers" />
            </FormField>
            <FormField label="Confirm transaction key">
              <SecretInput required value={confirmKey} onChange={setConfirmKey} placeholder="Re-enter key" />
            </FormField>
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 accent-brand"
          />
          I accept Krypton's Terms of Service and understand that returns are variable and are
          never guaranteed.
        </label>

        {refCode && (
          <p className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-xs text-brand">
            Referred with code {refCode}
          </p>
        )}

        {error && <p className="text-sm text-negative">{error}</p>}

        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
