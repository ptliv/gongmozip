import { cn } from "@/lib/utils";
import { getDaysUntilDeadline } from "@/lib/date";

interface DdayBadgeProps {
  readonly applyEndAt?: string | null;
  readonly className?: string;
}

function getDdayLabel(applyEndAt?: string | null): string {
  if (!applyEndAt) return "D-day 미정";
  const days = getDaysUntilDeadline(applyEndAt);
  if (!Number.isFinite(days)) return "D-day 미정";
  if (days < 0) return "마감";
  if (days === 0) return "오늘마감";
  return `D-${days}`;
}

function getDdayClass(applyEndAt?: string | null): string {
  if (!applyEndAt) return "border-stone-200 bg-stone-100 text-zinc-500";
  const days = getDaysUntilDeadline(applyEndAt);
  if (!Number.isFinite(days) || days < 0) {
    return "border-stone-200 bg-stone-100 text-zinc-500";
  }
  if (days === 0) return "border-blue-200 bg-blue-50 text-blue-700";
  if (days <= 7) return "border-red-200 bg-red-50 text-red-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function DdayBadge({ applyEndAt, className }: DdayBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-black tabular-nums whitespace-nowrap",
        getDdayClass(applyEndAt),
        className
      )}
    >
      {getDdayLabel(applyEndAt)}
    </span>
  );
}
