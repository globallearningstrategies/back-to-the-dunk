// game-reminder — on game nights, nudge to log the game once it's over.
// A dispatcher cron calls this every 15 minutes, like the other reminders. It
// sends once the ET clock passes reminder_settings('game').send_time (default
// 22:00), at most once per ET day, only on a game night, and only if no game
// has been logged today. Tapping the notification opens /?log=game, which
// opens the game logger directly.
// Game nights follow the app: the weekly planner's selection for this week if
// there is one, otherwise the recurring game night from the schedule
// (default Thursday). Like the engine reminder, this is single-owner: it uses
// reminder_settings.user_id (or the first subscription's user).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const TZ = "America/New_York";
const etNow = () => new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const etDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
// Monday of the ET week containing `day` (YYYY-MM-DD), as YYYY-MM-DD.
const mondayOf = (day: string) => {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

export function isGameNight(today: string, state: Record<string, unknown>) {
  const plan = state["weeklyGamePlan"] as { weekId?: string; gameDays?: string[] } | undefined;
  const week = mondayOf(today);
  if (plan?.weekId === week && Array.isArray(plan.gameDays)) return plan.gameDays.includes(today);
  if (state["schedule:gameNight"] === false) return false;
  const dow = Number(state["schedule:gameDow"] ?? 4);
  const skip = state["schedule:skipGameWeek"];
  if (skip != null && etDate(new Date(Number(skip))) === week) return false;
  return new Date(today + "T12:00:00Z").getUTCDay() === dow;
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: pref } = await supabase.from("reminder_settings").select("send_time, enabled, last_sent_date, user_id").eq("id", "game").maybeSingle();
    if (pref && pref.enabled === false) return json({ sent: 0, note: "reminder disabled" });
    const sendTime = (pref?.send_time || "22:00").slice(0, 5);
    const today = etDate(new Date()), now = etNow();
    if (pref?.last_sent_date === today) return json({ sent: 0, note: "already sent today" });
    if (now < sendTime) return json({ sent: 0, note: `waiting for ${sendTime} ET (now ${now})` });

    const { data: subs, error: subErr } = await supabase.from("push_subscriptions").select("id, subscription, user_id");
    if (subErr) return json({ error: subErr.message }, 500);
    if (!subs || subs.length === 0) return json({ sent: 0, note: "no subscriptions yet" });
    const userId = pref?.user_id || subs[0].user_id;
    if (!userId) return json({ sent: 0, note: "no owner" });

    const { data: rows, error: stErr } = await supabase.from("user_state").select("key, value").eq("user_id", userId)
      .in("key", ["weeklyGamePlan", "schedule:gameNight", "schedule:gameDow", "schedule:skipGameWeek"]);
    if (stErr) return json({ error: stErr.message }, 500);
    const state = Object.fromEntries((rows || []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
    if (!isGameNight(today, state)) return json({ sent: 0, note: "not a game night" });

    const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    const { data: games, error: gErr } = await supabase.from("cardio_sessions").select("completed_at")
      .eq("user_id", userId).eq("workout_type", "game").gte("completed_at", since);
    if (gErr) return json({ error: gErr.message }, 500);
    if ((games || []).some((g: { completed_at: string }) => etDate(new Date(g.completed_at)) === today)) return json({ sent: 0, note: "game already logged" });

    const { data: cfg, error: cfgErr } = await supabase.from("app_config").select("key, value").in("key", ["vapid_public", "vapid_private"]);
    if (cfgErr) return json({ error: cfgErr.message }, 500);
    const vapidPublic = cfg?.find((r: any) => r.key === "vapid_public")?.value;
    const vapidPrivate = cfg?.find((r: any) => r.key === "vapid_private")?.value;
    if (!vapidPublic || !vapidPrivate) return json({ error: "VAPID keys missing from app_config" }, 500);
    webpush.setVapidDetails((Deno.env.get("VAPID_SUBJECT") || Deno.env.get("SUPABASE_URL")!), vapidPublic, vapidPrivate);

    const payload = JSON.stringify({ title: "🏀 How did tonight go?", body: "Log your points, rebounds and how your engine felt — under a minute.", url: "/?log=game" });
    let sent = 0, pruned = 0;
    for (const s of subs.filter((s: any) => !s.user_id || s.user_id === userId)) {
      try { await webpush.sendNotification(s.subscription, payload); sent++; }
      catch (e: any) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) { await supabase.from("push_subscriptions").delete().eq("id", s.id); pruned++; }
      }
    }
    await supabase.from("reminder_settings").upsert({ id: "game", user_id: userId, last_sent_date: today, ...(pref ? {} : { send_time: "22:00", enabled: true }) });
    return json({ sent, pruned, at: now });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
