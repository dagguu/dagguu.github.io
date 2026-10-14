-- 다꾸 체험단 모음 · 회원 기능 테이블
-- Supabase 대시보드 > SQL Editor 에 이 파일 내용을 통째로 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)

-- 1) 회원 정보 (관심 분야·지역·아기 나이·알림 동의)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  provider text,
  cat text,
  regions text[] not null default '{}',
  ages text[] not null default '{}',
  notify boolean not null default false,
  notify_agreed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) 찜
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- 3) 내가 눌러본 상품 (최근 본)
create table if not exists public.views (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  viewed_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- 4) 기자단 신청 (한 달에 한 번)
create table if not exists public.reporter_apps (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,                       -- 예: 2026-10
  blog_url text not null check (blog_url ~* '^https?://'),
  status text not null default '신청 완료',   -- 관리자가 '선정' / '미선정' / '지급 완료' 로 바꿔요
  post_url text,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

-- 5) 룰렛 (하루 한 번, 서버에서 결과를 정해요)
create table if not exists public.spins (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  prize int not null,
  code text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- 보안: 각 회원은 자기 데이터만 보고 고칠 수 있어요
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.views enable row level security;
alter table public.reporter_apps enable row level security;
alter table public.spins enable row level security;

drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own favorites" on public.favorites;
create policy "own favorites" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own views" on public.views;
create policy "own views" on public.views for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own reporter read" on public.reporter_apps;
drop policy if exists "own reporter insert" on public.reporter_apps;
create policy "own reporter read" on public.reporter_apps for select using (auth.uid() = user_id);
create policy "own reporter insert" on public.reporter_apps for insert with check (auth.uid() = user_id and status = '신청 완료');

drop policy if exists "own spins read" on public.spins;
create policy "own spins read" on public.spins for select using (auth.uid() = user_id);
-- spins 는 아래 spin() 함수로만 기록돼요 (직접 insert 불가)

-- 가입하면 profiles 한 줄을 자동으로 만들어요
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, provider)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'full_name', '회원'),
          new.raw_app_meta_data->>'provider')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 룰렛: 하루 1회, 당첨되면 그 달은 끝. 확률(%)은 사이트 룰렛과 같아요.
create or replace function public.spin() returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  d date := (now() at time zone 'Asia/Seoul')::date;
  odds numeric[] := array[0.2, 0.4, 0, 0.4, 0.2, 0.4, 0, 0.4];   -- 아메리카노, 츄파춥스, 꽝, 딸기우유, 카페라떼, 새콤달콤, 꽝, 초코우유
  letters text[] := array['A','C','','B','L','S','','H'];
  x numeric := random() * 100;
  acc numeric := 0;
  pick int := -1;
  c text := '';
  r record;
begin
  if uid is null then raise exception 'login required'; end if;
  select * into r from spins where user_id = uid and day = d;
  if found then return json_build_object('i', r.prize, 'code', r.code, 'again', true); end if;
  if exists (select 1 from spins where user_id = uid and code <> '' and date_trunc('month', day) = date_trunc('month', d)) then
    raise exception 'won this month';
  end if;
  for k in 1..8 loop
    if letters[k] <> '' then
      acc := acc + odds[k];
      if x < acc then pick := k - 1; exit; end if;
    end if;
  end loop;
  if pick < 0 then pick := case when random() < 0.5 then 2 else 6 end; end if;
  if letters[pick + 1] <> '' then
    c := 'DAKKU-' || to_char(d, 'MMDD') || '-' || letters[pick + 1] || '-' || upper(substr(md5(random()::text), 1, 4));
  end if;
  insert into spins (user_id, day, prize, code) values (uid, d, pick, c);
  return json_build_object('i', pick, 'code', c, 'again', false);
end $$;
revoke all on function public.spin() from public, anon;
grant execute on function public.spin() to authenticated;

-- 회원 탈퇴: 본인 계정과 모든 기록을 지워요
create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
