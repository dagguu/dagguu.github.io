-- 다꾸키즈 선물하기 (2026-11-20 시온님 "너가 만들어줄 수 없어?" → "진행해").
-- 흐름: 상품 상세 🎁 선물하기 → 주문(배송지는 주는 사람 주소 임시, 메모 "[선물] 받는 분 주소 대기") → 주문 완료 화면에서 gift_create 로 선물 링크
-- → 주는 사람이 카톡으로 링크 전송 → 받는 사람이 /product/coffee.html?t=gift&k=열쇠 에서 gift_fill 로 이름·연락처·주소 입력
-- → 다꾸파트너스 #/padmin "선물 주문"에서 시온님이 카페24 주문 배송지를 바꾸고 발송.
-- press_jobs.sql(is_press_admin) 다음에 SQL Editor 에서 한 번 실행.
create table if not exists public.gifts (
  id bigserial primary key,
  k text not null unique,                 -- 링크 열쇠(받는 사람만 앎)
  order_id text not null,
  pno int,                                -- 대표 상품번호(선물 카드 사진·이름용)
  pname text,
  sender text,                            -- 보낸 사람 이름(받는 사람에게 보임)
  msg text,                               -- 선물 메시지
  r_name text, r_tel text, r_zip text, r_addr1 text, r_addr2 text, r_memo text,
  status text not null default 'wait',    -- wait(주소 대기) / filled(주소 받음) / sent(발송) / canceled
  filled_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
alter table public.gifts enable row level security;  -- 정책 없음: 함수로만 읽고 씀

-- 주문 완료 화면에서 부름: 같은 주문이면 같은 열쇠를 돌려줌
create or replace function public.gift_create(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare o text := coalesce(p->>'order',''); kk text; n int;
begin
  if o !~ '^[0-9A-Za-z-]{8,40}$' then return 'bad'; end if;
  select k into kk from public.gifts where order_id = o;
  if kk is not null then return 'ok:' || kk; end if;
  select count(*) into n from public.gifts where created_at > now() - interval '1 hour';
  if n > 200 then return 'busy'; end if;
  kk := substr(md5(random()::text || clock_timestamp()::text || o), 1, 16);
  insert into public.gifts(k, order_id, pno, pname, sender, msg)
    values (kk, o, nullif(p->>'pno','')::int, left(p->>'pname', 120), left(trim(coalesce(p->>'sender','')), 20), left(trim(coalesce(p->>'msg','')), 200));
  return 'ok:' || kk;
end $$;
grant execute on function public.gift_create(jsonb) to anon, authenticated;

-- 받는 사람 화면: 주소·연락처는 돌려주지 않음
create or replace function public.gift_get(p_k text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('pno', pno, 'pname', pname, 'sender', sender, 'msg', msg, 'status', status, 'filled', filled_at is not null)
  from public.gifts where k = p_k and created_at > now() - interval '60 days' $$;
grant execute on function public.gift_get(text) to anon, authenticated;

-- 받는 사람이 주소 넣기(발송 전까지 고칠 수 있음)
create or replace function public.gift_fill(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare ph text := regexp_replace(coalesce(p->>'tel',''), '[^0-9]', '', 'g'); st text;
begin
  select status into st from public.gifts where k = p->>'k';
  if st is null then return 'none'; end if;
  if st in ('sent','canceled') then return 'closed'; end if;
  if length(ph) < 10 or length(ph) > 11 then return 'bad'; end if;
  if length(coalesce(trim(p->>'name'),'')) < 1 or length(coalesce(trim(p->>'addr1'),'')) < 4 then return 'bad'; end if;
  update public.gifts set r_name = left(trim(p->>'name'), 30), r_tel = ph, r_zip = left(p->>'zip', 10), r_addr1 = left(trim(p->>'addr1'), 150),
    r_addr2 = left(trim(coalesce(p->>'addr2','')), 100), r_memo = left(coalesce(p->>'memo',''), 200), status = 'filled', filled_at = now()
    where k = p->>'k';
  return 'ok';
end $$;
grant execute on function public.gift_fill(jsonb) to anon, authenticated;

create or replace function public.gift_admin_list() returns setof public.gifts
language sql stable security definer set search_path = public as $$
  select * from public.gifts where public.is_press_admin() order by created_at desc limit 500 $$;
grant execute on function public.gift_admin_list() to authenticated;

create or replace function public.gift_admin_set(p_id bigint, p_status text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_press_admin() then raise exception 'admin only'; end if;
  if p_status not in ('wait','filled','sent','canceled') then raise exception 'bad status'; end if;
  update public.gifts set status = p_status, note = coalesce(p_note, note) where id = p_id;
end $$;
grant execute on function public.gift_admin_set(bigint,text,text) to authenticated;

-- 개인정보: 선물 주문 3개월 지나면 받는 분 정보 지움(관리자 화면을 열 때 실행)
create or replace function public.gift_purge() returns void language sql security definer set search_path = public as $$
  update public.gifts set r_name = null, r_tel = null, r_zip = null, r_addr1 = null, r_addr2 = null, r_memo = null
  where public.is_press_admin() and created_at < now() - interval '3 months' and r_tel is not null $$;
grant execute on function public.gift_purge() to authenticated;
select true;
