import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import type { Contest } from "@/types/contest";
import { ContestCard } from "@/components/contest/ContestCard";
import {
  buildPublicContestAnalysis,
  type PublicContestAnalysis,
} from "@/lib/contest-analysis";
import { getDaysUntilDeadline } from "@/lib/date";

interface AnalysisCurationSectionProps {
  readonly contests: readonly Contest[];
}

interface AnalysisCurationItem {
  readonly contest: Contest;
  readonly analysis: PublicContestAnalysis;
}

const ANALYSIS_POOL_LIMIT = 24;

function reviewScore(contest: Contest): number {
  return Number.isFinite(contest.review_score) ? contest.review_score ?? 0 : 0;
}

function compareByHomeScore(a: Contest, b: Contest): number {
  return (
    reviewScore(b) - reviewScore(a) ||
    new Date(a.apply_end_at).getTime() - new Date(b.apply_end_at).getTime()
  );
}

function buildAnalysisPool(contests: readonly Contest[]): AnalysisCurationItem[] {
  return [...contests]
    .sort(compareByHomeScore)
    .slice(0, ANALYSIS_POOL_LIMIT)
    .map((contest) => ({
      contest,
      analysis: buildPublicContestAnalysis(contest),
    }));
}

function uniqueById(items: readonly AnalysisCurationItem[], limit: number): Contest[] {
  const seen = new Set<string>();
  const result: Contest[] = [];

  for (const item of items) {
    if (seen.has(item.contest.id)) continue;
    seen.add(item.contest.id);
    result.push(item.contest);
    if (result.length >= limit) break;
  }

  return result;
}

function manageableDeadline(items: readonly AnalysisCurationItem[]): AnalysisCurationItem[] {
  return [...items]
    .filter((item) => {
      const days = getDaysUntilDeadline(item.contest.apply_end_at);
      if (!Number.isFinite(days)) return false;
      return days > 0 && days <= 14 && item.analysis.filters.prepWithinWeek;
    })
    .sort(
      (a, b) =>
        new Date(a.contest.apply_end_at).getTime() -
        new Date(b.contest.apply_end_at).getTime()
    );
}

const CURATION_META = [
  {
    key: "today",
    title: "오늘의 추천 공모전",
    description: "지원 가치 점수와 마감 여유를 함께 본 추천 공고입니다.",
    href: "/contests?sort=recommended",
    icon: Sparkles,
  },
  {
    key: "beginner",
    title: "초보자도 도전하기 좋은 공모전",
    description: "제출 조건이 비교적 명확하고 준비 부담이 낮은 공고입니다.",
    href: "/contests?fit=beginner&sort=recommended",
    icon: GraduationCap,
  },
  {
    key: "portfolio",
    title: "포트폴리오 만들기 좋은 공모전",
    description: "결과물, 수상 이력, 활동 경험으로 남기기 좋은 공고입니다.",
    href: "/contests?fit=portfolio_high&sort=recommended",
    icon: BriefcaseBusiness,
  },
  {
    key: "deadline",
    title: "마감 임박이지만 준비 가능한 공모전",
    description: "마감은 가깝지만 한 주 안에 검토해 볼 수 있는 공고입니다.",
    href: "/contests?fit=prep_within_week&sort=deadline",
    icon: Clock3,
  },
] as const;

export function AnalysisCurationSection({ contests }: AnalysisCurationSectionProps) {
  if (contests.length === 0) return null;

  const analysisPool = buildAnalysisPool(contests);
  const sections = {
    today: uniqueById(analysisPool, 1),
    beginner: uniqueById(
      analysisPool.filter((item) => item.analysis.filters.beginnerRecommended),
      1
    ),
    portfolio: uniqueById(
      analysisPool.filter((item) => item.analysis.filters.portfolioHigh),
      1
    ),
    deadline: uniqueById(manageableDeadline(analysisPool), 1),
  };
  const topTen = analysisPool.slice(0, 5);

  return (
    <section className="py-12">
      <div className="section-header">
        <div className="section-title">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">공모전집 분석 큐레이션</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">
              난이도, 준비기간, 포트폴리오 활용도, 마감 위험도를 함께 분석합니다
            </p>
          </div>
        </div>
        <Link
          href="/contests?sort=recommended"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors group"
        >
          분석순 보기
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        {CURATION_META.map((meta) => {
          const Icon = meta.icon;
          const items = sections[meta.key];
          if (items.length === 0) return null;

          return (
            <div key={meta.key} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{meta.title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{meta.description}</p>
                  </div>
                </div>
                <Link href={meta.href} className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-700">
                  더보기
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {items.map((contest) => (
                  <ContestCard key={contest.id} contest={contest} variant="compact" />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {topTen.length > 0 && (
        <div className="mt-8 border-t border-gray-100 pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">공모전집 분석 점수 TOP 5</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                상금, 기관 신뢰도, 포트폴리오성, 준비 난이도, 마감 여유를 종합했습니다.
              </p>
            </div>
            <Link href="/contests?fit=score_80&sort=recommended" className="text-xs font-bold text-blue-600 hover:text-blue-700">
              80점 이상 보기
            </Link>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {topTen.map((item, index) => {
              const { contest, analysis } = item;
              return (
                <li key={contest.id}>
                  <Link
                    href={`/contests/${contest.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm transition-colors hover:border-blue-100 hover:bg-blue-50/40"
                  >
                    <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-gray-900">{contest.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {analysis.difficultyLabel} · {analysis.prepPeriodLabel} · {analysis.portfolioValueLabel}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                      {analysis.score}점
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
