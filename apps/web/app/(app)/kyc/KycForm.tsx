"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, inputClass, buttonClass } from "@/components/FormField";
import { ID_TYPES } from "@/lib/kyc";

export function KycForm({ defaultFullName }: { defaultFullName: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(defaultFullName);
  const [dob, setDob] = useState("");
  const [idType, setIdType] = useState<string>(ID_TYPES[0].value);
  const [idNumber, setIdNumber] = useState("");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName || !dob || !idNumber || !idFront || !selfie) {
      setError("Fill in every field and attach the required photos.");
      return;
    }

    const form = new FormData();
    form.set("full_name", fullName);
    form.set("date_of_birth", dob);
    form.set("id_type", idType);
    form.set("id_number", idNumber);
    form.set("id_front", idFront);
    if (idBack) form.set("id_back", idBack);
    form.set("selfie", selfie);

    setLoading(true);
    try {
      const res = await fetch("/api/kyc", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong submitting your verification.");
        return;
      }
      setSubmitted(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-surface shadow-card p-6 text-center">
        <p className="text-sm font-bold text-brand">Submitted for review</p>
        <p className="mt-2 text-xs text-text-secondary">
          We'll notify you as soon as your identity is verified — usually a short wait.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface shadow-card p-4 space-y-3">
        <p className="text-sm font-semibold text-text-primary">Your details</p>
        <FormField label="Full legal name">
          <input required className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormField>
        <FormField label="Date of birth">
          <input required type="date" className={inputClass} value={dob} onChange={(e) => setDob(e.target.value)} />
        </FormField>
        <FormField label="ID type">
          <select className={inputClass} value={idType} onChange={(e) => setIdType(e.target.value)}>
            {ID_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="ID number">
          <input required className={inputClass} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
        </FormField>
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-card p-4 space-y-3">
        <p className="text-sm font-semibold text-text-primary">Documents</p>
        <p className="text-xs text-text-secondary">Clear photos, all four corners visible. JPG, PNG, or WEBP, up to 8MB each.</p>
        <FileField label="ID — front" file={idFront} onChange={setIdFront} required />
        <FileField label="ID — back (if applicable)" file={idBack} onChange={setIdBack} />
        <FileField label="Selfie holding your ID" file={selfie} onChange={setSelfie} required />
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      <button type="submit" disabled={loading} className={`${buttonClass} w-full`}>
        {loading ? "Submitting…" : "Submit for verification"}
      </button>
    </form>
  );
}

function FileField({
  label,
  file,
  onChange,
  required
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-negative"> *</span>}
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full text-xs text-text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text-primary hover:file:bg-border/40"
      />
      {file && <span className="mt-1 block text-xs text-positive">{file.name}</span>}
    </label>
  );
}
