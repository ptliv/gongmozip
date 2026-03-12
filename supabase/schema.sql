-- ============================================================
-- ContestHub — Supabase 초기 스키마
-- Supabase Dashboard > SQL Editor 에서 전체 실행
-- 또는 Supabase CLI: supabase db push
-- ============================================================


-- ----------------------------------------------------------
-- 1. 확장
-- ----------------------------------------------------------

-- uuid_generate_v4() 대신 gen_random_uuid() 사용 (내장)
-- pgcrypto는 불필요하므로 생략


-- ----------------------------------------------------------
-- 2. contests 테이블
-- ----------------------------------------------------------

create table if not exists contests (
  -- 식별자
  id                    uuid          primary key default gen_random_uuid(),
  slug                  text          unique not null,

  -- 기본 정보
  title                 text          not null,
  organizer             text          not null,
  summary               text          not null,
  description           text          not null default '',
  poster_image_url      text,

  -- 분류
  type                  text          not null,
  category              text          not null,
  field                 text          not null,

  -- 모집 조건
  target                text[]        not null default '{}',
  region                text          not null default '무관',
  online_offline        text          not null,
  team_allowed          boolean       not null default false,

  -- 일정 (date 타입 — YYYY-MM-DD)
  apply_start_at        date          not null,
  apply_end_at          date          not null,

  -- 상태
  status                text          not null default 'upcoming',

  -- 혜택 (JSONB: { prize?: string, types: string[] })
  benefit               jsonb         not null default '{"types": []}',

  -- 출처 URL
  official_source_url   text          not null default '',
  aggregator_source_url text,

  -- 메타
  verified_level        smallint      not null default 0,
  review_score          smallint,                              -- 자동 품질 점수 0~100 (크롤러 산출, 수동 등록은 null)
  view_count            integer       not null default 0,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now()
);

comment on table contests is '공모전·대외활동 공고 테이블';
comment on column contests.benefit is 'JSONB: { prize?: string, types: BenefitType[] }';
comment on column contests.verified_level is '0=미검증/검수대기 1=자동공개(80점↑) or URL확인 2=운영자검토완료 3=공식제휴';
comment on column contests.review_score is '자동 품질 점수 0~100. 크롤러 upsert 시 계산. 수동 등록 공고는 null.';


-- ----------------------------------------------------------
-- 3. 제약 조건 (enum-like check)
-- ----------------------------------------------------------

alter table contests
  add constraint contests_type_check check (
    type in ('공모전','대외활동','인턴십','봉사','교육','창업','해외','기타')
  ),
  add constraint contests_status_check check (
    status in ('upcoming','ongoing','closed','canceled')
  ),
  add constraint contests_online_offline_check check (
    online_offline in ('온라인','오프라인','온·오프라인')
  ),
  add constraint contests_verified_level_check check (
    verified_level between 0 and 3
  ),
  add constraint contests_dates_check check (
    apply_end_at >= apply_start_at
  );


-- ----------------------------------------------------------
-- 4. 인덱스
-- ----------------------------------------------------------

-- 목록 필터링에 자주 쓰이는 컬럼
create index if not exists idx_contests_status        on contests (status);
create index if not exists idx_contests_type          on contests (type);
create index if not exists idx_contests_field         on contests (field);
create index if not exists idx_contests_category      on contests (category);
create index if not exists idx_contests_apply_end_at  on contests (apply_end_at);
create index if not exists idx_contests_created_at    on contests (created_at desc);
create index if not exists idx_contests_verified_level on contests (verified_level);

-- target 배열 검색 (contains 쿼리)
create index if not exists idx_contests_target on contests using gin (target);

-- 전문 검색 (제목 + 주최기관 + 요약)
create index if not exists idx_contests_fts on contests
  using gin (
    to_tsvector('simple',
      coalesce(title, '') || ' ' ||
      coalesce(organizer, '') || ' ' ||
      coalesce(summary, '')
    )
  );


-- ----------------------------------------------------------
-- 5. updated_at 자동 갱신 트리거
-- ----------------------------------------------------------

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contests_updated_at on contests;
create trigger contests_updated_at
  before update on contests
  for each row execute function update_updated_at_column();


-- ----------------------------------------------------------
-- 6. 조회수 증가 함수 (race condition 방지)
-- ----------------------------------------------------------

create or replace function increment_view_count(contest_id uuid)
returns void language sql security definer as $$
  update contests
  set view_count = view_count + 1
  where id = contest_id;
$$;


-- ----------------------------------------------------------
-- 7. RLS (Row Level Security)
-- ----------------------------------------------------------

alter table contests enable row level security;

-- 누구나 읽기 가능 (검증 레벨 무관)
create policy "Public: select all contests"
  on contests for select
  using (true);

-- insert / update / delete 는 service_role key만 가능
-- (service_role은 RLS를 bypass하므로 별도 정책 불필요)
-- 일반 사용자(anon, authenticated)의 쓰기는 막힘

-- 만약 추후 관리자 로그인을 도입할 경우:
-- create policy "Admin: full access"
--   on contests for all
--   using (auth.role() = 'service_role');


-- ----------------------------------------------------------
-- 8. 샘플 뷰 (선택 사항)
-- ----------------------------------------------------------

-- 현재 모집 중인 공고만 빠르게 조회
create or replace view contests_ongoing as
  select * from contests
  where status = 'ongoing'
  order by apply_end_at asc;

-- 검수 대기 공고 (관리자 대시보드용)
create or replace view contests_pending_review as
  select id, slug, title, organizer, verified_level, apply_end_at, created_at
  from contests
  where verified_level = 0
  order by created_at desc;
