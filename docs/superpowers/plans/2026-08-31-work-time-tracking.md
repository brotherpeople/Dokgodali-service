# 근무시간 제출/승인 & AZ-Dokumentation PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 크루가 실제 근무 시작/종료 시간을 제출하고, 관리자가 승인/반려하며, 승인된 기록을 월별 AZ-Dokumentation PDF로 다운로드할 수 있게 한다.

**Architecture:** 기존 `dokgodali-schedule.html`(정적 HTML + Supabase 클라이언트)에 새 `work_logs` 테이블 기반 상태(`state.workLogs`)와 크루 제출 UI, 관리자 승인 탭, jsPDF/html2canvas 기반 PDF 생성을 추가한다. 별도 백엔드/서버 코드는 없다 — 모든 로직은 클라이언트 JS + Supabase REST/Realtime.

**Tech Stack:** Vanilla JS, Supabase JS client v2, html2canvas 1.4.1 + jsPDF 2.5.1(둘 다 `dokgodali-quote-flow.html`에서 인라인 복사), 순수 CSS(외부 `dokgodali-schedule.css`).

**Spec:** `docs/superpowers/specs/2026-08-31-work-time-tracking-design.md`

## Global Constraints

- 휴게시간 계산: 순근무시간(raw) 9시간 초과 → 45분, 6시간 초과 → 30분, 그 외 → 0분 (스펙 §2, ArbZG 기준). 자정을 넘기는 근무는 이번 스코프 밖.
- 관리자는 크루가 제출한 시간을 직접 수정할 수 없다 — 승인 또는 반려(사유 입력)만 가능.
- 근태 데이터는 `schedules.assignments`와 완전히 분리된 새 `work_logs` 테이블에 저장한다.
- PDF는 저장하지 않고 항상 온디맨드로(관리자가 크루+연월 선택 후 버튼 클릭 시) 최신 `confirmed` 데이터로 재생성한다.
- RLS는 이번 스코프에서 설정하지 않는다 (기존 `schedules`/`availability` 테이블과 동일한 기존 리스크 범주 — README.ko.md §3-2에 이미 문서화됨).
- 모든 변경은 `dokgodali-schedule.html`(한국어)에 먼저 구현/검증한 뒤, 마지막 태스크에서 `dokgodali-schedule-en.html`에 동일하게 반영한다.
- 이 프로젝트에는 자동화 테스트 프레임워크가 없다. "테스트"는 (a) 브라우저 콘솔에서 순수 함수를 직접 호출해 반환값을 확인하거나 (b) 로컬 HTTP 서버(`python3 -m http.server <port>`)로 파일을 서빙한 뒤 claude-in-chrome으로 실제 클릭/입력을 수행해 화면을 확인하는 방식이다.

---

### Task 1: `work_logs` Supabase 테이블 생성 + 상태 로딩

**Files:**
- Modify: `dokgodali-schedule.html:283-290` (state 객체), `:304-328` (loadDataFromSupabase), `:330-348` (mapScheduleFromDB 뒤에 mapWorkLogFromDB 추가), `:350-365` (setupRealtime)
- Create (문서용, 실행은 사용자가 Supabase 대시보드에서 수행): `sql/work_logs.sql`

**Interfaces:**
- Produces: `state.workLogs` (배열, 각 항목은 `mapWorkLogFromDB`가 반환하는 shape), `mapWorkLogFromDB(w)` 함수. 이후 태스크는 모두 `state.workLogs`와 이 shape을 사용한다:
  ```js
  { id, scheduleId, userId, jobDate, assignedStart, actualStart, actualEnd,
    breakMinutes, workedHours, status, rejectReason, submittedAt, confirmedAt }
  ```

- [ ] **Step 1: Supabase 테이블 SQL 작성**

`sql/work_logs.sql` 파일 생성:

```sql
create table work_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references schedules(id),
  user_id text not null,
  job_date date not null,
  assigned_start text,
  actual_start text not null,
  actual_end text not null,
  break_minutes int not null,
  worked_hours numeric not null,
  status text not null default 'pending',
  reject_reason text,
  submitted_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter publication supabase_realtime add table work_logs;
```

- [ ] **Step 2: 사용자에게 SQL 실행 요청**

이 단계는 코드 변경이 아니라 사람이 해야 하는 작업이다. 사용자에게 다음을 안내한다: "Supabase 대시보드 → SQL Editor에서 `sql/work_logs.sql` 내용을 실행해 `work_logs` 테이블을 만들어주세요. Realtime publication에도 추가해야 관리자/크루 화면이 실시간으로 동기화됩니다." 사용자가 실행을 완료했다고 확인하기 전까지 이후 태스크의 브라우저 검증(Step 5 이후)은 보류한다. 코드 작성 자체는 계속 진행 가능하다.

- [ ] **Step 3: state와 매핑 함수 추가**

`dokgodali-schedule.html:283-290`의 `state` 객체를 다음으로 교체:

```js
let state = {
  currentRole: 'admin',
  currentYear: 2026,
  currentMonth: 8,
  selectedDate: '2026-09-01',
  schedules: [],
  availability: {},
  workLogs: [],
  adminTab: 'dispatch'
};
```

