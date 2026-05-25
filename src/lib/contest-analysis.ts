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
  prepPeriodLabel: string;
  beginnerFitLabel: string;
  portfolioValueLabel: string;
  deadlineRiskLabel: string;
  summary: string;
  actionItems: string[];
  metrics: ContestAnalysisMetric[];
  recommendedTargets: string[];
  cautions: string[];
  verdict: string;
  filters: {
    beginnerRecommended: boolean;
    portfolioHigh: boolean;
    deadlineRiskLow: boolean;
    prepWithinWeek: boolean;
    score80Plus: boolean;
  };
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

function deadlineDays(contest: Contest): number {
  return getDaysUntilDeadline(contest.apply_end_at);
}

function hasPrize(contest: Contest): boolean {
  return Boolean(contest.benefit?.prize?.trim() || (contest.benefit?.types?.length ?? 0) > 0);
}

function isTrustedOrganizer(contest: Contest): boolean {
  const text = `${contest.organizer} ${contest.title}`.toLowerCase();
  return hasAny(text, [
    "대학교",
    "대학",
    "정부",
    "공공",
    "공사",
    "공단",
    "재단",
    "협회",
    "시청",
    "구청",
    "군청",
    "교육청",
    "센터",
    "삼성",
    "현대",
    "lg",
    "sk",
    "kt",
    "네이버",
    "카카오",
    "롯데",
    "포스코",
    "kb",
    "kbs",
  ]);
}

function isOnlineApplication(contest: Contest): boolean {
  const text = compactText(contest);
  return (
    contest.online_offline?.includes("온라인") ||
    hasAny(text, ["온라인", "이메일", "구글폼", "홈페이지", "웹사이트", "접수", "신청"])
  );
}

function isIndividualFriendly(contest: Contest): boolean {
  const text = compactText(contest);
  if (hasAny(text, ["팀 필수", "팀으로만", "팀 단위 필수"])) return false;
  return !contest.team_allowed || hasAny(text, ["개인", "개별", "개인 또는 팀"]);
}

function isTeamRequired(contest: Contest): boolean {
  return hasAny(compactText(contest), ["팀 필수", "팀으로만", "팀 단위 필수", "팀 구성 필수"]);
}

function hasComplexSubmission(contest: Contest): boolean {
  return hasAny(compactText(contest), [
    "논문",
    "리포트",
    "사업계획서",
    "기획서",
    "제안서",
    "영상",
    "포스터",
    "해커톤",
    "앱",
    "개발",
    "데이터",
    "ai",
    "인공지능",
    "시제품",
    "프로토타입",
    "발표",
    "ppt",
    "포트폴리오",
  ]);
}

function hasStrongTargetRestriction(contest: Contest): boolean {
  const targets = contest.target ?? [];
  if (targets.length === 0) return true;
  if (targets.some((target) => ["누구나", "일반인", "청년"].includes(target))) return false;
  return targets.length <= 1;
}

function hasSparseInformation(contest: Contest): boolean {
  const textLength = `${contest.summary || ""} ${contest.description || ""}`.replace(/\s+/g, " ").trim().length;
  return textLength < 180 || !contest.apply_end_at;
}

