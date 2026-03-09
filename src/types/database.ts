/**
 * Supabase codegen 스타일 Database 타입
 *
 * 실제 Supabase CLI 연결 후에는 이 파일을 아래 명령으로 자동 생성 가능:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 *
 * 그 전까지는 이 파일을 수동으로 Contest 타입과 동기화하여 관리합니다.
 */

import type {
  ContestType,
  ContestCategory,
  ContestField,
  TargetGroup,
  Region,
  OnlineOffline,
  ContestStatus,
  BenefitType,
  VerifiedLevel,
} from "./contest";

// ----------------------------------------------------------
// contests 테이블 Row / Insert / Update
// ----------------------------------------------------------

/** DB에서 select()로 읽어온 그대로의 타입 */
export interface ContestRow {
  id: string;                        // uuid
  slug: string;                      // unique text
  title: string;
  organizer: string;
  summary: string;
  description: string;
  poster_image_url: string | null;   // text (nullable)
  type: ContestType;                 // text (check constraint)
  category: ContestCategory;
  field: ContestField;
  target: TargetGroup[];             // text[] (Postgres array)
  region: Region;
  online_offline: OnlineOffline;
  team_allowed: boolean;
  apply_start_at: string;            // date → ISO string "YYYY-MM-DD"
  apply_end_at: string;
  status: ContestStatus;
  benefit: { prize?: string; types: BenefitType[] }; // jsonb
  official_source_url: string;
  aggregator_source_url: string | null;
  source_site?: string | null;
  source_url?: string | null;
  official_url?: string | null;
  external_id?: string | null;
  raw_payload?: Record<string, unknown> | null;
  crawled_at?: string | null;
  is_verified?: boolean;
  verified_level: VerifiedLevel;     // smallint 0-3
  view_count: number;                // integer
  created_at: string;                // timestamptz → ISO string
  updated_at: string;
}

/**
 * insert()에 넘길 타입 — 서버 자동생성 필드 제외
 * (id, created_at, updated_at, view_count 는 DB default)
 */
export type ContestInsert = Omit<
  ContestRow,
  "id" | "created_at" | "updated_at" | "view_count"
>;

/** update()에 넘길 타입 — 모든 필드 optional (id는 where 절로 사용) */
export type ContestUpdate = Partial<ContestInsert>;

// ----------------------------------------------------------
// Supabase Database 타입 (createClient<Database>에 주입)
// ----------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      contests: {
        Row: ContestRow;
        Insert: ContestInsert;
        Update: ContestUpdate;
        /**
         * supabase-js GenericTable 제약 충족용 (외래키 관계 정의)
         * 현재 테이블 간 FK가 없으므로 빈 배열
         */
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      /** supabase/schema.sql 에 정의된 조회수 증가 함수 */
      increment_view_count: {
        Args: { contest_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
