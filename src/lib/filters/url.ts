import {
  ContestFilter,
  ContestType,
  ContestCategory,
  ContestField,
  TargetGroup,
  ContestStatus,
  OnlineOffline,
  SortBy,
  DEFAULT_FILTER,
  CONTEST_TYPES,
  CONTEST_CATEGORIES,
  CONTEST_FIELDS,
  TARGET_GROUPS,
  CONTEST_STATUSES,
  ONLINE_OFFLINE_OPTIONS,
} from "@/types/contest";

// ----------------------------------------------------------
// URL 파라미터 키 (단축 키 사용으로 URL 간결하게 유지)
// ----------------------------------------------------------
const PARAM_KEYS = {
  search: "q",
  type: "type",
  category: "cat",
  field: "field",
  target: "target",
  status: "status",
  online_offline: "mode",
  sort_by: "sort",
} as const satisfies Record<keyof ContestFilter, string>;

// ----------------------------------------------------------
// URLSearchParams → ContestFilter
// ----------------------------------------------------------

/** URL 쿼리스트링을 ContestFilter 상태로 파싱 */
export function filterFromSearchParams(
  params: URLSearchParams | ReadonlyURLSearchParams
): ContestFilter {
  const raw = (key: string) => params.get(key) ?? "";

  return {
    search: raw(PARAM_KEYS.search),
    type: parseEnum(raw(PARAM_KEYS.type), CONTEST_TYPES, "전체"),
    category: parseEnum(raw(PARAM_KEYS.category), CONTEST_CATEGORIES, "전체"),
    field: parseEnum(raw(PARAM_KEYS.field), CONTEST_FIELDS, "전체"),
    target: parseEnum(raw(PARAM_KEYS.target), TARGET_GROUPS, "전체"),
    status: parseEnum(raw(PARAM_KEYS.status), CONTEST_STATUSES, "전체"),
    online_offline: parseEnum(raw(PARAM_KEYS.online_offline), ONLINE_OFFLINE_OPTIONS, "전체"),
    sort_by: parseSortBy(raw(PARAM_KEYS.sort_by)),
  };
}

// ----------------------------------------------------------
// ContestFilter → URLSearchParams
// ----------------------------------------------------------

/** ContestFilter 상태를 URL 쿼리스트링으로 직렬화 (기본값은 생략) */
export function filterToSearchParams(filter: ContestFilter): URLSearchParams {
  const params = new URLSearchParams();

  if (filter.search.trim()) {
    params.set(PARAM_KEYS.search, filter.search.trim());
  }
  if (filter.type !== DEFAULT_FILTER.type) {
    params.set(PARAM_KEYS.type, filter.type);
  }
  if (filter.category !== DEFAULT_FILTER.category) {
    params.set(PARAM_KEYS.category, filter.category);
  }
  if (filter.field !== DEFAULT_FILTER.field) {
    params.set(PARAM_KEYS.field, filter.field);
  }
  if (filter.target !== DEFAULT_FILTER.target) {
    params.set(PARAM_KEYS.target, filter.target);
  }
  if (filter.status !== DEFAULT_FILTER.status) {
    params.set(PARAM_KEYS.status, filter.status);
  }
  if (filter.online_offline !== DEFAULT_FILTER.online_offline) {
    params.set(PARAM_KEYS.online_offline, filter.online_offline);
  }
  if (filter.sort_by !== DEFAULT_FILTER.sort_by) {
    params.set(PARAM_KEYS.sort_by, filter.sort_by);
  }

  return params;
}

/** ContestFilter → 쿼리스트링 문자열 (예: "type=공모전&field=IT·테크") */
export function filterToQueryString(filter: ContestFilter): string {
  const qs = filterToSearchParams(filter).toString();
  return qs ? `?${qs}` : "";
}

// ----------------------------------------------------------
// 헬퍼
// ----------------------------------------------------------

type ReadonlyURLSearchParams = { get(key: string): string | null };

function parseEnum<T extends string>(
  value: string,
  validValues: readonly T[],
  fallback: T | "전체"
): T | "전체" {
  if (!value) return fallback;
  return (validValues as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function parseSortBy(value: string): SortBy {
  const valid: SortBy[] = ["latest", "deadline", "title"];
  return valid.includes(value as SortBy) ? (value as SortBy) : "latest";
}
