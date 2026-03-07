import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Users,
  Layers,
  MapPin,
  Monitor,
  UserCheck,
  Gift,
  ExternalLink,
  BookOpen,
  BadgeCheck,
  ChevronRight,
  Clock,
  TrendingUp,
} from "lucide-react";

import { getSimilarContests } from "@/lib/contest";
import { fetchContestBySlug, fetchContests } from "@/lib/supabase/contests";
import { formatDate, formatDateRange, getDaysUntilDeadline } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Contest, ContestStatus, VerifiedLevel } from "@/types/contest";

import { CategoryChip } from "@/components/ui/CategoryChip";
import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import { ContestCard } from "@/components/contest/ContestCard";

// ----------------------------------------------------------
// Next.js 메타데이터 + 정적 경로
// ----------------------------------------------------------

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const contest = await fetchContestBySlug(params.slug).catch(() => null);
  if (!contest) return { title: "공고를 찾을 수 없습니다" };
  return {
    title: contest.title,
    description: contest.summary,
    openGraph: {
      title: contest.title,
      description: contest.summary,
      type: "article",
    },
  };
}

// ----------------------------------------------------------
// 페이지
// ----------------------------------------------------------

export default async function ContestDetailPage({ params }: Props) {
  const [contest, allContests] = await Promise.all([
    fetchContestBySlug(params.slug).catch((e: unknown) => {
      console.error("[ContestDetailPage] fetchContestBySlug 실패:", e);
      return null;
    }),
    fetchContests().catch((e: unknown) => {
      console.error("[ContestDetailPage] fetchContests 실패:", e);
      return [];
    }),
  ]);
  if (!contest) notFound();

  const similar = getSimilarContests(allContests, contest, 4);
  const isClosed = contest.status === "closed" || contest.status === "canceled";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Breadcrumb ── */}
      <Breadcrumb title={contest.title} />

      {/* ── Hero ── */}
      <HeroSection contest={contest} />

      {/* ── 본문 그리드 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* 왼쪽 (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* 핵심 정보 카드 */}
          <InfoCard contest={contest} />

          {/* 모바일 전용: 지원 CTA */}
          <div className="lg:hidden">
            <ApplyCTA contest={contest} />
          </div>

          {/* 상세 설명 */}
          <DescriptionCard description={contest.description} />
        </div>

        {/* 오른쪽 사이드바 (1/3) — 데스크톱만 */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <ApplyCTA contest={contest} />
            {contest.benefit.types.length > 0 && (
              <BenefitCard benefit={contest.benefit} />
            )}
            <ClassificationCard contest={contest} />
          </div>
        </div>
      </div>

      {/* 모바일 전용: 혜택 + 분류 (설명 아래) */}
      <div className="lg:hidden mt-5 space-y-4">
        {contest.benefit.types.length > 0 && (
          <BenefitCard benefit={contest.benefit} />
        )}
        <ClassificationCard contest={contest} />
      </div>

      {/* ── 비슷한 공고 ── */}
      {similar.length > 0 && <SimilarSection contests={similar} />}
    </div>
  );
}

// ===========================================================
// ── 서브 컴포넌트 ──────────────────────────────────────────
// ===========================================================

// ----------------------------------------------------------
// Breadcrumb
// ----------------------------------------------------------

function Breadcrumb({ title }: { title: string }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-400 mb-6">
      <Link href="/" className="hover:text-gray-700 transition-colors font-medium">
        홈
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
      <Link href="/contests" className="hover:text-gray-700 transition-colors font-medium">
        공고 목록
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
      <span className="text-gray-600 font-medium truncate max-w-[180px] sm:max-w-sm">
        {title}
      </span>
    </nav>
  );
}

// ----------------------------------------------------------
// Hero Section
// ----------------------------------------------------------

