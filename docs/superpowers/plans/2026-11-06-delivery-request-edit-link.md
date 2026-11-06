# 배송 신청 수정 링크 구현 계획

작성일: 2026-11-06 · 대상: `dokgodali-delivery.html`, `dokgodali-schedule.html`, `sql/requests.sql`, `supabase/functions/notify-new-request`

관련 업무 프로세스(`수정사항.md`): 2. 누락 정보 확인 및 재요청 → 3. 기존 신청서 불러오기 후 누락 정보 재기입 → 5. 견적서 발행

## 1. 결정된 사항

| 항목 | 결정 |
|---|---|
| 방식 | 로그인 없이 **수정 링크**로 수정한다 (구글폼 "응답 수정"과 같은 방식). 인증 코드 절차 없음 |
| 링크 전달 | 신청 완료 화면에 표시하고, 신청인 이메일로도 발송 |
| 수정 가능 기간 | **견적서 발행 전까지.** 관리자 확정(confirmed) 뒤에도 견적서 발행 전이면 수정 가능 |
| 관리자 알림 | 수정될 때마다 관리자에게 푸시 알림 |
| 메일 발송 | 현재 Supabase Auth용 SMTP가 설정되어 있음(클라이언트 명의 아님 → 추후 교체). 수정 링크 메일도 같은 메일 서비스를 쓴다 |

## 2. 구조

```
신청 제출 ──▶ requests (edit_key 저장)
   │            │
   │            └─ DB Webhook(INSERT) ─▶ notify-new-request ─▶ 관리자 푸시 + 신청인 메일(수정 링크)
   └─ 완료 화면에 수정 링크 표시

수정 링크 열기 (?edit=<id>&key=<edit_key>)
   └─ RPC get_request_for_edit(id, key) ─▶ 수정 가능하면 payload 반환 ─▶ 폼 채우기
다시 제출
   └─ RPC update_request(id, key, payload…) ─▶ requests 갱신(edited_at, edit_count)
                                              └─ DB Webhook(UPDATE) ─▶ 관리자 푸시 "요청 수정됨"
```

### 2.1 DB (`sql/requests.sql`에 추가)

- 칸 추가
  - `edit_key text` — 신청 시 브라우저가 `crypto.randomUUID()`로 만든 값. 공개 읽기 권한이 없으므로 밖으로 노출되지 않는다.
  - `edited_at timestamptz`, `edit_count int default 0` — 마지막 수정 시각, 수정 횟수
  - `quote_issued_at timestamptz` — 견적서 발행 시각. 이 값이 있으면 수정 불가
- 함수 2개 (`security definer`, anon 실행 허용, 공개 테이블 권한은 지금처럼 insert만)
  - `get_request_for_edit(p_id, p_key)` → id·key가 맞고 `status <> 'rejected'`이며 `quote_issued_at is null`이면 `payload`, `status`를 돌려준다. 아니면 이유 코드(없음 / 견적서 발행됨 / 거절됨)
  - `update_request(p_id, p_key, p_payload, p_customer_name, p_customer_phone, p_customer_email, p_summary)` → 같은 조건 확인 후 해당 칸과 `edited_at = now()`, `edit_count + 1`만 갱신. `status`, `schedule_id`, `edit_key`, `quote_issued_at`은 고객이 바꿀 수 없다
- 키 비교는 상수 시간 비교가 필요할 만큼 민감하지 않다고 보고 단순 비교. 키는 UUID v4(122비트 무작위)

### 2.2 신청 폼 (`dokgodali-delivery.html`)

1. 신규 제출: `edit_key`를 만들어 insert에 포함. 완료 화면에 "수정 링크" (복사 버튼) 표시
2. 수정 모드: URL에 `edit`, `key`가 있으면
   - RPC로 불러와서 **모든 칸을 payload로 다시 채운다** (박스·물품, 접수 방식·날짜·시간·타지역, 주소 4칸 ×2, 초인종, 배송지·미정, 수취인, 예약자, 통관 구분, 이사화물·입국일, 촬영 동의, 유입 경로, 체크 항목)
   - 상단에 "신청 수정 중 · 요청 번호 …" 표시, 제출 버튼 문구를 "수정 내용 저장"으로
   - 불러오기 실패 시 이유별 안내 (링크 오류 / 견적서가 이미 발행되어 관리자에게 연락 / 거절된 요청)
3. 저장: `update_request` 호출. 완료 화면은 "수정되었습니다"
4. 채우기 함수는 payload 형식이 바뀔 때 함께 고쳐야 하므로 `payload → 폼`, `폼 → payload`를 한곳에 모은다

### 2.3 관리자 화면 (`dokgodali-schedule.html`)

- 요청 카드에 "수정됨 n회 · 시각" 배지
- **견적서 발행 표시** 버튼 → `quote_issued_at = now()` (되돌리기 버튼 포함). 이후 고객 수정 불가
- 확정된 요청이 수정되면: 스케줄은 **자동으로 바꾸지 않는다**(관리자 수정·크루 배정 보호). 카드와 스케줄 상세에 "확정 후 고객이 수정함 — 스케줄 확인 필요" 표시

### 2.4 알림·메일 (`supabase/functions/notify-new-request`)

- Database Webhook 추가: `requests - UPDATE` → `edited_at`이 바뀐 경우에만 관리자 푸시 "배송 요청 수정됨: 이름"
- `requests - INSERT` 처리에 신청인 메일 발송 추가: 접수 확인 + 수정 링크 (+ 신청 내용 요약)
- 메일 발송 정보는 Edge Function Secrets에 둔다 (SMTP 호스트·계정 또는 메일 서비스 API 키, 보내는 주소). 클라이언트 명의로 바꿀 때 Secrets만 교체

## 3. 작업 순서 (기능별 커밋)

1. DB: 칸 추가 + RPC 2개 + SQL 파일 갱신 → dev DB에 적용, SQL로 권한 확인 (anon이 select 못 하고 RPC로만 접근)
2. 폼: payload ↔ 폼 변환 함수 정리 + 수정 모드 불러오기 (저장은 아직)
3. 폼: 수정 저장 + 완료 화면 수정 링크
4. 관리자: 수정 배지, 견적서 발행 표시, 확정 후 수정 경고
5. Edge Function: 수정 알림 푸시 + Webhook 등록
6. Edge Function: 신청인 메일(수정 링크) 발송
7. 테스트: 신규 → 링크로 불러오기 → 수정 → 관리자 확정 → 다시 수정 → 견적서 발행 → 수정 차단. 단계별 스냅샷

## 4. 확인이 필요한 것

| # | 내용 | 기본안 |
|---|---|---|
| 1 | 현재 SMTP가 어떤 메일 서비스인지 (Edge Function에서 같은 계정으로 보낼 수 있는지) | 같은 서비스 사용 |
| 2 | 확정 후 수정 시 스케줄 반영 방식 | 자동 반영 안 함, 관리자에게 변경 표시 |
| 3 | 거절된 요청의 수정 | 불가 (새로 신청) |
| 4 | 메일에 신청 내용 사본까지 넣을지 (구글폼처럼) | 넣음 (요약) |
| 5 | 수정 링크 유효기간 | 견적서 발행 전까지 무기한 |
| 6 | 이사 견적(`quote-flow`) 요청에도 같은 기능 | 이번 범위 제외 |
