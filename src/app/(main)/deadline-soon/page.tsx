import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fetchContests } from "@/lib/supabase/contests";
import { ContestGrid } from "@/components/ui/ContestGrid";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "마감임박 공고",
  description: "곧 마감되는 공모전·대외활동 공고를 확인하세요. 기회를 놓치지 마세요.",
};

export default async function DeadlineSoonPage() {
  const contests = await fetchContests({
    status: "ongoing",
    sort_by: "deadline",
  }).catch((e: unknown) => {
    console.error("[DeadlineSoonPage] fetchContests 실패:", e);
    return [];
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-gray-600 transition-colors">
          홈
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-700 font-medium">마감임박</span>
      </nav>

      {/* 섹션 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-title-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            마감임박 공고
          </h1>
          <span className="text-sm text-gray-400 font-normal">{contests.length}개</span>
        </div>
        <p className="text-sm text-gray-500 ml-4 leading-relaxed">
          마감이 임박한 공모전·대외활동 공고입니다. 지금 바로 지원하세요.
        </p>
      </div>

      <ContestGrid
        contests={contests}
        emptyTitle="마감임박 공고가 없습니다"
        emptyDescription="현재 모집 중인 공고가 없습니다. 전체 공고를 확인해보세요."
      />
    </div>
  );
}
