"use client";

import { useState } from "react";
import { inputClass } from "./FormField";

/**
 * A password field with a reveal toggle and live rules.
 *
 * The rules are a checklist rather than a sentence under the box. A
 * sentence has to be read, remembered and then checked against what you
 * typed; a checklist does the checking for you and says which part is
 * still missing. It is also why the submit button can be disabled with a
 * clear conscience — nothing is refused without the reason already being
 * on screen.
 *
 * It stays hidden until the field has been touched, so an empty form
 * opens clean rather than pre-loaded with red.
 */

export interface PasswordRule {
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "8 to 30 characters", test: (v) => v.length >= 8 && v.length <= 30 },
  { label: "At least 1 letter", test: (v) => /[a-zA-Z]/.test(v) },
  { label: "At least 1 number", test: (v) => /[0-9]/.test(v) }
];

export function passwordMeetsRules(value: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(value));
}

export function PasswordField({
  value,
  onChange,
  label = "Password",
  autoComplete = "new-password",
  showRules = true
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  autoComplete?: string;
  showRules?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);

  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-text-secondary">{label}</span>
        <div className="relative">
          <input
            required
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            className={`${inputClass} pr-11`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-tertiary transition-colors hover:text-text-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-[18px] w-[18px]">
              {visible ? (
                <>
                  <path d="M3 3l18 18" strokeLinecap="round" />
                  <path
                    d="M10.6 5.2A9.9 9.9 0 0 1 12 5c5 0 9 4.5 9 7 0 .9-.6 2.1-1.6 3.2M6.4 6.9C4.3 8.3 3 10.3 3 12c0 2.5 4 7 9 7 1.5 0 2.9-.4 4.1-1"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="2.6" />
                </>
              )}
            </svg>
          </button>
        </div>
      </label>

      {showRules && (value.length > 0 || touched) && (
        <ul className="mt-2 space-y-1">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(value);
            return (
              <li key={rule.label} className="flex items-center gap-1.5 text-[11px]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  className={`h-3 w-3 shrink-0 transition-colors ${
                    met ? "text-positive" : "text-text-tertiary/50"
                  }`}
                >
                  {met ? (
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <circle cx="12" cy="12" r="4" />
                  )}
                </svg>
                <span className={met ? "text-text-secondary" : "text-text-tertiary"}>{rule.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
