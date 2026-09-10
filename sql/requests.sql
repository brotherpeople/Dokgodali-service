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
  schedule_id text references schedules(id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index requests_status_idx on requests (status, created_at);
