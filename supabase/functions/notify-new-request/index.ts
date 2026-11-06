// 아래 테이블/이벤트에 대해 Supabase Database Webhook이 이 함수를 호출하면, 대상자의
// 구독된 기기로 웹 푸시를 보낸다. service_role로 push_subscriptions/profiles를 읽는다.
//
// 등록해야 하는 Database Webhook 목록 (전부 이 함수 하나를 가리킨다):
//   requests  - INSERT              -> 관리자: 신규 요청 / 신청인(배송): 접수 확인 + 수정 링크 메일
//   requests  - UPDATE              -> 고객이 수정 링크로 고쳤으면(edited_at 변경) 관리자: 요청 수정됨
//   schedules - INSERT              -> 관리자: 새 스케줄 등록
//   schedules - UPDATE              -> 새로 배정된 크루: 새 작업 배정
//   work_logs - INSERT              -> 관리자: 근무시간 승인 요청
//   work_logs - UPDATE              -> status가 pending이면 관리자(재제출), confirmed/rejected면 본인 크루
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import nodemailer from "npm:nodemailer@6.9.16";

// 신청인 메일 설정 (Edge Function Secrets):
//   SMTP_HOST, SMTP_PORT(465), SMTP_USER, SMTP_PASS(Gmail 앱 비밀번호), MAIL_FROM, SITE_URL
//   Edge Function은 25·587 포트로 나갈 수 없으므로 465(SSL)를 쓴다.
//   SITE_URL: 수정 링크가 가리킬 사이트 (dev: github.io, demo: netlify). 끝에 / 없이.

Deno.serve(async (req) => {
  try {
    // Database Webhook 설정 시 등록한 커스텀 헤더로 이 함수가 우리 웹훅에서만
    // 호출되는지 확인한다 (아무나 이 URL로 POST해서 알림을 스팸으로 못 보내게).
    const secret = req.headers.get("x-webhook-secret");
    if (secret !== Deno.env.get("WEBHOOK_SECRET")) {
      return new Response("unauthorized", { status: 401 });
    }

    const payload = await req.json();
    const record = payload.record;
    const oldRecord = payload.old_record;
    if (!record) return new Response("no record", { status: 400 });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (payload.table === "requests" && payload.type === "INSERT") {
      // 메일이 실패해도 관리자 푸시는 보내야 하므로 오류는 기록만 한다.
      await sendRequestMail(record).catch((e) => console.error("request mail failed:", e));
    }

    const jobs = await buildNotificationJobs(sb, payload.table, payload.type, record, oldRecord);
    if (jobs.length === 0) return new Response("no-op", { status: 200 });

    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT")!,
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );

    for (const job of jobs) {
      const userIds = job.audience === "admins" ? await getAdminIds(sb) : job.userIds;
      if (!userIds || userIds.length === 0) continue;

      const { data: subs } = await sb.from("push_subscriptions").select("*").in("user_id", userIds);
      if (!subs || subs.length === 0) continue;

      const notificationPayload = JSON.stringify({ title: job.title, body: job.body, url: job.url });
      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(sub.subscription, notificationPayload);
          } catch (err) {
            // 구독이 만료/취소된 기기(410 Gone 등)는 정리한다.
            if (err.statusCode === 404 || err.statusCode === 410) {
              await sb.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }),
      );
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});

async function getAdminIds(sb: ReturnType<typeof createClient>): Promise<string[]> {
  const { data: admins } = await sb.from("profiles").select("id").eq("role", "admin");
  return (admins || []).map((a: { id: string }) => a.id);
}

// assignments jsonb 배열([{userId, startTime, ...}])에서 새로 추가된 userId만 뽑아낸다.
// deno-lint-ignore no-explicit-any
function newlyAssignedUserIds(record: any, oldRecord: any): string[] {
  const oldIds = new Set((oldRecord?.assignments || []).map((a: { userId: string }) => a.userId));
  const newIds = (record.assignments || []).map((a: { userId: string }) => a.userId).filter(Boolean);
  return newIds.filter((id: string) => !oldIds.has(id));
}

type NotificationJob =
  | { audience: "admins"; title: string; body: string; url: string }
  | { audience: "users"; userIds: string[]; title: string; body: string; url: string };

