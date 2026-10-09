create table work_logs (
  id uuid primary key default gen_random_uuid(),
  -- on delete cascade: 스케줄이 삭제되면 그 스케줄에 딸린 근무기록도 같이 지워진다
  -- (schedule-delete-cascade.sql로 나중에 패치했던 내용을 생성 시점에 포함시킴).
  schedule_id text references schedules(id) on delete cascade,
  user_id text not null,
  job_date date not null,
  assigned_start text,
  actual_start text not null,
  actual_end text not null,
  break_minutes int not null,
  worked_hours numeric not null,
  status text not null default 'pending',
  reject_reason text,
  submitted_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter publication supabase_realtime add table work_logs;

alter table work_logs enable row level security;

-- 본인 것은 본인이 넣고 고칠 수 있고, 승인/반려는 관리자만.
create policy "본인 근무기록 읽기" on work_logs for select
  using (user_id = auth.uid()::text or is_admin());
create policy "본인 근무기록 등록" on work_logs for insert
  with check (user_id = auth.uid()::text);
-- 본인이 이미 제출한 근무기록을 다시 수정(재제출)할 수 있게 한다. status를 'pending'으로만
-- 되돌릴 수 있게 제한해서, 본인이 스스로 'confirmed'로 바꿔치기하지 못하게 막는다.
create policy "본인 근무기록 수정(재제출)" on work_logs for update
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text and status = 'pending');
create policy "관리자 근무기록 승인/반려" on work_logs for update
  using (is_admin()) with check (is_admin());
