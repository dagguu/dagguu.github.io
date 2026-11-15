-- 다꾸키즈 체험단 신청 저장 (2026-11-15 시온님 "카톡으로 보내기 말고 신청완료, 내가 사이트에서 확인").
-- 쇼핑몰 체험단 상세(/product/coffee.html?t=exp&id=)에서 exp_apply 로 넣고, 다꾸파트너스 #/padmin 에서 관리자(press_admins)만 봄.
-- press_jobs.sql(is_press_admin) 다음에 SQL Editor 에서 한 번 실행.
create table if not exists public.exp_apps (
  id bigserial primary key,
  exp_id text not null,
  exp_title text,
  ig text not null,
  phone text not null,
  age text,
  member text,
  name text, zip text, addr1 text, addr2 text, tel text, email text, memo text, insta text,
  status text not null default 'applied',  -- applied / selected / rejected / posted
  note text,
  created_at timestamptz not null default now(),
  unique (exp_id, phone)
);
alter table public.exp_apps add column if not exists name text, add column if not exists zip text, add column if not exists addr1 text, add column if not exists addr2 text, add column if not exists tel text, add column if not exists email text, add column if not exists memo text, add column if not exists insta text;
alter table public.exp_apps enable row level security;  -- 정책 없음: 함수로만 읽고 씀

drop function if exists public.exp_apply(text,text,text,text,text,text);
-- 바잇미처럼 신청할 때 배송정보까지 받음(2026-11-15 시온님) + 인스타그램 주소
create or replace function public.exp_apply(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare ph text := regexp_replace(coalesce(p->>'phone',''), '[^0-9]', '', 'g'); n int; ex text := p->>'exp';
begin
  if ex !~ '^[a-z0-9-]{2,40}$' then return 'bad'; end if;
  if length(ph) < 10 or length(ph) > 11 then return 'bad'; end if;
  if length(coalesce(trim(p->>'name'),'')) < 1 or length(coalesce(trim(p->>'addr1'),'')) < 4 or length(coalesce(trim(p->>'insta'),'')) < 3 then return 'bad'; end if;
  select count(*) into n from public.exp_apps where created_at > now() - interval '1 hour';
  if n > 300 then return 'busy'; end if;
  insert into public.exp_apps(exp_id, exp_title, ig, phone, member, name, zip, addr1, addr2, tel, email, memo, insta)
    values (ex, left(p->>'title', 80), left(trim(p->>'insta'), 120), ph, left(p->>'member', 60), left(trim(p->>'name'), 30), left(p->>'zip', 10),
            left(trim(p->>'addr1'), 150), left(trim(p->>'addr2'), 100), left(p->>'tel', 20), left(trim(p->>'email'), 100), left(p->>'memo', 200), left(trim(p->>'insta'), 200))
    on conflict (exp_id, phone) do nothing;
  if not found then return 'dup'; end if;
  return 'ok';
end $$;
grant execute on function public.exp_apply(jsonb) to anon, authenticated;

create or replace function public.exp_admin_list() returns setof public.exp_apps
language sql stable security definer set search_path = public as $$
  select * from public.exp_apps where public.is_press_admin() order by created_at desc limit 2000 $$;
grant execute on function public.exp_admin_list() to authenticated;

create or replace function public.exp_admin_set(p_id bigint, p_status text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_press_admin() then raise exception 'admin only'; end if;
  if p_status not in ('applied','selected','rejected','posted') then raise exception 'bad status'; end if;
  update public.exp_apps set status = p_status, note = coalesce(p_note, note) where id = p_id;
end $$;
grant execute on function public.exp_admin_set(bigint,text,text) to authenticated;

-- 개인정보: 체험단 진행이 끝나고 6개월 지나면 지움(관리자 화면을 열 때 실행)
create or replace function public.exp_purge() returns void language sql security definer set search_path = public as $$
  delete from public.exp_apps where public.is_press_admin() and created_at < now() - interval '8 months' $$;
grant execute on function public.exp_purge() to authenticated;
select true;
