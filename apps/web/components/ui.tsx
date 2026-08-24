import Link from "next/link";

type Variant = "primary" | "success" | "danger" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

// Every control gets: a real fill, an inner top highlight, a border, a
// drop shadow, and a 1px press translation. That combination is what
// separates a button from coloured text on a panel.
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand-hover to-brand text-ink border-[#C9990A] shadow-btn-brand hover:from-[#FFD84D] hover:to-[#F7C21A]",
  success:
    "bg-gradient-to-b from-[#18DC90] to-positive text-ink border-[#0BA469] shadow-btn-positive hover:from-[#2BE79D] hover:to-[#12D689]",
  danger:
    "bg-gradient-to-b from-[#FF5D72] to-negative text-white border-[#C9384B] shadow-btn-negative hover:from-[#FF7285] hover:to-[#F85068]",
  secondary:
    "bg-gradient-to-b from-surface-3 to-surface-2 text-text-primary border-border-strong shadow-btn hover:from-[#262E3A] hover:to-[#1E242E]",
  ghost:
    "bg-transparent text-text-secondary border-transparent shadow-none hover:bg-surface-2 hover:text-text-primary"
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl"
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false
}: { variant?: Variant; size?: Size; fullWidth?: boolean } = {}) {
  return [
    "inline-flex items-center justify-center border font-bold leading-none",
    "transition-all duration-150 select-none",
    "active:translate-y-px active:shadow-none",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-base",
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? "w-full" : ""
  ].join(" ");
}

export function Button({
  variant,
  size,
  fullWidth,
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${buttonStyles({ variant, size, fullWidth })} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  fullWidth,
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
} & Omit<React.ComponentProps<typeof Link>, "href">) {
  return (
    <Link href={href} className={`${buttonStyles({ variant, size, fullWidth })} ${className}`} {...rest}>
      {children}
    </Link>
  );
}

/** Raised panel — the default container for any block of content. */
export function Card({
  className = "",
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Small uppercase label above a value or a section. */
export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-wider text-text-tertiary ${className}`}>
      {children}
    </p>
  );
}

export function SectionHeading({
  title,
  action
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-bold text-text-primary">{title}</h2>
      {action}
    </div>
  );
}

/** Tinted status strip — info / success / warning / danger. */
export function Callout({
  tone = "info",
  title,
  children,
  action
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const tones = {
    info: "border-info/30 bg-info-dim",
    success: "border-positive/30 bg-positive-dim",
    warning: "border-brand/30 bg-brand-dim",
    danger: "border-negative/30 bg-negative-dim"
  };
  const titleTones = {
    info: "text-info",
    success: "text-positive",
    warning: "text-brand",
    danger: "text-negative"
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      {title && <p className={`text-sm font-bold ${titleTones[tone]}`}>{title}</p>}
      {children && <div className="mt-1 text-xs leading-relaxed text-text-secondary">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
