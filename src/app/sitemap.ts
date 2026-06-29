import type { MetadataRoute } from "next";
import { GUIDE_ARTICLES } from "@/data/guides";
import { getContestIndexDecision } from "@/lib/indexing";
import { getSiteUrl } from "@/lib/seo";
import { fetchContests, isPublicContest } from "@/lib/supabase/contests";

export const revalidate = 3600;

const BASE_URL = getSiteUrl();

function url(path: string): string {
  return `${BASE_URL}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const contests = await fetchContests().catch(() => []);

  const staticPages: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: url("/guides"), lastModified: now, changeFrequency: "weekly", priority: 0.75 },
    { url: url("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: url("/privacy"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: url("/terms"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: url("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const guidePages: MetadataRoute.Sitemap = GUIDE_ARTICLES.map((article) => ({
    url: url(`/guide/${article.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: article.slug === "scoring-method" ? 0.8 : 0.65,
  }));

  const contestPages: MetadataRoute.Sitemap = contests
    .filter(isPublicContest)
    .filter((contest) => getContestIndexDecision(contest, now).indexable)
    .map((contest) => ({
      url: url(`/contests/${encodeURIComponent(contest.slug)}`),
      lastModified: new Date(contest.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [...staticPages, ...guidePages, ...contestPages];
}
