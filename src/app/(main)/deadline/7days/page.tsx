import type { Metadata } from "next";
import { ContestGrid } from "@/components/ui/ContestGrid";
import { getDeadline7DaysContestsPayload } from "@/lib/supabase/public-contest-queries";
import { canonicalUrl } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "7일 내 마감 공고",
  description: "오늘 기준 7일 이내 마감되는 진행중 공고 목록입니다.",
  alternates: {
    canonical: canonicalUrl("/deadline/7days"),
  },
};

export default async function Deadline7DaysPage() {
  const payload = await getDeadline7DaysContestsPayload(300).catch((error: unknown) => {
    console.error("[Deadline7DaysPage] getDeadline7DaysContestsPayload failed:", error);
    return { ok: false, items: [] };
  });

  const contests = payload.items;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-title-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">7일 내 마감</h1>
          <span className="text-sm text-gray-400 font-normal">{contests.length}개</span>
        </div>
        <p className="text-sm text-gray-500 ml-4 leading-relaxed">
          모집중 상태이면서 7일 내 마감 공고만 표시합니다.
        </p>
      </div>

      <ContestGrid
        contests={contests}
        emptyTitle="7일 내 마감 공고가 없습니다"
        emptyDescription="현재 7일 이내 마감되는 모집중 공고가 없습니다."
      />
    </div>
  );
}
