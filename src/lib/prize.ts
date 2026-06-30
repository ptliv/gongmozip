import type { Contest } from "@/types/contest";
import { getContestHref } from "@/lib/slug";

export interface ContestPrizeInfo {
  readonly text: string;
  readonly amount: number | null;
  readonly amountLabel: string | null;
  readonly isPrizeLike: boolean;
}

export interface PrizePoolItem {
  readonly title: string;
  readonly href: string;
  readonly prizeText: string;
  readonly amount: number;
  readonly amountLabel: string;
}

export interface PrizePoolSummary {
  readonly totalAmount: number;
  readonly totalLabel: string;
  readonly contestCount: number;
  readonly topPrizes: readonly PrizePoolItem[];
}

interface PrizeAmountCandidate {
  readonly amount: number;
}

const AMOUNT_PATTERN = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(억원|억|천만원|천만|백만원|백만|만\s*원|만원|원)/g;
const BARE_PRIZE_NUMBER_PATTERN = /(총상금|최고상|상금|대상|최우수상|우수상)\s*:?\s*(\d{4,}(?:,\d{3})*)/g;
const BARE_SMALL_PRIZE_NUMBER_PATTERN =
  /^(총상금|최고상|상금|대상|최우수상|우수상)\s*:?\s*\d{1,3}$/;

const PRIZE_KEYWORDS = [
  "상금",
  "시상",
  "시상금",
  "상금규모",
  "총상금",
  "총 상금",
  "총규모",
  "대상",
  "최우수",
  "우수상",
  "장려상",
  "수상",
  "최고상",
  "prize",
] as const;

const NON_PRIZE_BENEFIT_WORDS = [
  "활동비",
  "교육지원금",
  "지원금",
  "초기 투자",
  "투자",
  "항공",
  "숙박",
  "식비",
  "교통비",
  "생활비",
  "멘토링",
  "연수",
  "인턴",
] as const;

const TOTAL_KEYWORDS = ["총상금", "총 상금", "총규모", "총 규모", "전체 상금"] as const;

