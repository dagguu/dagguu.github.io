-- 다꾸체험단 알림: 관심 지역·관심 단어 (시온님이 SQL Editor 에서 한 번 실행)
alter table public.push_subs add column if not exists regions text[] not null default '{}';
alter table public.push_subs add column if not exists words text[] not null default '{}';
create or replace function public.push_prefs(p_endpoint text, p_regions text[], p_words text[])
returns void language sql security definer set search_path = public as $$
  update public.push_subs
     set regions = coalesce(p_regions[1:9], '{}'),
         words = coalesce((select array_agg(left(w, 20)) from unnest(p_words[1:10]) w where length(trim(w)) > 0), '{}')
   where endpoint = p_endpoint;
$$;
revoke all on function public.push_prefs(text, text[], text[]) from public;
grant execute on function public.push_prefs(text, text[], text[]) to anon, authenticated;
