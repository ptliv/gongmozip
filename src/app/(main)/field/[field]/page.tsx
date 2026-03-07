import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CONTEST_FIELDS, ContestField } from "@/types/contest";
import { fetchContests } from "@/lib/supabase/contests";
import { ContestGrid } from "@/components/ui/ContestGrid";

export const revalidate = 3600;

interface Props {
  params: { field: string };
}

/** URL 슬러그 → ContestField: "-" → "·" */
function slugToField(slug: string): ContestField | null {
  const decoded = decodeURIComponent(slug).replace(/-/g, "·");
  return (CONTEST_FIELDS as readonly string[]).includes(decoded)
    ? (decoded as ContestField)
    : null;
}

/** ContestField → URL 슬러그: "·" → "-" */
function fieldToSlug(field: string): string {
  return field.replace(/·/g, "-");
}

export async function generateStaticParams() {
  return CONTEST_FIELDS.map((field) => ({ field: fieldToSlug(field) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const field = slugToField(params.field);
  if (!field) return {};
  return {
    title: `${field} 분야 공고`,
    description: `${field} 분야 공모전·대외활동 공고를 한눈에 확인하세요.`,
  };
}

export default async function FieldPage({ params }: Props) {
  const field = slugToField(params.field);
  if (!field) notFound();

  const contests = await fetchContests({ field }).catch((e: unknown) => {
    console.error("[FieldPage] fetchContests 실패:", e);
    return [];
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-gray-600 transition-colors">
          홈
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/contests" className="hover:text-gray-600 transition-colors">
          공고 목록
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-700 font-medium">{field}</span>
      </nav>

      {/* 섹션 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-title-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {field}
          </h1>
          <span className="text-sm text-gray-400 font-normal">{contests.length}개</span>
        </div>
        <p className="text-sm text-gray-500 ml-4 leading-relaxed">
          {field} 분야의 공모전·대외활동 공고를 한눈에 확인하세요.
        </p>
      </div>

      <ContestGrid
        contests={contests}
        emptyTitle={`${field} 공고가 없습니다`}
        emptyDescription={`현재 등록된 ${field} 분야 공고가 없습니다. 나중에 다시 확인해주세요.`}
      />
    </div>
  );
}
