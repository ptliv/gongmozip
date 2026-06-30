import Link from "next/link";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Gift,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Contest } from "@/types/contest";
import { BookmarkToggleButton } from "@/components/bookmark/BookmarkToggleButton";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import { FallbackImage } from "@/components/ui/FallbackImage";
import { buildPublicContestAnalysis } from "@/lib/contest-analysis";
import { formatDate } from "@/lib/date";
import { getContestPrizeInfo } from "@/lib/prize";
import { getContestHref } from "@/lib/slug";

interface ContestCardProps {
  readonly contest: Contest;
  readonly variant?: "default" | "compact";
}

function safeDateLabel(value: string | null | undefined): string {
  if (!value) return "일정 확인";
  try {
    return formatDate(value);
  } catch {
    return "일정 확인";
  }
}

function targetLabel(contest: Contest): string {
  return contest.target.length > 0 ? contest.target.join(", ") : "대상 확인 필요";
}

export function ContestCard({ contest, variant = "default" }: ContestCardProps) {
  const href = getContestHref(contest);
  const posterUrl = contest.poster_image_url;
  const analysis = buildPublicContestAnalysis(contest);
  const prizeInfo = getContestPrizeInfo(contest);
  const deadlineText = safeDateLabel(contest.apply_end_at);
  const checkedText = safeDateLabel(contest.source_checked_at ?? contest.crawled_at ?? contest.updated_at);
  const bookmarkItem = {
    slug: contest.slug,
    title: contest.title,
    organizer: contest.organizer,
    apply_end_at: contest.apply_end_at,
  };

  if (variant === "compact") {
    return (
      <Link href={href} className="group block">
        <article className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-card-hover sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <CategoryChip label={contest.type} variant="type" />
              <span className="report-chip border-emerald-200 bg-emerald-50 text-emerald-800">
                지원 가치 {analysis.score}점
              </span>
            </div>
            <p className="truncate text-sm font-black text-zinc-950 group-hover:text-amber-800">
              {contest.title}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-zinc-500">{contest.organizer}</p>
            <p className="mt-2 text-[11px] font-bold text-zinc-600">
              {analysis.prepPeriodLabel} · {analysis.deadlineRiskLabel} · {analysis.portfolioValueLabel}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
            <DeadlineBadge applyEndAt={contest.apply_end_at} />
            {prizeInfo && (
              <span className="inline-flex max-w-[11rem] items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-900">
                <Gift className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{prizeInfo.amountLabel ?? prizeInfo.text}</span>
              </span>
            )}
          </div>
        </article>
      </Link>
    );
  }

  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-stone-200 bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-card-hover">
      <div className="absolute right-3 top-3 z-10">
        <BookmarkToggleButton item={bookmarkItem} />
      </div>

      <Link href={href} className="flex h-full flex-col">
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-lg border-b border-stone-200 bg-stone-100">
          <FallbackImage
            src={posterUrl}
            alt={`${contest.title} 포스터`}
            sizes="(min-width: 1024px) 320px, (min-width: 640px) calc(50vw - 40px), calc(100vw - 76px)"
            imageClassName="transition-transform duration-300 group-hover:scale-[1.02]"
          />
          {prizeInfo && (
            <div className="absolute left-3 top-3 max-w-[calc(100%-4.5rem)] rounded-md border border-amber-200 bg-amber-100 px-2.5 py-1.5 text-amber-950 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate text-xs font-black">{prizeInfo.amountLabel ?? prizeInfo.text}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="mb-3 flex items-start justify-between gap-2 pr-9">
            <CategoryChip label={contest.type} variant="type" />
            <DeadlineBadge applyEndAt={contest.apply_end_at} />
          </div>

          <h3 className="line-clamp-2 text-[0.96rem] font-black leading-snug text-zinc-950 transition-colors group-hover:text-amber-800">
            {contest.title}
          </h3>
          <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-zinc-500">
            {contest.summary}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="가치" value={`${analysis.score}점`} />
            <Metric label="준비" value={analysis.prepPeriodLabel} />
            <Metric label="위험" value={analysis.deadlineRiskLabel} />
          </div>

          <div className="mt-4 space-y-2 text-xs text-zinc-600">
            <InfoRow icon={Building2} label={contest.organizer} />
            <InfoRow icon={Users} label={targetLabel(contest)} />
            <InfoRow icon={CalendarDays} label={`마감 ${deadlineText}`} />
            <InfoRow icon={ShieldCheck} label={`확인 ${checkedText}`} />
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
            <CategoryChip label={contest.field} variant="field" />
            <span className="inline-flex items-center gap-1 text-xs font-black text-zinc-700">
              <BarChart3 className="h-3.5 w-3.5 text-amber-700" />
              {analysis.difficultyLabel}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-2 py-2 text-center">
      <p className="truncate text-[10px] font-black text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-black text-zinc-900">{value}</p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
}: {
  readonly icon: typeof Building2;
  readonly label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
      <span className="truncate font-semibold">{label}</span>
    </div>
  );
}
