import type { Metadata } from "next";
import { Suspense } from "react";
import { BarChart3, Clock3, FileSearch, ShieldCheck } from "lucide-react";
import { ContestsPageClient } from "@/components/contest/ContestsPageClient";
import { StructuredData } from "@/components/seo/StructuredData";
import { getDaysUntilDeadline } from "@/lib/date";
import { NOINDEX_FOLLOW_ROBOTS } from "@/lib/indexing";
import { canonicalUrl } from "@/lib/seo";
import { fetchContests } from "@/lib/supabase/contests";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: "공고 탐색",
    description: "공모전, 대외활동, 인턴십 공고를 마감일, 혜택, 준비 난이도 기준으로 검토하세요.",
    robots: NOINDEX_FOLLOW_ROBOTS,
    alternates: {
      canonical: canonicalUrl("/contests"),
    },
  };
}

export default async function ContestsPage() {
  const contests = await fetchContests({ verified_only: true }).catch((e: unknown) => {
    console.error("[ContestsPage] fetchContests 실패:", e);
    return [];
  });
  const metrics = buildListMetrics(contests);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "공모전집 공고 탐색",
          itemListElement: contests.slice(0, 50).map((contest, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: canonicalUrl(`/contests/${encodeURIComponent(contest.slug)}`),
            name: contest.title,
          })),
        }}
      />

      <header className="mb-8 grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
            <FileSearch className="h-3.5 w-3.5" />
            공고 검토 워크벤치
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
            지원할 공고를 조건별로 좁혀보세요
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
            목록은 검색, 필터, 정렬을 통해 마감 위험과 준비 부담을 함께 검토하도록 구성했습니다. 상세 페이지에서 원문과 준비 체크를 이어 확인하세요.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MetricTile icon={FileSearch} label="검토 공고" value={`${metrics.total}개`} />
          <MetricTile icon={Clock3} label="7일 내 마감" value={`${metrics.deadlineSoon}개`} />
          <MetricTile icon={ShieldCheck} label="출처 확인" value={`${metrics.checked}개`} />
        </div>
      </header>

      <section className="mb-7 grid gap-3 lg:grid-cols-3">
        <GuidePanel
          icon={BarChart3}
          title="추천순"
          description="지원 가치, 마감 여유, 포트폴리오 활용도를 함께 본 공고부터 확인합니다."
        />
        <GuidePanel
          icon={Clock3}
          title="마감임박순"
          description="제출 일정이 가까운 공고를 먼저 확인하고 준비 가능 여부를 빠르게 판단합니다."
        />
        <GuidePanel
          icon={ShieldCheck}
          title="공식 출처"
          description="접수 전에는 상세 페이지의 공식 링크에서 제출 조건과 시간을 다시 확인합니다."
        />
      </section>

      <Suspense fallback={<ContestsPageSkeleton />}>
        <ContestsPageClient initialContests={contests} />
      </Suspense>
    </div>
  );
}

function buildListMetrics(contests: Awaited<ReturnType<typeof fetchContests>>) {
  return {
    total: contests.length,
    deadlineSoon: contests.filter((contest) => {
      const days = getDaysUntilDeadline(contest.apply_end_at);
      return Number.isFinite(days) && days > 0 && days <= 7;
    }).length,
    checked: contests.filter((contest) => Boolean(contest.source_checked_at ?? contest.crawled_at)).length,
  };
}

function MetricTile({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: typeof FileSearch;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-card">
      <Icon className="h-4 w-4 text-amber-700" />
      <p className="mt-2 text-[11px] font-black text-zinc-400">{label}</p>
      <p className="mt-0.5 text-lg font-black text-zinc-950">{value}</p>
    </div>
  );
}

function GuidePanel({
  icon: Icon,
  title,
  description,
}: {
  readonly icon: typeof FileSearch;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="report-panel p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-stone-100 text-zinc-600">
          <Icon className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-sm font-black text-zinc-950">{title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{description}</span>
        </span>
      </div>
    </div>
  );
}

function SkeletonBox({ className }: { readonly className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-stone-100 ${className ?? ""}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

function ContestsPageSkeleton() {
  return (
    <div className="space-y-5">
      <SkeletonBox className="h-12" />
      <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <SkeletonBox className="h-5 w-28" />
          <SkeletonBox className="h-5 w-24" />
        </div>
        <div className="space-y-3 px-4 py-4">
          {[5, 6, 4, 3].map((count) => (
            <div key={count} className="flex items-center gap-3">
              <SkeletonBox className="h-4 w-14" />
              <div className="flex gap-2">
                {Array.from({ length: count }).map((_, index) => (
                  <SkeletonBox key={index} className="h-7 w-16" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBox key={index} className="h-72" />
        ))}
      </div>
    </div>
  );
}
