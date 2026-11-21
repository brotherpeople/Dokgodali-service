/* 물품명에서 배터리·의약품·위험물이 의심되는 품목을 찾는다 (dokgodali-delivery.html, dokgodali-schedule.html).
   경고만 하고 신청을 막지는 않는다. 오탐은 허용하고 놓치지 않는 쪽으로 넓게 잡았다 (11/09 피드백, Q6).
   영문은 단어 단위로(복수형 s/es 포함), 한글은 포함 여부로 찾는다.
   브라우저에서는 window.DokgodaliCaution, Node(테스트)에서는 module.exports로 쓴다. */
(function (root) {
    const KEYWORDS = {
        battery: {
            en: [
                'battery', 'batteries', 'power bank', 'powerbank', 'laptop', 'notebook', 'macbook', 'chromebook',
                'ipad', 'tablet', 'e-reader', 'kindle', 'smartphone', 'phone', 'iphone', 'smartwatch', 'watch',
                'fitness tracker', 'camera', 'gopro', 'drone', 'scale', 'flashlight', 'torch', 'headlamp', 'lantern',
                'speaker', 'headphone', 'earphone', 'earbud', 'airpods', 'shaver', 'razor', 'trimmer', 'epilator',
                'electric toothbrush', 'sonic toothbrush', 'massager', 'massage gun', 'thermometer', 'blood pressure',
                'hearing aid', 'e-cigarette', 'vape', 'e-bike', 'e-scooter', 'hoverboard', 'game console',
                'nintendo', 'playstation', 'controller', 'gamepad', 'remote control', 'wireless', 'bluetooth',
                'cordless', 'rechargeable', 'portable fan', 'handy fan', 'hair straightener', 'curling iron',
                'robot vacuum', 'dyson', 'led',
            ],
            ko: [
                '배터리', '건전지', '보조배터리', '노트북', '랩탑', '맥북', '태블릿', '아이패드', '휴대폰', '핸드폰',
                '스마트폰', '스마트워치', '시계', '카메라', '드론', '체중계', '저울', '손전등', '랜턴', '헤드랜턴',
                '스피커', '이어폰', '헤드폰', '에어팟', '면도기', '전동칫솔', '마사지기', '마사지건', '체온계',
                '혈압계', '보청기', '전자담배', '킥보드', '게임기', '무선', '블루투스', '충전식', '선풍기',
                '고데기', '청소기',
            ],
        },
        medicine: {
            en: [
                'medicine', 'medication', 'drug', 'pill', 'tablet', 'capsule', 'syrup', 'ointment', 'injection',
                'injector', 'syringe', 'insulin', 'antibiotic', 'painkiller', 'ibuprofen', 'paracetamol',
                'acetaminophen', 'aspirin', 'tylenol', 'antihistamine', 'prescription', 'pharmacy', 'apotheke',
                'melatonin', 'sleeping pill', 'diet pill', 'weight loss', 'ozempic', 'wegovy', 'mounjaro',
                'zepbound', 'saxenda', 'victoza', 'rybelsus', 'semaglutide', 'tirzepatide', 'liraglutide', 'glp-1',
                'viagra', 'cialis',
            ],
            ko: [
                '의약품', '약품', '상비약', '감기약', '소화제', '진통제', '해열제', '항생제', '처방약', '연고', '주사',
                '인슐린', '위고비', '마운자로', '삭센다', '오젬픽', '젭바운드', '비만치료제', '다이어트약', '수면제',
                '멜라토닌', '비아그라',
            ],
        },
        hazmat: {
            en: [
                'perfume', 'fragrance', 'cologne', 'eau de', 'diffuser', 'aerosol', 'spray', 'lighter', 'matches',
                'nail polish', 'nail remover', 'acetone', 'butane', 'camping gas', 'gas canister', 'fuel', 'paint',
                'solvent', 'bleach', 'fireworks', 'dry ice', 'mercury',
            ],
            ko: [
                '향수', '디퓨저', '스프레이', '에어로졸', '라이터', '성냥', '매니큐어', '리무버', '아세톤', '부탄',
                '가스', '연료', '페인트', '락스', '표백제', '폭죽', '드라이아이스',
            ],
        },
    };

    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const PATTERNS = Object.fromEntries(
        Object.entries(KEYWORDS).map(([kind, { en, ko }]) => [
            kind,
            new RegExp(
                `(?:^|[^a-z])(?:${en.map(escape).join('|')})(?:e?s)?(?![a-z])|${ko.map(escape).join('|')}`,
                'i',
            ),
        ]),
    );

    // 걸린 분류를 KEYWORDS 순서대로 돌려준다. 예: 'Tablets' → ['battery', 'medicine']
    function match(name) {
        const text = String(name || '');
        if (!text.trim()) return [];
        return Object.keys(PATTERNS).filter((kind) => PATTERNS[kind].test(text));
    }

    const LABELS = { battery: '배터리 의심', medicine: '의약품 의심', hazmat: '위험물 의심' };
    const api = { KEYWORDS, LABELS, match };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.DokgodaliCaution = api;
})(typeof window !== 'undefined' ? window : globalThis);
