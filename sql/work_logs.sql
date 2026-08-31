create table work_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references schedules(id),
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
