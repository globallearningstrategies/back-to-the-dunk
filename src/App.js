import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       "#080808",
  surface:  "#111111",
  surface2: "#1A1A1A",
  border:   "#2A2A2A",
  text:     "#F5F5F7",
  muted:    "#6E6E73",
  orange:   "#FF6B35",
  yellow:   "#FFD60A",
  teal:     "#30D158",
  blue:     "#0A84FF",
  purple:   "#BF5AF2",
  red:      "#FF453A",
};

const injectStyles = () => {
  if (document.getElementById("bttd-styles")) return;
  const style = document.createElement("style");
  style.id = "bttd-styles";
  style.textContent = `
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { margin: 0; background: ${C.bg}; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
    input[type=number] { -moz-appearance: textfield; }
    ::-webkit-scrollbar { display: none; }
    .tab-bar { display: flex; overflow-x: auto; scrollbar-width: none; }
    .pill-btn { transition: all 0.18s ease; }
    .pill-btn:active { transform: scale(0.96); opacity: 0.85; }
    .card-tap:active { transform: scale(0.99); opacity: 0.9; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
    .fade-up { animation: fadeUp 0.3s ease forwards; }
    .pulse { animation: pulse 1.5s ease infinite; }
    .countdown-num { font-variant-numeric: tabular-nums; }
  `;
  document.head.appendChild(style);
};

// ─── Exercise Data ─────────────────────────────────────────────────────────────
const SESSIONS = [
  {
    id: "A", label: "Day A", name: "Strength & Power", location: "Gym", color: C.orange,
    exercises: [
      { id: "a1", name: "Barbell Squat",    sets: 4, reps: 6,  barbell: true,  note: "Full depth" },
      { id: "a2", name: "Bench Press",      sets: 4, reps: 8,  barbell: true,  note: "Controlled descent" },
      { id: "a3", name: "Romanian Deadlift",sets: 3, reps: 8,  barbell: true,  note: "Hinge, don't squat" },
      { id: "a4", name: "Box Jump",         sets: 4, reps: 5,  bodyweight: true, note: "Max height" },
      { id: "a5", name: "Calf Raise",       sets: 4, reps: 20, note: "Slow & controlled" },
    ]
  },
  {
    id: "B", label: "Day B", name: "Court & Conditioning", location: "Court", color: C.yellow,
    exercises: [
      { id: "b1", name: "Defensive Slides", sets: 4, reps: "45s", timed: true, note: "Stay low" },
      { id: "b2", name: "Full-Court Sprint", sets: 8, reps: "x",  noWeight: true, note: "Walk back = rest" },
      { id: "b3", name: "Vertical Jump",    sets: 3, reps: 8,  bodyweight: true, note: "Touch highest point" },
      { id: "b4", name: "Layup Drill",      sets: 2, reps: "drill", noWeight: true, note: "Both sides" },
      { id: "b5", name: "Pickup / Solo Play", sets: 1, reps: "20min", noWeight: true, note: "Cardio + IQ" },
    ]
  },
  {
    id: "C", label: "Day C", name: "Full Body Circuit", location: "Gym", color: C.teal,
    exercises: [
      { id: "c1", name: "Dumbbell Row",     sets: 3, reps: 12, note: "Chest-supported preferred" },
      { id: "c2", name: "Goblet Squat",     sets: 3, reps: 15, note: "Pause at bottom" },
      { id: "c3", name: "Overhead Press",   sets: 3, reps: 10, barbell: true, note: "Strict form" },
      { id: "c4", name: "Step-Up",          sets: 3, reps: 12, note: "Each leg" },
      { id: "c5", name: "Wall Sit",         sets: 3, reps: "45s", timed: true, note: "Quads parallel" },
    ]
  }
];

const TABATA_CONFIG = { rounds: 5, sprintSec: 5, restSec: 5 };

const CARDIO_TYPES = {
  tabata: {
    label: "Tabata Bike",
    icon: "🚴",
    color: C.teal,
    duration: "15 min",
    detail: "8 rounds · 20s on / 10s off · 4 min work + warmup/cooldown",
  },
  court_intervals: {
    label: "Court Intervals",
    icon: "🏀",
    color: C.yellow,
    duration: "20 min",
    detail: "10 rounds · 30s hard / 30s rest · suicides, sprints, layups",
  },
};

