-- 크루의 날짜별 근무 가능/불가 여부. user_id는 FK가 아니라 text 컬럼이라,
-- auth.users/profiles와 DB 레벨로 연결돼 있지 않고 RLS의 auth.uid()::text 비교로만
-- "본인 것"이 걸러진다. 2026-10 기준 대시보드 확인 결과 'crew1'/'crew2' 같은 레거시
-- 시드 데이터가 실제 초대 유저의 uuid 행과 섞여서 아직 남아있다 — auth.sql 상단 주석 참고.

create table availability (
  user_id text not null,
  job_date date not null,
  is_available boolean not null,
  primary key (user_id, job_date)
);

alter table availability enable row level security;

-- 본인 것만 쓰고, 전체는 로그인한 사람이면 읽기 가능(스케줄 배정 시 필요).
create policy "로그인 유저 가능여부 읽기" on availability for select
  using (auth.uid() is not null);
create policy "본인 가능여부 쓰기" on availability for all
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
