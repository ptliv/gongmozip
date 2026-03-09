"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Contest, ContestFilter, DEFAULT_FILTER } from "@/types/contest";
import { applyFilters, filterFromSearchParams, filterToQueryString } from "@/lib/filters";
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
      {/* 검색바 */}
      <SearchBar
        value={filter.search}
        onChange={(v) => updateFilter({ search: v })}
        onSearch={(v) => updateFilter({ search: v })}
        size="md"
      />

      {/* 필터 패널 */}
      <FilterBar
        filter={filter}
        onChange={updateFilter}
        onReset={resetFilter}
        totalCount={filtered.length}
      />

      {/* 공고 목록 */}
      <ContestList contests={visible} onReset={resetFilter} />

      {hasMore && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            더 보기 ({filtered.length - visible.length}개 남음)
          </button>
        </div>
      )}
    </div>
  );
}
