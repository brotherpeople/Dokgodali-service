-- 누가 어떤 행을 읽고 쓸 수 있는지. using = 읽기·수정·삭제 대상 조건, with_check = 새로 쓰는 값 조건.
select tablename  as 테이블,
       policyname as 정책,
       cmd        as 동작,
       roles      as 대상,
       qual       as using_조건,
       with_check as with_check_조건
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, cmd;
