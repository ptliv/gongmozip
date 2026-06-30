export interface CommunityStory {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly commentCount: number;
  readonly kind: "커뮤니티" | "준비 질문" | "팀원 모집" | "수상 후기";
}

export const communityStoriesMockData: readonly CommunityStory[] = [
  {
    id: "start-field",
    title: "공모전 처음 준비하는데 어떤 분야부터 볼까요?",
    href: "/#community",
    commentCount: 4,
    kind: "준비 질문",
  },
  {
    id: "team-portfolio",
    title: "팀원 모집할 때 포트폴리오 꼭 봐야 하나요?",
    href: "/#community",
    commentCount: 6,
    kind: "팀원 모집",
  },
  {
    id: "winning-reference",
    title: "대학생 공모전 수상작은 어디서 참고하나요?",
    href: "/guides",
    commentCount: 5,
    kind: "준비 질문",
  },
  {
    id: "three-days-left",
    title: "마감 3일 남은 공모전 지원해도 될까요?",
    href: "/deadline",
    commentCount: 9,
    kind: "커뮤니티",
  },
  {
    id: "proposal-priority",
    title: "기획서 작성할 때 가장 중요한 항목은?",
    href: "/guides/proposal-writing",
    commentCount: 12,
    kind: "수상 후기",
  },
] as const;
