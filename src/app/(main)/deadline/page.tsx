import type { Metadata } from "next";
import Link from "next/link";
import { ContestGrid } from "@/components/ui/ContestGrid";
import { getDeadlineContestsPayload } from "@/lib/supabase/public-contest-queries";
import { canonicalUrl } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "마감임박 공고",
  description: "오늘 기준으로 마감일이 가까운 공모전/대외활동 공고를 확인하세요.",
  alternates: {
    canonical: canonicalUrl("/deadline"),
  },
};

export default async function DeadlinePage() {
  const deadlinePayload = await getDeadlineContestsPayload(200).catch((error: unknown) => {
    console.error("[DeadlinePage] getDeadlineContestsPayload failed:", error);
    return { ok: false, items: [] };
  });

  const contests = deadlinePayload.ok ? deadlinePayload.items : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-title-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">마감임박</h1>
          <span className="text-sm text-gray-400 font-normal">{contests.length}개</span>
        </div>
        <p className="text-sm text-gray-500 ml-4 leading-relaxed">
          오늘 기준으로 마감일이 가까운 순서대로 정렬했습니다.
        </p>
        <div className="ml-4 mt-3">
          <Link
            href="/deadline/7days"
            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
          >
            7일 내 마감만 보기
          </Link>
        </div>
      </div>

      <ContestGrid
        contests={contests}
        emptyTitle="마감임박 공고가 없습니다"
        emptyDescription="현재 모집 중인 마감임박 공고가 없습니다."
      />
    </div>
  );
}
