"use client";

import { inputClass } from "./FormField";

/**
 * A masked field for the transaction key.
 *
 * A plain `type="password"` makes browsers and password managers treat
 * the form as a login and offer to save the value — which is wrong here
 * and, on every deposit, trade and withdrawal, actively annoying. The
 * transaction key is an authorisation code the user already knows, not
 * a credential to remember.
 *
 * `autocomplete="one-time-code"` is the documented signal for exactly
 * that, and the data-* attributes opt out of the major password
 * managers, which each use their own flag and ignore the standard one.
 */
export function SecretInput({
  value,
  onChange,
  placeholder = "Your transaction key",
  required,
  autoFocus,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <input
      type="password"
      inputMode="text"
      name="authorization-code"
      autoComplete="one-time-code"
      data-lpignore="true"
      data-1p-ignore=""
      data-bwignore="true"
      data-form-type="other"
      spellCheck={false}
      required={required}
      autoFocus={autoFocus}
      className={className ?? inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