// ─── Audio ─────────────────────────────────────────────────────────────────────
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}
function beep(freq, dur, vol) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
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
    u.rate = 1.1; u.pitch = 1.1; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch(e) {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── UI Primitives ─────────────────────────────────────────────────────────────
function Card({ children, color, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      className={onClick ? "card-tap" : ""}
      style={{
        background: C.surface,
        border: "1px solid " + (color ? color + "30" : C.border),
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children, color }) {
  return (
    <span style={{
      background: (color || C.orange) + "18",
      color: color || C.orange,
      border: "1px solid " + (color || C.orange) + "30",
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.3,
    }}>
      {children}
    </span>
  );
}

function Btn({ children, color, ghost, onClick, disabled, style = {}, full }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="pill-btn"
      style={{
        background: ghost ? "transparent" : (color || C.orange),
        border: "1px solid " + (color || C.orange),
        color: ghost ? (color || C.orange) : "#000",
        padding: "11px 22px",
        borderRadius: 12,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "-apple-system, SF Pro Display, Georgia, serif",
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: 0.1,
        opacity: disabled ? 0.38 : 1,
        width: full ? "100%" : undefined,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function NumInput({ value, onChange, placeholder, style = {} }) {
  return (
    <input
      type="number"
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: C.surface2,
        border: "1px solid " + C.border,
        borderRadius: 8,
        color: C.text,
        padding: "7px 10px",
        fontSize: 13,
        fontFamily: "-apple-system, SF Pro Display, Georgia, serif",
        textAlign: "center",
        width: "100%",
        ...style,
      }}
    />
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6, letterSpacing: -0.5 }}>{children}</div>;
}
function SectionSub({ children }) {
  return <div style={{ fontSize: 14, color: C.muted, marginBottom: 20, lineHeight: 1.4 }}>{children}</div>;
}
function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "8px 0" }} />;
}

// ─── Barbell Widget ────────────────────────────────────────────────────────────
function BarbellInput({ vals, onVal }) {
  const perSide = parseFloat(vals?.perSide) || 0;
  const total = 45 + perSide * 2;
  return (
    <div style={{ background: C.surface2, borderRadius: 10, padding: "10px 14px", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: C.muted }}>Bar (45) + each side</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.orange }}>{total} lbs total</span>
      </div>
      <NumInput value={vals?.perSide} onChange={v => onVal("perSide", v)} placeholder="lbs per side" />
    </div>
  );
}

// ─── Exercise Row ──────────────────────────────────────────────────────────────
function ExRow({ ex, checked, onCheck, vals, onVal, color }) {
  return (
    <div style={{ paddingTop: 12, paddingBottom: 12, borderBottom: "1px solid " + C.border }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          onClick={onCheck}
          style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
            background: checked ? color : "transparent",
            border: "2px solid " + (checked ? color : C.border),
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s ease",
          }}
        >
          {checked && <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4 7L10 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round"/></svg>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: checked ? C.muted : C.text, textDecoration: checked ? "line-through" : "none" }}>{ex.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{ex.sets} × {ex.reps} {ex.note ? "· " + ex.note : ""}</div>
        </div>
        {!ex.noWeight && !ex.timed && !ex.bodyweight && !ex.barbell && (
          <div style={{ width: 64, flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginBottom: 3 }}>lbs</div>
            <NumInput value={vals?.weight} onChange={v => onVal("weight", v)} placeholder="0" />
          </div>
        )}
        {!ex.noWeight && !ex.timed && (
          <div style={{ width: 52, flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginBottom: 3 }}>sets</div>
            <NumInput value={vals?.setsDone} onChange={v => onVal("setsDone", v)} placeholder={String(ex.sets)} />
          </div>
        )}
      </div>
      {ex.barbell && <BarbellInput vals={vals} onVal={onVal} />}
    </div>
  );
}

