import type { Metadata } from "next";
import { ContestGrid } from "@/components/ui/ContestGrid";
import {
  getFieldContestsPayload,
} from "@/lib/supabase/public-contest-queries";
import { canonicalUrl } from "@/lib/seo";
import { NOINDEX_FOLLOW_ROBOTS } from "@/lib/indexing";

interface Props {
  params: { field: string };
}

export const revalidate = 300;

function getFallbackLabel(fieldSlug: string): string {
  return decodeURIComponent(fieldSlug) || "분야";
}

export function generateMetadata({ params }: Props): Metadata {
  const label = getFallbackLabel(params.field);
  return {
    title: `${label} 분야 공고`,
    description: `${label} 분야의 공모전/대외활동 공고 목록입니다.`,
    robots: NOINDEX_FOLLOW_ROBOTS,
    alternates: {
      canonical: canonicalUrl(`/field/${params.field}`),
    },
  };
}

export default async function FieldPage({ params }: Props) {
  const payload = await getFieldContestsPayload(params.field, 12).catch((error: unknown) => {
    console.error("[FieldPage] getFieldContestsPayload failed:", error);
    return {
      ok: false,
      field: getFallbackLabel(params.field),
      items: [],
    };
  });

  const label = payload.field || getFallbackLabel(params.field);
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
          분야 기준으로 분류된 공고 목록입니다.
        </p>
      </div>

      <ContestGrid
        contests={contests}
        emptyTitle={`${label} 분야 공고가 없습니다`}
        emptyDescription={`현재 ${label} 분야 공고가 없습니다.`}
      />
    </div>
  );
}
