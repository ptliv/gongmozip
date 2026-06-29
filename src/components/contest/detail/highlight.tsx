import type { ReactNode } from "react";

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

  if (/(해야|하세요|필요|우선|먼저|전까지|피하려면|점검|완료)/.test(sentence)) score += 2;
  if (/(마감|접수|제출|서류|자격|조건|혜택|시상|상금)/.test(sentence)) score += 2;

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
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return [];
  return compact
    .split(/(?<=[.!?。！？]|다\.|요\.|니다\.|세요\.|습니다\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function getCoreSentenceKeys(text: string, limit: number): Set<string> {
  const ranked = splitSentences(text)
    .map((sentence) => ({ sentence, score: sentenceImportanceScore(sentence) }))
    .filter(({ sentence, score }) => score >= 3 && shouldHighlightSentence(sentence))
    .sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length)
    .slice(0, limit)
    .map(({ sentence }) => sentenceKey(sentence));

  return new Set(ranked);
}

export function highlightInline(text: string): ReactNode[] {
  const sanitized = sanitizePublicText(text);
  const sentences = splitSentences(sanitized);
  const highlights = getCoreSentenceKeys(sanitized, 2);

  if (sentences.length === 0) return [sanitized];

  return sentences.map((sentence, index) =>
    renderHighlightedSentence(sentence, index, highlights)
  );
}

function renderHighlightedSentence(
  sentence: string,
  index: number,
  highlights: Set<string>
): ReactNode {
  const key = sentenceKey(sentence);
  if (!highlights.has(key)) {
    return (
      <span key={`${key.slice(0, 24)}-${index}`}>
        {sentence}
        {index >= 0 ? " " : ""}
      </span>
    );
  }

  const match = sentence.match(/^(\s*)(.*?)(\s*)$/);
  const leading = match?.[1] ?? "";
  const core = match?.[2] ?? sentence;
  const trailing = match?.[3] ?? "";

  return (
    <span key={`${core.slice(0, 24)}-${index}`}>
      {leading}
      <mark className="box-decoration-clone rounded bg-amber-100 px-1 font-bold text-zinc-950 underline decoration-amber-400 decoration-2 underline-offset-2">
        {core}
      </mark>
      {trailing}{" "}
    </span>
  );
}

export function renderHighlightedParagraphs(text: string): ReactNode[] {
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
