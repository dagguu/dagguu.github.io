-- 다꾸키즈 수익 링크: 여러 파트너 링크를 누르면 "마지막에 누른 링크"가 받음 (2026-11-15 시온님).
-- 가입한 친구가 다른 파트너 링크를 누르면 그 파트너로 바로 바뀌고 30일이 새로 시작.
-- dp_members.sql·dp_members_30d.sql 다음에 시온님이 Supabase SQL Editor 에서 한 번 실행.

create or replace function public.dp_alive(r public.dp_members) returns boolean
language sql stable as $$
  select r.linked_at > now() - interval '30 days'
$$;

create or replace function public.dp_link(p_member text, p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare m text := left(trim(coalesce(p_member,'')), 80); c text := lower(coalesce(p_code,''));
begin
  if m !~ '^[0-9A-Za-z_@.-]{2,80}$' then return; end if;
  if not exists(select 1 from public.dp_partners where code = c and status = 'active') then return; end if;
  insert into public.dp_members(member_id, code, linked_at) values (m, c, now())
  on conflict (member_id) do update
    set code = excluded.code, linked_at = now(),
        last_order_at = case when public.dp_members.code = excluded.code then public.dp_members.last_order_at else null end;
end $$;
grant execute on function public.dp_link(text, text) to anon, authenticated;

-- 초대 링크(?reco_id=)로 가입: 그 파트너와 연결(마지막 클릭과 같은 방식)
create or replace function public.dp_link_reco(p_member text, p_reco text) returns void
language plpgsql security definer set search_path = public as $$
declare m text := left(trim(coalesce(p_member,'')), 80); rid text := lower(trim(coalesce(p_reco,''))); c text;
begin
  if m !~ '^[0-9A-Za-z_@.-]{2,80}$' or length(rid) < 2 or lower(m) = rid then return; end if;
  select code into c from public.dp_partners where lower(shop_id) = rid and status = 'active' limit 1;
  if c is null then return; end if;
  perform public.dp_link(m, c);
end $$;
grant execute on function public.dp_link_reco(text, text) to anon, authenticated;

-- 주문 완료: 7일 링크 기록(마지막에 누른 링크)이 있으면 그 파트너, 없으면 30일 안에 연결된 파트너.
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
    if s = 'link' then
      -- 링크로 산 주문: 그 파트너로 연결을 바꾸거나 새로 만듦(30일 새로 시작)
      insert into public.dp_members(member_id, code, linked_at, last_order_at) values (m, eff, now(), now())
      on conflict (member_id) do update
        set last_order_at = now(),
            linked_at = case when public.dp_members.code = excluded.code then public.dp_members.linked_at else now() end,
            code = excluded.code;
    else
      update public.dp_members set last_order_at = now() where member_id = m;
    end if;
  end if;
end $$;
grant execute on function public.dp_order2(text, text, integer, text) to anon, authenticated;
