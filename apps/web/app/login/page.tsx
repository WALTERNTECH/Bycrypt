"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/AuthCard";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { PasswordField } from "@/components/PasswordField";

/**
 * Log in.
 *
 * Matched to the signup screen: same two fields, same reveal toggle, same
 * absence of explanatory lines. The password rules are off here — they
 * belong where a password is being chosen, not where an existing one is
 * being typed.
 *
 * Supabase's own error text is not passed through. "Invalid login
 * credentials" is the message for a wrong password and for an email with
 * no account, and showing it verbatim both reads as a system fault and
 * quietly confirms which addresses are registered.
 */
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    setLoading(false);

    if (signInError) {
      setError(
        /invalid login credentials/i.test(signInError.message)
          ? "That email and password don't match an account."
          : signInError.message
      );
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard
      title="Log in"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-brand">
            Sign up
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FormField label="Email">
          <input
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>

        <PasswordField
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          showRules={false}
        />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs font-semibold text-brand">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="rounded-lg bg-negative-dim px-3 py-2.5 text-[12px] leading-relaxed text-negative">
            {error}
          </p>
        )}

        <button type="submit" disabled={!canSubmit} className={buttonClass}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthCard>
  );
}
