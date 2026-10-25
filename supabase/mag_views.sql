-- 다꾸 매거진 글 조회수 (2026-10-25 시온님 "매거진 글 목록에서 몇명이 봤는지 조회수")
-- 시온님이 Supabase SQL Editor 에서 한 번 실행. 사이트(anon 키)는 아래 두 함수만 부를 수 있다.
-- k = "m:<슬러그>"(감성숙소 추천) · "g:<슬러그>"(체험단 가이드) · "p:<슬러그>"(추천 모음)
create table if not exists public.mag_views (
  k text primary key,
  n bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.mag_views enable row level security;
-- 정책을 만들지 않으므로 anon 은 표를 직접 읽거나 고칠 수 없다(함수로만).

-- 글을 열 때 1 올림 (같은 기기·같은 창에서는 페이지 JS 가 한 번만 부름)
create or replace function public.mag_view(p_k text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if p_k is null or p_k !~ '^[mgp]:[a-z0-9_-]{1,80}$' then return null; end if;
  insert into public.mag_views(k, n) values (p_k, 1)
  on conflict (k) do update set n = public.mag_views.n + 1, updated_at = now()
  returning n into v;
  return v;
end $$;

-- 목록 화면용: 모든 글의 조회수
create or replace function public.mag_counts()
returns table(k text, n bigint) language sql security definer stable set search_path = public as $$
  select k, n from public.mag_views;
$$;

revoke all on function public.mag_view(text) from public;
revoke all on function public.mag_counts() from public;
grant execute on function public.mag_view(text) to anon, authenticated;
grant execute on function public.mag_counts() to anon, authenticated;