`mapScheduleFromDB` 함수(현재 `:330-348`) 바로 뒤에 추가:

```js
function mapWorkLogFromDB(w) {
  return {
    id: w.id,
    scheduleId: w.schedule_id,
    userId: w.user_id,
    jobDate: w.job_date,
    assignedStart: w.assigned_start,
    actualStart: w.actual_start,
    actualEnd: w.actual_end,
    breakMinutes: w.break_minutes,
    workedHours: w.worked_hours,
    status: w.status,
    rejectReason: w.reject_reason,
    submittedAt: w.submitted_at,
    confirmedAt: w.confirmed_at
  };
}
```

- [ ] **Step 4: 로딩/실시간 구독에 work_logs 추가**

`loadDataFromSupabase` 함수(`:304-328`) 안, availability 조회 블록 뒤에 추가:

```js
    // 3. Fetch work logs
    const { data: workLogsData } = await sb.from('work_logs').select('*');
    if (workLogsData) {
      state.workLogs = workLogsData.map(mapWorkLogFromDB);
    }
```

`setupRealtime` 함수(`:350-365`)의 `.subscribe()` 호출 전에 체이닝 추가:

```js
    .on('postgres_changes', { event: '*', schema: 'public', table: 'work_logs' }, async () => {
      await loadDataFromSupabase();
      renderApp();
    })
```

- [ ] **Step 5: 사용자가 SQL을 실행했다면 브라우저로 확인**

`sql/work_logs.sql`이 실행되었다고 사용자가 확인해준 경우에만 진행. 로컬 서버 기동 후 claude-in-chrome으로 `dokgodali-schedule.html`을 열고 콘솔에서 확인:

```js
await loadDataFromSupabase(); state.workLogs
```

Expected: 에러 없이 빈 배열 `[]` 반환 (아직 데이터 없음 — 테이블 존재 자체를 확인하는 것).

- [ ] **Step 6: Commit**

```bash
git add dokgodali-schedule.html sql/work_logs.sql
git commit -m "Add work_logs table schema and load/subscribe wiring"
```

---

### Task 2: 휴게시간 자동 계산 함수

**Files:**
- Modify: `dokgodali-schedule.html` — `vehicleDutyLabel` 함수(`:278-281`) 바로 뒤에 추가

**Interfaces:**
- Consumes: 없음 (순수 함수)
- Produces: `timeToMinutes(hhmm)`, `calcBreakMinutes(rawMinutes)`, `calcWorkLog(actualStart, actualEnd)` — 이후 태스크(3, 4, 6)에서 그대로 사용.
  - `calcWorkLog(start, end)`는 `{ breakMinutes, workedHours }`를 반환한다.

- [ ] **Step 1: 함수 작성**

```js
function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function calcBreakMinutes(rawMinutes) {
  if (rawMinutes > 9 * 60) return 45;
  if (rawMinutes > 6 * 60) return 30;
  return 0;
}

function calcWorkLog(actualStart, actualEnd) {
  const rawMinutes = timeToMinutes(actualEnd) - timeToMinutes(actualStart);
  const breakMinutes = calcBreakMinutes(rawMinutes);
  const workedHours = Math.round(((rawMinutes - breakMinutes) / 60) * 100) / 100;
  return { breakMinutes, workedHours };
}
```

- [ ] **Step 2: 브라우저 콘솔로 검증**

claude-in-chrome으로 페이지를 열고 콘솔에서:

```js
JSON.stringify(calcWorkLog('07:00', '16:00'))
JSON.stringify(calcWorkLog('07:00', '17:00'))
JSON.stringify(calcWorkLog('09:00', '14:00'))
```

Expected:
- `'07:00'~'16:00'` → `{"breakMinutes":30,"workedHours":8.5}`
- `'07:00'~'17:00'` → `{"breakMinutes":45,"workedHours":9.25}`
- `'09:00'~'14:00'` (5h, 6시간 이하) → `{"breakMinutes":0,"workedHours":5}`

세 값이 스펙 §2의 예시와 정확히 일치해야 한다.

- [ ] **Step 3: Commit**

```bash
git add dokgodali-schedule.html
git commit -m "Add ArbZG-based break time calculation"
```

---

### Task 3: 크루 근무시간 제출 폼

**Files:**
- Modify: `dokgodali-schedule.html:82-83`(HTML, `crew-today-section` 안), `renderCrewDashboard()`(`:613-670`)
- Modify: `dokgodali-schedule.css` (새 클래스 추가)

**Interfaces:**
- Consumes: `state.workLogs`, `calcWorkLog(start, end)` (Task 2), `mapWorkLogFromDB` (Task 1), `TODAY_DATE`, `CREW_USERS`
- Produces: `renderWorklogSection(myJob, currentUserId)` — Task 4가 같은 곳에서 호출 순서를 이어받음. `submitWorklog(scheduleId)` 전역 함수.

- [ ] **Step 1: HTML 폼 추가**

