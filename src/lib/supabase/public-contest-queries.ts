import { createServerClient } from "@/lib/supabase/server";
import type { Contest } from "@/types/contest";
import type { ContestRow } from "@/types/database";
import { fetchContestBySlug, normalizeContestRow } from "@/lib/supabase/contests";
import { slugifyContestTitle } from "@/lib/slug";

const BASE_SELECT = `
  id, slug, title, organizer, summary, description, poster_image_url,
  type, category, field, target, region, online_offline, team_allowed,
  apply_start_at, apply_end_at, status, benefit,
  official_source_url, aggregator_source_url,
  source_site, source_url, official_url, external_id, raw_payload, crawled_at, is_verified,
  verified_level, review_score, view_count, created_at, updated_at
`;

const OPEN_STATUSES = ["ongoing", "upcoming"] as const;

const FIELD_RULES: Array<{ label: string; keywords: string[] }> = [
  { label: "IT·테크", keywords: ["ai", "인공지능", "it", "개발", "코딩", "데이터", "앱", "웹", "프로그래밍", "소프트웨어", "테크"] },
  { label: "디자인", keywords: ["디자인", "영상", "포스터", "ui", "ux", "브랜딩", "일러스트", "모션"] },
  { label: "마케팅·광고", keywords: ["마케팅", "광고", "홍보", "브랜드", "sns", "콘텐츠"] },
  { label: "사회·환경", keywords: ["사회", "환경", "공익", "기후", "봉사", "esg"] },
  { label: "예술·문화", keywords: ["예술", "문화", "공연", "음악", "미술", "사진", "영화"] },
  { label: "경영·경제", keywords: ["경영", "경제", "창업", "비즈니스", "금융", "회계"] },
  { label: "과학·공학", keywords: ["과학", "공학", "연구", "실험", "로봇", "반도체", "바이오"] },
  { label: "인문·사회", keywords: ["인문", "역사", "철학", "심리", "사회과학"] },
  { label: "법·행정", keywords: ["법", "행정", "공공", "규제", "정책"] },
];

const TARGET_RULES: Array<{ label: string; keywords: string[] }> = [
  { label: "고등학생", keywords: ["고등학생", "고교생"] },
  { label: "청소년", keywords: ["청소년", "중학생"] },
  { label: "대학생", keywords: ["대학생", "학부생"] },
  { label: "대학원생", keywords: ["대학원생", "석사", "박사"] },
  { label: "청년", keywords: ["청년"] },
  { label: "직장인", keywords: ["직장인", "재직자"] },
  { label: "일반인", keywords: ["일반인", "누구나", "국민", "전국민"] },
];

export interface FacetOption {
  slug: string;
  label: string;
  count: number;
}

export interface ContestDetailPayload extends Contest {
  metadata_json: Record<string, unknown>;
  contest_type: string;
  target_tags: string[];
  eligibility_text: string;
  normalized_field: string;
  normalized_targets: string[];
  normalized_host: string;
  host_slug: string;
}

function normalizeHostLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim() || "주최 미정";
}

function extractMetadataText(metadata: Record<string, unknown>): string {
  return Object.values(metadata)
    .map((value) => {
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return value.join(" ");
      return "";
    })
    .join(" ");
}

function inferFieldLabel(contest: Contest, metadata: Record<string, unknown>): string {
  if (contest.field && contest.field.trim() && contest.field !== "기타") {
    return contest.field;
  }

  const haystack = [
    contest.title,
    contest.summary,
    contest.description,
    contest.category,
    contest.type,
    extractMetadataText(metadata),
  ]
    .join(" ")
    .toLowerCase();

  for (const rule of FIELD_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      return rule.label;
    }
  }

  return contest.field?.trim() || "기타";
}

function normalizeTargetLabel(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (v.includes("대학원")) return "대학원생";
  if (v.includes("대학생") || v.includes("학부")) return "대학생";
  if (v.includes("고등학생") || v.includes("고교생")) return "고등학생";
  if (v.includes("청소년") || v.includes("중학생")) return "청소년";
  if (v.includes("직장인") || v.includes("재직")) return "직장인";
  if (v.includes("청년")) return "청년";
  if (v.includes("누구나") || v.includes("일반인") || v.includes("국민")) return "일반인";
  return v;
}

