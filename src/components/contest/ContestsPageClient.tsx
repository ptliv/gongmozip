"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Contest, ContestFilter, DEFAULT_FILTER } from "@/types/contest";
import { applyFilters, filterFromSearchParams, filterToQueryString } from "@/lib/filters";
import { AdSlot } from "@/components/ads/AdSlot";
import { SearchBar } from "./SearchBar";
import { FilterBar } from "./FilterBar";
import { ContestList } from "./ContestList";

// ----------------------------------------------------------
// 이 컴포넌트는 useSearchParams()를 사용하므로
// 상위에서 반드시 <Suspense>로 감싸야 합니다.
// ----------------------------------------------------------

interface Props {
  initialContests: Contest[];
}

const PAGE_SIZE = 18;

export function ContestsPageClient({ initialContests }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL에서 초기 필터 상태 파싱
  const [filter, setFilter] = useState<ContestFilter>(() =>
    filterFromSearchParams(searchParams)
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // 검색어 디바운스 타이머
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  // URL 반영 (기본값은 파라미터에서 제거해 URL을 깔끔하게 유지)
  const pushUrl = useCallback(
    (next: ContestFilter) => {
      router.replace(`${pathname}${filterToQueryString(next)}`, { scroll: false });
    },
    [router, pathname]
  );

  // 필터 업데이트 — search는 400ms 디바운스, 나머지는 즉시 URL 반영
  const updateFilter = useCallback(
    (partial: Partial<ContestFilter>) => {
      setFilter((prev) => {
        const next = { ...prev, ...partial };
        setVisibleCount(PAGE_SIZE);

        if ("search" in partial) {
          clearTimeout(searchDebounceRef.current);
          searchDebounceRef.current = setTimeout(() => pushUrl(next), 400);
        } else {
          pushUrl(next);
        }

        return next;
      });
    },
    [pushUrl]
  );

  // 전체 초기화
  const resetFilter = useCallback(() => {
    setFilter(DEFAULT_FILTER);
    setVisibleCount(PAGE_SIZE);
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  // 필터 적용 (메모이제이션)
  const filtered = useMemo(
    () => applyFilters(initialContests, filter),
    [initialContests, filter]
  );
  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="space-y-5">
      <SearchBar
        value={filter.search}
        onChange={(v) => updateFilter({ search: v })}
        onSearch={(v) => updateFilter({ search: v })}
        placeholder="공고명, 주최사, 분야, 제출물로 검색"
        size="md"
      />

      <FilterBar
        filter={filter}
        onChange={updateFilter}
        onReset={resetFilter}
        totalCount={filtered.length}
      />

      <div className="report-panel flex flex-col gap-3 bg-[#fffdf8] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-zinc-950">검토 결과 {filtered.length}개</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            현재 조건에 맞는 공고 중 {visible.length}개를 먼저 보여줍니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="report-chip">정렬 {filter.sort_by}</span>
          {filter.analysis !== "전체" && <span className="report-chip">판단 {filter.analysis}</span>}
          {filter.type !== "전체" && <span className="report-chip">유형 {filter.type}</span>}
        </div>
      </div>

      <ContestList contests={visible} onReset={resetFilter} />

      {hasMore && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-black text-zinc-700 transition-colors hover:border-amber-300 hover:bg-amber-50"
          >
            더 보기 ({filtered.length - visible.length}개 남음)
          </button>
        </div>
      )}

      <AdSlot placement="listBottom" />
    </div>
  );
}
