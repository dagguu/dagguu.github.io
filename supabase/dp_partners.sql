-- 다꾸파트너스 (2026-11-11 시온님): 다꾸키즈 상품 수익 링크 → 판매액 3%(2026-11-11 시온님, 처음 10%) 다꾸키즈 적립금
-- 시온님이 Supabase SQL Editor 에서 한 번 실행. press_jobs.sql(is_press_admin) 을 먼저 실행해 둔 상태여야 함.
-- 흐름: 파트너 가입(dp_join) → 링크 dagguukids.com/...?pt=코드 → 쇼핑몰 스크립트가 클릭(dp_click)·주문완료(dp_order) 기록
--      → 관리자가 카페24 에서 배송완료·반품 없음·본인 구매 아님 확인 → 승인(적립 확정) → 카페24 적립금 지급 → 지급 완료.
-- 모집 수당(파트너가 파트너 데려오기)은 없음.

create table if not exists public.dp_partners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text unique not null check (code ~ '^[a-z0-9_]{3,20}$'),
  shop_id text not null check (length(shop_id) between 2 and 40),
  status text not null default 'active' check (status in ('active','stopped')),
  created_at timestamptz not null default now()
);
create table if not exists public.dp_clicks (
  id bigint generated always as identity primary key,
  code text not null,
  pno integer,
  created_at timestamptz not null default now()
);
create index if not exists dp_clicks_code on public.dp_clicks(code, created_at);
create table if not exists public.dp_orders (
  order_id text primary key,
  code text not null,
  amount integer not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  reward integer,
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists dp_orders_code on public.dp_orders(code, created_at);

alter table public.dp_partners enable row level security;
alter table public.dp_clicks enable row level security;
alter table public.dp_orders enable row level security;

drop policy if exists "dp_partners own" on public.dp_partners;
create policy "dp_partners own" on public.dp_partners for select to authenticated using (user_id = auth.uid() or public.is_press_admin());
drop policy if exists "dp_partners admin" on public.dp_partners;
create policy "dp_partners admin" on public.dp_partners for update to authenticated using (public.is_press_admin()) with check (public.is_press_admin());
drop policy if exists "dp_orders own" on public.dp_orders;
create policy "dp_orders own" on public.dp_orders for select to authenticated
  using (public.is_press_admin() or code = (select p.code from public.dp_partners p where p.user_id = auth.uid()));
drop policy if exists "dp_clicks admin" on public.dp_clicks;
create policy "dp_clicks admin" on public.dp_clicks for select to authenticated using (public.is_press_admin());
grant select on public.dp_partners, public.dp_orders, public.dp_clicks to authenticated;
grant update on public.dp_partners to authenticated;

-- 가입·정보 바꾸기(코드는 처음 정한 뒤 바꾸지 않음 — 이미 퍼진 링크가 깨지지 않게)
create or replace function public.dp_join(p_code text, p_shop text) returns text
language plpgsql security definer set search_path = public as $$
declare c text := lower(trim(coalesce(p_code,''))); s text := trim(coalesce(p_shop,'')); old public.dp_partners;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  if length(s) < 2 or length(s) > 40 then raise exception 'shop'; end if;
  select * into old from public.dp_partners where user_id = auth.uid();
  if old.user_id is not null then
    update public.dp_partners set shop_id = s where user_id = auth.uid();
    return old.code;
  end if;
  if c !~ '^[a-z0-9_]{3,20}$' then raise exception 'code'; end if;
  if exists(select 1 from public.dp_partners where code = c) then raise exception 'taken'; end if;
  insert into public.dp_partners(user_id, code, shop_id) values (auth.uid(), c, s);
  return c;
end $$;
grant execute on function public.dp_join(text, text) to authenticated;

-- 링크 클릭(쇼핑몰 스크립트, 로그인 없이). 같은 코드·상품은 30초에 한 번만 셈.
create or replace function public.dp_click(p_code text, p_pno integer) returns void
language plpgsql security definer set search_path = public as $$
declare c text := lower(coalesce(p_code,''));
begin
  if not exists(select 1 from public.dp_partners where code = c and status = 'active') then return; end if;
  if exists(select 1 from public.dp_clicks where code = c and coalesce(pno,0) = coalesce(p_pno,0) and created_at > now() - interval '30 seconds') then return; end if;
  insert into public.dp_clicks(code, pno) values (c, p_pno);
end $$;
grant execute on function public.dp_click(text, integer) to anon, authenticated;

-- 주문 완료(쇼핑몰 주문완료 화면 스크립트, 로그인 없이). 같은 주문번호는 한 번만. 관리자가 카페24 주문과 맞춰 본 뒤에만 승인.
create or replace function public.dp_order(p_order text, p_code text, p_amount integer) returns void
language plpgsql security definer set search_path = public as $$
declare c text := lower(coalesce(p_code,'')); o text := left(trim(coalesce(p_order,'')), 40);
begin
  if o !~ '^[0-9A-Za-z-]{6,40}$' then return; end if;
  if not exists(select 1 from public.dp_partners where code = c and status = 'active') then return; end if;
  insert into public.dp_orders(order_id, code, amount) values (o, c, greatest(0, least(coalesce(p_amount,0), 10000000)))
  on conflict (order_id) do nothing;
end $$;
grant execute on function public.dp_order(text, text, integer) to anon, authenticated;

-- 내 실적(파트너)
create or replace function public.dp_stats() returns json
language sql stable security definer set search_path = public as $$
  with me as (select code from public.dp_partners where user_id = auth.uid())
  select json_build_object(
    'clicks30', (select count(*) from public.dp_clicks k, me where k.code = me.code and k.created_at > now() - interval '30 days'),
    'clicksAll', (select count(*) from public.dp_clicks k, me where k.code = me.code),
    'pending', (select count(*) from public.dp_orders o, me where o.code = me.code and o.status = 'pending'),
    'approved', (select coalesce(sum(reward),0) from public.dp_orders o, me where o.code = me.code and o.status = 'approved'),
    'paid', (select coalesce(sum(reward),0) from public.dp_orders o, me where o.code = me.code and o.status = 'paid'),
    'orders', (select count(*) from public.dp_orders o, me where o.code = me.code and o.status <> 'rejected')
  )
$$;
grant execute on function public.dp_stats() to authenticated;

-- 관리자: 승인(적립금 = 상품 금액 3%, 10원 단위 버림) / 반려 / 적립금 지급 완료
create or replace function public.dp_admin_set(p_order text, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.dp_orders;
begin
  if not public.is_press_admin() then raise exception 'admin'; end if;
  if p_status not in ('pending','approved','rejected','paid') then raise exception 'status'; end if;
  select * into r from public.dp_orders where order_id = p_order;
  if r.order_id is null then raise exception 'none'; end if;
  update public.dp_orders set status = p_status,
    reward = case when p_status in ('approved','paid') then coalesce(reward, (floor(amount * 0.03 / 10) * 10)::int) else null end,
    note = nullif(trim(coalesce(p_note,'')),''), decided_at = now()
  where order_id = p_order;
end $$;
grant execute on function public.dp_admin_set(text, text, text) to authenticated;
