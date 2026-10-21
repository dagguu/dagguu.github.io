-- 마이페이지 '내 블로그·인스타 주소' (2026-10-21). Supabase SQL Editor 에서 한 번 실행
alter table public.profiles add column if not exists blogs text[] not null default '{}';
alter table public.profiles add column if not exists instas text[] not null default '{}';
-- profiles 의 본인 수정 규칙(schema.sql)이 그대로 적용돼요. 다른 사람은 볼 수 없어요.
