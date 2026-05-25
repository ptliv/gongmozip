import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import {
  ExternalLink,
  Calendar,
  Building2,
  Globe,
  Database,
  MapPin,
  Users,
  Trophy,
  ClipboardCheck,
  Clock3,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import {
  getContestDetailPayload,
  getRelatedContestsPayload,
  type ContestDetailPayload,
} from "@/lib/supabase/public-contest-queries";
import { ContestCard } from "@/components/contest/ContestCard";
import { BookmarkToggleButton } from "@/components/bookmark/BookmarkToggleButton";
import { canonicalUrl, buildDefaultDescription } from "@/lib/seo";
import { getDaysUntilDeadline, formatDateKo } from "@/lib/date";
import { normalizeIncomingSlug } from "@/lib/slug";

interface Props {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

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

function benefitLabel(contest: ContestDetailPayload): string {
  if (contest.benefit?.prize) return contest.benefit.prize;
  if ((contest.benefit?.types?.length ?? 0) > 0) return contest.benefit.types.join(", ");
  return "공식 안내 기준";
}

function targetLabel(contest: ContestDetailPayload): string {
  if (contest.normalized_targets.length > 0) return contest.normalized_targets.join(", ");
  if (contest.target_tags.length > 0) return contest.target_tags.join(", ");
  return "공식 안내 기준";
}

function getOfficialEnrichment(contest: ContestDetailPayload): {
  title?: string;
  url?: string;
  chars?: number;
  lines: string[];
} {
  const enrichment =
    contest.metadata_json?.enrichment && typeof contest.metadata_json.enrichment === "object"
      ? (contest.metadata_json.enrichment as Record<string, unknown>)
      : {};
  const lines = Array.isArray(enrichment.official_relevant_lines)
    ? enrichment.official_relevant_lines.map((line) => String(line)).filter(Boolean).slice(0, 4)
    : [];
  return {
    title: typeof enrichment.official_title === "string" ? enrichment.official_title : undefined,
    url: typeof enrichment.official_fetch_url === "string" ? enrichment.official_fetch_url : undefined,
    chars:
      typeof enrichment.official_text_chars === "number"
        ? enrichment.official_text_chars
        : undefined,
    lines,
  };
}

function buildPreparationTips(contest: ContestDetailPayload): string[] {
  const haystack = `${contest.field} ${contest.category} ${contest.contest_type}`;
  const tips = [
    `참가 대상은 ${targetLabel(contest)}로 정리되어 있으니, 팀원까지 포함해 자격 조건을 먼저 확인하세요.`,
    `혜택/시상은 ${benefitLabel(contest)}로 표시됩니다. 수상 조건과 결과 발표 일정을 함께 확인하면 좋습니다.`,
  ];

  if (/(디자인|영상|예술|문화)/.test(haystack)) {
    tips.push("작품 파일 형식, 해상도, 러닝타임, 저작권·초상권 동의 범위를 제출 전에 점검하세요.");
  } else if (/(IT|테크|해커톤|개발|과학|공학)/i.test(haystack)) {
    tips.push("기술 구현 범위, 데모 자료, 코드 공개 여부, 팀 역할 분담을 한 문서에 정리해 두세요.");
  } else if (/(마케팅|광고|아이디어|기획|경영|경제|창업)/.test(haystack)) {
    tips.push("문제 정의, 대상 사용자, 실행 가능성, 기대 효과가 한 흐름으로 보이도록 기획안을 구성하세요.");
  } else if (/(서포터즈|기자단|대외활동|봉사)/.test(haystack)) {
    tips.push("필수 참석 일정, 콘텐츠 제출 횟수, 수료 기준, 활동비 지급 조건을 확인하세요.");
  } else {
    tips.push("모집 요강, 제출 방식, 문의처를 공식 사이트 기준으로 다시 확인한 뒤 지원하세요.");
  }

  return tips;
}

function buildChecklist(contest: ContestDetailPayload): string[] {
  const checks = [
    `마감일 ${safeDateLabel(contest.apply_end_at)} 전까지 접수 완료 기준을 확인`,
    "제출 양식, 파일명, 분량, 개인정보 동의서 등 필수 서류 확인",
    "공식 사이트의 최신 공지와 공모전집 요약이 다른 경우 공식 안내 우선 적용",
  ];
  if (contest.team_allowed) {
    checks.push("팀 지원 시 대표자 정보, 팀원 동의, 역할 분담표 준비");
  }
  return checks;
}

function buildScheduleGuide(contest: ContestDetailPayload): Array<{ label: string; text: string }> {
  const days = contest.apply_end_at ? getDaysUntilDeadline(contest.apply_end_at) : Number.NaN;
  const deadlineText = Number.isFinite(days) && days > 0 ? `${days}일 남음` : "마감일 확인 필요";
  return [
    {
      label: "오늘",
      text: "지원 자격과 제출 항목을 확인하고 필요한 자료를 목록화합니다.",
    },
    {
      label: "중간 점검",
      text: "초안, 포트폴리오, 증빙 서류를 모아 누락된 항목을 확인합니다.",
    },
    {
      label: deadlineText,
      text: "마감 당일 접속 지연을 피하려면 최종 제출은 여유 있게 완료하세요.",
    },
  ];
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
  const officialEnrichment = getOfficialEnrichment(contest);
  const preparationTips = buildPreparationTips(contest);
  const checklist = buildChecklist(contest);
  const scheduleGuide = buildScheduleGuide(contest);
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

        {contest.poster_image_url && (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
            <Image
              src={contest.poster_image_url}
              alt={`${contest.title} 포스터`}
              fill
              sizes="(min-width: 1024px) 960px, 92vw"
              className="object-contain"
              priority
            />
          </div>
        )}

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

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-500" />
              지원 준비 가이드
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              공고 정보와 공식 안내를 바탕으로 지원 전에 확인할 내용을 정리했습니다.
            </p>
          </div>
          {officialEnrichment.chars ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              공식 본문 확인됨
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100 text-xs font-semibold">
              원문 기준 요약
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-blue-500" />
              준비 포인트
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
              {preparationTips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Clock3 className="w-4 h-4 text-gray-500" />
              일정 운영
            </h3>
            <div className="space-y-3">
              {scheduleGuide.map((step) => (
                <div key={step.label} className="flex gap-3">
                  <div className="w-16 flex-shrink-0 text-xs font-bold text-gray-500">
                    {step.label}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              제출 전 체크
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
              {checklist.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {officialEnrichment.lines.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">공식 안내에서 확인한 항목</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {officialEnrichment.lines.map((line) => (
                <p
                  key={line}
                  className="text-sm text-gray-700 leading-relaxed rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"
                >
                  {line}
                </p>
              ))}
            </div>
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
