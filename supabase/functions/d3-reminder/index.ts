// d3-reminder — daily "take your Vitamin D3" push, at the user's chosen time.
// A dispatcher cron calls this every 15 minutes; it sends only once the ET
// clock passes reminder_settings.send_time, and only once per ET day.
// VAPID keys live in app_config (service-role-only table). Dead subscriptions are pruned.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const etNow = () => new Date().toLocaleTimeString("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
const etToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Respect the user's schedule ──
    const { data: pref } = await supabase.from("reminder_settings").select("send_time, enabled, last_sent_date, user_id").eq("id", "d3").maybeSingle();
    const sendTime = (pref?.send_time || "07:00").slice(0, 5);
    if (pref && pref.enabled === false) return json({ sent: 0, note: "reminder disabled" });
    const today = etToday(), now = etNow();
    if (pref?.last_sent_date === today) return json({ sent: 0, note: "already sent today" });
    if (now < sendTime) return json({ sent: 0, note: `waiting for ${sendTime} ET (now ${now})` });

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
    if (pref?.user_id) await supabase.from("reminder_settings").upsert({ id: "d3", user_id: pref.user_id, last_sent_date: today });
    return json({ sent, pruned, total: subs.length, at: now });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
