"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { SecretInput } from "@/components/SecretInput";
import { isValidTransactionKey } from "@/lib/transactionKey";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Notice({ text, tone }: { text: string; tone: "positive" | "negative" }) {
  return <p className={`mt-2 text-xs ${tone === "positive" ? "text-positive" : "text-negative"}`}>{text}</p>;
}

export function AccountForms({ initialFullName, initialPhone }: { initialFullName: string; initialPhone: string }) {
  const router = useRouter();
  const supabase = createClient();

  // Profile
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; tone: "positive" | "negative" } | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; tone: "positive" | "negative" } | null>(null);

  // Transaction key
  const [currentKey, setCurrentKey] = useState("");
  const [newKey, setNewKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyMsg, setKeyMsg] = useState<{ text: string; tone: "positive" | "negative" } | null>(null);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", user.id);
    setProfileLoading(false);
    setProfileMsg(error ? { text: "Could not save changes.", tone: "negative" } : { text: "Saved.", tone: "positive" });
    router.refresh();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg({ text: "New password must be at least 8 characters.", tone: "negative" });
      return;
    }
    setPasswordLoading(true);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user?.email) {
      setPasswordLoading(false);
      return;
    }
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });
    if (reauthError) {
      setPasswordLoading(false);
      setPasswordMsg({ text: "Current password is incorrect.", tone: "negative" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) {
      setPasswordMsg({ text: error.message, tone: "negative" });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setPasswordMsg({ text: "Password updated.", tone: "positive" });
  }

  async function handleKeySubmit(e: React.FormEvent) {
    e.preventDefault();
    setKeyMsg(null);
    if (!isValidTransactionKey(newKey)) {
      setKeyMsg({ text: "New key must be 6-32 letters/numbers.", tone: "negative" });
      return;
    }
    if (newKey !== confirmKey) {
      setKeyMsg({ text: "New keys don't match.", tone: "negative" });
      return;
    }
    setKeyLoading(true);
    const res = await fetch("/api/account/transaction-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_key: currentKey, new_key: newKey })
    });
    const data = await res.json();
    setKeyLoading(false);
    if (!res.ok) {
      setKeyMsg({ text: data.error ?? "Could not update transaction key.", tone: "negative" });
      return;
    }
    setCurrentKey("");
    setNewKey("");
    setConfirmKey("");
    setKeyMsg({ text: "Transaction key updated.", tone: "positive" });
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Profile">
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          <FormField label="Full name">
            <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </FormField>
          <FormField label="Phone">
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
          </FormField>
          {profileMsg && <Notice text={profileMsg.text} tone={profileMsg.tone} />}
          <button type="submit" disabled={profileLoading} className={buttonClass}>
            {profileLoading ? "Saving…" : "Save profile"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Change password">
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <FormField label="Current password">
            <input
              required
              type="password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </FormField>
          <FormField label="New password" hint="At least 8 characters.">
            <input
              required
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </FormField>
          {passwordMsg && <Notice text={passwordMsg.text} tone={passwordMsg.tone} />}
          <button type="submit" disabled={passwordLoading} className={buttonClass}>
            {passwordLoading ? "Updating…" : "Update password"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Change transaction key">
        <p className="mb-3 text-xs text-text-secondary">
          Required to authorize every deposit and withdrawal.
        </p>
        <form onSubmit={handleKeySubmit} className="space-y-3">
          <FormField label="Current transaction key">
            <SecretInput required value={currentKey} onChange={setCurrentKey} placeholder="Current key" />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="New transaction key">
              <SecretInput required value={newKey} onChange={setNewKey} placeholder="New key" />
            </FormField>
            <FormField label="Confirm new key">
              <SecretInput required value={confirmKey} onChange={setConfirmKey} placeholder="Re-enter key" />
            </FormField>
          </div>
          {keyMsg && <Notice text={keyMsg.text} tone={keyMsg.tone} />}
          <button type="submit" disabled={keyLoading} className={buttonClass}>
            {keyLoading ? "Updating…" : "Update transaction key"}
          </button>
        </form>
      </SectionCard>

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/login");
          router.refresh();
        }}
        className="w-full rounded-lg border border-negative/40 py-2.5 text-sm font-bold text-negative transition-colors hover:bg-negative/10"
      >
        Sign out
      </button>
    </div>
  );
}