`dokgodali-schedule.html`의 `today-hero-card` 닫는 `</div>`(현재 82번 줄) 바로 뒤, `crew-today-section`의 닫는 `</div>`(83번 줄) 전에 삽입:

```html
  <div id="crew-worklog-section" class="card worklog-card hidden">
    <div class="card-title">근무시간 제출</div>
    <div id="worklog-form-view">
      <div class="worklog-time-row">
        <select id="worklog-start-select" class="worklog-time-select"></select>
        <span>~</span>
        <select id="worklog-end-select" class="worklog-time-select"></select>
      </div>
      <div id="worklog-preview" class="worklog-preview"></div>
      <button class="btn btn-primary" id="worklog-submit-btn" style="width:100%;">제출</button>
    </div>
    <div id="worklog-status-view" class="hidden"></div>
  </div>
```

- [ ] **Step 2: CSS 추가**

`dokgodali-schedule.css` 파일 끝에 추가:

```css
.worklog-card { margin-top: 12px; }
.worklog-time-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.worklog-time-select { flex: 1; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 13px; }
.worklog-preview { font-size: 12.5px; color: var(--text-secondary); margin-bottom: 10px; }
.worklog-status-badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
.worklog-status-pending { background: #f1f5f9; color: #475569; }
.worklog-status-confirmed { background: #dcfce7; color: #166534; }
.worklog-status-rejected { background: #fee2e2; color: #b91c1c; }
```

- [ ] **Step 3: 시간 옵션 채우기 + 미리보기 + 제출 함수**

`dokgodali-schedule.html`에서, `calcWorkLog` 함수(Task 2) 뒤에 추가:

```js
function populateWorklogTimeSelects() {
  const starts = document.getElementById('worklog-start-select');
  const ends = document.getElementById('worklog-end-select');
  if (!starts || starts.options.length > 0) return;
  for (let m = 6 * 60; m <= 22 * 60; m += 15) {
    const h = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const label = `${h}:${mm}`;
    starts.appendChild(new Option(label, label));
    ends.appendChild(new Option(label, label));
  }
  starts.value = '07:00';
  ends.value = '16:00';
}

function updateWorklogPreview() {
  const start = document.getElementById('worklog-start-select').value;
  const end = document.getElementById('worklog-end-select').value;
  const preview = document.getElementById('worklog-preview');
  const raw = timeToMinutes(end) - timeToMinutes(start);
  if (raw <= 0) {
    preview.textContent = '종료 시간은 시작 시간보다 늦어야 합니다.';
    return;
  }
  const { breakMinutes, workedHours } = calcWorkLog(start, end);
  preview.textContent = `예상 근무시간: ${workedHours}시간 (휴게 ${breakMinutes}분 자동 적용)`;
}

async function submitWorklog(scheduleId) {
  const currentUserId = state.currentRole;
  const start = document.getElementById('worklog-start-select').value;
  const end = document.getElementById('worklog-end-select').value;
  const raw = timeToMinutes(end) - timeToMinutes(start);
  if (raw <= 0) return;
  const { breakMinutes, workedHours } = calcWorkLog(start, end);

  const existing = state.workLogs.find(w => w.scheduleId === scheduleId && w.userId === currentUserId);
  const myJob = state.schedules.find(s => s.id === scheduleId);
  const myAssign = myJob.assignments.find(a => a.userId === currentUserId);

  const row = {
    schedule_id: scheduleId,
    user_id: currentUserId,
    job_date: myJob.jobDate,
    assigned_start: myAssign.startTime,
    actual_start: start,
    actual_end: end,
    break_minutes: breakMinutes,
    worked_hours: workedHours,
    status: 'pending',
    reject_reason: null,
    submitted_at: new Date().toISOString(),
    confirmed_at: null
  };

  if (existing) {
    await sb.from('work_logs').update(row).eq('id', existing.id);
  } else {
    await sb.from('work_logs').insert(row);
  }
  await loadDataFromSupabase();
  renderApp();
}
```

- [ ] **Step 4: renderWorklogSection 작성 및 renderCrewDashboard에 연결**

같은 파일에 `renderWorklogSection` 추가:

```js
function renderWorklogSection(myJob, currentUserId) {
  const section = document.getElementById('crew-worklog-section');
  section.classList.remove('hidden');
  populateWorklogTimeSelects();

  const formView = document.getElementById('worklog-form-view');
  const statusView = document.getElementById('worklog-status-view');
  const existing = state.workLogs.find(w => w.scheduleId === myJob.id && w.userId === currentUserId);

  if (existing && existing.status !== 'rejected') {
    formView.classList.add('hidden');
    statusView.classList.remove('hidden');
    const badgeClass = existing.status === 'confirmed' ? 'worklog-status-confirmed' : 'worklog-status-pending';
    const badgeText = existing.status === 'confirmed' ? '승인됨' : '제출 완료 · 승인 대기중';
    statusView.innerHTML = `
      <span class="worklog-status-badge ${badgeClass}">${badgeText}</span>
      <div style="font-size:13px;">${existing.actualStart} ~ ${existing.actualEnd} (휴게 ${existing.breakMinutes}분, 실근무 ${existing.workedHours}시간)</div>
    `;
  } else {
    statusView.classList.add('hidden');
    formView.classList.remove('hidden');
    if (existing && existing.status === 'rejected') {
      formView.insertAdjacentHTML('afterbegin', `<div class="worklog-status-badge worklog-status-rejected">반려됨: ${existing.rejectReason || ''}</div>`);
    }
    document.getElementById('worklog-start-select').onchange = updateWorklogPreview;
    document.getElementById('worklog-end-select').onchange = updateWorklogPreview;
    document.getElementById('worklog-submit-btn').onclick = () => submitWorklog(myJob.id);
    updateWorklogPreview();
  }
}
```

