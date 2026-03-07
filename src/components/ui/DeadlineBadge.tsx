import { cn } from "@/lib/utils";
import { getDaysUntilDeadline, getDeadlineStatus, getDDayLabel } from "@/lib/date";

interface DeadlineBadgeProps {
  applyEndAt: string; // YYYY-MM-DD
  className?: string;
}

const styles = {
  urgent: "bg-red-50 text-red-600 border border-red-200 ring-1 ring-red-100",
  soon:   "bg-orange-50 text-orange-600 border border-orange-200",
  normal: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  closed: "bg-gray-100 text-gray-400 border border-gray-200",
};

export function DeadlineBadge({ applyEndAt, className }: DeadlineBadgeProps) {
  const status = getDeadlineStatus(applyEndAt);
  const label = getDDayLabel(applyEndAt);

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums tracking-tight whitespace-nowrap",
        styles[status],
        className
      )}
    >
      {status === "urgent" && (
        <span className="mr-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
      )}
      {label}
    </span>
  );
}
