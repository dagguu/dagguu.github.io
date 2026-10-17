-- 다꾸체험단 알림: 찜한 체험단 마감 알림 (시온님이 SQL Editor 에서 한 번 실행)
alter table public.push_subs add column if not exists favs text[] not null default '{}';
create or replace function public.push_favs(p_endpoint text, p_favs text[])
returns void language sql security definer set search_path = public as $$
  update public.push_subs
     set favs = coalesce((select array_agg(left(f, 40)) from unnest(p_favs[1:300]) f where length(trim(f)) > 0), '{}')
   where endpoint = p_endpoint;
$$;
revoke all on function public.push_favs(text, text[]) from public;
grant execute on function public.push_favs(text, text[]) to anon, authenticated;