function firstNonEmpty(...values: readonly (string | null | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.replace(/\s+/g, " ").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function hasKeyword(text: string, keywords: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function benefitIncludesPrizeType(contest: Contest): boolean {
  return contest.benefit?.types?.some((type) => String(type).includes("상금")) ?? false;
}

function isPrizeLikeText(text: string, contest: Contest): boolean {
  if (!text) return false;
  if (hasKeyword(text, PRIZE_KEYWORDS)) return true;
  if (benefitIncludesPrizeType(contest) && !hasKeyword(text, NON_PRIZE_BENEFIT_WORDS)) {
    return true;
  }
  const benefitText = getPrizeText(contest);
  return Boolean(benefitText && benefitText === text && !hasKeyword(text, NON_PRIZE_BENEFIT_WORDS));
}

function unitMultiplier(unit: string): number {
  const normalized = unit.replace(/\s+/g, "");
  switch (normalized) {
    case "억원":
    case "억":
      return 100_000_000;
    case "천만원":
    case "천만":
      return 10_000_000;
    case "백만원":
    case "백만":
      return 1_000_000;
    case "만원":
      return 10_000;
    case "원":
      return 1;
    default:
      return 0;
  }
}

function parseAmountCandidates(text: string): PrizeAmountCandidate[] {
  const candidates: PrizeAmountCandidate[] = [];
  const pattern = new RegExp(AMOUNT_PATTERN);
  const barePattern = new RegExp(BARE_PRIZE_NUMBER_PATTERN);

  let match: RegExpExecArray | null = pattern.exec(text);
  while (match !== null) {
    const rawNumber = match[1] ?? "";
    const unit = match[2] ?? "";
    const multiplier = unitMultiplier(unit);
    const numeric = Number(rawNumber.replace(/,/g, ""));
    if (Number.isFinite(numeric) && numeric > 0 && multiplier > 0) {
      candidates.push({ amount: Math.round(numeric * multiplier) });
    }
    match = pattern.exec(text);
  }

  match = barePattern.exec(text);
  while (match !== null) {
    const rawNumber = match[2] ?? "";
    const nextText = text.slice(match.index + match[0].length);
    const hasExplicitUnit = /^\s*(원|만|억|천|백)/.test(nextText);
    const numeric = Number(rawNumber.replace(/,/g, ""));
    if (!hasExplicitUnit && Number.isFinite(numeric) && numeric >= 10_000) {
      candidates.push({ amount: Math.round(numeric) });
    }
    match = barePattern.exec(text);
  }

  return candidates;
}

function splitPrizeSegments(text: string): string[] {
  return text
    .split(/[\/|·•\n]+/)
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function maxAmount(values: readonly number[]): number | null {
  let max: number | null = null;
  for (const value of values) {
    if (!Number.isFinite(value) || value <= 0) continue;
    max = max === null ? value : Math.max(max, value);
  }
  return max;
}

function sumSegmentAmount(segment: string): number | null {
  const candidates = parseAmountCandidates(segment);
  if (candidates.length === 0) return null;
  return candidates.reduce((sum, candidate) => sum + candidate.amount, 0);
}

export function extractPrizeAmount(text: string): number | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const segments = splitPrizeSegments(normalized);
  const totalSegments = segments.filter((segment) => hasKeyword(segment, TOTAL_KEYWORDS));
  if (totalSegments.length > 0) {
    const totalAmount = maxAmount(
      totalSegments
        .map(sumSegmentAmount)
        .filter((amount): amount is number => amount !== null)
    );
    if (totalAmount !== null) return totalAmount;
  }

  const candidates = parseAmountCandidates(normalized);
  return maxAmount(candidates.map((candidate) => candidate.amount));
}

export function formatKoreanPrizeAmount(amount: number): string {
  if (amount >= 100_000_000) {
    const eok = Math.floor(amount / 100_000_000);
    const man = Math.round((amount % 100_000_000) / 10_000);
    if (man <= 0) return `${eok.toLocaleString("ko-KR")}억원`;
    return `${eok.toLocaleString("ko-KR")}억 ${man.toLocaleString("ko-KR")}만원`;
  }
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`;
  }
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function getPrizeText(contest: Contest): string {
  return firstNonEmpty(contest.benefit?.prize, contest.benefit?.text);
}

function findPrizeSnippet(contest: Contest): string {
  const text = firstNonEmpty(contest.summary, contest.description);
  if (!text) return "";
  const compact = text.replace(/\s+/g, " ").trim();
  const lower = compact.toLowerCase();
  const keywordIndex = PRIZE_KEYWORDS
    .map((keyword) => lower.indexOf(keyword.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  if (keywordIndex === undefined) return "";
  const start = Math.max(0, keywordIndex - 24);
  const end = Math.min(compact.length, keywordIndex + 96);
  return compact.slice(start, end).trim();
}

function compactPrizeText(text: string): string {
  const normalized = text
    .replace(BARE_PRIZE_NUMBER_PATTERN, (matched: string, label: string, rawAmount: string) => {
      const numeric = Number(rawAmount.replace(/,/g, ""));
      if (!Number.isFinite(numeric) || numeric < 10_000) return matched;
      return `${label}: ${formatKoreanPrizeAmount(numeric)}`;
    })
    .replace(/\s+/g, " ")
    .trim();
  const displayText = splitPrizeSegments(normalized)
    .filter((segment) => !BARE_SMALL_PRIZE_NUMBER_PATTERN.test(segment))
    .join(" / ");

  if (displayText.length <= 46) return displayText;
  return `${displayText.slice(0, 43).trim()}...`;
}

export function getContestPrizeInfo(contest: Contest): ContestPrizeInfo | null {
  const benefitText = getPrizeText(contest);
  const sourceText = benefitText || findPrizeSnippet(contest);
  if (!sourceText) return null;

  const isPrizeLike = isPrizeLikeText(sourceText, contest);
  const amount = isPrizeLike ? extractPrizeAmount(sourceText) : null;
  const hasDisplayableAmount = extractPrizeAmount(sourceText) !== null;
  if (!isPrizeLike && !hasDisplayableAmount) return null;
  const text = compactPrizeText(sourceText);
  if (!text && amount === null) return null;
  const amountLabel = amount === null ? null : /(\uc2dc\uc0c1\s*\uaddc\ubaa8|\ucd1d\s*\uc2dc\uc0c1)/.test(sourceText) ? `\ucd1d \uc2dc\uc0c1\uaddc\ubaa8 ${formatKoreanPrizeAmount(amount)}` : formatKoreanPrizeAmount(amount);

  return {
    text,
    amount,
    amountLabel,
    isPrizeLike,
  };
}

export function summarizePrizePool(contests: readonly Contest[]): PrizePoolSummary {
  const items: PrizePoolItem[] = [];

  for (const contest of contests) {
    const info = getContestPrizeInfo(contest);
    if (!info?.isPrizeLike || info.amount === null || info.amount <= 0) continue;
    items.push({
      title: contest.title,
      href: getContestHref(contest),
      prizeText: info.text,
      amount: info.amount,
      amountLabel: info.amountLabel ?? formatKoreanPrizeAmount(info.amount),
    });
  }

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const topPrizes = [...items].sort((a, b) => b.amount - a.amount).slice(0, 3);

  return {
    totalAmount,
    totalLabel: totalAmount > 0 ? formatKoreanPrizeAmount(totalAmount) : "확인 중",
    contestCount: items.length,
    topPrizes,
  };
}
