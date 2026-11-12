-- 다꾸키즈 수익 링크: 링크로 들어온 회원 연결(2026-11-12 시온님 "7일 쿠키 + 12개월").
-- dp_partners.sql 을 먼저 실행한 상태에서 시온님이 Supabase SQL Editor 에서 한 번 실행.
-- 규칙
--  · 링크(?pt=코드)를 누르면 7일 동안 이 기기에서 그 파트너 실적(쿠키). 나중에 누른 링크가 우선.
--  · 링크로 들어와 가입·로그인하거나 링크로 주문한 회원은 그 파트너와 "연결"(dp_members).
--  · 연결된 회원은 쿠키가 없어도(네이버 검색·다른 앱·다른 기기로 와도) 주문이 그 파트너 실적.
--  · 연결은 마지막 주문(또는 연결) 뒤 12개월 동안 주문이 없으면 끝남. 주문할 때마다 12개월이 다시 시작.
--  · 연결이 끝난 회원이 다른 파트너 링크로 들어오면 그 파트너와 새로 연결.

create table if not exists public.dp_members (
  member_id text primary key,
  code text not null,
  linked_at timestamptz not null default now(),
  last_order_at timestamptz
);
create index if not exists dp_members_code on public.dp_members(code);
alter table public.dp_members enable row level security;
drop policy if exists "dp_members admin" on public.dp_members;
create policy "dp_members admin" on public.dp_members for select to authenticated using (public.is_press_admin());
grant select on public.dp_members to authenticated;

alter table public.dp_orders add column if not exists member_id text;
alter table public.dp_orders add column if not exists src text;  -- 'link'(7일 쿠키) / 'member'(연결된 회원)

create or replace function public.dp_alive(r public.dp_members) returns boolean
language sql stable as $$
  select greatest(r.linked_at, coalesce(r.last_order_at, r.linked_at)) > now() - interval '12 months'
$$;

-- 링크 쿠키가 있는 회원이 로그인해 있으면 연결(쇼핑몰 스크립트, 로그인 없이 호출)
create or replace function public.dp_link(p_member text, p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare m text := left(trim(coalesce(p_member,'')), 80); c text := lower(coalesce(p_code,'')); r public.dp_members;
begin
  if m !~ '^[0-9A-Za-z_@.-]{2,80}$' then return; end if;
  if not exists(select 1 from public.dp_partners where code = c and status = 'active') then return; end if;
  select * into r from public.dp_members where member_id = m;
  if r.member_id is null then
    insert into public.dp_members(member_id, code) values (m, c) on conflict (member_id) do nothing;
  elsif r.code = c then
    update public.dp_members set linked_at = now() where member_id = m;  -- 같은 파트너 링크를 다시 누르면 기간 연장
  elsif not public.dp_alive(r) then
    update public.dp_members set code = c, linked_at = now(), last_order_at = null where member_id = m;
  end if;
end $$;
grant execute on function public.dp_link(text, text) to anon, authenticated;

-- 주문 완료(주문완료 화면 스크립트). 쿠키 코드가 있으면 그 파트너, 없으면 연결된 회원의 파트너.
create or replace function public.dp_order2(p_order text, p_code text, p_amount integer, p_member text) returns void
language plpgsql security definer set search_path = public as $$
declare o text := left(trim(coalesce(p_order,'')), 40); c text := lower(coalesce(p_code,''));
        m text := left(trim(coalesce(p_member,'')), 80); r public.dp_members; eff text; s text;
begin
  if o !~ '^[0-9A-Za-z-]{6,40}$' then return; end if;
  if m !~ '^[0-9A-Za-z_@.-]{2,80}$' then m := null; end if;
  if exists(select 1 from public.dp_partners where code = c and status = 'active') then
    eff := c; s := 'link';
  elsif m is not null then
    select * into r from public.dp_members where member_id = m;
    if r.member_id is not null and public.dp_alive(r)
       and exists(select 1 from public.dp_partners where code = r.code and status = 'active') then
      eff := r.code; s := 'member';
    end if;
  end if;
  if eff is null then return; end if;
  insert into public.dp_orders(order_id, code, amount, member_id, src)
  values (o, eff, greatest(0, least(coalesce(p_amount,0), 10000000)), m, s)
  on conflict (order_id) do nothing;
  if m is not null then
    select * into r from public.dp_members where member_id = m;
    if r.member_id is null then
      insert into public.dp_members(member_id, code, linked_at, last_order_at) values (m, eff, now(), now()) on conflict (member_id) do nothing;
    elsif r.code = eff then
      update public.dp_members set last_order_at = now() where member_id = m;
    elsif not public.dp_alive(r) then
      update public.dp_members set code = eff, linked_at = now(), last_order_at = now() where member_id = m;
    end if;
  end if;
end $$;
grant execute on function public.dp_order2(text, text, integer, text) to anon, authenticated;

-- 내 실적에 "연결된 회원 수" 추가
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
    'members', (select count(*) from public.dp_members d, me where d.code = me.code and public.dp_alive(d))
  )
$$;
grant execute on function public.dp_stats() to authenticated;

-- 추천인 아이디로 연결(2026-11-12 시온님 "추천인에 아이디 쓰는거로"): 회원가입 때 추천인 아이디 칸(또는 ?reco_id= 초대 링크)에
-- 파트너의 다꾸키즈 아이디(dp_partners.shop_id)를 쓰면 그 파트너와 연결. 이미 다른 파트너와 살아 있는 연결이 있으면 그대로.
create or replace function public.dp_link_reco(p_member text, p_reco text) returns void
language plpgsql security definer set search_path = public as $$
declare m text := left(trim(coalesce(p_member,'')), 80); rid text := lower(trim(coalesce(p_reco,''))); c text; r public.dp_members;
begin
  if m !~ '^[0-9A-Za-z_@.-]{2,80}$' or length(rid) < 2 or lower(m) = rid then return; end if;
  select code into c from public.dp_partners where lower(shop_id) = rid and status = 'active' limit 1;
  if c is null then return; end if;
  select * into r from public.dp_members where member_id = m;
  if r.member_id is null then
    insert into public.dp_members(member_id, code) values (m, c) on conflict (member_id) do nothing;
  elsif r.code = c then
    update public.dp_members set linked_at = now() where member_id = m;
  elsif not public.dp_alive(r) then
    update public.dp_members set code = c, linked_at = now(), last_order_at = null where member_id = m;
  end if;
end $$;
grant execute on function public.dp_link_reco(text, text) to anon, authenticated;
