-- 다꾸키즈 체험단 당첨자 발표(2026-11-20 시온님 "체험단 당첨 안내 팝업, 11월 당첨자 윤** 님 010-****-5678 이런 식으로 축하드립니다").
-- 누구나 부를 수 있지만 이름 첫 글자 + **, 휴대폰 뒤 4자리만 돌려줌(전체 이름·번호·주소는 안 나감).
-- 선정(selected)·게시 완료(posted)만, p_month('YYYY-MM', 한국 시간) 에 신청한 사람. exp_apps.sql 다음에 SQL Editor 에서 한 번 실행.
create or replace function public.exp_winners(p_month text)
returns table(nm text, ph text, title text)
language sql stable security definer set search_path = public as $$
  select left(coalesce(nullif(trim(name), ''), '회원'), 1) || '**' as nm,
         '010-****-' || right(regexp_replace(phone, '[^0-9]', '', 'g'), 4) as ph,
         exp_title as title
  from public.exp_apps
  where status in ('selected', 'posted')
    and to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM') = p_month
  order by created_at
  limit 100 $$;
grant execute on function public.exp_winners(text) to anon, authenticated;
select true;
