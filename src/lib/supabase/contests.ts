import { createAdminClient, createServerClient } from "./server";
import type { Contest, ContestFilter } from "@/types/contest";
import type { ContestInsert, ContestRow, ContestUpdate } from "@/types/database";
import {
  buildContestSlug,
  getContestSlug,
  getSlugCandidates,
  normalizeIncomingSlug,
  parseContestSlugSuffix,
} from "@/lib/slug";
import { buildContestSummary, cleanContestText, hasContestTextNoise } from "@/lib/contest-text";

const CONTEST_SELECT = `
  id, slug, title, organizer, summary, description, poster_image_url,
  type, category, field, target, region, online_offline, team_allowed,
  apply_start_at, apply_end_at, status, benefit,
  official_source_url, aggregator_source_url,
  source_site, source_url, official_url, external_id, raw_payload, crawled_at, is_verified,
  verified_level, review_score, view_count, created_at, updated_at
`;

const PUBLIC_STATUSES = ["ongoing", "upcoming"] as const;
const PLACEHOLDER_IMAGE_MARKERS = [
  "noimg",
  "noimgs",
  "no-image",
  "no_image",
  "placeholder",
  "default-image",
  "main_img",
];

function hasPublicThumbnail(value?: string | null): boolean {
  const url = value?.trim() ?? "";
  if (!url.startsWith("http")) return false;
  const lower = url.toLowerCase();
  return !PLACEHOLDER_IMAGE_MARKERS.some((marker) => lower.includes(marker));
}

function applyPublicVisibility(query: any) {
  return query
    .gte("verified_level", 1)
    .in("status", PUBLIC_STATUSES)
    .gt("apply_end_at", todayKey())
    .not("poster_image_url", "is", null)
    .neq("poster_image_url", "");
}

