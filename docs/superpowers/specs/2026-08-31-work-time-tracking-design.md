# 근무시간 제출/승인 & AZ-Dokumentation PDF 설계

- 날짜: 2026-08-31
- 대상 파일: `dokgodali-schedule.html`, `dokgodali-schedule-en.html`, `dokgodali-schedule.css`
- 관련 배경: 크루가 배정된 작업을 실제로 마쳤을 때 근무시간을 기록하고, 관리자가 이를 승인하며, 월말에 독일 근로시간법(ArbZG) 관점의 근무시간 증빙(AZ-Dokumentation) PDF를 생성할 수 있어야 한다.

## 1. 배경 및 목표

현재 `dokgodali-schedule.html`은 관리자가 크루를 작업에 배정하고(`schedules.assignments`), 크루는 배정된 시작 시간(`startTime`)만 확인할 수 있다. 실제로 몇 시에 시작해서 몇 시에 끝났는지, 그 시간이 얼마나 인정된 근무시간인지는 기록되지 않는다.

이 기능은 다음 흐름을 추가한다:

1. 크루가 실제 시작/종료 시간을 제출한다 (15분 단위).
2. 휴게시간이 독일 ArbZG 기준으로 자동 계산되어 실근무시간이 산출된다.
3. 관리자가 제출된 내용을 승인하거나 반려한다 (반려 시 사유 입력, 크루는 재제출 가능).
4. 크루는 승인/반려 상태와 함께 자신의 근무 이력을 확인할 수 있다.
5. 관리자는 크루+월을 선택해 그 달의 승인된 근무 기록을 AZ-Dokumentation 형식의 PDF로 다운로드할 수 있다.

## 2. 휴게시간 자동 계산 규칙

독일 ArbZG 기준, 순근무시간(종료-시작, 분 단위)에 따라 자동 차감:

```js
function calcBreakMinutes(workedMinutesRaw) {
  if (workedMinutesRaw > 9 * 60) return 45;
  if (workedMinutesRaw > 6 * 60) return 30;
  return 0;
}
```

`workedMinutes = workedMinutesRaw - breakMinutes`, `workedHours = workedMinutes / 60`.

검증 예시 (사용자 확인 완료):
- 07:00~16:00 (raw 540분/9h) → 30분 휴게 → 실근무 8.5h
- 07:00~17:00 (raw 600분/10h) → 45분 휴게 → 실근무 9.25h

자정을 넘기는 근무(종료 < 시작)는 이번 스코프에서 다루지 않는다 (독고달이 작업은 당일 내 종료가 일반적).

## 3. 데이터 모델 — `work_logs` 테이블 (신규, Supabase)

기존 `schedules.assignments` (jsonb 배열)는 배정 정보만 담당하고 건드리지 않는다. 근태 기록은 완전히 분리된 새 테이블로 관리한다.

```sql
create table work_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references schedules(id),
  user_id text not null,          -- CREW_USERS[].id 값
  job_date date not null,
  assigned_start text,            -- 참고용, 제출 시점 schedules.assignments 값 복사
  actual_start text not null,     -- 'HH:MM', 15분 단위
  actual_end text not null,
  break_minutes int not null,
  worked_hours numeric not null,
  status text not null default 'pending', -- 'pending' | 'confirmed' | 'rejected'
  reject_reason text,
  submitted_at timestamptz not null default now(),
  confirmed_at timestamptz
);
```

RLS는 현재 스케줄 테이블과 동일하게 미설정 상태로 둔다 (기존에 합의된 리스크, README.ko.md의 배포 전 고려사항 §2와 동일 카테고리).

클라이언트 상태에는 `state.workLogs` 배열을 추가하고, 앱 시작 시 `sb.from('work_logs').select('*')`로 전체 로드 후 realtime 구독(기존 `schedules` 구독 패턴과 동일하게)한다.

## 4. 크루 화면 (Crew Dashboard)

### 4.1 근무시간 제출

"오늘 작업" 카드 하단에 새 섹션 추가:

- 이미 그날 `work_logs`에 `pending` 또는 `confirmed` 항목이 있으면 제출 폼 대신 상태 표시(아래 4.3 참고).
- 없거나 `rejected` 상태면 제출 폼 노출:
  - 시작 시간 `<select>` (15분 간격, 예: 06:00~22:00 범위)
  - 종료 시간 `<select>` (동일)
  - 실시간으로 계산된 휴게시간/실근무시간 미리보기 텍스트 (`예상 근무시간: 8.5시간 (휴게 30분 자동 적용)`)
  - "제출" 버튼 → `work_logs`에 insert (재제출인 경우 기존 rejected row를 업데이트하며 status를 pending으로, reject_reason은 null로 초기화)

### 4.2 반려 상태 표시

`status === 'rejected'`인 항목은 카드에 "반려됨: {reject_reason}" 빨간 텍스트로 표시하고 제출 폼을 다시 노출한다.

### 4.3 승인 대기/완료 상태 표시

- `pending`: "제출 완료 · 승인 대기중" 회색 배지
- `confirmed`: "승인됨" 초록 배지 + 실근무시간

### 4.4 내 근무 이력