`renderCrewDashboard()`(`:613-670`) 안에서, `if (myJob) { ... }` 블록의 마지막(현재 659번 줄 `document.getElementById('crew-notes-text')...` 다음) 바로 뒤, `} else {` 이전에 한 줄 추가:

```js
    renderWorklogSection(myJob, currentUserId);
```

`else` 블록(작업 없음)에는 다음을 추가해 폼을 숨긴다:

```js
    document.getElementById('crew-worklog-section').classList.add('hidden');
```

- [ ] **Step 5: 브라우저로 제출 흐름 확인**

로컬 서버로 서빙 후 claude-in-chrome:
1. 크루(오늘 배정된 사람, 예: 홍길동)로 역할 전환.
2. "근무시간 제출" 카드가 보이는지 확인 — 시작/종료 select 기본값 07:00/16:00, 미리보기에 "예상 근무시간: 8.5시간 (휴게 30분 자동 적용)" 표시 확인.
3. 종료 시간을 17:00으로 바꾸면 미리보기가 "9.25시간 (휴게 45분)"으로 즉시 갱신되는지 확인.
4. "제출" 클릭 → 콘솔에서 `state.workLogs` 확인 → 방금 제출한 항목이 `status: 'pending'`으로 존재하는지 확인. 화면도 "제출 완료 · 승인 대기중" 배지로 바뀌는지 확인.

- [ ] **Step 6: Commit**

```bash
git add dokgodali-schedule.html dokgodali-schedule.css
git commit -m "Add crew work-time submission form"
```

---

### Task 4: 크루 근무 이력 섹션

**Files:**
- Modify: `dokgodali-schedule.html:102` 뒤(HTML), `renderCrewDashboard()`
- Modify: `dokgodali-schedule.css`

**Interfaces:**
- Consumes: `state.workLogs`, `CREW_USERS`
- Produces: `renderCrewHistory(currentUserId)` — 다른 태스크에서 재사용하지 않는 말단 함수.

- [ ] **Step 1: HTML 섹션 추가**

`dokgodali-schedule.html`의 `crew-calendar-section` 닫는 `</div>`(현재 102번 줄) 바로 뒤, `<!-- ADMIN VIEW -->` 주석 전에 삽입:

```html
  <!-- CREW VIEW: Work Log History -->
  <div id="crew-history-section" class="card hidden" style="margin-top:12px;">
    <div class="card-title">내 근무 이력</div>
    <div id="crew-history-list"></div>
  </div>
```

- [ ] **Step 2: CSS 추가**

`dokgodali-schedule.css` 끝에 추가:

```css
.worklog-history-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 12.5px; }
.worklog-history-item:last-child { border-bottom: none; }
.worklog-history-empty { color: var(--text-muted); font-size: 12.5px; padding: 8px 0; }
```

- [ ] **Step 3: 렌더 함수 작성**

```js
function renderCrewHistory(currentUserId) {
  const section = document.getElementById('crew-history-section');
  section.classList.remove('hidden');
  const list = document.getElementById('crew-history-list');
  const myLogs = state.workLogs
    .filter(w => w.userId === currentUserId)
    .sort((a, b) => b.jobDate.localeCompare(a.jobDate));

  if (myLogs.length === 0) {
    list.innerHTML = '<div class="worklog-history-empty">아직 제출한 근무 기록이 없습니다.</div>';
    return;
  }

  const statusLabel = { pending: '승인 대기', confirmed: '승인됨', rejected: '반려됨' };
  list.innerHTML = myLogs.map(w => `
    <div class="worklog-history-item">
      <span>${w.jobDate} · ${w.actualStart}~${w.actualEnd}</span>
      <span>휴게 ${w.breakMinutes}분 · ${w.workedHours}h · ${statusLabel[w.status]}</span>
    </div>
  `).join('');
}
```

`renderCrewDashboard()`(`:613-670`) 함수 맨 끝, `renderCrewCalendar();` 호출 다음 줄에 추가:

```js
  renderCrewHistory(currentUserId);
```

- [ ] **Step 4: 브라우저로 확인**

claude-in-chrome으로 Task 3에서 제출한 크루로 전환 → 화면 하단에 "내 근무 이력" 카드가 보이고, 방금 제출한 항목이 "승인 대기" 상태로 표시되는지 확인. 아직 아무것도 제출하지 않은 다른 크루로 전환했을 때는 "아직 제출한 근무 기록이 없습니다."가 보이는지 확인.

