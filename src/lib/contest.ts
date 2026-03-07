import { Contest } from "@/types/contest";
import { isDeadlineSoon } from "@/lib/date";

// ----------------------------------------------------------
// 단건 조회
// ----------------------------------------------------------

export function getContestBySlug(
  contests: Contest[],
  slug: string
): Contest | undefined {
  return contests.find((c) => c.slug === slug);
}

// ----------------------------------------------------------
// 큐레이션 목록 (홈 화면용)
// 목록 페이지 필터링은 lib/filters/apply.ts 사용
// ----------------------------------------------------------

/** 마감임박 공고 (기본: 7일 이내, 마감일 오름차순) */
export function getDeadlineSoonContests(
  contests: Contest[],
  withinDays = 7
): Contest[] {
  return contests
    .filter(
      (c) =>
        c.status === "ongoing" &&
        isDeadlineSoon(c.apply_end_at, withinDays)
    )
    .sort(
      (a, b) =>
        new Date(a.apply_end_at).getTime() -
        new Date(b.apply_end_at).getTime()
    );
}

/** 최신 공고 */
export function getLatestContests(
  contests: Contest[],
  limit = 6
): Contest[] {
  return [...contests]
    .filter((c) => c.status !== "canceled")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}

/** 인기 공고 (view_count 기준) */
export function getPopularContests(
  contests: Contest[],
  limit = 6
): Contest[] {
  return [...contests]
    .filter((c) => c.status === "ongoing")
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, limit);
}

/**
 * 비슷한 공고 추천 (스코어링)
 * type 일치 +3 / field 일치 +2 / category 일치 +1
 * 동점이면 view_count로 정렬
 */
export function getSimilarContests(
  contests: Contest[],
  current: Contest,
  limit = 4
): Contest[] {
  return contests
    .filter((c) => c.id !== current.id && c.status !== "canceled")
    .map((c) => {
      let score = 0;
      if (c.type === current.type) score += 3;
      if (c.field === current.field) score += 2;
      if (c.category === current.category) score += 1;
      return { contest: c, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.contest.view_count - a.contest.view_count
    )
    .slice(0, limit)
    .map((item) => item.contest);
}