async function buildNotificationJobs(
  sb: ReturnType<typeof createClient>,
  table: string,
  eventType: string,
  // deno-lint-ignore no-explicit-any
  record: any,
  // deno-lint-ignore no-explicit-any
  oldRecord: any,
): Promise<NotificationJob[]> {
  if (table === "requests" && eventType === "INSERT") {
    const typeLabel = record.type === "moving" ? "이사" : "배송";
    return [{
      audience: "admins",
      title: `신규 ${typeLabel} 요청`,
      body: `${record.customer_name || "고객"} · ${record.summary || ""}`,
      url: "dokgodali-schedule.html",
    }];
  }

  // 관리자의 확정·견적서 표시 등도 UPDATE지만 edited_at은 고객 수정(update_request)일 때만 바뀐다.
  if (table === "requests" && eventType === "UPDATE") {
    if (!record.edited_at || record.edited_at === oldRecord?.edited_at) return [];
    return [{
      audience: "admins",
      title: record.status === "confirmed" ? "확정된 배송 요청이 수정됨" : "배송 요청 수정됨",
      body: `${record.customer_name || "고객"} · 고객 수정 ${record.edit_count || 1}회${record.status === "confirmed" ? " · 스케줄 확인 필요" : ""}`,
      url: "dokgodali-schedule.html",
    }];
  }

  if (table === "schedules" && eventType === "INSERT") {
    return [{
      audience: "admins",
      title: "새 스케줄 등록",
      body: `${record.customer_name || "고객"} · ${record.job_date || ""} ${record.overall_time_range || ""}`.trim(),
      url: "dokgodali-schedule.html",
    }];
  }

  if (table === "schedules" && eventType === "UPDATE") {
    const assignedIds = newlyAssignedUserIds(record, oldRecord);
    if (assignedIds.length === 0) return [];
    return [{
      audience: "users",
      userIds: assignedIds,
      title: "새 작업 배정",
      body: `${record.job_date || ""} ${record.overall_time_range || ""} · ${record.origin_address || ""} → ${record.dest_address || ""}`.trim(),
      url: "dokgodali-schedule.html",
    }];
  }

  if (table === "work_logs" && eventType === "INSERT") {
    const body = await worklogAdminBody(sb, record);
    return [{ audience: "admins", title: "근무시간 승인 요청", body, url: "dokgodali-schedule.html" }];
  }

  if (table === "work_logs" && eventType === "UPDATE") {
    if (record.status === "pending") {
      // 크루가 기존 제출 건을 수정해서 다시 대기중 상태로 돌아온 경우.
      const body = await worklogAdminBody(sb, record);
      return [{ audience: "admins", title: "근무시간 재제출", body, url: "dokgodali-schedule.html" }];
    }
    if (record.status === "confirmed" || record.status === "rejected") {
      const statusLabel = record.status === "confirmed" ? "승인" : "반려";
      const reasonSuffix = record.status === "rejected" && record.reject_reason ? ` · ${record.reject_reason}` : "";
      return [{
        audience: "users",
        userIds: [record.user_id],
        title: `근무시간 ${statusLabel}`,
        body: `${record.job_date || ""} ${record.actual_start || ""}~${record.actual_end || ""}${reasonSuffix}`,
        url: "dokgodali-schedule.html",
      }];
    }
  }

  return [];
}

// deno-lint-ignore no-explicit-any
async function worklogAdminBody(sb: ReturnType<typeof createClient>, record: any): Promise<string> {
  const { data: profile } = await sb.from("profiles").select("name").eq("id", record.user_id).maybeSingle();
  const name = profile?.name || "크루";
  return `${name} · ${record.job_date || ""} ${record.actual_start || ""}~${record.actual_end || ""}`;
}

// ---------- 신청인 메일: 접수 확인 + 수정 링크 (배송 요청만)
const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// deno-lint-ignore no-explicit-any
async function sendRequestMail(record: any) {
  if (record.type !== "delivery" || !record.edit_key || !record.customer_email) return;
  const env = (k: string) => Deno.env.get(k) || "";
  if (!env("SMTP_HOST") || !env("SMTP_USER") || !env("SMTP_PASS") || !env("SITE_URL")) {
    console.warn("request mail skipped: SMTP_* or SITE_URL secret missing");
    return;
  }
  const p = record.payload || {};
  const link = `${env("SITE_URL")}/dokgodali-delivery.html?edit=${encodeURIComponent(record.id)}&key=${encodeURIComponent(record.edit_key)}`;
  const rows: [string, string][] = [
    ["요청 번호", record.id],
    ["물건", record.summary || ""],
    ["접수 방식", [p.methodName, p.scheduleDate, p.scheduleTime].filter(Boolean).join(" · ")],
    ["픽업지", p.method === "dropoff" ? "접수처 방문" : p.pickupAddress || ""],
    ["배송지", p.deliveryUndecided ? "미정" : `${p.deliveryZip || ""} ${p.deliveryAddress || ""}`.trim()],
    ["예상 배송비", p.estimatedTotal != null ? `€${Number(p.estimatedTotal).toFixed(2)}` : ""],
  ];
  const name = record.customer_name || "고객";
  const text = [
    `${name}님, 독고달이 한국 배송 신청이 접수되었습니다.`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "신청 내용을 고치려면 아래 링크를 여세요. 견적서가 발행되기 전까지 수정할 수 있습니다.",
    link,
    "",
    "이 링크를 가진 사람은 신청 내용을 고칠 수 있으니 다른 사람과 공유하지 마세요.",
    "담당자가 내용을 확인한 뒤 견적과 픽업 시간을 안내해 드립니다.",
    "",
    "독고달이 · info@dokgodali.de",
  ].join("\n");
  const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#1f2333;max-width:560px">
<p><strong>${escapeHtml(name)}</strong>님, 독고달이 한국 배송 신청이 접수되었습니다.</p>
<table style="border-collapse:collapse;font-size:13px">${rows
    .map(([k, v]) => `<tr><td style="padding:3px 14px 3px 0;color:#6b7280;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:3px 0">${escapeHtml(v)}</td></tr>`)
    .join("")}</table>
<p style="margin-top:18px">신청 내용을 고치려면 아래 버튼을 눌러 주세요. 견적서가 발행되기 전까지 수정할 수 있습니다.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#e66a18;color:#fff;text-decoration:none;font-weight:700">신청 내용 수정하기</a></p>
<p style="font-size:12px;color:#6b7280">버튼이 열리지 않으면 이 주소를 복사해 여세요:<br>${escapeHtml(link)}</p>
<p style="font-size:12px;color:#6b7280">이 링크를 가진 사람은 신청 내용을 고칠 수 있으니 다른 사람과 공유하지 마세요.<br>담당자가 내용을 확인한 뒤 견적과 픽업 시간을 안내해 드립니다.</p>
<p style="font-size:12px;color:#6b7280">독고달이 · info@dokgodali.de</p></div>`;

  const transporter = nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT") || 465),
    secure: true,
    auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
  });
  await transporter.sendMail({
    from: env("MAIL_FROM") || env("SMTP_USER"),
    to: record.customer_email,
    subject: `[독고달이] 배송 신청이 접수되었습니다 (${record.id})`,
    text,
    html,
  });
}
