export interface BriefingItem {
  readonly id: string;
  readonly category: "브리핑" | "준비팁" | "트렌드";
  readonly title: string;
  readonly summary: string;
  readonly href: string;
  readonly dateLabel: string;
}

export const briefingMockData: readonly BriefingItem[] = [
  {
    id: "weekly-deadline",
    category: "브리핑",
    title: "이번 주 마감 임박 공모전 체크포인트",
    summary: "마감이 가까운 공고는 제출물 범위와 접수 시간을 먼저 확인해야 합니다.",
    href: "/deadline/7days",
    dateLabel: "오늘 업데이트",
  },
  {
    id: "ai-data-trend",
    category: "트렌드",
    title: "AI·데이터 분야 공모전이 계속 늘어나는 이유",
    summary: "기업과 공공기관이 실제 문제 해결형 아이디어를 찾는 흐름이 강해지고 있습니다.",
    href: "/contests?field=IT%C2%B7%ED%85%8C%ED%81%AC",
    dateLabel: "공모전집 해설",
  },
  {
    id: "beginner-choice",
    category: "준비팁",
    title: "처음 공모전을 고를 때 확인할 3가지",
    summary: "지원 대상, 제출물 난이도, 결과물 활용도를 함께 보면 시간을 아낄 수 있습니다.",
    href: "/guides",
    dateLabel: "가이드 연결",
  },
] as const;
