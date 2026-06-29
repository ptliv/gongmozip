import { HeroSection } from "@/components/home/HeroSection";
import { CategorySection } from "@/components/home/CategorySection";
import { DeadlineSoonSection } from "@/components/home/DeadlineSoonSection";
import { LatestContestsSection } from "@/components/home/LatestContestsSection";
import { CTASection } from "@/components/home/CTASection";
import { GuideSection } from "@/components/home/GuideSection";
import { AnalysisCurationSection } from "@/components/home/AnalysisCurationSection";
import { fetchContests } from "@/lib/supabase/contests";
import { getDeadlineSoonContests, getLatestContests } from "@/lib/contest";
import type { FacetOption } from "@/lib/supabase/public-contest-queries";
import { summarizePrizePool } from "@/lib/prize";
import { slugifyContestTitle } from "@/lib/slug";
import type { Contest } from "@/types/contest";

export const revalidate = 300;

interface HomeFacetOptions {
  readonly fields: FacetOption[];
  readonly targets: FacetOption[];
}

function buildFacetList(
  values: readonly string[],
  limit: number
): FacetOption[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const value of values) {
    const label = value.trim();
    if (!label) continue;
    const slug = slugifyContestTitle(label);
    if (!slug) continue;
    const current = counts.get(slug);
    counts.set(slug, {
      label: current?.label ?? label,
      count: (current?.count ?? 0) + 1,
    });
  }

  return Array.from(counts.entries())
    .map(([slug, item]) => ({ slug, label: item.label, count: item.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function getHomeFacetOptions(
  contests: readonly Contest[],
  options: { readonly fieldLimit: number; readonly targetLimit: number }
): HomeFacetOptions {
  return {
    fields: buildFacetList(
      contests.map((contest) => contest.field),
      options.fieldLimit
    ),
    targets: buildFacetList(
      contests.flatMap((contest) => contest.target),
      options.targetLimit
    ),
  };
}

export default async function HomePage() {
  const allContests = await fetchContests({ verified_only: true }).catch((e: unknown) => {
    console.error("[HomePage] fetchContests 실패:", e);
    return [];
  });
  const deadlineSoonContests = getDeadlineSoonContests(allContests);
  const latestContests = getLatestContests(allContests, 6);
  const prizeSummary = summarizePrizePool(allContests);
  const facets = getHomeFacetOptions(allContests, {
    fieldLimit: 6,
    targetLimit: 6,
  });

  return (
    <>
      <HeroSection prizeSummary={prizeSummary} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <CategorySection
          featuredFields={facets.fields}
          featuredTargets={facets.targets}
        />
        <DeadlineSoonSection contests={deadlineSoonContests} />
        <AnalysisCurationSection contests={allContests} />
        <LatestContestsSection contests={latestContests} />
        <GuideSection />
        <CTASection />
      </div>
    </>
  );
}
