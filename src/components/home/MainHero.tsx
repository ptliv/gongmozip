import Link from "next/link";
import { ArrowRight, BarChart3, Clock3, FileSearch, ShieldCheck, Trophy } from "lucide-react";
import type { PrizePoolSummary } from "@/lib/prize";

interface MainHeroProps {
  readonly totalCount: number;
  readonly deadlineSoonCount: number;
  readonly sourceCheckedCount: number;
  readonly prizeSummary: PrizePoolSummary;
}

export function MainHero({
  totalCount,
  deadlineSoonCount,
  sourceCheckedCount,
  prizeSummary,
}: MainHeroProps) {
  return (
    <section className="border-b border-stone-200 bg-[#f8f5ee]">
      <div className="mx-auto grid max-w-6xl gap-7 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_22rem] lg:items-center">
        <div>
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
            <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
            공모전 검토 워크벤치
          </div>
          <h1 className="max-w-3xl text-3xl font-black leading-tight text-zinc-950 sm:text-5xl">
            내게 맞는 공모전을 더 쉽게 찾으세요
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            공고 원문, 일정, 상금, 지원 조건, 준비 난이도를 함께 정리해 지원 여부를 빠르게 판단할 수 있도록 돕습니다.
          </p>
          <div className="mt-7 grid gap-2 sm:flex sm:flex-wrap">
            <Link href="/contests" className="btn-primary w-full sm:w-auto">
              공고 검색하기
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/deadline" className="btn-secondary w-full sm:w-auto">
              마감 임박 보기
            </Link>
            <Link href="/guides" className="btn-secondary w-full sm:w-auto">
              준비 가이드 보기
            </Link>
          </div>
        </div>

        <aside className="grid gap-3">
          <MetricCard icon={FileSearch} label="검토 공고" value={`${totalCount.toLocaleString("ko-KR")}개`} />
          <MetricCard icon={Clock3} label="7일 내 마감" value={`${deadlineSoonCount.toLocaleString("ko-KR")}개`} />
          <MetricCard icon={ShieldCheck} label="출처 확인" value={`${sourceCheckedCount.toLocaleString("ko-KR")}개`} />
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-xs font-black text-amber-800">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              확인된 상금 풀
            </div>
            <p className="mt-2 text-2xl font-black text-zinc-950">{prizeSummary.totalLabel}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: typeof BarChart3;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-card">
      <Icon className="h-4 w-4 text-amber-700" aria-hidden="true" />
      <p className="mt-2 text-xs font-black text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-zinc-950">{value}</p>
    </div>
  );
}
