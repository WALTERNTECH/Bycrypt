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
    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    // Email confirmation may be required, in which case there is no
    // session yet and the seat cannot be claimed until they confirm.
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      setError(
        "Account created. Confirm the address from the email we just sent, then sign in to finish setup."
      );
      return;
    }

    const { error: claimError } = await supabase.rpc("claim_first_admin", {
      p_full_name: fullName.trim()
    });

    setLoading(false);

    if (claimError) {
      setError(
        claimError.message.includes("admin_already_exists")
          ? "An admin account already exists. Registration is closed."
          : "Could not complete setup. Please try signing in."
      );
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