- [ ] **Step 5: Commit**

```bash
git add dokgodali-schedule.html dokgodali-schedule.css
git commit -m "Add crew work log history section"
```

---

### Task 5: 관리자 근무시간 승인 탭

**Files:**
- Modify: `dokgodali-schedule.html:105-137`(admin HTML), `renderApp()`(`:433-447`)
- Modify: `dokgodali-schedule.css`

**Interfaces:**
- Consumes: `state.workLogs`, `state.adminTab`(Task 1에서 추가됨), `CREW_USERS`
- Produces: `renderAdminWorklogTab()`, `approveWorklog(id)`, `openRejectWorklog(id)`, `submitRejectWorklog(id)` — Task 6(PDF)이 같은 탭 안의 selector를 공유하므로 이 탭의 DOM 컨테이너 id(`admin-worklog-section`)는 고정된 인터페이스로 취급한다.

- [ ] **Step 1: 탭 전환 UI 추가**

`dokgodali-schedule.html`의 `<div id="admin-section">`(105번 줄) 바로 다음 줄에 탭 바 삽입:

```html
    <div class="admin-tab-bar">
      <button class="admin-tab-btn active" id="admin-tab-dispatch-btn" onclick="switchAdminTab('dispatch')">스케줄 관리</button>
      <button class="admin-tab-btn" id="admin-tab-worklog-btn" onclick="switchAdminTab('worklog')">근무시간 승인</button>
    </div>
```

`.admin-layout` 닫는 `</div>`(현재 136번 줄) 바로 뒤, `admin-section` 닫는 `</div>`(137번 줄) 전에 새 섹션 삽입:

```html
    <div id="admin-worklog-section" class="hidden">
      <div id="admin-worklog-pending-list"></div>
    </div>
```

- [ ] **Step 2: CSS 추가**

```css
.admin-tab-bar { display: flex; gap: 8px; margin-bottom: 12px; }
.admin-tab-btn { padding: 8px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: #fff; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--text-secondary); }
.admin-tab-btn.active { background: var(--brand-navy, #1e293b); color: #fff; border-color: transparent; }
.worklog-pending-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color); }
.worklog-pending-item:last-child { border-bottom: none; }
.worklog-reject-form { display: flex; gap: 6px; margin-top: 6px; }
.worklog-reject-form input { flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 12.5px; }
```

- [ ] **Step 3: 탭 전환 및 렌더 함수 작성**

`renderApp()`(`:433-447`) 를 다음으로 교체:

```js
function renderApp() {
  renderRoleSwitcherButtons();

  const isAdmin = state.currentRole === 'admin';
  document.getElementById('admin-section').classList.toggle('hidden', !isAdmin);
  document.getElementById('crew-today-section').classList.toggle('hidden', isAdmin);
  document.getElementById('crew-calendar-section').classList.toggle('hidden', isAdmin);

  if (isAdmin) {
    document.getElementById('admin-worklog-section').classList.toggle('hidden', state.adminTab !== 'worklog');
    document.querySelector('.admin-layout').classList.toggle('hidden', state.adminTab !== 'dispatch');
    document.getElementById('admin-tab-dispatch-btn').classList.toggle('active', state.adminTab === 'dispatch');
    document.getElementById('admin-tab-worklog-btn').classList.toggle('active', state.adminTab === 'worklog');
    if (state.adminTab === 'worklog') {
      renderAdminWorklogTab();
    } else {
      renderAdminCalendar();
      renderAdminSelectedDateSchedules();
    }
  } else {
    renderCrewDashboard();
  }
}

function switchAdminTab(tab) {
  state.adminTab = tab;
  renderApp();
}
```

`switchAdminTab` 뒤에 추가:

```js
function renderAdminWorklogTab() {
  const list = document.getElementById('admin-worklog-pending-list');
  const pending = state.workLogs.filter(w => w.status === 'pending').sort((a, b) => a.jobDate.localeCompare(b.jobDate));

  if (pending.length === 0) {
    list.innerHTML = '<div class="worklog-history-empty">승인 대기중인 근무 기록이 없습니다.</div>';
    return;
  }

  list.innerHTML = pending.map(w => {
    const u = CREW_USERS.find(c => c.id === w.userId);
    return `
      <div class="worklog-pending-item" id="worklog-item-${w.id}">
        <div>
          <div>${u ? u.name : w.userId} · ${w.jobDate} ${w.actualStart}~${w.actualEnd}</div>
          <div style="font-size:12px; color:var(--text-secondary);">휴게 ${w.breakMinutes}분 · 실근무 ${w.workedHours}시간</div>
        </div>
        <div>
          <button class="btn btn-primary btn-sm" onclick="approveWorklog('${w.id}')">승인</button>
          <button class="btn btn-secondary btn-sm" onclick="openRejectWorklog('${w.id}')">반려</button>
        </div>
      </div>
    `;
  }).join('');
}

async function approveWorklog(id) {
  await sb.from('work_logs').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', id);
  await loadDataFromSupabase();
  renderApp();
}

function openRejectWorklog(id) {
  const item = document.getElementById(`worklog-item-${id}`);
  if (item.querySelector('.worklog-reject-form')) return;
  const form = document.createElement('div');
  form.className = 'worklog-reject-form';
  form.innerHTML = `
    <input type="text" placeholder="반려 사유" id="reject-reason-${id}">
    <button class="btn btn-primary btn-sm" onclick="submitRejectWorklog('${id}')">확인</button>
  `;
  item.appendChild(form);
}

async function submitRejectWorklog(id) {
  const reason = document.getElementById(`reject-reason-${id}`).value.trim();
  if (!reason) return;
  await sb.from('work_logs').update({ status: 'rejected', reject_reason: reason }).eq('id', id);
  await loadDataFromSupabase();
  renderApp();
}
```

