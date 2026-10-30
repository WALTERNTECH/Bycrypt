"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { PasswordField, passwordMeetsRules } from "@/components/PasswordField";
import { createClient } from "@/lib/supabase/client";

type Stage = "opening" | "ready" | "expired" | "done";

/**
 * Where a reset link lands.
 *
 * Supabase hands the session back in one of two shapes depending on the
 * flow the link was minted under: tokens in the URL fragment, or a code
 * in the query string. Both are handled, because which one arrives is not
 * something this page gets to choose.
 *
 * The fragment is stripped from the address bar as soon as it has been
 * read. It carries a live session, and leaving it there puts it in
 * browser history and in anything the user pastes the URL into.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>("opening");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const problem = hash.get("error_description") ?? query.get("error_description");
      if (problem) {
        if (!cancelled) {
          setLinkError(problem.replace(/\+/g, " "));
          setStage("expired");
        }
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = query.get("code");

      try {
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Someone opened this page without coming through a link. An
          // existing session is fine — changing your own password while
          // signed in is a legitimate way to arrive here.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            if (!cancelled) setStage("expired");
            return;
          }
        }

        // Clear the credential out of the address bar.
        window.history.replaceState({}, "", "/reset-password");
        if (!cancelled) setStage("ready");
      } catch (e) {
        if (!cancelled) {
          setLinkError(e instanceof Error ? e.message : null);
          setStage("expired");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!passwordMeetsRules(password)) {
      setError("Password must be 8 to 30 characters and include a letter and a number.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setStage("done");
    } finally {
      setLoading(false);
    }
  }

  if (stage === "opening") {
    return (
      <AuthCard title="Opening your link" subtitle="One moment.">
        <div className="flex justify-center py-4">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      </AuthCard>
    );
  }

  if (stage === "expired") {
    return (
      <AuthCard
        title="That link has expired"
        subtitle="Reset links work once and last an hour."
        footer={
          <>
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-brand">
              Log in
            </Link>
          </>
        }
      >
        {linkError && (
          <p className="mb-3 rounded-lg bg-negative-dim px-3 py-2.5 text-xs leading-relaxed text-negative">
            {linkError}
          </p>
        )}
        <Link href="/forgot-password" className={`${buttonClass} block text-center`}>
          Send me a new link
        </Link>
      </AuthCard>
    );
  }

  if (stage === "done") {
    return (
      <AuthCard title="Password changed" subtitle="You're signed in on this device.">
        <button
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          className={buttonClass}
        >
          Go to my wallet
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <PasswordField value={password} onChange={setPassword} label="New password" />
        <PasswordField
          value={confirm}
          onChange={setConfirm}
          label="Confirm new password"
          showRules={false}
        />

        {error && <p className="text-sm text-negative">{error}</p>}

        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Saving…" : "Save new password"}
        </button>
      </form>
    </AuthCard>
  );
}
