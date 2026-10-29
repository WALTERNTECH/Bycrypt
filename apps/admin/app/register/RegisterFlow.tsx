"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormField, inputClass, buttonClass } from "@/components/FormField";

/**
 * First-run registration for the single admin account.
 *
 * Ordinary Supabase sign-up, then claim_first_admin() takes the seat.
 * The seat can only be claimed while admin_users is empty, and a unique
 * index makes a second row impossible regardless of what this screen
 * does — so a race between two people opening this page at once ends
 * with one admin and one clear error, not two admins.
 */
export function RegisterFlow() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Use at least 10 characters — this account controls every balance on the platform.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setLoading(true);

    // Created server-side with the service role so the account is
    // confirmed on creation. Client sign-up would hand back an
    // unconfirmed user and wait for a mail this project may never send.
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName.trim(), email: email.trim(), password })
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      setError(body.error ?? "Could not create the account.");
      return;
    }

    // Sign straight in — there is nothing left to confirm.
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    setLoading(false);

    if (signInError) {
      setError("Account created. Please sign in.");
      router.replace("/login");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Full name">
        <input
          required
          className={inputClass}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
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
          autoComplete="username"
        />
      </FormField>

      <FormField label="Password" hint="At least 10 characters.">
        <input
          required
          type="password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </FormField>

      <FormField label="Confirm password">
        <input
          required
          type="password"
          className={inputClass}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </FormField>

      {error && <p className="text-sm text-negative">{error}</p>}

      <button type="submit" disabled={loading} className={buttonClass}>
        {loading ? "Creating…" : "Create admin account"}
      </button>
    </form>
  );
}
