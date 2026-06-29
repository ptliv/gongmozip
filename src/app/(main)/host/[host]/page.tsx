import type { Metadata } from "next";
import { ContestGrid } from "@/components/ui/ContestGrid";
import {
  getHostContestsPayload,
} from "@/lib/supabase/public-contest-queries";
import { canonicalUrl } from "@/lib/seo";
import { NOINDEX_FOLLOW_ROBOTS } from "@/lib/indexing";

interface Props {
  params: { host: string };
}

export const dynamic = "force-dynamic";

function getFallbackLabel(hostSlug: string): string {
  return decodeURIComponent(hostSlug) || "주최";
}

export function generateMetadata({ params }: Props): Metadata {
  const label = getFallbackLabel(params.host);
  return {
    title: `${label} 공고`,
    description: `${label} 주최/주관 공고 목록입니다.`,
    robots: NOINDEX_FOLLOW_ROBOTS,
    alternates: {
      canonical: canonicalUrl(`/host/${params.host}`),
    },
  };
}

export default async function HostPage({ params }: Props) {
  const payload = await getHostContestsPayload(params.host, 500).catch((error: unknown) => {
    console.error("[HostPage] getHostContestsPayload failed:", error);
    return {
      ok: false,
      host: getFallbackLabel(params.host),
      items: [],
    };
  });

  const label = payload.host || getFallbackLabel(params.host);
  const contests = payload.items;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-title-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{label}</h1>
          <span className="text-sm text-gray-400 font-normal">{contests.length}개</span>
        </div>
        <p className="text-sm text-gray-500 ml-4 leading-relaxed">
          주최/주관 기준으로 모아본 공고 목록입니다.
        </p>
      </div>

      <ContestGrid
        contests={contests}
        emptyTitle={`${label} 공고가 없습니다`}
        emptyDescription={`현재 ${label} 관련 공고가 없습니다.`}
      />
    </div>
  );
}
