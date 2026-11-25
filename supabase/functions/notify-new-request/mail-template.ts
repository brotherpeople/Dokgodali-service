// 배송 신청 접수 확인 메일 (신청인에게). index.ts의 sendRequestMail이 쓴다.
// 메일 프로그램은 <style>·외부 CSS를 지우는 곳이 많아 모든 스타일을 태그에 직접 쓰고, 레이아웃은 표로 잡는다.
// 색·글씨 크기는 배송 신청서(public/dokgodali-delivery.css)의 토큰과 같은 값.
const C = {
  page: "#f5f6fb", // --surface-subtle
  surface: "#ffffff",
  border: "#e3e5f0",
  text: "#1e1e1e",
  muted: "#6b7280",
  faint: "#9aa0b4",
  accent: "#e66a18",
  accentLight: "#fff1e7",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Gmail은 주소를 자동으로 파란 지도 링크로 바꾼다. 주소 칸만 숫자 뒤에 보이지 않는 폭 0 문자를 넣어 막는다.
const ADDRESS_ROWS = ["픽업지", "배송지"];
const noAutoLink = (s: string) => escapeHtml(s).replace(/(\d)/g, "$1&#8203;");

// deno-lint-ignore no-explicit-any
export function requestMailRows(record: any): [string, string][] {
  const p = record.payload || {};
  const boxes = Array.isArray(p.boxes) ? p.boxes.length : 0;
  const alts = (Array.isArray(p.scheduleAlternatives) ? p.scheduleAlternatives : []) as { date: string; time: string }[];
  const when = (d: string, t: string) => [d, t].filter(Boolean).join(" ");
  return [
    ["물건", boxes ? `박스 ${boxes}개 · 청구 ${p.chargeableKg ?? "-"}kg` : record.summary || ""],
    ["접수 방식", p.methodName || ""],
    ["희망 일시", [when(p.scheduleDate, p.scheduleTime), ...alts.map((a, i) => `${i + 2}순위 ${when(a.date, a.time)}`)]
      .filter(Boolean).map((s, i, all) => (all.length > 1 && i === 0 ? `1순위 ${s}` : s)).join("\n")],
    ["픽업지", p.method === "dropoff" ? "접수처 방문" : p.pickupAddress || ""],
    ["배송지", p.deliveryUndecided ? "미정" : [p.deliveryZip, p.deliveryAddress, p.deliveryAddressDetail].filter(Boolean).join(" ")],
  ];
}

// deno-lint-ignore no-explicit-any
export function requestMailText(record: any, link: string): string {
  const p = record.payload || {};
  const name = record.customer_name || "고객";
  const total = p.estimatedTotal != null ? `€${Number(p.estimatedTotal).toFixed(2)}` : "";
  return [
    `${name}님, 독고달이 한국 배송 신청이 접수되었습니다.`,
    "",
    `요청 번호: ${record.id}`,
    ...requestMailRows(record).map(([k, v]) => `${k}: ${v.replace(/\n/g, " / ")}`),
    ...(total ? [`예상 배송비: ${total}`] : []),
    "",
    "신청 내용을 고치려면 아래 링크를 여세요. 견적서가 발행되기 전까지 수정할 수 있습니다.",
    link,
    "",
    "이 링크를 가진 사람은 신청 내용을 고칠 수 있으니 다른 사람과 공유하지 마세요.",
    "담당자가 내용을 확인한 뒤 견적과 픽업 시간을 안내해 드립니다.",
    "",
    "독고달이 · info@dokgodali.de",
  ].join("\n");
}

// deno-lint-ignore no-explicit-any
export function requestMailHtml(record: any, link: string): string {
  const p = record.payload || {};
  const name = escapeHtml(record.customer_name || "고객");
  const total = p.estimatedTotal != null ? `€${Number(p.estimatedTotal).toFixed(2)}` : "-";
  const rows = requestMailRows(record)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr>
  <td style="padding:12px 16px 12px 0;border-top:1px solid ${C.border};color:${C.muted};font-size:13px;white-space:nowrap;vertical-align:top;width:72px">${escapeHtml(k)}</td>
  <td style="padding:12px 0;border-top:1px solid ${C.border};color:${C.text};font-size:14px;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere">${(ADDRESS_ROWS.includes(k) ? noAutoLink(v) : escapeHtml(v)).replace(/\n/g, "<br>")}</td>
</tr>`)
    .join("");
  const safeLink = escapeHtml(link);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${C.page}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};font-family:${FONT};color:${C.text}">
<tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 4px 16px;font-size:16px;font-weight:700;color:${C.text}">독고달이</td></tr>
    <tr><td style="background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:32px 28px">

      <div style="font-size:13px;font-weight:600;color:${C.accent}">배송 신청 접수 완료</div>
      <div style="margin-top:8px;font-size:22px;font-weight:700;line-height:1.4">${name}님, 신청이 접수되었습니다</div>
      <div style="margin-top:8px;font-size:14px;line-height:1.6;color:${C.muted}">담당자가 내용을 확인한 뒤 견적과 픽업 시간을 안내해 드립니다.</div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:${C.page};border-radius:8px">
        <tr>
          <td style="padding:14px 16px;font-size:13px;color:${C.muted}">요청 번호</td>
          <td align="right" style="padding:14px 16px;font-size:14px;font-weight:600;color:${C.text}">${escapeHtml(record.id)}</td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-collapse:collapse">
        ${rows}
        <tr>
          <td style="padding:16px 16px 0 0;border-top:1px solid ${C.border};font-size:14px;font-weight:700;white-space:nowrap">예상 배송비</td>
          <td align="right" style="padding:16px 0 0;border-top:1px solid ${C.border};font-size:22px;font-weight:700;color:${C.accent}">${total}</td>
        </tr>
      </table>
      <div style="margin-top:8px;font-size:12px;line-height:1.5;color:${C.faint};text-align:right">입고 후 실측한 크기·무게로 확정되며 달라질 수 있습니다.</div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:${C.accentLight};border-radius:8px">
        <tr><td style="padding:20px">
          <div style="font-size:14px;font-weight:700">신청 내용을 고쳐야 하나요?</div>
          <div style="margin-top:4px;font-size:13px;line-height:1.6;color:${C.muted}">견적서가 발행되기 전까지 아래 버튼으로 수정할 수 있습니다.</div>
          <a href="${safeLink}" style="display:inline-block;margin-top:14px;padding:12px 20px;border-radius:8px;background:${C.accent};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">신청 내용 수정하기</a>
        </td></tr>
      </table>

      <div style="margin-top:20px;font-size:12px;line-height:1.6;color:${C.faint}">
        버튼이 열리지 않으면 이 주소를 복사해 여세요.<br>
        <a href="${safeLink}" style="color:${C.muted};word-break:break-all">${safeLink}</a><br>
        이 링크를 가진 사람은 신청 내용을 고칠 수 있으니 다른 사람과 공유하지 마세요.
      </div>

    </td></tr>
    <tr><td align="center" style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:${C.faint}">
      독고달이 · <a href="mailto:info@dokgodali.de" style="color:${C.faint}">info@dokgodali.de</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}
