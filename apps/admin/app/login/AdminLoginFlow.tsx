"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { Logo } from "@/components/Logo";

export function AdminLoginFlow() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !signInData.user) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }

    // Confirm this account is a registered, active admin.
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", signInData.user.id)
      .maybeSingle();

    if (!adminRow) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account is not authorized for admin access.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border/60 bg-panel p-7 sm:p-8">
          <h1 className="text-xl font-bold text-text-primary">Admin sign in</h1>
          <p className="mt-1 text-sm text-text-secondary">Staff access only.</p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <FormField label="Email">
              <input
                required
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
            <FormField label="Password">
              <input
                required
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
            {error && <p className="text-sm text-negative">{error}</p>}
            <button type="submit" disabled={loading} className={`${buttonClass} w-full`}>
              {loading ? "Signing in…" : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
