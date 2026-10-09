-- 이사(quote-flow) / 배송(delivery) 요청을 한 곳에 모으는 테이블.
-- 타입별로 필드가 많이 달라서 공통 메타데이터 + payload(jsonb)로 구성한다.
create table requests (
  id text primary key,
  type text not null check (type in ('moving', 'delivery')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  customer_name text,
  customer_phone text,
  customer_email text,
  summary text,
  payload jsonb not null,
  -- on delete set null: 스케줄이 삭제돼도 요청 기록 자체는 남기고 schedule_id만 비운다
  -- (schedule-delete-cascade.sql로 나중에 패치했던 내용을 생성 시점에 포함시킴).
  schedule_id text references schedules(id) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index requests_status_idx on requests (status, created_at);

alter table requests enable row level security;

-- 고객(delivery.html/quote-flow.html)은 로그인하지 않으므로 anon insert는 계속 허용.
-- 읽기/확정/거절(update)은 관리자만.
create policy "누구나 요청 등록" on requests for insert
  with check (true);
create policy "관리자만 요청 읽기" on requests for select
  using (is_admin());
create policy "관리자만 요청 확정-거절" on requests for update
  using (is_admin()) with check (is_admin());
