import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getContestDetailPayload,
  getRelatedContestsPayload,
  type ContestDetailPayload,
} from "@/lib/supabase/public-contest-queries";
import { ContestAnalysisReport } from "@/components/contest/detail/ContestAnalysisReport";
import { ContestDecisionHero } from "@/components/contest/detail/ContestDecisionHero";
import { ContestRemainingSections } from "@/components/contest/detail/ContestRemainingSections";
import { canonicalUrl, buildDefaultDescription } from "@/lib/seo";
import { normalizeIncomingSlug } from "@/lib/slug";
import { buildPublicContestAnalysis } from "@/lib/contest-analysis";
import { getContestPrizeInfo } from "@/lib/prize";
import {
  formatSourceCheckedDate,
  getContestIndexDecision,
  NOINDEX_FOLLOW_ROBOTS,
} from "@/lib/indexing";
import { StructuredData } from "@/components/seo/StructuredData";
import { highlightInline, renderHighlightedParagraphs } from "@/components/contest/detail/highlight";
import {
  getApplyUrl,
  getOfficialEnrichment,
  toMetadataPairs,
} from "@/lib/contest-detail/metadata";
import {
  benefitLabel,
  buildCautionItems,
  buildChecklist,
  buildFaq,
  buildPreparationTips,
  buildScheduleGuide,
  buildStrategyItems,
  buildSuitableFor,
  getRelatedGuideArticles,
  safeDateLabel,
  targetLabel,
} from "@/lib/contest-detail/preparation";

interface Props {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await getContestDetailPayload(params.slug).catch(() => ({
    ok: false,
    contest: null,
  }));

  if (!detail.ok || !detail.contest) {
    return {
      title: "공고를 찾을 수 없습니다",
      description: "요청하신 공모전 정보를 찾을 수 없습니다.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const contest = detail.contest;
  const canonicalPath = `/contests/${encodeURIComponent(contest.slug || params.slug)}`;
  const description = buildDefaultDescription({
    title: contest.title,
    organizer: contest.organizer,
    applyEndAt: contest.apply_end_at,
  });
  const indexDecision = getContestIndexDecision(contest);

  return {
    title: contest.title,
    description,
    robots: indexDecision.indexable ? undefined : NOINDEX_FOLLOW_ROBOTS,
    alternates: {
      canonical: canonicalUrl(canonicalPath),
    },
    openGraph: {
      title: contest.title,
      description,
      type: "article",
      url: canonicalUrl(canonicalPath),
    },
  };
}

export default async function ContestDetailPage({ params }: Props) {
  const detail = await getContestDetailPayload(params.slug).catch((error: unknown) => {
    console.error("[ContestDetailPage] getContestDetailPayload failed:", error);
    return { ok: false, contest: null };
  });

  if (!detail.ok || !detail.contest) {
    notFound();
  }

  const contest = detail.contest;
  const requestedSlug = normalizeIncomingSlug(params.slug);
  const canonicalSlug = normalizeIncomingSlug(contest.slug);
  const canonicalPath = `/contests/${encodeURIComponent(contest.slug)}`;
  const isDoubleEncodedPath = /%25/i.test(params.slug);
  if (
    isDoubleEncodedPath &&
    canonicalSlug &&
    requestedSlug &&
    canonicalSlug === requestedSlug
  ) {
    redirect(canonicalPath);
  }

  const related = await getRelatedContestsPayload(contest.contest_type, contest.id, 6).catch(
    (error: unknown) => {
      console.error("[ContestDetailPage] getRelatedContestsPayload failed:", error);
      return { ok: false, items: [] };
    }
  );

  const metadataPairs = toMetadataPairs(contest.metadata_json ?? {});
  const relatedItems = related.ok ? related.items.slice(0, 6) : [];
  const officialEnrichment = getOfficialEnrichment(contest);
  const preparationTips = buildPreparationTips(contest);
  const checklist = buildChecklist(contest);
  const scheduleGuide = buildScheduleGuide(contest);
  const contestAnalysis = buildPublicContestAnalysis(contest);
  const prizeInfo = getContestPrizeInfo(contest);
  const suitableFor = buildSuitableFor(contest);
  const strategyItems = buildStrategyItems(contest);
  const cautionItems = buildCautionItems(contest);
  const faqItems = buildFaq(contest);
  const indexDecision = getContestIndexDecision(contest);
  const applyUrl = indexDecision.officialUrl || getApplyUrl(contest, officialEnrichment.url);
  const sourceCheckedLabel = formatSourceCheckedDate(indexDecision.sourceCheckedAt);
  const relatedGuides = getRelatedGuideArticles(contest);
  const bookmarkItem = {
    slug: contest.slug,
    title: contest.title,
    organizer: contest.organizer,
    apply_end_at: contest.apply_end_at,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.a,
            },
          })),
        }}
      />
      <nav className="text-sm text-gray-500">
        <Link href="/" className="hover:text-blue-600">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link href="/contests" className="hover:text-blue-600">
          공고 목록
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{contest.title}</span>
      </nav>

      <ContestDecisionHero
        contest={contest}
        analysis={contestAnalysis}
        prizeInfo={prizeInfo}
        applyUrl={applyUrl}
        officialUrl={indexDecision.officialUrl}
        sourceCheckedLabel={sourceCheckedLabel}
        bookmarkItem={bookmarkItem}
      />

      <ContestAnalysisReport analysis={contestAnalysis} />

      <ContestRemainingSections
        contest={contest}
        prizeInfo={prizeInfo}
        officialEnrichment={officialEnrichment}
        suitableFor={suitableFor}
        strategyItems={strategyItems}
        cautionItems={cautionItems}
        preparationTips={preparationTips}
        scheduleGuide={scheduleGuide}
        checklist={checklist}
        faqItems={faqItems}
        relatedGuides={relatedGuides}
        metadataPairs={metadataPairs}
        relatedItems={relatedItems}
        applyUrl={applyUrl}
      />
      {process.env.NEXT_PUBLIC_SHOW_DEBUG_FIELDS === "true" && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-amber-700 mb-3">[DEBUG] 상세 페이지 필드</h2>
          <ul className="space-y-1.5 text-sm text-gray-700 font-mono">
            <li><span className="font-semibold">title:</span> {contest.title}</li>
            <li><span className="font-semibold">organizer:</span> {contest.organizer || "미정"}</li>
            <li><span className="font-semibold">apply_end_at:</span> {contest.apply_end_at || "미정"}</li>
          </ul>
        </section>
      )}
    </div>
  );
}