function inferTargets(contest: Contest, metadata: Record<string, unknown>): string[] {
  const targets = new Set<string>();

  for (const target of contest.target ?? []) {
    const normalized = normalizeTargetLabel(target);
    if (normalized) targets.add(normalized);
  }

  const haystack = [
    contest.title,
    contest.summary,
    contest.description,
    extractMetadataText(metadata),
  ]
    .join(" ")
    .toLowerCase();

  for (const rule of TARGET_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      targets.add(rule.label);
    }
  }

  return Array.from(targets);
}

function toDetailPayload(contest: Contest): ContestDetailPayload {
  const metadata =
    contest.raw_payload && typeof contest.raw_payload === "object"
      ? contest.raw_payload
      : {};

  const normalizedField = inferFieldLabel(contest, metadata);
  const normalizedTargets = inferTargets(contest, metadata);
  const normalizedHost = normalizeHostLabel(contest.organizer || "");

  return {
    ...contest,
    official_source_url: contest.official_source_url || contest.official_url || "",
    source_url: contest.source_url || contest.aggregator_source_url || null,
    metadata_json: metadata,
    contest_type: contest.type,
    target_tags: contest.target ?? [],
    eligibility_text: contest.description || contest.summary || "",
    normalized_field: normalizedField,
    normalized_targets: normalizedTargets,
    normalized_host: normalizedHost,
    host_slug: slugifyContestTitle(normalizedHost),
  };
}

function sortByDeadlineAsc(a: ContestDetailPayload, b: ContestDetailPayload): number {
  const aDate = Date.parse(a.apply_end_at || "");
  const bDate = Date.parse(b.apply_end_at || "");
  if (Number.isNaN(aDate) && Number.isNaN(bDate)) return 0;
  if (Number.isNaN(aDate)) return 1;
  if (Number.isNaN(bDate)) return -1;
  return aDate - bDate;
}

function buildFacetOptions(
  items: ContestDetailPayload[],
  selector: (item: ContestDetailPayload) => string[]
): FacetOption[] {
  const map = new Map<string, { label: string; count: number }>();

  for (const item of items) {
    const values = selector(item).filter(Boolean);
    for (const value of values) {
      const label = value.trim();
      if (!label) continue;
      const slug = slugifyContestTitle(label);
      if (!slug) continue;

      const prev = map.get(slug);
      if (!prev) {
        map.set(slug, { label, count: 1 });
      } else {
        map.set(slug, { label: prev.label, count: prev.count + 1 });
      }
    }
  }

  return Array.from(map.entries())
    .map(([slug, value]) => ({ slug, label: value.label, count: value.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function isWithinDays(dateText: string, maxDays: number): boolean {
  const date = Date.parse(dateText);
  if (Number.isNaN(date)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= maxDays;
}

async function fetchOpenContests(limit = 2000): Promise<ContestDetailPayload[]> {
  const safeLimit = Math.max(50, Math.min(Number(limit) || 2000, 5000));
  const supabase = createServerClient();
  const { data, error } = await (supabase as any)
    .from("contests")
    .select(BASE_SELECT)
    .in("status", OPEN_STATUSES)
    .gte("verified_level", 1)   // 자동공개(1) 또는 관리자 검수 완료(2,3)만 공개
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`[fetchOpenContests] ${error.message}`);
  }

  return ((data ?? []) as ContestRow[]).map(normalizeContestRow).map(toDetailPayload);
}

export async function getContestDetailPayload(slug: string): Promise<{
  ok: boolean;
  contest: ContestDetailPayload | null;
}> {
  const contest = await fetchContestBySlug(slug, { verified_only: true });
  if (!contest) {
    return { ok: false, contest: null };
  }
  return { ok: true, contest: toDetailPayload(contest) };
}

export async function getRecentContestsPayload(limit = 20): Promise<{
  ok: boolean;
  items: ContestDetailPayload[];
}> {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const contests = await fetchOpenContests(Math.max(300, safeLimit));
  return {
    ok: true,
    items: contests
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, safeLimit),
  };
}

export async function getRelatedContestsPayload(
  contestType: string,
  excludeId: string,
  limit = 6
): Promise<{
  ok: boolean;
  items: ContestDetailPayload[];
}> {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 12));
  const supabase = createServerClient();
  let query = (supabase as any)
    .from("contests")
    .select(BASE_SELECT)
    .eq("type", contestType)
    .in("status", OPEN_STATUSES)
    .order("apply_end_at", { ascending: true, nullsFirst: false })
    .limit(safeLimit + 2);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`[getRelatedContestsPayload] ${error.message}`);

  const items = ((data ?? []) as ContestRow[])
    .map(normalizeContestRow)
    .map(toDetailPayload)
    .filter((item) => item.id !== excludeId)
    .slice(0, safeLimit);

  return { ok: true, items };
}

