-- 다꾸키즈 체험단: 선정 결과 보기 + 인스타그램 게시물 주소 제출 (2026-11-18 시온님)
-- exp_apps.sql 다음에 SQL Editor 에서 한 번 실행.
-- 신청한 기기에는 신청할 때 받은 열쇠(tok)만 남고, 그 열쇠로만 내 상태를 봄(전화번호로 남의 신청을 찾아볼 수 없게).
alter table public.exp_apps add column if not exists tok text;
alter table public.exp_apps add column if not exists post_url text;
alter table public.exp_apps add column if not exists posted_at timestamptz;
update public.exp_apps set tok = replace(gen_random_uuid()::text, '-', '') where tok is null;
alter table public.exp_apps alter column tok set default replace(gen_random_uuid()::text, '-', '');
create unique index if not exists exp_apps_tok on public.exp_apps(tok);

-- 신청: 새 화면(p.v = 2)에는 'ok:열쇠' / 'dup:열쇠'(이름까지 같을 때만) / 'dup' 를 돌려줌. 예전 화면에는 예전처럼 'ok'·'dup'.
create or replace function public.exp_apply(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare ph text := regexp_replace(coalesce(p->>'phone',''), '[^0-9]', '', 'g'); n int; ex text := p->>'exp'; t text; v2 boolean := coalesce(p->>'v','') = '2'; r record;
begin
  if ex !~ '^[a-z0-9-]{2,40}$' then return 'bad'; end if;
  if length(ph) < 10 or length(ph) > 11 then return 'bad'; end if;
  if length(coalesce(trim(p->>'name'),'')) < 1 or length(coalesce(trim(p->>'addr1'),'')) < 4 or length(coalesce(trim(p->>'insta'),'')) < 3 then return 'bad'; end if;
  select count(*) into n from public.exp_apps where created_at > now() - interval '1 hour';
  if n > 300 then return 'busy'; end if;
  insert into public.exp_apps(exp_id, exp_title, ig, phone, member, name, zip, addr1, addr2, tel, email, memo, insta)
    values (ex, left(p->>'title', 80), left(trim(p->>'insta'), 120), ph, left(p->>'member', 60), left(trim(p->>'name'), 30), left(p->>'zip', 10),
            left(trim(p->>'addr1'), 150), left(trim(p->>'addr2'), 100), left(p->>'tel', 20), left(trim(p->>'email'), 100), left(p->>'memo', 200), left(trim(p->>'insta'), 200))
    on conflict (exp_id, phone) do nothing
    returning tok into t;
  if t is not null then return case when v2 then 'ok:' || t else 'ok' end; end if;
  if v2 then
    select tok, name into r from public.exp_apps where exp_id = ex and phone = ph;
    if r.name = left(trim(p->>'name'), 30) then return 'dup:' || r.tok; end if;
  end if;
  return 'dup';
end $$;
grant execute on function public.exp_apply(jsonb) to anon, authenticated;

-- 내 상태: 열쇠 목록 → 체험단 id·상태·제출한 게시물 주소
create or replace function public.exp_mine(p_toks text[])
returns table(exp_id text, status text, post_url text, tok text)
language sql stable security definer set search_path = public as $$
  select a.exp_id, a.status, a.post_url, a.tok from public.exp_apps a
  where a.tok = any(p_toks[1:30]) and a.tok ~ '^[0-9a-f]{32}$' $$;
grant execute on function public.exp_mine(text[]) to anon, authenticated;

-- 게시물 주소 제출: 선정된(또는 게시 완료) 신청만, 인스타그램 주소만
create or replace function public.exp_submit(p_tok text, p_url text)
returns text language plpgsql security definer set search_path = public as $$
declare u text := trim(coalesce(p_url,'')); s text;
begin
  if p_tok !~ '^[0-9a-f]{32}$' then return 'bad'; end if;
  if u !~* '^https?://(www\.)?instagram\.com/(p|reel|reels)/[A-Za-z0-9_-]+' or length(u) > 300 then return 'url'; end if;
  select status into s from public.exp_apps where tok = p_tok;
  if s is null then return 'bad'; end if;
  if s not in ('selected','posted') then return 'notsel'; end if;
  update public.exp_apps set post_url = u, posted_at = now() where tok = p_tok;
  return 'ok';
end $$;
grant execute on function public.exp_submit(text,text) to anon, authenticated;
select true;
