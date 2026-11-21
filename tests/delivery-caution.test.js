// 실행: node --test tests/delivery-caution.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../dokgodali-delivery-caution.js');

test('배터리 의심 (영문·한글)', () => {
    assert.deepEqual(C.match('Used Laptop'), ['battery']);
    assert.deepEqual(C.match('notebook computer'), ['battery']);
    assert.deepEqual(C.match('Body Scale'), ['battery']);
    assert.deepEqual(C.match('LED Flashlight'), ['battery']);
    assert.deepEqual(C.match('Power Bank 10000mAh'), ['battery']);
    assert.deepEqual(C.match('노트북'), ['battery']);
    assert.deepEqual(C.match('체중계'), ['battery']);
});

test('의약품·비만치료제 의심', () => {
    assert.deepEqual(C.match('Ibuprofen 400'), ['medicine']);
    assert.deepEqual(C.match('Wegovy pen'), ['medicine']);
    assert.deepEqual(C.match('Mounjaro'), ['medicine']);
    assert.deepEqual(C.match('semaglutide'), ['medicine']);
    assert.deepEqual(C.match('위고비'), ['medicine']);
    assert.deepEqual(C.match('감기약'), ['medicine']);
});

test('위험물 의심', () => {
    assert.deepEqual(C.match('Perfume 50ml'), ['hazmat']);
    assert.deepEqual(C.match('Hair Spray'), ['hazmat']);
    assert.deepEqual(C.match('라이터'), ['hazmat']);
});

test('여러 분류에 걸리면 모두, 중복 없이', () => {
    assert.deepEqual(C.match('Tablets'), ['battery', 'medicine']);
    assert.deepEqual(C.match('Laptop and laptop charger'), ['battery']);
});

test('단어 일부에만 걸리면 무시', () => {
    assert.deepEqual(C.match('Escalade toy car'), []);
    assert.deepEqual(C.match('Drugstore bag'), []);
    assert.deepEqual(C.match('Cotton T-shirt'), []);
});

test('대소문자·빈 값', () => {
    assert.deepEqual(C.match('LAPTOP'), ['battery']);
    assert.deepEqual(C.match(''), []);
    assert.deepEqual(C.match(undefined), []);
});
