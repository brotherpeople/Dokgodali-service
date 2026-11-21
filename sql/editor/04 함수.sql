-- DB 함수(RPC): 화면과 GitHub Actions가 부르는 함수들. security definer = 함수 주인 권한으로 실행(권한 우회 주의).
select p.proname                                   as 함수,
       pg_get_function_identity_arguments(p.oid)   as 인자,
       case when p.prosecdef then 'definer' else 'invoker' end as 실행_권한,
       coalesce(obj_description(p.oid, 'pg_proc'), '') as 설명
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
