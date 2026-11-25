const test = require('node:test');
const assert = require('node:assert');
globalThis.DokgodaliPricing = require('../public/dokgodali-delivery-pricing.js');
const A = require('../public/dokgodali-angebot.js');

const line = (qty, unitPrice) => ({ title: 'x', text: '', qty, unitPrice });

test('합계는 줄마다 netto를 반올림해 더한다 (스캔 샘플 1·2와 같은 값)', () => {
    assert.deepStrictEqual(A.totals([line(1, 170), line(1, 110)], 0.19), { net: 235.3, vat: 44.7, gross: 280 });
    assert.deepStrictEqual(A.totals([line(1, 70), line(1, 80)], 0.19), { net: 126.05, vat: 23.95, gross: 150 });
});

test('금액은 독일식으로 적는다', () => {
    assert.strictEqual(A.eur(1234.5), '1.234,50 EUR');
    assert.strictEqual(A.eur(90.55), '90,55 EUR');
});

test('배송 신청에서 박스마다 운임 줄과 추가 요금 줄을 만든다', () => {
    const boxes = [
        { length: '60', width: '40', height: '40', weight: '19.5', items: [{ nameEn: 'Jeans', quantity: '3' }] },
        { length: '75', width: '45', height: '30', weight: '22', carrier: true, items: [] },
    ];
    const order = globalThis.DokgodaliPricing.quoteOrder({ boxes });
    const data = A.fromDeliveryRequest(
        { payload: { boxes: boxes.map((b, i) => ({ ...b, quote: order.boxes[i] })), quoteTotals: order.totals, method: 'fixed', methodFee: 0 } },
        { vatRate: 0.19 },
        { number: 'AN-2097', date: new Date(2026, 10, 25) },
    );
    assert.deepStrictEqual(data.items.map((i) => [i.title.split(' –')[0], i.qty]), [
        ['Paketversand nach Südkorea', 1],
        ['Paketversand nach Südkorea', 1],
        ['Zuschlag Übergröße (OVER SIZE)', 2],
        ['Zuschlag Übergewicht (OVER WEIGHT)', 1],
        ['Handling Rollkoffer', 1],
        ['Mehrpaketzuschlag', 2],
    ]);
    assert.strictEqual(A.totals(data.items, 0.19).gross, order.total);
    assert.ok(data.terms.some((t) => t.includes('{Nr}')));
    assert.ok(data.items[0].text.includes('Inhalt: 3x Jeans'));
});
