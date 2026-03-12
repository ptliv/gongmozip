-- ============================================================
-- 반자동 검수 시스템: review_score 컬럼 추가
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================================

-- 1. review_score 컬럼 추가 (0~100 정수, null 허용 — 수동 등록 공고는 null)
alter table contests
  add column if not exists review_score smallint
    check (review_score between 0 and 100);

comment on column contests.review_score is
  '자동 품질 점수 0~100. 크롤러가 upsert 시 계산. 수동 등록 공고는 null. '
  '80↑=자동공개(verified_level=1), 50~79=검수대기(0), 50↓=저품질(0)';

-- 2. 점수 조회용 인덱스
create index if not exists idx_contests_review_score
  on contests (review_score);

-- 3. 기존 verified_level=0 공고의 RLS select 정책 갱신
--    (기존 "Public: select all contests" 정책은 그대로 두고,
--     프론트엔드 쿼리에서 verified_level >= 1 필터를 적용합니다.)
--    → 별도 RLS 변경 없음. 애플리케이션 레이어에서 필터링합니다.
