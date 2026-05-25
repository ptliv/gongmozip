import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import {
  Calendar,
  Building2,
  Globe,
  MapPin,
  Users,
  Trophy,
  ClipboardCheck,
  Clock3,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  Gauge,
  Gift,
  ExternalLink,
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
import { buildPublicContestAnalysis, type AnalysisTone } from "@/lib/contest-analysis";

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

function dDayLabel(applyEndAt?: string | null): string {
  if (!applyEndAt) return "마감일 미정";
  const days = getDaysUntilDeadline(applyEndAt);
  if (!Number.isFinite(days)) return "마감일 미정";
  if (days < 0) return "마감됨";
  if (days === 0) return "오늘 마감";
  return `D-${days}`;
}

function displayStatusLabel(contest: ContestDetailPayload): string {
  const days = contest.apply_end_at ? getDaysUntilDeadline(contest.apply_end_at) : Number.NaN;
  if (Number.isFinite(days) && days <= 0) return "마감됨";
  if (contest.status === "upcoming") return "모집 예정";
  if (contest.status === "closed") return "마감됨";
  if (contest.status === "canceled") return "취소됨";
  return "모집 중";
}

const METADATA_KEY_WHITELIST = [
  "접수방법",
  "신청방법",
  "지원자격",
  "참가자격",
  "응모자격",
  "시상내역",
  "문의처",
  "주제",
  "참가비",
  "유의사항",
  "참고사항",
  "method",
  "eligibility",
  "qualification",
  "prize",
  "contact",
  "fee",
] as const;

const EMPHASIS_TERMS = [
  "마감일",
  "마감",
  "접수",
  "신청",
  "지원",
  "제출",
  "확인",
  "체크",
  "참가 대상",
  "대상",
  "자격",
  "시상",
  "상금",
  "혜택",
  "결과 발표",
  "일정",
  "팀",
  "포트폴리오",
  "저작권",
  "초상권",
  "양식",
  "서류",
] as const;

const ANALYSIS_TONE_CLASSES: Record<
  AnalysisTone,
  { card: string; icon: string; value: string }
> = {
  blue: {
    card: "border-blue-100 bg-blue-50/60",
    icon: "bg-blue-100 text-blue-700",
    value: "text-blue-800",
  },
  emerald: {
    card: "border-emerald-100 bg-emerald-50/60",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-800",
  },
  amber: {
    card: "border-amber-100 bg-amber-50/70",
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-800",
  },
  rose: {
    card: "border-rose-100 bg-rose-50/60",
    icon: "bg-rose-100 text-rose-700",
    value: "text-rose-800",
  },
  violet: {
    card: "border-violet-100 bg-violet-50/60",
    icon: "bg-violet-100 text-violet-700",
    value: "text-violet-800",
  },
  gray: {
    card: "border-gray-100 bg-gray-50",
    icon: "bg-gray-100 text-gray-600",
    value: "text-gray-800",
  },
};

function getAnalysisIcon(label: string) {
  switch (label) {
    case "지원 가치 점수":
    case "추천도":
      return Sparkles;
    case "지원 난이도":
    case "준비 난이도":
      return Gauge;
    case "예상 준비 기간":
    case "마감 위험도":
    case "마감 긴급도":
      return Clock3;
    case "초보자 적합도":
      return Users;
    case "포트폴리오 활용도":
      return ClipboardCheck;
    case "혜택 명확도":
      return Gift;
    default:
      return CheckCircle2;
  }
}

function sanitizePublicText(text: string): string {
  return text
    .replace(/공식\/원문 안내/g, "상세 안내")
    .replace(/공식\s*사이트의\s*최신\s*공고/g, "최신 모집 요강")
    .replace(/공식\s*사이트/g, "최신 모집 요강")
    .replace(/공식\s*공고/g, "최신 모집 요강")
    .replace(/공식\s*안내문/g, "상세 안내문")
    .replace(/공식\s*안내/g, "상세 안내")
    .replace(/원본\s*공고/g, "최신 모집 요강")
    .replace(/원문/g, "상세 안내")
    .replace(/출처/g, "자료");
}

function sentenceImportanceScore(sentence: string): number {
  const normalized = sentence.toLowerCase();
  let score = 0;

  for (const term of EMPHASIS_TERMS) {
    if (normalized.includes(term.toLowerCase())) {
      score += ["지원", "확인", "대상", "일정", "팀"].includes(term) ? 1 : 2;
    }
  }

  if (/(해야|하세요|필요|우선|먼저|전까지|피하려면|점검|완료)/.test(sentence)) {
    score += 2;
  }
  if (/(마감|접수|제출|서류|자격|조건|혜택|시상|상금)/.test(sentence)) {
    score += 2;
  }

  return score;
}

function shouldHighlightSentence(sentence: string): boolean {
  const compact = sentence.replace(/\s+/g, " ").trim();
  if (compact.length < 12 || compact.length > 220) return false;
  return sentenceImportanceScore(compact) >= 3;
}

function sentenceKey(sentence: string): string {
  return sentence.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string): string[] {
  const sanitized = sanitizePublicText(text);
  return sanitized.match(/[^.!?。！？]+[.!?。！？]?\s*/g) ?? [sanitized];
}

function highlightInline(text: string): ReactNode[] {
  return [sanitizePublicText(text)];
}

function getCoreSentenceKeys(text: string, limit = 4): Set<string> {
  const candidates = splitSentences(text)
    .map((sentence, index) => ({
      sentence,
      key: sentenceKey(sentence),
      score: sentenceImportanceScore(sentence),
      index,
    }))
    .filter((item) => shouldHighlightSentence(item.sentence))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index);

  return new Set(candidates.map((item) => item.key));
}

