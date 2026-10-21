-- 수익화 교육 수강 계약 동의 기록 (2026-10-21)
-- 결제 전에 수강생이 계약서·환불 조건에 동의한 기록을 남긴다. 시온님이 Supabase SQL Editor 에서 한 번 실행.
create table if not exists public.edu_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  real_name text,
  course text not null,
  price integer not null,
  terms_ver text not null,
  agreed_at timestamptz not null default now(),
  ua text
);
alter table public.edu_consents enable row level security;
-- 로그인한 본인 기록만 넣고 볼 수 있음 (고치거나 지울 수 없음)
drop policy if exists "edu_consents insert own" on public.edu_consents;
create policy "edu_consents insert own" on public.edu_consents for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "edu_consents select own" on public.edu_consents;
create policy "edu_consents select own" on public.edu_consents for select to authenticated using (auth.uid() = user_id);

-- 이미 테이블을 만든 경우 실명 칸만 추가
alter table public.edu_consents add column if not exists real_name text;
