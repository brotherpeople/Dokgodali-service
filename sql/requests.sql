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
  confirmed_at timestamptz,
  -- 고객 수정 링크 (docs/superpowers/plans/2026-11-06-delivery-request-edit-link.md)
  --   edit_key: 신청 시 브라우저가 만든 무작위 값(UUID). 공개 읽기 권한이 없어 밖으로 노출되지 않는다.
  --   payload_before_edit: 관리자가 마지막으로 확인한 payload. 고객이 수정하면 채워지고,
  --     관리자가 [스케줄에 반영]/[확인만]을 누르면 비운다 → null이 아니면 "수정된 요청(확인 필요)".
  --   quote_issued_at: 관리자가 견적서 발행을 표시한 시각. 값이 있으면 고객은 더 이상 수정할 수 없다.
  edit_key text,
  edited_at timestamptz,
  edit_count int not null default 0,
  payload_before_edit jsonb,
  quote_issued_at timestamptz
);

create index requests_status_idx on requests (status, created_at);

alter table requests enable row level security;

-- 고객(delivery.html/quote-flow.html)은 로그인하지 않으므로 anon insert는 계속 허용.
-- 다만 수정 이력·견적서 발행 칸은 신청할 때 채울 수 없다.
-- 읽기/확정/거절(update)은 관리자만. 고객 수정은 아래 RPC(update_request)로만 한다.
create policy "누구나 요청 등록" on requests for insert
  with check (
    edited_at is null and edit_count = 0
    and payload_before_edit is null and quote_issued_at is null
  );
create policy "관리자만 요청 읽기" on requests for select
  using (is_admin());
create policy "관리자만 요청 확정-거절" on requests for update
  using (is_admin()) with check (is_admin());

-- 수정 링크로 요청을 불러온다. 링크가 맞고, 거절되지 않았고, 견적서 발행 전이어야 한다.
-- 결과: {payload, status, edit_count} 또는 {error: 'not_found' | 'rejected' | 'quote_issued'}
create or replace function get_request_for_edit(p_id text, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  r requests;
begin
  if p_key is null or length(p_key) < 32 then
    return jsonb_build_object('error', 'not_found');
  end if;
  select * into r from requests where id = p_id and edit_key = p_key and type = 'delivery';
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;
  if r.status = 'rejected' then
    return jsonb_build_object('error', 'rejected');
  end if;
  if r.quote_issued_at is not null then
    return jsonb_build_object('error', 'quote_issued');
  end if;
  return jsonb_build_object('payload', r.payload, 'status', r.status, 'edit_count', r.edit_count);
end;
$$;

-- 수정 링크로 요청 내용을 고친다. 상태·스케줄 연결·키·견적서 발행 칸은 고객이 바꿀 수 없다.
-- 관리자가 아직 확인하지 않은 이전 수정이 있으면 payload_before_edit는 처음 값(관리자가 마지막으로 본 값)을 유지한다.
create or replace function update_request(
  p_id text, p_key text, p_payload jsonb,
  p_customer_name text, p_customer_phone text, p_customer_email text, p_summary text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r requests;
begin
  if p_key is null or length(p_key) < 32 or p_payload is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  select * into r from requests where id = p_id and edit_key = p_key and type = 'delivery' for update;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;
  if r.status = 'rejected' then
    return jsonb_build_object('error', 'rejected');
  end if;
  if r.quote_issued_at is not null then
    return jsonb_build_object('error', 'quote_issued');
  end if;
  update requests set
    payload = p_payload,
    customer_name = p_customer_name,
    customer_phone = p_customer_phone,
    customer_email = p_customer_email,
    summary = p_summary,
    edited_at = now(),
    edit_count = edit_count + 1,
    payload_before_edit = coalesce(payload_before_edit, payload)
  where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function get_request_for_edit(text, text) from public;
revoke execute on function update_request(text, text, jsonb, text, text, text, text) from public;
grant execute on function get_request_for_edit(text, text) to anon, authenticated;
grant execute on function update_request(text, text, jsonb, text, text, text, text) to anon, authenticated;

-- ===== 기존 DB에 적용할 때 (2026-11-06, 수정 링크) =====
-- alter table requests
--   add column edit_key text,
--   add column edited_at timestamptz,
--   add column edit_count int not null default 0,
--   add column payload_before_edit jsonb,
--   add column quote_issued_at timestamptz;
-- drop policy "누구나 요청 등록" on requests;
-- create policy "누구나 요청 등록" on requests for insert
--   with check (
--     edited_at is null and edit_count = 0
--     and payload_before_edit is null and quote_issued_at is null
--   );
-- 그리고 위의 함수 두 개와 revoke/grant 네 줄을 그대로 실행한다.
