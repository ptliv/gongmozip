import Link from "next/link";
import {
  ArrowRight,
  Megaphone,
  MessageSquareText,
  Sparkles,
  Table2,
} from "lucide-react";
import type { Contest } from "@/types/contest";
import { formatDate, getDaysUntilDeadline } from "@/lib/date";
import { getContestHref } from "@/lib/slug";
import { DdayBadge } from "@/components/ui/DdayBadge";

interface LivePlatformSectionProps {
  readonly contests: readonly Contest[];
}

function scoreOf(contest: Contest): number {
  return Number.isFinite(contest.review_score) ? contest.review_score ?? 0 : 0;
}

function selectSpotlight(contests: readonly Contest[]): Contest[] {
  return [...contests]
    .filter((contest) => contest.status === "ongoing")
    .sort(
      (a, b) =>
        scoreOf(b) - scoreOf(a) ||
        b.view_count - a.view_count ||
        new Date(a.apply_end_at).getTime() - new Date(b.apply_end_at).getTime()
    )
    .slice(0, 5);
}

function selectLatest(contests: readonly Contest[]): Contest[] {
  return [...contests]
    .filter((contest) => contest.status !== "canceled")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 8);
}

function liveQuestionFor(contest: Contest): string {
  const days = getDaysUntilDeadline(contest.apply_end_at);
  if (Number.isFinite(days) && days <= 3) {
    return "마감 전 제출물과 접수 시간을 다시 확인했나요?";
  }
  if (contest.benefit.types.includes("상금")) {
    return "상금 조건과 수상작 활용 범위를 확인했나요?";
  }
  if (contest.team_allowed) {
    return "팀 지원이면 역할 분담과 대표자 조건을 확인했나요?";
  }
  return "공식 링크에서 지원 자격을 최종 확인했나요?";
}

function periodLabel(contest: Contest): string {
  return `${formatDate(contest.apply_start_at)}~${formatDate(contest.apply_end_at)}`;
}

export function LivePlatformSection({ contests }: LivePlatformSectionProps) {
  const spotlight = selectSpotlight(contests);
  const latest = selectLatest(contests);
  const questions = spotlight.slice(0, 4);

  if (spotlight.length === 0 && latest.length === 0) return null;

  return (
    <section className="py-6 sm:py-8">
      <div className="overflow-hidden rounded-lg border border-zinc-900 bg-zinc-950 text-white shadow-card">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Pick Desk
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight">
                  이 공고 어때요?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  추천 점수, 조회, 마감 여유를 함께 본 오늘의 검토 후보입니다.
                </p>
              </div>
              <Link
                href="/contests?sort=recommended"
                className="hidden flex-shrink-0 rounded-md bg-white px-3 py-2 text-xs font-black text-zinc-950 sm:inline-flex"
              >
                추천순
              </Link>
            </div>

            <div className="grid gap-2">
              {spotlight.map((contest, index) => (
                <Link
                  key={contest.id}
                  href={getContestHref(contest)}
                  className="group grid min-w-0 grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-3 transition-colors hover:bg-white/[0.1]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-300 text-xs font-black tabular-nums text-zinc-950">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-white group-hover:text-amber-200">
                      {contest.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-400">
                      {contest.organizer || "주최 확인 필요"} · {contest.type}
                    </span>
                  </span>
                  <DdayBadge applyEndAt={contest.apply_end_at} className="bg-white text-zinc-900" />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid content-start gap-0 bg-white text-zinc-950">
            <div className="border-b border-zinc-200 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-blue-700">
                    <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
                    Live Check
                  </p>
                  <h3 className="mt-1 text-xl font-black">지원 질문 Live</h3>
                </div>
                <Link href="/guides" className="text-xs font-black text-blue-700 hover:text-blue-800">
                  가이드
                </Link>
              </div>
              <ol className="grid gap-2">
                {questions.map((contest, index) => (
                  <li key={contest.id} className="grid grid-cols-[2rem_1fr] gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
                    <span className="text-sm font-black tabular-nums text-zinc-400">
                      Q{index + 1}
                    </span>
                    <span className="min-w-0">
                      <Link href={getContestHref(contest)} className="block truncate text-sm font-black text-zinc-900">
                        {contest.title}
                      </Link>
                      <span className="mt-0.5 block text-xs font-semibold text-zinc-500">
                        {liveQuestionFor(contest)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-700">
                    <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
                    New Table
                  </p>
                  <h3 className="mt-1 text-xl font-black">새로 올라온 공고</h3>
                </div>
                <Link href="/latest" className="text-xs font-black text-emerald-700 hover:text-emerald-800">
                  전체 보기
                </Link>
              </div>
              <div className="grid gap-2">
                {latest.map((contest) => (
                  <Link
                    key={contest.id}
                    href={getContestHref(contest)}
                    className="grid min-w-0 grid-cols-[1fr_auto] gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-zinc-900">
                        {contest.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-500">
                        {periodLabel(contest)} · {contest.organizer || "주최 확인 필요"}
                      </span>
                    </span>
                    <DdayBadge applyEndAt={contest.apply_end_at} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 bg-zinc-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-zinc-200">
            <Megaphone className="h-4 w-4 text-amber-300" aria-hidden="true" />
            공고 등록이나 상단 노출이 필요하면 문의로 연결하세요.
          </p>
          <Link href="/contact?topic=submit" className="inline-flex items-center justify-center gap-1 rounded-md bg-amber-300 px-3 py-2 text-xs font-black text-zinc-950">
            공고 등록 문의
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