- [ ] **Step 4: 브라우저로 승인/반려 흐름 확인**

claude-in-chrome:
1. 관리자로 전환 → "근무시간 승인" 탭 클릭 → Task 3에서 제출한 항목이 목록에 보이는지 확인.
2. [승인] 클릭 → 목록에서 사라지는지 확인. 크루로 전환해 "승인됨" 배지가 뜨는지 확인.
3. 다시 크루로 다른 시간대를 제출(예: 08:00~15:00) → 관리자에서 [반려] 클릭 → 사유 입력창이 열림 → "출근부 불일치" 입력 후 확인 → 목록에서 사라지는지 확인.
4. 크루 화면에서 "반려됨: 출근부 불일치" 배지와 함께 제출 폼이 다시 열리는지 확인.

- [ ] **Step 5: Commit**

```bash
git add dokgodali-schedule.html dokgodali-schedule.css
git commit -m "Add admin work-log approval tab"
```

---

### Task 6: 월별 AZ-Dokumentation PDF 다운로드

**Files:**
- Modify: `dokgodali-schedule.html` (라이브러리 인라인 복사, PDF 템플릿 HTML, PDF 생성 함수)
- Read only: `dokgodali-quote-flow.html:350-776`(html2canvas+jsPDF 인라인 블록), `:1008-1067`(PDF 생성 패턴)

**Interfaces:**
- Consumes: `state.workLogs`(status==='confirmed'), `CREW_USERS`, `COMPANY_INFO` 스타일 상수(schedule.html에는 없으므로 이 태스크에서 회사명 상수를 새로 정의)
- Produces: `generateAzDocPdf()` — 말단 함수, 다른 태스크가 의존하지 않음.

- [ ] **Step 1: html2canvas + jsPDF 라이브러리를 quote-flow.html에서 복사**

```bash
sed -n '350,776p' "dokgodali-quote-flow.html" > /tmp/pdf-libs.html
```

`/tmp/pdf-libs.html`의 내용을 `dokgodali-schedule.html`의 `</body>` 태그 바로 앞에 그대로 붙여넣는다(Edit 도구로 파일 끝 부분을 읽고 삽입). 이 블록은 `<script>`...(html2canvas 전체)...`</script><script>`...(jsPDF 전체)...`</script>` 형태를 그대로 유지해야 한다.

- [ ] **Step 2: 라이브러리 로드 확인**

로컬 서버로 서빙 후 claude-in-chrome 콘솔에서:

```js
typeof window.html2canvas; typeof window.jspdf.jsPDF
```

Expected: 둘 다 `"function"`.

- [ ] **Step 3: 회사 상수 + PDF 템플릿 HTML 추가**

`dokgodali-schedule.html`의 `CREW_USERS` 선언(`:260-265`) 바로 앞에 추가:

```js
const COMPANY_NAME = '독고달이 Umzüge GmbH';
```

`</body>` 태그 바로 앞(Step 1에서 붙여넣은 라이브러리 스크립트보다 앞, 즉 body 안 마지막 요소로) 숨겨진 PDF 템플릿을 추가:

```html
<div id="azDocPaper" style="position:absolute; left:-9999px; top:0; width:800px; background:#fff; padding:32px; font-family: Pretendard, sans-serif;">
  <h2 style="margin:0 0 4px;">Arbeitszeitdokumentation</h2>
  <div id="azDocSubtitle" style="font-size:13px; color:#475569; margin-bottom:16px;"></div>
  <table style="width:100%; border-collapse:collapse; font-size:12.5px;">
    <thead>
      <tr style="border-bottom:2px solid #1e293b;">
        <th style="text-align:left; padding:6px 4px;">날짜</th>
        <th style="text-align:left; padding:6px 4px;">시작</th>
        <th style="text-align:left; padding:6px 4px;">종료</th>
        <th style="text-align:left; padding:6px 4px;">휴게</th>
        <th style="text-align:right; padding:6px 4px;">근무시간</th>
      </tr>
    </thead>
    <tbody id="azDocRows"></tbody>
    <tfoot>
      <tr style="border-top:2px solid #1e293b; font-weight:700;">
        <td colspan="4" style="padding:8px 4px;">합계</td>
        <td id="azDocTotal" style="text-align:right; padding:8px 4px;"></td>
      </tr>
    </tfoot>
  </table>
  <div style="font-size:11px; color:#94a3b8; margin-top:16px;">본 문서는 §16 ArbZG에 따른 근로시간 기록 데모입니다.</div>
</div>
```

