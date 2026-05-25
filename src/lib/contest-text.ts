import type { Contest } from "@/types/contest";

const JUNK_PATTERNS = [
  /^(home|menu|faq|q&a|login|logout|join|search)$/i,
  /^(홈|주메뉴|본문 바로가기|마이페이지|로그인|회원가입|검색|전체메뉴|메뉴|닫기|열기)$/,
  /^(공지사항|자료실|첨부파일|첨부 파일|다운로드|이전글|다음글|목록|인쇄|공유|공유하기|프린트|목록으로)$/,
  /^(개인정보처리방침|이용약관|사이트맵|고객센터|커뮤니티|문의하기|관련사이트)$/,
  /^(facebook|twitter|instagram|youtube|blog|naver|kakao)$/i,
];

const JUNK_WORDS = [
  "마이페이지",
  "FAQ",
  "Q&A",
  "첨부파일",
  "첨부파일은 PC버전에서",
  "PC버전에서 다운받아 확인",
  "HOME",
  "홈",
  "주메뉴",
  "주메뉴 바로가기",
  "본문 바로가기",
  "하단링크 바로가기",
  "메뉴 열기",
  "메뉴 닫기",
  "로그인",
  "회원가입",
  "사이트맵",
  "통합검색",
  "검색하기",
  "개인정보처리방침",
  "이용약관",
  "고객센터",
  "커뮤니티",
  "신청 및 확인",
  "신청확인",
  "접수확인",
  "정보입력",
  "공유하기",
  "프린트",
  "목록으로",
  "이전글",
  "다음글",
  "다운로드",
  "공지사항",
  "자료실",
  "관련사이트",
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

function contestSubject(input: Partial<Contest>): string {
  const type = input.type || "공고";
  const field = input.field && input.field !== "기타" ? `${input.field} 분야` : "";
  const category = input.category && input.category !== "기타" ? input.category : "";
  const prefix = field || category;
  if (!prefix) return `${type} 공고`;
  return `${prefix} ${type}`;
}

function focusText(input: Partial<Contest>, text: string): string {
  const haystack = `${text} ${input.title || ""} ${input.type || ""} ${input.category || ""} ${input.field || ""}`.toLowerCase();

  if (input.benefit?.prize) return `${input.benefit.prize} 등 혜택 조건`;
  if (/(인턴|직무|채용|실무)/.test(haystack)) return "직무 경험과 지원 동기";
  if (/(서포터즈|기자단|대외활동|sns|콘텐츠)/.test(haystack)) return "활동 가능 시간과 콘텐츠 제작 경험";
  if (/(디자인|영상|포스터|사진|작품|예술|문화)/.test(haystack)) return "작품 콘셉트와 제출 파일 형식";
  if (/(해커톤|개발|데이터|ai|인공지능|앱|웹|소프트웨어)/.test(haystack)) return "문제 정의와 구현 가능성";
  if (/(마케팅|광고|아이디어|기획|창업|사업계획)/.test(haystack)) return "문제 정의와 차별화 포인트";
  if (/(논문|에세이|글쓰기|리포트)/.test(haystack)) return "주제 적합성과 근거 자료";
  return "제출 조건과 준비 일정";
}

export function buildContestSummary(input: Partial<Contest>): string {
  const cleaned = cleanContestText(input.summary || input.description || "");
  const organizer = input.organizer && input.organizer !== "미상" ? input.organizer : "주최 기관";
  const target = input.target?.length ? input.target.join(", ") : "관심 있는 지원자";
  const subject = contestSubject(input);
  const focus = focusText(input, cleaned);
  const deadline = input.apply_end_at ? ` 마감일은 ${dateText(input.apply_end_at)}입니다.` : "";

  return [
    `${organizer}에서 진행하는 ${subject}입니다.`,
    `${target}에게 적합하며, ${focus}을 중심으로 준비하면 좋습니다.`,
    `${deadline} 세부 조건은 신청 페이지에서 최종 확인하는 것을 권장합니다.`,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
