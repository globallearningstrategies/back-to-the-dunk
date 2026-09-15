// s440-schedule — live SWEAT440 Boca Raton class schedule.
// Source: Mindbody's public marketplace API (the same data behind mindbody.io),
// location slug sweat440-boca-raton (mb_site_id 5750129 — verified against the
// gym site's own widget config). Grouped by Eastern-time date, cached 6h.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SLUG = "sweat440-boca-raton";
const CACHE_KEY = "s440_schedule";
const TTL_MS = 6 * 3600 * 1000;
const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS });

const etDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const etTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const u = new URL(req.url);
    const force = u.searchParams.get("force") === "1";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (!force) {
      const { data } = await supabase.from("app_config").select("value").eq("key", CACHE_KEY).maybeSingle();
      if (data && data.value) {
        try {
          const cached = JSON.parse(data.value);
          if (Date.now() - cached.fetchedAt < TTL_MS) return json({ ...cached, cached: true });
        } catch (_) {}
      }
    }

    const from = new Date(Date.now() - 36 * 3600 * 1000), to = new Date(Date.now() + 8 * 86400000);
    const H = { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0", "Origin": "https://www.mindbody.io", "Referer": "https://www.mindbody.io/" };
    const byDate: Record<string, { name: string; first: string; last: string; count: number }[]> = {};
    let total = 0;
    for (let page = 1; page <= 6; page++) {
      const r = await fetch("https://prod-mkt-gateway.mindbody.io/v1/search/class_times", {
        method: "POST", headers: H,
        body: JSON.stringify({ sort: "start_time", page: { size: 100, number: page }, filter: { radius: 0, startTimeRanges: [{ from: from.toISOString(), to: to.toISOString() }], locationSlugs: [SLUG] } }),
      });
      if (!r.ok) { if (page === 1) return json({ error: "marketplace fetch failed", status: r.status }, 502); break; }
      const j = await r.json();
      const rows = j.data || [];
      total += rows.length;
      for (const d of rows) {
        const a = d.attributes || {};
        const name = a.displayName;
        const start = a.startTime;
        if (!name || !start) continue;
        const day = etDate(start);
        if (!byDate[day]) byDate[day] = [];
        let entry = byDate[day].find(e => e.name === name);
        if (!entry) { entry = { name, first: etTime(start), last: etTime(start), count: 0 }; byDate[day].push(entry); }
        entry.last = etTime(start);
        entry.count++;
      }
      if (rows.length < 100) break;
    }

    const payload = { fetchedAt: Date.now(), slug: SLUG, totalClassTimes: total, byDate };
    await supabase.from("app_config").upsert({ key: CACHE_KEY, value: JSON.stringify(payload) });
    return json({ ...payload, cached: false });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

