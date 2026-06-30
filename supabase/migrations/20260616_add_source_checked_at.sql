alter table contests
  add column if not exists source_checked_at timestamptz;

comment on column contests.source_checked_at is
  '공식 공고 또는 원문 정보를 마지막으로 확인한 시각. 색인 허용 판단과 상세 페이지 최종 확인일 표시에 사용한다.';

create index if not exists idx_contests_source_checked_at
  on contests (source_checked_at desc);
