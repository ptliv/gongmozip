import { Metadata } from "next";
import { Suspense } from "react";
import { fetchContests } from "@/lib/supabase/contests";
import { ContestsPageClient } from "@/components/contest/ContestsPageClient";
import { canonicalUrl } from "@/lib/seo";

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
