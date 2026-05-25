import { MetadataRoute } from "next";
import { fetchContests } from "@/lib/supabase/contests";
import { slugifyContestTitle } from "@/lib/slug";
import { getSiteUrl } from "@/lib/seo";
import { GUIDE_ARTICLES } from "@/data/guides";

export const revalidate = 3600;

const BASE_URL = getSiteUrl();

function fieldToSlug(field: string): string {
  return field.replace(/·/g, "-");
}

function getKoreaToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return new Date(`${year}-${month}-${day}T00:00:00+09:00`);
}

function isWithinSevenDays(dateText?: string | null): boolean {
  if (!dateText) return false;
  const target = new Date(`${dateText.slice(0, 10)}T00:00:00+09:00`);
  if (Number.isNaN(target.getTime())) return false;
  const diffDays = Math.round(
    (target.getTime() - getKoreaToday().getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays > 0 && diffDays <= 7;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const contests = await fetchContests({ verified_only: true }).catch(() => []);
  const hasSevenDayDeadline = contests.some(
    (contest) => contest.status === "ongoing" && isWithinSevenDays(contest.apply_end_at)
  );

  // ── 정적 페이지 ────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                        lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/contests`,          lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE_URL}/deadline`,          lastModified: now, changeFrequency: "hourly",  priority: 0.8 },
    { url: `${BASE_URL}/latest`,            lastModified: now, changeFrequency: "hourly",  priority: 0.8 },
    { url: `${BASE_URL}/guides`,            lastModified: now, changeFrequency: "weekly",  priority: 0.75 },
    // 신뢰/정책 페이지 (/adsense-readiness 는 noindex이므로 제외)
    { url: `${BASE_URL}/about`,             lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/privacy`,           lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/terms`,             lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/contact`,           lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];
  if (hasSevenDayDeadline) {
    staticPages.splice(3, 0, {
      url: `${BASE_URL}/deadline/7days`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.75,
    });
  }

  // ── 유형별 페이지 /type/[type] ─────────────────────────────
  const typeValues = Array.from(new Set(contests.map((contest) => contest.type).filter(Boolean)));
  const typePages: MetadataRoute.Sitemap = typeValues.map((type) => ({
    url: `${BASE_URL}/type/${encodeURIComponent(type)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // ── 분야별 페이지 /field/[field] ───────────────────────────
  const fieldValues = Array.from(new Set(contests.map((contest) => contest.field).filter(Boolean)));
  const fieldPages: MetadataRoute.Sitemap = fieldValues.map((field) => ({
    url: `${BASE_URL}/field/${fieldToSlug(field)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const categoryValues = Array.from(
    new Set([
      ...contests.map((contest) => contest.category).filter(Boolean),
      ...contests.map((contest) => contest.type).filter(Boolean),
    ])
  );
  const categoryPages: MetadataRoute.Sitemap = categoryValues.map((category) => ({
    url: `${BASE_URL}/categories/${slugifyContestTitle(category)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // ── 공고 상세 페이지 /contests/[slug] ─────────────────────
  const contestPages: MetadataRoute.Sitemap = contests.map((c) => ({
    url: `${BASE_URL}/contests/${encodeURIComponent(c.slug)}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const guidePages: MetadataRoute.Sitemap = GUIDE_ARTICLES.map((article) => ({
    url: `${BASE_URL}/guides/${article.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  return [...staticPages, ...typePages, ...fieldPages, ...categoryPages, ...guidePages, ...contestPages];
}
