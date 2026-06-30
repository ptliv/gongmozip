import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Coins,
  FileSearch,
  Search,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { POPULAR_TYPES } from "@/components/ui/CategoryChip";
import type { PrizePoolSummary } from "@/lib/prize";

interface HeroSectionProps {
  readonly prizeSummary: PrizePoolSummary;
}

const DECISION_POINTS = [
  { label: "마감 위험", value: "D-day 기준", icon: Clock3 },
  { label: "준비 난이도", value: "제출물 기준", icon: BarChart3 },
  { label: "출처 확인", value: "공식 링크 우선", icon: ShieldCheck },
] as const;

export function HeroSection({ prizeSummary }: HeroSectionProps) {
  const topPrizes = prizeSummary.topPrizes.slice(0, 3);
  const contestCount = prizeSummary.contestCount.toLocaleString("ko-KR");

  return (
    <section className="border-b border-stone-200 bg-[#f8f5ee]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border border-amber-300 bg-amber-100/70 px-3 py-1.5 text-xs font-black text-amber-900">
            <FileSearch className="h-3.5 w-3.5" />
            공고를 읽기 전에 보는 지원 판단서
          </div>

          <h1 className="max-w-3xl text-3xl font-black leading-tight text-zinc-950 sm:text-5xl">
            마감일, 혜택, 준비 난이도를 한 번에 보고 지원할 공고를 고르세요
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            공모전집은 모집 요강을 단순히 모아두지 않고 상금, 대상, 제출물, 마감 위험을 함께 정리해 오늘 검토할 공고를 좁혀줍니다.
          </p>

          <form action="/contests" className="mt-7 flex max-w-2xl flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">공고 검색</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                name="q"
                type="search"
                placeholder="상금, 분야, 주최사, 제출물로 검색"
                className="h-12 w-full rounded-lg border border-stone-300 bg-white pl-12 pr-4 text-sm font-medium text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </label>
            <button type="submit" className="btn-primary h-12 px-5">
              검색
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-zinc-500">빠른 탐색</span>
            {POPULAR_TYPES.slice(0, 5).map((type) => (
              <Link
                key={type.label}
                href={`/contests?type=${type.label}`}
                className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition-colors hover:border-amber-300 hover:text-amber-800"
              >
                {type.label}
              </Link>
            ))}
            <Link
              href="/contests?sort=recommended"
              className="inline-flex items-center gap-1 rounded-md border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-zinc-800"
            >
              지원 가치순
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <aside className="report-panel overflow-hidden">
          <div className="border-b border-stone-200 bg-white px-5 py-4">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Decision Desk</p>
            <h2 className="mt-1 text-xl font-black text-zinc-950">오늘 확인할 핵심 지표</h2>
          </div>

          <div className="grid gap-3 p-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-amber-800">
                <Coins className="h-4 w-4" />
                확인된 상금 풀
              </div>
              <p className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
                {prizeSummary.totalLabel}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                금액이 명시된 모집 중 공고 {contestCount}개 기준으로 계산했습니다.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {DECISION_POINTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="metric-tile">
                    <Icon className="h-4 w-4 text-zinc-500" />
                    <p className="mt-2 text-sm font-black text-zinc-950">{item.label}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-zinc-500">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-black text-zinc-950">상금 표기 근거</p>
                <Trophy className="h-4 w-4 text-amber-700" />
              </div>
              <div className="grid gap-2">
                {topPrizes.length > 0 ? (
                  topPrizes.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-md border border-stone-200 px-3 py-2 transition-colors hover:border-amber-300 hover:bg-amber-50"
                    >
                      <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-black text-amber-900">
                        {item.amountLabel}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-700 group-hover:text-zinc-950">
                        {item.title}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-zinc-600">
                    상금이 확인되는 공고를 수집하고 있습니다.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span className="font-semibold">
                상세 페이지에서는 지원 가치 점수, 준비 체크리스트, 관련 가이드를 함께 확인할 수 있습니다.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
