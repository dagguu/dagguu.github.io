-- 다꾸 기자단 (2026-10-21)
-- 광고주에게 판 기자단을 다꾸 회원 블로거에게 모집하고, 원고료를 "출금만 되는 적립금"으로 쌓았다가 출금해 준다.
-- 적립금은 충전·물건 구매·양도가 안 되고 출금만 된다(선불전자지급수단이 아니라 미지급 원고료).
-- 시온님이 Supabase SQL Editor 에 통째로 붙여 넣고 Run. 여러 번 실행해도 괜찮아요.

-- 0) 관리자 (시온님 계정). 맨 아래 안내대로 한 줄 더 실행해야 관리자 화면이 열려요.
create table if not exists public.press_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.press_admins enable row level security;
create or replace function public.is_press_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.press_admins where user_id = auth.uid()) $$;
grant execute on function public.is_press_admin() to anon, authenticated;

-- 1) 기자단 모집 글 (누구나 보기, 관리자만 쓰기)
create table if not exists public.press_jobs (
  id bigint generated always as identity primary key,
  title text not null,               -- 예: 가평 ○○펜션 소개 글
  biz text,                          -- 업체 이름
  region text,                       -- 예: 경기 가평
  kw text,                           -- 키워드
  guide text,                        -- 공개 안내(무엇을 쓰는지·조건)
  pay integer not null check (pay >= 0),  -- 1편 원고료(원, 세전)
  slots integer not null default 1 check (slots > 0),
  ends date not null,                -- 신청 마감
  status text not null default 'open' check (status in ('open','closed','hidden')),
  created_at timestamptz not null default now()
);
alter table public.press_jobs enable row level security;
drop policy if exists "press_jobs read" on public.press_jobs;
create policy "press_jobs read" on public.press_jobs for select to anon, authenticated using (status <> 'hidden' or public.is_press_admin());
drop policy if exists "press_jobs admin" on public.press_jobs;
create policy "press_jobs admin" on public.press_jobs for all to authenticated using (public.is_press_admin()) with check (public.is_press_admin());
grant select on public.press_jobs to anon, authenticated;
grant insert, update, delete on public.press_jobs to authenticated;

-- 2) 원고 자료(사진·원고 링크) — 선정된 사람과 관리자만 보기
create table if not exists public.press_files (
  job_id bigint primary key references public.press_jobs(id) on delete cascade,
  url text not null,
  memo text
);
alter table public.press_files enable row level security;

-- 3) 신청
create table if not exists public.press_apps (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.press_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  blog_url text not null check (blog_url ~* '^https?://'),
  msg text,
  status text not null default 'applied' check (status in ('applied','selected','rejected','submitted','returned','approved')),
  post_url text,
  note text,                         -- 관리자 메모(반려 이유 등, 신청자에게 보임)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, user_id)
);
alter table public.press_apps enable row level security;
drop policy if exists "press_apps read" on public.press_apps;
create policy "press_apps read" on public.press_apps for select to authenticated using (auth.uid() = user_id or public.is_press_admin());
grant select on public.press_apps to authenticated;

drop policy if exists "press_files read" on public.press_files;
create policy "press_files read" on public.press_files for select to authenticated using (
  public.is_press_admin() or exists(select 1 from public.press_apps a where a.job_id = press_files.job_id and a.user_id = auth.uid() and a.status in ('selected','submitted','returned','approved')));
drop policy if exists "press_files admin" on public.press_files;
create policy "press_files admin" on public.press_files for all to authenticated using (public.is_press_admin()) with check (public.is_press_admin());
grant select, insert, update, delete on public.press_files to authenticated;

-- 4) 원고료 적립금 장부 (+ 적립, − 출금 신청, + 출금 반려 되돌림). 직접 넣을 수 없고 아래 함수로만.
create table if not exists public.press_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  kind text not null check (kind in ('earn','withdraw','refund')),
  app_id bigint references public.press_apps(id) on delete set null,
  wd_id bigint,
  memo text,
  created_at timestamptz not null default now()
);
create unique index if not exists press_ledger_earn_once on public.press_ledger(app_id) where kind = 'earn';
alter table public.press_ledger enable row level security;
drop policy if exists "press_ledger read" on public.press_ledger;
create policy "press_ledger read" on public.press_ledger for select to authenticated using (auth.uid() = user_id or public.is_press_admin());
grant select on public.press_ledger to authenticated;

-- 5) 출금 신청 (세전 금액. 지급 때 3.3% 원천징수 후 입금)
create table if not exists public.press_withdrawals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount >= 10000),
  status text not null default 'requested' check (status in ('requested','paid','rejected')),
  note text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
alter table public.press_withdrawals enable row level security;
drop policy if exists "press_wd read" on public.press_withdrawals;
create policy "press_wd read" on public.press_withdrawals for select to authenticated using (auth.uid() = user_id or public.is_press_admin());
grant select on public.press_withdrawals to authenticated;

