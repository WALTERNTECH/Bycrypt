"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { isValidTronAddress } from "@/lib/tron-address";

const LABELS: Record<string, string> = {
  receiving_wallet_address: "Receiving TRC20 wallet address",
  min_deposit_usdt: "Minimum deposit (USDT)",
  platform_name: "Platform name"
};

const HINTS: Record<string, string> = {
  receiving_wallet_address: "Shown to every user in the deposit flow. Must be a TRC20 (TRON) address you control.",
  min_deposit_usdt: "Enforced client-side only for now — verification always trusts the on-chain amount.",
  platform_name: "Displayed across the public site."
};

export function ConfigForm({ configKey, initialValue }: { configKey: string; initialValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (configKey === "receiving_wallet_address" && !isValidTronAddress(value)) {
      setError("Enter a valid TRC20 (TRON) address.");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/config/${configKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value })
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Only super_admin accounts can edit config.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border/60 bg-panel p-5">
      <FormField label={LABELS[configKey] ?? configKey} hint={HINTS[configKey]}>
        <div className="flex gap-2">
          <input className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </FormField>
      {error && <p className="mt-2 text-sm text-negative">{error}</p>}
      {saved && !error && <p className="mt-2 text-sm text-positive">Saved.</p>}
    </form>
  );
}
