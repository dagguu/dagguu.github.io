-- 다이어리뷰 원고료 출금 신청 v2 (2026-10-21, 스타일씨 캐시 출금 방식 참고)
-- 1만원 단위 · 1회 최대 50만원 · 7일에 1번 · 출금 자료(이름·주민등록번호·은행·계좌)는 브라우저에서 시온님 공개 키로 암호화한 글자만 저장
--   (서버·저장소에는 원문이 없고, 시온님이 가진 개인 키로만 관리자 화면에서 열 수 있음)
-- 시온님이 Supabase SQL Editor 에 통째로 붙여 넣고 Run. press_jobs.sql 을 먼저 실행한 뒤에 실행하세요.

alter table public.press_withdrawals add column if not exists enc text;      -- 암호화된 출금 자료
alter table public.press_withdrawals add column if not exists phone text;    -- 입금 안내 연락처
alter table public.press_withdrawals add column if not exists purge_after date; -- 이 날 이후 enc 를 지움(지급일 + 5년, 소득세법)

drop function if exists public.press_withdraw(integer);
create or replace function public.press_withdraw(p_amount integer, p_enc text default null, p_phone text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare bal integer; nid bigint; last timestamptz;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  if p_amount < 10000 then raise exception 'min'; end if;
  if p_amount % 10000 <> 0 then raise exception 'unit'; end if;
  if p_amount > 500000 then raise exception 'max'; end if;
  if p_enc is null or length(p_enc) < 100 then raise exception 'info'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select max(created_at) into last from public.press_withdrawals where user_id = auth.uid() and status <> 'rejected';
  if last is not null and last > now() - interval '7 days' then raise exception 'week'; end if;
  select coalesce(sum(amount),0) into bal from public.press_ledger where user_id = auth.uid();
  if p_amount > bal then raise exception 'balance'; end if;
  insert into public.press_withdrawals(user_id, amount, enc, phone) values (auth.uid(), p_amount, left(p_enc, 4000), left(coalesce(p_phone,''), 20)) returning id into nid;
  insert into public.press_ledger(user_id, amount, kind, wd_id, memo) values (auth.uid(), -p_amount, 'withdraw', nid, '출금 신청');
  return nid;
end $$;

-- 입금 완료 때 5년 보관 기한을 적어 둠(반려면 출금 자료를 바로 지움)
create or replace function public.press_admin_wd(p_wd bigint, p_paid boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare w public.press_withdrawals;
begin
  if not public.is_press_admin() then raise exception 'admin'; end if;
  select * into w from public.press_withdrawals where id = p_wd;
  if w.id is null or w.status <> 'requested' then raise exception 'state'; end if;
  update public.press_withdrawals set status = case when p_paid then 'paid' else 'rejected' end, note = nullif(p_note,''), done_at = now(),
    purge_after = case when p_paid then (now() + interval '5 years')::date else null end,
    enc = case when p_paid then enc else null end
   where id = p_wd;
  if not p_paid then
    insert into public.press_ledger(user_id, amount, kind, wd_id, memo) values (w.user_id, w.amount, 'refund', w.id, '출금 반려');
  end if;
end $$;

-- 보관 기한 지난 출금 자료 지우기(관리자 화면을 열 때 자동으로 부름)
create or replace function public.press_purge() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_press_admin() then raise exception 'admin'; end if;
  update public.press_withdrawals set enc = null where enc is not null and purge_after is not null and purge_after < current_date;
  get diagnostics n = row_count; return n;
end $$;

revoke all on function public.press_withdraw(integer,text,text), public.press_admin_wd(bigint,boolean,text), public.press_purge() from public, anon;
grant execute on function public.press_withdraw(integer,text,text), public.press_admin_wd(bigint,boolean,text), public.press_purge() to authenticated;
