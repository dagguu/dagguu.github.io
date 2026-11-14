-- 다꾸키즈 수익 링크 적립 비율 = 다꾸키즈 회원등급(2026-11-14 시온님): 기본회원 3% · 다꾸회원 5% · VIP 7% · VVIP 10%
-- dp_tiers.sql 다음에 시온님이 Supabase SQL Editor 에서 한 번 실행.
-- 등급은 카페24에 있어서 Supabase 가 모른다 → 관리자가 승인할 때 그 파트너의 회원등급 버튼(3/5/7/10%)을 눌러 비율을 정한다.
-- 가족·지인 회원가 주문은 "제외". 1+1·특가는 최대 5%(관리자가 5% 이하 버튼 선택).

create or replace function public.dp_admin_set3(p_order text, p_status text, p_note text, p_amount integer, p_rate numeric) returns void
language plpgsql security definer set search_path = public as $$
declare r public.dp_orders; amt integer; rt numeric;
begin
  if not public.is_press_admin() then raise exception 'admin'; end if;
  if p_status <> 'approved' then perform public.dp_admin_set2(p_order, p_status, p_note, p_amount, null); return; end if;
  select * into r from public.dp_orders where order_id = p_order;
  if r.order_id is null then raise exception 'none'; end if;
  if r.status in ('approved','paid') then return; end if;
  amt := greatest(0, least(coalesce(p_amount, r.amount), 10000000));
  rt := greatest(0, least(coalesce(p_rate, 0.03), 0.10));
  update public.dp_orders set status = 'approved', amount = amt, rate = rt,
    reward = (floor(amt * rt / 10) * 10)::int, note = nullif(trim(coalesce(p_note,'')),''), decided_at = now()
  where order_id = p_order;
end $$;
grant execute on function public.dp_admin_set3(text, text, text, integer, numeric) to authenticated;

-- 내 실적: rate = 가장 최근에 승인된 주문의 비율(없으면 3%)
create or replace function public.dp_stats() returns json
language sql stable security definer set search_path = public as $$
  with me as (select code from public.dp_partners where user_id = auth.uid())
  select json_build_object(
    'clicks30', (select count(*) from public.dp_clicks k, me where k.code = me.code and k.created_at > now() - interval '30 days'),
    'clicksAll', (select count(*) from public.dp_clicks k, me where k.code = me.code),
    'pending', (select count(*) from public.dp_orders o, me where o.code = me.code and o.status = 'pending'),
    'approved', (select coalesce(sum(reward),0) from public.dp_orders o, me where o.code = me.code and o.status = 'approved'),
    'paid', (select coalesce(sum(reward),0) from public.dp_orders o, me where o.code = me.code and o.status = 'paid'),
    'orders', (select count(*) from public.dp_orders o, me where o.code = me.code and o.status <> 'rejected'),
    'members', (select count(*) from public.dp_members d, me where d.code = me.code and public.dp_alive(d)),
    'sales', (select coalesce(sum(amount),0) from public.dp_orders o, me where o.code = me.code and o.status in ('approved','paid')),
    'rate', coalesce((select rate from public.dp_orders o, me where o.code = me.code and o.status in ('approved','paid') and o.rate is not null order by decided_at desc limit 1), 0.03)
  )
$$;
grant execute on function public.dp_stats() to authenticated;
