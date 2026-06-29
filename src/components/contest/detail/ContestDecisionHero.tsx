import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  Calendar,
  ExternalLink,
  Gift,
  Globe,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { BookmarkToggleButton } from "@/components/bookmark/BookmarkToggleButton";
import type { PublicContestAnalysis } from "@/lib/contest-analysis";
import { getDaysUntilDeadline, formatDateKo } from "@/lib/date";
import type { ContestPrizeInfo } from "@/lib/prize";
import type { ContestDetailPayload } from "@/lib/supabase/public-contest-queries";

interface ContestDecisionHeroProps {
  readonly contest: ContestDetailPayload;
  readonly analysis: PublicContestAnalysis;
  readonly prizeInfo: ContestPrizeInfo | null;
  readonly applyUrl: string | null;
  readonly officialUrl: string | null;
  readonly sourceCheckedLabel: string;
  readonly bookmarkItem: {
    readonly slug: string;
    readonly title: string;
    readonly organizer: string;
    readonly apply_end_at: string;
  };
}

export function ContestDecisionHero({
  contest,
  analysis,
  prizeInfo,
  applyUrl,
  officialUrl,
  sourceCheckedLabel,
  bookmarkItem,
}: ContestDecisionHeroProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-card">
      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="stone">{contest.contest_type}</Badge>
            <Badge tone="amber">{contest.field}</Badge>
            <Badge tone="emerald">{displayStatusLabel(contest)}</Badge>
            <Badge tone="zinc">{dDayLabel(contest.apply_end_at)}</Badge>
            {prizeInfo && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-900">
                <Trophy className="h-3.5 w-3.5" />
                {prizeInfo.amountLabel ?? prizeInfo.text}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black leading-snug text-zinc-950 sm:text-3xl">
            {contest.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {contest.summary || `${contest.organizer}에서 진행하는 ${contest.type} 공고입니다.`}
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <DecisionMetric label="지원 가치" value={`${analysis.score}점`} />
            <DecisionMetric label="준비 기간" value={analysis.prepPeriodLabel} />
            <DecisionMetric label="마감 위험" value={analysis.deadlineRiskLabel} />
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <InfoItem icon={Building2} label="주최" value={contest.organizer || "미정"} />
            <InfoItem icon={Calendar} label="마감일" value={safeDateLabel(contest.apply_end_at)} />
            <InfoItem
              icon={Users}
              label="지원 대상"
              value={contest.normalized_targets.length > 0 ? contest.normalized_targets.join(", ") : "대상 확인 필요"}
            />
            <InfoItem icon={Globe} label="진행 방식" value={contest.online_offline || "방식 확인 필요"} />
            {contest.region && contest.region !== "무관" && (
              <InfoItem icon={MapPin} label="지역" value={contest.region} />
            )}
            <InfoItem icon={ShieldCheck} label="출처 확인" value={sourceCheckedLabel} />
          </dl>

          {prizeInfo && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-black text-amber-950">
                  <Gift className="h-4 w-4 text-amber-600" />
                  상금/혜택
                </span>
                <span className="text-lg font-black text-amber-800">
                  {prizeInfo.amountLabel ?? prizeInfo.text}
                </span>
              </div>
              {prizeInfo.amountLabel && prizeInfo.text !== prizeInfo.amountLabel && (
                <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-900/80">
                  {prizeInfo.text}
                </p>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <BookmarkToggleButton item={bookmarkItem} showLabel size="md" />
            {applyUrl && (
              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="btn-primary min-h-10 px-4 py-2"
                aria-label={`${contest.title} 신청 바로가기`}
              >
                <ExternalLink className="h-4 w-4" />
                신청 바로가기
              </a>
            )}
          </div>
        </div>

        <aside className="border-t border-stone-200 bg-[#fffdf8] p-5 sm:p-6 lg:border-l lg:border-t-0">
          {contest.poster_image_url && (
            <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
              <Image
                src={contest.poster_image_url}
                alt={`${contest.title} 포스터`}
                fill
                sizes="(min-width: 1024px) 520px, 92vw"
                className="object-contain"
                priority
              />
            </div>
          )}

          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Before Apply</p>
            <h2 className="mt-2 text-lg font-black text-zinc-950">접수 전 최종 확인</h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              공모전집은 지원 판단을 돕는 정보 정리 서비스입니다. 제출 조건과 접수 마감 시간은 최신 모집 요강을 기준으로 확인하세요.
            </p>
            <div className="mt-4 grid gap-2">
              <CheckRow label={`모집기간 ${safeDateLabel(contest.apply_start_at)} - ${safeDateLabel(contest.apply_end_at)}`} />
              <CheckRow label={contest.team_allowed ? "팀 참가 가능 여부 확인" : "개인 참가 기준 확인"} />
              <CheckRow label={`준비 난이도 ${analysis.difficultyLabel}`} />
            </div>
            {officialUrl && (
              <a
                href={officialUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-amber-800 hover:text-amber-900"
              >
                최신 모집 요강 확인
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function safeDateLabel(value?: string | null): string {
  if (!value) return "미정";
  try {
    return formatDateKo(value);
  } catch {
    return "미정";
  }
}

function dDayLabel(applyEndAt?: string | null): string {
  if (!applyEndAt) return "마감일 미정";
  const days = getDaysUntilDeadline(applyEndAt);
  if (!Number.isFinite(days)) return "마감일 미정";
  if (days < 0) return "마감됨";
  if (days === 0) return "오늘 마감";
  return `D-${days}`;
}

function displayStatusLabel(contest: ContestDetailPayload): string {
  const days = contest.apply_end_at ? getDaysUntilDeadline(contest.apply_end_at) : Number.NaN;
  if (Number.isFinite(days) && days <= 0) return "마감됨";
  if (contest.status === "upcoming") return "모집 예정";
  if (contest.status === "closed") return "마감됨";
  if (contest.status === "canceled") return "취소됨";
  return "모집 중";
}

function Badge({ tone, children }: { readonly tone: "stone" | "amber" | "emerald" | "zinc"; readonly children: string }) {
  const classes = {
    stone: "border-stone-200 bg-stone-50 text-zinc-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    zinc: "border-zinc-300 bg-zinc-900 text-white",
  };
  return <span className={`rounded-md border px-2.5 py-1 text-xs font-black ${classes[tone]}`}>{children}</span>;
}

function DecisionMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
      <p className="text-[11px] font-black text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-zinc-950">{value}</p>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: typeof Building2;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
      <Icon className="h-4 w-4 flex-shrink-0 text-zinc-400" />
      <span className="font-black text-zinc-500">{label}</span>
      <span className="min-w-0 truncate font-semibold text-zinc-800">{value}</span>
    </div>
  );
}

function CheckRow({ label }: { readonly label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-stone-50 px-3 py-2 text-xs font-bold text-zinc-700">
      <BarChart3 className="h-3.5 w-3.5 text-amber-700" />
      <span>{label}</span>
    </div>
  );
}
