-- schedule.html에 실제 인증/권한을 붙이기 위한 스키마.
-- 기존 schedules/work_logs/availability 테이블의 user_id 컬럼은 이미 text 타입이라
-- 컬럼 타입을 바꿀 필요 없이, 앞으로는 그 자리에 auth.uid()::text (실제 로그인 유저의 UUID)를
-- 넣으면 된다. 단, CREW_USERS 하드코딩 배열 기반의 기존 시드 데이터('crew1' 등)는
-- 실제 초대된 유저와 매칭되지 않으므로 실 운영 전에 정리해야 한다.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  role text not null default 'crew' check (role in ('admin', 'crew')),
  can_drive boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS 정책에서 "이 사람이 admin인가"를 매번 확인해야 하는데, profiles 테이블 자체에 걸린
-- 정책 안에서 profiles를 다시 SELECT하면 재귀(infinite recursion) 오류가 난다.
-- security definer 함수로 RLS를 우회해서 조회하면 이 문제를 피할 수 있다.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table profiles enable row level security;

create policy "본인 프로필 읽기" on profiles for select
  using (id = auth.uid());
create policy "관리자는 전체 프로필 읽기" on profiles for select
  using (is_admin());
create policy "관리자는 프로필 등록/수정" on profiles for all
  using (is_admin()) with check (is_admin());

-- schedules: 로그인한 사람이면 누구나 읽기(자기 일정 확인용), 쓰기는 관리자만.
alter table schedules enable row level security;
create policy "로그인 유저 스케줄 읽기" on schedules for select
  using (auth.uid() is not null);
create policy "관리자만 스케줄 쓰기" on schedules for all
  using (is_admin()) with check (is_admin());

-- work_logs: 본인 것은 본인이 넣고 고칠 수 있고, 승인/반려는 관리자만.
alter table work_logs enable row level security;
create policy "본인 근무기록 읽기" on work_logs for select
  using (user_id = auth.uid()::text or is_admin());
create policy "본인 근무기록 등록" on work_logs for insert
  with check (user_id = auth.uid()::text);
create policy "관리자 근무기록 승인/반려" on work_logs for update
  using (is_admin()) with check (is_admin());

-- availability: 본인 것만 쓰고, 전체는 로그인한 사람이면 읽기 가능(스케줄 배정 시 필요).
alter table availability enable row level security;
create policy "로그인 유저 가능여부 읽기" on availability for select
  using (auth.uid() is not null);
create policy "본인 가능여부 쓰기" on availability for all
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

-- requests: 고객(delivery.html/quote-flow.html)은 로그인하지 않으므로 anon insert는 계속 허용.
-- 읽기/확정/거절(update)은 관리자만.
alter table requests enable row level security;
create policy "누구나 요청 등록" on requests for insert
  with check (true);
create policy "관리자만 요청 읽기" on requests for select
  using (is_admin());
create policy "관리자만 요청 확정-거절" on requests for update
  using (is_admin()) with check (is_admin());
