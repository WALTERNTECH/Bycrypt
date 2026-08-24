type IconProps = { className?: string };

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5a2 2 0 1 1 4 0v5h3a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MarketsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 19V5M4 19h16M8 15l3-3 2.5 2.5L18 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 9h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TradeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 8h13M17 8l-3-3M17 8l-3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16H7M7 16l3-3M7 16l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DepositIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="3.5" y="6" width="17" height="13" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M12 13v4M10 15h4" strokeLinecap="round" />
    </svg>
  );
}

export function WithdrawIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="3.5" y="6" width="17" height="13" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M12 17v-4M10 15l2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PersonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" strokeLinejoin="round" />
      <path d="M9 12.2l1.8 1.8 3.7-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M12 4.5 21 19H3L12 4.5Z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="16.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Binance-style customer support icon — a headset.
export function SupportIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
      <rect x="3" y="13" width="4.5" height="6" rx="1.6" />
      <rect x="16.5" y="13" width="4.5" height="6" rx="1.6" />
      <path d="M19.5 19v.5a3.5 3.5 0 0 1-3.5 3.5h-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PortfolioIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" strokeLinecap="round" />
      <path d="M3 12.5h18" />
      <path d="M12 11.6v1.8" strokeLinecap="round" />
    </svg>
  );
}
