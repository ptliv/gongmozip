import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink, Calendar, Building2, Globe, Database, MapPin, Users, Trophy } from "lucide-react";
import {
  getContestDetailPayload,
  getRelatedContestsPayload,
} from "@/lib/supabase/public-contest-queries";
import { ContestCard } from "@/components/contest/ContestCard";
import { BookmarkToggleButton } from "@/components/bookmark/BookmarkToggleButton";
import { canonicalUrl, buildDefaultDescription } from "@/lib/seo";
import { getDaysUntilDeadline, formatDateKo } from "@/lib/date";
import { normalizeIncomingSlug } from "@/lib/slug";

interface Props {
  params: { slug: string };
}

export const revalidate = 300;

function safeDateLabel(value?: string | null): string {
  if (!value) return "미정";
  try {
    return formatDateKo(value);
  } catch {
    return "미정";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "upcoming":
      return "모집 예정";
    case "ongoing":
      return "모집 중";
    case "closed":
      return "마감";
    case "canceled":
      return "취소됨";
    default:
      return status || "미정";
  }
}

function dDayLabel(applyEndAt?: string | null): string {
  if (!applyEndAt) return "마감일 미정";
  const days = getDaysUntilDeadline(applyEndAt);
  if (!Number.isFinite(days)) return "마감일 미정";
  if (days < 0) return "마감됨";
  if (days === 0) return "오늘 마감";
  return `D-${days}`;
}

const METADATA_KEY_WHITELIST = [
  "접수방법",
  "신청방법",
  "지원자격",
  "참가자격",
  "응모자격",
  "시상내역",
  "문의처",
  "홈페이지",
  "주제",
  "참가비",
  "유의사항",
  "참고사항",
  "method",
  "eligibility",
  "qualification",
  "prize",
  "contact",
  "homepage",
  "url",
  "fee",
] as const;

function isAllowedMetadataKey(key: string): boolean {
  const normalized = key
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return METADATA_KEY_WHITELIST.some((allowed) =>
    normalized.includes(
      allowed
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[\s_-]+/g, "")
    )
  );
}

