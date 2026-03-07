import { HeroSection } from "@/components/home/HeroSection";
import { CategorySection } from "@/components/home/CategorySection";
import { DeadlineSoonSection } from "@/components/home/DeadlineSoonSection";
import { LatestContestsSection } from "@/components/home/LatestContestsSection";
import { CTASection } from "@/components/home/CTASection";
import { fetchContests } from "@/lib/supabase/contests";
import { getDeadlineSoonContests, getLatestContests } from "@/lib/contest";

export default async function HomePage() {
  const allContests = await fetchContests().catch((e: unknown) => {
    console.error("[HomePage] fetchContests 실패:", e);
    return [];
  });
  const deadlineSoonContests = getDeadlineSoonContests(allContests);
  const latestContests = getLatestContests(allContests, 6);

  return (
    <>
      <HeroSection />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <CategorySection />
        <DeadlineSoonSection contests={deadlineSoonContests} />
        <LatestContestsSection contests={latestContests} />
        <CTASection />
      </div>
    </>
  );
}
