// wg-sync — pull Weight Gurus readings into weight_log.
// Dedupe is by (Eastern date + weight to 0.1 lb), and the existing-rows read
// is PAGINATED — PostgREST caps a single select at 1000 rows, which once let
// every 6h run re-insert recent rows it couldn't see. Never again.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const etDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const keyOf = (d: Date, w: number) => `${etDate(d)}|${w.toFixed(1)}`;

Deno.serve(async (_req: Request) => {
  try {
    const email = Deno.env.get("WG_EMAIL");
    const password = Deno.env.get("WG_PASSWORD");
    if (!email || !password) return json({ error: "WG_EMAIL / WG_PASSWORD secrets are not set" }, 500);

    const loginRes = await fetch("https://api.weightgurus.com/v3/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, web: true }),
    });
    if (!loginRes.ok) return json({ error: "Weight Gurus login failed", status: loginRes.status }, 502);
    const { accessToken } = await loginRes.json();
    if (!accessToken) return json({ error: "Weight Gurus login returned no token" }, 502);

    const opRes = await fetch("https://api.weightgurus.com/v3/operation/", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!opRes.ok) return json({ error: "Weight Gurus operations fetch failed", status: opRes.status }, 502);
    const { operations = [] } = await opRes.json();
    const entries = new Map<string, any>();
    for (const op of operations) {
      if (!op || !op.entryTimestamp) continue;
      if (op.operationType === "delete") entries.delete(op.entryTimestamp);
      else entries.set(op.entryTimestamp, op);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: usersPage, error: uErr } = await supabase.auth.admin.listUsers({ perPage: 1 });
    const owner = usersPage?.users?.[0];
    if (uErr || !owner) return json({ error: "Could not resolve app owner: " + (uErr?.message || "no users") }, 500);

    // Read ALL existing rows, 1000 at a time (single selects are capped).
    const have = new Set<string>();
    for (let fromRow = 0; ; fromRow += 1000) {
      const { data: page, error: exErr } = await supabase
        .from("weight_log").select("logged_at, weight")
        .order("logged_at", { ascending: true })
        .range(fromRow, fromRow + 999);
      if (exErr) return json({ error: exErr.message }, 500);
      (page || []).forEach((r: any) => have.add(keyOf(new Date(r.logged_at), Number(r.weight))));
      if (!page || page.length < 1000) break;
    }

    const rows: any[] = [];
    for (const op of entries.values()) {
      const weight = op.weight / 10; // Weight Gurus reports tenths of a pound
      const when = new Date(op.entryTimestamp);
      if (!(weight > 50 && weight < 500) || Number.isNaN(when.getTime())) continue;
      const k = keyOf(when, weight);
      if (have.has(k)) continue;   // same weight already recorded that day
      have.add(k);                 // also dedupes within this batch
      rows.push({ weight, logged_at: when.toISOString(), user_id: owner.id });
    }

    if (rows.length) {
      const { error: insErr } = await supabase.from("weight_log").insert(rows);
      if (insErr) return json({ error: insErr.message }, 500);
    }
    return json({ synced: rows.length, onScale: entries.size, alreadyHad: have.size - rows.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

