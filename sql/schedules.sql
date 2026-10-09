-- 이사/배송 작업 일정. 실제 운영 테이블이라 지금까지 git에 구조가 전혀 기록돼 있지
-- 않았던 테이블 — 2026-10 기준 Supabase 대시보드 캡처를 보고 옮겨적었다. NOT NULL/기본값
-- 일부는 대시보드에 명시적으로 표시되지 않아 관측된 데이터 기준으로 합리적으로 채웠으니,
-- 실제 제약과 다르면 대시보드 기준으로 고친다. is_admin()은 auth.sql에서 정의된다.

create table schedules (
  id text primary key,
  quote_no text,
  quote_price numeric,
  customer_name text,
  customer_phone text,
  job_date date not null,
  overall_time_range text,
  origin_address text,
  origin_spec text,
  dest_address text,
  dest_spec text,
  required_workers int4,
  notes text,
  assignments jsonb not null default '[]',
  vehicles jsonb not null default '[]'
);

alter table schedules enable row level security;

-- 로그인한 사람이면 누구나 읽기(자기 일정 확인용), 쓰기는 관리자만.
-- 주의: 이 정책은 크루가 "로그인한 유저"이기만 하면 자기 배정 건이 아닌 다른 고객의
-- 일정(주소/연락처 포함)까지 전부 읽을 수 있게 허용한다 — 의도된 설계인지 재검토 필요.
create policy "로그인 유저 스케줄 읽기" on schedules for select
  using (auth.uid() is not null);
create policy "관리자만 스케줄 쓰기" on schedules for all
  using (is_admin()) with check (is_admin());
