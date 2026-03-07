import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CONTEST_TYPES, ContestType } from "@/types/contest";
import { fetchContests } from "@/lib/supabase/contests";
import { ContestGrid } from "@/components/ui/ContestGrid";

export const revalidate = 3600;

interface Props {
  params: { type: string };
}

function getType(raw: string): ContestType | null {
  const decoded = decodeURIComponent(raw);
  return (CONTEST_TYPES as readonly string[]).includes(decoded)
    ? (decoded as ContestType)
    : null;
}

export async function generateStaticParams() {
  return CONTEST_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const type = getType(params.type);
  if (!type) return {};
  return {
    title: `${type} 공고 목록`,
    description: `${type} 관련 공모전·대외활동 공고를 한눈에 확인하세요.`,
  };
}

export default async function TypePage({ params }: Props) {
  const type = getType(params.type);
  if (!type) notFound();

  const contests = await fetchContests({ type }).catch((e: unknown) => {
    console.error("[TypePage] fetchContests 실패:", e);
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
        <span className="text-gray-700 font-medium">{type}</span>
      </nav>

      {/* 섹션 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-title-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {type}
          </h1>
          <span className="text-sm text-gray-400 font-normal">{contests.length}개</span>
        </div>
        <p className="text-sm text-gray-500 ml-4 leading-relaxed">
          {type} 분야의 공모전·대외활동 공고를 한눈에 확인하세요.
        </p>
      </div>

      <ContestGrid
        contests={contests}
        emptyTitle={`${type} 공고가 없습니다`}
        emptyDescription={`현재 등록된 ${type} 공고가 없습니다. 나중에 다시 확인해주세요.`}
      />
    </div>
  );
}