export function getPublicRecommendationScore(contest: Contest): number {
  const days = deadlineDays(contest);
  let score = 50;

  if (hasPrize(contest)) score += 10;
  if (isTrustedOrganizer(contest)) score += 10;
  if (portfolioValue(contest).label === "높음") score += 10;
  if (beginnerFit(contest).label === "높음") score += 5;
  if (Number.isFinite(days) && days >= 7) score += 5;
  if (isOnlineApplication(contest)) score += 5;
  if (isIndividualFriendly(contest)) score += 5;

  if (Number.isFinite(days) && days <= 3) score -= 10;
  if (hasComplexSubmission(contest)) score -= 10;
  if (isTeamRequired(contest)) score -= 5;
  if (hasStrongTargetRestriction(contest)) score -= 5;
  if (hasSparseInformation(contest)) score -= 10;

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

  if (isTeamRequired(contest)) level += 1;
  if (contest.description?.length >= 900) level += 1;
  if (hasComplexSubmission(contest)) {
    level += 1;
  }
  if (hasAny(text, ["서포터즈", "기자단", "교육", "봉사", "모니터링"])) {
    level -= 1;
  }

  if (level >= 3) {
    return {
      label: "어려움",
      description: "작품·기획서·기술 자료 등 준비물이 많을 수 있어 초안 일정을 먼저 잡는 편이 좋습니다.",
      tone: "rose",
    };
  }
  if (level <= 0) {
    return {
      label: "쉬움",
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
  const days = deadlineDays(contest);
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

function prepPeriod(contest: Contest): { label: string; description: string; tone: AnalysisTone; withinWeek: boolean } {
  const diff = difficulty(contest).label;
  const text = compactText(contest);
  const days = deadlineDays(contest);

  if (hasAny(text, ["사업계획서", "논문", "해커톤", "시제품", "프로토타입", "영상", "개발", "데이터"])) {
    return {
      label: "2주 이상",
      description: "기획, 제작, 검수 시간이 필요해 중간 마감일을 따로 잡는 편이 좋습니다.",
      tone: "rose",
      withinWeek: false,
    };
  }
  if (diff === "어려움") {
    return {
      label: "1~2주",
      description: "제출물 구조와 역할 분담을 먼저 정하면 준비 시간을 줄일 수 있습니다.",
      tone: "amber",
      withinWeek: false,
    };
  }
  if (Number.isFinite(days) && days <= 3) {
    return {
      label: "1~3일",
      description: "기존 자료가 있거나 제출물이 단순한 경우에만 빠르게 검토하는 편이 좋습니다.",
      tone: "amber",
      withinWeek: true,
    };
  }
  if (diff === "쉬움") {
    return {
      label: "1~3일",
      description: "필수 조건과 제출 양식만 확인하면 비교적 빠르게 지원 준비가 가능합니다.",
      tone: "emerald",
      withinWeek: true,
    };
  }
  return {
    label: "5~7일",
    description: "요강 확인, 초안 작성, 제출 전 검수까지 한 주 안에 계획하기 좋은 난이도입니다.",
    tone: "blue",
    withinWeek: true,
  };
}

function beginnerFit(contest: Contest): { label: string; description: string; tone: AnalysisTone } {
  const diff = difficulty(contest).label;
  const restricted = hasStrongTargetRestriction(contest);
  const text = compactText(contest);

  if (diff === "쉬움" && !restricted) {
    return {
      label: "높음",
      description: "제출 조건이 비교적 단순해 첫 지원 공고로도 검토하기 좋습니다.",
      tone: "emerald",
    };
  }
  if (diff === "어려움" || hasAny(text, ["전공자", "경력", "전문", "석사", "박사", "개발", "논문"])) {
    return {
      label: "낮음",
      description: "전문 역량이나 완성도 높은 제출물이 필요할 수 있어 경험자에게 더 적합합니다.",
      tone: "rose",
    };
  }
  return {
    label: "보통",
    description: "지원 조건을 충족하고 제출 형식을 확인하면 초보자도 검토할 수 있습니다.",
    tone: "blue",
  };
}

function portfolioValue(contest: Contest): { label: string; description: string; tone: AnalysisTone } {
  const text = compactText(contest);
  let score = 0;

  if (hasAny(text, ["작품", "포트폴리오", "기획서", "제안서", "영상", "디자인", "개발", "데이터", "마케팅", "콘텐츠", "수상"])) score += 2;
  if (hasPrize(contest)) score += 1;
  if (isTrustedOrganizer(contest)) score += 1;
  if (hasAny(text, ["수료", "인증서", "활동비", "멘토링", "인턴", "채용"])) score += 1;

  if (score >= 3) {
    return {
      label: "높음",
      description: "결과물이나 수상·활동 이력을 자기소개서와 포트폴리오에 연결하기 좋습니다.",
      tone: "emerald",
    };
  }
  if (score <= 1) {
    return {
      label: "낮음",
      description: "공고 자체의 경험 가치는 있으나 결과물 활용 방식은 추가 확인이 필요합니다.",
      tone: "gray",
    };
  }
  return {
    label: "보통",
    description: "준비 과정과 제출물을 정리해 두면 포트폴리오 소재로 활용할 수 있습니다.",
    tone: "blue",
  };
}

function deadlineRisk(contest: Contest): { label: string; description: string; tone: AnalysisTone; low: boolean } {
  const days = deadlineDays(contest);
  const complex = hasComplexSubmission(contest);

  if (!Number.isFinite(days)) {
    return {
      label: "일정 확인",
      description: "마감일 정보가 불명확해 접수 가능 기간을 먼저 확인해야 합니다.",
      tone: "gray",
      low: false,
    };
  }
  if (days <= 3 || (days <= 7 && complex)) {
    return {
      label: "매우 빠듯함",
      description: "마감 전까지 새 결과물을 만들기보다 기존 자료 활용 가능성을 먼저 봐야 합니다.",
      tone: "rose",
      low: false,
    };
  }
  if (days <= 10) {
    return {
      label: "빠듯함",
      description: "제출물 범위를 줄이고 필수 서류 누락을 막는 방식으로 준비해야 합니다.",
      tone: "amber",
      low: false,
    };
  }
  return {
    label: "여유",
    description: "준비 단계와 검수 일정을 나눠 잡기 좋은 마감 여유가 있습니다.",
    tone: "emerald",
    low: true,
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
  const prep = prepPeriod(contest);
  const beginner = beginnerFit(contest);
  const portfolio = portfolioValue(contest);
  const risk = deadlineRisk(contest);
  const target = contest.target?.length ? contest.target.join(", ") : "관심 있는 지원자";
  const field = contest.field || contest.category || "관련";
  const scoreText = scoreLabel(score);
  const recommendedTargets = [
    `${target} 중 ${field} 분야 경험을 만들고 싶은 사람`,
    portfolio.label === "높음"
      ? "수상·활동 결과를 포트폴리오나 자기소개서에 활용하려는 사람"
      : "지원 경험을 쌓고 제출 과정을 연습하려는 사람",
    beginner.label === "높음"
      ? "첫 공모전이나 대외활동을 부담 없이 시작하려는 사람"
      : "제출 조건을 읽고 일정 관리를 직접 할 수 있는 지원자",
  ];
  const cautions = [
    "제출 형식, 접수 시간, 개인정보 동의 여부는 신청 전 최신 모집 요강에서 다시 확인하세요.",
    hasComplexSubmission(contest)
      ? "제출물이 복잡할 수 있으므로 초안, 검수, 최종 제출 일정을 나눠 잡는 편이 좋습니다."
      : "제출물이 단순해 보여도 파일명, 분량, 접수 완료 화면을 마지막에 확인하세요.",
    hasSparseInformation(contest)
      ? "요약 정보가 부족한 공고는 신청 페이지에서 세부 자격과 혜택 조건을 반드시 확인해야 합니다."
      : "혜택과 결과 발표 일정은 지원 우선순위를 정할 때 함께 비교하세요.",
  ];
  const verdict =
    score >= 80 && beginner.label === "높음"
      ? "마감 여유와 준비 난이도가 비교적 좋아 초보자도 우선 검토하기 좋은 공고입니다."
      : score >= 80 && portfolio.label === "높음"
        ? "지원 가치와 포트폴리오 활용도가 높아 결과물을 남기고 싶은 지원자에게 추천할 만한 공고입니다."
        : risk.label === "매우 빠듯함"
          ? "마감이 가까워 새로 준비하기보다는 기존 결과물이나 초안이 있는 사람에게 더 적합합니다."
          : diff.label === "어려움"
            ? "준비 난이도가 높아 일정과 역할을 먼저 정한 뒤 신중히 지원 여부를 판단하는 편이 좋습니다."
            : "조건을 확인한 뒤 한 주 안에 준비 계획을 세우기 좋은 검토 대상 공고입니다.";

  return {
    score,
    scoreLabel: scoreText,
    difficultyLabel: diff.label,
    urgencyLabel: urg.label,
    benefitLabel: ben.label,
    prepPeriodLabel: prep.label,
    beginnerFitLabel: beginner.label,
    portfolioValueLabel: portfolio.label,
    deadlineRiskLabel: risk.label,
    summary: `${target}가 ${field} 분야 경험을 만들 때 검토하기 좋은 ${contest.type}입니다. 지원 가치 점수는 ${score}점, 준비 난이도는 ${diff.label}, 예상 준비 기간은 ${prep.label}로 분류했습니다.`,
    actionItems: [
      "지원 자격과 제출 파일 형식을 먼저 확인하세요.",
      "마감 전날까지 초안·증빙·동의서 등 누락 항목을 점검하세요.",
      "혜택 조건과 결과 발표 일정을 함께 확인하면 지원 우선순위를 정하기 쉽습니다.",
    ],
    metrics: [
      {
        label: "지원 가치 점수",
        value: `${score}점`,
        description: scoreText,
        tone: scoreTone(score),
      },
      {
        label: "지원 난이도",
        value: diff.label,
        description: diff.description,
        tone: diff.tone,
      },
      {
        label: "예상 준비 기간",
        value: prep.label,
        description: prep.description,
        tone: prep.tone,
      },
      {
        label: "초보자 적합도",
        value: beginner.label,
        description: beginner.description,
        tone: beginner.tone,
      },
      {
        label: "포트폴리오 활용도",
        value: portfolio.label,
        description: portfolio.description,
        tone: portfolio.tone,
      },
      {
        label: "마감 위험도",
        value: risk.label,
        description: risk.description,
        tone: risk.tone,
      },
      {
        label: "혜택 명확도",
        value: ben.label,
        description: ben.description,
        tone: ben.tone,
      },
    ],
    recommendedTargets,
    cautions,
    verdict,
    filters: {
      beginnerRecommended: beginner.label === "높음",
      portfolioHigh: portfolio.label === "높음",
      deadlineRiskLow: risk.low,
      prepWithinWeek: prep.withinWeek,
      score80Plus: score >= 80,
    },
  };
}
