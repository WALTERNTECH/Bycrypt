export function TelegramButton({
  url,
  variant = "icon",
  label = "Chat with Krypton Support"
}: {
  url: string;
  variant?: "icon" | "full";
  label?: string;
}) {
  if (variant === "icon") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Chat with Krypton Support on Telegram"
        aria-label="Krypton Support on Telegram"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#29A9EA] transition-colors hover:bg-panel"
      >
        <TelegramIcon className="h-5 w-5" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg bg-[#29A9EA] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#3fb4ee]"
    >
      <TelegramIcon className="h-4 w-4" />
      {label}
    </a>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M21.05 3.44a1.5 1.5 0 0 0-1.55-.2L2.9 10.16a1.35 1.35 0 0 0 .07 2.5l4.36 1.44 1.7 5.46a1.2 1.2 0 0 0 2.02.5l2.4-2.3 4.3 3.2a1.4 1.4 0 0 0 2.22-.83l2.5-14.9a1.5 1.5 0 0 0-.42-1.29ZM9.7 14.2l-1.06-3.5 8.9-5.55c.2-.13.4.14.23.3l-7.4 6.86-.02.1-.65 1.8Z" />
    </svg>
  );
}
