-- 다꾸키즈 수익 링크 등급제(2026-11-14 시온님 "3~10% 로 등급제로"): 시온님이 Supabase SQL Editor 에서 한 번 실행.
-- dp_partners.sql · dp_members.sql 을 먼저 실행해 둔 상태여야 함.
-- 등급 = 그 파트너 링크로 팔린 누적 금액(승인·지급 완료 주문의 상품 금액 합, 취소·반품·제외 주문 빼고).
--   🌱 새싹 3% (가입) · 🌿 다꾸 5% (10만원↑) · 🌳 우수 7% (30만원↑) · 👑 VIP 10% (100만원↑)
-- 승인할 때 그 시점 등급 비율로 적립금을 계산해 dp_orders.rate 에 남김(등급이 오른 다음 주문부터 새 비율). 등급은 내려가지 않음.
-- 관리자는 승인할 때 실제 결제 상품 금액(쿠폰·할인 뺀 금액)으로 고칠 수 있고, 1+1·특가 주문은 최대 5% 로 묶을 수 있음.
-- 가족·지인 회원가 주문은 "제외"로 처리(적립 없음). 모집 수당(파트너가 데려온 파트너 실적)은 없음 — 다단계 아님.

alter table public.dp_orders add column if not exists rate numeric;

create or replace function public.dp_rate_for(p_sales bigint) returns numeric
language sql immutable as $$
  select case when p_sales >= 1000000 then 0.10 when p_sales >= 300000 then 0.07 when p_sales >= 100000 then 0.05 else 0.03 end
$$;

create or replace function public.dp_sales(p_code text) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount),0)::bigint from public.dp_orders where code = p_code and status in ('approved','paid')
$$;

-- 관리자: 승인(등급 비율, 금액 고치기·최대 비율 묶기 가능) / 반려 / 지급 완료
create or replace function public.dp_admin_set2(p_order text, p_status text, p_note text, p_amount integer, p_cap numeric) returns void
language plpgsql security definer set search_path = public as $$
declare r public.dp_orders; amt integer; rt numeric;
begin
  if not public.is_press_admin() then raise exception 'admin'; end if;
  if p_status not in ('pending','approved','rejected','paid') then raise exception 'status'; end if;
  select * into r from public.dp_orders where order_id = p_order;
  if r.order_id is null then raise exception 'none'; end if;
  if p_status = 'approved' and r.status not in ('approved','paid') then
    amt := greatest(0, least(coalesce(p_amount, r.amount), 10000000));
    rt := public.dp_rate_for(public.dp_sales(r.code));
    if p_cap is not null and p_cap > 0 then rt := least(rt, p_cap); end if;
    update public.dp_orders set status = 'approved', amount = amt, rate = rt,
      reward = (floor(amt * rt / 10) * 10)::int, note = nullif(trim(coalesce(p_note,'')),''), decided_at = now()
    where order_id = p_order;
  elsif p_status = 'paid' then
    update public.dp_orders set status = 'paid',
      rate = coalesce(rate, public.dp_rate_for(public.dp_sales(code))),
      reward = coalesce(reward, (floor(amount * public.dp_rate_for(public.dp_sales(code)) / 10) * 10)::int), decided_at = now()
    where order_id = p_order;
  else
    update public.dp_orders set status = p_status, reward = case when p_status = 'pending' then null else reward end,
      rate = case when p_status = 'pending' then null else rate end,
      note = nullif(trim(coalesce(p_note,'')),''), decided_at = now()
    where order_id = p_order;
    if p_status = 'rejected' then update public.dp_orders set reward = null, rate = null where order_id = p_order; end if;
  end if;
end $$;
grant execute on function public.dp_admin_set2(text, text, text, integer, numeric) to authenticated;

-- 예전 버튼(dp_admin_set)도 등급 비율로
create or replace function public.dp_admin_set(p_order text, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.dp_admin_set2(p_order, p_status, p_note, null, null); end $$;
grant execute on function public.dp_admin_set(text, text, text) to authenticated;

-- 내 실적 + 등급
create or replace function public.dp_stats() returns json
language sql stable security definer set search_path = public as $$
  with me as (select code from public.dp_partners where user_id = auth.uid()),
  s as (select public.dp_sales(me.code) as sales from me)
  select json_build_object(
    'clicks30', (select count(*) from public.dp_clicks k, me where k.code = me.code and k.created_at > now() - interval '30 days'),
    'clicksAll', (select count(*) from public.dp_clicks k, me where k.code = me.code),
    'pending', (select count(*) from public.dp_orders o, me where o.code = me.code and o.status = 'pending'),
    'approved', (select coalesce(sum(reward),0) from public.dp_orders o, me where o.code = me.code and o.status = 'approved'),
    'paid', (select coalesce(sum(reward),0) from public.dp_orders o, me where o.code = me.code and o.status = 'paid'),
    'orders', (select count(*) from public.dp_orders o, me where o.code = me.code and o.status <> 'rejected'),
    'members', (select count(*) from public.dp_members d, me where d.code = me.code and public.dp_alive(d)),
    'sales', (select sales from s),
    'rate', (select public.dp_rate_for(sales) from s)
  )
$$;
grant execute on function public.dp_stats() to authenticated;
