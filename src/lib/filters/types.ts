import {
  ContestFilter,
  ContestStatus,
  ContestType,
  ContestCategory,
  ContestField,
  TargetGroup,
  OnlineOffline,
  CONTEST_TYPES,
  CONTEST_CATEGORIES,
  CONTEST_FIELDS,
  TARGET_GROUPS,
  ONLINE_OFFLINE_OPTIONS,
  SortBy,
  DEFAULT_FILTER,
} from "@/types/contest";

// ----------------------------------------------------------
// 필터 옵션 표시 설정
// ----------------------------------------------------------

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  emoji?: string;
}

export const STATUS_OPTIONS: Array<FilterOption<ContestStatus | "전체">> = [
  { value: "전체", label: "전체" },
  { value: "ongoing", label: "모집 중", emoji: "🟢" },
  { value: "upcoming", label: "모집 예정", emoji: "🔵" },
  { value: "closed", label: "마감", emoji: "⚫" },
];

export const TYPE_OPTIONS: Array<FilterOption<ContestType | "전체">> = [
  { value: "전체", label: "전체" },
  ...CONTEST_TYPES.map((t) => ({ value: t, label: t })),
];

export const CATEGORY_OPTIONS: Array<FilterOption<ContestCategory | "전체">> = [
  { value: "전체", label: "전체" },
  ...CONTEST_CATEGORIES.map((c) => ({ value: c, label: c })),
];

export const FIELD_OPTIONS: Array<FilterOption<ContestField | "전체">> = [
  { value: "전체", label: "전체" },
  ...CONTEST_FIELDS.map((f) => ({ value: f, label: f })),
];

export const TARGET_OPTIONS: Array<FilterOption<TargetGroup | "전체">> = [
  { value: "전체", label: "전체" },
  ...TARGET_GROUPS.map((t) => ({ value: t, label: t })),
];

export const ONLINE_OFFLINE_FILTER_OPTIONS: Array<
  FilterOption<OnlineOffline | "전체">
> = [
  { value: "전체", label: "전체" },
  ...ONLINE_OFFLINE_OPTIONS.map((o) => ({ value: o, label: o })),
];

export const SORT_OPTIONS: Array<FilterOption<SortBy>> = [
  { value: "latest", label: "최신순" },
  { value: "deadline", label: "마감임박순" },
  { value: "title", label: "제목순" },
];

// ----------------------------------------------------------
// 활성 필터 수 계산
// ----------------------------------------------------------

/** 현재 적용된 필터 개수 (search 포함) */
export function countActiveFilters(filter: ContestFilter): number {
  let count = 0;
  if (filter.search.trim()) count++;
  if (filter.type !== "전체") count++;
  if (filter.category !== "전체") count++;
  if (filter.field !== "전체") count++;
  if (filter.target !== "전체") count++;
  if (filter.status !== "전체") count++;
  if (filter.online_offline !== "전체") count++;
  return count;
}

/** 기본값 대비 변경된 필터가 하나라도 있는지 */
export function hasActiveFilters(filter: ContestFilter): boolean {
  return (
    filter.search.trim() !== "" ||
    filter.type !== DEFAULT_FILTER.type ||
    filter.category !== DEFAULT_FILTER.category ||
    filter.field !== DEFAULT_FILTER.field ||
    filter.target !== DEFAULT_FILTER.target ||
    filter.status !== DEFAULT_FILTER.status ||
    filter.online_offline !== DEFAULT_FILTER.online_offline
  );
}
