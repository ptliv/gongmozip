import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { fetchContestById } from "@/lib/supabase/contests";
import { ContestForm } from "@/components/admin/ContestForm";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (params.id === "new") return { title: "공고 등록" };
  const contest = await fetchContestById(params.id).catch(() => null);
  return { title: contest ? `수정: ${contest.title}` : "공고 수정" };
}

export default async function AdminContestEditPage({ params }: Props) {
  const isNew = params.id === "new";
  const contest = isNew ? null : await fetchContestById(params.id).catch(() => null);

  if (!isNew && !contest) notFound();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/admin/contests"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            공고 목록
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? "공고 등록" : "공고 수정"}
          </h1>
          {contest && (
            <p className="text-sm text-gray-500 mt-1 truncate max-w-md">{contest.title}</p>
          )}
        </div>

        {contest?.official_source_url && (
          <a
            href={contest.official_source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            원문 보기
          </a>
        )}
      </div>

      <ContestForm
        initialData={contest ?? undefined}
        contestId={isNew ? undefined : params.id}
      />
    </div>
  );
}
