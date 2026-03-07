import { Contest, ContestFilter, TargetGroup } from "@/types/contest";

/**
 * 주어진 필터 상태를 공고 목록에 적용하여 필터링 + 정렬된 결과를 반환합니다.
 * - 순수 함수 (side-effect 없음)
 * - 추후 Supabase 쿼리 파라미터 빌더로 교체 가능
 */
export function applyFilters(contests: Contest[], filter: ContestFilter): Contest[] {
  let result = [...contests];

  // 1. 검색어 (제목 · 주최기관 · 한 줄 요약)
  if (filter.search.trim()) {
    const kw = filter.search.trim().toLowerCase();
    result = result.filter(
      (c) =>
        c.title.toLowerCase().includes(kw) ||
        c.organizer.toLowerCase().includes(kw) ||
        c.summary.toLowerCase().includes(kw)
    );
  }

  // 2. 유형 (type)
  if (filter.type !== "전체") {
    result = result.filter((c) => c.type === filter.type);
  }

  // 3. 카테고리 (category)
  if (filter.category !== "전체") {
    result = result.filter((c) => c.category === filter.category);
  }

  // 4. 분야 (field)
  if (filter.field !== "전체") {
    result = result.filter((c) => c.field === filter.field);
  }

  // 5. 대상 (target) — contest.target 배열에 포함 여부
  if (filter.target !== "전체") {
    const t = filter.target as TargetGroup;
    result = result.filter((c) => c.target.includes(t) || c.target.includes("누구나"));
  }

  // 6. 진행 상태 (status)
  if (filter.status !== "전체") {
    result = result.filter((c) => c.status === filter.status);
  }

  // 7. 온라인/오프라인 (online_offline)
  if (filter.online_offline !== "전체") {
    result = result.filter((c) => c.online_offline === filter.online_offline);
  }

  // 8. 정렬
  result.sort((a, b) => {
    switch (filter.sort_by) {
      case "deadline":
        // 마감 순 오름차순 (임박한 것이 앞에)
        return new Date(a.apply_end_at).getTime() - new Date(b.apply_end_at).getTime();
      case "title":
        // 제목 가나다 순
        return a.title.localeCompare(b.title, "ko");
      case "latest":
      default:
        // 등록일 내림차순
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return result;
}
