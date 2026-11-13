-- 다꾸키즈 수익 링크 연결 기간 12개월 → 30일 (2026-11-14 시온님 "그냥 30일간으로, 또 링크 보내면 30일").
-- 가입한 친구 연결은 마지막으로 내 링크를 누른 날부터 30일. 같은 링크를 다시 누르면 30일이 다시 시작(dp_link 가 linked_at 을 새로 씀).
-- 주문만으로는 연장되지 않음. 시온님이 Supabase SQL Editor 에서 한 번 실행.
create or replace function public.dp_alive(r public.dp_members) returns boolean
language sql stable as $$
  select r.linked_at > now() - interval '30 days'
$$;