function normalizeDateKey(value?: string | null): string | null {
  if (!value) return null;
  const text = String(value).trim();
  const full = text.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (full) {
    return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
  }
  const short = text.match(/(\d{2})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (short) {
    return `20${short[1]}-${short[2].padStart(2, "0")}-${short[3].padStart(2, "0")}`;
  }
  return null;
}

function todayKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function isNotFutureDeadline(value?: string | null): boolean {
  const key = normalizeDateKey(value);
  return !key || key <= todayKey();
}

export function isPublicContest(contest: Contest): boolean {
  return (
    contest.verified_level >= 1 &&
    PUBLIC_STATUSES.includes(contest.status as (typeof PUBLIC_STATUSES)[number]) &&
    !isNotFutureDeadline(contest.apply_end_at) &&
    hasPublicThumbnail(contest.poster_image_url)
  );
}

export function normalizeContestRow(row: Partial<ContestRow>): Contest {
  const benefit = (row.benefit as Contest["benefit"]) ?? { types: [] };
  const target = (row.target as Contest["target"]) ?? [];
  const base = {
    title: String(row.title ?? ""),
    organizer: String(row.organizer ?? "미상"),
    summary: String(row.summary ?? ""),
    description: String(row.description ?? ""),
    type: row.type as Contest["type"],
    category: row.category as Contest["category"],
    field: row.field as Contest["field"],
    target,
    apply_end_at: String(row.apply_end_at ?? ""),
    benefit,
  };
  const summary = buildContestSummary(base);
  const cleanedDescription = cleanContestText(base.description || base.summary);
  const description =
    cleanedDescription && !hasContestTextNoise(cleanedDescription)
      ? cleanedDescription
      : summary;

  return {
    id: String(row.id ?? ""),
    slug: getContestSlug({
      slug: (row.slug as string | null) ?? null,
      title: (row.title as string | null) ?? null,
      source_site: (row.source_site as string | null) ?? null,
      external_id: (row.external_id as string | null) ?? null,
    }),
    title: base.title,
    organizer: base.organizer,
    summary,
    description,
    poster_image_url: (row.poster_image_url as string | null) ?? null,
    type: row.type as Contest["type"],
    category: row.category as Contest["category"],
    field: row.field as Contest["field"],
    target,
    region: row.region as Contest["region"],
    online_offline: row.online_offline as Contest["online_offline"],
    team_allowed: Boolean(row.team_allowed),
    apply_start_at: String(row.apply_start_at ?? ""),
    apply_end_at: String(row.apply_end_at ?? ""),
    status: row.status as Contest["status"],
    benefit,
    official_source_url: String(row.official_source_url ?? ""),
    aggregator_source_url: (row.aggregator_source_url as string | null) ?? null,
    source_site: (row.source_site as string | null) ?? null,
    source_url: (row.source_url as string | null) ?? null,
    official_url: (row.official_url as string | null) ?? null,
    external_id: (row.external_id as string | null) ?? null,
    raw_payload: (row.raw_payload as Record<string, unknown> | null) ?? null,
    crawled_at: (row.crawled_at as string | null) ?? null,
    is_verified: Boolean(row.is_verified),
    verified_level: Number(row.verified_level ?? 0) as Contest["verified_level"],
    review_score: row.review_score != null ? Number(row.review_score) : null,
    view_count: Number(row.view_count ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function fetchContests(
  filter?: Partial<ContestFilter> & { verified_only?: boolean }
): Promise<Contest[]> {
  const supabase = createServerClient();

  let query = (supabase as any).from("contests").select(CONTEST_SELECT);

  // 공개 페이지용: verified_level >= 1 (자동공개 또는 관리자 검수 완료)
  // 관리자 페이지는 verified_only: false 를 명시적으로 전달해 전체 조회
  if (filter?.verified_only === true) {
    query = applyPublicVisibility(query);
  }

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
    query = query.contains("target", [filter.target]);
  }
  if (filter?.search) {
    query = query.or(`title.ilike.%${filter.search}%,organizer.ilike.%${filter.search}%`);
  }

  if (filter?.sort_by === "recommended") {
    query = query.order("review_score", { ascending: false, nullsFirst: false });
  } else if (filter?.sort_by === "deadline") {
    query = query.order("apply_end_at", { ascending: true });
  } else if (filter?.sort_by === "title") {
    query = query.order("title", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(`[fetchContests] ${error.message}`);
  const contests = ((data ?? []) as ContestRow[]).map((row) => normalizeContestRow(row));
  if (filter?.verified_only !== true) return contests;

  return contests.filter(isPublicContest).map((contest) => ({
    ...contest,
    description: hasContestTextNoise(contest.description) ? contest.summary : contest.description,
    raw_payload: null,
    source_site: null,
    source_url: null,
    official_source_url: "",
    aggregator_source_url: null,
    official_url: null,
  }));
}

export async function fetchContestBySlug(
  slug: string,
  opts?: { verified_only?: boolean }
): Promise<Contest | null> {
  const supabase = createServerClient();
  const slugCandidates = getSlugCandidates(slug);
  const verifiedOnly = opts?.verified_only ?? false;

  // Step 1: DB slug 컬럼 직접 매칭 (normalized/encoded 후보 포함)
  for (const candidate of slugCandidates) {
    let q = (supabase as any)
      .from("contests")
      .select(CONTEST_SELECT)
      .eq("slug", candidate);
    if (verifiedOnly) q = applyPublicVisibility(q);
    const direct = await q.maybeSingle();

    if (direct.error && direct.error.code !== "PGRST116") {
      throw new Error(`[fetchContestBySlug] ${direct.error.message}`);
    }
    if (direct.data) {
      const contest = normalizeContestRow(direct.data as ContestRow);
      return !verifiedOnly || isPublicContest(contest) ? contest : null;
    }
  }

  const normalizedCandidates = new Set(
    slugCandidates.map((candidate) => normalizeIncomingSlug(candidate)).filter(Boolean)
  );
  if (normalizedCandidates.size === 0) {
    return null;
  }

  // Step 2: slug가 null인 행 전체 조회 → computed slug와 비교
  // (slug=null 인 공고는 title+source_site+external_id로 슬러그가 동적 생성됨)
  let nullSlugQuery = (supabase as any)
    .from("contests")
    .select(CONTEST_SELECT)
    .is("slug", null);
  if (verifiedOnly) nullSlugQuery = applyPublicVisibility(nullSlugQuery);
  const { data: nullSlugData, error: nullSlugError } = await nullSlugQuery;

  if (nullSlugError && nullSlugError.code !== "PGRST116") {
    console.error(`[fetchContestBySlug:null-slug] ${nullSlugError.message}`);
  } else {
    const nullMatch = ((nullSlugData ?? []) as ContestRow[]).find((row) =>
      normalizedCandidates.has(getContestSlug(row))
    );
    if (nullMatch) {
      const contest = normalizeContestRow(nullMatch);
      return !verifiedOnly || isPublicContest(contest) ? contest : null;
    }
  }

  // Step 3: source_site + external_id suffix 추출 후 직접 조회
  const suffixPairs = Array.from(
    new Set(
      slugCandidates
        .map((candidate) => {
          const { sourceSite, externalId } = parseContestSlugSuffix(candidate);
          if (!sourceSite || !externalId) return "";
          return `${sourceSite}|${externalId}`;
        })
        .filter(Boolean)
    )
  );

  for (const pair of suffixPairs) {
    const [sourceSite, externalId] = pair.split("|");
    if (!sourceSite || !externalId) continue;
    let suffixQuery = (supabase as any)
      .from("contests")
      .select(CONTEST_SELECT)
      .eq("source_site", sourceSite)
      .eq("external_id", externalId);
    if (verifiedOnly) suffixQuery = applyPublicVisibility(suffixQuery);
    const fallbackBySuffix = await suffixQuery.maybeSingle();

    if (fallbackBySuffix.error && fallbackBySuffix.error.code !== "PGRST116") {
      throw new Error(`[fetchContestBySlug:fallback:suffix] ${fallbackBySuffix.error.message}`);
    }
    if (fallbackBySuffix.data) {
      const contest = normalizeContestRow(fallbackBySuffix.data as ContestRow);
      return !verifiedOnly || isPublicContest(contest) ? contest : null;
    }
  }

  // Step 4: 비정규화된 non-null slug 행 스캔 (legacy/encoded slug 대응)
  // null slug는 Step 2에서 처리했으므로 여기서는 non-null만 조회
  let fallbackQuery = (supabase as any)
    .from("contests")
    .select(CONTEST_SELECT)
    .not("slug", "is", null);
  if (verifiedOnly) fallbackQuery = applyPublicVisibility(fallbackQuery);
  const { data, error } = await fallbackQuery
    .order("updated_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(`[fetchContestBySlug:fallback:normalize] ${error.message}`);
  }

  const match = ((data ?? []) as ContestRow[]).find((row) =>
    normalizedCandidates.has(getContestSlug(row))
  );

  if (!match) return null;
  const contest = normalizeContestRow(match);
  return !verifiedOnly || isPublicContest(contest) ? contest : null;
}

export async function fetchContestById(id: string): Promise<Contest | null> {
  const supabase = createServerClient();

  const { data, error } = await (supabase as any)
    .from("contests")
    .select(CONTEST_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`[fetchContestById] ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return normalizeContestRow(data as ContestRow);
}

export async function incrementViewCount(id: string): Promise<void> {
  const supabase = createServerClient();
  await (supabase as any).rpc("increment_view_count", { contest_id: id });
}

export async function upsertContest(values: ContestInsert, id?: string): Promise<Contest> {
  const supabase = createAdminClient();
  const db = supabase as any;

  if (id) {
    const updatePayload: ContestUpdate = {
      ...values,
      slug: values.slug?.trim() ? values.slug : buildContestSlug(values.title),
    };

    const { data, error } = await db
      .from("contests")
      .update(updatePayload)
      .eq("id", id)
      .select(CONTEST_SELECT)
      .single();

    if (error) throw new Error(`[upsertContest:update] ${error.message}`);
    return normalizeContestRow(data as ContestRow);
  }

  const insertPayload: ContestInsert = {
    ...values,
    slug: values.slug?.trim() ? values.slug : buildContestSlug(values.title),
  };

  const { data, error } = await db
    .from("contests")
    .insert(insertPayload)
    .select(CONTEST_SELECT)
    .single();

  if (error) throw new Error(`[upsertContest:insert] ${error.message}`);
  return normalizeContestRow(data as ContestRow);
}

export async function deleteContest(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await (supabase as any).from("contests").delete().eq("id", id);
  if (error) throw new Error(`[deleteContest] ${error.message}`);
}
