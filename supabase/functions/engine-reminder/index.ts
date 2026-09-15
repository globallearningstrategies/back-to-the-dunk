// engine-reminder — evening nudge if the engine hasn't been fed today.
// Mirrors the client's Banister/CTL model (tau=42): each aerobic session adds
// minutes×RPE÷42; every day decays the score by 1/42 (−2.4%). If no aerobic
// work is logged today (ET) by the time this runs, push a reminder with the
// live score and what a 10-minute fast break would buy back.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const TAU = 42;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// ET calendar date (YYYY-MM-DD) for a timestamp — the user logs on ET time.
const etDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
      if (s.workout_type === "cross_training") load = s.focus === "cardio" ? dur * (s.rpe || 8) : 0;
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
    const today = etDate(new Date().toISOString());
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
    return json({ sent, pruned, score, fedToday: false });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

