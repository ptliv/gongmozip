import { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { fetchContests } from "@/lib/supabase/contests";
import { ContestTable } from "@/components/admin/ContestTable";

export const metadata: Metadata = { title: "공고 관리" };

export default async function AdminContestsPage() {
  const contests = await fetchContests().catch((e: unknown) => {
    console.error("[AdminContestsPage] fetchContests 실패:", e);
    return [];
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공고 관리</h1>
          <p className="text-sm text-gray-500 mt-1">전체 공고를 검색, 필터링하고 수정할 수 있습니다.</p>
        </div>
        <Link
          href="/admin/contests/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm hover:shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          공고 등록
        </Link>
      </div>

      <ContestTable contests={contests} />
    </div>
  );
}
