import type { Metadata } from "next";
import { ContestGrid } from "@/components/ui/ContestGrid";
import { CONTEST_CATEGORIES, CONTEST_TYPES } from "@/types/contest";
import { slugifyContestTitle } from "@/lib/slug";
import { getCategoryContestsPayload } from "@/lib/supabase/public-contest-queries";
import { canonicalUrl } from "@/lib/seo";

interface Props {
  params: { category: string };
}

export const revalidate = 300;

function getKnownCategoryName(categorySlug: string): string | null {
  const decoded = decodeURIComponent(categorySlug);
  const normalized = slugifyContestTitle(decoded);
  const fromCategory = CONTEST_CATEGORIES.find(
    (item) => slugifyContestTitle(item) === normalized
  );
  if (fromCategory) return fromCategory;
  const fromType = CONTEST_TYPES.find((item) => slugifyContestTitle(item) === normalized);
  return fromType ?? null;
}

export async function generateStaticParams() {
  const values = Array.from(new Set([...CONTEST_CATEGORIES, ...CONTEST_TYPES]));
  return values.map((value) => ({
    category: slugifyContestTitle(value),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const known = getKnownCategoryName(params.category);
  const decoded = decodeURIComponent(params.category);
  const label = known || decoded || "카테고리";
  const title = `${label} 공고`;
  const description = `${label} 기준으로 공모전/대외활동 공고를 모아봤습니다.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl(`/categories/${params.category}`),
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const known = getKnownCategoryName(params.category);
  const label = known || decodeURIComponent(params.category) || "카테고리";

  const payload = await getCategoryContestsPayload(params.category).catch((error: unknown) => {
    console.error("[CategoryPage] getCategoryContestsPayload failed:", error);
    return { ok: false, category: label, items: [] };
  });

  const contests = payload.ok ? payload.items : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-title-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{label}</h1>
          <span className="text-sm text-gray-400 font-normal">{contests.length}개</span>
        </div>
        <p className="text-sm text-gray-500 ml-4 leading-relaxed">
          카테고리 또는 유형 기준으로 관련 공고를 보여줍니다.
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
