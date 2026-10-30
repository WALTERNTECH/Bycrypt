"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { PasswordField, passwordMeetsRules } from "@/components/PasswordField";

/**
 * Sign up.
 *
 * Stripped to the fields and nothing else. There was a placeholder name
 * in the first box, a sentence under the heading and a hint under the
 * password, and none of them told anyone anything a labelled field does
 * not already say — a box labelled Full name does not need "Jane Doe"
 * greyed out inside it, and that greyed-out text is routinely mistaken
 * for a value already entered.
 *
 * What replaces the explanations is feedback. The password rules check
 * themselves as you type, the email is validated on the way out of the
 * field rather than on submit, and the button is only live once the form
 * would actually be accepted. Nothing is refused without the reason
 * already being visible.
 */
export default function SignupPage() {
  const router = useRouter();
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    setRefCode(new URLSearchParams(window.location.search).get("ref"));
  }, []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailError = emailTouched && email.length > 0 && !emailValid;
  const canSubmit =
    fullName.trim().length > 0 && emailValid && passwordMeetsRules(password) && agreed && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          ref_code: refCode || null
        })
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) {
        setError(data?.error ?? "Could not create your account. Try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Sign up"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand">
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FormField label="Full name">
          <input
            required
            autoComplete="name"
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </FormField>

        <div>
          <FormField label="Email">
            <input
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              className={`${inputClass} ${emailError ? "border-negative focus:border-negative focus:ring-negative/30" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
            />
          </FormField>
          {emailError && <p className="mt-1.5 text-[11px] font-medium text-negative">Enter a valid email address.</p>}
        </div>

        <PasswordField value={password} onChange={setPassword} />

        {refCode && (
          <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2.5">
            <span className="text-xs font-medium text-text-secondary">Referral Code</span>
            <span className="mono-num text-xs font-bold text-text-primary">{refCode}</span>
          </div>
        )}

        <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-text-secondary">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand"
          />
          <span>
            I have read and agree to Krypton&apos;s Terms of Service, and understand that the value
            of a position can fall as well as rise.
          </span>
        </label>

        {error && (
          <p className="rounded-lg bg-negative-dim px-3 py-2.5 text-[12px] leading-relaxed text-negative">
            {error}
          </p>
        )}

        <button type="submit" disabled={!canSubmit} className={buttonClass}>
          {loading ? "Signing up…" : "Sign up"}
        </button>
      </form>
    </AuthCard>
  );
}
