import Link from "next/link";
import { ArrowRight, BarChart3, Clock3, FileSearch, Search, ShieldCheck, Trophy } from "lucide-react";
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
    <section className="border-b border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
        <div className="min-w-0">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900">
            <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
            공모전 검토 워크벤치
          </div>
          <h1 className="max-w-3xl text-[2rem] font-black leading-[1.08] text-zinc-950 sm:text-5xl">
            내게 맞는 공모전을 더 쉽게 찾으세요
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            공고 원문, 일정, 상금, 지원 조건, 준비 난이도를 함께 정리해 지원 여부를 빠르게 판단할 수 있도록 돕습니다.
          </p>

          <form action="/contests" className="mt-6 grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 sm:max-w-2xl sm:grid-cols-[1fr_auto]">
            <label className="relative min-w-0">
              <span className="sr-only">공고 검색</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <input
                name="q"
                type="search"
                placeholder="상금, 분야, 주최사, 제출물로 검색"
                className="h-11 w-full rounded-md border border-transparent bg-white pl-10 pr-3 text-sm font-semibold text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button type="submit" className="btn-primary h-11 px-4">
              검색
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
            <Link href="/contests" className="hidden sm:inline-flex btn-primary sm:w-auto">
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

        <aside className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-1">
          <MetricCard icon={FileSearch} label="검토 공고" value={`${totalCount.toLocaleString("ko-KR")}개`} />
          <MetricCard icon={Clock3} label="7일 내 마감" value={`${deadlineSoonCount.toLocaleString("ko-KR")}개`} />
          <MetricCard icon={ShieldCheck} label="출처 확인" value={`${sourceCheckedCount.toLocaleString("ko-KR")}개`} />
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-xs font-black text-amber-800">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              확인된 상금 풀
            </div>
            <p className="mt-2 break-keep text-xl font-black leading-tight text-zinc-950 sm:text-2xl">{prizeSummary.totalLabel}</p>
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
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-card sm:p-4">
      <Icon className="h-4 w-4 text-amber-700" aria-hidden="true" />
      <p className="mt-2 text-[11px] font-black text-zinc-500 sm:text-xs">{label}</p>
      <p className="mt-1 break-keep text-xl font-black leading-tight text-zinc-950 sm:text-2xl">{value}</p>
    </div>
  );
}
