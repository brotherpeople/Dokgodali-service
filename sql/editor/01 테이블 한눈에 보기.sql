-- 테이블 목록: 무엇을 담는지(설명), 대략 몇 줄인지, RLS(행 단위 권한)가 켜져 있는지.
-- 읽기만 하는 쿼리라 언제 실행해도 안전하다. 설명은 sql/comments.sql에서 붙인다.
select c.relname                                   as 테이블,
       coalesce(obj_description(c.oid), '')        as 설명,
       c.reltuples::bigint                         as 대략_행수,
       case when c.relrowsecurity then '켜짐' else '꺼짐!' end as rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
