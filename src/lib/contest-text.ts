import type { Contest } from "@/types/contest";

const JUNK_PATTERNS = [
  /^(home|menu|faq|q&a|login|logout|join|search)$/i,
  /^(홈|주메뉴|본문 바로가기|마이페이지|로그인|회원가입|검색|전체메뉴|메뉴|닫기|열기)$/,
  /^(공지사항|자료실|첨부파일|첨부 파일|다운로드|이전글|다음글|목록|인쇄|공유)$/,
  /^(개인정보처리방침|이용약관|사이트맵|고객센터|문의하기)$/,
  /^(facebook|twitter|instagram|youtube|blog|naver|kakao)$/i,
];

const JUNK_WORDS = [
  "마이페이지",
  "FAQ",
  "첨부파일",
  "HOME",
  "주메뉴",
  "본문 바로가기",
  "로그인",
  "회원가입",
  "사이트맵",
  "개인정보처리방침",
  "이용약관",
  "이전글",
  "다음글",
  "다운로드",
  "공지사항",
  "자료실",
];

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

export function cleanContestText(value?: string | null): string {
  if (!value) return "";
  const text = decodeEntities(String(value))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[•·▶◆■□●○]/g, " ")
    .replace(/\r/g, "\n");

  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !JUNK_PATTERNS.some((pattern) => pattern.test(line)))
    .filter((line) => {
      const junkHits = JUNK_WORDS.filter((word) => line.includes(word)).length;
      return !(junkHits >= 3 && line.length < 120);
    });

  return lines
    .join(" ")
    .replace(/\s*([.!?。！？])\s*/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasContestTextNoise(value?: string | null): boolean {
  if (!value) return false;
  const text = String(value);
  return (
    JUNK_WORDS.some((word) => text.includes(word)) ||
    /(공식\/원문 안내|주메뉴 바로가기|본문 바로가기|하단링크|통합검색|정보입력 검색|HOME\s*>)/i.test(text)
  );
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+|(?<=다\.)\s+|(?<=요\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function isMeaningfulSentence(sentence: string): boolean {
  if (sentence.length < 18) return false;
  if (JUNK_WORDS.some((word) => sentence === word)) return false;
  const junkHits = JUNK_WORDS.filter((word) => sentence.includes(word)).length;
  if (junkHits > 0) return false;
  if (/(공식\/원문 안내|주메뉴 바로가기|본문 바로가기|하단링크|통합검색|정보입력 검색)/i.test(sentence)) {
    return false;
  }
  return true;
}

function dateText(value?: string | null): string {
  if (!value) return "";
  const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value);
  return `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일`;
}

export function buildContestSummary(input: Partial<Contest>): string {
  const cleaned = cleanContestText(input.summary || input.description || "");
  const hasMenuNoise =
    JUNK_WORDS.filter((word) => cleaned.includes(word)).length > 0 ||
    /(공식\/원문 안내|주메뉴 바로가기|본문 바로가기|하단링크|통합검색|정보입력 검색|HOME\s*>)/i.test(cleaned);
  const useful = hasMenuNoise ? [] : splitSentences(cleaned).filter(isMeaningfulSentence);
  const selected = useful.slice(0, 2);

  if (selected.join(" ").length >= 80) {
    return selected.join(" ");
  }

  const title = input.title || "이 공고";
  const organizer = input.organizer && input.organizer !== "미상" ? input.organizer : "주최 기관";
  const type = input.type || "공고";
  const field = input.field || input.category || "관련";
  const target = input.target?.length ? input.target.join(", ") : "관심 있는 지원자";
  const deadline = input.apply_end_at ? ` 마감일은 ${dateText(input.apply_end_at)}입니다.` : "";

  const fallback = [
    `${organizer}에서 진행하는 ${type}입니다.`,
    `${target}가 ${field} 분야 경험을 준비할 때 검토할 수 있는 공고입니다.${deadline}`,
  ];

  if (selected.length > 0) {
    return [selected[0], fallback[1]].join(" ");
  }

  if (title.length > 0 && title !== "이 공고") {
    return `${fallback.join(" ")} 공고명은 '${title}'입니다.`;
  }

  return fallback.join(" ");
}
