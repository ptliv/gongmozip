import Link from "next/link";
import { Contest } from "@/types/contest";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import { formatDate } from "@/lib/date";
import { Building2, Users, Gift } from "lucide-react";

interface ContestCardProps {
  contest: Contest;
  variant?: "default" | "compact";
}

export function ContestCard({ contest, variant = "default" }: ContestCardProps) {
  if (variant === "compact") {
    return (
      <Link href={`/contests/${contest.slug}`} className="group block">
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-card-hover hover:border-blue-100 hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-violet-200 transition-colors">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {contest.title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{contest.organizer}</p>
          </div>
          <DeadlineBadge applyEndAt={contest.apply_end_at} />
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/contests/${contest.slug}`} className="group block h-full">
      <article className="h-full flex flex-col p-5 rounded-2xl border border-gray-100 bg-white shadow-card hover:shadow-card-hover hover:border-blue-100/70 hover:-translate-y-1 transition-all duration-200">
        {/* 유형 + 마감 배지 */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <CategoryChip label={contest.type} variant="type" />
          <DeadlineBadge applyEndAt={contest.apply_end_at} />
        </div>

        {/* 제목 */}
        <h3 className="text-[0.9375rem] font-bold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug mb-1.5 line-clamp-2">
          {contest.title}
        </h3>

        {/* 한 줄 요약 */}
        <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2 flex-1">
          {contest.summary}
        </p>

        {/* 메타 정보 */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{contest.organizer}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{contest.target.join(", ")}</span>
          </div>
          {contest.benefit.prize && (
            <div className="flex items-center gap-2 text-xs">
              <Gift className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
              <span className="font-semibold text-amber-700 truncate">{contest.benefit.prize}</span>
            </div>
          )}
        </div>

        {/* 분야 + 마감일 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <CategoryChip label={contest.field} variant="field" />
          <span className="text-xs text-gray-400 tabular-nums">~{formatDate(contest.apply_end_at)}</span>
        </div>
      </article>
    </Link>
  );
}