// ─── Tabata Timer ──────────────────────────────────────────────────────────────
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
  const activeColor = isSprint ? C.teal : C.yellow;

  return (
    <Card color={C.teal} style={{ background: C.teal + "08" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Label color={C.teal}>DAILY TABATA</Label>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginTop: 8 }}>Sprint Timer</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{TABATA_CONFIG.rounds} rounds · {TABATA_CONFIG.sprintSec}s on / {TABATA_CONFIG.restSec}s off</div>
        </div>
        {phase === "idle" && countdown === null && (
          <Btn color={C.teal} onClick={start}>Start</Btn>
        )}
      </div>

      {countdown !== null && (
        <div className="fade-up" style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <div style={{ fontSize: 13, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Get Ready</div>
          <div className="countdown-num" style={{ fontSize: 88, fontWeight: 800, color: C.yellow, lineHeight: 1 }}>{countdown}</div>
          <Btn ghost color={C.muted} onClick={reset} style={{ marginTop: 20, fontSize: 13 }}>Cancel</Btn>
        </div>
      )}

      {countdown === null && phase !== "idle" && (
        <div className="fade-up" style={{ marginTop: 16 }}>
          {(isSprint || isRest) && (
            <>
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Round {round} of {TABATA_CONFIG.rounds}</div>
                <div className="countdown-num" style={{ fontSize: 80, fontWeight: 800, color: activeColor, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: activeColor, marginTop: 4, letterSpacing: 1 }}>
                  {isSprint ? "SPRINT" : "REST"}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16, marginBottom: 16 }}>
                  {Array.from({ length: TABATA_CONFIG.rounds }).map((_, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < round - 1 ? C.teal : i === round - 1 ? C.teal + "88" : C.border, transition: "background 0.3s" }} />
                  ))}
                </div>
              </div>
              <Btn ghost color={C.muted} onClick={reset} full style={{ fontSize: 13 }}>Reset</Btn>
            </>
          )}
          {phase === "done" && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.teal, marginBottom: 4 }}>5 Rounds Complete</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>25 seconds of work. Go shower.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn ghost color={C.muted} onClick={reset} style={{ flex: 1, fontSize: 13 }}>Reset</Btn>
                <Btn color={C.teal} onClick={() => { onLog(); reset(); }} style={{ flex: 1, fontSize: 13 }}>Log It</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Treadmill Logger ──────────────────────────────────────────────────────────
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
    <Card color={C.purple} style={{ background: C.purple + "08" }}>
      <Label color={C.purple}>TREADMILL</Label>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginTop: 8, marginBottom: 2 }}>Walk Logger</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Duration · speed · incline</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[["Duration", "min", duration, setDuration, "45"],["Speed", "mph", speed, setSpeed, "3.5"],["Incline", "%", incline, setIncline, "8"]].map(([label, unit, val, set, ph]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{label} ({unit})</div>
            <NumInput value={val} onChange={set} placeholder={ph} />
          </div>
        ))}
      </div>
      {miles && <div style={{ textAlign: "center", color: C.purple, fontSize: 13, marginBottom: 10 }}>≈ {miles} miles</div>}
      <input
        type="text" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
        style={{ background: C.surface2, border: "1px solid " + C.border, borderRadius: 8, color: C.text, padding: "9px 12px", fontSize: 13, width: "100%", marginBottom: 10, fontFamily: "-apple-system, SF Pro Display, Georgia, serif" }}
      />
      <Btn color={C.purple} onClick={handleLog} disabled={!canLog} full>
        {done ? "Logged ✓" : "Log Walk"}
      </Btn>
    </Card>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────
