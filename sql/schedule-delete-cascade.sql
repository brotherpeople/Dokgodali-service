-- 스케줄을 삭제할 때, 연결된 근무기록(work_logs)은 같이 지워지고, 연결된 요청(requests)은
-- 삭제되지 않고 schedule_id만 비워지도록 한다. 원래는 on delete 옵션이 없어서 연결된 row가
-- 하나라도 있으면 스케줄 삭제 자체가 거부됐다.
--
-- 아래 DROP 문의 제약조건 이름이 실제와 다르면 먼저 이 쿼리로 정확한 이름을 확인한다:
--   select conname, conrelid::regclass as table_name
--   from pg_constraint
--   where confrelid = 'schedules'::regclass and contype = 'f';

alter table work_logs drop constraint if exists work_logs_schedule_id_fkey;
alter table work_logs add constraint work_logs_schedule_id_fkey
  foreign key (schedule_id) references schedules(id) on delete cascade;

alter table requests drop constraint if exists requests_schedule_id_fkey;
alter table requests add constraint requests_schedule_id_fkey
  foreign key (schedule_id) references schedules(id) on delete set null;
