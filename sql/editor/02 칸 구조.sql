-- 테이블별 칸(column): 자료형, 비어도 되는지, 기본값, 설명. 원하는 테이블만 보려면 맨 아래 주석을 푼다.
select c.table_name                                as 테이블,
       c.column_name                               as 칸,
       c.data_type                                 as 자료형,
       case when c.is_nullable = 'YES' then '' else '필수' end as 필수,
       coalesce(c.column_default, '')              as 기본값,
       coalesce(col_description(format('public.%I', c.table_name)::regclass, c.ordinal_position), '') as 설명
from information_schema.columns c
where c.table_schema = 'public'
  -- and c.table_name = 'requests'
order by c.table_name, c.ordinal_position;
