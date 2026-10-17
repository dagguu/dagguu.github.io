-- 다꾸체험단 웹 푸시 알림 구독 저장 (시온님이 Supabase SQL Editor 에서 한 번 실행)
-- 사이트(anon 키)는 구독 등록/해지 함수만 부를 수 있고, 목록은 볼 수 없다.
-- 목록 읽기·보내기는 GitHub Actions 가 service_role 키(저장소 Secrets)로만 한다.
create table if not exists public.push_subs (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
-- 정책을 만들지 않으므로 anon/authenticated 는 직접 읽거나 쓸 수 없다.

create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_ua text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.push_subs(endpoint, p256dh, auth, ua)
  values (left(p_endpoint, 1000), left(p_p256dh, 200), left(p_auth, 100), left(p_ua, 200))
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua;
$$;
create or replace function public.push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint;
$$;
revoke all on function public.push_subscribe(text, text, text, text) from public;
revoke all on function public.push_unsubscribe(text) from public;
grant execute on function public.push_subscribe(text, text, text, text) to anon, authenticated;
grant execute on function public.push_unsubscribe(text) to anon, authenticated;
-- 보내기(GitHub Actions, service_role)가 구독 목록을 읽고 끊긴 구독을 지울 수 있게
grant select, delete on public.push_subs to service_role;
