import Link from "next/link";
import { ChevronDown } from "lucide-react";

export interface TopBriefingStats {
  readonly totalCount: number;
  readonly endingTodayCount: number;
  readonly endingThisWeekCount: number;
  readonly highPrizeCount: number;
  readonly newCount: number;
}

interface TopBriefingBarProps {
  readonly stats: TopBriefingStats;
}

function countLabel(value: number): string {
  return `${Math.max(0, value).toLocaleString("ko-KR")}건`;
}

export function TopBriefingBar({ stats }: TopBriefingBarProps) {
  const mobileItems = [
    { label: "전체", value: stats.totalCount, href: "/contests", tone: "text-zinc-900" },
    { label: "오늘", value: stats.endingTodayCount, href: "/deadline", tone: "text-red-600" },
    { label: "7일", value: stats.endingThisWeekCount, href: "/deadline/7days", tone: "text-orange-600" },
    { label: "상금", value: stats.highPrizeCount, href: "/contests?q=상금&sort=recommended", tone: "text-amber-700" },
    { label: "신규", value: stats.newCount, href: "/latest", tone: "text-blue-600" },
  ] as const;

  return (
    <div className="border-b border-zinc-200 bg-white/95">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="flex h-9 items-center gap-2 overflow-x-auto whitespace-nowrap text-[11px] scrollbar-hide sm:hidden">
          {mobileItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-black text-zinc-700"
            >
              <span>{item.label}</span>
              <span className={item.tone}>{countLabel(item.value)}</span>
            </Link>
          ))}
        </div>

        <div className="hidden h-10 items-center justify-between gap-4 overflow-hidden text-xs sm:flex">
          <div className="flex min-w-0 max-w-full items-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <Link
            href="/contests"
            className="inline-flex flex-shrink-0 items-center gap-1 font-black text-zinc-800 hover:text-amber-800"
          >
            전체 공모전
            <span className="font-black text-amber-700">{countLabel(stats.totalCount)}</span>
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </Link>
          <span className="h-4 w-px flex-shrink-0 bg-stone-200" aria-hidden="true" />
          <Link href="/#briefing" className="truncate font-semibold text-zinc-600 hover:text-zinc-950">
            공모전집 브리핑 · 오늘 마감 {countLabel(stats.endingTodayCount)}
          </Link>
          <Link href="/deadline" className="flex-shrink-0 font-bold text-red-600 hover:text-red-700">
            오늘 마감 {countLabel(stats.endingTodayCount)}
          </Link>
          <Link href="/deadline/7days" className="flex-shrink-0 font-bold text-orange-600 hover:text-orange-700">
            이번 주 마감 {countLabel(stats.endingThisWeekCount)}
          </Link>
          <Link href="/contests?q=상금&sort=recommended" className="flex-shrink-0 font-bold text-amber-700 hover:text-amber-800">
            상금 높은 공모전 {countLabel(stats.highPrizeCount)}
          </Link>
          <Link href="/latest" className="flex-shrink-0 font-bold text-blue-600 hover:text-blue-700">
            새로 등록된 공모전 {countLabel(stats.newCount)}
          </Link>
          </div>

          <div className="flex flex-shrink-0 items-center gap-3">
            <Link href="/#briefing" className="font-bold text-zinc-600 hover:text-zinc-950">
              브리핑
            </Link>
            <span className="h-4 w-px bg-stone-200" aria-hidden="true" />
            <Link href="/#newsletter" className="font-bold text-zinc-600 hover:text-zinc-950">
              알림받기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
