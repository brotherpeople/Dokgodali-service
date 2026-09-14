// requests 또는 schedules 테이블에 새 row가 insert되면(Supabase Database Webhook이 호출)
// 관리자들의 구독된 기기로 웹 푸시 알림을 보낸다. 두 테이블 각각에 대해 이 함수를 가리키는
// Database Webhook을 하나씩 등록해서 쓴다. service_role로 push_subscriptions/profiles를 읽는다.
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
    if (!record) return new Response("no record", { status: 400 });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT")!,
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );

    const { data: admins } = await sb.from("profiles").select("id").eq("role", "admin");
    if (!admins || admins.length === 0) return new Response("no admins", { status: 200 });

    const { data: subs } = await sb
      .from("push_subscriptions")
      .select("*")
      .in("user_id", admins.map((a) => a.id));
    if (!subs || subs.length === 0) return new Response("no subscriptions", { status: 200 });

    const notificationPayload = JSON.stringify(buildNotification(payload.table, record));

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

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});

// deno-lint-ignore no-explicit-any
function buildNotification(table: string, record: any) {
  if (table === "schedules") {
    return {
      title: "새 스케줄 등록",
      body: `${record.customer_name || "고객"} · ${record.job_date || ""} ${record.overall_time_range || ""}`.trim(),
      url: "dokgodali-schedule.html",
    };
  }
  // requests
  const typeLabel = record.type === "moving" ? "이사" : "배송";
  return {
    title: `신규 ${typeLabel} 요청`,
    body: `${record.customer_name || "고객"} · ${record.summary || ""}`,
    url: "dokgodali-schedule.html",
  };
}
