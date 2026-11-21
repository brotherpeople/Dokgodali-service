/* 배송 운임 계산 (dokgodali-delivery.html 전용).
   요율 출처: https://www.dokgodali.de/one-stop-delivery (2026-11-04 확인)
   클라이언트 확인 전 임의로 정한 값은 TODO(클라이언트 확인) 주석과 클라이언트_확인사항.md에 정리되어 있다.
   브라우저에서는 window.DokgodaliPricing, Node(테스트)에서는 module.exports로 쓴다. */
(function (root) {
    const RATES = {
        volumetricDivisor: 6000,
        // 요금표: 1kg €11.00부터 0.5kg마다 +€2.15 → 6.70 + 4.30 × kg
        // TODO(클라이언트 확인) #1: 30.5kg 초과도 같은 식으로 연장
        baseFixed: 6.7,
        basePerKg: 4.3,
        minWeightKg: 1, // TODO(클라이언트 확인) #3: 1kg 미만은 1kg으로 청구
        halfKgRoundingUpToKg: 30, // TODO(클라이언트 확인) #2: 30kg 초과는 1kg 단위 올림
        oversize: { fee: 20, sumCm: 140, sideCm: 80, freeVolumetricKg: 30, perKgOver: 1 },
        overweight: { fee: 20, actualKg: 20, freeActualKg: 30, perKgOver: 1 },
        multiBox: { minBoxes: 2, perBox: 3 }, // TODO(클라이언트 확인) #4: 전체 박스에 적용
        carrierHandling: 15,
        movingCustoms: 30,
        maxBoxes: 50,
    };

    const EPS = 1e-9;
    const round2 = (n) => Math.round(n * 100) / 100;

    // 0.5kg 미만은 0.5kg 단위로, 30kg 초과는 1kg 단위로 올림
    function roundWeight(kg) {
        const value = Number(kg) || 0;
        if (value <= RATES.halfKgRoundingUpToKg + EPS) return Math.ceil(value * 2 - EPS) / 2;
        return Math.ceil(value - EPS);
    }

    // 각 변은 1cm 단위 올림
    function roundDimensions(box) {
        return [box.length, box.width, box.height].map((cm) => Math.ceil((Number(cm) || 0) - EPS));
    }

    function volumetricWeight(box) {
        const [l, w, h] = roundDimensions(box);
        return roundWeight((l * w * h) / RATES.volumetricDivisor);
    }

    function baseRate(kg) {
        return round2(RATES.baseFixed + RATES.basePerKg * kg);
    }

    function quoteBox(box) {
        const dims = roundDimensions(box);
        const [l, w, h] = dims;
        const volumetric = volumetricWeight(box);
        const actual = roundWeight(box.weight);
        const chargeable = Math.max(RATES.minWeightKg, volumetric, actual);

        const o = RATES.oversize;
        const isOversize = l + w + h >= o.sumCm || Math.max(l, w, h) >= o.sideCm;
        const oversize = isOversize ? o.fee + Math.max(0, volumetric - o.freeVolumetricKg) * o.perKgOver : 0;

        const ow = RATES.overweight;
        const isOverweight = actual >= ow.actualKg;
        const overweight = isOverweight ? ow.fee + Math.max(0, actual - ow.freeActualKg) * ow.perKgOver : 0;

        const carrier = box.carrier ? RATES.carrierHandling : 0;
        const base = baseRate(chargeable);
        return {
            dims,
            volumetric,
            actual,
            chargeable,
            base,
            isOversize,
            oversize,
            isOverweight,
            overweight,
            carrier,
            total: round2(base + oversize + overweight + carrier),
        };
    }

    function quoteOrder({ boxes = [], movingCustoms = false } = {}) {
        const quoted = boxes.map(quoteBox);
        const sum = (key) => round2(quoted.reduce((acc, b) => acc + b[key], 0));
        const multiBox = quoted.length >= RATES.multiBox.minBoxes ? quoted.length * RATES.multiBox.perBox : 0;
        const customs = movingCustoms ? RATES.movingCustoms : 0;
        const totals = {
            base: sum('base'),
            oversize: sum('oversize'),
            overweight: sum('overweight'),
            carrier: sum('carrier'),
            multiBox,
            movingCustoms: customs,
        };
        const total = round2(Object.values(totals).reduce((a, b) => a + b, 0));
        return { boxes: quoted, chargeableKg: round2(quoted.reduce((a, b) => a + b.chargeable, 0)), totals, total };
    }

    const api = { RATES, roundWeight, roundDimensions, volumetricWeight, baseRate, quoteBox, quoteOrder };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.DokgodaliPricing = api;
})(typeof window !== 'undefined' ? window : globalThis);
