"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { Logo } from "@/components/Logo";

type Step = "password" | "enroll" | "verify";

export function AdminLoginFlow() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !signInData.user) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }

    // Confirm this account is a registered, active admin (self-read RLS
    // policy allows this at aal1 — see admin_users_select_self).
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

    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verifiedTotp = factorsData?.totp?.find((f) => f.status === "verified");

    if (verifiedTotp) {
      setFactorId(verifiedTotp.id);
      setStep("verify");
      setLoading(false);
      return;
    }

    // No TOTP factor yet — enroll now (required before any admin data is reachable).
    const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setLoading(false);
    if (enrollError || !enrollData) {
      setError("Could not start two-factor setup. Please try again.");
      return;
    }
    setFactorId(enrollData.id);
    setQrCode(enrollData.totp.qr_code);
    setSecret(enrollData.totp.secret);
    setStep("enroll");
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError(null);
    setLoading(true);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setLoading(false);

    if (verifyError) {
      setError("That code didn't work. Check your authenticator app and try again.");
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
          {step === "password" && (
            <>
              <h1 className="text-xl font-bold text-text-primary">Admin sign in</h1>
              <p className="mt-1 text-sm text-text-secondary">Staff access only. Two-factor authentication required.</p>
              <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit}>
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
                  {loading ? "Signing in…" : "Continue"}
                </button>
              </form>
            </>
          )}

          {step === "enroll" && (
            <>
              <h1 className="text-xl font-bold text-text-primary">Set up two-factor authentication</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Required for every admin account. Scan this in Google Authenticator, 1Password, or
                any TOTP app.
              </p>
              {qrCode && (
                <div className="mt-5 flex justify-center rounded-lg bg-white p-3">
                  {/* qr_code from Supabase is an SVG data URI */}
                  <img src={qrCode} alt="TOTP QR code" className="h-44 w-44" />
                </div>
              )}
              {secret && (
                <p className="mt-3 break-all rounded-lg border border-border bg-panel-2 px-3 py-2 text-center font-mono text-xs text-text-secondary">
                  {secret}
                </p>
              )}
              <form className="mt-5 space-y-4" onSubmit={handleCodeSubmit}>
                <FormField label="6-digit code">
                  <input
                    required
                    inputMode="numeric"
                    maxLength={6}
                    className={`${inputClass} text-center tracking-[0.5em]`}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </FormField>
                {error && <p className="text-sm text-negative">{error}</p>}
                <button type="submit" disabled={loading} className={`${buttonClass} w-full`}>
                  {loading ? "Verifying…" : "Enable & continue"}
                </button>
              </form>
            </>
          )}

          {step === "verify" && (
            <>
              <h1 className="text-xl font-bold text-text-primary">Enter your 6-digit code</h1>
              <p className="mt-1 text-sm text-text-secondary">From your authenticator app.</p>
              <form className="mt-5 space-y-4" onSubmit={handleCodeSubmit}>
                <FormField label="6-digit code">
                  <input
                    required
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    className={`${inputClass} text-center tracking-[0.5em]`}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </FormField>
                {error && <p className="text-sm text-negative">{error}</p>}
                <button type="submit" disabled={loading} className={`${buttonClass} w-full`}>
                  {loading ? "Verifying…" : "Verify & continue"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
