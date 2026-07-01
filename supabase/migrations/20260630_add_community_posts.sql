create table if not exists community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  kind text not null default 'general',
  status text not null default 'pending',
  title text not null,
  body text not null,
  contest_title text,
  contest_url text,
  roles text[] not null default '{}',
  deadline_at date,
  contact_method text,
  contact_value text,
  comment_count integer not null default 0,
  view_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_kind_check check (
    kind in ('general','question','team','review')
  ),
  constraint community_posts_status_check check (
    status in ('pending','published','hidden','deleted')
  ),
  constraint community_posts_title_length check (char_length(trim(title)) between 5 and 120),
  constraint community_posts_body_length check (char_length(trim(body)) between 20 and 4000),
  constraint community_posts_team_fields check (
    kind <> 'team'
    or (
      contest_title is not null
      and char_length(trim(contest_title)) >= 2
      and array_length(roles, 1) is not null
      and contact_method is not null
      and contact_value is not null
    )
  )
);

create index if not exists idx_community_posts_status_created
  on community_posts (status, created_at desc);

create index if not exists idx_community_posts_kind_status_created
  on community_posts (kind, status, created_at desc);

create index if not exists idx_community_posts_author_created
  on community_posts (author_id, created_at desc);

drop trigger if exists community_posts_updated_at on community_posts;
create trigger community_posts_updated_at
  before update on community_posts
  for each row execute function update_updated_at_column();

alter table community_posts enable row level security;

drop policy if exists "Public: read published community posts" on community_posts;
create policy "Public: read published community posts"
  on community_posts for select
  using (status = 'published');

drop policy if exists "Authenticated: read own community posts" on community_posts;
create policy "Authenticated: read own community posts"
  on community_posts for select
  using (auth.uid() = author_id);

drop policy if exists "Authenticated: create pending community posts" on community_posts;
create policy "Authenticated: create pending community posts"
  on community_posts for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = author_id
    and status = 'pending'
  );
