import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { CheckStatus } from "./readiness-checks";

interface ReadinessBadgeProps {
  readonly status: CheckStatus;
}

export function ReadinessBadge({ status }: ReadinessBadgeProps) {
  if (status === "pass") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> PASS
      </span>
    );
  }

  if (status === "warn") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3" /> WARN
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
      INFO
    </span>
  );
}
