// 아래 테이블/이벤트에 대해 Supabase Database Webhook이 이 함수를 호출하면, 대상자의
// 구독된 기기로 웹 푸시를 보낸다. service_role로 push_subscriptions/profiles를 읽는다.
//
// 등록해야 하는 Database Webhook 목록 (전부 이 함수 하나를 가리킨다):
//   requests  - INSERT              -> 관리자: 신규 요청
//   schedules - INSERT              -> 관리자: 새 스케줄 등록
//   schedules - UPDATE              -> 새로 배정된 크루: 새 작업 배정
//   work_logs - INSERT              -> 관리자: 근무시간 승인 요청
//   work_logs - UPDATE              -> status가 pending이면 관리자(재제출), confirmed/rejected면 본인 크루
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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
