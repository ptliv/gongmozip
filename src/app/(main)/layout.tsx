import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TopBriefingBar } from "@/components/layout/TopBriefingBar";
import type { TopBriefingStats } from "@/components/layout/TopBriefingBar";
import { getDaysUntilDeadline } from "@/lib/date";
import { getContestPrizeInfo } from "@/lib/prize";
import { fetchContests } from "@/lib/supabase/contests";
import type { Contest } from "@/types/contest";

export const revalidate = 300;

const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

function deadlineDays(contest: Contest): number | null {
  const days = getDaysUntilDeadline(contest.apply_end_at);
  return Number.isFinite(days) ? days : null;
}

function isNewContest(contest: Contest): boolean {
  const createdAt = Date.parse(contest.created_at);
  return Number.isFinite(createdAt) && Date.now() - createdAt <= RECENT_WINDOW_MS;
}

function buildTopBriefingStats(contests: readonly Contest[]): TopBriefingStats {
  const deadlineValues = contests.map(deadlineDays);

  return {
    totalCount: contests.length,
    endingTodayCount: deadlineValues.filter((days) => days === 0).length,
    endingThisWeekCount: deadlineValues.filter((days) => days !== null && days >= 0 && days <= 7).length,
    highPrizeCount: contests.filter((contest) => getContestPrizeInfo(contest) !== null).length,
    newCount: contests.filter(isNewContest).length,
  };
}

async function getTopBriefingStats(): Promise<TopBriefingStats> {
  const contests = await fetchContests({ verified_only: true, limit: 120 }).catch((error: unknown): Contest[] => {
    console.error("[MainLayout] fetchContests 실패:", error);
    return [];
  });
  return buildTopBriefingStats(contests);
}

export default async function MainLayout({ children }: { readonly children: ReactNode }) {
  const topBriefingStats = await getTopBriefingStats();

  return (
    <div className="min-h-screen flex flex-col">
      <TopBriefingBar stats={topBriefingStats} />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
