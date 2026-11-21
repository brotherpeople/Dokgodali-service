/* 배송 요청 → 대량등록 엑셀 행 (reference/1-2. 대량등록_엑셀업로드_김선영_261005.xlsx 형식).
   품목 1개가 1행이고, 박스마다 묶음번호가 하나씩 붙는다. 열 순서와 헤더 문구는 샘플과 똑같이 둔다.
   클라이언트 확인 전 기본값: 묶음번호 = 요청번호-박스번호(Q1), 자동결제 2·통관구분 1(Q2),
   통관품목 번호 빈칸(Q3), 합계 = 수량×단가(Q4).
   서식(글꼴·색·너비·높이·틀 고정)은 참고 엑셀과 같게 하려고 템플릿 파일에 값만 채운다 (fillTemplate).
   브라우저에서는 window.DokgodaliExport, Node(테스트)에서는 module.exports로 쓴다. */
(function (root) {
    const HEADERS = [
        '묶음번호',
        '자동결제 여부\n( 자동결제 = 1, 수동결제 = 2 )',
        '수취인(한글)',
        '수취인(영문)',
        '휴대폰 번호',
        '우편번호',
        '수취인 주소',
        '상세주소 빈란일경우\n( - ) 칸 채워주세요',
        '수취인 주소(영문)',
        '상세주소 빈란일경우\n( - ) 칸 채워주세요',
        '통관구분\n( 개인 = 1, 사업자 = 2 )',
        '개인통관번호 또는 사업자번호',
        '센터 요청사항',
        '국내택배 요청사항',
        '통관품목 번호\n(hs코드 아니에요)',
        '쇼핑몰 URL',
        '쇼핑몰 오더번호',
        '상품명 (영문) * 해당란에 모두기재',
        '브랜드\n( - 표시: 빈란은 오류)',
        '색상\n( - 표시: 빈란은 오류)',
        '사이즈\n( - 표시: 빈란은 오류)',
        '수량',
        '합계',
        '이미지 URL',
        '상품URL',
        '(트래킹번호)\n실제입고될 트래킹번호',
    ];

    const text = (v) => String(v == null ? '' : v).trim();
    const orDash = (v) => text(v) || '-';
    const orDot = (v) => text(v) || '.';
    const round2 = (n) => Math.round(n * 100) / 100;
    // Daum 영문 주소는 ", Republic of Korea"로 끝난다. 샘플처럼 ", 우편번호, South Korea"로 맞춘다.
    const englishAddress = (en, zip) => {
        const base = text(en).replace(/,?\s*(Republic of Korea|South Korea|Korea)\s*$/i, '');
        return [base, text(zip), 'South Korea'].filter(Boolean).join(', ');
    };

    function toRows(request) {
        const p = (request && request.payload) || {};
        if (p.deliveryUndecided) throw new Error('delivery_undecided');
        const isMoving = ['moving', 'import'].includes(p.movingStatus);
        return (p.boxes || []).flatMap((box, b) => {
            const bundle = `${request.id}-${b + 1}`;
            const head = [
                bundle,
                '2',
                text(p.recipientNameKo),
                text(p.recipientNameEn),
                text(p.recipientPhone).replace(/\D/g, ''),
                text(p.deliveryZip),
                text(p.deliveryAddress),
                orDash(p.deliveryAddressDetail),
                englishAddress(p.deliveryAddressEn, p.deliveryZip),
                orDash(p.deliveryAddressDetailEn),
                '1',
                text(p.customsCode),
                [bundle, isMoving && '이사짐 통관'].filter(Boolean).join('/ '),
                '',
                '',
                '',
                '',
            ];
            return (box.items || []).map((it) => {
                const qty = Number(it.quantity) || 0;
                return [
                    ...head,
                    text(it.nameEn),
                    orDash(it.brand),
                    orDash(it.color),
                    orDash(it.size),
                    qty,
                    round2(qty * (Number(it.unitPrice) || 0)),
                    orDot(it.imageUrl),
                    orDot(it.productUrl),
                    '',
                ];
            });
        });
    }

    // 서식 템플릿(public/templates/bulk-upload-template.xlsx, 참고 엑셀에서 값만 지운 것)의 2행 서식을
    // 데이터 행마다 그대로 복사해 값을 채운다. worksheet는 ExcelJS 워크시트(브라우저·Node 공통).
    function fillTemplate(worksheet, rows) {
        const template = worksheet.getRow(2);
        const styles = HEADERS.map((_, i) => JSON.parse(JSON.stringify(template.getCell(i + 1).style || {})));
        const height = template.height;
        rows.forEach((values, r) => {
            const row = worksheet.getRow(r + 2);
            values.forEach((value, c) => {
                const cell = row.getCell(c + 1);
                cell.value = value === '' ? null : value;
                cell.style = JSON.parse(JSON.stringify(styles[c]));
            });
            row.height = height;
        });
    }

    const api = { HEADERS, toRows, fillTemplate };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.DokgodaliExport = api;
})(typeof window !== 'undefined' ? window : globalThis);