- [ ] **Step 4: 크루/월 선택 UI + PDF 버튼 추가**

`dokgodali-schedule.html`의 `<div id="admin-worklog-section" class="hidden">` 안, `admin-worklog-pending-list` div 앞에 추가:

```html
      <div class="card" style="margin-bottom:14px; padding:14px;">
        <div class="card-title">월별 근무시간 PDF</div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <select id="az-crew-select"></select>
          <input type="month" id="az-month-input" value="2026-09">
          <button class="btn btn-primary btn-sm" id="az-download-btn" onclick="generateAzDocPdf()">PDF 다운로드</button>
        </div>
        <div id="az-pdf-status" style="font-size:12px; color:var(--text-secondary); margin-top:6px;"></div>
      </div>
```

`renderAdminWorklogTab()`(Task 5) 맨 앞에 크루 select를 한 번만 채우는 코드 추가:

```js
  const crewSelect = document.getElementById('az-crew-select');
  if (crewSelect.options.length === 0) {
    CREW_USERS.forEach(u => crewSelect.appendChild(new Option(u.name, u.id)));
  }
```

- [ ] **Step 5: PDF 생성 함수 작성**

`dokgodali-schedule.html`에 추가 (`submitRejectWorklog` 함수 뒤):

```js
async function generateAzDocPdf() {
  const btn = document.getElementById('az-download-btn');
  const statusEl = document.getElementById('az-pdf-status');
  const userId = document.getElementById('az-crew-select').value;
  const monthValue = document.getElementById('az-month-input').value; // 'YYYY-MM'
  const user = CREW_USERS.find(u => u.id === userId);
  if (!userId || !monthValue || !user) return;

  const logs = state.workLogs
    .filter(w => w.userId === userId && w.status === 'confirmed' && w.jobDate.startsWith(monthValue))
    .sort((a, b) => a.jobDate.localeCompare(b.jobDate));

  if (logs.length === 0) {
    statusEl.textContent = '해당 크루/월에 승인된 근무 기록이 없습니다.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'PDF 생성 중...';
  statusEl.textContent = '';
  try {
    const [year, month] = monthValue.split('-');
    document.getElementById('azDocSubtitle').textContent = `${COMPANY_NAME} · 크루: ${user.name} · ${year}년 ${Number(month)}월`;

    const rowsEl = document.getElementById('azDocRows');
    rowsEl.innerHTML = logs.map(w => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:6px 4px;">${w.jobDate}</td>
        <td style="padding:6px 4px;">${w.actualStart}</td>
        <td style="padding:6px 4px;">${w.actualEnd}</td>
        <td style="padding:6px 4px;">${w.breakMinutes}분</td>
        <td style="padding:6px 4px; text-align:right;">${w.workedHours}h</td>
      </tr>
    `).join('');

    const totalHours = Math.round(logs.reduce((sum, w) => sum + w.workedHours, 0) * 100) / 100;
    document.getElementById('azDocTotal').textContent = `${totalHours}h`;

    const paper = document.getElementById('azDocPaper');
    const canvas = await html2canvas(paper, { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: 800 });
    const doc = new jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 24;
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgWidthPt = pageWidth - margin * 2;
    const pxPerPt = canvas.width / imgWidthPt;
    const imgHeightPt = canvas.height / pxPerPt;
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgWidthPt, imgHeightPt);

    doc.save(`AZ-Dokumentation_${user.name}_${monthValue}.pdf`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'PDF 다운로드';
  }
}
```

- [ ] **Step 6: 브라우저로 PDF 생성 확인**

claude-in-chrome: 관리자 → "근무시간 승인" 탭 → 크루 select에서 Task 5에서 승인한 크루 선택, 연월을 `2026-09`로 지정(TODAY_DATE가 `2026-09-01`이므로 해당 월) → "PDF 다운로드" 클릭. 다운로드가 발생하는지(또는 `az-pdf-status`에 에러 메시지가 없는지) 확인. 승인된 기록이 없는 크루/월을 선택했을 때 "해당 크루/월에 승인된 근무 기록이 없습니다."가 뜨는지도 확인.

- [ ] **Step 7: Commit**

```bash
git add dokgodali-schedule.html
git commit -m "Add on-demand AZ-Dokumentation PDF generation"
```

---

### Task 7: 영문 버전(`dokgodali-schedule-en.html`) 반영

**Files:**
- Modify: `dokgodali-schedule-en.html` (Task 1~6의 모든 변경을 동일하게 반영, 사용자 노출 텍스트만 영문화)
- Modify: `scripts/translate_schedule.py` (기존 번역 스크립트에 새 문자열 매핑 추가, 있다면)

**Interfaces:**
- Consumes: Task 1~6에서 확정된 모든 함수/HTML 구조 (구조는 100% 동일, 텍스트만 다름)
- Produces: 없음 (최종 산출물)

- [ ] **Step 1: 구조적 변경사항을 동일하게 적용**

`dokgodali-schedule.html`과 `dokgodali-schedule-en.html`을 나란히 놓고, Task 1~6에서 추가/수정한 모든 HTML 블록과 JS 함수를 `dokgodali-schedule-en.html`에 동일한 위치·구조로 적용한다. `dokgodali-schedule.css`는 두 파일이 공유하므로 CSS는 추가 작업이 필요 없다.

- [ ] **Step 2: 사용자 노출 텍스트 번역**

다음 문자열들을 영문으로 교체 (코드 구조/로직은 절대 변경하지 않음):

| 한국어 | 영어 |
|---|---|
| 근무시간 제출 | Submit Work Time |
| 예상 근무시간: {h}시간 (휴게 {m}분 자동 적용) | Estimated work time: {h}h (break {m}min auto-applied) |
| 제출 | Submit |
| 종료 시간은 시작 시간보다 늦어야 합니다. | End time must be after start time. |
| 제출 완료 · 승인 대기중 | Submitted · Pending approval |
| 승인됨 | Confirmed |
| 반려됨: {reason} | Rejected: {reason} |
| 내 근무 이력 | My Work History |
| 아직 제출한 근무 기록이 없습니다. | No work logs submitted yet. |
| 승인 대기 / 승인됨 / 반려됨 (이력 상태 라벨) | Pending / Confirmed / Rejected |
| 스케줄 관리 | Schedule Management |
| 근무시간 승인 | Work Time Approval |
| 승인 대기중인 근무 기록이 없습니다. | No work logs pending approval. |
| 승인 (버튼) | Approve |
| 반려 (버튼) | Reject |
| 반려 사유 (placeholder) | Reason for rejection |
| 확인 (버튼) | Confirm |
| 월별 근무시간 PDF | Monthly Work Time PDF |
| PDF 다운로드 | Download PDF |
| PDF 생성 중... | Generating PDF... |
| 해당 크루/월에 승인된 근무 기록이 없습니다. | No confirmed work logs for this crew/month. |
| Arbeitszeitdokumentation / 크루: {name} / {합계} | 구조 동일 유지 (헤더 라벨만 "Crew: {name}", "Total:") |
| 본 문서는 §16 ArbZG에 따른 근로시간 기록 데모입니다. | This document is a demo work-time record under §16 ArbZG. |

- [ ] **Step 3: 브라우저로 영문판 동작 확인**

claude-in-chrome으로 `dokgodali-schedule-en.html`을 열고 Task 3~6의 검증 단계(제출 → 미리보기 → 승인/반려 → PDF)를 동일하게 한 번씩 실행해 한국어판과 동일하게 동작하는지 확인.

- [ ] **Step 4: Commit**

```bash
git add dokgodali-schedule-en.html
git commit -m "Mirror work-time tracking feature to English schedule app"
```

---

### Task 8: README.ko.md에 월 마감(향후 과제) 항목 추가

**Files:**
- Modify: `README.ko.md` (§3 "실제 서비스로 배포하기 전 고려할 점" 목록에 8번 항목 추가)

**Interfaces:**
- Consumes: 없음 (문서 변경)
- Produces: 없음

- [ ] **Step 1: 항목 추가**

`README.ko.md`의 §3 목록(7번 "인프라" 항목 다음)에 추가:

```markdown
8. **근무시간 기록의 월 마감** — 현재는 근무시간 기록이 언제든 반려·재제출로 수정될 수 있고, AZ-Dokumentation PDF도 매번 최신 데이터로 즉석 생성됩니다. 실제 서비스에서는 매월 마감 시점에 그 달의 기록을 잠그고(수정 불가), 마감 시점 PDF 스냅샷 1부를 별도 저장소(Supabase Storage 등)에 아카이브해 독일 근로시간 기록 2년 보관 의무를 명확히 충족하는 절차가 필요합니다.
```

- [ ] **Step 2: Commit**

```bash
git add README.ko.md
git commit -m "Document month-lock/PDF archival as future work in README.ko"
```

---

## Self-Review Notes

- 스펙 §2(휴게시간 규칙), §3(work_logs 테이블), §4(크루 화면), §5(관리자 승인), §6(PDF), §6.3(향후 과제), §7(영문 버전) 모두 Task 1~8에 매핑됨.
- 반려 사유 입력은 스펙 §5.1에서 "간단한 인라인 텍스트 입력"으로 명시된 대로 `prompt()` 대신 인라인 `<input>` + 확인 버튼으로 구현(Task 5 Step 3).
- `calcWorkLog`, `mapWorkLogFromDB`, `state.workLogs`, `state.adminTab` 등 태스크 간 공유되는 이름은 최초 정의(Task 1, 2) 이후 모든 태스크에서 동일하게 사용됨을 확인함.
- Task 6은 Task 5에서 만든 `admin-worklog-section`/`renderAdminWorklogTab` 안에 UI를 추가하므로 Task 5 완료 후에 진행해야 함(순서 의존성 명시).
