import Link from "next/link";
import { Contest } from "@/types/contest";
import { ContestCard } from "@/components/contest/ContestCard";
import { Sparkles, ArrowRight } from "lucide-react";

interface LatestContestsSectionProps {
  contests: Contest[];
}

export function LatestContestsSection({ contests }: LatestContestsSectionProps) {
  return (
    <section className="py-12">
      <div className="section-header">
        <div className="section-title">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">최신 공고</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">새로 등록된 공고</p>
          </div>
        </div>
        <Link
          href="/contests"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors group"
        >
          전체보기
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {contests.map((contest) => (
          <ContestCard key={contest.id} contest={contest} />
        ))}
      </div>
    </section>
  );
}
