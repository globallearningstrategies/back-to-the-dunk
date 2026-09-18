// engine-reminder — nudge if the engine hasn't been fed today, at the user's
// chosen time. A dispatcher cron calls this every 15 minutes; it sends only
// once the ET clock passes reminder_settings.send_time, only once per ET day,
// and only if no aerobic work is logged yet. Mirrors the client's engine
// model (tau=42): load = minutes × RPE; Sweat440 strength classes earn 60%
// aerobic credit (their 40s-on/20s-off intervals keep the heart working),
// cardio classes 100%, walks half-minutes at RPE 3.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const TAU = 42;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const etNow = () => new Date().toLocaleTimeString("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
// ET calendar date (YYYY-MM-DD) for a timestamp — the user logs on ET time.
const etDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Respect the user's schedule ──
    const { data: pref } = await supabase.from("reminder_settings").select("send_time, enabled, last_sent_date, user_id").eq("id", "engine").maybeSingle();
    const sendTime = (pref?.send_time || "18:00").slice(0, 5);
    if (pref && pref.enabled === false) return json({ sent: 0, note: "reminder disabled" });
    const today = etDate(new Date().toISOString()), now = etNow();
    if (pref?.last_sent_date === today) return json({ sent: 0, note: "already sent today" });
    if (now < sendTime) return json({ sent: 0, note: `waiting for ${sendTime} ET (now ${now})` });

    // ── Gather aerobic load per ET day ──
    const loads = new Map<string, number>(); // etDate -> total load
    const add = (day: string, load: number) => { if (load > 0) loads.set(day, (loads.get(day) || 0) + load); };

    const { data: cardio, error: cErr } = await supabase
      .from("cardio_sessions").select("workout_type, completed_at, duration_min, rpe, focus")
      .order("completed_at", { ascending: true }).limit(5000);
    if (cErr) return json({ error: cErr.message }, 500);
    for (const s of cardio || []) {
      const dur = s.duration_min || 0;
      let load = 0;
      if (s.workout_type === "cross_training") load = dur * (s.rpe || 8) * (s.focus === "cardio" ? 1 : 0.6);
      else load = dur * (s.rpe || 8); // tabata / long_interval / game
      add(etDate(s.completed_at), load);
    }

    const { data: walks, error: wErr } = await supabase
      .from("workouts").select("logged_at, exercises").eq("session_name", "Treadmill Walk")
      .order("logged_at", { ascending: true }).limit(5000);
    if (wErr) return json({ error: wErr.message }, 500);
    for (const w of walks || []) {
      const mins = (w.exercises || []).reduce((a: number, e: any) => a + (e.duration || 0), 0);
      add(etDate(w.logged_at), mins * 0.5 * 3); // walks: half-minutes at RPE 3
    }

    if (loads.size === 0) return json({ sent: 0, note: "no aerobic history" });

    // ── Roll the model day by day up to today (ET) ──
    const days = [...loads.keys()].sort();
    let F = 0;
    for (let d = new Date(days[0] + "T12:00:00Z"); ; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      F *= 1 - 1 / TAU;
      F += (loads.get(key) || 0) / TAU;
      if (key >= today) break;
    }

    const fedToday = (loads.get(today) || 0) > 0;
    if (fedToday) return json({ sent: 0, fedToday: true, score: Math.round(F) });

    // ── Push to every subscribed device ──
    const { data: cfg, error: cfgErr } = await supabase.from("app_config").select("key, value").in("key", ["vapid_public", "vapid_private"]);
    if (cfgErr) return json({ error: cfgErr.message }, 500);
    const vapidPublic = cfg?.find((r: any) => r.key === "vapid_public")?.value;
    const vapidPrivate = cfg?.find((r: any) => r.key === "vapid_private")?.value;
    if (!vapidPublic || !vapidPrivate) return json({ error: "VAPID keys missing from app_config" }, 500);
    webpush.setVapidDetails((Deno.env.get("VAPID_SUBJECT") || Deno.env.get("SUPABASE_URL")!), vapidPublic, vapidPrivate);

    const { data: subs, error: subErr } = await supabase.from("push_subscriptions").select("id, subscription");
    if (subErr) return json({ error: subErr.message }, 500);
    if (!subs || subs.length === 0) return json({ sent: 0, note: "no subscriptions yet" });

    const score = Math.round(F);
    const bump10 = F > 0 ? (((10 * 9) / TAU) / F) * 100 : 0; // 10-min fast break at RPE 9
    const payload = JSON.stringify({
      title: `⛽ Engine at ${score} — unfed today`,
      body: `It idles −2.4% at midnight. Ten fast-break minutes buys +${bump10.toFixed(1)}%. Feed the engine.`,
      url: "/",
    });

    let sent = 0, pruned = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(s.subscription, payload);
        sent++;
      } catch (e: any) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
          pruned++;
        }
      }
    }
    if (pref?.user_id) await supabase.from("reminder_settings").upsert({ id: "engine", user_id: pref.user_id, last_sent_date: today });
    return json({ sent, pruned, score, fedToday: false, at: now });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