export async function getDeadlineContestsPayload(limit = 200): Promise<{
  ok: boolean;
  items: ContestDetailPayload[];
}> {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 1000));
  const contests = await fetchOpenContests(Math.max(400, safeLimit));
  return {
    ok: true,
    items: contests.sort(sortByDeadlineAsc).slice(0, safeLimit),
  };
}

export async function getDeadline7DaysContestsPayload(limit = 200): Promise<{
  ok: boolean;
  items: ContestDetailPayload[];
}> {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 1000));
  const contests = await fetchOpenContests(2000);
  const items = contests
    .filter((item) => item.status === "ongoing")
    .filter((item) => isWithinDays(item.apply_end_at, 7))
    .sort(sortByDeadlineAsc)
    .slice(0, safeLimit);
  return { ok: true, items };
}

export async function getCategoryContestsPayload(categorySlug: string): Promise<{
  ok: boolean;
  category: string;
  items: ContestDetailPayload[];
}> {
  const contests = await fetchOpenContests(2000);
  const normalizedParam = slugifyContestTitle(decodeURIComponent(categorySlug));
  const items = contests
    .filter((item) => {
      const categoryKey = slugifyContestTitle(item.category);
      const typeKey = slugifyContestTitle(item.type);
      return categoryKey === normalizedParam || typeKey === normalizedParam;
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  return {
    ok: true,
    category: decodeURIComponent(categorySlug),
    items,
  };
}

export async function getFieldContestsPayload(fieldSlug: string, limit = 500): Promise<{
  ok: boolean;
  field: string;
  items: ContestDetailPayload[];
}> {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 2000));
  const contests = await fetchOpenContests(2000);
  const normalizedSlug = slugifyContestTitle(decodeURIComponent(fieldSlug));
  const items = contests
    .filter((item) => slugifyContestTitle(item.normalized_field) === normalizedSlug)
    .sort(sortByDeadlineAsc)
    .slice(0, safeLimit);
  const field = items[0]?.normalized_field ?? decodeURIComponent(fieldSlug);
  return { ok: true, field, items };
}

export async function getTargetContestsPayload(targetSlug: string, limit = 500): Promise<{
  ok: boolean;
  target: string;
  items: ContestDetailPayload[];
}> {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 2000));
  const contests = await fetchOpenContests(2000);
  const normalizedSlug = slugifyContestTitle(decodeURIComponent(targetSlug));
  const items = contests
    .filter((item) =>
      item.normalized_targets.some((target) => slugifyContestTitle(target) === normalizedSlug)
    )
    .sort(sortByDeadlineAsc)
    .slice(0, safeLimit);
  const target =
    items
      .flatMap((item) => item.normalized_targets)
      .find((value) => slugifyContestTitle(value) === normalizedSlug) ??
    decodeURIComponent(targetSlug);
  return { ok: true, target, items };
}

export async function getHostContestsPayload(hostSlug: string, limit = 500): Promise<{
  ok: boolean;
  host: string;
  items: ContestDetailPayload[];
}> {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 2000));
  const contests = await fetchOpenContests(2000);
  const normalizedSlug = slugifyContestTitle(decodeURIComponent(hostSlug));
  const items = contests
    .filter((item) => item.host_slug === normalizedSlug)
    .sort(sortByDeadlineAsc)
    .slice(0, safeLimit);
  const host = items[0]?.normalized_host ?? decodeURIComponent(hostSlug);
  return { ok: true, host, items };
}

export async function getFacetOptionsPayload(options?: {
  fieldLimit?: number;
  targetLimit?: number;
  hostLimit?: number;
}): Promise<{
  ok: boolean;
  fields: FacetOption[];
  targets: FacetOption[];
  hosts: FacetOption[];
}> {
  const fieldLimit = Math.max(1, Math.min(options?.fieldLimit ?? 8, 50));
  const targetLimit = Math.max(1, Math.min(options?.targetLimit ?? 8, 50));
  const hostLimit = Math.max(1, Math.min(options?.hostLimit ?? 30, 200));
  const contests = await fetchOpenContests(2000);

  const fields = buildFacetOptions(contests, (item) => [item.normalized_field]).slice(0, fieldLimit);
  const targets = buildFacetOptions(contests, (item) => item.normalized_targets).slice(0, targetLimit);
  const hosts = buildFacetOptions(contests, (item) => [item.normalized_host]).slice(0, hostLimit);

  return {
    ok: true,
    fields,
    targets,
    hosts,
  };
}