function HeroSection({ contest }: { contest: Contest }) {
  return (
    <div>
      {/* 배지 행 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StatusBadge
          status={contest.status}
          applyEndAt={contest.apply_end_at}
        />
        <CategoryChip label={contest.type} variant="type" />
        <CategoryChip label={contest.field} variant="field" />
        {contest.verified_level >= 2 && (
          <VerifiedBadge level={contest.verified_level} />
        )}
      </div>

      {/* 제목 */}
      <h1 className="text-2xl sm:text-[1.75rem] font-bold text-gray-900 leading-snug mb-3">
        {contest.title}
      </h1>

      {/* 주최기관 + 조회수 */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-4 h-4" />
          {contest.organizer}
        </span>
        <span className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4" />
          조회 {contest.view_count.toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {formatDate(contest.created_at.slice(0, 10))} 등록
        </span>
      </div>

      {/* 한 줄 요약 */}
      <p className="mt-4 text-gray-600 text-[0.9375rem] leading-relaxed bg-blue-50/40 rounded-xl px-4 py-3.5 border border-blue-100/50">
        {contest.summary}
      </p>
    </div>
  );
}

// ----------------------------------------------------------
// Status Badge (모집중/예정/마감/취소)
// ----------------------------------------------------------

function StatusBadge({
  status,
  applyEndAt,
}: {
  status: ContestStatus;
  applyEndAt: string;
}) {
  const days = getDaysUntilDeadline(applyEndAt);

  const configs: Record<
    ContestStatus,
    { dot: string; text: string; wrapper: string; label: string }
  > = {
    upcoming: {
      dot: "bg-blue-500",
      text: "text-blue-700",
      wrapper: "bg-blue-50 border-blue-200",
      label: "모집 예정",
    },
    ongoing: {
      dot: days <= 3 ? "bg-red-500 animate-pulse" : days <= 7 ? "bg-orange-500 animate-pulse" : "bg-emerald-500",
      text: days <= 3 ? "text-red-700" : days <= 7 ? "text-orange-700" : "text-emerald-700",
      wrapper: days <= 3 ? "bg-red-50 border-red-200" : days <= 7 ? "bg-orange-50 border-orange-200" : "bg-emerald-50 border-emerald-200",
      label: "모집 중",
    },
    closed: {
      dot: "bg-gray-400",
      text: "text-gray-500",
      wrapper: "bg-gray-100 border-gray-200",
      label: "마감",
    },
    canceled: {
      dot: "bg-red-400",
      text: "text-red-600",
      wrapper: "bg-red-50 border-red-200",
      label: "취소됨",
    },
  };

  const c = configs[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
        c.wrapper,
        c.text
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
      {c.label}
      {status === "ongoing" && days >= 0 && (
        <span className="font-black">· D-{days === 0 ? "Day" : days}</span>
      )}
    </span>
  );
}

// ----------------------------------------------------------
// Verified Badge
// ----------------------------------------------------------

function VerifiedBadge({ level }: { level: VerifiedLevel }) {
  if (level < 2) return null;
  const label = level === 3 ? "공식 제휴" : "공식 확인";
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
      <BadgeCheck className="w-3 h-3" />
      {label}
    </span>
  );
}

// ----------------------------------------------------------
// 핵심 정보 카드
// ----------------------------------------------------------

function InfoCard({ contest }: { contest: Contest }) {
  const items = [
    {
      icon: <Building2 className="w-4 h-4 text-blue-500" />,
      label: "주최기관",
      value: contest.organizer,
    },
    {
      icon: <Calendar className="w-4 h-4 text-violet-500" />,
      label: "모집 기간",
      value: formatDateRange(contest.apply_start_at, contest.apply_end_at),
    },
    {
      icon: <Users className="w-4 h-4 text-indigo-500" />,
      label: "지원 대상",
      value: contest.target.length > 0 ? contest.target.join(", ") : "제한 없음",
    },
    {
      icon: <Layers className="w-4 h-4 text-cyan-500" />,
      label: "분야",
      value: contest.field,
    },
    {
      icon: <MapPin className="w-4 h-4 text-rose-400" />,
      label: "지역",
      value: contest.region,
    },
    {
      icon: <Monitor className="w-4 h-4 text-teal-500" />,
      label: "진행 방식",
      value: contest.online_offline,
    },
    {
      icon: <UserCheck className="w-4 h-4 text-amber-500" />,
      label: "팀 지원",
      value: contest.team_allowed ? "팀 · 개인 모두 가능" : "개인만 가능",
    },
    {
      icon: <Gift className="w-4 h-4 text-orange-500" />,
      label: "혜택 / 상금",
      value: contest.benefit.prize ?? "별도 공지",
      highlight: true,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-violet-500 flex-shrink-0" />
        <h2 className="text-sm font-bold text-gray-700">핵심 정보</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
            <div className="flex-shrink-0 w-5 flex items-center justify-center">{item.icon}</div>
            <span className="text-xs font-semibold text-gray-400 w-16 flex-shrink-0">{item.label}</span>
            <span className={cn(
              "text-sm font-medium leading-snug",
              item.highlight ? "text-amber-700 font-semibold" : "text-gray-800"
            )}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// 상세 설명 카드
// ----------------------------------------------------------

function DescriptionCard({ description }: { description: string }) {
  if (!description) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-card p-6 text-center text-gray-400 text-sm py-12">
        상세 내용이 아직 등록되지 않았습니다.
      </div>
    );
  }

  const paragraphs = description.split("\n\n").filter(Boolean);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-blue-500 flex-shrink-0" />
        <h2 className="text-sm font-bold text-gray-700">상세 내용</h2>
        <BookOpen className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
      </div>
      <div className="px-6 py-5 space-y-4">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm text-gray-600 leading-[1.85] whitespace-pre-line">
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// 지원 CTA 카드 (사이드바 + 모바일)
// ----------------------------------------------------------

function ApplyCTA({ contest }: { contest: Contest }) {
  const days = getDaysUntilDeadline(contest.apply_end_at);
  const isClosed =
    contest.status === "closed" || contest.status === "canceled";
  const isUpcoming = contest.status === "upcoming";

  return (
    <div className="rounded-3xl border border-gray-100 bg-white shadow-card overflow-hidden">
      {/* D-Day 배너 */}
      {!isClosed && (
        <div
          className={cn(
            "px-5 py-4 text-center",
            isUpcoming
              ? "bg-gradient-to-r from-blue-50 to-indigo-50"
              : days <= 3
              ? "bg-gradient-to-r from-red-50 to-orange-50"
              : days <= 7
              ? "bg-gradient-to-r from-orange-50 to-amber-50"
              : "bg-gradient-to-r from-blue-50 to-violet-50"
          )}
        >
          <div
            className={cn(
              "text-3xl font-black tracking-tight",
              isUpcoming
                ? "text-blue-700"
                : days <= 3
                ? "text-red-600"
                : days <= 7
                ? "text-orange-600"
                : "text-blue-700"
            )}
          >
            {isUpcoming
              ? "모집 예정"
              : days < 0
              ? "마감"
              : days === 0
              ? "D-Day"
              : `D-${days}`}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {isUpcoming
              ? `${formatDate(contest.apply_start_at)} 모집 시작`
              : `${formatDate(contest.apply_end_at)} 마감`}
          </div>
        </div>
      )}

      {/* 버튼 영역 */}
      <div className="p-5 space-y-2.5">
        {/* 모집 기간 (닫혀있을 때도 보여줌) */}
        <div className="text-xs text-gray-500 text-center pb-1">
          <span className="font-medium text-gray-700">
            {formatDateRange(contest.apply_start_at, contest.apply_end_at)}
          </span>
        </div>

        {/* 메인 지원 버튼 */}
        <a
          href={contest.official_source_url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-bold transition-all duration-200",
            isClosed
              ? "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
              : "bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 shadow-sm hover:shadow-md"
          )}
        >
          {isClosed ? (
            <>마감된 공고입니다</>
          ) : (
            <>
              공식 페이지에서 지원하기
              <ExternalLink className="w-3.5 h-3.5" />
            </>
          )}
        </a>

        {/* 원문 출처 링크 */}
        {contest.aggregator_source_url && (
          <a
            href={contest.aggregator_source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-2xl text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            원문 공고 보기
          </a>
        )}

        {/* 주의문구 */}
        <p className="text-[11px] text-gray-400 text-center leading-relaxed pt-1">
          지원은 공식 페이지에서 직접 진행됩니다.
          <br />
          마감 전 반드시 공고 원문을 확인하세요.
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// 혜택 카드
// ----------------------------------------------------------

const BENEFIT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  상금: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  인증서: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "취업·인턴 연계": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  해외연수: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  멘토링: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  "물품·기기": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  활동비: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  기타: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
};

function BenefitCard({
  benefit,
}: {
  benefit: Contest["benefit"];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 flex-shrink-0" />
        <h3 className="text-sm font-bold text-gray-700">활동 혜택</h3>
      </div>
      <div className="p-5 space-y-3">
        {benefit.prize && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-50 rounded-xl border border-amber-100">
            <Gift className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-amber-800">{benefit.prize}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {benefit.types.map((b) => {
            const color = BENEFIT_COLORS[b] ?? BENEFIT_COLORS["기타"];
            return (
              <span
                key={b}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border",
                  color.bg, color.text, color.border
                )}
              >
                <span className="text-[10px] opacity-70">✓</span>
                {b}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// 분류 카드
// ----------------------------------------------------------

function ClassificationCard({ contest }: { contest: Contest }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-gray-300 to-gray-400 flex-shrink-0" />
        <h3 className="text-sm font-bold text-gray-700">분류 정보</h3>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-semibold w-14 flex-shrink-0">유형</span>
          <CategoryChip label={contest.type} variant="type" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-semibold w-14 flex-shrink-0">카테고리</span>
          <CategoryChip label={contest.category} variant="field" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-semibold w-14 flex-shrink-0">분야</span>
          <CategoryChip label={contest.field} variant="field" />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// 비슷한 공고
// ----------------------------------------------------------

function SimilarSection({ contests }: { contests: Contest[] }) {
  return (
    <section className="mt-12 pt-10 border-t border-gray-100">
      <div className="section-header mb-5">
        <div className="section-title">
          <div className="section-title-accent" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">비슷한 공고</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">같은 유형 · 분야의 추천 공고</p>
          </div>
        </div>
        <Link
          href="/contests"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors group"
        >
          전체보기
          <ArrowLeft className="w-3.5 h-3.5 rotate-180 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {contests.map((c) => (
          <ContestCard key={c.id} contest={c} />
        ))}
      </div>
    </section>
  );
}
