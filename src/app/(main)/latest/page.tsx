import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fetchContests } from "@/lib/supabase/contests";
import { ContestGrid } from "@/components/ui/ContestGrid";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "최신 공고",
  description: "새롭게 등록된 공모전·대외활동 공고를 가장 먼저 확인하세요.",
};

export default async function LatestPage() {
  const contests = await fetchContests().catch((e: unknown) => {
    console.error("[LatestPage] fetchContests 실패:", e);
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
        <span className="text-gray-700 font-medium">최신 공고</span>
      </nav>

      {/* 섹션 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-title-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            최신 공고
          </h1>
          <span className="text-sm text-gray-400 font-normal">{contests.length}개</span>
        </div>
        <p className="text-sm text-gray-500 ml-4 leading-relaxed">
          새롭게 등록된 공모전·대외활동 공고를 가장 먼저 확인하세요.
        </p>
      </div>

      <ContestGrid
        contests={contests}
        emptyTitle="공고가 없습니다"
        emptyDescription="현재 등록된 공고가 없습니다. 나중에 다시 확인해주세요."
      />
    </div>
  );
}
