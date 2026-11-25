-- 배송 견적서(Angebot) 발행: 회사 설정, 견적서·고객 번호, 발행한 견적 내용.
-- SQL Editor에 전체를 붙여 넣고 한 번 실행한다 (여러 번 실행해도 된다). dev 먼저, demo는 클라이언트 확인 뒤.
-- 회사 주소·세금번호·은행 정보는 공개 저장소에 두지 않으려고 이 파일에 넣지 않는다.
-- 값은 관리자 화면의 '견적서 설정'에서 넣는다 (또는 internal/의 설정 SQL).

-- 1) 회사 설정: 한 줄짜리 표. 관리자만 읽고 쓴다.
create table if not exists company_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table company_settings enable row level security;
drop policy if exists "관리자만 회사 설정 읽기" on company_settings;
create policy "관리자만 회사 설정 읽기" on company_settings for select to authenticated using (is_admin());
drop policy if exists "관리자만 회사 설정 쓰기" on company_settings;
create policy "관리자만 회사 설정 쓰기" on company_settings for all to authenticated using (is_admin()) with check (is_admin());
insert into company_settings (id) values (1) on conflict (id) do nothing;

-- 2) 번호: 견적서 AN-2097부터, 고객 번호 2101부터 (스캔 샘플 AN-2096 · 2100의 다음).
--    시작 번호를 바꾸려면: select setval('angebot_no_seq', 다음번호 - 1);
create sequence if not exists angebot_no_seq start 2097;
create sequence if not exists customer_no_seq start 2101;

-- 3) 요청에 견적서 칸 추가
alter table requests add column if not exists angebot_no text unique;
alter table requests add column if not exists customer_no int;
alter table requests add column if not exists angebot jsonb;

-- 4) 견적서 번호 매기기. 이미 번호가 있으면 그대로 돌려준다 (다시 받기·재발행).
--    고객 번호는 같은 이메일로 전에 받은 번호가 있으면 다시 쓴다.
create or replace function assign_angebot_numbers(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r requests%rowtype;
  v_customer int;
begin
  if not is_admin() then
    raise exception 'admin only';
  end if;
  select * into r from requests where id = p_id for update;
  if not found then
    raise exception 'request not found';
  end if;
  if r.angebot_no is null then
    r.angebot_no := 'AN-' || nextval('angebot_no_seq');
  end if;
  if r.customer_no is null then
    select customer_no into v_customer from requests
      where customer_no is not null and r.customer_email is not null and r.customer_email <> ''
        and lower(customer_email) = lower(r.customer_email)
      order by created_at limit 1;
    r.customer_no := coalesce(v_customer, nextval('customer_no_seq')::int);
  end if;
  update requests set angebot_no = r.angebot_no, customer_no = r.customer_no where id = p_id;
  return jsonb_build_object('angebot_no', r.angebot_no, 'customer_no', r.customer_no);
end;
$$;
revoke all on function assign_angebot_numbers(text) from public, anon;
grant execute on function assign_angebot_numbers(text) to authenticated;

comment on table company_settings is '견적서 PDF에 찍는 회사 정보(주소·연락처·세금번호·은행·담당자·세율). 한 줄, 관리자만';
comment on column requests.angebot_no is '견적서 번호 (AN-2097). 한 번 받으면 발행 취소 후에도 유지';
comment on column requests.customer_no is '고객 번호. 같은 이메일이면 같은 번호';
comment on column requests.angebot is '발행한 견적서 내용(JSON): 항목·금액·문구. PDF를 같은 내용으로 다시 만들 때 쓴다';
comment on function assign_angebot_numbers(text) is '견적서·고객 번호를 매긴다 (이미 있으면 그대로). 관리자만';
