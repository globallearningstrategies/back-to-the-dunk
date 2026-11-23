// weekly-recap — Sunday-evening summary of the week (Mon–Sun, Eastern time).
// A dispatcher cron calls this every 15 minutes, like the other reminders. It
// sends on Sundays once the ET clock passes reminder_settings('recap').send_time
// (default 19:00), at most once that day. Tapping it opens /?recap=week.
// Engine figures mirror the app: load = minutes × effort, Sweat440 strength
// classes at 60%, brisk walks in full at effort 4, easy walks at half weight
// (effort 3), daily decay with tau = 42. Single-owner, like the other reminders.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const TAU = 42;
const TZ = "America/New_York";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const etNow = () => new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const etDate = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
const etWeekday = () => new Date().toLocaleDateString("en-US", { timeZone: TZ, weekday: "short" });
const addDays = (day: string, n: number) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function engineAt(loads: Map<string, number>, day: string) {
  const days = [...loads.keys()].sort();
  if (!days.length || days[0] > day) return 0;
  let F = 0;
  for (let d = days[0]; ; d = addDays(d, 1)) {
    F *= 1 - 1 / TAU;
    F += (loads.get(d) || 0) / TAU;
    if (d >= day) break;
  }
  return F;
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: pref } = await supabase.from("reminder_settings").select("send_time, enabled, last_sent_date, user_id").eq("id", "recap").maybeSingle();
    if (pref && pref.enabled === false) return json({ sent: 0, note: "recap disabled" });
    const sendTime = (pref?.send_time || "19:00").slice(0, 5);
    const today = etDate(new Date()), now = etNow();
    if (etWeekday() !== "Sun") return json({ sent: 0, note: "recap goes out on Sundays" });
    if (pref?.last_sent_date === today) return json({ sent: 0, note: "already sent today" });
    if (now < sendTime) return json({ sent: 0, note: `waiting for ${sendTime} ET (now ${now})` });

    const { data: subs, error: subErr } = await supabase.from("push_subscriptions").select("id, subscription, user_id");
    if (subErr) return json({ error: subErr.message }, 500);
    if (!subs || subs.length === 0) return json({ sent: 0, note: "no subscriptions yet" });
    const userId = pref?.user_id || subs[0].user_id;
    if (!userId) return json({ sent: 0, note: "no owner" });

    const monday = addDays(today, -6);
    const inWeek = (d: string) => d >= monday && d <= today;
    const loads = new Map<string, number>();
    const add = (day: string, load: number) => { if (load > 0) loads.set(day, (loads.get(day) || 0) + load); };

    const { data: cardio, error: cErr } = await supabase.from("cardio_sessions")
      .select("workout_type, completed_at, duration_min, rpe, focus, notes, points, rebounds").eq("user_id", userId).limit(10000);
    if (cErr) return json({ error: cErr.message }, 500);
    let sessions = 0;
    const games: { points: number | null; rebounds: number | null }[] = [];
    for (const s of cardio || []) {
      const day = etDate(s.completed_at), dur = Number(s.duration_min) || 0;
      add(day, s.workout_type === "cross_training" ? dur * (s.rpe || 8) * (s.focus === "cardio" ? 1 : 0.6) : dur * (s.rpe || 8));
      if (inWeek(day)) { sessions++; if (s.workout_type === "game") games.push({ points: s.points, rebounds: s.rebounds }); }
    }
    const { data: workouts, error: wErr } = await supabase.from("workouts").select("session_name, logged_at, exercises").eq("user_id", userId).limit(10000);
    if (wErr) return json({ error: wErr.message }, 500);
    let brisk = 0;
    for (const w of workouts || []) {
      const day = etDate(w.logged_at);
      if (w.session_name === "Treadmill Walk") {
        const ex = (w.exercises || [])[0] || {};
        const mins = Number(ex.duration) || 0, isBrisk = ex.pace === "brisk";
        add(day, isBrisk ? mins * 4 : mins * 0.5 * 3);
        if (inWeek(day) && isBrisk) brisk++;
      }
      if (inWeek(day)) sessions++;
    }
    const { data: shots, error: sErr } = await supabase.from("user_state").select("value").eq("user_id", userId).like("key", "shooting:%");
    if (sErr) return json({ error: sErr.message }, 500);
    let attempts = 0, counted = 0, makes = 0;
    for (const r of shots || []) {
      const v = r.value as { at?: string; attempts?: number; makes?: number | null; kind?: string } | null;
      if (!v || !v.at || v.kind === "ft" || !inWeek(etDate(v.at))) continue;
      attempts += Number(v.attempts) || 0;
      if (v.makes != null) { counted += Number(v.attempts) || 0; makes += Number(v.makes) || 0; }
    }

    const engineEnd = engineAt(loads, today), engineStart = engineAt(loads, addDays(monday, -1));
    const change = engineEnd - engineStart;
    const best = games.filter(g => g.points != null).sort((a, b) => (b.points || 0) - (a.points || 0))[0];
    const bits = [
      games.length ? `${games.length} ${games.length === 1 ? "game" : "games"}${best ? ` (best ${best.points} pts${best.rebounds != null ? `, ${best.rebounds} reb` : ""})` : ""}` : null,
      attempts ? `${attempts} threes${counted ? ` at ${Math.round(makes / counted * 100)}%` : ""}` : null,
      brisk ? `${brisk} brisk ${brisk === 1 ? "walk" : "walks"}` : null,
    ].filter(Boolean);
    const title = `📊 Your week: ${sessions} ${sessions === 1 ? "session" : "sessions"} · Engine ${engineEnd.toFixed(1)} (${change >= 0 ? "▲" : "▼"}${Math.abs(change).toFixed(1)})`;
    const body = bits.length ? `${bits.join(" · ")}. Tap for your full week.` : "Tap to see your week and plan the next one.";

    const { data: cfg, error: cfgErr } = await supabase.from("app_config").select("key, value").in("key", ["vapid_public", "vapid_private"]);
    if (cfgErr) return json({ error: cfgErr.message }, 500);
    const vapidPublic = cfg?.find((r: any) => r.key === "vapid_public")?.value;
    const vapidPrivate = cfg?.find((r: any) => r.key === "vapid_private")?.value;
    if (!vapidPublic || !vapidPrivate) return json({ error: "VAPID keys missing from app_config" }, 500);
    webpush.setVapidDetails((Deno.env.get("VAPID_SUBJECT") || Deno.env.get("SUPABASE_URL")!), vapidPublic, vapidPrivate);

    const payload = JSON.stringify({ title, body, url: "/?recap=week" });
    let sent = 0, pruned = 0;
    for (const s of subs.filter((s: any) => !s.user_id || s.user_id === userId)) {
      try { await webpush.sendNotification(s.subscription, payload); sent++; }
      catch (e: any) { if (e && (e.statusCode === 404 || e.statusCode === 410)) { await supabase.from("push_subscriptions").delete().eq("id", s.id); pruned++; } }
    }
    await supabase.from("reminder_settings").upsert({ id: "recap", user_id: userId, last_sent_date: today, ...(pref ? {} : { send_time: "19:00", enabled: true }) });
    return json({ sent, pruned, at: now, sessions, engine: Number(engineEnd.toFixed(1)) });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
