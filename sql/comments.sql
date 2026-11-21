-- 테이블·칸·함수 설명 달기. Supabase Table Editor와 SQL Editor 스니펫(sql/editor/)에 이 설명이 보인다.
-- 데이터·권한은 바꾸지 않고 설명(메타데이터)만 붙이므로 여러 번 실행해도 되고, dev·demo 둘 다 실행한다.

-- ===== 고객 요청 (배송·이사 신청서)
comment on table requests is '고객 신청서. 배송 신청(dokgodali-delivery.html)과 이사 견적(dokgodali-quote-flow.html)이 들어온다. 고객은 등록만, 읽기·확정·거절은 관리자만.';
comment on column requests.id is '요청 번호 (req-타임스탬프)';
comment on column requests.type is 'delivery = 배송 신청, moving = 이사 견적';
comment on column requests.status is 'pending 대기 → confirmed 확정(스케줄 생성) / rejected 거절';
comment on column requests.customer_name is '신청인 이름 (payload에서 복사, 목록 표시용)';
comment on column requests.summary is '관리자 목록 한 줄 요약';
comment on column requests.payload is '신청서 전체 내용(JSON): 박스·물품, 접수 방식·일시, 주소, 수취인, 통관, 예상 금액 등';
comment on column requests.schedule_id is '확정 시 만든 스케줄 (schedules.id). 스케줄을 지우면 비워진다';
comment on column requests.edit_key is '고객 수정 링크의 비밀 키. 공개 읽기 불가';
comment on column requests.edited_at is '고객이 수정 링크로 마지막으로 고친 시각';
comment on column requests.edit_count is '고객 수정 횟수';
comment on column requests.payload_before_edit is '관리자가 마지막으로 확인한 내용. 값이 있으면 "수정됨, 확인 필요"';
comment on column requests.quote_issued_at is '관리자가 견적서 발행을 표시한 시각. 값이 있으면 고객 수정 잠김';

comment on table request_revisions is '고객 수정 이력. 수정할 때마다 고치기 전 내용이 쌓인다 (v1 = 처음 신청). 관리자만 읽기';
comment on column request_revisions.version is '버전 번호. 1 = 처음 신청한 내용';
comment on column request_revisions.payload is '그 버전의 신청서 전체 내용(JSON)';
comment on column request_revisions.created_at is '이 버전이 다음 수정으로 대체된 시각';

-- ===== 작업 일정
comment on table schedules is '이사·배송 작업 일정. 관리자가 만들고 크루를 배정한다. 로그인한 사람은 읽기, 쓰기는 관리자만';
comment on column schedules.job_type is 'moving = 이사, delivery = 배송';
comment on column schedules.job_date is '작업 날짜 (여러 날이면 시작일)';
comment on column schedules.end_date is '여러 날 작업의 종료일. 비어 있으면 하루짜리';
comment on column schedules.overall_time_range is '작업 시간대 (예: 09:00-13:00)';
comment on column schedules.origin_address is '상차지(픽업지) 주소';
comment on column schedules.dest_address is '하차지(배송지) 주소';
comment on column schedules.required_workers is '필요 인원';
comment on column schedules.notes is '현장 메모 (크루 WhatsApp 브리핑에도 쓰임)';
comment on column schedules.assignments is '배정된 크루 목록(JSON 배열)';
comment on column schedules.vehicles is '배정 차량 목록(JSON 배열, 차종·대수)';

comment on table availability is '크루의 날짜별 근무 가능 여부. 본인 것만 쓰고, 로그인한 사람은 모두 읽기';
comment on table work_logs is '크루 근무시간 기록. 크루가 제출하고 관리자가 승인·반려한다 (AZ-Dokumentation PDF의 원본)';
comment on column work_logs.status is 'pending 제출됨 → confirmed 승인 / rejected 반려(재제출 가능)';
comment on column work_logs.worked_hours is '실근무 시간 = 종료 - 시작 - 휴게';

-- ===== 계정·알림·기타
comment on table profiles is '관리자·크루 계정 정보. role = admin / crew';
comment on table push_subscriptions is '관리자 폰의 웹 푸시 구독 (새 요청·수정 알림용)';
comment on table keepalive is '무료 플랜 자동 일시정지 방지용 한 줄. GitHub Actions가 3일마다 keepalive()로 갱신';

comment on function is_admin() is '현재 로그인한 사람이 관리자인지. 모든 RLS 정책이 쓴다';
comment on function keepalive() is '자동 일시정지 방지 ping. keepalive 테이블 한 줄을 갱신';
comment on function get_request_for_edit(text, text) is '고객 수정 링크로 신청서를 불러온다 (견적서 발행 전·거절 안 된 요청만)';
comment on function update_request(text, text, jsonb, text, text, text, text) is '고객 수정 링크로 신청서를 고친다. 고치기 전 내용은 request_revisions에 쌓인다';
