// 실행: node --test tests/delivery-pricing.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../dokgodali-delivery-pricing.js');

const box = (length, width, height, weight, extra = {}) => ({ length, width, height, weight, ...extra });

test('중량 올림: 30kg 이하 0.5kg, 초과 1kg 단위', () => {
    assert.equal(P.roundWeight(10.2), 10.5);
    assert.equal(P.roundWeight(10.5), 10.5);
    assert.equal(P.roundWeight(10.6), 11);
    assert.equal(P.roundWeight(30), 30);
    assert.equal(P.roundWeight(30.2), 31);
    assert.equal(P.roundWeight(0.1), 0.5);
});

test('치수는 1cm 단위 올림', () => {
    assert.deepEqual(P.roundDimensions(box(79.3, 40, 40.01, 1)), [80, 40, 41]);
});

test('기본 운임이 요금표와 일치', () => {
    const table = { 1: 11.0, 1.5: 13.15, 7: 36.8, 10: 49.7, 13.5: 64.75, 19: 88.4, 25: 114.2, 30: 135.7, 30.5: 137.85 };
    for (const [kg, price] of Object.entries(table)) assert.equal(P.baseRate(Number(kg)), price, `${kg}kg`);
});

test('청구 중량: 부피 무게(÷6000)와 실중량 중 큰 값, 최소 1kg', () => {
    assert.equal(P.quoteBox(box(60, 40, 40, 5)).chargeable, 16); // 96000/6000 = 16
    assert.equal(P.quoteBox(box(30, 20, 20, 8.2)).chargeable, 8.5);
    assert.equal(P.quoteBox(box(10, 10, 10, 0.3)).chargeable, 1);
});

test('OVER SIZE 경계: 세 변 합 140cm, 한 변 80cm', () => {
    assert.equal(P.quoteBox(box(50, 45, 44, 5)).isOversize, false); // 139
    assert.equal(P.quoteBox(box(50, 45, 45, 5)).isOversize, true); // 140
    assert.equal(P.quoteBox(box(79.3, 10, 10, 5)).isOversize, true); // 80으로 올림
    assert.equal(P.quoteBox(box(79, 10, 10, 5)).oversize, 0);
});

test('OVER SIZE: 부피 무게 30kg 초과분 1kg당 €1', () => {
    const q = P.quoteBox(box(70, 60, 50, 5)); // 210000/6000 = 35
    assert.equal(q.volumetric, 35);
    assert.equal(q.oversize, 25);
});

test('OVER WEIGHT: 20kg 이상 €20, 30kg 초과분 1kg당 €1', () => {
    assert.equal(P.quoteBox(box(40, 30, 30, 19.6)).overweight, 20); // 올림 후 20kg → 해당 (클라이언트 확인 #15)
    assert.equal(P.quoteBox(box(40, 30, 30, 19.4)).overweight, 0);
    assert.equal(P.quoteBox(box(40, 30, 30, 20)).overweight, 20);
    assert.equal(P.quoteBox(box(40, 30, 30, 32.4)).overweight, 23); // 33kg
});

test('OVER SIZE와 OVER WEIGHT 중복 시 합산', () => {
    const q = P.quoteBox(box(90, 30, 30, 25));
    assert.equal(q.oversize, 20);
    assert.equal(q.overweight, 20);
    assert.equal(q.total, P.baseRate(25) + 40);
});

test('캐리어 €15', () => {
    assert.equal(P.quoteBox(box(40, 30, 20, 5, { carrier: true })).carrier, 15);
});

test('주문: 멀티 화물 2박스 이상 전체 박스 €3, 이삿짐 통관 €30', () => {
    const one = P.quoteOrder({ boxes: [box(30, 20, 20, 5)] });
    assert.equal(one.totals.multiBox, 0);
    const two = P.quoteOrder({ boxes: [box(30, 20, 20, 5), box(30, 20, 20, 5)], movingCustoms: true });
    assert.equal(two.totals.multiBox, 6);
    assert.equal(two.totals.movingCustoms, 30);
    assert.equal(two.total, P.baseRate(5) * 2 + 6 + 30);
    assert.equal(two.chargeableKg, 10);
});