function renderHighlightedSentence(sentence: string, index: number, highlights: Set<string>): ReactNode {
  if (!sentence) return null;
  const key = sentenceKey(sentence);
  if (!highlights.has(key)) return sentence;

  const leading = sentence.match(/^\s*/)?.[0] ?? "";
  const trailing = sentence.match(/\s*$/)?.[0] ?? "";
  const core = sentence.trim();

  return (
    <span key={`${core.slice(0, 24)}-${index}`}>
      {leading}
      <mark className="box-decoration-clone rounded bg-yellow-100 px-1 font-bold text-gray-950 underline decoration-yellow-400 decoration-2 underline-offset-2">
        {core}
      </mark>
      {trailing}
    </span>
  );
}

function renderHighlightedParagraphs(text: string): ReactNode[] {
  const sanitized = sanitizePublicText(text);
  const highlights = getCoreSentenceKeys(sanitized, 4);

  return sanitized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={`${paragraph.slice(0, 24)}-${index}`} className="mb-3 last:mb-0">
        {paragraph.split(/\n/).map((line, lineIndex) => (
          <span key={`${line.slice(0, 24)}-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            {splitSentences(line).map((sentence, sentenceIndex) =>
              renderHighlightedSentence(sentence, sentenceIndex, highlights)
            )}
          </span>
        ))}
      </p>
    ));
}

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
  return "모집 요강 기준";
}

function targetLabel(contest: ContestDetailPayload): string {
  if (contest.normalized_targets.length > 0) return contest.normalized_targets.join(", ");
  if (contest.target_tags.length > 0) return contest.target_tags.join(", ");
  return "모집 요강 기준";
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

function normalizeExternalUrl(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function getApplyUrl(contest: ContestDetailPayload, enrichedUrl?: string): string {
  const candidates = [
    contest.official_url,
    contest.official_source_url,
    enrichedUrl,
    contest.source_url,
    contest.aggregator_source_url,
  ];

  for (const candidate of candidates) {
    const url = normalizeExternalUrl(candidate);
    if (url) return url;
  }

  return "";
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
    tips.push("모집 요강, 제출 방식, 문의처를 최신 안내 기준으로 다시 확인한 뒤 지원하세요.");
  }

  return tips;
}

function buildChecklist(contest: ContestDetailPayload): string[] {
  const checks = [
    `마감일 ${safeDateLabel(contest.apply_end_at)} 전까지 접수 완료 기준을 확인`,
    "제출 양식, 파일명, 분량, 개인정보 동의서 등 필수 서류 확인",
    "최신 모집 요강과 공모전집 요약이 다른 경우 최신 모집 요강 우선 적용",
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

function buildSuitableFor(contest: ContestDetailPayload): string[] {
  const target = targetLabel(contest);
  const items = [
    `${target} 중 ${contest.normalized_field || contest.field} 분야 경험을 포트폴리오에 남기고 싶은 사람`,
    "마감일과 제출 조건을 확인한 뒤 짧은 기간 안에 결과물을 정리할 수 있는 사람",
  ];

  if (contest.team_allowed) {
    items.push("기획, 제작, 발표, 자료 정리 역할을 나눠 팀 단위로 준비하려는 사람");
  } else {
    items.push("개인 역량과 기존 작업물을 바탕으로 단독 지원을 준비하려는 사람");
  }

  return items;
}

function buildStrategyItems(contest: ContestDetailPayload): string[] {
  const items = [
    "첫날에는 모집 요강, 참가 대상, 제출 파일 형식만 따로 정리해 지원 가능 여부를 판단하세요.",
    "중간 점검일을 정해 초안, 증빙 서류, 포트폴리오, 개인정보 동의서 누락 여부를 확인하세요.",
    "최종 제출 전에는 파일명, 분량, 해상도, 링크 접근 권한처럼 작은 실수가 생기기 쉬운 항목을 다시 보세요.",
  ];

  if (/(기획|아이디어|마케팅|광고|창업|경영)/.test(`${contest.category} ${contest.field}`)) {
    items.push("기획형 공고는 문제 정의, 대상 사용자, 실행 가능성, 기대 효과가 한 흐름으로 보이게 구성하세요.");
  } else if (/(개발|IT|테크|데이터|과학|공학)/i.test(`${contest.category} ${contest.field} ${contest.title}`)) {
    items.push("기술형 공고는 구현 범위, 데이터 사용 방식, 데모 가능 여부를 심사자가 빠르게 이해하도록 정리하세요.");
  } else if (/(디자인|영상|문화|예술)/.test(`${contest.category} ${contest.field}`)) {
    items.push("작품형 공고는 콘셉트, 제작 의도, 저작권 확인 내용을 작품 설명 안에 함께 넣는 편이 좋습니다.");
  }

  return items.slice(0, 4);
}

function buildCautionItems(contest: ContestDetailPayload): string[] {
  return [
    `마감일은 ${safeDateLabel(contest.apply_end_at)} 기준으로 표시되며, 접수 종료 시간이 따로 있을 수 있습니다.`,
    "요약 정보와 최신 모집 요강이 다르면 최신 모집 요강의 제출 조건을 우선으로 보세요.",
    "상금, 활동비, 수료증, 채용 연계 등 혜택은 지급 조건과 제외 조건을 함께 확인해야 합니다.",
    contest.team_allowed
      ? "팀 지원은 대표자 정보, 팀원 동의, 역할 분담 자료가 필요한지 먼저 확인하세요."
      : "개인 지원은 본인 명의 제출, 연락처, 증빙 서류의 일치 여부를 확인하세요.",
  ];
}

function buildFaq(contest: ContestDetailPayload): Array<{ q: string; a: string }> {
  return [
    {
      q: "이 공고는 지금 지원할 수 있나요?",
      a: `현재 표시 상태는 ${displayStatusLabel(contest)}이며, 마감일은 ${safeDateLabel(contest.apply_end_at)}입니다. 접수 시간이 별도로 정해진 경우가 있으니 제출 전 최신 모집 요강을 확인하세요.`,
    },
    {
      q: "어떤 자료부터 준비하면 좋나요?",
      a: "참가 자격, 제출 양식, 파일 형식, 개인정보 동의 여부를 먼저 확인한 뒤 초안과 증빙 자료를 준비하는 순서가 좋습니다.",
    },
    {
      q: "팀으로 지원해도 되나요?",
      a: contest.team_allowed
        ? "팀 참가가 가능한 공고로 분류되어 있습니다. 대표자 정보, 팀원 수 제한, 역할 분담표 필요 여부를 확인하세요."
        : "개인 참가 중심 공고로 분류되어 있습니다. 팀 제출 가능 여부가 필요한 경우 최신 모집 요강에서 별도 조건을 확인하세요.",
    },
    {
      q: "비슷한 공고도 같이 봐야 하나요?",
      a: "비슷한 분야의 공고를 함께 보면 제출 형식, 심사 기준, 혜택 수준을 비교해 지원 우선순위를 정하기 쉽습니다.",
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
  const contestAnalysis = buildPublicContestAnalysis(contest);
  const suitableFor = buildSuitableFor(contest);
  const strategyItems = buildStrategyItems(contest);
  const cautionItems = buildCautionItems(contest);
  const faqItems = buildFaq(contest);
  const applyUrl = getApplyUrl(contest, officialEnrichment.url);
  const bookmarkItem = {
    slug: contest.slug,
    title: contest.title,
    organizer: contest.organizer,
    apply_end_at: contest.apply_end_at,
  };

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
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            {displayStatusLabel(contest)}
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
          {applyUrl && (
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={`${contest.title} 신청 바로가기`}
            >
              <ExternalLink className="h-4 w-4" />
              신청 바로가기
            </a>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            공모전집 분석 리포트
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            공고 내용, 마감일, 혜택, 준비 난이도, 포트폴리오 활용도를 종합해 지원 판단 기준을 정리했습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {contestAnalysis.metrics.map((metric) => {
            const Icon = getAnalysisIcon(metric.label);
            const tone = ANALYSIS_TONE_CLASSES[metric.tone];
            return (
              <article
                key={metric.label}
                className={`rounded-2xl border p-4 ${tone.card}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500">{metric.label}</p>
                    <p className={`mt-1 text-xl font-bold ${tone.value}`}>{metric.value}</p>
                  </div>
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tone.icon}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-gray-600">
                  {highlightInline(metric.description)}
                </p>
              </article>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm leading-relaxed text-gray-700">
            {highlightInline(contestAnalysis.summary)}
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
            {contestAnalysis.actionItems.map((item) => (
              <p
                key={item}
                className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600"
              >
                {highlightInline(item)}
              </p>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4 border-t border-gray-100 pt-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">추천 대상</h3>
              <ul className="space-y-2 text-sm leading-relaxed text-gray-600">
                {contestAnalysis.recommendedTargets.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span>{highlightInline(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">주의할 점</h3>
              <ul className="space-y-2 text-sm leading-relaxed text-gray-600">
                {contestAnalysis.cautions.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                    <span>{highlightInline(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-2">공모전집 한줄 판단</h3>
              <p className="text-sm leading-relaxed text-gray-700">
                {highlightInline(contestAnalysis.verdict)}
              </p>
            </div>
          </div>
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
          <div className="text-sm text-gray-700 leading-relaxed">
            {renderHighlightedParagraphs(contest.eligibility_text)}
          </div>
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
              지원 자격 및 참가 방법은 최신 모집 요강 기준으로 확인하세요.
              {contest.online_offline ? ` 본 공고는 ${contest.online_offline} 방식으로 진행됩니다.` : ""}
              {contest.region && contest.region !== "무관" ? ` 참가 지역: ${contest.region}.` : ""}
              {contest.team_allowed ? " 팀 참가가 가능합니다." : ""}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">지원 판단 가이드</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">이 공고가 적합한 사람</h3>
            <ul className="space-y-2 text-sm text-gray-600 leading-relaxed">
              {suitableFor.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  <span>{highlightInline(item)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">지원 전 확인사항</h3>
            <ul className="space-y-2 text-sm text-gray-600 leading-relaxed">
              {strategyItems.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                  <span>{highlightInline(item)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">제출 전 유의사항</h3>
            <ul className="space-y-2 text-sm text-gray-600 leading-relaxed">
              {cautionItems.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                  <span>{highlightInline(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-500" />
              지원 준비 가이드
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              공고 정보와 상세 안내를 바탕으로 지원 전에 확인할 내용을 정리했습니다.
            </p>
          </div>
          {officialEnrichment.chars ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              상세 본문 보강됨
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100 text-xs font-semibold">
              상세 기준 요약
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
                  <span>{highlightInline(tip)}</span>
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
                    {highlightInline(step.label)}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{highlightInline(step.text)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              준비 서류 체크리스트
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
              {checklist.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{highlightInline(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {officialEnrichment.lines.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">주요 확인 항목</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {officialEnrichment.lines.map((line) => (
                <p
                  key={line}
                  className="text-sm text-gray-700 leading-relaxed rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"
                >
                  {highlightInline(line)}
                </p>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">자주 묻는 질문</h2>
        <div className="divide-y divide-gray-100">
          {faqItems.map((item) => (
            <details key={item.q} className="group py-3 first:pt-0 last:pb-0">
              <summary className="cursor-pointer list-none text-sm font-bold text-gray-800 group-open:text-blue-700">
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{highlightInline(item.a)}</p>
            </details>
          ))}
        </div>
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
          </ul>
        </section>
      )}

      {/* 플랫폼 안내 */}
      <section className="rounded-2xl border border-blue-50 bg-blue-50/40 px-5 py-4 text-sm text-gray-600 leading-relaxed">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            공모전집은 공고 정보를 정리해 제공하는 플랫폼입니다.{" "}
            <strong className="text-gray-800">참가 신청 전 최신 모집 요강과 접수 조건을 확인</strong>해 주세요.
            공고 정보 수정·삭제 요청은{" "}
            <Link href="/contact" className="text-blue-600 hover:underline font-semibold">
              문의 페이지
            </Link>
            를 이용해 주세요.
          </p>
          {applyUrl && (
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={`${contest.title} 신청 바로가기`}
            >
              <ExternalLink className="h-4 w-4" />
              신청 바로가기
            </a>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">비슷한 공고 추천</h2>
          <Link href="/contests" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            전체 보기
          </Link>
        </div>
        {relatedItems.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
            비슷한 공고가 없습니다.
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
