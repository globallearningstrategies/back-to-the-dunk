// d3-reminder — send the daily "take your Vitamin D3" push to every subscribed device.
// VAPID keys live in app_config (service-role-only table). Dead subscriptions are pruned.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: cfg, error: cfgErr } = await supabase.from("app_config").select("key, value").in("key", ["vapid_public", "vapid_private"]);
    if (cfgErr) return json({ error: cfgErr.message }, 500);
    const vapidPublic = cfg?.find((r: any) => r.key === "vapid_public")?.value;
    const vapidPrivate = cfg?.find((r: any) => r.key === "vapid_private")?.value;
    if (!vapidPublic || !vapidPrivate) return json({ error: "VAPID keys missing from app_config" }, 500);
    webpush.setVapidDetails((Deno.env.get("VAPID_SUBJECT") || Deno.env.get("SUPABASE_URL")!), vapidPublic, vapidPrivate);

    const { data: subs, error: subErr } = await supabase.from("push_subscriptions").select("id, subscription");
    if (subErr) return json({ error: subErr.message }, 500);
    if (!subs || subs.length === 0) return json({ sent: 0, note: "no subscriptions yet" });

    const payload = JSON.stringify({
      title: "💊 Vitamin D3 time",
      body: "Take it, then tap to log it. Keep the stack streak alive.",
      url: "/",
    });

    let sent = 0, pruned = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(s.subscription, payload);
        sent++;
      } catch (e: any) {
        // 404/410 = subscription expired or revoked — clean it up.
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
          pruned++;
        }
      }
    }
    return json({ sent, pruned, total: subs.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

