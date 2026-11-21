// 실행: node --test tests/export.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dokgodali-export.js');

const item = (nameEn, extra = {}) => ({ nameEn, brand: '', color: '', size: '', quantity: '1', unitPrice: '10', imageUrl: '', productUrl: '', ...extra });
const req = {
    id: 'req-1793980354',
    payload: {
        recipientNameKo: '김선영',
        recipientNameEn: 'Seonyoung Kim',
        recipientPhone: '010-9010-3755',
        deliveryZip: '11901',
        deliveryAddress: '경기 구리시 갈매중앙로 190 휴밸나인',
        deliveryAddressDetail: 'H동 701호',
        deliveryAddressEn: '190 Galmaejungang-ro, Guri-si, Gyeonggi-do, Republic of Korea',
        deliveryAddressDetailEn: 'H-701',
        customsCode: 'P210027455731',
        movingStatus: 'moving',
        boxes: [
            { items: [item('Used Sandals', { brand: 'Zara', color: 'Black', size: '38', quantity: '2', unitPrice: '12.5' }), item('Used Boots', { imageUrl: 'https://x/item-images/a.jpg' })] },
            { items: [item('Used Scarf')] },
        ],
    },
};

test('헤더 26열', () => {
    assert.equal(E.HEADERS.length, 26);
    assert.equal(E.HEADERS[0], '묶음번호');
    assert.equal(E.HEADERS[25], '(트래킹번호)\n실제입고될 트래킹번호');
});

test('품목 1개 = 1행, 박스마다 묶음번호', () => {
    const rows = E.toRows(req);
    assert.equal(rows.length, 3);
    assert.ok(rows.every((r) => r.length === 26));
    assert.equal(rows[0][0], 'req-1793980354-1');
    assert.equal(rows[1][0], 'req-1793980354-1');
    assert.equal(rows[2][0], 'req-1793980354-2');
});

test('수취인·주소 열', () => {
    const [r] = E.toRows(req);
    assert.equal(r[1], '2'); // B 자동결제: 수동 (Q2 기본값)
    assert.equal(r[2], '김선영');
    assert.equal(r[3], 'Seonyoung Kim');
    assert.equal(r[4], '01090103755'); // E 숫자만
    assert.equal(r[5], '11901');
    assert.equal(r[6], '경기 구리시 갈매중앙로 190 휴밸나인');
    assert.equal(r[7], 'H동 701호');
    assert.equal(r[8], '190 Galmaejungang-ro, Guri-si, Gyeonggi-do, 11901, South Korea');
    assert.equal(r[9], 'H-701');
    assert.equal(r[10], '1'); // K 통관구분: 개인 (Q2 기본값)
    assert.equal(r[11], 'P210027455731');
    assert.equal(r[12], 'req-1793980354-1/ 이사짐 통관');
});

test('품목 열과 빈칸 규칙', () => {
    const [a, b] = E.toRows(req);
    assert.deepEqual(a.slice(13, 17), ['', '', '', '']); // N 국내택배 요청, O 통관품목번호(Q3), P·Q 쇼핑몰
    assert.deepEqual(a.slice(17, 21), ['Used Sandals', 'Zara', 'Black', '38']);
    assert.equal(a[21], 2);
    assert.equal(a[22], 25); // W 합계 = 수량×단가 (Q4 기본값)
    assert.deepEqual(a.slice(23, 26), ['.', '.', '']);
    assert.deepEqual(b.slice(18, 21), ['-', '-', '-']);
    assert.equal(b[23], 'https://x/item-images/a.jpg');
});

test('상세주소가 없으면 -, 이사화물이 아니면 묶음번호만', () => {
    const p = { ...req.payload, deliveryAddressDetail: '', deliveryAddressDetailEn: ' ', movingStatus: 'none' };
    const [r] = E.toRows({ ...req, payload: p });
    assert.equal(r[7], '-');
    assert.equal(r[9], '-');
    assert.equal(r[12], 'req-1793980354-1');
});

test('배송지 미정이면 내보낼 수 없다', () => {
    assert.throws(() => E.toRows({ ...req, payload: { ...req.payload, deliveryUndecided: true } }), /delivery_undecided/);
});
