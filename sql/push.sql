-- 신규 요청(requests) 알림을 관리자 스마트폰에 웹 푸시로 보내기 위한 구독 정보 저장 테이블.
-- 기기 하나당 브라우저의 PushManager.subscribe() 결과(subscription 객체)를 통째로 저장해둔다.
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- 본인 구독만 등록/조회/삭제 가능. 실제 발송은 notify-new-request Edge Function이
-- service_role로 우회해서 전체 관리자 구독을 조회하므로 여기서는 admin 전체 읽기 정책이 필요 없다.
create policy "본인 구독 관리" on push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
