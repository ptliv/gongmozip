import { formatDateKo, getDaysUntilDeadline } from "@/lib/date";
import { GUIDE_ARTICLES, type GuideArticle } from "@/data/guides";
import type { ContestDetailPayload } from "@/lib/supabase/public-contest-queries";

export function safeDateLabel(value?: string | null): string {
  if (!value) return "미정";
  try {
    return formatDateKo(value);
  } catch {
    return "미정";
  }
}

function displayStatusLabel(contest: ContestDetailPayload): string {
  const days = contest.apply_end_at ? getDaysUntilDeadline(contest.apply_end_at) : Number.NaN;
  if (Number.isFinite(days) && days <= 0) return "마감됨";
  if (contest.status === "upcoming") return "모집 예정";
  if (contest.status === "closed") return "마감됨";
  if (contest.status === "canceled") return "취소됨";
  return "모집 중";
}

export function benefitLabel(contest: ContestDetailPayload): string {
  if (contest.benefit?.prize) return contest.benefit.prize;
  if (contest.benefit?.text) return contest.benefit.text;
  if ((contest.benefit?.types?.length ?? 0) > 0) return contest.benefit.types.join(", ");
  return "모집 요강 기준";
}

export function targetLabel(contest: ContestDetailPayload): string {
  if (contest.normalized_targets.length > 0) return contest.normalized_targets.join(", ");
  if (contest.target_tags.length > 0) return contest.target_tags.join(", ");
  return "모집 요강 기준";
}

export function buildPreparationTips(contest: ContestDetailPayload): string[] {
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

export function buildChecklist(contest: ContestDetailPayload): string[] {
  const checks = [
    `마감일 ${safeDateLabel(contest.apply_end_at)} 전까지 접수 완료 기준을 확인`,
    "제출 양식, 파일명, 분량, 개인정보 동의서 등 필수 서류 확인",
    "최신 모집 요강과 공모전집 요약이 다른 경우 최신 모집 요강 우선 적용",
  ];
  if (contest.team_allowed) checks.push("팀 지원 시 대표자 정보, 팀원 동의, 역할 분담표 준비");
  return checks;
}

export function buildScheduleGuide(contest: ContestDetailPayload): Array<{ label: string; text: string }> {
  const days = contest.apply_end_at ? getDaysUntilDeadline(contest.apply_end_at) : Number.NaN;
  const deadlineText = Number.isFinite(days) && days > 0 ? `${days}일 남음` : "마감일 확인 필요";
  return [
    { label: "오늘", text: "지원 자격과 제출 항목을 확인하고 필요한 자료를 목록화합니다." },
    { label: "중간 점검", text: "초안, 포트폴리오, 증빙 서류를 모아 누락된 항목을 확인합니다." },
    { label: deadlineText, text: "마감 당일 접속 지연을 피하려면 최종 제출은 여유 있게 완료하세요." },
  ];
}

export function buildSuitableFor(contest: ContestDetailPayload): string[] {
  const items = [
    `${targetLabel(contest)} 중 ${contest.normalized_field || contest.field} 분야 경험을 포트폴리오에 남기고 싶은 사람`,
    "마감일과 제출 조건을 확인한 뒤 짧은 기간 안에 결과물을 정리할 수 있는 사람",
  ];
  items.push(
    contest.team_allowed
      ? "기획, 제작, 발표, 자료 정리 역할을 나눠 팀 단위로 준비하려는 사람"
      : "개인 역량과 기존 작업물을 바탕으로 단독 지원을 준비하려는 사람"
  );
  return items;
}

export function buildStrategyItems(contest: ContestDetailPayload): string[] {
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

export function buildCautionItems(contest: ContestDetailPayload): string[] {
  return [
    `마감일은 ${safeDateLabel(contest.apply_end_at)} 기준으로 표시되며, 접수 종료 시간이 따로 있을 수 있습니다.`,
    "요약 정보와 최신 모집 요강이 다르면 최신 모집 요강의 제출 조건을 우선으로 보세요.",
    "상금, 활동비, 수료증, 채용 연계 등 혜택은 지급 조건과 제외 조건을 함께 확인해야 합니다.",
    contest.team_allowed
      ? "팀 지원은 대표자 정보, 팀원 동의, 역할 분담 자료가 필요한지 먼저 확인하세요."
      : "개인 지원은 본인 명의 제출, 연락처, 증빙 서류의 일치 여부를 확인하세요.",
  ];
}

export function buildFaq(contest: ContestDetailPayload): Array<{ q: string; a: string }> {
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

export function getRelatedGuideArticles(contest: ContestDetailPayload): GuideArticle[] {
  const haystack = `${contest.title} ${contest.type} ${contest.category} ${contest.field}`.toLowerCase();
  const slugs = new Set<string>(["scoring-method", "submission-final-check", "contest-first-start"]);

  if (/(마감|d-|deadline)/i.test(haystack)) slugs.add("deadline-7days-strategy");
  if (/(기획|아이디어|제안|마케팅|광고)/.test(haystack)) slugs.add("proposal-writing");
  if (/(디자인|포스터|브랜드|시각)/.test(haystack)) slugs.add("design-portfolio");
  if (/(영상|숏폼|콘텐츠|유튜브|영화)/.test(haystack)) slugs.add("video-contest-plan");
  if (/(해커톤|개발|it|데이터|ai|앱|소프트웨어)/i.test(haystack)) slugs.add("hackathon-preparation");
  if (/(서포터즈|기자단|대외활동|활동)/.test(haystack)) slugs.add("supporters-application");
  if (/(인턴|채용|직무)/.test(haystack)) slugs.add("internship-posting-checklist");
  if (contest.team_allowed) slugs.add("team-role-division");

  return GUIDE_ARTICLES.filter((article) => slugs.has(article.slug)).slice(0, 5);
}
