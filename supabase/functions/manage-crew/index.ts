// 관리자가 크루를 초대/삭제하는 Edge Function.
// service_role key는 여기(서버)에서만 쓰고, 클라이언트(schedule.html)에는 절대 내려주지 않는다.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "로그인이 필요합니다." }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 호출자 신원 확인: 호출자 본인의 JWT로 클라이언트를 만들어 본인 프로필을 조회한다.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "유효하지 않은 세션입니다." }, 401);
    }

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return json({ error: "관리자만 크루를 관리할 수 있습니다." }, 403);
    }

    const body = await req.json();
    // 여기부터는 service_role로 RLS를 우회해서 실제 계정 생성/삭제를 수행한다.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (body.action === "delete") {
      const { userId } = body;
      if (!userId) return json({ error: "userId는 필수입니다." }, 400);
      // auth.users를 지우면 profiles.id의 on delete cascade로 프로필도 같이 삭제된다.
      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteErr) {
        return json({ error: `삭제 실패: ${deleteErr.message}` }, 500);
      }
      return json({ ok: true });
    }

    if (body.action === "resend") {
      const { userId, redirectUrl } = body;
      if (!userId) return json({ error: "userId는 필수입니다." }, 400);
      const { data: existing, error: getErr } = await adminClient.auth.admin.getUserById(userId);
      if (getErr || !existing.user?.email) {
        return json({ error: "해당 크루의 이메일을 찾을 수 없습니다." }, 404);
      }
      const { error: reinviteErr } = await adminClient.auth.admin.inviteUserByEmail(existing.user.email, {
        redirectTo: redirectUrl || undefined,
      });
      if (reinviteErr) {
        return json({ error: `재전송 실패: ${reinviteErr.message}` }, 500);
      }
      return json({ ok: true });
    }

    // 기본 동작: 초대
    const { email, name, phone, canDrive, redirectUrl } = body;
    if (!email || !name) {
      return json({ error: "email과 name은 필수입니다." }, 400);
    }

    const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectUrl || undefined,
    });
    if (inviteErr) {
      return json({ error: `초대 이메일 발송 실패: ${inviteErr.message}` }, 500);
    }

    const { error: profileErr } = await adminClient.from("profiles").upsert({
      id: invited.user.id,
      name,
      phone: phone || null,
      role: "crew",
      can_drive: !!canDrive,
    });
    if (profileErr) {
      return json({ error: `프로필 생성 실패: ${profileErr.message}` }, 500);
    }

    return json({ ok: true, userId: invited.user.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
