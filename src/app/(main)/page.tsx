import { AdSlot } from "@/components/ads/AdSlot";
import { AnalysisCurationSection } from "@/components/home/AnalysisCurationSection";
import { BestStorySection } from "@/components/home/BestStorySection";
import { BriefingSection } from "@/components/home/BriefingSection";
import { ContestTableSection } from "@/components/home/ContestTableSection";
import { GuideSection } from "@/components/home/GuideSection";
import { HomeSearchBand } from "@/components/home/HomeSearchBand";
import { MainHero } from "@/components/home/MainHero";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { QuickExploreCards } from "@/components/home/QuickExploreCards";
import { fetchContests } from "@/lib/supabase/contests";
import { getDeadlineSoonContests, getLatestContests } from "@/lib/contest";
import { summarizePrizePool } from "@/lib/prize";
import type { Contest } from "@/types/contest";

export const revalidate = 300;

function countSourceChecked(contests: readonly Contest[]): number {
  return contests.filter((contest) => Boolean(contest.source_checked_at ?? contest.crawled_at)).length;
}

export default async function HomePage() {
  const allContests = await fetchContests({ verified_only: true, limit: 120 }).catch((error: unknown) => {
    console.error("[HomePage] fetchContests 실패:", error);
    return [];
  });
  const deadlineSoonContests = getDeadlineSoonContests(allContests);
  const latestContests = getLatestContests(allContests, 10);
  const prizeSummary = summarizePrizePool(allContests);
  const sourceCheckedCount = countSourceChecked(allContests);

  return (
    <>
      <MainHero
        totalCount={allContests.length}
        deadlineSoonCount={deadlineSoonContests.length}
        sourceCheckedCount={sourceCheckedCount}
        prizeSummary={prizeSummary}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <QuickExploreCards />
        <HomeSearchBand />
        <AnalysisCurationSection contests={allContests} />
        <ContestTableSection contests={latestContests} />
        <BriefingSection />
        <BestStorySection />
        <GuideSection />
        <NewsletterSection />
        <AdSlot placement="main" className="mb-12" />
      </div>
    </>
  );
}
