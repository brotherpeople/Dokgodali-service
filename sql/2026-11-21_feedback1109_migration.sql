-- 11/09 피드백 반영분 demo 마이그레이션 (dev에는 2026-11-21 적용 완료). SQL Editor에 전체를 붙여 넣고 한 번만 실행한다.
-- 1) 물품 사진 업로드 버킷 (sql/storage.sql과 같음)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "누구나 물품 사진 업로드" on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'item-images');

-- 2) 고객 수정 이력(버전) 테이블과 update_request() 교체 (sql/requests.sql과 같음)
create table request_revisions (
  id bigint generated always as identity primary key,
  request_id text not null references requests(id) on delete cascade,
  version int not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (request_id, version)
);
alter table request_revisions enable row level security;
create policy "관리자만 수정 이력 읽기" on request_revisions for select
  using (is_admin());

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
  insert into request_revisions (request_id, version, payload)
  values (p_id, r.edit_count + 1, r.payload);
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