function toMetadataPairs(metadata: Record<string, unknown>): Array<{ key: string; value: string }> {
  return Object.entries(metadata)
    .filter(([key]) => isAllowedMetadataKey(key))
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return { key, value: value.map((v) => String(v)).join(", ") };
      }
      if (typeof value === "object") {
        return { key, value: JSON.stringify(value) };
      }
      return { key, value: String(value) };
    })
    .filter((item) => item.value.trim().length > 0)
    .slice(0, 12);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await getContestDetailPayload(params.slug).catch(() => ({
    ok: false,
    contest: null,
  }));

  if (!detail.ok || !detail.contest) {
    return {
      title: "공고를 찾을 수 없습니다",
      description: "요청하신 공모전 정보를 찾을 수 없습니다.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const contest = detail.contest;
  const canonicalPath = `/contests/${encodeURIComponent(contest.slug || params.slug)}`;
  const description = buildDefaultDescription({
    title: contest.title,
    organizer: contest.organizer,
    applyEndAt: contest.apply_end_at,
  });

  return {
    title: contest.title,
    description,
    alternates: {
      canonical: canonicalUrl(canonicalPath),
    },
    openGraph: {
      title: contest.title,
      description,
      type: "article",
      url: canonicalUrl(canonicalPath),
    },
  };
}

export default async function ContestDetailPage({ params }: Props) {
  const detail = await getContestDetailPayload(params.slug).catch((error: unknown) => {
    console.error("[ContestDetailPage] getContestDetailPayload failed:", error);
    return { ok: false, contest: null };
  });

  if (!detail.ok || !detail.contest) {
    notFound();
  }

  const contest = detail.contest;
  const requestedSlug = normalizeIncomingSlug(params.slug);
  const canonicalSlug = normalizeIncomingSlug(contest.slug);
  const canonicalPath = `/contests/${encodeURIComponent(contest.slug)}`;
  const isDoubleEncodedPath = /%25/i.test(params.slug);
  if (
    isDoubleEncodedPath &&
    canonicalSlug &&
    requestedSlug &&
    canonicalSlug === requestedSlug
  ) {
    redirect(canonicalPath);
  }

  const related = await getRelatedContestsPayload(contest.contest_type, contest.id, 6).catch(
    (error: unknown) => {
      console.error("[ContestDetailPage] getRelatedContestsPayload failed:", error);
      return { ok: false, items: [] };
    }
  );

  const metadataPairs = toMetadataPairs(contest.metadata_json ?? {});
  const relatedItems = related.ok ? related.items.slice(0, 6) : [];
  const bookmarkItem = {
    slug: contest.slug,
    title: contest.title,
    organizer: contest.organizer,
    apply_end_at: contest.apply_end_at,
    source_site: contest.source_site ?? "",
  };
  const showSourceButton = Boolean(
    contest.source_url && contest.source_url !== contest.official_source_url
  );
  const showOfficialButton = Boolean(contest.official_source_url);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <nav className="text-sm text-gray-500">
        <Link href="/" className="hover:text-blue-600">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link href="/contests" className="hover:text-blue-600">
          공고 목록
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{contest.title}</span>
      </nav>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {contest.contest_type}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100">
            {contest.field}
          </span>
          {contest.source_site && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
              {contest.source_site}
            </span>
          )}
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            {statusLabel(contest.status)}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            {dDayLabel(contest.apply_end_at)}
          </span>
          {contest.normalized_targets.map((t) => (
            <span
              key={t}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100"
            >
              {t}
            </span>
          ))}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">{contest.title}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">주최</span>
            <span>{contest.organizer || "미정"}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">마감일</span>
            <span>{safeDateLabel(contest.apply_end_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">모집기간</span>
            <span>
              {safeDateLabel(contest.apply_start_at)} - {safeDateLabel(contest.apply_end_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Database className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">출처</span>
            <span>{contest.source_site || "미정"}</span>
          </div>
          {contest.region && contest.region !== "무관" && (
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="font-semibold">지역</span>
              <span>{contest.region}</span>
            </div>
          )}
          {contest.online_offline && (
            <div className="flex items-center gap-2 text-gray-700">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="font-semibold">진행 방식</span>
              <span>{contest.online_offline}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-700">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">팀 참가</span>
            <span>{contest.team_allowed ? "가능" : "개인 참가"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <BookmarkToggleButton item={bookmarkItem} showLabel size="md" />

          {showOfficialButton && (
            <a
              href={contest.official_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Globe className="w-4 h-4" />
              공식 사이트
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {showSourceButton && (
            <a
              href={contest.source_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              원문 보기
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </section>

      {(contest.benefit?.prize || (contest.benefit?.types?.length ?? 0) > 0) && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-6 space-y-3 shadow-card">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            혜택 / 시상
          </h2>
          {contest.benefit.prize && (
            <p className="text-base font-semibold text-gray-800">{contest.benefit.prize}</p>
          )}
          {(contest.benefit.types?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {contest.benefit.types.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"
                >
                  {type}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-6 space-y-3 shadow-card">
        <h2 className="text-lg font-bold text-gray-900">지원 자격 / 안내</h2>
        {contest.eligibility_text ? (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {contest.eligibility_text}
          </p>
        ) : (
          <div className="space-y-3">
            {contest.normalized_targets.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">참가 대상</p>
                <div className="flex flex-wrap gap-2">
                  {contest.normalized_targets.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100"
                    >
                      <Users className="w-3 h-3" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600 leading-relaxed">
              지원 자격 및 참가 방법에 대한 상세 내용은 공식 사이트에서 확인하세요.
              {contest.online_offline ? ` 본 공고는 ${contest.online_offline} 방식으로 진행됩니다.` : ""}
              {contest.region && contest.region !== "무관" ? ` 참가 지역: ${contest.region}.` : ""}
              {contest.team_allowed ? " 팀 참가가 가능합니다." : ""}
            </p>
            {showOfficialButton && (
              <a
                href={contest.official_source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Globe className="w-4 h-4" />
                공식 사이트에서 확인하기
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </section>

      {metadataPairs.length > 0 && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">추가 정보</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metadataPairs.map((item) => (
              <div key={item.key} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs font-semibold text-gray-500">{item.key}</p>
                <p className="text-sm text-gray-700 mt-1 break-words">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {process.env.NEXT_PUBLIC_SHOW_DEBUG_FIELDS === "true" && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-amber-700 mb-3">[DEBUG] 상세 페이지 필드</h2>
          <ul className="space-y-1.5 text-sm text-gray-700 font-mono">
            <li><span className="font-semibold">title:</span> {contest.title}</li>
            <li><span className="font-semibold">organizer:</span> {contest.organizer || "미정"}</li>
            <li><span className="font-semibold">apply_end_at:</span> {contest.apply_end_at || "미정"}</li>
            <li><span className="font-semibold">source_site:</span> {contest.source_site || "미정"}</li>
            <li>
              <span className="font-semibold">source_url:</span>{" "}
              {contest.source_url ? (
                <a href={contest.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                  {contest.source_url}
                </a>
              ) : "없음"}
            </li>
            <li>
              <span className="font-semibold">official_source_url:</span>{" "}
              {contest.official_source_url ? (
                <a href={contest.official_source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                  {contest.official_source_url}
                </a>
              ) : "없음"}
            </li>
          </ul>
        </section>
      )}

      {/* 플랫폼 안내 */}
      <section className="rounded-2xl border border-blue-50 bg-blue-50/40 px-5 py-4 text-sm text-gray-600 leading-relaxed">
        공모전집은 공고 정보를 모아서 제공하는 플랫폼입니다.{" "}
        <strong className="text-gray-800">참가 신청은 각 공고의 공식 사이트에서 직접 진행</strong>해 주세요.
        공고 정보 수정·삭제 요청은{" "}
        <Link href="/contact" className="text-blue-600 hover:underline font-semibold">
          문의 페이지
        </Link>
        를 이용해 주세요.
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">관련 공고</h2>
          <Link href="/contests" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            전체 보기
          </Link>
        </div>
        {relatedItems.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
            관련 공고가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedItems.map((item) => (
              <ContestCard key={item.id} contest={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
