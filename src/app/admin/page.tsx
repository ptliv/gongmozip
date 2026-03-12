import { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardList,
  ShieldCheck,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { fetchContests } from "@/lib/supabase/contests";
import { isDeadlineSoon } from "@/lib/date";
import { StatsCard } from "@/components/admin/StatsCard";
import { formatDate, formatDateRange } from "@/lib/date";

export const metadata: Metadata = { title: "관리자 대시보드" };

export default async function AdminDashboard() {
  const contests = await fetchContests().catch((e: unknown) => {
    console.error("[AdminDashboard] fetchContests 실패:", e);
    return [];
  });

  const stats = {
    total: contests.length,
    ongoing: contests.filter((c) => c.status === "ongoing").length,
    pendingReview: contests.filter((c) => c.verified_level <= 1).length,
    deadlineSoon: contests.filter(
      (c) => c.status === "ongoing" && isDeadlineSoon(c.apply_end_at, 14)
    ).length,
  };

  const recentContests = [...contests]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const pendingContests = contests
    .filter((c) => c.verified_level === 0)
    .slice(0, 5);

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">공고 현황을 한눈에 확인하세요.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="총 공고 수"
          value={stats.total}
          icon={<ClipboardList className="w-5 h-5" />}
          color="blue"
          sub="전체 등록된 공고"
        />
        <StatsCard
          label="모집 중"
          value={stats.ongoing}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          sub="현재 모집 진행 중"
        />
        <StatsCard
          label="검수 대기"
          value={stats.pendingReview}
          icon={<ShieldCheck className="w-5 h-5" />}
          color="orange"
          sub="verified_level 0~1"
        />
        <StatsCard
          label="마감 임박"
          value={stats.deadlineSoon}
          icon={<Clock className="w-5 h-5" />}
          color="violet"
          sub="14일 이내 마감"
        />
      </div>

      {/* 하단 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 등록 공고 */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800">최근 등록 공고</h2>
            <Link
              href="/admin/contests"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              전체 보기 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentContests.map((c) => (
              <Link
                key={c.id}
                href={`/admin/contests/${c.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                    {c.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{c.organizer}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <StatusDot status={c.status} />
                  <VerifiedDot level={c.verified_level} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 검수 대기 공고 */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800">검수 대기 공고</h2>
            <span className="text-xs text-gray-400">verified_level = 0</span>
          </div>

          {pendingContests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CheckCircle className="w-8 h-8 mb-2 text-emerald-400" />
              <div className="text-sm font-medium">검수 대기 공고가 없습니다</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {pendingContests.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/contests/${c.id}`}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-amber-50/50 transition-colors group"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                      {c.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {c.organizer} · ~{formatDate(c.apply_end_at)}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold flex-shrink-0 ${
                    c.review_score != null && c.review_score >= 50
                      ? "text-amber-600"
                      : "text-red-500"
                  }`}>
                    {c.review_score != null ? `${c.review_score}점` : "검수 필요"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// 인라인 서브 컴포넌트
// ----------------------------------------------------------

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    ongoing: "bg-emerald-400",
    upcoming: "bg-blue-400",
    closed: "bg-gray-300",
    canceled: "bg-red-400",
  };
  return (
    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${map[status] ?? "bg-gray-300"}`} />
  );
}

function VerifiedDot({ level }: { level: number }) {
  if (level === 0) return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  if (level === 1) return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
  return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
}
