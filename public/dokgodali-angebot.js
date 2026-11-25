/* 배송 견적서(Angebot) PDF. 클라이언트가 쓰던 이사 견적서 스캔(internal/Angebot-samples)의 A4 양식을 따른다.
   - fromDeliveryRequest(request, settings, meta): 배송 신청(payload)을 견적서 데이터로 바꾼다.
   - render(jsPDF, data, logoPng): jsPDF 문서를 그려 돌려준다 (글자로 그려 선명하고 검색된다).
   - 회사 주소·세금번호·은행 정보(settings)는 코드에 두지 않고 호출하는 쪽이 넘긴다 (공개 저장소).
   가격은 부가세 포함(brutto)으로 적고, netto는 줄마다 brutto / (1 + 세율)을 반올림해 더한다
   (스캔 샘플: 170 + 110 = 280 → netto 142,86 + 92,44 = 235,30).
   브라우저에서는 window.DokgodaliAngebot, Node(테스트)에서는 module.exports. */
(function (root) {
    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    const pad = (n) => String(n).padStart(2, '0');
    const eur = (n) => round2(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' EUR';
    const kg = (n) => String(round2(n)).replace('.', ',') + ' kg';
    const dateDe = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    // '2026-12-01' → '01.12.26'
    const shortDate = (s) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
        return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : s || '';
    };
    const METHOD_DE = {
        premium: 'Premium-Abholung',
        fixed: 'Feste Abholung (dienstags)',
        region: 'Abholung außerhalb Berlins / außerhalb der festen Zeiten',
        dropoff: 'Abgabe in der Annahmestelle',
    };

    function netOf(gross, rate) {
        return round2(gross / (1 + rate));
    }
    function totals(items, rate) {
        const gross = round2(items.reduce((s, it) => s + round2(it.qty * it.unitPrice), 0));
        const net = round2(items.reduce((s, it) => s + netOf(round2(it.qty * it.unitPrice), rate), 0));
        return { net, vat: round2(gross - net), gross };
    }

    // 배송 신청 → 견적서 데이터. 항목 이름·조건 문구는 클라이언트 확인 전 임시 독일어 문구.
    function fromDeliveryRequest(request, settings, meta) {
        const p = request.payload || {};
        const Pricing = root.DokgodaliPricing || (typeof require === 'function' ? require('./dokgodali-delivery-pricing.js') : null);
        const boxes = p.boxes || [];
        const quotes = boxes.map((b) => b.quote || Pricing.quoteBox(b));
        const items = [];
        boxes.forEach((box, i) => {
            const q = quotes[i];
            const goods = (box.items || [])
                .map((it) => `${Number(it.quantity) || 1}x ${it.nameEn}`)
                .join(', ');
            items.push({
                title: `Paketversand nach Südkorea – Paket ${i + 1}`,
                text: `Maße ${q.dims.join(' × ')} cm, Ist-Gewicht ${kg(q.actual)}, Volumengewicht ${kg(q.volumetric)}, abgerechnet ${kg(q.chargeable)}` + (goods ? `. Inhalt: ${goods}` : ''),
                qty: 1,
                unitPrice: q.base,
            });
        });
        const count = (key) => quotes.filter((q) => q[key] > 0);
        const addFee = (list, key, title, text) => {
            if (!list.length) return;
            const sum = round2(list.reduce((s, q) => s + q[key], 0));
            const same = list.every((q) => q[key] === list[0][key]);
            items.push(same
                ? { title, text, qty: list.length, unitPrice: list[0][key] }
                : { title, text, qty: 1, unitPrice: sum });
        };
        addFee(count('oversize'), 'oversize', 'Zuschlag Übergröße (OVER SIZE)', 'Summe der Seiten ab 140 cm oder eine Seite ab 80 cm');
        addFee(count('overweight'), 'overweight', 'Zuschlag Übergewicht (OVER WEIGHT)', 'Ist-Gewicht ab 20 kg pro Paket');
        addFee(count('carrier'), 'carrier', 'Handling Rollkoffer', 'Schutzverpackung und gesonderte Behandlung für Gepäck mit Rollen');
        const multi = p.quoteTotals && p.quoteTotals.multiBox;
        if (multi) items.push({ title: 'Mehrpaketzuschlag', text: `${boxes.length} Pakete in einer Sendung`, qty: boxes.length, unitPrice: round2(multi / boxes.length) });
        if (Number(p.methodFee) > 0) items.push({ title: 'Abholung', text: METHOD_DE[p.method] || '', qty: 1, unitPrice: Number(p.methodFee) });

        const a = p.customerAddressParts || {};
        const deliveryEn = p.deliveryUndecided
            ? 'noch offen'
            : [p.deliveryAddressEn, p.deliveryAddressDetailEn, p.deliveryZip, 'Südkorea'].filter(Boolean).join(', ');
        const when = p.scheduleDate ? `${shortDate(p.scheduleDate)}${p.scheduleTime ? `, ${p.scheduleTime} Uhr` : ''}` : 'nach Absprache';
        meta = meta || {};
        return {
            number: meta.number || '',
            date: (meta.date || new Date()).toISOString(),
            customerNo: meta.customerNo || '',
            vatRate: settings.vatRate ?? 0.19,
            contact: settings.contactPerson,
            recipient: [p.customerNameEn || p.customerName, [a.street, a.houseNo].filter(Boolean).join(' '), [a.zip, a.city].filter(Boolean).join(' '), 'Deutschland'].filter(Boolean),
            intro: 'vielen Dank, dass Sie uns mit Ihrem Paketversand beauftragen möchten. Gerne unterbreiten wir Ihnen folgendes unverbindliches Angebot:',
            facts: [
                ['Logistikart:', 'Paketversand nach Südkorea'],
                ['Abholdatum:', when],
                ['Abholort:', p.method === 'dropoff' ? 'Abgabe in der Annahmestelle' : `${p.pickupAddress || ''} (${METHOD_DE[p.method] || ''})`],
                ['Zielort:', deliveryEn],
                ['Empfänger:', [p.recipientNameEn, p.recipientPhone].filter(Boolean).join(', ') || 'noch offen'],
                ['Ansprechpartner:', [p.customerNameEn || p.customerName, p.customerPhone, p.customerEmail].filter(Boolean).join(', ')],
            ],
            items,
            // {Nr} = 견적서 번호, {Betrag} = 총액(brutto). PDF를 그릴 때 채운다 (번호는 발행할 때 정해진다).
            terms: [
                'Verpackung: Die Pakete müssen transportgerecht verpackt und verschlossen sein.',
                'Maße und Gewicht: Das Angebot beruht auf Ihren Angaben. Maßgeblich sind die bei Eingang im Lager gemessenen Maße und Gewichte; Abweichungen werden nachberechnet.',
                'Einfuhrabgaben: Zoll und Einfuhrumsatzsteuer in Südkorea sind nicht enthalten und werden vom Empfänger getragen.',
                'Angebotsannahme: Erfolgt durch die Zahlung des Gesamtbetrags von {Betrag}.',
                "Verwendungszweck: Bitte die Angebotsnummer '{Nr}' angeben.",
                'Verbindliche Buchung: Der Versand erfolgt erst nach Erhalt des Zahlungseingangs.',
                'Haftung: Ihre Sendung ist im Rahmen der gesetzlichen Haftpflicht versichert.',
                'Gültigkeit des Angebots: Dieses Angebot ist ab Ausstellungsdatum für 3 Tage gültig.',
            ],
            payment: [
                'Der Gesamtbetrag in Höhe von {Betrag} ist vor dem Versand per Überweisung zu zahlen.',
            ],
            closing: ['Bei Fragen zum Angebot oder falls Sie weitere Informationen benötigen, sind wir gerne für Sie da.', 'Ihr Dokgodali - Team'],
        };
    }

    // ---------- PDF (A4, pt). 위치는 스캔 샘플을 기준으로 맞췄다.
    const PAGE = { w: 595.28, h: 841.89, left: 68, right: 527, footerTop: 735 };
    const COL = { pos: 74, desc: 98, qty: 352, unit: 448, total: 521 };

    // fonts: { regular, bold } base64 TTF (fonts/roboto-condensed.js). 스캔 샘플과 같은 Roboto Condensed.
    // 없으면 jsPDF 기본 Helvetica로 그린다.
    function render(jsPDF, data, settings, logoPng, fonts) {
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        let family = 'helvetica';
        if (fonts && fonts.regular && fonts.bold) {
            doc.addFileToVFS('RobotoCondensed-Regular.ttf', fonts.regular);
            doc.addFont('RobotoCondensed-Regular.ttf', 'RobotoCondensed', 'normal');
            doc.addFileToVFS('RobotoCondensed-Bold.ttf', fonts.bold);
            doc.addFont('RobotoCondensed-Bold.ttf', 'RobotoCondensed', 'bold');
            family = 'RobotoCondensed';
        }
        const font = (style, size) => { doc.setFont(family, style); doc.setFontSize(size); };
        const rate = Number(data.vatRate) || 0;
        const sums = totals(data.items, rate);
        const vatLabel = `${Math.round(rate * 1000) / 10}%`.replace('.', ',');
        const fill = (text) => String(text)
            .replace(/{Nr}/g, data.number || '')
            .replace(/{Betrag}/g, eur(sums.gross).replace(' EUR', ' €'));
        const pages = [];
        let y = 0;

        function header(first) {
            if (logoPng) doc.addImage(logoPng.data, 'PNG', PAGE.right - logoPng.w, 38, logoPng.w, logoPng.h);
            if (!first) return 150;
            font('normal', 6.5);
            doc.setTextColor(30);
            doc.text([settings.companyName, settings.addressLine].filter(Boolean).join(' - '), PAGE.left, 148);
            font('normal', 8.5);
            data.recipient.forEach((line, i) => doc.text(line, PAGE.left, 182 + i * 10.5));
            const rx = 357;
            font('normal', 10.5);
            doc.text('Angebots-Nr.', rx, 166);
            doc.text(data.number, PAGE.right, 166, { align: 'right' });
            font('normal', 6.5);
            doc.text('Datum', rx, 176);
            doc.text(dateDe(new Date(data.date)), PAGE.right, 176, { align: 'right' });
            doc.text('Ihre Kundennummer', rx, 194);
            doc.text(String(data.customerNo), PAGE.right, 194, { align: 'right' });
            doc.text('Ihr Ansprechpartner', rx, 205);
            doc.text(String(data.contact || ''), PAGE.right, 205, { align: 'right' });
            return 268;
        }
        function footer() {
            font('normal', 6);
            doc.setTextColor(30);
            const cols = [PAGE.left - 4, 180, 290, 412];
            (settings.footer || []).forEach((lines, i) => lines.forEach((line, j) => doc.text(line, cols[i], PAGE.footerTop + 10 + j * 9.5)));
        }
        function newPage(first) {
            if (!first) doc.addPage();
            pages.push(doc.getNumberOfPages());
            y = header(first);
        }
        function ensure(space) {
            if (y + space > PAGE.footerTop - 20) newPage(false);
        }
        const wrap = (text, width) => doc.splitTextToSize(text, width);

        newPage(true);
        font('bold', 12);
        doc.text(`Angebot ${data.number}`, PAGE.left, y);
        y += 32;
        font('normal', 8.5);
        doc.text('Sehr geehrte Damen und Herren,', PAGE.left, y);
        y += 18;
        wrap(data.intro, PAGE.right - PAGE.left).forEach((line) => { doc.text(line, PAGE.left, y); y += 11; });
        y += 9;
        data.facts.forEach(([label, value]) => {
            font('bold', 8.5);
            const labelW = Math.max(doc.getTextWidth(label) + 8, 62);
            const lines = (font('normal', 8.5), wrap(value, PAGE.right - PAGE.left - labelW));
            ensure(lines.length * 11 + 8);
            font('bold', 8.5);
            doc.text(label, PAGE.left, y);
            font('normal', 8.5);
            lines.forEach((line, i) => doc.text(line, PAGE.left + labelW, y + i * 11));
            y += lines.length * 11 + 8.5;
        });

        // 표 머리줄
        y += 6;
        const tableHead = () => {
            doc.setFillColor(30, 30, 30);
            doc.rect(PAGE.left, y - 10, PAGE.right - PAGE.left, 15, 'F');
            doc.setTextColor(255);
            font('normal', 9);
            doc.text('Pos.', COL.pos - 2, y);
            doc.text('Beschreibung', COL.desc, y);
            doc.text('Menge', COL.qty + 26, y, { align: 'right' });
            doc.text('Einzelpreis', COL.unit + 12, y, { align: 'right' });
            doc.text('Gesamtpreis', PAGE.right - 4, y, { align: 'right' });
            doc.setTextColor(30);
            y += 20;
        };
        tableHead();
        data.items.forEach((it, i) => {
            font('normal', 8.5);
            const descLines = it.text ? wrap(it.text, COL.qty - COL.desc - 22) : [];
            const titleLines = (font('bold', 8.5), wrap(it.title, COL.qty - COL.desc - 22));
            const h = (titleLines.length + descLines.length) * 11.5 + 10;
            if (y + h > PAGE.footerTop - 20) { newPage(false); tableHead(); }
            font('normal', 8.5);
            doc.text(`${i + 1}.`, COL.pos, y);
            doc.text(`${Number(it.qty).toFixed(2).replace('.', ',')} Stk`, COL.qty + 26, y, { align: 'right' });
            doc.text(eur(it.unitPrice), COL.unit + 12, y, { align: 'right' });
            doc.text(eur(it.qty * it.unitPrice), PAGE.right - 4, y, { align: 'right' });
            font('normal', 5.5);
            doc.text(`(Steuer ${vatLabel})`, PAGE.right - 4, y + 9, { align: 'right' });
            font('bold', 8.5);
            titleLines.forEach((line, j) => doc.text(line, COL.desc, y + j * 11.5));
            font('normal', 8.5);
            descLines.forEach((line, j) => doc.text(line, COL.desc, y + (titleLines.length + j) * 11.5 + 1));
            y += h;
        });

        // 합계
        ensure(70);
        doc.setDrawColor(30);
        doc.setLineWidth(0.8);
        doc.line(COL.desc - 2, y - 6, PAGE.right, y - 6);
        y += 9;
        const sumLine = (label, value, bold) => {
            font(bold ? 'bold' : 'normal', 8.5);
            doc.text(label, COL.desc, y);
            doc.text(value, PAGE.right - 4, y, { align: 'right' });
            y += 15.5;
        };
        sumLine('Gesamtbetrag netto', eur(sums.net));
        sumLine(`Umsatzsteuer ${vatLabel}`, eur(sums.vat));
        sumLine('Gesamtbetrag brutto', eur(sums.gross), true);

        // 조건 · 결제 · 맺음말
        y += 18;
        const block = (title, lines) => {
            ensure(40);
            font('bold', 8.5);
            doc.text(title, PAGE.left, y);
            y += 18;
            font('normal', 8.5);
            lines.forEach((text) => {
                const ls = wrap(`* ${text}`, PAGE.right - PAGE.left);
                ensure(ls.length * 11);
                ls.forEach((line, i) => doc.text(line, PAGE.left + (i ? 7 : 0), y + i * 11));
                y += ls.length * 11 + 1;
            });
            y += 14;
        };
        block('Vereinbarung:', data.terms.map(fill));
        block('Bezahlung:', data.payment.map(fill));
        y += 6;
        font('normal', 8.5);
        data.closing.forEach((line) => { ensure(16); doc.text(line, PAGE.left, y); y += 16; });

        const total = doc.getNumberOfPages();
        for (let n = 1; n <= total; n++) {
            doc.setPage(n);
            footer();
            font('normal', 6.5);
            doc.text(`${n}/${total}`, PAGE.right + 4, PAGE.footerTop, { align: 'right' });
        }
        return doc;
    }

    const api = { fromDeliveryRequest, render, totals, eur };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.DokgodaliAngebot = api;
})(typeof window !== 'undefined' ? window : globalThis);
