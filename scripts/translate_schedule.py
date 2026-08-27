# -*- coding: utf-8 -*-
SRC = r"C:\Users\Hyungmin\Desktop\works\독고달이\dokgodali-schedule.html"
DST = r"C:\Users\Hyungmin\Desktop\works\독고달이\dokgodali-schedule-en.html"

with open(SRC, encoding="utf-8") as f:
    text = f.read()

REPLACEMENTS = [
    ('<html lang="ko">', '<html lang="en">'),
    ('<title>독고달이 스케줄</title>', '<title>Dokgodali Schedule</title>'),

    ('<button class="role-btn active" data-role="admin" onclick="switchRole(\'admin\')">관리자 (Admin)</button>',
     '<button class="role-btn active" data-role="admin" onclick="switchRole(\'admin\')">Admin</button>'),
    ('<span class="sync-status"><span class="sync-dot"></span> 실시간 연동됨</span>',
     '<span class="sync-status"><span class="sync-dot"></span> Live sync</span>'),
    ('onclick="copyInviteCode()">초대코드 복사</button>', 'onclick="copyInviteCode()">Copy Invite Code</button>'),

    ('<div class="brand-name">독고달이 스케줄</div>', '<div class="brand-name">Dokgodali Schedule</div>'),
    ('<span id="current-user-badge" class="badge badge-navy">관리자</span>',
     '<span id="current-user-badge" class="badge badge-navy">Admin</span>'),
    ('onclick="openCreateScheduleModal()">+ 스케줄 등록</button>', 'onclick="openCreateScheduleModal()">+ New Schedule</button>'),

    ('<span class="badge badge-blue">오늘 작업</span>', '<span class="badge badge-blue">Today\'s Job</span>'),
    ('<span class="badge badge-warning">대여</span>', '<span class="badge badge-warning">Rental</span>'),
    ('<div class="sub-box-title">함께하는 크루</div>', '<div class="sub-box-title">Crew Members</div>'),
    ('<div class="sub-box-title">현장 메모</div>', '<div class="sub-box-title">Site Notes</div>'),

    # Weekday headers (2 identical blocks: crew + admin)
    ('<div class="cal-weekday">월</div>\n      <div class="cal-weekday">화</div>\n      <div class="cal-weekday">수</div>\n      <div class="cal-weekday">목</div>\n      <div class="cal-weekday">금</div>\n      <div class="cal-weekday sat">토</div>\n      <div class="cal-weekday sun">일</div>',
     '<div class="cal-weekday">Mon</div>\n      <div class="cal-weekday">Tue</div>\n      <div class="cal-weekday">Wed</div>\n      <div class="cal-weekday">Thu</div>\n      <div class="cal-weekday">Fri</div>\n      <div class="cal-weekday sat">Sat</div>\n      <div class="cal-weekday sun">Sun</div>'),
    ('<div class="cal-weekday">월</div>\n          <div class="cal-weekday">화</div>\n          <div class="cal-weekday">수</div>\n          <div class="cal-weekday">목</div>\n          <div class="cal-weekday">금</div>\n          <div class="cal-weekday sat">토</div>\n          <div class="cal-weekday sun">일</div>',
     '<div class="cal-weekday">Mon</div>\n          <div class="cal-weekday">Tue</div>\n          <div class="cal-weekday">Wed</div>\n          <div class="cal-weekday">Thu</div>\n          <div class="cal-weekday">Fri</div>\n          <div class="cal-weekday sat">Sat</div>\n          <div class="cal-weekday sun">Sun</div>'),

    ('onclick="changeMonth(-1)">이전 달</button>', 'onclick="changeMonth(-1)">Prev</button>'),
    ('onclick="changeMonth(1)">다음 달</button>', 'onclick="changeMonth(1)">Next</button>'),

    ('<div class="card-title" id="modal-title">스케줄 등록</div>', '<div class="card-title" id="modal-title">New Schedule</div>'),
    ('onclick="closeScheduleModal()">닫기</button>', 'onclick="closeScheduleModal()">Close</button>'),
    ('<label class="form-label">견적번호 (관리자용)</label>', '<label class="form-label">Quote No. (admin use)</label>'),
    ('<label class="form-label">견적금액 (€)</label>', '<label class="form-label">Quote Amount (€)</label>'),
    ('<label class="form-label">고객명</label>', '<label class="form-label">Customer Name</label>'),
    ('<label class="form-label">연락처</label>', '<label class="form-label">Phone Number</label>'),
    ('<label class="form-label">작업 날짜</label>', '<label class="form-label">Job Date</label>'),
    ('<label class="form-label">작업 시간</label>', '<label class="form-label">Job Time</label>'),
    ('<label class="form-label">상차지 주소 / 층수·엘베</label>', '<label class="form-label">Pickup Address / Floor &amp; Elevator</label>'),
    ('placeholder="2층 · 엘리베이터 있음"', 'placeholder="2nd floor · Elevator available"'),
    ('<label class="form-label">하차지 주소 / 층수·엘베</label>', '<label class="form-label">Drop-off Address / Floor &amp; Elevator</label>'),
    ('placeholder="4층 · 엘리베이터 없음"', 'placeholder="4th floor · No elevator"'),
    ('<label class="form-label">필요 인원</label>', '<label class="form-label">Required Crew</label>'),
    ('<label class="form-label">차량 종류</label>', '<label class="form-label">Vehicle Type</label>'),
    ('<option value="Miles L / XL 밴">Miles L / XL 밴</option>', '<option value="Miles L / XL 밴">Miles L / XL van</option>'),
    ('<option value="Miles L 사이즈 밴">Miles L 사이즈 밴</option>', '<option value="Miles L 사이즈 밴">Miles L size van</option>'),
    ('<option value="Miles XL 사이즈 밴">Miles XL 사이즈 밴</option>', '<option value="Miles XL 사이즈 밴">Miles XL size van</option>'),
    ('<option value="3.5t 트럭">3.5t 트럭</option>', '<option value="3.5t 트럭">3.5t truck</option>'),
    ('<label class="form-label">현장 메모</label>', '<label class="form-label">Site Notes</label>'),
    ('placeholder="사다리차 불가, 계단 주의, 침대 분해"', 'placeholder="No ladder lift, mind the stairs, bed disassembly needed"'),
    ('onclick="closeScheduleModal()">취소</button>', 'onclick="closeScheduleModal()">Cancel</button>'),
    ('<button type="submit" class="btn btn-primary btn-sm">저장</button>', '<button type="submit" class="btn btn-primary btn-sm">Save</button>'),

    ('<div class="card-title">WhatsApp 브리핑</div>', '<div class="card-title">WhatsApp Briefing</div>'),
    ('onclick="closeWhatsappModal()">닫기</button>', 'onclick="closeWhatsappModal()">Close</button>'),
    ('onclick="copyWhatsappText()">복사</button>', 'onclick="copyWhatsappText()">Copy</button>'),
    ('target="_blank">WhatsApp 열기</a>', 'target="_blank">Open WhatsApp</a>'),

    ('<div id="toast" class="toast">저장되었습니다.</div>', '<div id="toast" class="toast">Saved.</div>'),

    # --- JS ---
    ("  { id: 'crew1', name: '홍길동', phone: '+49 171 1111111', canDrive: true },\n  { id: 'crew2', name: '김철수', phone: '+49 172 2222222', canDrive: false },\n  { id: 'crew3', name: '이영희', phone: '+49 173 3333333', canDrive: true },\n  { id: 'crew4', name: '박민수', phone: '+49 174 4444444', canDrive: false }",
     "  { id: 'crew1', name: 'Hong Gil-dong', phone: '+49 171 1111111', canDrive: true },\n  { id: 'crew2', name: 'Kim Chul-su', phone: '+49 172 2222222', canDrive: false },\n  { id: 'crew3', name: 'Lee Young-hee', phone: '+49 173 3333333', canDrive: true },\n  { id: 'crew4', name: 'Park Min-su', phone: '+49 174 4444444', canDrive: false }"),

    ("const VEHICLE_DUTIES = [\n  { value: 'none', label: '대여 없음' },",
     "const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];\n\nconst VEHICLE_DUTIES = [\n  { value: 'none', label: 'No rental' },"),

    ("    badge.textContent = '관리자';", "    badge.textContent = 'Admin';"),
    ("    badge.textContent = `${crew.name} (${crew.canDrive ? '운전가능' : '면허없음'})`;",
     "    badge.textContent = `${crew.name} (${crew.canDrive ? 'Can drive' : 'No license'})`;"),

    ("const label = myAssign ? `${u.name} (${myAssign.startTime}${dutyLabel})` : `${u.name} (미배정)`;",
     "const label = myAssign ? `${u.name} (${myAssign.startTime}${dutyLabel})` : `${u.name} (Unassigned)`;"),

    ("document.getElementById('admin-cal-title').textContent = `${state.currentYear}년 ${state.currentMonth + 1}월`;",
     "document.getElementById('admin-cal-title').textContent = `${MONTH_NAMES[state.currentMonth]} ${state.currentYear}`;"),
    ("document.getElementById('crew-cal-title').textContent = `${state.currentYear}년 ${state.currentMonth + 1}월`;",
     "document.getElementById('crew-cal-title').textContent = `${MONTH_NAMES[state.currentMonth]} ${state.currentYear}`;"),

    ("availSummary.textContent = `${availCount}명 가용`;", "availSummary.textContent = `${availCount} available`;"),

    ("    `가용 ${availList.length}명 (${availList.map(u => u.name).join(',') || '-'}) · 불가 ${unavailList.length}명`;",
     "    `Available ${availList.length} (${availList.map(u => u.name).join(',') || '-'}) · Unavailable ${unavailList.length}`;"),

    ("        일정이 없습니다.\n        <div style=\"margin-top: 8px;\">\n          <button class=\"btn btn-primary btn-sm\" onclick=\"openCreateScheduleModal('${state.selectedDate}')\">+ 스케줄 추가</button>",
     "        No schedules.\n        <div style=\"margin-top: 8px;\">\n          <button class=\"btn btn-primary btn-sm\" onclick=\"openCreateScheduleModal('${state.selectedDate}')\">+ Add Schedule</button>"),

    ('<span class="badge ${isFull ? \'badge-green\' : \'badge-warning\'}">${assignedCount}/${sch.requiredWorkers}명</span>',
     '<span class="badge ${isFull ? \'badge-green\' : \'badge-warning\'}">${assignedCount}/${sch.requiredWorkers} crew</span>'),
    ('onclick="deleteSchedule(\'${sch.id}\')">삭제</button>', 'onclick="deleteSchedule(\'${sch.id}\')">Delete</button>'),
    ('<option value="">+ 크루 배정</option>', '<option value="">+ Assign Crew</option>'),
    ("return `<option value=\"${u.id}\">${u.name} (${isAvail ? '가능' : '불가'})</option>`;",
     "return `<option value=\"${u.id}\">${u.name} (${isAvail ? 'Available' : 'Unavailable'})</option>`;"),
    ('onclick="addCrewToSchedule(\'${sch.id}\')">추가</button>', 'onclick="addCrewToSchedule(\'${sch.id}\')">Add</button>'),

    ('container.innerHTML = `<div style="font-size: 11.5px; color: var(--text-muted); padding: 4px 0;">배정 인원 없음</div>`;',
     'container.innerHTML = `<div style="font-size: 11.5px; color: var(--text-muted); padding: 4px 0;">No crew assigned</div>`;'),
    ('<span><strong>${user.name}</strong> (${user.canDrive ? \'운전\' : \'일반\'})</span>',
     '<span><strong>${user.name}</strong> (${user.canDrive ? \'Driver\' : \'General\'})</span>'),
    ("${user.canDrive ? '' : 'disabled title=\"면허가 없는 크루는 차량 대여 담당을 맡을 수 없습니다\"'}",
     "${user.canDrive ? '' : 'disabled title=\"Crew without a license cannot take vehicle rental duty\"'}"),

    ("document.getElementById('crew-today-title').textContent = `${myJob.customerName} 님 이사/운송`;",
     "document.getElementById('crew-today-title').textContent = `Move for ${myJob.customerName}`;"),
    ("document.getElementById('crew-today-overall-time').textContent = `(전체: ${myJob.overallTimeRange})`;",
     "document.getElementById('crew-today-overall-time').textContent = `(Overall: ${myJob.overallTimeRange})`;"),
    ("document.getElementById('crew-duty-text').textContent = `차량 대여: ${vehicleDutyLabel(myAssign.vehicleDuty)} (${myAssign.startTime}까지 상차지 도착)`;",
     "document.getElementById('crew-duty-text').textContent = `Vehicle rental: ${vehicleDutyLabel(myAssign.vehicleDuty)} (arrive at pickup by ${myAssign.startTime})`;"),

    ("item.innerHTML = `<span>${u.name}${isMe ? ' (나)' : ''}</span><span>${a.startTime}${duty}</span>`;",
     "item.innerHTML = `<span>${u.name}${isMe ? ' (You)' : ''}</span><span>${a.startTime}${duty}</span>`;"),
    ("document.getElementById('crew-notes-text').textContent = myJob.notes || '없음';",
     "document.getElementById('crew-notes-text').textContent = myJob.notes || 'None';"),
    ("        오늘 배정된 작업 일정이 없습니다.", "        No job assigned for today."),

    ("    tag.textContent = isAvailable ? '가능' : '불가';", "    tag.textContent = isAvailable ? 'Available' : 'Unavailable';"),
    ("      pill.textContent = `배정 ${myAssign.startTime}`;", "      pill.textContent = `Assigned ${myAssign.startTime}`;"),
    ("      showToast(`${dateStr} [${nextVal ? '가능' : '불가'}]`);", "      showToast(`${dateStr} [${nextVal ? 'Available' : 'Unavailable'}]`);"),

    ("    alert('DB 저장 오류: ' + error.message);", "    alert('DB save error: ' + error.message);"),
    ("  showToast('스케줄이 저장되었습니다.');", "  showToast('Schedule saved.');"),
    ("  if (!confirm('삭제하시겠습니까?')) return;", "  if (!confirm('Delete this schedule?')) return;"),
    ("  showToast('삭제되었습니다.');", "  showToast('Deleted.');"),

    ("    crewLines = '• (미배정)';", "    crewLines = '• (Unassigned)';"),
    ("""  const text = `[독고달이 배정]
일시: ${sch.jobDate} (${sch.overallTimeRange})
고객: ${sch.customerName}

상차: ${sch.originAddress} (${sch.originSpec || ''})
하차: ${sch.destAddress} (${sch.destSpec || ''})

크루:
${crewLines}

메모: ${sch.notes || '없음'}`;""",
     """  const text = `[Dokgodali Assignment]
Date/Time: ${sch.jobDate} (${sch.overallTimeRange})
Customer: ${sch.customerName}

Pickup: ${sch.originAddress} (${sch.originSpec || ''})
Drop-off: ${sch.destAddress} (${sch.destSpec || ''})

Crew:
${crewLines}

Notes: ${sch.notes || 'None'}`;"""),

    ("  showToast('복사되었습니다.');", "  showToast('Copied.');"),
    ("  showToast('초대코드가 복사되었습니다.');", "  showToast('Invite code copied.');"),
]

missing = []
for old, new in REPLACEMENTS:
    if old not in text:
        missing.append(old)
    else:
        text = text.replace(old, new)

with open(DST, "w", encoding="utf-8") as f:
    f.write(text)

print(f"Wrote {DST}")
print(f"Missing (not found, skipped) count: {len(missing)}")
for m in missing:
    print("MISSING:", m[:160].replace("\n", "\\n").encode("ascii", "backslashreplace").decode("ascii"))
