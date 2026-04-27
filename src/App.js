import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

/* ════════════════════════════════════════════════════════════
   DESIGN SYSTEM — Athletic Editorial
   Bricolage Grotesque (display) + Instrument Serif (accent)
   Deep ink black → bold orange accent → tactical greens
   ════════════════════════════════════════════════════════════ */

const C = {
  ink:      "#0A0908",
  panel:    "#13110F",
  raised:   "#1C1A17",
  line:     "#26231F",
  faint:    "#2F2C28",
  bone:     "#F5F1EA",
  cream:    "#E8E2D5",
  dim:      "#7A746A",
  mute:     "#56514A",
  rust:     "#FF5A1F",
  rustHi:   "#FF7A4A",
  amber:    "#F59E0B",
  moss:     "#84CC16",
  electric: "#22D3EE",
  plum:     "#C084FC",
  red:      "#EF4444",
};

const FONT_DISPLAY = `"Bricolage Grotesque", -apple-system, system-ui, sans-serif`;
const FONT_SERIF   = `"Instrument Serif", "Times New Roman", serif`;
const FONT_MONO    = `"JetBrains Mono", ui-monospace, monospace`;

const injectStyles = () => {
  if (document.getElementById("bttd-fonts")) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap";
  document.head.appendChild(link);

  const style = document.createElement("style");
  style.id = "bttd-fonts";
  style.textContent = `
    *,*::before,*::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { margin: 0; background: ${C.ink}; font-family: ${FONT_DISPLAY}; color: ${C.bone}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    input,button,textarea { font-family: inherit; }
    input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
    ::-webkit-scrollbar { display: none; }

    /* Court-line texture */
    .court-bg {
      background-image:
        radial-gradient(ellipse 80% 60% at 50% -10%, ${C.rust}1A 0%, transparent 60%),
        linear-gradient(${C.line}30 1px, transparent 1px),
        linear-gradient(90deg, ${C.line}30 1px, transparent 1px);
      background-size: 100% 100%, 80px 80px, 80px 80px;
      background-position: 0 0, 0 0, 0 0;
    }

    /* Animations */
    @keyframes ease-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ease-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pulse-dot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes draw-circle { from { stroke-dashoffset: 251; } to { stroke-dashoffset: var(--target, 0); } }

    .ease-up { animation: ease-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .ease-up-1 { animation: ease-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both; }
    .ease-up-2 { animation: ease-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
    .ease-up-3 { animation: ease-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both; }
    .ease-up-4 { animation: ease-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both; }
    .ease-in  { animation: ease-in 0.3s ease both; }
    .pulse-dot { animation: pulse-dot 1.6s ease infinite; }

    /* Buttons & taps */
    .btn { transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s, opacity 0.2s; }
    .btn:active:not(:disabled) { transform: scale(0.97); }
    .tap { transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s; }
    .tap:active { transform: scale(0.985); }

    /* Tabs scroll */
    .tab-rail { display: flex; overflow-x: auto; scrollbar-width: none; gap: 4px; }
    .tab-rail::-webkit-scrollbar { display: none; }

    /* Headlines */
    .h-display {
      font-family: ${FONT_DISPLAY};
      font-weight: 700;
      letter-spacing: -0.04em;
      line-height: 0.95;
    }
    .h-serif {
      font-family: ${FONT_SERIF};
      font-style: italic;
      letter-spacing: -0.01em;
    }
    .num-tab { font-variant-numeric: tabular-nums; }
    .mono { font-family: ${FONT_MONO}; }

    /* Glow on press */
    .glow-rust { box-shadow: 0 0 0 1px ${C.rust}33, 0 8px 30px ${C.rust}22; }
    .glow-moss { box-shadow: 0 0 0 1px ${C.moss}33, 0 8px 30px ${C.moss}22; }

    /* Custom range / progress */
    .ring-progress { transform: rotate(-90deg); transform-origin: 50% 50%; }
  `;
  document.head.appendChild(style);
};

/* ════════════════════════════════════════════════════════════
   DATA
   ════════════════════════════════════════════════════════════ */

const SESSIONS = [
  {
    id: "A", code: "A", name: "Strength & Power", location: "Gym", color: C.rust,
    exercises: [
      { id: "a1", name: "Barbell Squat",      sets: 4, reps: 6,  barbell: true,    note: "Full depth" },
      { id: "a2", name: "Bench Press",        sets: 4, reps: 8,  barbell: true,    note: "Controlled descent" },
      { id: "a3", name: "Romanian Deadlift",  sets: 3, reps: 8,  barbell: true,    note: "Hinge, don't squat" },
      { id: "a4", name: "Box Jump",           sets: 4, reps: 5,  bodyweight: true, note: "Max height" },
      { id: "a5", name: "Calf Raise",         sets: 4, reps: 20,                   note: "Slow & controlled" },
    ]
  },
  {
    id: "B", code: "B", name: "Court & Conditioning", location: "Court", color: C.amber,
    exercises: [
      { id: "b1", name: "Defensive Slides",   sets: 4, reps: "45s",     timed: true,    note: "Stay low" },
      { id: "b2", name: "Full-Court Sprint",  sets: 8, reps: "x",       noWeight: true, note: "Walk back = rest" },
      { id: "b3", name: "Vertical Jump",      sets: 3, reps: 8,         bodyweight: true, note: "Touch highest point" },
      { id: "b4", name: "Layup Drill",        sets: 2, reps: "drill",   noWeight: true, note: "Both sides" },
      { id: "b5", name: "Pickup / Solo Play", sets: 1, reps: "20min",   noWeight: true, note: "Cardio + IQ" },
    ]
  },
  {
    id: "C", code: "C", name: "Full Body Circuit", location: "Gym", color: C.moss,
    exercises: [
      { id: "c1", name: "Dumbbell Row",     sets: 3, reps: 12,    note: "Chest-supported" },
      { id: "c2", name: "Goblet Squat",     sets: 3, reps: 15,    note: "Pause at bottom" },
      { id: "c3", name: "Overhead Press",   sets: 3, reps: 10,    barbell: true, note: "Strict form" },
      { id: "c4", name: "Step-Up",          sets: 3, reps: 12,    note: "Each leg" },
      { id: "c5", name: "Wall Sit",         sets: 3, reps: "45s", timed: true,   note: "Quads parallel" },
    ]
  }
];

const TABATA_CONFIG = { rounds: 5, sprintSec: 5, restSec: 5 };

const CARDIO_TYPES = {
  tabata:           { label: "Tabata Bike",     icon: "🚴", color: C.electric, duration: "15 min", detail: "8 rounds · 20s on / 10s off · 4 min work + warmup/cooldown" },
  court_intervals:  { label: "Court Intervals", icon: "🏀", color: C.amber,    duration: "20 min", detail: "10 rounds · 30s hard / 30s rest · suicides, sprints, layups" },
};

const PHASES = [
  { weeks: "01—04", color: C.rust,     weight: "225 → 218", focus: "Build the habit. Nail form. Ease in.",         goals: ["2× gym/week", "1× court/week", "Sleep 7+ hrs", "Cut late-night eating"] },
  { weeks: "05—08", color: C.amber,    weight: "218 → 212", focus: "Add intensity. Increase court time.",          goals: ["Progress weights", "Add sprint sets", "Drop processed meals", "Vertical baseline"] },
  { weeks: "09—12", color: C.moss,     weight: "212 → 206", focus: "Peak conditioning. Power is primary.",         goals: ["Max box jump", "3 sessions/week", "Nutrition locked", "Rim touches every session"] },
  { weeks: "13—16", color: C.plum,     weight: "206 → 200", focus: "Dunk attempt. You earned it.",                 goals: ["Full vertical test", "Attempt the dunk", "Film it", "Plan next cycle"] },
];

