/**
 * SEO 목록 페이지 공용 그리드 (서버 컴포넌트)
 * — 공고 카드 그리드 + 서버 컴포넌트 호환 Empty State
 */
import Link from "next/link";
import { Search } from "lucide-react";
import { Contest } from "@/types/contest";
import { ContestCard } from "@/components/contest/ContestCard";

interface ContestGridProps {
  contests: Contest[];
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ContestGrid({
  contests,
  emptyTitle = "공고가 없습니다",
  emptyDescription = "현재 등록된 공고가 없습니다. 나중에 다시 확인해주세요.",
}: ContestGridProps) {
  if (contests.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100/70 flex items-center justify-center shadow-sm">
            <Search className="w-8 h-8 text-blue-400" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 opacity-20 blur-sm" />
        </div>
        <h3 className="text-base font-bold text-gray-800 mb-1.5">{emptyTitle}</h3>
        <p className="text-sm text-gray-500 max-w-[240px] leading-relaxed mb-6">
          {emptyDescription}
        </p>
        <Link href="/contests" className="btn-primary">
          전체 공고 보기
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {contests.map((c) => (
        <ContestCard key={c.id} contest={c} />
      ))}
    </div>
  );
}
