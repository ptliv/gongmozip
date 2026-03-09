import type { Metadata } from "next";
import { ContestGrid } from "@/components/ui/ContestGrid";
import {
  getFacetOptionsPayload,
  getTargetContestsPayload,
} from "@/lib/supabase/public-contest-queries";
import { canonicalUrl } from "@/lib/seo";

interface Props {
  params: { target: string };
}

export const revalidate = 300;

function getFallbackLabel(targetSlug: string): string {
  return decodeURIComponent(targetSlug) || "대상";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const payload = await getTargetContestsPayload(params.target, 1).catch(() => ({
    ok: false,
    target: getFallbackLabel(params.target),
    items: [],
  }));
  const label = payload.target || getFallbackLabel(params.target);
  return {
    title: `${label} 대상 공고`,
    description: `${label} 대상 중심 공모전/대외활동 공고 목록입니다.`,
    alternates: {
      canonical: canonicalUrl(`/target/${params.target}`),
    },
  };
}

export async function generateStaticParams() {
  const facets = await getFacetOptionsPayload({ targetLimit: 20 }).catch(() => ({
    ok: false,
    fields: [],
    targets: [],
    hosts: [],
  }));
  return facets.targets.map((item) => ({ target: item.slug }));
}

export default async function TargetPage({ params }: Props) {
  const payload = await getTargetContestsPayload(params.target, 500).catch((error: unknown) => {
    console.error("[TargetPage] getTargetContestsPayload failed:", error);
    return {
      ok: false,
      target: getFallbackLabel(params.target),
      items: [],
    };
  });

  const label = payload.target || getFallbackLabel(params.target);
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
          지원 대상 기준으로 분류된 공고 목록입니다.
        </p>
      </div>

      <ContestGrid
        contests={contests}
        emptyTitle={`${label} 대상 공고가 없습니다`}
        emptyDescription={`현재 ${label} 대상 공고가 없습니다.`}
      />
    </div>
  );
}
