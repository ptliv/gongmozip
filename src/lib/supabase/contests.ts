/**
 * contests 테이블 CRUD 함수 모음
 *
 * 현재 더미 데이터 → Supabase 전환 매핑:
 *
 *   DUMMY_CONTESTS                               → fetchContests()
 *   DUMMY_CONTESTS.find(c => c.slug === slug)    → fetchContestBySlug(slug)
 *   DUMMY_CONTESTS.find(c => c.id === id)        → fetchContestById(id)
 *   console.log("[ContestForm] 저장:", values)   → upsertContest(values, id?)
 *
 * 모든 함수는 Server Component / Server Action에서 호출합니다.
 *
 * NOTE: supabase-js 제네릭은 `supabase gen types typescript`로 자동 생성한
 *       Database 타입과 함께 사용할 때 완전히 동작합니다. 현재는 수동 타입을
 *       사용하므로 일부 구간에서 명시적 타입 캐스팅을 사용합니다.
 */

import { createServerClient, createAdminClient } from "./server";
import type { Contest, ContestFilter } from "@/types/contest";
import type { ContestInsert, ContestUpdate, ContestRow } from "@/types/database";

// ----------------------------------------------------------
// 내부 헬퍼
// ----------------------------------------------------------

function rowToContest(row: ContestRow): Contest {
  return {
    ...row,
    // date 컬럼은 Supabase가 ISO string으로 반환하므로 그대로 사용
    apply_start_at: row.apply_start_at,
    apply_end_at: row.apply_end_at,
  };
}

// ----------------------------------------------------------
// 공개 읽기 (anon key + RLS)
// ----------------------------------------------------------

/**
 * 공고 목록 조회 — ContestFilter를 Supabase query builder로 매핑
 *
 * 기존 applyFilters() 순수 함수의 Supabase 버전.
 * 클라이언트 측 필터링 대신 DB 레벨에서 필터링하므로 성능이 좋습니다.
 */
export async function fetchContests(
  filter?: Partial<ContestFilter>
): Promise<Contest[]> {
  const supabase = createServerClient();

  let query = (supabase as any)
    .from("contests")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter?.status && filter.status !== "전체") {
    query = query.eq("status", filter.status);
  }
  if (filter?.type && filter.type !== "전체") {
    query = query.eq("type", filter.type);
  }
  if (filter?.category && filter.category !== "전체") {
    query = query.eq("category", filter.category);
  }
  if (filter?.field && filter.field !== "전체") {
    query = query.eq("field", filter.field);
  }
  if (filter?.online_offline && filter.online_offline !== "전체") {
    query = query.eq("online_offline", filter.online_offline);
  }
  if (filter?.target && filter.target !== "전체") {
    // text[] 컬럼에서 특정 값 포함 여부
    query = query.contains("target", [filter.target]);
  }
  if (filter?.search) {
    query = query.or(
      `title.ilike.%${filter.search}%,organizer.ilike.%${filter.search}%`
    );
  }
  if (filter?.sort_by === "deadline") {
    query = query.order("apply_end_at", { ascending: true });
  } else if (filter?.sort_by === "title") {
    query = query.order("title", { ascending: true });
  }

  const { data, error } = await query;

  if (error) throw new Error(`[fetchContests] ${error.message}`);
  return ((data ?? []) as ContestRow[]).map(rowToContest);
}

/** slug로 단일 공고 조회 — /contests/[slug] 상세 페이지용 */
export async function fetchContestBySlug(slug: string): Promise<Contest | null> {
  const supabase = createServerClient();

  const { data, error } = await (supabase as any)
    .from("contests")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error?.code === "PGRST116") return null; // not found
  if (error) throw new Error(`[fetchContestBySlug] ${error.message}`);
  return rowToContest(data as ContestRow);
}

/** id로 단일 공고 조회 — /admin/contests/[id] 편집 페이지용 */
export async function fetchContestById(id: string): Promise<Contest | null> {
  const supabase = createServerClient();

  const { data, error } = await (supabase as any)
    .from("contests")
    .select("*")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`[fetchContestById] ${error.message}`);
  return rowToContest(data as ContestRow);
}

/**
 * 조회수 증가 — 상세 페이지 진입 시 호출
 * SQL 함수: update contests set view_count = view_count + 1 where id = $1
 */
export async function incrementViewCount(id: string): Promise<void> {
  const supabase = createServerClient();
  await (supabase as any).rpc("increment_view_count", { contest_id: id });
}

// ----------------------------------------------------------
// 관리자 쓰기 (service_role key — RLS bypass)
// ----------------------------------------------------------

/**
 * 공고 생성 또는 수정 (upsert)
 *
 * id가 없으면 insert, 있으면 update.
 *
 * 사용 예 (Server Action):
 *   "use server";
 *   await upsertContest(formValues, contestId);
 */
export async function upsertContest(
  values: ContestInsert,
  id?: string
): Promise<Contest> {
  const supabase = createAdminClient();
  const db = supabase as any;

  if (id) {
    const update: ContestUpdate = values;
    const { data, error } = await db
      .from("contests")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`[upsertContest:update] ${error.message}`);
    return rowToContest(data as ContestRow);
  } else {
    const slug = generateSlug(values.title);
    const { data, error } = await db
      .from("contests")
      .insert({ ...values, slug })
      .select()
      .single();

    if (error) throw new Error(`[upsertContest:insert] ${error.message}`);
    return rowToContest(data as ContestRow);
  }
}

/** 공고 삭제 */
export async function deleteContest(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await (supabase as any).from("contests").delete().eq("id", id);
  if (error) throw new Error(`[deleteContest] ${error.message}`);
}

// ----------------------------------------------------------
// 내부 유틸
// ----------------------------------------------------------

/** 한국어 제목 → URL-safe slug 변환 */
function generateSlug(title: string): string {
  const timestamp = Date.now();
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${sanitized}-${timestamp}`;
}
