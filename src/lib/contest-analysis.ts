import type { Contest } from "@/types/contest";
import { getDaysUntilDeadline } from "@/lib/date";

export type AnalysisTone = "blue" | "emerald" | "amber" | "rose" | "violet" | "gray";

export interface ContestAnalysisMetric {
  label: string;
  value: string;
  description: string;
  tone: AnalysisTone;
}

export interface PublicContestAnalysis {
  score: number;
  scoreLabel: string;
  difficultyLabel: string;
  urgencyLabel: string;
  benefitLabel: string;
  summary: string;
  actionItems: string[];
  metrics: ContestAnalysisMetric[];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compactText(contest: Contest): string {
  return [contest.title, contest.summary, contest.description, contest.category, contest.field, contest.type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

export function getPublicRecommendationScore(contest: Contest): number {
  if (contest.review_score != null && Number.isFinite(contest.review_score)) {
    return clampScore(contest.review_score);
  }

  const text = compactText(contest);
  const days = getDaysUntilDeadline(contest.apply_end_at);
  let score = 45;

  if (contest.title?.trim().length >= 8) score += 8;
  if (contest.summary?.trim().length >= 40) score += 8;
  if (contest.description?.trim().length >= 250) score += 14;
  if (contest.poster_image_url) score += 8;
  if (contest.organizer?.trim()) score += 6;
  if (contest.benefit?.prize || (contest.benefit?.types?.length ?? 0) > 0) score += 8;
  if (contest.target?.length > 0) score += 5;
  if (contest.apply_end_at) score += 5;
  if (Number.isFinite(days) && days > 0 && days <= 14) score += 4;
  if (hasAny(text, ["시상", "상금", "인턴", "멘토링", "교육", "채용", "수료", "활동비"])) {
    score += 4;
  }

  return clampScore(score);
}

function scoreLabel(score: number): string {
  if (score >= 85) return "우선 확인 추천";
  if (score >= 75) return "추천도 높음";
  if (score >= 60) return "검토 가치 있음";
  return "조건 확인 필요";
}

function difficulty(contest: Contest): { label: string; description: string; tone: AnalysisTone } {
  const text = compactText(contest);
  let level = 1;

  if (contest.team_allowed) level += 1;
  if (contest.description?.length >= 900) level += 1;
  if (hasAny(text, ["논문", "리포트", "해커톤", "개발", "데이터", "ai", "인공지능", "포트폴리오", "영상", "작품"])) {
    level += 1;
  }
  if (hasAny(text, ["서포터즈", "기자단", "교육", "봉사", "모니터링"])) {
    level -= 1;
  }

  if (level >= 3) {
    return {
      label: "높음",
      description: "작품·기획서·기술 자료 등 준비물이 많을 수 있어 초안 일정을 먼저 잡는 편이 좋습니다.",
      tone: "rose",
    };
  }
  if (level <= 0) {
    return {
      label: "가벼움",
      description: "지원 조건과 제출 항목을 빠르게 확인하면 짧은 준비 기간에도 검토해 볼 수 있습니다.",
      tone: "emerald",
    };
  }
  return {
    label: "보통",
    description: "요강 확인, 자료 정리, 최종 제출 점검 순서로 준비하면 무리 없이 접근할 수 있습니다.",
    tone: "blue",
  };
}

function urgency(contest: Contest): { label: string; description: string; tone: AnalysisTone } {
  const days = getDaysUntilDeadline(contest.apply_end_at);
  if (!Number.isFinite(days)) {
    return {
      label: "일정 확인",
      description: "마감일이 명확하지 않아 최신 모집 요강에서 접수 일정을 먼저 확인해야 합니다.",
      tone: "gray",
    };
  }
  if (days <= 3) {
    return {
      label: "매우 임박",
      description: "제출 지연을 피하려면 오늘 바로 필수 서류와 접수 방식을 확인하세요.",
      tone: "rose",
    };
  }
  if (days <= 10) {
    return {
      label: "빠른 준비",
      description: "초안 작성과 제출 서류 확인을 병행하면 마감 전에 여유를 만들 수 있습니다.",
      tone: "amber",
    };
  }
  if (days <= 30) {
    return {
      label: "준비 적기",
      description: "자료 조사, 초안 작성, 피드백 반영까지 단계적으로 진행하기 좋은 구간입니다.",
      tone: "blue",
    };
  }
  return {
    label: "여유 있음",
    description: "주제 선정과 팀 구성부터 차근차근 준비할 수 있는 일정입니다.",
    tone: "emerald",
  };
}

function benefit(contest: Contest): { label: string; description: string; tone: AnalysisTone } {
  const hasPrize = Boolean(contest.benefit?.prize?.trim());
  const typeCount = contest.benefit?.types?.length ?? 0;

  if (hasPrize && typeCount > 0) {
    return {
      label: "명확",
      description: "상금·수료·활동비 등 기대 혜택이 비교적 구체적으로 정리되어 있습니다.",
      tone: "emerald",
    };
  }
  if (hasPrize || typeCount > 0) {
    return {
      label: "일부 확인",
      description: "혜택 키워드는 확인되지만 세부 지급 조건은 제출 전 다시 확인하는 편이 좋습니다.",
      tone: "amber",
    };
  }
  return {
    label: "확인 필요",
    description: "시상 규모나 활동 혜택이 요약에 충분히 드러나지 않아 세부 안내 확인이 필요합니다.",
    tone: "gray",
  };
}

function scoreTone(score: number): AnalysisTone {
  if (score >= 85) return "emerald";
  if (score >= 75) return "blue";
  if (score >= 60) return "amber";
  return "gray";
}

export function buildPublicContestAnalysis(contest: Contest): PublicContestAnalysis {
  const score = getPublicRecommendationScore(contest);
  const diff = difficulty(contest);
  const urg = urgency(contest);
  const ben = benefit(contest);
  const target = contest.target?.length ? contest.target.join(", ") : "관심 있는 지원자";
  const field = contest.field || contest.category || "관련";

  return {
    score,
    scoreLabel: scoreLabel(score),
    difficultyLabel: diff.label,
    urgencyLabel: urg.label,
    benefitLabel: ben.label,
    summary: `${target}가 ${field} 분야 경험을 만들 때 검토하기 좋은 ${contest.type}입니다. 준비 난이도는 ${diff.label}, 마감 긴급도는 ${urg.label}로 분류했습니다.`,
    actionItems: [
      "지원 자격과 제출 파일 형식을 먼저 확인하세요.",
      "마감 전날까지 초안·증빙·동의서 등 누락 항목을 점검하세요.",
      "혜택 조건과 결과 발표 일정을 함께 확인하면 지원 우선순위를 정하기 쉽습니다.",
    ],
    metrics: [
      {
        label: "추천도",
        value: `${score}점`,
        description: scoreLabel(score),
        tone: scoreTone(score),
      },
      {
        label: "준비 난이도",
        value: diff.label,
        description: diff.description,
        tone: diff.tone,
      },
      {
        label: "마감 긴급도",
        value: urg.label,
        description: urg.description,
        tone: urg.tone,
      },
      {
        label: "혜택 명확도",
        value: ben.label,
        description: ben.description,
        tone: ben.tone,
      },
    ],
  };
}