/* ════════════════════════════════════════════════════════════
   AUDIO
   ════════════════════════════════════════════════════════════ */

let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}
function beep(freq, dur, vol) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq || 880;
    gain.gain.setValueAtTime(vol || 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.12));
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + (dur || 0.12));
  } catch(e) {}
}
function speak(text) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch(e) {}
}

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */

function daysAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : d + "d ago";
}
function calcVolume(exercises, checked, vals) {
  return exercises.reduce((v, ex) => {
    if (!checked[ex.id] || ex.noWeight || ex.timed || ex.bodyweight) return v;
    const w = ex.barbell ? 45 + (parseFloat(vals[ex.id]?.perSide) || 0) * 2 : parseFloat(vals[ex.id]?.weight) || 0;
    const s = parseInt(vals[ex.id]?.setsDone || ex.sets);
    const r = parseInt(ex.reps) || 0;
    return v + w * s * r;
  }, 0);
}
const fmtNum = (n) => n >= 10000 ? Math.round(n/1000) + "k" : n >= 1000 ? (n/1000).toFixed(1) + "k" : n.toLocaleString();

/* ════════════════════════════════════════════════════════════
   PRIMITIVES
   ════════════════════════════════════════════════════════════ */

function Surface({ children, accent, style = {}, onClick, className = "", padding = 20 }) {
  return (
    <div
      onClick={onClick}
      className={`tap ${className}`}
      style={{
        background: C.panel,
        border: `1px solid ${accent ? accent + "30" : C.line}`,
        borderRadius: 18,
        padding,
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {accent && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 0% 0%, ${accent}10, transparent 60%)`, pointerEvents: "none" }} />}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

function Eyebrow({ children, color = C.dim }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
      color, fontWeight: 600, fontFamily: FONT_MONO,
    }}>{children}</div>
  );
}

function Pill({ children, color = C.rust, size = "sm" }) {
  const px = size === "sm" ? "5px 10px" : "7px 14px";
  return (
    <span style={{
      background: color + "15",
      color, border: `1px solid ${color}30`,
      borderRadius: 999, padding: px,
      fontSize: size === "sm" ? 10 : 12, fontWeight: 600,
      letterSpacing: "0.06em", textTransform: "uppercase",
      fontFamily: FONT_MONO, display: "inline-block",
    }}>{children}</span>
  );
}

function Btn({ children, color = C.rust, ghost, onClick, disabled, full, size = "md", style = {}, className = "" }) {
  const padding = size === "sm" ? "9px 16px" : size === "lg" ? "16px 26px" : "13px 22px";
  const fontSize = size === "sm" ? 12 : size === "lg" ? 15 : 14;
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`btn ${className}`}
      style={{
        background: ghost ? "transparent" : color,
        border: `1px solid ${ghost ? color + "55" : color}`,
        color: ghost ? color : C.ink,
        padding, borderRadius: 14,
        cursor: disabled ? "default" : "pointer",
        fontSize, fontWeight: 600,
        letterSpacing: "-0.01em",
        opacity: disabled ? 0.32 : 1,
        width: full ? "100%" : undefined,
        ...style,
      }}
    >{children}</button>
  );
}

function NumIn({ value, onChange, placeholder, style = {} }) {
  return (
    <input
      type="number" inputMode="numeric"
      value={value || ""} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: C.raised, border: `1px solid ${C.line}`,
        borderRadius: 10, color: C.bone,
        padding: "9px 10px", fontSize: 14,
        textAlign: "center", width: "100%",
        outline: "none", transition: "border-color 0.15s",
        ...style,
      }}
      onFocus={e => e.target.style.borderColor = C.rust + "66"}
      onBlur={e => e.target.style.borderColor = C.line}
    />
  );
}

function PageTitle({ kicker, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {kicker && <Eyebrow>{kicker}</Eyebrow>}
      <h1 className="h-display" style={{ fontSize: 40, margin: "8px 0 0", color: C.bone }}>{children}</h1>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   COMPONENTS
   ════════════════════════════════════════════════════════════ */

function BarbellInput({ vals, onVal }) {
  const perSide = parseFloat(vals?.perSide) || 0;
  const total = 45 + perSide * 2;
  return (
    <div style={{
      background: C.raised, borderRadius: 12, padding: "12px 14px", marginTop: 10,
      border: `1px solid ${C.line}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>BAR 45 + EACH SIDE</span>
        <span className="num-tab" style={{ fontSize: 18, fontWeight: 700, color: C.rust, letterSpacing: "-0.02em" }}>{total} <span style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>lbs</span></span>
      </div>
      <NumIn value={vals?.perSide} onChange={v => onVal("perSide", v)} placeholder="lbs per side" />
    </div>
  );
}

function ExRow({ ex, checked, onCheck, vals, onVal, color }) {
  return (
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <button
          onClick={onCheck} className="btn"
          style={{
            width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginTop: 2, padding: 0,
            background: checked ? color : "transparent",
            border: `1.5px solid ${checked ? color : C.faint}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {checked && <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1 5L4.5 8.5L12 1.5" stroke={C.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em",
            color: checked ? C.dim : C.bone,
            textDecoration: checked ? "line-through" : "none",
            textDecorationColor: C.dim,
          }}>{ex.name}</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 3, fontFamily: FONT_MONO, letterSpacing: "0.02em" }}>
            {ex.sets} × {ex.reps}{ex.note ? ` · ${ex.note}` : ""}
          </div>
        </div>
        {!ex.noWeight && !ex.timed && !ex.bodyweight && !ex.barbell && (
          <div style={{ width: 60, flexShrink: 0 }}>
            <Eyebrow>lbs</Eyebrow>
            <div style={{ height: 4 }} />
            <NumIn value={vals?.weight} onChange={v => onVal("weight", v)} placeholder="0" />
          </div>
        )}
        {!ex.noWeight && !ex.timed && (
          <div style={{ width: 50, flexShrink: 0 }}>
            <Eyebrow>sets</Eyebrow>
            <div style={{ height: 4 }} />
            <NumIn value={vals?.setsDone} onChange={v => onVal("setsDone", v)} placeholder={String(ex.sets)} />
          </div>
        )}
      </div>
      {ex.barbell && <BarbellInput vals={vals} onVal={onVal} />}
    </div>
  );
}

/* ── Tabata Timer — premium ── */
function TabataTimer({ onLog }) {
  const [phase, setPhase] = useState("idle");
  const [round, setRound] = useState(1);
  const [count, setCount] = useState(TABATA_CONFIG.sprintSec);
  const [countdown, setCountdown] = useState(null);
  const wakeLockRef = useRef(null);

  const requestWakeLock = async () => {
    try { if ("wakeLock" in navigator) wakeLockRef.current = await navigator.wakeLock.request("screen"); } catch(e) {}
  };
  const releaseWakeLock = () => {
    try { if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; } } catch(e) {}
  };

  const start = () => { getAudioCtx(); requestWakeLock(); setCountdown(5); };
  const reset = () => { releaseWakeLock(); setPhase("idle"); setRound(1); setCount(TABATA_CONFIG.sprintSec); setCountdown(null); };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null); beep(1046, 0.25, 0.5); speak("Sprint!");
      setPhase("sprint"); setRound(1); setCount(TABATA_CONFIG.sprintSec); return;
    }
    beep(660, 0.08, 0.3);
    if (countdown === 3) speak("Get ready");
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    const interval = setInterval(() => {
      setCount(c => {
        if (c > 1) { beep(440, 0.06, 0.2); return c - 1; }
        if (phase === "sprint") { beep(523, 0.15, 0.4); speak("Rest"); setPhase("rest"); return TABATA_CONFIG.restSec; }
        else {
          setRound(r => {
            if (r >= TABATA_CONFIG.rounds) { beep(880, 0.5, 0.6); speak("Done! Great work!"); releaseWakeLock(); setPhase("done"); return r; }
            beep(880, 0.18, 0.5); speak("Sprint!"); setPhase("sprint"); return r + 1;
          });
          return TABATA_CONFIG.sprintSec;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const isSprint = phase === "sprint";
  const isRest = phase === "rest";
  const activeColor = isSprint ? C.moss : C.amber;
  const max = isSprint ? TABATA_CONFIG.sprintSec : TABATA_CONFIG.restSec;
  const pct = ((max - count) / max) * 100;

  return (
    <Surface accent={C.moss} style={{ background: C.panel }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <Pill color={C.moss}>Daily · Tabata</Pill>
          <h2 className="h-display" style={{ fontSize: 26, margin: "10px 0 4px", color: C.bone }}>Sprint Timer</h2>
          <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>{TABATA_CONFIG.rounds} rounds · {TABATA_CONFIG.sprintSec}s ON / {TABATA_CONFIG.restSec}s OFF</div>
        </div>
        {phase === "idle" && countdown === null && <Btn color={C.moss} onClick={start}>Start</Btn>}
      </div>

      {countdown !== null && (
        <div className="ease-up" style={{ textAlign: "center", padding: "32px 0 12px" }}>
          <Eyebrow color={C.amber}>Get Ready</Eyebrow>
          <div className="num-tab h-display" style={{ fontSize: 140, fontWeight: 800, color: C.amber, lineHeight: 0.85, marginTop: 12 }}>{countdown}</div>
          <Btn ghost color={C.dim} onClick={reset} size="sm" style={{ marginTop: 24 }}>Cancel</Btn>
        </div>
      )}

      {countdown === null && phase !== "idle" && (
        <div className="ease-in" style={{ marginTop: 20 }}>
          {(isSprint || isRest) && (
            <>
              <div style={{ position: "relative", width: 220, height: 220, margin: "0 auto" }}>
                <svg width="220" height="220" viewBox="0 0 100 100" style={{ position: "absolute" }}>
                  <circle cx="50" cy="50" r="45" stroke={C.line} strokeWidth="4" fill="none" />
                  <circle
                    className="ring-progress"
                    cx="50" cy="50" r="45" stroke={activeColor} strokeWidth="4" fill="none"
                    strokeLinecap="round"
                    strokeDasharray="282.7"
                    strokeDashoffset={282.7 - (pct / 100) * 282.7}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <Eyebrow color={C.dim}>R{round} / {TABATA_CONFIG.rounds}</Eyebrow>
                  <div className="num-tab h-display" style={{ fontSize: 90, fontWeight: 800, color: activeColor, lineHeight: 0.9, marginTop: 4 }}>{count}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: activeColor, letterSpacing: "0.2em", marginTop: 2 }}>{isSprint ? "SPRINT" : "REST"}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 24 }}>
                {Array.from({ length: TABATA_CONFIG.rounds }).map((_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: 999,
                    background: i < round - 1 ? C.moss : i === round - 1 ? C.moss + "AA" : C.faint,
                    transition: "all 0.3s",
                  }} />
                ))}
              </div>
              <Btn ghost color={C.dim} onClick={reset} full style={{ marginTop: 20, fontSize: 12 }}>Reset</Btn>
            </>
          )}
          {phase === "done" && (
            <div className="ease-up" style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🏁</div>
              <h3 className="h-display" style={{ fontSize: 28, color: C.moss, margin: "0 0 6px" }}>Done.</h3>
              <p className="h-serif" style={{ fontSize: 18, color: C.cream, margin: "0 0 20px" }}>5 rounds. 25 seconds of work.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn ghost color={C.dim} onClick={reset} style={{ flex: 1 }}>Reset</Btn>
                <Btn color={C.moss} onClick={() => { onLog(); reset(); }} style={{ flex: 1 }}>Log It</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}

/* ── Treadmill ── */
function TreadmillLogger({ onLog }) {
  const [duration, setDuration] = useState("");
  const [speed, setSpeed] = useState("");
  const [incline, setIncline] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const canLog = duration || speed || incline;
  const miles = duration && speed ? ((parseFloat(duration) / 60) * parseFloat(speed)).toFixed(2) : null;

  const handleLog = () => {
    if (!canLog) return;
    onLog({ duration: parseFloat(duration) || 0, speed: parseFloat(speed) || 0, incline: parseFloat(incline) || 0, miles: parseFloat(miles) || 0, notes });
    setDuration(""); setSpeed(""); setIncline(""); setNotes("");
    setDone(true); setTimeout(() => setDone(false), 2500);
  };

  return (
    <Surface accent={C.plum}>
      <Pill color={C.plum}>Anytime · Treadmill</Pill>
      <h2 className="h-display" style={{ fontSize: 24, margin: "10px 0 16px", color: C.bone }}>Walk Logger</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[["Duration", "min", duration, setDuration, "45"],["Speed", "mph", speed, setSpeed, "3.5"],["Incline", "%", incline, setIncline, "8"]].map(([label, unit, val, set, ph]) => (
          <div key={label}>
            <div style={{ textAlign: "center" }}><Eyebrow>{label} ({unit})</Eyebrow></div>
            <div style={{ height: 5 }} />
            <NumIn value={val} onChange={set} placeholder={ph} />
          </div>
        ))}
      </div>
      {miles && <div style={{ textAlign: "center", color: C.plum, fontSize: 13, marginBottom: 12, fontFamily: FONT_SERIF, fontStyle: "italic" }}>≈ {miles} miles</div>}
      <input
        type="text" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
        style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 10, color: C.bone, padding: "10px 14px", fontSize: 13, width: "100%", marginBottom: 12, outline: "none" }}
      />
      <Btn color={C.plum} onClick={handleLog} disabled={!canLog} full>{done ? "✓ Logged" : "Log Walk"}</Btn>
    </Surface>
  );
}

/* ── Stat Cards ── */
function StatCard({ kicker, value, unit, color, big, sub }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.line}`,
      borderRadius: 18, padding: 18, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 100% 0%, ${color || C.rust}12, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <Eyebrow color={C.dim}>{kicker}</Eyebrow>
        <div className="num-tab h-display" style={{ fontSize: big ? 44 : 32, fontWeight: 700, color: color || C.bone, lineHeight: 1, marginTop: 8, letterSpacing: "-0.04em" }}>
          {value}{unit && <span style={{ fontSize: big ? 16 : 13, color: C.dim, marginLeft: 4, fontWeight: 500, letterSpacing: 0 }}>{unit}</span>}
        </div>
        {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 6, fontFamily: FONT_MONO }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Stats Tab ── */
function StatsTab({ history, weightLog, cardioSessions }) {
  const gymSessions = history.filter(h => h.session_name?.startsWith("DAY") || h.session_name?.startsWith("A:") || h.session_name?.startsWith("B:") || h.session_name?.startsWith("C:") || /^[ABC] /.test(h.session_name||""));
  const treadmillSessions = history.filter(h => h.session_name === "Treadmill Walk");
  const tabataSessions = history.filter(h => h.session_name === "Daily Tabata Sprints");

  const totalVolume = gymSessions.reduce((a, h) => a + (h.total_volume || 0), 0);
  const thisWeekVol = gymSessions.filter(h => (Date.now() - new Date(h.logged_at)) < 7*86400000).reduce((a,h) => a+(h.total_volume||0),0);
  const totalMiles = treadmillSessions.reduce((a,h) => a + (h.exercises?.[0]?.miles||0), 0);
  const totalMin = treadmillSessions.reduce((a,h) => a + (h.exercises?.[0]?.duration||0), 0);

  const pbs = {};
  gymSessions.forEach(h => (h.exercises||[]).forEach(ex => { if (ex.weight > 0 && (!pbs[ex.name] || ex.weight > pbs[ex.name])) pbs[ex.name] = ex.weight; }));

  const weeklyVol = {};
  gymSessions.forEach(h => {
    const d = new Date(h.logged_at); const ws = new Date(d); ws.setDate(d.getDate()-d.getDay());
    const key = ws.toLocaleDateString("en-CA",{month:"short",day:"numeric"});
    weeklyVol[key] = (weeklyVol[key]||0) + (h.total_volume||0);
  });
  const wks = Object.keys(weeklyVol).slice(-6);
  const wvs = wks.map(k => weeklyVol[k]);
  const maxWv = Math.max(...wvs, 1);

  const startW = 225, goalW = 200;
  const curW = weightLog[0]?.weight || startW;
  const lost = startW - curW;

  return (
    <>
      <PageTitle kicker="Numbers · don't lie">Stats</PageTitle>

      <div className="ease-up-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatCard kicker="GYM" value={gymSessions.length} color={C.rust} sub="sessions" />
        <StatCard kicker="HIIT" value={cardioSessions.length} color={C.electric} sub="sessions" />
        <StatCard kicker="TABATAS" value={tabataSessions.length} color={C.moss} sub="sprints done" />
        <StatCard kicker="WALKS" value={treadmillSessions.length} color={C.plum} sub="treadmill" />
      </div>

      <div className="ease-up-2">
        <Surface accent={C.rust}>
          <Eyebrow color={C.rust}>Volume Lifted</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
            <div>
              <div className="num-tab h-display" style={{ fontSize: 38, fontWeight: 700, color: C.rust, letterSpacing: "-0.04em", lineHeight: 1 }}>{fmtNum(totalVolume)}</div>
              <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>TOTAL LBS</div>
            </div>
            <div>
              <div className="num-tab h-display" style={{ fontSize: 38, fontWeight: 700, color: C.amber, letterSpacing: "-0.04em", lineHeight: 1 }}>{fmtNum(thisWeekVol)}</div>
              <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>THIS WEEK</div>
            </div>
          </div>
          {wks.length >= 2 && (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 70, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              {wks.map((k,i) => (
                <div key={k} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    width: "100%", background: `linear-gradient(180deg, ${C.rustHi}, ${C.rust})`,
                    borderRadius: "4px 4px 0 0",
                    height: Math.max(4, (wvs[i]/maxWv)*54),
                    transition: "height 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                  }} />
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 6, fontFamily: FONT_MONO }}>{k}</div>
                </div>
              ))}
            </div>
          )}
        </Surface>
      </div>

      <div className="ease-up-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatCard kicker="MILES" value={totalMiles.toFixed(1)} color={C.plum} />
        <StatCard kicker="TIME" value={totalMin >= 60 ? (totalMin/60).toFixed(1) : totalMin} unit={totalMin >= 60 ? "hrs" : "min"} color={C.plum} />
      </div>

      <div className="ease-up-4">
        <Surface accent={C.moss}>
          <Eyebrow color={C.moss}>Weight Progress</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
            <div>
              <div className="num-tab h-display" style={{ fontSize: 30, fontWeight: 700, color: C.moss, letterSpacing: "-0.04em", lineHeight: 1 }}>{lost > 0 ? "−"+lost.toFixed(1) : "0"}</div>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>LOST</div>
            </div>
            <div>
              <div className="num-tab h-display" style={{ fontSize: 30, fontWeight: 700, color: C.bone, letterSpacing: "-0.04em", lineHeight: 1 }}>{curW}</div>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>CURRENT</div>
            </div>
            <div>
              <div className="num-tab h-display" style={{ fontSize: 30, fontWeight: 700, color: C.amber, letterSpacing: "-0.04em", lineHeight: 1 }}>{(curW-goalW).toFixed(1)}</div>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>TO GOAL</div>
            </div>
          </div>
        </Surface>
      </div>

      {Object.keys(pbs).length > 0 && (
        <Surface>
          <Eyebrow color={C.amber}>Personal Bests</Eyebrow>
          <div style={{ marginTop: 12 }}>
            {Object.entries(pbs).map(([name, weight], i) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderBottom: i < Object.keys(pbs).length - 1 ? `1px solid ${C.line}` : "none" }}>
                <span style={{ fontSize: 14, color: C.cream, letterSpacing: "-0.01em" }}>{name}</span>
                <span className="num-tab" style={{ fontSize: 18, color: C.amber, fontWeight: 700, letterSpacing: "-0.02em" }}>{weight} <span style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>lbs</span></span>
              </div>
            ))}
          </div>
        </Surface>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   APP
   ════════════════════════════════════════════════════════════ */

export default function App() {
  useEffect(() => { injectStyles(); }, []);

  const [tab, setTab] = useState("workout");
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(0);
  const [checked, setChecked] = useState({});
  const [vals, setVals] = useState({});
  const [history, setHistory] = useState([]);
  const [expandedLog, setExpandedLog] = useState({});
  const [weightLog, setWeightLog] = useState([]);
  const [weightInput, setWeightInput] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [cardioSessions, setCardioSessions] = useState([]);
  const [cardioNotes, setCardioNotes] = useState("");
  const [cardioLogging, setCardioLogging] = useState(null);

  const showSave = (ok) => { setSaveMsg(ok ? "Saved" : "Failed"); setTimeout(() => setSaveMsg(""), 2400); };

  const loadData = useCallback(async () => {
    try {
      const [{ data: workouts }, { data: weights }, { data: cardio }] = await Promise.all([
        supabase.from("workouts").select("*").order("logged_at", { ascending: false }),
        supabase.from("weight_log").select("*").order("logged_at", { ascending: false }),
        supabase.from("cardio_sessions").select("*").order("completed_at", { ascending: false }).limit(60),
      ]);
      if (workouts) setHistory(workouts);
      if (weights) setWeightLog(weights);
      if (cardio) setCardioSessions(cardio);
    } catch(e) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const session = SESSIONS[activeSession];
  const sk = session.id;
  const anyChecked = session.exercises.some(ex => checked[sk+"_"+ex.id]);
  const volume = calcVolume(
    session.exercises,
    Object.fromEntries(session.exercises.map(ex => [ex.id, checked[sk+"_"+ex.id]])),
    Object.fromEntries(session.exercises.map(ex => [ex.id, vals[sk+"_"+ex.id] || {}]))
  );

  const toggleCheck = id => setChecked(p => ({...p, [id]: !p[id]}));
  const setVal = (id, f, v) => setVals(p => ({...p, [id]: {...(p[id]||{}), [f]: v}}));

  const logSession = async () => {
    const exVols = session.exercises.filter(ex => checked[sk+"_"+ex.id]).map(ex => {
      const w = ex.barbell ? 45+(parseFloat(vals[sk+"_"+ex.id]?.perSide)||0)*2 : parseFloat(vals[sk+"_"+ex.id]?.weight)||0;
      const s = parseInt(vals[sk+"_"+ex.id]?.setsDone || ex.sets);
      const r = parseInt(ex.reps) || 0;
      return { name: ex.name, sets: s, reps: ex.reps, weight: w, volume: (ex.noWeight||ex.timed||ex.bodyweight) ? 0 : w*s*r };
    });
    const payload = { session_name: session.code+": "+session.name, color: session.color, total_volume: exVols.reduce((a,e)=>a+e.volume,0), exercises: exVols };
    const { data, error } = await supabase.from("workouts").insert([payload]).select();
    if (!error && data) {
      setHistory(p => [data[0],...p]);
      const nc = {...checked}; session.exercises.forEach(ex => delete nc[sk+"_"+ex.id]); setChecked(nc);
      showSave(true);
    } else showSave(false);
  };

  const logTabata = async () => {
    const { data, error } = await supabase.from("workouts").insert([{ session_name: "Daily Tabata Sprints", color: C.moss, total_volume: 0, exercises: [{ name: "Sprint in place", sets: 5, reps: "5s on/5s off", weight: 0, volume: 0 }] }]).select();
    if (!error && data) { setHistory(p => [data[0],...p]); showSave(true); } else showSave(false);
  };

  const logTreadmill = async ({ duration, speed, incline, miles, notes }) => {
    const label = [duration?duration+" min":null, speed?speed+" mph":null, incline?incline+"% incline":null, miles?miles+" mi":null, notes||null].filter(Boolean).join(" · ");
    const { data, error } = await supabase.from("workouts").insert([{ session_name: "Treadmill Walk", color: C.plum, total_volume: 0, exercises: [{ name: label, sets: 1, reps: "walk", weight: 0, volume: 0, duration, speed, incline, miles }] }]).select();
    if (!error && data) { setHistory(p => [data[0],...p]); showSave(true); } else showSave(false);
  };

  const logCardio = async (workoutType) => {
    setCardioLogging(workoutType);
    const { data, error } = await supabase.from("cardio_sessions").insert([{ workout_type: workoutType, completed_at: new Date().toISOString(), notes: cardioNotes || null }]).select();
    if (!error && data) { setCardioSessions(p => [data[0],...p]); setCardioNotes(""); showSave(true); } else showSave(false);
    setCardioLogging(null);
  };

  const deleteCardio = async id => { await supabase.from("cardio_sessions").delete().eq("id", id); setCardioSessions(p => p.filter(s => s.id !== id)); };
  const deleteLog = async id => { await supabase.from("workouts").delete().eq("id", id); setHistory(p => p.filter(h => h.id !== id)); };
  const logWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 100 || w > 400) return;
    const { data, error } = await supabase.from("weight_log").insert([{ weight: w }]).select();
    if (!error && data) { setWeightLog(p => [data[0],...p]); setWeightInput(""); showSave(true); } else showSave(false);
  };
  const deleteWeight = async id => { await supabase.from("weight_log").delete().eq("id", id); setWeightLog(p => p.filter(e => e.id !== id)); };

  const thisWeek = history.filter(h => (Date.now()-new Date(h.logged_at)) < 7*86400000).length;
  const totalLbs = history.reduce((a,h) => a+(h.total_volume||0), 0);
  const lastGym = history.find(h => h.session_name && /^[ABC]:/.test(h.session_name));
  const restDay = lastGym && Math.floor((Date.now()-new Date(lastGym.logged_at))/86400000) < 1;

  // Cardio derived
  const lastCardio = cardioSessions[0] || null;
  const lastCardioType = lastCardio?.workout_type || null;
  const hoursSinceCardio = lastCardio ? (Date.now()-new Date(lastCardio.completed_at))/3600000 : null;
  const cardioInRecovery = hoursSinceCardio !== null && hoursSinceCardio < 48;
  const nextCardioType = lastCardioType === "tabata" ? "court_intervals" : "tabata";
  const hoursUntilCardio = cardioInRecovery ? Math.ceil(48-hoursSinceCardio) : 0;
  const cardioOverdue = !cardioInRecovery && hoursSinceCardio !== null && hoursSinceCardio/24 > 3;

  const TABS = [
    { id: "workout", label: "Train" },
    { id: "cardio",  label: "Cardio" },
    { id: "history", label: "Log" },
    { id: "stats",   label: "Stats" },
    { id: "weight",  label: "Weight" },
    { id: "goals",   label: "Plan" },
  ];

  if (loading) return (
    <div className="court-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="ease-up" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>🏀</div>
        <div className="h-display" style={{ color: C.rust, fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>Back to the Dunk</div>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 6, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>LOADING…</div>
      </div>
    </div>
  );

  return (
    <div className="court-bg" style={{ minHeight: "100vh", paddingBottom: 80 }}>

      {/* HEADER */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${C.ink}E6`, backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.line}`,
      }}>
        <div style={{ padding: "16px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${C.rust}, ${C.amber})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏀</div>
            <div>
              <div className="h-display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: C.bone, lineHeight: 1.1 }}>Back to the Dunk</div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.1em", marginTop: 2 }}>16 WEEKS · 25 LBS · 1 GOAL</div>
            </div>
          </div>
          {saveMsg && (
            <div className="ease-in" style={{
              fontSize: 11, fontFamily: FONT_MONO, letterSpacing: "0.1em",
              color: saveMsg === "Saved" ? C.moss : C.red,
              border: `1px solid ${saveMsg === "Saved" ? C.moss : C.red}40`,
              background: `${saveMsg === "Saved" ? C.moss : C.red}10`,
              padding: "4px 10px", borderRadius: 999,
            }}>
              ● {saveMsg.toUpperCase()}
            </div>
          )}
        </div>

        {/* Tab rail */}
        <div className="tab-rail" style={{ padding: "0 16px 0", borderTop: `1px solid ${C.line}` }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="btn"
                style={{
                  flexShrink: 0, padding: "13px 14px", border: "none", background: "transparent",
                  fontSize: 13, fontWeight: active ? 700 : 500, letterSpacing: "-0.01em",
                  cursor: "pointer", color: active ? C.bone : C.dim,
                  borderBottom: active ? `2px solid ${C.rust}` : "2px solid transparent",
                  marginBottom: -1, position: "relative",
                }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main style={{ padding: "20px 16px 16px", maxWidth: 480, margin: "0 auto" }}>

        {/* ── TRAIN ── */}
        {tab === "workout" && (
          <>
            <div className="ease-up">
              <PageTitle kicker="Today · Train">{restDay ? "Rest day." : session.name}</PageTitle>
            </div>

            <div className="ease-up-1"><TabataTimer onLog={logTabata} /></div>
            <div className="ease-up-2"><TreadmillLogger onLog={logTreadmill} /></div>

            {/* Status banners */}
            <div className="ease-up-3" style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}>
              <Surface accent={restDay ? C.faint : session.color} padding={14} style={{ marginBottom: 0 }}>
                <Eyebrow color={restDay ? C.dim : session.color}>Gym · Next</Eyebrow>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: C.bone }}>
                  {restDay ? "Recover" : `${session.code} — ${session.location}`}
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>
                  {restDay ? `Last: ${daysAgo(lastGym.logged_at)}` : "Ready when you are"}
                </div>
              </Surface>
              <Surface accent={cardioOverdue ? C.red : cardioInRecovery ? C.faint : CARDIO_TYPES[nextCardioType].color} padding={14} style={{ marginBottom: 0 }}>
                <Eyebrow color={cardioOverdue ? C.red : cardioInRecovery ? C.dim : CARDIO_TYPES[nextCardioType].color}>HIIT · Next</Eyebrow>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: C.bone }}>
                  {CARDIO_TYPES[nextCardioType].icon} {CARDIO_TYPES[nextCardioType].label}
                </div>
                <div style={{ fontSize: 11, color: cardioOverdue ? C.red : C.dim, marginTop: 2, fontFamily: FONT_MONO }}>
                  {cardioInRecovery ? `Ready in ${hoursUntilCardio}h` : cardioOverdue ? "Overdue · do today" : "Ready"}
                </div>
              </Surface>
            </div>

            {/* Day selector */}
            <div className="ease-up-4" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {SESSIONS.map((s, i) => (
                <button key={s.id} onClick={() => setActiveSession(i)} className="btn"
                  style={{
                    flex: 1, padding: "14px 0",
                    background: activeSession === i ? s.color : "transparent",
                    border: `1px solid ${activeSession === i ? s.color : C.line}`,
                    color: activeSession === i ? C.ink : C.cream,
                    borderRadius: 12, cursor: "pointer",
                    fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em",
                  }}>
                  Day {s.code}
                </button>
              ))}
            </div>

            <div className="ease-up-4">
              <Surface accent={session.color}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                  <div>
                    <Pill color={session.color}>{session.location}</Pill>
                    <h3 className="h-display" style={{ fontSize: 28, margin: "10px 0 4px", color: C.bone, letterSpacing: "-0.03em" }}>{session.name}</h3>
                    <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>{session.exercises.length} exercises</div>
                  </div>
                  {volume > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <Eyebrow>Volume</Eyebrow>
                      <div className="num-tab h-display" style={{ fontSize: 30, fontWeight: 700, color: session.color, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 4 }}>{fmtNum(volume)}</div>
                      <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 2 }}>LBS</div>
                    </div>
                  )}
                </div>
                {session.exercises.map(ex => (
                  <ExRow key={ex.id} ex={ex}
                    checked={checked[sk+"_"+ex.id]}
                    onCheck={() => toggleCheck(sk+"_"+ex.id)}
                    vals={vals[sk+"_"+ex.id] || {}}
                    onVal={(f,v) => setVal(sk+"_"+ex.id, f, v)}
                    color={session.color}
                  />
                ))}
                <Btn color={session.color} onClick={logSession} disabled={!anyChecked} full size="lg" style={{ marginTop: 18 }}>
                  {anyChecked ? "End Workout & Log" : "Check an exercise to log"}
                </Btn>
              </Surface>
            </div>

            <p className="h-serif" style={{ textAlign: "center", color: C.dim, fontSize: 16, margin: "24px 0 0" }}>
              "I am a basketball player who trains."
              <span style={{ display: "block", fontFamily: FONT_MONO, fontStyle: "normal", fontSize: 10, letterSpacing: "0.15em", marginTop: 6 }}>— JAMES CLEAR</span>
            </p>
          </>
        )}

        {/* ── CARDIO ── */}
        {tab === "cardio" && (() => {
          const last30 = cardioSessions.filter(s => (Date.now()-new Date(s.completed_at))/86400000 <= 30);
          const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate()-startOfWeek.getDay()); startOfWeek.setHours(0,0,0,0);
          const thisWeekCardio = cardioSessions.filter(s => new Date(s.completed_at) >= startOfWeek);
          const weekDays = ["S","M","T","W","T","F","S"];
          const weekFull = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
          const weekSessions = weekDays.map((_,i) => {
            const day = new Date(startOfWeek); day.setDate(startOfWeek.getDate()+i);
            return cardioSessions.find(s => new Date(s.completed_at).toDateString() === day.toDateString()) || null;
          });
          const surpriseMe = () => {
            const pick = cardioInRecovery ? nextCardioType : (Math.random() > 0.5 ? "tabata" : "court_intervals");
            const w = CARDIO_TYPES[pick];
            alert(w.icon + " " + w.label + "\n\n" + w.detail);
          };
          return (
            <>
              <div className="ease-up"><PageTitle kicker="Conditioning · HIIT">Cardio</PageTitle></div>

              {/* Whats Next */}
              <div className="ease-up-1">
                <Surface accent={cardioOverdue ? C.red : cardioInRecovery ? C.faint : CARDIO_TYPES[nextCardioType].color} padding={22}>
                  <Eyebrow color={cardioOverdue ? C.red : C.dim}>What's Next</Eyebrow>
                  {!lastCardio ? (
                    <div className="h-display" style={{ fontSize: 24, marginTop: 10, color: C.bone, letterSpacing: "-0.02em" }}>No sessions yet — pick one below 🏁</div>
                  ) : cardioInRecovery ? (
                    <>
                      <div className="h-display" style={{ fontSize: 30, marginTop: 10, color: C.bone, letterSpacing: "-0.03em" }}>{CARDIO_TYPES[nextCardioType].icon} {CARDIO_TYPES[nextCardioType].label}</div>
                      <div style={{ fontSize: 13, color: C.electric, marginTop: 6, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>READY IN {hoursUntilCardio}h</div>
                    </>
                  ) : cardioOverdue ? (
                    <>
                      <div className="h-display" style={{ fontSize: 30, marginTop: 10, color: C.red, letterSpacing: "-0.03em" }}>{CARDIO_TYPES[nextCardioType].icon} Do today</div>
                      <div style={{ fontSize: 13, color: C.red, marginTop: 6, fontFamily: FONT_MONO }}>{Math.floor(hoursSinceCardio/24)}d since last</div>
                    </>
                  ) : (
                    <>
                      <div className="h-display" style={{ fontSize: 30, marginTop: 10, color: C.bone, letterSpacing: "-0.03em" }}>{CARDIO_TYPES[nextCardioType].icon} {CARDIO_TYPES[nextCardioType].label}</div>
                      <div style={{ fontSize: 13, color: C.moss, marginTop: 6, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>READY · LET'S GO</div>
                    </>
                  )}
                </Surface>
              </div>

              {/* Weekly Grid */}
              <div className="ease-up-2">
                <Surface>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                    <Eyebrow>This Week · 2× Target</Eyebrow>
                    <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: thisWeekCardio.length >= 2 ? C.moss : C.dim, fontWeight: 600 }}>
                      {thisWeekCardio.length}/2 {thisWeekCardio.length >= 2 && "✓"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {weekDays.map((d,i) => {
                      const s = weekSessions[i];
                      const w = s ? CARDIO_TYPES[s.workout_type] : null;
                      const isToday = new Date().getDay() === i;
                      return (
                        <div key={i} style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: isToday ? C.rust : C.dim, marginBottom: 6, fontWeight: 700, fontFamily: FONT_MONO, letterSpacing: "0.1em", textAlign: "center" }}>
                            {d}
                          </div>
                          <div style={{
                            aspectRatio: "1", borderRadius: 12,
                            background: s ? w.color+"22" : C.raised,
                            border: `1px solid ${s ? w.color+"55" : isToday ? C.rust+"55" : C.line}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18,
                          }}>
                            {s ? w.icon : isToday ? <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: 999, background: C.rust }} /> : ""}
                          </div>
                          <div style={{ fontSize: 9, color: C.mute, fontFamily: FONT_MONO, textAlign: "center", marginTop: 5 }}>
                            {weekFull[i].slice(0,3).toUpperCase()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Surface>
              </div>

              <div className="ease-up-3">
                <Btn color={C.plum} onClick={surpriseMe} full size="lg" style={{ marginBottom: 18 }}>🎲 Surprise Me</Btn>
              </div>

              {/* Workout Cards */}
              {Object.entries(CARDIO_TYPES).map(([key, w], idx) => (
                <div key={key} className={`ease-up-${4}`} style={{ animationDelay: `${0.2 + idx * 0.05}s` }}>
                  <Surface accent={w.color}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 32 }}>{w.icon}</div>
                        <h3 className="h-display" style={{ fontSize: 24, margin: "10px 0 4px", color: C.bone, letterSpacing: "-0.02em" }}>{w.label}</h3>
                        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, fontFamily: FONT_MONO, marginTop: 4 }}>{w.detail}</div>
                      </div>
                      <Pill color={w.color}>{w.duration}</Pill>
                    </div>
                    <input
                      type="text" placeholder="Notes (optional)" value={cardioNotes} onChange={e => setCardioNotes(e.target.value)}
                      style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 10, color: C.bone, padding: "10px 14px", fontSize: 13, width: "100%", marginBottom: 12, outline: "none" }}
                    />
                    <Btn color={w.color} onClick={() => logCardio(key)} disabled={!!cardioLogging} full>
                      {cardioLogging === key ? "Logging…" : `Log ${w.label}`}
                    </Btn>
                  </Surface>
                </div>
              ))}

              {last30.length > 0 && (
                <>
                  <div style={{ marginTop: 16, marginBottom: 12 }}>
                    <Eyebrow>Recent</Eyebrow>
                  </div>
                  {last30.map((s, i) => {
                    const w = CARDIO_TYPES[s.workout_type];
                    const prev = last30[i+1];
                    const gap = prev ? Math.round((new Date(s.completed_at)-new Date(prev.completed_at))/3600000) : null;
                    return (
                      <Surface key={s.id} accent={w.color} padding={14}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: w.color+"22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{w.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.bone, letterSpacing: "-0.01em" }}>{w.label}</div>
                            <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>
                              {daysAgo(s.completed_at)} · {new Date(s.completed_at).toLocaleDateString("en-CA")}
                              {gap !== null && <span style={{ marginLeft: 6, color: gap >= 48 ? C.moss : C.red }}>{gap}h gap</span>}
                            </div>
                            {s.notes && <div className="h-serif" style={{ fontSize: 13, color: C.cream, marginTop: 4 }}>"{s.notes}"</div>}
                          </div>
                          <button onClick={() => deleteCardio(s.id)} className="btn" style={{ background: "transparent", border: "none", color: C.mute, cursor: "pointer", fontSize: 14, padding: 8 }}>✕</button>
                        </div>
                      </Surface>
                    );
                  })}
                </>
              )}
            </>
          );
        })()}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <>
            <div className="ease-up"><PageTitle kicker="The work · is the win">Log</PageTitle></div>

            <div className="ease-up-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              <StatCard kicker="ALL" value={history.length} color={C.rust} />
              <StatCard kicker="WEEK" value={thisWeek} color={C.amber} />
              <StatCard kicker="LBS" value={fmtNum(totalLbs)} color={C.moss} />
            </div>

            {history.length === 0 && (
              <Surface style={{ textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🏀</div>
                <p className="h-serif" style={{ fontSize: 18, color: C.cream, margin: 0 }}>The page is blank.</p>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 8, fontFamily: FONT_MONO }}>GO WRITE THE FIRST CHAPTER</div>
              </Surface>
            )}

            {history.map((h, i) => {
              const prev = history[i+1];
              const gap = prev ? Math.floor((new Date(h.logged_at)-new Date(prev.logged_at))/86400000) : null;
              const expanded = expandedLog[h.id];
              const color = h.color || C.rust;
              return (
                <Surface key={h.id} accent={color}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <Pill color={color}>{daysAgo(h.logged_at)}</Pill>
                        {gap !== null && <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO }}>{gap}d rest</span>}
                      </div>
                      <div className="h-display" style={{ fontSize: 18, fontWeight: 700, color: C.bone, letterSpacing: "-0.02em" }}>{h.session_name}</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 4, fontFamily: FONT_MONO }}>{new Date(h.logged_at).toLocaleDateString("en-CA")}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {h.total_volume > 0 && (
                        <div style={{ textAlign: "right" }}>
                          <div className="num-tab" style={{ color, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>{fmtNum(h.total_volume)}</div>
                          <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO }}>LBS</div>
                        </div>
                      )}
                      <button onClick={() => setExpandedLog(p => ({...p, [h.id]: !p[h.id]}))} className="btn" style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 14, padding: 6 }}>{expanded ? "▲" : "▼"}</button>
                      <button onClick={() => deleteLog(h.id)} className="btn" style={{ background: "transparent", border: "none", color: C.mute, cursor: "pointer", fontSize: 14, padding: 6 }}>✕</button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="ease-up" style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                      {(h.exercises||[]).map((ex, j) => (
                        <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: j < h.exercises.length-1 ? `1px solid ${C.line}` : "none" }}>
                          <span style={{ color: C.cream }}>{ex.name}</span>
                          <span className="num-tab" style={{ color: C.dim, fontFamily: FONT_MONO, fontSize: 12 }}>
                            {ex.sets}×{ex.reps}{ex.weight > 0 ? ` @ ${ex.weight}` : ""}{ex.volume > 0 ? ` = ${fmtNum(ex.volume)}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Surface>
              );
            })}
          </>
        )}

        {/* ── STATS ── */}
        {tab === "stats" && <StatsTab history={history} weightLog={weightLog} cardioSessions={cardioSessions} />}

        {/* ── WEIGHT ── */}
        {tab === "weight" && (() => {
          const sorted = [...weightLog].sort((a,b) => new Date(a.logged_at)-new Date(b.logged_at));
          const cur = weightLog[0]?.weight || 225;
          const lost = 225-cur, remaining = cur-200;
          const pct = Math.min(100, Math.max(0, (lost/25)*100));
          const last8 = sorted.slice(-8);
          return (
            <>
              <div className="ease-up"><PageTitle kicker="225 → 200 · Weekly check-in">Weight</PageTitle></div>

              <div className="ease-up-1">
                <Surface accent={C.rust} padding={24}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                    <div>
                      <Eyebrow>Current</Eyebrow>
                      <div className="num-tab h-display" style={{ fontSize: 56, fontWeight: 700, color: C.bone, letterSpacing: "-0.05em", lineHeight: 0.9, marginTop: 6 }}>
                        {cur}<span style={{ fontSize: 18, color: C.dim, fontWeight: 500, marginLeft: 4, letterSpacing: 0 }}>lbs</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Eyebrow color={C.moss}>Lost</Eyebrow>
                      <div className="num-tab h-display" style={{ fontSize: 32, fontWeight: 700, color: C.moss, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 6 }}>
                        {lost > 0 ? "−"+lost.toFixed(1) : "0"}
                      </div>
                    </div>
                  </div>
                  <div style={{ background: C.raised, borderRadius: 999, height: 8, overflow: "hidden", border: `1px solid ${C.line}` }}>
                    <div style={{
                      width: pct+"%", height: "100%",
                      background: `linear-gradient(90deg, ${C.rust}, ${C.amber} 50%, ${C.moss})`,
                      borderRadius: 999, transition: "width 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: C.dim, fontFamily: FONT_MONO }}>
                    <span>225</span><span style={{ color: C.amber }}>{remaining > 0 ? remaining.toFixed(1) : "0"} TO GO</span><span style={{ color: C.moss }}>200</span>
                  </div>
                </Surface>
              </div>

              <div className="ease-up-2">
                <Surface>
                  <Eyebrow>Log Weight</Eyebrow>
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <input type="number" min="150" max="350" step="0.1" placeholder="223.5" value={weightInput} onChange={e => setWeightInput(e.target.value)} onKeyDown={e => e.key==="Enter" && logWeight()}
                      style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "13px 16px", fontSize: 18, flex: 1, outline: "none", fontWeight: 600, fontFamily: FONT_DISPLAY }} />
                    <Btn color={C.rust} onClick={logWeight}>Log</Btn>
                  </div>
                </Surface>
              </div>

              {last8.length >= 2 && (
                <div className="ease-up-3">
                  <Surface>
                    <Eyebrow>Trend · last {last8.length}</Eyebrow>
                    <svg width="100%" height="100" viewBox="0 0 300 100" style={{ overflow: "visible", marginTop: 12 }}>
                      {(() => {
                        const ws = last8.map(e => e.weight);
                        const mn = Math.min(...ws)-1, mx = Math.max(...ws)+1;
                        const pts = ws.map((w,i) => ({ x: (i/(ws.length-1))*280+10, y: 80-((w-mn)/(mx-mn))*70 }));
                        const path = pts.map((p,i) => i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`).join(" ");
                        const area = path + ` L${pts[pts.length-1].x},90 L${pts[0].x},90 Z`;
                        return <>
                          <defs>
                            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={C.rust} stopOpacity="0.3"/>
                              <stop offset="100%" stopColor={C.rust} stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <path d={area} fill="url(#grad)" />
                          <path d={path} fill="none" stroke={C.rust} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                          {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={C.rust} stroke={C.panel} strokeWidth="2" />)}
                        </>;
                      })()}
                    </svg>
                  </Surface>
                </div>
              )}

              {weightLog.map((e,i) => {
                const prev = weightLog[i+1];
                const delta = prev ? e.weight-prev.weight : null;
                return (
                  <Surface key={e.id} padding={14}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div className="num-tab h-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{e.weight} <span style={{ fontSize: 12, color: C.dim, fontWeight: 500 }}>lbs</span></div>
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 4, fontFamily: FONT_MONO }}>
                          {new Date(e.logged_at).toLocaleDateString("en-CA",{weekday:"short",month:"short",day:"numeric"})} · {daysAgo(e.logged_at)}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {delta !== null && (
                          <div className="num-tab" style={{ fontSize: 14, fontWeight: 700, color: delta < 0 ? C.moss : delta > 0 ? C.red : C.dim, fontFamily: FONT_MONO }}>
                            {delta < 0 ? "▼" : delta > 0 ? "▲" : "—"} {Math.abs(delta).toFixed(1)}
                          </div>
                        )}
                        <button onClick={() => deleteWeight(e.id)} className="btn" style={{ background: "transparent", border: "none", color: C.mute, cursor: "pointer", fontSize: 14, padding: 6 }}>✕</button>
                      </div>
                    </div>
                  </Surface>
                );
              })}
            </>
          );
        })()}

        {/* ── PLAN ── */}
        {tab === "goals" && (
          <>
            <div className="ease-up"><PageTitle kicker="16 weeks · 1 dunk">The Plan</PageTitle></div>

            {PHASES.map((p, i) => (
              <div key={i} className={`ease-up-${Math.min(i+1, 4)}`}>
                <Surface accent={p.color}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                    <div>
                      <Eyebrow color={p.color}>Weeks {p.weeks}</Eyebrow>
                      <div className="num-tab h-display" style={{ fontSize: 28, fontWeight: 700, color: p.color, letterSpacing: "-0.03em", marginTop: 6 }}>
                        {p.weight} <span style={{ fontSize: 12, color: C.dim, fontWeight: 500, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>LBS</span>
                      </div>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: p.color + "22", border: `1px solid ${p.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: p.color, fontFamily: FONT_MONO }}>{i+1}</div>
                  </div>
                  <p className="h-serif" style={{ fontSize: 18, color: C.cream, margin: "0 0 14px", lineHeight: 1.4 }}>{p.focus}</p>
                  <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
                    {p.goals.map((g, j) => (
                      <div key={j} style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13, color: C.cream, alignItems: "baseline" }}>
                        <span style={{ color: p.color, fontFamily: FONT_MONO, fontSize: 11 }}>0{j+1}</span>
                        <span style={{ flex: 1 }}>{g}</span>
                      </div>
                    ))}
                  </div>
                </Surface>
              </div>
            ))}

            <Surface accent={C.amber} padding={22}>
              <Eyebrow color={C.amber}>Nutrition</Eyebrow>
              <p className="h-serif" style={{ fontSize: 17, color: C.cream, margin: "12px 0 0", lineHeight: 1.6 }}>
                Target 200g protein/day. Whole foods first. Carbs around training. Cut alcohol to weekends. 3L water minimum on training days.
              </p>
            </Surface>

            <Surface accent={C.electric} padding={22}>
              <Eyebrow color={C.electric}>Atomic Habits · 4 Laws</Eyebrow>
              <div style={{ marginTop: 14 }}>
                {[
                  ["1.", "Make It Obvious", C.rust, "Gym bag packed the night before. Shoes by the door."],
                  ["2.", "Make It Attractive", C.amber, "Hype playlist only during training. Watch dunk compilations."],
                  ["3.", "Make It Easy", C.moss, "2-Minute Rule: just lace up. The rest follows."],
                  ["4.", "Make It Satisfying", C.plum, "Log every session. The streak is the reward."],
                ].map(([n, law, color, tip]) => (
                  <div key={law} style={{ padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                      <span className="mono" style={{ color: color, fontSize: 11, fontWeight: 700 }}>{n}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color, letterSpacing: "-0.01em" }}>{law}</div>
                        <p className="h-serif" style={{ fontSize: 14, color: C.cream, margin: "4px 0 0", lineHeight: 1.5 }}>{tip}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="h-serif" style={{ fontSize: 16, color: C.dim, margin: "16px 0 0", textAlign: "center" }}>
                "I am a basketball player who trains."
                <span className="mono" style={{ display: "block", fontStyle: "normal", fontSize: 10, letterSpacing: "0.15em", marginTop: 6, color: C.mute }}>— JAMES CLEAR</span>
              </p>
            </Surface>
          </>
        )}

      </main>
    </div>
  );
}
