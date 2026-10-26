-- Supabase 무료 플랜 자동 일시정지 방지용. .github/workflows/keep-supabase-alive.yml이
-- 3일마다 keepalive() 함수를 호출해서 이 테이블의 한 줄을 갱신한다.
-- anon 키로 profiles를 읽기만 하는 ping은 활동으로 인정되지 않아 (RLS 때문에 빈 결과만 돌아옴)
-- 2026-10-26에 Dokgodali-dev 일시정지 경고를 받았다. 그래서 실제 쓰기가 일어나게 바꿨다.
-- Dokgodali-dev와 Dokgodali-demo 두 프로젝트 모두에서 실행해야 한다.

create table keepalive (
  id int primary key default 1 check (id = 1),
  pinged_at timestamptz not null default now()
);

-- 정책을 하나도 두지 않아서 anon/authenticated는 테이블에 직접 접근할 수 없다.
-- 갱신은 아래 security definer 함수를 통해서만 가능하고, 그 함수도 고정된 한 줄만 건드린다.
alter table keepalive enable row level security;

create or replace function keepalive()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  insert into keepalive (id, pinged_at) values (1, now())
  on conflict (id) do update set pinged_at = excluded.pinged_at
  returning pinged_at;
$$;

revoke all on function keepalive() from public, authenticated;
grant execute on function keepalive() to anon;