크루 대시보드에 새 섹션 "내 근무 이력" 추가: 본인의 `work_logs`를 날짜 내림차순으로 리스트, 각 행에 날짜/시작-종료/휴게/근무시간/상태 표시. 무한 스크롤이나 페이지네이션은 하지 않고 전체를 보여준다 (데이터 규모상 프로토타입에서는 문제없음).

## 5. 관리자 화면 (Admin)

### 5.1 새 탭: "근무시간 승인"

기존 role-switcher 옆 관리자 전용 탭 구조에 새 섹션 추가 (기존 `renderAdminCalendar`/`renderAdminSelectedDateSchedules`와 병렬 구조). `status === 'pending'`인 `work_logs`를 날짜 오름차순으로 리스트:

```
[크루명] 09/03 07:00–16:00 (휴게 30분, 실근무 8.5h)
  [승인]  [반려]
```

- [승인] 클릭 → `status='confirmed'`, `confirmed_at=now()` 업데이트.
- [반려] 클릭 → 사유 입력 프롬프트(간단한 인라인 텍스트 입력 또는 `prompt()` 유사 UI — 기존 앱에 모달 컴포넌트가 없으므로 작은 인라인 textarea + 확인 버튼으로 구현) → `status='rejected'`, `reject_reason` 저장.

승인/반려된 항목은 이 목록에서 사라진다 (pending만 표시).

## 6. 월말 AZ-Dokumentation PDF

### 6.1 생성 방식

**온디맨드 생성.** 승인 시점마다 파일을 미리 만들어 저장하지 않는다. 관리자가 "근무시간 승인" 탭 상단에서 크루 선택 + 연월 선택 후 "PDF 다운로드" 버튼을 누르면, 해당 크루의 해당 월 `confirmed` `work_logs`를 조회해 그 자리에서 jsPDF로 생성한다. 기존 `dokgodali-quote-flow.html`의 `generateAndSaveInvoicePdf()` 패턴(inlined jsPDF 사용)을 재사용한다.

이유: 근무 기록은 관리자의 정정(반려→재제출→재승인)으로 사후에 바뀔 수 있어, 매번 최신 확정 데이터를 소스로 재생성하는 편이 "저장된 PDF가 실제 데이터와 어긋나는" 문제를 원천적으로 없앤다. 별도 파일 스토리지 설정도 필요 없어 현재 아키텍처(정적 HTML + Supabase 테이블) 수준에 맞는다.

### 6.2 PDF 레이아웃

표 형식, 한 페이지에 한 크루/한 달:

```
Arbeitszeitdokumentation
회사명 (COMPANY_INFO.name)  |  크루: {name}  |  {YYYY년 MM월}

날짜        시작     종료     휴게     근무시간
2026-09-03  07:00    16:00    0:30     8.50h
2026-09-05  08:00    17:30    0:45     8.75h
...
                                합계:    XX.XXh
```

하단에 "본 문서는 §16 ArbZG에 따른 근로시간 기록입니다" 같은 안내 문구 1줄 추가 (법적 자문 전 데모 문구, README.ko.md §4 "법적/세무 검토" 항목과 동일하게 실제 서비스 전환 전 검토 필요 대상으로 남겨둔다).

### 6.3 실서비스 전환 시 향후 과제 (이번 스코프 아님)

- 월 마감(lock) 개념: 마감된 달의 `work_logs`는 수정 불가로 잠그고, 마감 시점 스냅샷 PDF 1부를 Supabase Storage에 아카이브해 2년 보관 의무를 충족.
- 이 항목은 README.ko.md §3(배포 전 고려사항)에 8번 항목으로 추가한다 (본 스펙 구현 범위에는 포함하지 않음).

## 7. 영문 버전 (`dokgodali-schedule-en.html`)

한글 버전 구현 완료 후 동일한 구조로 번역 적용 (기존 `scripts/translate_schedule.py` 패턴 재사용 가능). UI 라벨만 번역하고 `work_logs` 테이블/로직은 완전히 공유(같은 Supabase 백엔드, 같은 데이터를 언어만 다르게 표시).

## 8. 테스트 방법

자동화된 테스트 프레임워크가 없는 정적 HTML 프로토타입이므로, 기존 관례대로 로컬 HTTP 서버 + 브라우저 자동화(claude-in-chrome)로 검증한다:

1. 크루로 로그인 → 오늘 작업에 시작/종료 시간 입력 → 제출 → 미리보기 계산값이 §2 규칙과 일치하는지 확인.
2. 관리자로 전환 → "근무시간 승인" 탭에서 방금 제출한 항목이 pending으로 보이는지 확인.
3. 승인 클릭 → 크루 화면으로 돌아가 상태가 "승인됨"으로 바뀌는지 확인.
4. 반려 케이스: 반려 사유 입력 → 크루 화면에 사유가 표시되고 재제출 폼이 다시 열리는지 확인.
5. PDF 다운로드: 승인된 항목 1건 이상 있는 크루+월 선택 후 다운로드 → 생성된 PDF에 날짜/시간/휴게/합계가 올바르게 들어갔는지 확인.

## 9. 범위 밖 (Out of Scope)

- 자정을 넘기는 근무 처리
- 월 마감/잠금, PDF 아카이브 저장 (§6.3)
- 관리자가 크루 제출 시간을 직접 수정하는 기능 (승인/반려만 가능, 사용자 확정)
- 결제/급여 연동
