import { getContestIndexDecision } from "@/lib/indexing";
import { getSiteUrl } from "@/lib/seo";
import { slugifyContestTitle } from "@/lib/slug";
import { fetchContests } from "@/lib/supabase/contests";

export const dynamic = "force-dynamic";

const BASE_URL = getSiteUrl();

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absolute(path: string): string {
  return `${BASE_URL}${path}`;
}

function buildNoindexListPaths(contests: Awaited<ReturnType<typeof fetchContests>>): string[] {
  const paths = new Set<string>(["/contests", "/deadline", "/deadline/7days", "/latest"]);

  for (const contest of contests) {
    if (contest.type) paths.add(`/type/${encodeURIComponent(contest.type)}`);
    if (contest.category) paths.add(`/categories/${slugifyContestTitle(contest.category)}`);
    if (contest.field) paths.add(`/field/${slugifyContestTitle(contest.field)}`);
    for (const target of contest.target ?? []) {
      paths.add(`/target/${slugifyContestTitle(target)}`);
    }
    if (contest.organizer) paths.add(`/host/${slugifyContestTitle(contest.organizer)}`);
  }

  return Array.from(paths).filter((path) => path !== "/" && !path.endsWith("//"));
}

export async function GET(): Promise<Response> {
  const now = new Date();
  const contests = await fetchContests().catch(() => []);
  const listPaths = buildNoindexListPaths(contests);
  const contestPaths = contests
    .filter((contest) => !getContestIndexDecision(contest, now).indexable)
    .map((contest) => `/contests/${encodeURIComponent(contest.slug)}`);

  const uniquePaths = Array.from(new Set([...listPaths, ...contestPaths]));
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...uniquePaths.map((path) => `  <url><loc>${escapeXml(absolute(path))}</loc></url>`),
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
