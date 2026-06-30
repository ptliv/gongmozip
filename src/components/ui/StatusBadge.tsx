import { cn } from "@/lib/utils";

type StatusTone = "ongoing" | "upcoming" | "today" | "closed" | "neutral";

interface StatusBadgeProps {
  readonly label: string;
  readonly tone?: StatusTone;
  readonly className?: string;
}

const STATUS_CLASSES: Record<StatusTone, string> = {
  ongoing: "border-orange-200 bg-orange-50 text-orange-700",
  upcoming: "border-emerald-200 bg-emerald-50 text-emerald-700",
  today: "border-blue-200 bg-blue-50 text-blue-700",
  closed: "border-stone-200 bg-stone-100 text-zinc-500",
  neutral: "border-stone-200 bg-white text-zinc-600",
};

export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-black whitespace-nowrap",
        STATUS_CLASSES[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