function StatsTab({ history, weightLog, cardioSessions }) {
  const gymSessions = history.filter(h => h.session_name?.startsWith("DAY"));
  const treadmillSessions = history.filter(h => h.session_name === "Treadmill Walk");
  const tabataSessions = history.filter(h => h.session_name === "Daily Tabata Sprints");
  const cardioCount = cardioSessions.length;

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

  const StatBox = ({ label, value, color, sub }) => (
    <div style={{ background: C.surface2, borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid " + C.border }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || C.text, letterSpacing: -1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: color || C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <>
      <SectionTitle>Stats</SectionTitle>
      <SectionSub>Everything you've built so far.</SectionSub>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatBox label="Gym Sessions" value={gymSessions.length} color={C.orange} />
        <StatBox label="HIIT Sessions" value={cardioCount} color={C.teal} />
        <StatBox label="Tabatas" value={tabataSessions.length} color={C.teal} />
        <StatBox label="Treadmill Walks" value={treadmillSessions.length} color={C.purple} />
      </div>

      <Card>
        <div style={{ color: C.orange, fontWeight: 700, fontSize: 13, marginBottom: 14, letterSpacing: 0.2 }}>VOLUME LIFTED</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: wks.length >= 2 ? 16 : 0 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.orange }}>{totalVolume >= 1000 ? (totalVolume/1000).toFixed(1)+"k" : totalVolume.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Total lbs</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.yellow }}>{thisWeekVol >= 1000 ? (thisWeekVol/1000).toFixed(1)+"k" : thisWeekVol.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: C.muted }}>This week</div>
          </div>
        </div>
        {wks.length >= 2 && (
          <div style={{ display: "flex", gap: 5, alignItems: "flex-end", height: 60 }}>
            {wks.map((k,i) => (
              <div key={k} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ width: "100%", background: C.orange, borderRadius: "4px 4px 0 0", height: Math.max(3, (wvs[i]/maxWv)*52), transition: "height 0.4s ease" }} />
                <div style={{ fontSize: 8, color: C.muted, marginTop: 4 }}>{k}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card color={C.purple}>
        <div style={{ color: C.purple, fontWeight: 700, fontSize: 13, marginBottom: 14 }}>TREADMILL</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            ["Miles", totalMiles.toFixed(1), C.purple],
            ["Time", totalMin >= 60 ? (totalMin/60).toFixed(1)+" hrs" : totalMin+" min", C.purple],
          ].map(([l,v,c]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v || "—"}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{l}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card color={C.teal}>
        <div style={{ color: C.teal, fontWeight: 700, fontSize: 13, marginBottom: 14 }}>WEIGHT PROGRESS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.teal }}>{lost > 0 ? "-"+lost.toFixed(1) : "0"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>lbs lost</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{curW}</div>
            <div style={{ fontSize: 11, color: C.muted }}>current</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.yellow }}>{(curW-goalW).toFixed(1)}</div>
            <div style={{ fontSize: 11, color: C.muted }}>to goal</div>
          </div>
        </div>
      </Card>

      {Object.keys(pbs).length > 0 && (
        <Card>
          <div style={{ color: C.yellow, fontWeight: 700, fontSize: 13, marginBottom: 14 }}>PERSONAL BESTS</div>
          {Object.entries(pbs).map(([name, weight]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + C.border, fontSize: 14 }}>
              <span style={{ color: C.muted }}>{name}</span>
              <span style={{ color: C.yellow, fontWeight: 700 }}>{weight} lbs</span>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
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

  const showSave = (ok) => { setSaveMsg(ok ? "✓ Saved" : "Save failed"); setTimeout(() => setSaveMsg(""), 2500); };

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
    const payload = { session_name: session.label+": "+session.name, color: session.color, total_volume: exVols.reduce((a,e)=>a+e.volume,0), exercises: exVols };
    const { data, error } = await supabase.from("workouts").insert([payload]).select();
    if (!error && data) {
      setHistory(p => [data[0],...p]);
      const nc = {...checked}; session.exercises.forEach(ex => delete nc[sk+"_"+ex.id]); setChecked(nc);
      showSave(true);
    } else showSave(false);
  };

  const logTabata = async () => {
    const { data, error } = await supabase.from("workouts").insert([{ session_name: "Daily Tabata Sprints", color: C.teal, total_volume: 0, exercises: [{ name: "Sprint in place", sets: 5, reps: "5s on/5s off", weight: 0, volume: 0 }] }]).select();
    if (!error && data) { setHistory(p => [data[0],...p]); showSave(true); } else showSave(false);
  };

  const logTreadmill = async ({ duration, speed, incline, miles, notes }) => {
    const label = [duration?duration+" min":null, speed?speed+" mph":null, incline?incline+"% incline":null, miles?miles+" mi":null, notes||null].filter(Boolean).join(" · ");
    const { data, error } = await supabase.from("workouts").insert([{ session_name: "Treadmill Walk", color: C.purple, total_volume: 0, exercises: [{ name: label, sets: 1, reps: "walk", weight: 0, volume: 0, duration, speed, incline, miles }] }]).select();
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
  const lastGym = history.find(h => h.session_name && ["A","B","C"].some(x => h.session_name.includes("DAY "+x)));
  const restDay = lastGym && Math.floor((Date.now()-new Date(lastGym.logged_at))/86400000) < 1;

  // Cardio logic
  const lastCardio = cardioSessions[0] || null;
  const lastCardioType = lastCardio?.workout_type || null;
  const hoursSinceCardio = lastCardio ? (Date.now()-new Date(lastCardio.completed_at))/3600000 : null;
  const cardioInRecovery = hoursSinceCardio !== null && hoursSinceCardio < 48;
  const nextCardioType = lastCardioType === "tabata" ? "court_intervals" : "tabata";
  const hoursUntilCardio = cardioInRecovery ? Math.ceil(48-hoursSinceCardio) : 0;
  const cardioOverdue = !cardioInRecovery && hoursSinceCardio !== null && hoursSinceCardio/24 > 3;

  const TABS = [
    { id: "workout", label: "Workout" },
    { id: "cardio",  label: "Cardio" },
    { id: "history", label: "History" },
    { id: "stats",   label: "Stats" },
    { id: "weight",  label: "Weight" },
    { id: "goals",   label: "Goals" },
  ];

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, SF Pro Display, Georgia, serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏀</div>
        <div style={{ color: C.orange, fontSize: 17, fontWeight: 600 }}>Loading…</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "-apple-system, SF Pro Display, Georgia, serif", color: C.text }}>

      {/* Header */}
      <div style={{ background: C.bg, borderBottom: "1px solid " + C.border, padding: "16px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🏀</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.orange, letterSpacing: -0.3 }}>Back to the Dunk</div>
            <div style={{ fontSize: 11, color: C.muted }}>16-Week Comeback</div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: saveMsg.includes("Saved") ? C.teal : C.red }}>{saveMsg}</div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar" style={{ background: C.bg, borderBottom: "1px solid " + C.border, padding: "0 4px" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: "12px 14px", border: "none", background: "none",
            fontFamily: "-apple-system, SF Pro Display, Georgia, serif",
            fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            cursor: "pointer", color: tab === t.id ? C.orange : C.muted,
            borderBottom: tab === t.id ? "2px solid " + C.orange : "2px solid transparent",
            whiteSpace: "nowrap", transition: "color 0.15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 16px 100px" }}>

        {/* ── WORKOUT ── */}
        {tab === "workout" && (
          <div className="fade-up">
            <TabataTimer onLog={logTabata} />
            <TreadmillLogger onLog={logTreadmill} />

            {/* Next Up */}
            <Card color={restDay ? C.border : C.orange} style={{ background: restDay ? C.surface2 : C.orange + "0C", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Next Workout</div>
              {restDay
                ? <div style={{ fontSize: 15 }}>Rest day — last session was {daysAgo(lastGym.logged_at)}. Recovery counts.</div>
                : <div style={{ fontSize: 15 }}><strong>{session.label}: {session.name}</strong> <span style={{ color: C.muted, fontSize: 12 }}>· {session.location}</span></div>
              }
            </Card>

            {/* HIIT Next Up */}
            <Card color={cardioOverdue ? C.red : cardioInRecovery ? C.border : CARDIO_TYPES[nextCardioType].color} style={{ background: cardioOverdue ? C.red+"0C" : C.surface2, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>HIIT · Next Up</div>
              {cardioInRecovery
                ? <div style={{ fontSize: 15 }}>Recovering — <strong>{CARDIO_TYPES[nextCardioType].label}</strong> in {hoursUntilCardio}h</div>
                : cardioOverdue
                ? <div style={{ fontSize: 15, color: C.red }}>Overdue — <strong>{CARDIO_TYPES[nextCardioType].label}</strong> · Do today</div>
                : <div style={{ fontSize: 15 }}><strong>{CARDIO_TYPES[nextCardioType].icon} {CARDIO_TYPES[nextCardioType].label}</strong> <span style={{ color: C.teal }}>· Ready</span></div>
              }
            </Card>

            {/* Session Selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {SESSIONS.map((s, i) => (
                <Btn key={s.id} color={s.color} ghost={activeSession !== i} onClick={() => setActiveSession(i)} style={{ flex: 1, fontSize: 13, padding: "9px 0", textAlign: "center" }}>
                  {s.label}
                </Btn>
              ))}
            </div>

            <Card color={session.color}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <Label color={session.color}>{session.location.toUpperCase()}</Label>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginTop: 8, letterSpacing: -0.3 }}>{session.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Check off each exercise · enter weight</div>
                </div>
                {volume > 0 && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: C.muted }}>Volume</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: session.color }}>{volume.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>lbs</div>
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
              <Btn color={session.color} onClick={logSession} disabled={!anyChecked} full style={{ marginTop: 18, padding: 14, fontSize: 15 }}>
                {anyChecked ? "End Workout & Log" : "Check an exercise to log"}
              </Btn>
            </Card>

            <div style={{ textAlign: "center", color: C.muted, fontSize: 12, fontStyle: "italic", marginTop: 8 }}>
              "I am a basketball player who trains." — James Clear
            </div>
          </div>
        )}

        {/* ── CARDIO ── */}
        {tab === "cardio" && (() => {
          const last30 = cardioSessions.filter(s => (Date.now()-new Date(s.completed_at))/86400000 <= 30);
          const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate()-startOfWeek.getDay()); startOfWeek.setHours(0,0,0,0);
          const thisWeekCardio = cardioSessions.filter(s => new Date(s.completed_at) >= startOfWeek);
          const weekDays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
          const weekSessions = weekDays.map((d,i) => {
            const day = new Date(startOfWeek); day.setDate(startOfWeek.getDate()+i);
            return cardioSessions.find(s => new Date(s.completed_at).toDateString() === day.toDateString()) || null;
          });
          const surpriseMe = () => {
            const pick = cardioInRecovery ? nextCardioType : (Math.random() > 0.5 ? "tabata" : "court_intervals");
            const w = CARDIO_TYPES[pick];
            alert(w.icon + " " + w.label + "
" + w.detail);
          };
          return (
            <div className="fade-up">
              <SectionTitle>Cardio HIIT</SectionTitle>
              <SectionSub>2 sessions/week · 48h recovery between sessions</SectionSub>

              {/* What's Next */}
              <Card color={cardioOverdue ? C.red : cardioInRecovery ? C.border : CARDIO_TYPES[nextCardioType].color}>
                <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>What's Next</div>
                {!lastCardio ? (
                  <div style={{ fontSize: 16 }}>No sessions yet — pick one below 🏁</div>
                ) : cardioInRecovery ? (
                  <>
                    <div style={{ fontSize: 14, color: C.muted }}>Recovering · ready in {hoursUntilCardio}h</div>
                    <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{CARDIO_TYPES[nextCardioType].icon} {CARDIO_TYPES[nextCardioType].label}</div>
                  </>
                ) : cardioOverdue ? (
                  <>
                    <div style={{ fontSize: 13, color: C.red }}>Overdue — {Math.floor(hoursSinceCardio/24)}d since last session</div>
                    <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: C.red }}>{CARDIO_TYPES[nextCardioType].icon} {CARDIO_TYPES[nextCardioType].label} · Do today</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{CARDIO_TYPES[nextCardioType].icon} {CARDIO_TYPES[nextCardioType].label}</div>
                    <div style={{ fontSize: 13, color: C.teal, marginTop: 4 }}>Ready to go!</div>
                  </>
                )}
              </Card>

              {/* Weekly Grid */}
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>This Week</div>
                  <div style={{ fontSize: 13, color: thisWeekCardio.length >= 2 ? C.teal : C.muted, fontWeight: 600 }}>
                    {thisWeekCardio.length}/2 {thisWeekCardio.length >= 2 ? "✅" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {weekDays.map((d,i) => {
                    const s = weekSessions[i];
                    const w = s ? CARDIO_TYPES[s.workout_type] : null;
                    const isToday = new Date().getDay() === i;
                    return (
                      <div key={d} style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: isToday ? C.orange : C.muted, marginBottom: 5, fontWeight: isToday ? 700 : 400 }}>{d}</div>
                        <div style={{ aspectRatio: "1", borderRadius: 8, background: s ? w.color+"22" : C.surface2, border: "1px solid "+(s ? w.color+"55" : C.border), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                          {s ? w.icon : isToday ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.orange }} /> : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Btn color={C.purple} onClick={surpriseMe} full style={{ marginBottom: 14, padding: 13, fontSize: 14 }}>🎲 Surprise Me</Btn>

              {/* Log Cards */}
              {Object.entries(CARDIO_TYPES).map(([key, w]) => (
                <Card key={key} color={w.color} style={{ background: w.color+"08" }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{w.icon}</div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{w.label}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{w.detail}</div>
                    <Label color={w.color} style={{ marginTop: 8, display: "inline-block" }}>{w.duration}</Label>
                  </div>
                  <input
                    type="text" placeholder="Notes (optional)" value={cardioNotes} onChange={e => setCardioNotes(e.target.value)}
                    style={{ background: C.surface2, border: "1px solid "+C.border, borderRadius: 8, color: C.text, padding: "9px 12px", fontSize: 13, width: "100%", marginBottom: 10, fontFamily: "-apple-system, SF Pro Display, Georgia, serif" }}
                  />
                  <Btn color={w.color} onClick={() => logCardio(key)} disabled={!!cardioLogging} full style={{ padding: 13, fontSize: 14 }}>
                    {cardioLogging === key ? "Logging…" : "Log " + w.label}
                  </Btn>
                </Card>
              ))}

              {last30.length > 0 && (
                <>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10, marginTop: 4 }}>Recent</div>
                  {last30.map((s, i) => {
                    const w = CARDIO_TYPES[s.workout_type];
                    const prev = last30[i+1];
                    const gap = prev ? Math.round((new Date(s.completed_at)-new Date(prev.completed_at))/3600000) : null;
                    return (
                      <Card key={s.id} color={w.color} style={{ padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 18 }}>{w.icon}</span>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{w.label}</span>
                            </div>
                            <div style={{ fontSize: 12, color: C.muted }}>
                              {daysAgo(s.completed_at)} · {new Date(s.completed_at).toLocaleDateString("en-CA")}
                              {gap !== null && <span style={{ marginLeft: 8, color: gap >= 48 ? C.teal : C.red }}>{Math.round(gap)}h gap</span>}
                            </div>
                            {s.notes && <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontStyle: "italic" }}>{s.notes}</div>}
                          </div>
                          <button onClick={() => deleteCardio(s.id)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 18, padding: 4 }}>🗑</button>
                        </div>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
          );
        })()}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <div className="fade-up">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { l: "Sessions", v: history.length, c: C.orange },
                { l: "This Week", v: thisWeek, c: C.yellow },
                { l: "Total lbs", v: totalLbs > 0 ? (totalLbs/1000).toFixed(1)+"k" : "0", c: C.teal },
              ].map(s => (
                <Card key={s.l} color={s.c} style={{ textAlign: "center", padding: 14, marginBottom: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.l}</div>
                </Card>
              ))}
            </div>
            {history.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: 48, fontSize: 15 }}>No sessions yet. Get to work. 🏀</div>}
            {history.map((h, i) => {
              const prev = history[i+1];
              const gap = prev ? Math.floor((new Date(h.logged_at)-new Date(prev.logged_at))/86400000) : null;
              const expanded = expandedLog[h.id];
              const color = h.color || C.orange;
              return (
                <Card key={h.id} color={color}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <Label color={color}>{daysAgo(h.logged_at)}</Label>
                        {gap !== null && <span style={{ fontSize: 11, color: C.muted }}>{gap}d rest</span>}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{h.session_name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{new Date(h.logged_at).toLocaleDateString("en-CA")}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {h.total_volume > 0 && <div style={{ color, fontWeight: 700, fontSize: 14 }}>{h.total_volume.toLocaleString()} lbs</div>}
                      <button onClick={() => setExpandedLog(p => ({...p, [h.id]: !p[h.id]}))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, padding: 2 }}>{expanded ? "▲" : "▼"}</button>
                      <button onClick={() => deleteLog(h.id)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16, padding: 2 }}>🗑</button>
                    </div>
                  </div>
                  {expanded && (
                    <div style={{ marginTop: 12, borderTop: "1px solid "+C.border, paddingTop: 12 }}>
                      {(h.exercises||[]).map((ex, j) => (
                        <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: j < h.exercises.length-1 ? "1px solid "+C.border : "none" }}>
                          <span style={{ color: C.muted }}>{ex.name}</span>
                          <span style={{ color: C.text }}>{ex.sets}×{ex.reps}{ex.weight > 0 ? " @ "+ex.weight+"lbs" : ""}{ex.volume > 0 ? " = "+ex.volume.toLocaleString()+" lbs" : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ── STATS ── */}
        {tab === "stats" && <div className="fade-up"><StatsTab history={history} weightLog={weightLog} cardioSessions={cardioSessions} /></div>}

        {/* ── WEIGHT ── */}
        {tab === "weight" && (() => {
          const sorted = [...weightLog].sort((a,b) => new Date(a.logged_at)-new Date(b.logged_at));
          const cur = weightLog[0]?.weight || 225;
          const lost = 225-cur, remaining = cur-200;
          const pct = Math.min(100, Math.max(0, (lost/25)*100));
          const last8 = sorted.slice(-8);
          return (
            <div className="fade-up">
              <SectionTitle>Weight</SectionTitle>
              <SectionSub>225 → 200 lbs · Sunday mornings, same conditions.</SectionSub>

              <Card color={C.orange}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: C.muted }}>
                  <span>Start: 225 lbs</span><span style={{ color: C.teal }}>Goal: 200 lbs</span>
                </div>
                <div style={{ background: C.surface2, borderRadius: 10, height: 10, overflow: "hidden", marginBottom: 14 }}>
                  <div style={{ width: pct+"%", height: "100%", background: "linear-gradient(90deg, "+C.orange+", "+C.teal+")", borderRadius: 10, transition: "width 0.6s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  {[["Current", cur+" lbs", C.orange],["Lost", lost > 0 ? "-"+lost.toFixed(1)+" lbs" : "0", C.teal],["To Go", remaining > 0 ? remaining.toFixed(1)+" lbs" : "Done!", C.yellow]].map(([l,v,c]) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Log Weight</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="number" min="150" max="350" step="0.1" placeholder="e.g. 223.5" value={weightInput} onChange={e => setWeightInput(e.target.value)} onKeyDown={e => e.key==="Enter" && logWeight()}
                    style={{ background: C.surface2, border: "1px solid "+C.border, borderRadius: 10, color: C.text, padding: "11px 14px", fontSize: 16, flex: 1, fontFamily: "-apple-system, SF Pro Display, Georgia, serif" }} />
                  <Btn color={C.orange} onClick={logWeight} style={{ padding: "11px 22px" }}>Log</Btn>
                </div>
              </Card>

              {last8.length >= 2 && (
                <Card>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Trend · last {last8.length} entries</div>
                  <svg width="100%" height="70" viewBox="0 0 300 70" style={{ overflow: "visible" }}>
                    {(() => {
                      const ws = last8.map(e => e.weight);
                      const mn = Math.min(...ws)-1, mx = Math.max(...ws)+1;
                      const pts = ws.map((w,i) => ((i/(ws.length-1))*280+10)+","+(60-((w-mn)/(mx-mn))*55)).join(" ");
                      return <>
                        <polyline points={pts} fill="none" stroke={C.orange} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                        {ws.map((w,i) => <circle key={i} cx={(i/(ws.length-1))*280+10} cy={60-((w-mn)/(mx-mn))*55} r="4" fill={C.orange} />)}
                      </>;
                    })()}
                  </svg>
                </Card>
              )}

              {weightLog.map((e,i) => {
                const prev = weightLog[i+1];
                const delta = prev ? e.weight-prev.weight : null;
                return (
                  <Card key={e.id} style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 700 }}>{e.weight} lbs</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{new Date(e.logged_at).toLocaleDateString("en-CA",{weekday:"short",month:"short",day:"numeric"})} · {daysAgo(e.logged_at)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        {delta !== null && <div style={{ fontSize: 14, fontWeight: 700, color: delta < 0 ? C.teal : delta > 0 ? C.red : C.muted }}>{delta < 0 ? "▼" : delta > 0 ? "▲" : "—"} {Math.abs(delta).toFixed(1)}</div>}
                        <button onClick={() => deleteWeight(e.id)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>🗑</button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        })()}

        {/* ── GOALS ── */}
        {tab === "goals" && (
          <div className="fade-up">
            <SectionTitle>16-Week Roadmap</SectionTitle>
            <SectionSub>225 → 200 lbs. Dunk again.</SectionSub>

            {[
              { weeks: "Weeks 1–4", color: C.orange, weight: "225 → 218 lbs", focus: "Build the habit. Nail form. Ease in.", goals: ["2× gym/week", "1× court/week", "Sleep 7+ hrs", "Cut late-night eating"] },
              { weeks: "Weeks 5–8", color: C.yellow, weight: "218 → 212 lbs", focus: "Add intensity. Increase court time.", goals: ["Progress weights", "Add sprint sets", "Drop 1 processed meal/day", "Vertical jump baseline"] },
              { weeks: "Weeks 9–12", color: C.teal, weight: "212 → 206 lbs", focus: "Peak conditioning. Power is primary.", goals: ["Max box jump height", "3 sessions/week", "Nutrition locked", "Rim touches every session"] },
              { weeks: "Weeks 13–16", color: C.purple, weight: "206 → 200 lbs", focus: "Dunk attempt. You earned it.", goals: ["Full vertical test", "Attempt the dunk — film it", "Celebrate the comeback", "Plan next cycle"] },
            ].map((p,i) => (
              <Card key={i} color={p.color}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Label color={p.color}>{p.weeks}</Label>
                  <div style={{ color: p.color, fontWeight: 700, fontSize: 14 }}>{p.weight}</div>
                </div>
                <div style={{ fontSize: 14, color: C.text, marginBottom: 10 }}>{p.focus}</div>
                {p.goals.map((g,j) => (
                  <div key={j} style={{ fontSize: 13, color: C.muted, padding: "3px 0", display: "flex", gap: 8 }}>
                    <span style={{ color: p.color }}>→</span>{g}
                  </div>
                ))}
              </Card>
            ))}

            <Card style={{ background: C.surface2 }}>
              <div style={{ color: C.orange, fontWeight: 700, marginBottom: 10, fontSize: 13 }}>NUTRITION</div>
              <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>Target 200g protein/day. Whole foods first. Carbs around training. Cut alcohol to weekends. 3L water minimum on training days.</div>
            </Card>

            <Card style={{ background: C.surface2 }}>
              <div style={{ color: C.teal, fontWeight: 700, marginBottom: 10, fontSize: 13 }}>ATOMIC HABITS · 4 LAWS</div>
              {[
                ["Make It Obvious", C.orange, "Gym bag packed the night before. Shoes by the door."],
                ["Make It Attractive", C.yellow, "Hype playlist only during training. Watch dunk compilations."],
                ["Make It Easy", C.teal, "2-Minute Rule: just lace up. The rest follows."],
                ["Make It Satisfying", C.purple, "Log every session. The streak is the reward."],
              ].map(([law, color, tip]) => (
                <div key={law} style={{ padding: "10px 0", borderBottom: "1px solid "+C.border }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color }}>{law}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{tip}</div>
                </div>
              ))}
              <div style={{ padding: "10px 0", fontSize: 12, color: C.muted, fontStyle: "italic" }}>
                "I am a basketball player who trains." — James Clear
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
