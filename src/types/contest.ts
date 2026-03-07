// ============================================================
// 공모전·대외활동 도메인 타입 정의
// Supabase 테이블 구조를 그대로 반영 (snake_case)
// ============================================================

// ----------------------------------------------------------
// 1. 상수 배열 (런타임에서도 사용 가능한 as const 패턴)
//    → Supabase enum과 1:1 매핑 예정
// ----------------------------------------------------------

export const CONTEST_TYPES = [
  "공모전",
  "대외활동",
  "인턴십",
  "봉사",
  "교육",
  "창업",
  "해외",
  "기타",
] as const;

export const CONTEST_CATEGORIES = [
  "아이디어·기획",
  "디자인·영상",
  "논문·에세이",
  "해커톤·개발",
  "서포터즈·기자단",
  "탐방·견학",
  "사회공헌",
  "장학금",
  "기타",
] as const;

export const CONTEST_FIELDS = [
  "IT·테크",
  "디자인",
  "마케팅·광고",
  "사회·환경",
  "예술·문화",
  "경영·경제",
  "과학·공학",
  "인문·사회",
  "법·행정",
  "기타",
] as const;

export const TARGET_GROUPS = [
  "고등학생",
  "대학생",
  "대학원생",
  "청년",
  "누구나",
] as const;

export const CONTEST_STATUSES = [
  "upcoming",   // 모집 예정
  "ongoing",    // 모집 중
  "closed",     // 마감
  "canceled",   // 취소됨
] as const;

export const REGIONS = [
  "무관",
  "전국",
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
  "세종",
  "강원",
  "충청",
  "전라",
  "경상",
  "제주",
  "해외",
] as const;

export const ONLINE_OFFLINE_OPTIONS = [
  "온라인",
  "오프라인",
  "온·오프라인",
] as const;

export const BENEFIT_TYPES = [
  "상금",
  "인증서",
  "취업·인턴 연계",
  "해외연수",
  "멘토링",
  "물품·기기",
  "활동비",
  "기타",
] as const;

// verified_level: 0=미검증 1=기본검증(URL유효) 2=공식검증(운영자확인) 3=공식제휴
export const VERIFIED_LEVELS = [0, 1, 2, 3] as const;

// ----------------------------------------------------------
// 2. Union Types (상수 배열에서 자동 추론)
// ----------------------------------------------------------

export type ContestType      = (typeof CONTEST_TYPES)[number];
export type ContestCategory  = (typeof CONTEST_CATEGORIES)[number];
export type ContestField     = (typeof CONTEST_FIELDS)[number];
export type TargetGroup      = (typeof TARGET_GROUPS)[number];
export type ContestStatus    = (typeof CONTEST_STATUSES)[number];
export type Region           = (typeof REGIONS)[number];
export type OnlineOffline    = (typeof ONLINE_OFFLINE_OPTIONS)[number];
export type BenefitType      = (typeof BENEFIT_TYPES)[number];
export type VerifiedLevel    = (typeof VERIFIED_LEVELS)[number];

// ----------------------------------------------------------
// 3. 중첩 타입
// ----------------------------------------------------------

/** 혜택 정보 — Supabase에서 JSONB 컬럼으로 저장 */
export interface ContestBenefit {
  prize?: string;       // 혜택 요약 텍스트 (예: "최대 500만원", "월 30만원 활동비")
  types: BenefitType[]; // 혜택 종류 목록
}

// ----------------------------------------------------------
// 4. 메인 엔티티 (Supabase row와 1:1 대응)
// ----------------------------------------------------------

export interface Contest {
  // 식별자
  id: string;
  slug: string;

  // 기본 정보
  title: string;
  organizer: string;
  summary: string;
  description: string;
  poster_image_url: string | null;

  // 분류
  type: ContestType;
  category: ContestCategory;
  field: ContestField;

  // 모집 조건
  target: TargetGroup[];
  region: Region;
  online_offline: OnlineOffline;
  team_allowed: boolean;

  // 일정
  apply_start_at: string; // YYYY-MM-DD
  apply_end_at: string;   // YYYY-MM-DD

  // 상태
  status: ContestStatus;

  // 혜택
  benefit: ContestBenefit;

  // 출처 URL
  official_source_url: string;
  aggregator_source_url: string | null;

  // 메타
  verified_level: VerifiedLevel;
  view_count: number;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

// ----------------------------------------------------------
// 5. 필터 상태
// ----------------------------------------------------------

export type FilterAll = "전체";
export type SortBy = "latest" | "deadline" | "title";

export interface ContestFilter {
  search: string;
  type: ContestType | FilterAll;
  category: ContestCategory | FilterAll;
  field: ContestField | FilterAll;
  target: TargetGroup | FilterAll;
  status: ContestStatus | FilterAll;
  online_offline: OnlineOffline | FilterAll;
  sort_by: SortBy;
}

export const DEFAULT_FILTER: ContestFilter = {
  search: "",
  type: "전체",
  category: "전체",
  field: "전체",
  target: "전체",
  status: "전체",
  online_offline: "전체",
  sort_by: "latest",
};

// ----------------------------------------------------------
// 6. 폼 값 타입 (ContestForm · 서버 액션에서 공유)
// ----------------------------------------------------------

/** 관리자 폼 제출값 — id/slug/view_count/created_at/updated_at 서버 관리 */
export type ContestFormValues = Omit<
  Contest,
  "id" | "slug" | "view_count" | "created_at" | "updated_at"
>;

// ----------------------------------------------------------
// 7. Supabase 연결 브리지 (추후 supabase.ts로 이동 예정)
// ----------------------------------------------------------

/**
 * Supabase에서 select() 결과로 반환되는 raw row 타입.
 * benefit은 JSONB로 저장되므로 애플리케이션에서 Contest와 동일하게 사용 가능.
 * 추후 supabase-js가 생성하는 Database["public"]["Tables"]["contests"]["Row"] 로 교체.
 */
export type ContestRow = Contest;
