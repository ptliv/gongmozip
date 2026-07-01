export const COMMUNITY_POST_STATUSES = [
  "pending",
  "published",
  "hidden",
  "deleted",
] as const;

export type CommunityPostStatus = (typeof COMMUNITY_POST_STATUSES)[number];

export const COMMUNITY_POST_KINDS = [
  "general",
  "question",
  "team",
  "review",
] as const;

export type CommunityPostKind = (typeof COMMUNITY_POST_KINDS)[number];

export type CommunityPost = {
  readonly id: string;
  readonly author_id: string;
  readonly author_name: string;
  readonly kind: CommunityPostKind;
  readonly status: CommunityPostStatus;
  readonly title: string;
  readonly body: string;
  readonly contest_title: string | null;
  readonly contest_url: string | null;
  readonly roles: string[];
  readonly deadline_at: string | null;
  readonly contact_method: string | null;
  readonly contact_value: string | null;
  readonly comment_count: number;
  readonly view_count: number;
  readonly published_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

export type CommunityPostInsert = {
  readonly author_id: string;
  readonly author_name: string;
  readonly kind: CommunityPostKind;
  readonly status: CommunityPostStatus;
  readonly title: string;
  readonly body: string;
  readonly contest_title: string | null;
  readonly contest_url: string | null;
  readonly roles: string[];
  readonly deadline_at: string | null;
  readonly contact_method: string | null;
  readonly contact_value: string | null;
};

export type CommunityPostUpdate = {
  readonly status?: CommunityPostStatus;
  readonly published_at?: string | null;
  readonly title?: string;
  readonly body?: string;
  readonly contest_title?: string | null;
  readonly contest_url?: string | null;
  readonly roles?: string[];
  readonly deadline_at?: string | null;
  readonly contact_method?: string | null;
  readonly contact_value?: string | null;
};

export const COMMUNITY_KIND_LABELS: Record<CommunityPostKind, string> = {
  general: "커뮤니티",
  question: "준비 질문",
  team: "팀원 모집",
  review: "수상 후기",
};

export const COMMUNITY_STATUS_LABELS: Record<CommunityPostStatus, string> = {
  pending: "검수 대기",
  published: "공개",
  hidden: "숨김",
  deleted: "삭제됨",
};
