# -*- coding: utf-8 -*-
import sys

SRC = r"C:\Users\Hyungmin\Desktop\works\독고달이\dokgodali-quote-flow.html"
DST = r"C:\Users\Hyungmin\Desktop\works\독고달이\dokgodali-quote-flow-en.html"

with open(SRC, encoding="utf-8") as f:
    text = f.read()

# (search, replace) — applied in order, each via str.replace (all occurrences)
REPLACEMENTS = [
    ('<html lang="ko">', '<html lang="en">'),
    ('<title>Dokgodali - 이사 견적 시뮬레이터</title>', '<title>Dokgodali - Moving Quote Simulator</title>'),

    # VANS names
    ("name:'M 사이즈 차량'", "name:'M-size vehicle'"),
    ("name:'L 사이즈 밴'", "name:'L-size van'"),
    ("name:'XL 사이즈 밴'", "name:'XL-size van'"),
    ("name:'XXL (XL 2회 왕복)'", "name:'XXL (XL van, 2 round trips)'"),

    # ITEMS names
    ("name:'더블/ 퀸 침대 (프레임 + 매트)'", "name:'Double/Queen bed (frame + mattress)'"),
    ("name:'싱글 침대 (프레임 + 매트)'", "name:'Single bed (frame + mattress)'"),
    ("name:'대형 장롱/옷장'", "name:'Large wardrobe/closet'"),
    ("name:'소파베드 (3인용)'", "name:'Sofa bed (3-seater)'"),
    ("name:'책장 / 선반형 수납장'", "name:'Bookshelf / shelving unit'"),
    ("name:'책상'", "name:'Desk'"),
    ("name:'세탁기/건조기'", "name:'Washer/dryer'"),
    ("name:'식탁'", "name:'Dining table'"),
    ("name:'식탁 의자'", "name:'Dining chair'"),
    ("name:'사무용 팔걸이 의자'", "name:'Office armchair'"),

    # ELEVATOR_LABEL
    ("{ yes: '엘리베이터 있음', no: '계단만 있음', unknown: '확인 필요' }",
     "{ yes: 'Elevator available', no: 'Stairs only', unknown: 'To be confirmed' }"),

    # --- HTML markup ---
    ('alt="Dokgodali 로고"', 'alt="Dokgodali logo"'),
    ('<div class="brand-title">독고달이</div>', '<div class="brand-title">Dokgodali</div>'),
    ('<div class="brand-sub">독일 고속도로를 달리는 이사 도우미</div>',
     '<div class="brand-sub">Your moving helper on Germany\'s Autobahn</div>'),
    ('<div class="lang"><span>ko</span><span>de</span></div>',
     '<div class="lang"><span>en</span><span>de</span></div>'),

    ('<div class="step-title">1. 부피 계산</div><div class="step-desc">차량 및 인원 계산</div>',
     '<div class="step-title">1. Volume Calculation</div><div class="step-desc">Vehicle &amp; crew calculation</div>'),
    ('<div class="step-title">2. 경로 및 옵션</div><div class="step-desc">주소 및 탑승 인원</div>',
     '<div class="step-title">2. Route &amp; Options</div><div class="step-desc">Address &amp; passengers</div>'),
    ('<div class="step-title">3. 공식 견적서</div><div class="step-desc">최종 비용 명세서</div>',
     '<div class="step-title">3. Official Quote</div><div class="step-desc">Final cost statement</div>'),

    ('<p class="desc">항목과 수량을 선택하십시오. 용량에 따라 차량의 종류가 자동으로 추천됩니다.</p>',
     '<p class="desc">Select the items and quantities. The vehicle type is recommended automatically based on volume.</p>'),
    ('<div class="section-label">가구 및 대형 가전</div>', '<div class="section-label">Furniture &amp; Large Appliances</div>'),
    ('id="toStep2Btn">확인하고 2단계로 진행</button>', 'id="toStep2Btn">Confirm &amp; Continue to Step 2</button>'),

    ('<h1>Step 2: 경로 및 옵션</h1>', '<h1>Step 2: Route &amp; Options</h1>'),
    ('<p class="desc">장소와 옵션을 입력해 주십시오.</p>', '<p class="desc">Please enter the locations and options.</p>'),
    ('<div class="section-label">주소 및 층수 정보</div>', '<div class="section-label">Address &amp; Floor Information</div>'),
    ('출발지 주소 <span class="required-mark">*필수</span>', 'Pickup Address <span class="required-mark">*Required</span>'),
    ('placeholder="예: Musterstr. 1, 12345 Berlin"', 'placeholder="e.g. Musterstr. 1, 12345 Berlin"'),
    ('id="originAddrError">출발지 주소를 입력해 주십시오.</div>', 'id="originAddrError">Please enter the pickup address.</div>'),
    ('<div class="field-mini-label">층수</div><select class="text-input" id="originFloor">',
     '<div class="field-mini-label">Floor</div><select class="text-input" id="originFloor">'),
    ('<div class="field-mini-label">엘리베이터</div><div class="elevator-btn" id="originElevator">',
     '<div class="field-mini-label">Elevator</div><div class="elevator-btn" id="originElevator">'),
    ('<div class="field-title">목적지 주소</div>', '<div class="field-title">Destination Address</div>'),
    ('<label class="tbd-checkbox"><input type="checkbox" id="destTBD"> 아직 목적지가 확정되지 않았습니다</label>',
     '<label class="tbd-checkbox"><input type="checkbox" id="destTBD"> Destination not yet confirmed</label>'),
    ('placeholder="예: Friedrichstr. 1, 12345 Berlin"', 'placeholder="e.g. Friedrichstr. 1, 12345 Berlin"'),
    ('<div class="field-mini-label">층수</div><select class="text-input" id="destFloor">',
     '<div class="field-mini-label">Floor</div><select class="text-input" id="destFloor">'),
    ('<div class="field-mini-label">엘리베이터</div><div class="elevator-btn" id="destElevator">',
     '<div class="field-mini-label">Elevator</div><div class="elevator-btn" id="destElevator">'),

    ('<div class="section-label">주차 허가구역 (Halteverbotszone)</div>',
     '<div class="section-label">No-Parking Zone Permit (Halteverbotszone)</div>'),
    ('<div class="toggle-row-title">주차 허가구역 신청</div>', '<div class="toggle-row-title">Apply for No-Parking Zone Permit</div>'),
    ('<div class="toggle-row-sub">트럭 정차 공간 확보를 위한 임시 주정차금지 표지판 신청을 대행해 드립니다</div>',
     '<div class="toggle-row-sub">We handle the application for temporary no-parking signs to secure truck loading space.</div>'),
    ('<div class="field-mini-label">신청 시작일</div>', '<div class="field-mini-label">Permit Start Date</div>'),
    ('<div class="field-mini-label">신청 종료일</div>', '<div class="field-mini-label">Permit End Date</div>'),

    ('<div class="section-label">특수 취급 품목</div>', '<div class="section-label">Special Handling Items</div>'),
    ('<div class="section-hint">해당하는 품목이 있다면 선택해 주십시오. 전용 장비나 추가 인력이 필요할 수 있습니다.</div>',
     '<div class="section-hint">Please select any items that apply. Special equipment or additional staff may be required.</div>'),
    ('data-item="piano">🎹 피아노</div>', 'data-item="piano">🎹 Piano</div>'),
    ('data-item="safe">🔒 금고</div>', 'data-item="safe">🔒 Safe</div>'),
    ('data-item="art">🖼️ 대형 미술품/조각</div>', 'data-item="art">🖼️ Large artwork/sculpture</div>'),
    ('data-item="aquarium">🐠 대형 수족관</div>', 'data-item="aquarium">🐠 Large aquarium</div>'),
    ('data-item="etc">📦 기타 특수 품목</div>', 'data-item="etc">📦 Other special item</div>'),
    ('<span>전용 장비·추가 인력 배정을 위해 상담원이 이사 전 별도로 연락드립니다. 아래 금액은 예상 추가 비용입니다.</span>',
     '<span>Our team will contact you before the move to arrange special equipment or additional staff. The amount below is an estimated additional cost.</span>'),

    ('<div class="section-label">동승자 및 반려동물 옵션</div>', '<div class="section-label">Passenger &amp; Pet Options</div>'),
    ('<div class="option-title">차량 동승 인원</div><div class="option-sub">무료 동승 (최대 2인)</div>',
     '<div class="option-title">Vehicle Passengers</div><div class="option-sub">Free of charge (up to 2 people)</div>'),
    ('<div class="option-title">반려동물 동승</div><div class="option-sub">강아지 / 고양이 (+€10 청소·보호 비용)</div>',
     '<div class="option-title">Pet Onboard</div><div class="option-sub">Dog / cat (+€10 cleaning &amp; protection fee)</div>'),

    ('<div class="section-label">이사 일정</div>', '<div class="section-label">Moving Schedule</div>'),
    ('<div class="field-title">이사 예정일</div>', '<div class="field-title">Moving Date</div>'),
    ('<div class="field-title">선호 시간대</div>', '<div class="field-title">Preferred Time</div>'),
    ('<option value="morning">오전 (08:00–12:00)</option>', '<option value="morning">Morning (08:00–12:00)</option>'),
    ('<option value="afternoon">오후 (12:00–17:00)</option>', '<option value="afternoon">Afternoon (12:00–17:00)</option>'),
    ('<option value="evening">저녁 (17:00–20:00)</option>', '<option value="evening">Evening (17:00–20:00)</option>'),

    ('id="backToStep1Btn">← 1단계로 돌아가기</button>', 'id="backToStep1Btn">← Back to Step 1</button>'),
    ('id="toStep3Btn">확인하고 3단계로 진행</button>', 'id="toStep3Btn">Confirm &amp; Continue to Step 3</button>'),

    ('id="backToStep2Btn">← 2단계로 돌아가기</button>', 'id="backToStep2Btn">← Back to Step 2</button>'),
    ('<h1>고객 정보 입력</h1>', '<h1>Customer Information</h1>'),
    ('<p class="desc">견적서에 표시될 고객 정보를 입력해 주십시오.</p>',
     '<p class="desc">Please enter the customer information to appear on the quote.</p>'),
    ('이름 <span class="required-mark">*필수</span>', 'Name <span class="required-mark">*Required</span>'),
    ('placeholder="예: Max Mustermann"', 'placeholder="e.g. Max Mustermann"'),
    ('연락처 <span class="required-mark">*필수</span>', 'Phone Number <span class="required-mark">*Required</span>'),
    ('placeholder="예: +49 170 1234567"', 'placeholder="e.g. +49 170 1234567"'),
    ('<div class="field-title">이메일</div>', '<div class="field-title">Email</div>'),
    ('placeholder="예: max.mustermann@example.de"', 'placeholder="e.g. max.mustermann@example.de"'),
    ('id="customerInfoError">이름과 연락처를 입력해 주십시오.</div>', 'id="customerInfoError">Please enter your name and phone number.</div>'),
    ('id="toInvoicePreviewBtn">견적서 미리보기 →</button>', 'id="toInvoicePreviewBtn">Preview Quote →</button>'),

    ('id="backToCustomerInfoBtn">← 고객 정보 수정</button>', 'id="backToCustomerInfoBtn">← Edit Customer Info</button>'),
    ('id="printInvoiceBtn" style="width:100%;">📄 PDF 다운로드</button>', 'id="printInvoiceBtn" style="width:100%;">📄 Download PDF</button>'),

    # --- app script ---
    ('<div class="van-name js-van-name">XL 사이즈 밴</div>', '<div class="van-name js-van-name">XL-size van</div>'),
    ('<div class="stepper-label">작업 인원</div>', '<div class="stepper-label">Crew Size</div>'),
    ('<div class="stepper-label">예상 소요 시간</div>', '<div class="stepper-label">Estimated Duration</div>'),
    ('<div class="stepper-val js-dur-val">2시간</div>', '<div class="stepper-val js-dur-val">2h</div>'),
    ('<span>적재율</span><span class="js-occ-text">0.0 / 0 CBM (0%)</span>',
     '<span>Capacity</span><span class="js-occ-text">0.0 / 0 CBM (0%)</span>'),

    ("<span>기본 요금 (${CONFIG.BASE_HOURS}h/${CONFIG.BASE_WORKERS}명):</span>",
     "<span>Base Fee (${CONFIG.BASE_HOURS}h/${CONFIG.BASE_WORKERS} people):</span>"),
    ('<span>추가 작업원:</span>', '<span>Extra Crew:</span>'),
    ('<span>추가 시간:</span>', '<span>Extra Time:</span>'),
    ('<span>포장/자재비:</span>', '<span>Packing/Materials:</span>'),
    ('<span>가구 분해·재조립 작업비:</span>', '<span>Assembly/Disassembly Fee:</span>'),
    ('<span>반려동물 청소·보호 비용:</span>', '<span>Pet Cleaning Fee:</span>'),
    ('<span>주차 허가구역 신청 대행:</span>', '<span>Parking Permit Service:</span>'),
    ('<span>특수 품목 취급비:</span>', '<span>Special Item Handling:</span>'),
    ("<div class=\"price-total-label\">실시간 총액:<br>(MwSt ${Math.round(CONFIG.VAT_RATE*100)}% 포함)</div>",
     "<div class=\"price-total-label\">Live Total:<br>(incl. ${Math.round(CONFIG.VAT_RATE*100)}% VAT)</div>"),

    ("(mode === 'assembled' ? '가구가 조립되어 있습니다' : '가구가 해체되어 있습니다')",
     "(mode === 'assembled' ? 'Furniture is assembled' : 'Furniture is disassembled')"),

    ("const opts = ['지상층(0층)'];\n  for (let i = 1; i <= 10; i++) opts.push(i + '층');\n  opts.push('11층 이상');",
     "const ordinal = n => { const s = ['th','st','nd','rd']; const v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); };\n  const opts = ['Ground floor (0)'];\n  for (let i = 1; i <= 10; i++) opts.push(ordinal(i) + ' floor');\n  opts.push('11th floor or higher');"),

    ("el.innerHTML = ELEVATOR_ICON[value] + '<span>' + ELEVATOR_LABEL[value] + '</span>';",
     "el.innerHTML = ELEVATOR_ICON[value] + '<span>' + ELEVATOR_LABEL[value] + '</span>';"),  # unchanged, label already translated at source

    ("destAddr.placeholder = state.destTBD ? '예: München (도시명만이라도 입력해 주십시오)' : '예: Friedrichstr. 1, 12345 Berlin';",
     "destAddr.placeholder = state.destTBD ? 'e.g. Munich (city name is enough for now)' : 'e.g. Friedrichstr. 1, 12345 Berlin';"),

    ("'🔁 ' + van.trips + '회 왕복 필요'", "'🔁 ' + van.trips + ' round trips required'"),
    ("      ? '⚠️ 이 차량에는 물리적으로 실릴 수 없는 품목이 있습니다. 더 큰 차량을 선택하십시오'\n      : '⚠️ 초과 적재! 더 큰 차량을 선택하십시오';",
     "      ? '⚠️ This vehicle cannot physically fit some of the selected items. Please choose a larger vehicle.'\n      : '⚠️ Overloaded! Please choose a larger vehicle.';"),

    ("document.querySelectorAll('.js-dur-val').forEach(el => el.textContent = state.duration + '시간');",
     "document.querySelectorAll('.js-dur-val').forEach(el => el.textContent = state.duration + 'h');"),

    ("      <div class=\"accept-confirmed-msg\">✅ 동의 완료\n        <span class=\"accept-confirmed-sub\">${state.accepted.place || '장소 미입력'} · ${formatDateTime(state.accepted.at)}에 확정되었습니다.</span>\n      </div>`;",
     "      <div class=\"accept-confirmed-msg\">✅ Accepted\n        <span class=\"accept-confirmed-sub\">Confirmed at ${state.accepted.place || 'location not entered'} · ${formatDateTime(state.accepted.at)}</span>\n      </div>`;"),
    ('<div class="field-title">서명 장소 (선택)</div>\n      <input class="text-input" id="acceptPlace" type="text" placeholder="예: Berlin" value="${state.accepted.place}">\n      <button class="btn btn-primary" style="width:100%;margin-top:12px;" id="acceptBtn">이 견적서 내용에 동의 및 확정</button>`;',
     '<div class="field-title">Signing Location (optional)</div>\n      <input class="text-input" id="acceptPlace" type="text" placeholder="e.g. Berlin" value="${state.accepted.place}">\n      <button class="btn btn-primary" style="width:100%;margin-top:12px;" id="acceptBtn">Accept &amp; Confirm This Quote</button>`;'),

    ("btn.textContent = 'PDF 생성 중...';", "btn.textContent = 'Generating PDF...';"),
    ("const filename = `Dokgodali_견적서_${state.invoiceNo}.pdf`;", "const filename = `Dokgodali_Quote_${state.invoiceNo}.pdf`;"),
    ("showPdfStatus('PDF가 저장되었습니다.', 'info');", "showPdfStatus('PDF saved.', 'info');"),
    ("      showPdfStatus('저장이 취소되었습니다.', 'info');\n    } else {\n      showPdfStatus('PDF 생성 중 문제가 발생했습니다. 다시 시도해 주십시오.', 'error');",
     "      showPdfStatus('Save canceled.', 'info');\n    } else {\n      showPdfStatus('There was a problem generating the PDF. Please try again.', 'error');"),

    ("pos: pos++, name: '기본 이사 서비스',\n    desc: `작업 인원 ${state.team}명 · 예상 소요 ${state.duration}시간 포함 (${CONFIG.BASE_WORKERS}명/${CONFIG.BASE_HOURS}시간 기준 요금)`,",
     "pos: pos++, name: 'Base Moving Service',\n    desc: `Includes crew of ${state.team}, estimated ${state.duration}h (base rate for ${CONFIG.BASE_WORKERS} people / ${CONFIG.BASE_HOURS}h)`,"),
    ("pos: pos++, name: '추가 작업 인원',\n      desc: `기본 ${CONFIG.BASE_WORKERS}명 초과 ${b.extraWorkers}명 × ${state.duration}시간 × €${CONFIG.RATE_PER_WORKER_HOUR_EUR}/시간`,",
     "pos: pos++, name: 'Extra Crew',\n      desc: `${b.extraWorkers} extra beyond base ${CONFIG.BASE_WORKERS} × ${state.duration}h × €${CONFIG.RATE_PER_WORKER_HOUR_EUR}/h`,"),
    ("pos: pos++, name: '추가 작업 시간',\n      desc: `기본 ${CONFIG.BASE_HOURS}시간 초과 ${b.extraHours}시간 × €${CONFIG.RATE_PER_WORKER_HOUR_EUR}/시간`,",
     "pos: pos++, name: 'Extra Time',\n      desc: `${b.extraHours}h extra beyond base ${CONFIG.BASE_HOURS}h × €${CONFIG.RATE_PER_WORKER_HOUR_EUR}/h`,"),

    ("const stateLabel = i.assembly ? (i.assemblyState === 'assembled' ? '조립된 상태로 운송 (분해·재조립 포함)' : '분해된 상태로 운송') : null;",
     "const stateLabel = i.assembly ? (i.assemblyState === 'assembled' ? 'Transported assembled (includes disassembly/reassembly)' : 'Transported disassembled') : null;"),
    ("desc: `부피 약 ${unitVol.toFixed(2)} m³/개${stateLabel ? ' · ' + stateLabel : ''}`,",
     "desc: `Approx. ${unitVol.toFixed(2)} m³/unit${stateLabel ? ' · ' + stateLabel : ''}`,"),

    ("rows.push({ pos: pos++, name: '반려동물 동승', desc: '차량 내 청소·보호 비용', qty: 1, unit: 'Pauschale', unitPrice: b.petFee, total: b.petFee });",
     "rows.push({ pos: pos++, name: 'Pet Onboard', desc: 'In-vehicle cleaning & protection fee', qty: 1, unit: 'Pauschale', unitPrice: b.petFee, total: b.petFee });"),
    ("rows.push({ pos: pos++, name: '주차 허가구역 (Halteverbotszone) 신청 대행', desc: `신청 기간: ${document.getElementById('permitStart').value || '-'} ~ ${document.getElementById('permitEnd').value || '-'}`, qty: 1, unit: 'Pauschale', unitPrice: b.permitFee, total: b.permitFee });",
     "rows.push({ pos: pos++, name: 'No-Parking Zone Permit Service (Halteverbotszone)', desc: `Permit period: ${document.getElementById('permitStart').value || '-'} to ${document.getElementById('permitEnd').value || '-'}`, qty: 1, unit: 'Pauschale', unitPrice: b.permitFee, total: b.permitFee });"),
    ("const labels = { piano:'피아노', safe:'금고', art:'대형 미술품/조각', aquarium:'대형 수족관', etc:'기타 특수 품목' };\n    rows.push({ pos: pos++, name: '특수 취급 품목', desc: [...state.specialItems].map(k => labels[k]).join(', '), qty: state.specialItems.size, unit: '건', unitPrice: CONFIG.SPECIAL_ITEM_FEE_EUR, total: b.specialFee });",
     "const labels = { piano:'Piano', safe:'Safe', art:'Large artwork/sculpture', aquarium:'Large aquarium', etc:'Other special item' };\n    rows.push({ pos: pos++, name: 'Special Handling Items', desc: [...state.specialItems].map(k => labels[k]).join(', '), qty: state.specialItems.size, unit: 'item(s)', unitPrice: CONFIG.SPECIAL_ITEM_FEE_EUR, total: b.specialFee });"),

    ("function elevatorText(v){ return { yes:'있음', no:'없음', unknown:'확인 예정' }[v]; }",
     "function elevatorText(v){ return { yes:'Yes', no:'No', unknown:'TBC' }[v]; }"),

    ("const originAddr = document.getElementById('originAddr').value || '(주소 미입력)';",
     "const originAddr = document.getElementById('originAddr').value || '(address not provided)';"),
    ("    ? (document.getElementById('destAddr').value ? document.getElementById('destAddr').value + ' 부근 (목적지 확정 전)' : '(목적지 미확정)')\n    : (document.getElementById('destAddr').value || '(주소 미입력)');",
     "    ? (document.getElementById('destAddr').value ? document.getElementById('destAddr').value + ' area (destination not yet confirmed)' : '(destination not yet confirmed)')\n    : (document.getElementById('destAddr').value || '(address not provided)');"),
    ("const movingTimeLabel = { morning:'오전 (08:00–12:00)', afternoon:'오후 (12:00–17:00)', evening:'저녁 (17:00–20:00)' }[document.getElementById('movingTime').value];",
     "const movingTimeLabel = { morning:'Morning (08:00–12:00)', afternoon:'Afternoon (12:00–17:00)', evening:'Evening (17:00–20:00)' }[document.getElementById('movingTime').value];"),

    ('<div class="inv-brand">독고달이</div>', '<div class="inv-brand">Dokgodali</div>'),
    ('<div class="inv-doc-title">견적서 (ANGEBOT)</div>', '<div class="inv-doc-title">Quote (ANGEBOT)</div>'),

    ("<div style=\"font-weight:700;margin-bottom:4px;\">${state.customer.name || '고객'} 님 귀하</div>",
     "<div style=\"font-weight:700;margin-bottom:4px;\">Dear ${state.customer.name || 'Customer'}</div>"),
    ("<tr><td>견적서 번호</td><td>${state.invoiceNo}</td></tr>\n          <tr><td>고객 번호</td><td>${state.customerNo}</td></tr>\n          <tr><td>작성일</td><td>${todayStr()}</td></tr>\n          <tr><td>유효기간</td><td>${todayStr(COMPANY_INFO.quoteValidDays)}까지 (${COMPANY_INFO.quoteValidDays}일)</td></tr>\n          <tr><td>이사 예정일</td><td>${movingDate} · ${movingTimeLabel}</td></tr>",
     "<tr><td>Quote No.</td><td>${state.invoiceNo}</td></tr>\n          <tr><td>Customer No.</td><td>${state.customerNo}</td></tr>\n          <tr><td>Date Issued</td><td>${todayStr()}</td></tr>\n          <tr><td>Valid Until</td><td>${todayStr(COMPANY_INFO.quoteValidDays)} (${COMPANY_INFO.quoteValidDays} days)</td></tr>\n          <tr><td>Moving Date</td><td>${movingDate} · ${movingTimeLabel}</td></tr>"),

    ('<div class="inv-section-title">1. 이사 경로 및 조건</div>', '<div class="inv-section-title">1. Moving Route &amp; Conditions</div>'),
    ("<div class=\"inv-route-label\">출발지 (상차)</div>\n        <div class=\"inv-route-detail\">${originAddr}<br>층수: ${originFloorLabel} · 엘리베이터: ${elevatorText(state.originElevator)}</div>",
     "<div class=\"inv-route-label\">Pickup (Loading)</div>\n        <div class=\"inv-route-detail\">${originAddr}<br>Floor: ${originFloorLabel} · Elevator: ${elevatorText(state.originElevator)}</div>"),
    ("<div class=\"inv-route-label\">도착지 (하차)</div>\n        <div class=\"inv-route-detail\">${destAddr}<br>층수: ${destFloorLabel} · 엘리베이터: ${elevatorText(state.destElevator)}</div>",
     "<div class=\"inv-route-label\">Destination (Unloading)</div>\n        <div class=\"inv-route-detail\">${destAddr}<br>Floor: ${destFloorLabel} · Elevator: ${elevatorText(state.destElevator)}</div>"),
    ("<div><div class=\"inv-route-label\">차량 및 인력</div><div class=\"inv-route-detail\">${van.name} (${van.model})${van.trips>1 ? ' · '+van.trips+'회 왕복' : ''} · 작업 인원 ${state.team}명 · 예상 소요 ${state.duration}시간</div></div>",
     "<div><div class=\"inv-route-label\">Vehicle &amp; Crew</div><div class=\"inv-route-detail\">${van.name} (${van.model})${van.trips>1 ? ' · '+van.trips+' round trips' : ''} · Crew of ${state.team} · Estimated ${state.duration}h</div></div>"),

    ('<div class="inv-section-title">2. 서비스 및 요금 명세</div>', '<div class="inv-section-title">2. Services &amp; Pricing Breakdown</div>'),
    ('<thead><tr><th style="width:6%;">No.</th><th>내역</th><th class="num" style="width:8%;">수량</th><th class="num" style="width:10%;">단위</th><th class="num" style="width:14%;">단가</th><th class="num" style="width:14%;">금액(순액)</th></tr></thead>',
     '<thead><tr><th style="width:6%;">No.</th><th>Description</th><th class="num" style="width:8%;">Qty</th><th class="num" style="width:10%;">Unit</th><th class="num" style="width:14%;">Unit Price</th><th class="num" style="width:14%;">Amount (Net)</th></tr></thead>'),
    ("<tr><td>소계 (Nettobetrag)</td><td>€${b.net.toFixed(2)}</td></tr>\n        <tr><td>부가가치세 (MwSt. ${Math.round(CONFIG.VAT_RATE*100)}%)</td><td>€${b.vat.toFixed(2)}</td></tr>\n        <tr class=\"inv-total\"><td>총액 (Gesamtbetrag, Brutto)</td><td>€${b.total.toFixed(2)}</td></tr>",
     "<tr><td>Subtotal (Nettobetrag)</td><td>€${b.net.toFixed(2)}</td></tr>\n        <tr><td>VAT (MwSt. ${Math.round(CONFIG.VAT_RATE*100)}%)</td><td>€${b.vat.toFixed(2)}</td></tr>\n        <tr class=\"inv-total\"><td>Total (Gesamtbetrag, Brutto)</td><td>€${b.total.toFixed(2)}</td></tr>"),

    ('<div class="inv-section-title">3. 결제 조건 및 법적 고지사항</div>', '<div class="inv-section-title">3. Payment Terms &amp; Legal Notices</div>'),
    ('<p><b>결제 조건:</b> ${LEGAL_TEXT.paymentTerms(', '<p><b>Payment Terms:</b> ${LEGAL_TEXT.paymentTerms('),
    ('<p><b>견적 유형:</b> ${LEGAL_TEXT.offerType}</p>', '<p><b>Quote Type:</b> ${LEGAL_TEXT.offerType}</p>'),
    ('<p><b>법정 배상 책임:</b> ${LEGAL_TEXT.liability}</p>', '<p><b>Statutory Liability:</b> ${LEGAL_TEXT.liability}</p>'),
    ('<p><b>소비자 철회권:</b> ${LEGAL_TEXT.withdrawal}</p>', '<p><b>Right of Withdrawal:</b> ${LEGAL_TEXT.withdrawal}</p>'),

    ('<div class="inv-sign-line">${state.accepted.place || \'(장소 미입력)\'}, ${formatDateTime(state.accepted.at)}</div>\n      <div class="inv-sign-line">✔ 디지털 동의 완료 — ${state.customer.name || \'고객\'}</div>',
     '<div class="inv-sign-line">${state.accepted.place || \'(location not provided)\'}, ${formatDateTime(state.accepted.at)}</div>\n      <div class="inv-sign-line">✔ Digitally Accepted — ${state.customer.name || \'Customer\'}</div>'),
    ('<p class="inv-accept-note">이 동의는 위 시점에 명시된 품목·옵션·금액을 기준으로 합니다. 이후 1·2단계 내용이 수정되면 재동의가 필요합니다.</p>',
     '<p class="inv-accept-note">This acceptance is based on the items, options, and amount specified at the time above. If Step 1 or Step 2 details are changed afterward, re-acceptance will be required.</p>'),
    ('<div class="inv-sign-line">장소, 날짜</div>\n      <div class="inv-sign-line">고객 서명 (법적 효력)</div>',
     '<div class="inv-sign-line">Place, Date</div>\n      <div class="inv-sign-line">Customer Signature (Legally Binding)</div>'),

    ('<div>대표: ${COMPANY_INFO.ceo}<br>${COMPANY_INFO.court}<br>등록번호: ${COMPANY_INFO.regNr}</div>',
     '<div>CEO: ${COMPANY_INFO.ceo}<br>${COMPANY_INFO.court}<br>Reg. No.: ${COMPANY_INFO.regNr}</div>'),
    ('<div>VAT ID: ${COMPANY_INFO.vatId}<br>세무번호: ${COMPANY_INFO.taxNr}<br>운송허가: ${COMPANY_INFO.gueKgLicense}</div>',
     '<div>VAT ID: ${COMPANY_INFO.vatId}<br>Tax No.: ${COMPANY_INFO.taxNr}<br>Transport License: ${COMPANY_INFO.gueKgLicense}</div>'),
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
    print("MISSING:", m[:120].replace("\n", "\\n").encode("ascii", "backslashreplace").decode("ascii"))
