import { cn } from "@/lib/utils";

const PALETTE = [
  "from-sky-600 to-sky-800",
  "from-teal-600 to-teal-800",
  "from-indigo-600 to-indigo-800",
  "from-cyan-600 to-cyan-800",
  "from-slate-600 to-slate-800",
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

function tone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % PALETTE.length;
  return PALETTE[hash] ?? PALETTE[0];
}

export function ChatAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-2 ring-white",
        tone(name),
        size === "sm" && "h-8 w-8 text-[10px]",
        size === "md" && "h-10 w-10 text-xs",
        size === "lg" && "h-12 w-12 text-sm",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
