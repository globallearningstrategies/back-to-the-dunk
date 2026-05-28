import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

/* ════════════════════════════════════════════════════════════
   SUPPLEMENT TRACKER — daily checkbox, Supabase-backed
   Drop-in component for Back to the Dunk.
   Self-contained: redeclares the few design tokens + helpers it
   needs so it doesn't depend on anything internal to App.js.
   ════════════════════════════════════════════════════════════ */

const C = {
  ink: "#FAFAF7",
  panel: "#FFFFFF",
  raised: "#F4F2EC",
  line: "#E5E1D8",
  faint: "#D4CFC2",
  bone: "#0A0908",
  cream: "#1F1C18",
  dim: "#6B655B",
  mute: "#9A9389",
  rust: "#E0451A",
  moss: "#65A30D",
  amber: "#D97706",
  electric: "#0891B2",
};

const FONT_DISPLAY = `"Bricolage Grotesque", -apple-system, system-ui, sans-serif`;
const FONT_SERIF = `"Instrument Serif", "Times New Roman", serif`;
const FONT_MONO = `"JetBrains Mono", ui-monospace, monospace`;

/* LOCAL timezone date key — day rolls over at YOUR midnight, not UTC's */
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* Light haptic-style beep, matches the rest of the app */
function beep(freq, dur, vol) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq || 880;
    gain.gain.setValueAtTime(vol || 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.08));
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + (dur || 0.08));
  } catch (e) {}
}

/* Minimal local versions of the app's primitives so this file stands alone */
function Eyebrow({ children, color = C.dim }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
      color, fontWeight: 600, fontFamily: FONT_MONO,
    }}>{children}</div>
  );
}

function Pill({ children, color = C.rust }) {
  return (
    <span style={{
      background: color + "15", color, border: `1px solid ${color}30`,
      borderRadius: 999, padding: "5px 10px",
      fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
      textTransform: "uppercase", fontFamily: FONT_MONO, display: "inline-block",
    }}>{children}</span>
  );
}

function Surface({ children, accent, style = {}, padding = 20 }) {
  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${accent ? accent + "30" : C.line}`,
      borderRadius: 18, padding, marginBottom: 14,
      position: "relative", overflow: "hidden", ...style,
    }}>
      {accent && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 0% 0%, ${accent}10, transparent 60%)`, pointerEvents: "none" }} />}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

export default function SupplementTracker() {
  const [supps, setSupps] = useState([]);
  const [takenToday, setTakenToday] = useState({}); // { supplement_id: true }
  const [loading, setLoading] = useState(true);
  const today = todayKey();

  const load = useCallback(async () => {
    try {
      const [{ data: list }, { data: log }] = await Promise.all([
        supabase.from("supplements").select("*").eq("active", true).order("sort_order"),
        supabase.from("supplement_log").select("supplement_id").eq("taken_on", today),
      ]);
      if (list) setSupps(list);
      if (log) setTakenToday(Object.fromEntries(log.map(r => [r.supplement_id, true])));
    } catch (e) {}
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (supp) => {
    const isTaken = takenToday[supp.id];
    // optimistic update
    setTakenToday(p => ({ ...p, [supp.id]: !isTaken }));
    beep(880, 0.06, 0.25);
    if (navigator.vibrate) navigator.vibrate(8);

    if (isTaken) {
      const { error } = await supabase.from("supplement_log")
        .delete().eq("supplement_id", supp.id).eq("taken_on", today);
      if (error) setTakenToday(p => ({ ...p, [supp.id]: true })); // revert
    } else {
      const { error } = await supabase.from("supplement_log")
        .insert([{ supplement_id: supp.id, taken_on: today }]);
      if (error) setTakenToday(p => ({ ...p, [supp.id]: false })); // revert
    }
  };

  const doneCount = supps.filter(s => takenToday[s.id]).length;
  const allDone = supps.length > 0 && doneCount === supps.length;
  const ringColor = allDone ? C.moss : doneCount > 0 ? C.amber : C.electric;

  if (loading || supps.length === 0) return null;

  return (
    <div className="ease-up-1">
      <Surface accent={ringColor}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <Eyebrow color={ringColor}>Today · Supplements</Eyebrow>
            <p className="h-serif" style={{ fontSize: 14, color: C.dim, margin: "6px 0 0", fontFamily: FONT_SERIF, fontStyle: "italic" }}>
              {allDone ? "All taken. Locked in." : `${doneCount} of ${supps.length} done`}
            </p>
          </div>
          <Pill color={ringColor}>{doneCount}/{supps.length}</Pill>
        </div>

        {supps.map((s, i) => {
          const taken = takenToday[s.id];
          return (
            <button
              key={s.id}
              onClick={() => toggle(s)}
              className="btn"
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14,
                padding: "14px 0", background: "transparent", border: "none",
                borderBottom: i < supps.length - 1 ? `1px solid ${C.line}` : "none",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: taken ? ringColor : "transparent",
                border: `1.5px solid ${taken ? ringColor : C.faint}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {taken && <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1 5L4.5 8.5L12 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{
                fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em",
                fontFamily: FONT_DISPLAY,
                color: taken ? C.dim : C.bone,
                textDecoration: taken ? "line-through" : "none",
                textDecorationColor: C.dim,
              }}>{s.name}</span>
            </button>
          );
        })}
      </Surface>
    </div>
  );
}
