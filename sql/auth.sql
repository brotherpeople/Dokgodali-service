-- schedule.html에 실제 인증/권한을 붙이기 위한 기반 스키마: profiles 테이블과,
-- 다른 모든 테이블의 RLS 정책이 공통으로 쓰는 is_admin() 헬퍼 함수.
-- schedules/availability/work_logs/requests 각각의 테이블 정의와 RLS 정책은
-- 이제 그 테이블 이름의 SQL 파일에 있다 (schedules.sql, availability.sql, work_logs.sql, requests.sql).
--
-- 기존 schedules/work_logs/availability 테이블의 user_id 컬럼은 text 타입이라
-- 컬럼 타입을 바꿀 필요 없이 auth.uid()::text (실제 로그인 유저의 UUID)를 그 자리에
-- 넣으면 된다. 단, CREW_USERS 하드코딩 배열 기반의 기존 시드 데이터('crew1' 등)는
-- 실제 초대된 유저와 매칭되지 않으므로 실 운영 전에 정리해야 한다 (availability 테이블에
-- 아직 'crew1'/'crew2' 시드 행이 남아있는 것을 2026-10 기준 확인함).

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
