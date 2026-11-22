-- 다꾸파트너스 보안 강화 (2026-11-22, 시온님 "다꾸파트너스 보안강화하려면"):
-- Supabase SQL Editor 에 통째로 붙여 넣고 Run. 여러 번 실행해도 괜찮음.
-- ① 관리자·정리 함수는 로그인한 사람만 부를 수 있게(Postgres 기본값은 누구나 실행 가능 = 로그인 안 한 손님도).
--    함수 안에서 관리자인지 다시 확인하지만, 바깥 문도 한 번 더 잠금.
do $$
declare f text;
begin
  foreach f in array array[
    'public.dp_admin_set(text,text,text)',
    'public.dp_admin_set2(text,text,text,integer,numeric)',
    'public.dp_admin_set3(text,text,text,integer,numeric)',
    'public.exp_admin_list()',
    'public.exp_admin_set(bigint,text,text)',
    'public.exp_purge()',
    'public.gift_admin_list()',
    'public.gift_admin_set(bigint,text,text)',
    'public.gift_purge()',
    'public.press_admin_names(uuid[])',
    'public.press_admin_set(bigint,text,text)',
    'public.press_admin_wd(bigint,boolean,text)',
    'public.press_purge()'
  ] loop
    begin
      execute format('revoke all on function %s from public, anon', f);
      execute format('grant execute on function %s to authenticated', f);
    exception when undefined_function then null;   -- 아직 안 만든 함수는 건너뜀
    end;
  end loop;
end $$;

-- ② 모든 표에 보안 규칙(RLS)이 켜져 있는지 확인. 결과에 줄이 나오면 그 표는 RLS 가 꺼진 것 → Claude 에게 알려 주세요.
select tablename as "RLS 꺼진 표"
from pg_tables
where schemaname = 'public' and not rowsecurity;
