import type { Metadata } from "next";
import type { Contest } from "@/types/contest";

export const NOINDEX_FOLLOW_ROBOTS = {
  index: false,
  follow: true,
} satisfies Metadata["robots"];

const AGGREGATOR_HOST_KEYWORDS = [
  "campuspick.com",
  "wevity.com",
  "all-con.co.kr",
  "allcon.co.kr",
  "contestkorea.com",
  "linkareer.com",
  "thinkcontest.com",
  "detizen.com",
] as const;

interface ContestWithSourceCheck extends Contest {
  readonly source_checked_at?: string | null;
}

export interface ContestIndexDecision {
  readonly indexable: boolean;
  readonly reasons: readonly string[];
  readonly officialUrl: string;
  readonly sourceCheckedAt: string | null;
  readonly expiredDays: number | null;
  readonly archived: boolean;
}

function normalizeHttpUrl(value?: string | null): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function isAggregatorUrl(value?: string | null): boolean {
  const url = normalizeHttpUrl(value);
  if (!url) return false;

  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return AGGREGATOR_HOST_KEYWORDS.some((keyword) => host.includes(keyword));
  } catch {
    return false;
  }
}

export function getOfficialContestUrl(contest: Contest): string {
  const candidates = [contest.official_url, contest.official_source_url];

  for (const candidate of candidates) {
    const url = normalizeHttpUrl(candidate);
    if (url && !isAggregatorUrl(url)) return url;
  }

  return "";
}

function getRawPayloadValue(contest: Contest, key: string): string | null {
  const payload = contest.raw_payload;
  if (!payload || typeof payload !== "object") return null;

  const direct = payload[key];
  if (typeof direct === "string" && direct.trim()) return direct;

  const enrichment = payload.enrichment;
  if (!enrichment || typeof enrichment !== "object") return null;

  const value = (enrichment as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function getContestSourceCheckedAt(contest: Contest): string | null {
  const withSourceCheck = contest as ContestWithSourceCheck;
  return (
    withSourceCheck.source_checked_at ??
    getRawPayloadValue(contest, "source_checked_at") ??
    contest.crawled_at ??
    contest.updated_at ??
    null
  );
}

function dateKeyInKorea(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function toKoreaDate(value?: string | null): Date | null {
  const dateKey = value?.slice(0, 10);
  if (!dateKey) return null;
  const date = new Date(`${dateKey}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getExpiredDays(contest: Contest, now: Date): number | null {
  const end = toKoreaDate(contest.apply_end_at);
  if (!end) return null;

  const today = new Date(`${dateKeyInKorea(now)}T00:00:00+09:00`);
  const diff = Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

export function getContestIndexDecision(
  contest: Contest,
  now: Date = new Date()
): ContestIndexDecision {
  const reasons: string[] = [];
  const officialUrl = getOfficialContestUrl(contest);
  const sourceCheckedAt = getContestSourceCheckedAt(contest);
  const expiredDays = getExpiredDays(contest, now);
  const archived = typeof expiredDays === "number" && expiredDays > 30;

  if (!officialUrl) reasons.push("official_url_missing");
  if (!sourceCheckedAt) reasons.push("source_checked_at_missing");
  if (archived) reasons.push("expired_over_30_days");
  if (contest.verified_level < 1) reasons.push("not_verified");
  if (contest.status === "canceled") reasons.push("canceled");

  return {
    indexable: reasons.length === 0,
    reasons,
    officialUrl,
    sourceCheckedAt,
    expiredDays,
    archived,
  };
}

export function formatSourceCheckedDate(value?: string | null): string {
  if (!value) return "확인일 미정";
  const date = toKoreaDate(value);
  if (!date) return "확인일 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
