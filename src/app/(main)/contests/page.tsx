import { Metadata } from "next";
import { Suspense } from "react";
import { fetchContests } from "@/lib/supabase/contests";
import { ContestsPageClient } from "@/components/contest/ContestsPageClient";
import { canonicalUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "공고 목록",
  description: "공모전, 대외활동, 인턴십 등 다양한 청년 활동 공고를 검색하세요.",
  alternates: {
    canonical: canonicalUrl("/contests"),
  },
};

export default async function ContestsPage() {
  const contests = await fetchContests({ verified_only: true }).catch((e: unknown) => {
    console.error("[ContestsPage] fetchContests 실패:", e);
    return [];
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-title-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            공고 목록
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-4 leading-relaxed">
          공모전, 대외활동, 인턴십 등 다양한 청년 활동 공고를 한곳에서 탐색하세요.
        </p>
      </div>

      <section className="mb-7 border-y border-gray-100 py-5">
        <h2 className="text-base font-bold text-gray-900 mb-3">공고 목록 활용 가이드</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-sm leading-relaxed text-gray-600">
          <p>
            공모전집의 공고 목록은 현재 모집 중이거나 모집 예정인 공모전, 대외활동, 인턴십을
            마감일 기준으로 다시 정리해 보여줍니다. 이미 마감된 공고가 탐색 흐름을 방해하지 않도록
            공개 목록에서는 마감일이 지난 항목을 제외하고, 카드마다 추천도와 준비 난이도를 함께 표시합니다.
          </p>
          <p>
            처음 방문했다면 검색어보다 필터를 먼저 사용하는 편이 좋습니다. 유형, 분야, 대상, 진행 방식을
            좁힌 뒤 추천순이나 마감임박순으로 정렬하면 지금 지원할 만한 공고를 빠르게 추릴 수 있습니다.
            관심 공고는 북마크에 저장해 제출 전 체크리스트와 함께 다시 확인하세요.
          </p>
          <p>
            각 상세 페이지에는 참가 대상, 혜택, 마감일, 준비 전략, 유의사항, 자주 묻는 질문을 추가해
            단순 요약이 아니라 실제 지원 판단에 필요한 정보로 재구성했습니다. 접수 전에는 최신 모집 요강의
            제출 조건과 접수 시간을 한 번 더 확인하는 것을 권장합니다.
          </p>
        </div>
      </section>

      <Suspense fallback={<ContestsPageSkeleton />}>
        <ContestsPageClient initialContests={contests} />
      </Suspense>
    </div>
  );
}

// ----------------------------------------------------------
// 로딩 스켈레톤 (shimmer 효과)
// ----------------------------------------------------------

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gray-100 ${className ?? ""}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

function ContestsPageSkeleton() {
  return (
    <div className="space-y-5">
      {/* 검색바 */}
      <SkeletonBox className="h-12 rounded-2xl" />

      {/* 필터바 */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <SkeletonBox className="h-5 w-20" />
          <SkeletonBox className="h-5 w-28" />
        </div>
        <div className="px-4 py-3 space-y-3">
          {[5, 6, 4, 3].map((count, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBox className="w-12 h-4" />
              <div className="flex gap-2">
                {Array.from({ length: count }).map((_, j) => (
                  <SkeletonBox key={j} className="h-6 w-14 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