-- ===== 함수 (회원) =====
-- 신청: 모집 중·마감 전·인원 남았을 때만
create or replace function public.press_apply(p_job bigint, p_blog text, p_msg text) returns bigint
language plpgsql security definer set search_path = public as $$
declare j public.press_jobs; nid bigint;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  select * into j from public.press_jobs where id = p_job;
  if j.id is null or j.status <> 'open' or j.ends < (now() at time zone 'Asia/Seoul')::date then raise exception 'closed'; end if;
  if p_blog !~* '^https?://' then raise exception 'blog'; end if;
  insert into public.press_apps(job_id, user_id, blog_url, msg) values (p_job, auth.uid(), left(p_blog,300), left(coalesce(p_msg,''),500)) returning id into nid;
  return nid;
end $$;

-- 글 주소 제출(선정됐거나 반려된 뒤 다시 낼 때)
create or replace function public.press_submit(p_app bigint, p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_url !~* '^https?://' then raise exception 'url'; end if;
  update public.press_apps set post_url = left(p_url,300), status = 'submitted', updated_at = now()
   where id = p_app and user_id = auth.uid() and status in ('selected','returned');
  if not found then raise exception 'state'; end if;
end $$;

-- 내 적립금 잔액
create or replace function public.press_balance() returns integer language sql stable security definer set search_path = public as
$$ select coalesce(sum(amount),0)::int from public.press_ledger where user_id = auth.uid() $$;

-- 출금 신청(1만원 이상, 잔액 안에서). 신청하면 장부에서 바로 빠지고, 반려되면 되돌려요.
create or replace function public.press_withdraw(p_amount integer) returns bigint
language plpgsql security definer set search_path = public as $$
declare bal integer; nid bigint;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  if p_amount < 10000 then raise exception 'min'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select coalesce(sum(amount),0) into bal from public.press_ledger where user_id = auth.uid();
  if p_amount > bal then raise exception 'balance'; end if;
  insert into public.press_withdrawals(user_id, amount) values (auth.uid(), p_amount) returning id into nid;
  insert into public.press_ledger(user_id, amount, kind, wd_id, memo) values (auth.uid(), -p_amount, 'withdraw', nid, '출금 신청');
  return nid;
end $$;

-- ===== 함수 (관리자) =====
-- 신청 상태 바꾸기. approved 로 바꾸면 원고료가 한 번만 적립돼요.
create or replace function public.press_admin_set(p_app bigint, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare a public.press_apps; j public.press_jobs;
begin
  if not public.is_press_admin() then raise exception 'admin'; end if;
  if p_status not in ('applied','selected','rejected','returned','approved') then raise exception 'status'; end if;
  select * into a from public.press_apps where id = p_app; if a.id is null then raise exception 'app'; end if;
  if a.status = 'approved' then raise exception 'done'; end if;
  update public.press_apps set status = p_status, note = nullif(p_note,''), updated_at = now() where id = p_app;
  if p_status = 'approved' then
    select * into j from public.press_jobs where id = a.job_id;
    insert into public.press_ledger(user_id, amount, kind, app_id, memo) values (a.user_id, j.pay, 'earn', a.id, j.title);
  end if;
end $$;

-- 출금 처리: 입금했으면 paid, 반려면 rejected(적립금 되돌림)
create or replace function public.press_admin_wd(p_wd bigint, p_paid boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare w public.press_withdrawals;
begin
  if not public.is_press_admin() then raise exception 'admin'; end if;
  select * into w from public.press_withdrawals where id = p_wd;
  if w.id is null or w.status <> 'requested' then raise exception 'state'; end if;
  update public.press_withdrawals set status = case when p_paid then 'paid' else 'rejected' end, note = nullif(p_note,''), done_at = now() where id = p_wd;
  if not p_paid then
    insert into public.press_ledger(user_id, amount, kind, wd_id, memo) values (w.user_id, w.amount, 'refund', w.id, '출금 반려');
  end if;
end $$;

-- 관리자 화면에서 신청자 닉네임 보기
create or replace function public.press_admin_names(p_ids uuid[]) returns table(id uuid, nickname text)
language sql stable security definer set search_path = public as
$$ select p.id, p.nickname from public.profiles p where public.is_press_admin() and p.id = any(p_ids) $$;

revoke all on function public.press_apply(bigint,text,text), public.press_submit(bigint,text), public.press_balance(), public.press_withdraw(integer),
  public.press_admin_set(bigint,text,text), public.press_admin_wd(bigint,boolean,text), public.press_admin_names(uuid[]) from public, anon;
grant execute on function public.press_apply(bigint,text,text), public.press_submit(bigint,text), public.press_balance(), public.press_withdraw(integer),
  public.press_admin_set(bigint,text,text), public.press_admin_wd(bigint,boolean,text), public.press_admin_names(uuid[]) to authenticated;

-- ===== 시온님 계정을 관리자로 (한 번만) =====
-- 사이트 마이페이지 맨 아래 "회원 번호"를 복사해서 아래 '여기에-회원번호' 자리에 넣고, 이 줄만 따로 실행하세요.
-- insert into public.press_admins(user_id) values ('여기에-회원번호') on conflict do nothing;
