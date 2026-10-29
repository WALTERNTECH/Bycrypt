import Link from "next/link";

type Variant = "primary" | "success" | "danger" | "secondary" | "ink" | "ghost";
type Size = "sm" | "md" | "lg";

// Exchange-style controls: flat fills, no gradients, no inner highlight,
// and a border only where the fill alone wouldn't read as a control. On a
// white interface a gradient button looks dated immediately — weight and
// one saturated fill do the work instead.
//
// Press feedback is opacity, not translation. Nothing shifts position,
// which is what keeps a dense screen feeling stable under the thumb.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-ink border-transparent hover:bg-brand-hover",
  success: "bg-positive text-white border-transparent hover:bg-[#1BA062]",
  danger: "bg-negative text-white border-transparent hover:bg-[#DC3F44]",
  // Darker than the page rather than a hairline box around it. An
  // outlined button on white reads as a placeholder; a filled grey one
  // reads as a control, which is the whole difference between these two.
  secondary: "bg-surface-3 text-text-primary border-transparent hover:bg-[#E4E5EA]",
  // Near-black. The second-strongest action on the screen, used where
  // amber would claim too much of it.
  ink: "bg-[#17181C] text-white border-transparent hover:bg-[#2A2C31]",
  ghost: "bg-transparent text-text-secondary border-transparent hover:bg-surface-2 hover:text-text-primary"
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13px] gap-1.5 rounded-lg",
  lg: "h-11 px-4 text-[14px] gap-2 rounded-lg"
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false
}: { variant?: Variant; size?: Size; fullWidth?: boolean } = {}) {
  return [
    "inline-flex items-center justify-center border font-semibold leading-none",
    "transition-colors duration-100 select-none",
    "active:opacity-80",
    "disabled:cursor-not-allowed disabled:opacity-40",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1 focus-visible:ring-offset-base",
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
      className={`rounded-lg bg-surface-2 ${className}`}
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
