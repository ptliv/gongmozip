import { MetadataRoute } from "next";
import { CONTEST_TYPES, CONTEST_FIELDS, CONTEST_CATEGORIES } from "@/types/contest";
import { fetchContests } from "@/lib/supabase/contests";
import { slugifyContestTitle } from "@/lib/slug";

export const revalidate = 3600;

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://gongmozip.com";

function fieldToSlug(field: string): string {
  return field.replace(/·/g, "-");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── 정적 페이지 ────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                       lastModified: now, changeFrequency: "daily",  priority: 1.0 },
    { url: `${BASE_URL}/contests`,         lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/deadline-soon`,     lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/latest`,           lastModified: now, changeFrequency: "hourly", priority: 0.8 },
  ];

  // ── 유형별 페이지 /type/[type] ─────────────────────────────
  const typePages: MetadataRoute.Sitemap = CONTEST_TYPES.map((type) => ({
    url: `${BASE_URL}/type/${encodeURIComponent(type)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // ── 분야별 페이지 /field/[field] ───────────────────────────
  const fieldPages: MetadataRoute.Sitemap = CONTEST_FIELDS.map((field) => ({
    url: `${BASE_URL}/field/${fieldToSlug(field)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const categoryValues = Array.from(new Set([...CONTEST_CATEGORIES, ...CONTEST_TYPES]));
  const categoryPages: MetadataRoute.Sitemap = categoryValues.map((category) => ({
    url: `${BASE_URL}/categories/${slugifyContestTitle(category)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // ── 공고 상세 페이지 /contests/[slug] ─────────────────────
  const contests = await fetchContests().catch(() => []);
  const contestPages: MetadataRoute.Sitemap = contests.map((c) => ({
    url: `${BASE_URL}/contests/${encodeURIComponent(c.slug)}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...typePages, ...fieldPages, ...categoryPages, ...contestPages];
}
