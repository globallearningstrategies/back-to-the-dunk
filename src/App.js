import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

const COLORS = {
  bg: "#0A0A0A", card: "#141414", border: "#222", text: "#F0F0F0",
  muted: "#888", orange: "#FF6B35", yellow: "#F7C948", teal: "#4ECDC4",
  green: "#A8E063", purple: "#B388FF"
};

const S = {
  app: { background: COLORS.bg, minHeight: "100vh", fontFamily: "Georgia, serif", color: COLORS.text },
  header: { background: "#111", borderBottom: "1px solid #222", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 },
  tabs: { display: "flex", borderBottom: "1px solid #222", background: "#0D0D0D", overflowX: "auto" },
  tab: (a) => ({ flexShrink: 0, padding: "12px 10px", border: "none", background: "none", fontFamily: "Georgia, serif", fontSize: 12, cursor: "pointer", color: a ? COLORS.orange : COLORS.muted, borderBottom: a ? "2px solid #FF6B35" : "2px solid transparent", whiteSpace: "nowrap" }),
  card: (border) => ({ background: COLORS.card, border: "1px solid " + (border || COLORS.border), borderRadius: 10, padding: 16, marginBottom: 14 }),
  btn: (c, ghost) => ({ background: ghost ? "transparent" : c, border: "1px solid " + c, color: ghost ? c : "#000", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "bold" }),
  input: { background: "#1A1A1A", border: "1px solid #222", borderRadius: 6, color: "#F0F0F0", padding: "5px 8px", width: 62, fontSize: 12, fontFamily: "Georgia, serif", textAlign: "center" },
  badge: (c) => ({ background: c + "22", color: c, border: "1px solid " + c + "44", borderRadius: 20, padding: "3px 10px", fontSize: 11, display: "inline-block" }),
  statBox: (c) => ({ background: COLORS.card, border: "1px solid " + (c || COLORS.border), borderRadius: 10, padding: 14, textAlign: "center" }),
};

const SESSIONS = [
  {
    id: "A", label: "DAY A", name: "Strength + Power", location: "Gym", color: COLORS.orange,
    exercises: [
      { id: "a1", name: "Barbell Squats", sets: 4, reps: 8, barbell: true },
      { id: "a2", name: "Box Jumps", sets: 4, reps: 5 },
      { id: "a3", name: "Calf Raises", sets: 4, reps: 20 },
      { id: "a4", name: "Step-Ups", sets: 3, reps: 12 },
      { id: "a5", name: "Goblet Squats", sets: 3, reps: 12 },
      { id: "a6", name: "Bench Press", sets: 4, reps: 8, barbell: true },
    ]
  },
  {
    id: "B", label: "DAY B", name: "Basketball + Conditioning", location: "Court", color: COLORS.yellow,
    exercises: [
      { id: "b1", name: "Defensive Slides", sets: 3, reps: "30s", timed: true },
      { id: "b2", name: "Court Sprints", sets: 6, reps: "x", noWeight: true },
      { id: "b3", name: "Layup Drills", sets: 1, reps: "drill", noWeight: true },
      { id: "b4", name: "Vertical Jump Practice", sets: 3, reps: 8 },
      { id: "b5", name: "Pickup / Solo Play", sets: 1, reps: "play", noWeight: true },
    ]
  },
  {
    id: "C", label: "DAY C", name: "Full Body Circuit", location: "Gym", color: COLORS.teal,
    exercises: [
      { id: "c1", name: "Dumbbell Rows", sets: 3, reps: 12 },
      { id: "c2", name: "Goblet Squats", sets: 3, reps: 15 },
      { id: "c3", name: "Wall Sit", sets: 3, reps: "30s", timed: true },
      { id: "c4", name: "Calf Raises", sets: 3, reps: 20 },
      { id: "c5", name: "Step-Ups", sets: 3, reps: 12 },
      { id: "c6", name: "Overhead Press", sets: 3, reps: 10, barbell: true },
    ]
  }
];

const TABATA = { rounds: 5, sprintSec: 5, restSec: 5 };

const PHASES = [
  { weeks: "Weeks 1-4", color: COLORS.orange, weight: "225 to 218 lbs", focus: "Build the habit. Nail form. Ease joints back in.", goals: ["2x gym sessions/week", "1x court session/week", "Sleep 7+ hrs", "Cut late-night eating"] },
  { weeks: "Weeks 5-8", color: COLORS.yellow, weight: "218 to 212 lbs", focus: "Add intensity. Increase court time. Track weight weekly.", goals: ["Progress weights in gym", "Add 1 sprint set/court day", "Drop 1 processed meal/day", "Vertical jump baseline test"] },
  { weeks: "Weeks 9-12", color: COLORS.teal, weight: "212 to 206 lbs", focus: "Peak conditioning. Power training becomes primary.", goals: ["Max out box jump height", "3 sessions/week consistently", "Nutrition locked in", "Rim touches target: every session"] },
  { weeks: "Weeks 13-16", color: COLORS.green, weight: "206 to 200 lbs", focus: "Dunk attempt. You have earned it.", goals: ["Full vertical test", "Attempt dunk - document it", "Assess next 16-week cycle", "Celebrate the comeback"] },
];

const HABITS = [
  { law: "1st Law: Make It Obvious", color: COLORS.orange, items: ["Pack your gym bag the night before", "Put your basketball shoes by the door", "Set a recurring phone reminder: Train today?", "Keep a water bottle visible at all times"] },
  { law: "2nd Law: Make It Attractive", color: COLORS.yellow, items: ["Only listen to your favorite playlist during workouts", "Find a training partner or court regular", "Watch dunk compilations before hard sessions", "Visualize the dunk attempt in detail"] },
  { law: "3rd Law: Make It Easy", color: COLORS.teal, items: ["Choose a gym within 10 min of home or work", "Pre-log your session before you arrive", "Start with the exercise you like most", "Have a minimum viable workout for bad days: 3 sets, 20 min"] },
  { law: "4th Law: Make It Satisfying", color: COLORS.green, items: ["Log every session - the streak is the reward", "Take a vertical jump video monthly", "Weigh in every Sunday morning, same conditions", "Tell someone about your progress weekly"] },
];

const STACKS = [
  { trigger: "Before shower", habit: "Run your daily Tabata - every single day" },
  { trigger: "Sunday morning", habit: "Weigh in + treadmill walk" },
  { trigger: "After putting kids to bed", habit: "Pack gym bag for tomorrow" },
  { trigger: "After every workout", habit: "Log it in the app before the shower" },
];

let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === "suspended") {
    _audioCtx.resume();
  }
  return _audioCtx;
}

function beep(freq, duration, vol) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq || 880;
    gain.gain.value = vol || 0.3;
    gain.gain.setValueAtTime(vol || 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.1));
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (duration || 0.1));
  } catch(e) { console.log("beep error", e); }
}

function BarbellInput({ vals, onVal }) {
  const BAR = 45;
  const perSide = parseFloat(vals && vals.perSide) || 0;
  const total = BAR + perSide * 2;
  return (
    <div style={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8, padding: "8px 10px", marginTop: 6, marginBottom: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: COLORS.muted, width: 90 }}>Bar</span>
        <span style={{ fontSize: 13, color: COLORS.orange, fontWeight: "bold" }}>45 lbs</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: COLORS.muted, width: 90 }}>+ Each side</span>
        <input style={{ ...S.input, width: 70 }} type="number" min="0" step="2.5" placeholder="0"
          value={(vals && vals.perSide) || ""} onChange={e => onVal("perSide", e.target.value)} />
        <span style={{ fontSize: 11, color: COLORS.muted }}>lbs</span>
      </div>
      <div style={{ borderTop: "1px solid #333", paddingTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: COLORS.muted, width: 90 }}>= Total</span>
        <span style={{ fontSize: 15, fontWeight: "bold", color: COLORS.yellow }}>{total} lbs</span>
      </div>
    </div>
  );
}

function ExRow({ ex, checked, onCheck, vals, onVal, color }) {
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid #222" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" checked={!!checked} onChange={onCheck} style={{ width: 18, height: 18, accentColor: color, cursor: "pointer", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14 }}>{ex.name}</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>{ex.sets} sets x {ex.reps}</div>
        </div>
        {!ex.barbell && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!ex.timed && !ex.noWeight && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: COLORS.muted, marginBottom: 2 }}>lbs</div>
                <input style={S.input} type="number" min="0" placeholder="0" value={(vals && vals.weight) || ""} onChange={e => onVal("weight", e.target.value)} />
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: COLORS.muted, marginBottom: 2 }}>sets done</div>
              <input style={S.input} type="number" min="0" max={ex.sets} placeholder={ex.sets} value={(vals && vals.setsDone) || ""} onChange={e => onVal("setsDone", e.target.value)} />
            </div>
          </div>
        )}
        {ex.barbell && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: COLORS.muted, marginBottom: 2 }}>sets done</div>
            <input style={S.input} type="number" min="0" max={ex.sets} placeholder={ex.sets} value={(vals && vals.setsDone) || ""} onChange={e => onVal("setsDone", e.target.value)} />
          </div>
        )}
      </div>
      {ex.barbell && <BarbellInput vals={vals} onVal={onVal} />}
    </div>
  );
}

function calcVolume(exercises, checked, vals) {
  let v = 0;
  exercises.forEach(ex => {
    if (!checked[ex.id] || ex.noWeight || ex.timed) return;
    let w;
    if (ex.barbell) {
      const perSide = parseFloat(vals[ex.id] && vals[ex.id].perSide) || 0;
      w = 45 + perSide * 2;
    } else {
      w = parseFloat(vals[ex.id] && vals[ex.id].weight) || 0;
    }
    const s = parseInt((vals[ex.id] && vals[ex.id].setsDone) || ex.sets);
    const r = parseInt(ex.reps) || 0;
    v += w * s * r;
  });
  return v;
}

function TabataTimer({ onLog }) {
  const [phase, setPhase] = useState("idle");
  const [round, setRound] = useState(1);
  const [count, setCount] = useState(TABATA.sprintSec);
  const [countdown, setCountdown] = useState(null);
  const wakeLockRef = useRef(null);

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch(e) {}
  };

  const releaseWakeLock = () => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch(e) {}
  };

  const start = () => {
    // Unlock audio on user gesture
    getAudioCtx();
    requestWakeLock();
    setCountdown(5);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      beep(1046, 0.3, 0.5);
      setPhase("sprint");
      setRound(1);
      setCount(TABATA.sprintSec);
      return;
    }
    beep(660, 0.08, 0.3);
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    const interval = setInterval(() => {
      setCount(c => {
        if (c > 1) {
          beep(660, 0.12, 0.4);
          return c - 1;
        }
        if (phase === "sprint") {
          beep(523, 0.15, 0.4);
          setPhase("rest");
          return TABATA.restSec;
        } else {
          setRound(r => {
            if (r >= TABATA.rounds) {
              beep(880, 0.5, 0.6);
              releaseWakeLock();
              setPhase("done");
              return r;
            }
            beep(880, 0.2, 0.5);
            setPhase("sprint");
            return r + 1;
          });
          return TABATA.sprintSec;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const reset = () => {
    releaseWakeLock();
    setPhase("idle");
    setRound(1);
    setCount(TABATA.sprintSec);
    setCountdown(null);
  };

  return (
    <div style={{ ...S.card(COLORS.green + "44"), background: COLORS.green + "08" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: (phase !== "idle" || countdown !== null) ? 12 : 0 }}>
        <div>
          <div style={{ ...S.badge(COLORS.green), marginBottom: 4 }}>DAILY</div>
          <div style={{ fontWeight: "bold", fontSize: 15 }}>Tabata Sprints</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>5 rounds, 5s on / 5s off, before every shower</div>
        </div>
        {phase === "idle" && countdown === null && (
          <button onClick={start} style={{ ...S.btn(COLORS.green), padding: "10px 20px" }}>Start</button>
        )}
      </div>

      {countdown !== null && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 2 }}>Get Ready...</div>
          <div style={{ fontSize: 96, fontWeight: "bold", color: COLORS.yellow, lineHeight: 1 }}>{countdown}</div>
          <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 8 }}>Starting in {countdown} second{countdown !== 1 ? "s" : ""}...</div>
          <button onClick={reset} style={{ ...S.btn(COLORS.muted, true), fontSize: 12, marginTop: 16 }}>Cancel</button>
        </div>
      )}

      {countdown === null && phase !== "idle" && (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          {(phase === "sprint" || phase === "rest") && (
            <>
              <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 2 }}>Round {round} of {TABATA.rounds}</div>
              <div style={{ fontSize: 72, fontWeight: "bold", color: phase === "sprint" ? COLORS.green : COLORS.yellow, lineHeight: 1, marginBottom: 6 }}>{count}</div>
              <div style={{ fontSize: 20, fontWeight: "bold", color: phase === "sprint" ? COLORS.green : COLORS.yellow, marginBottom: 16 }}>
                {phase === "sprint" ? "SPRINT!" : "REST"}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                {Array.from({ length: TABATA.rounds }).map((_, i) => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < round - 1 ? COLORS.green : i === round - 1 ? COLORS.green + "99" : COLORS.border }} />
                ))}
              </div>
              <button onClick={reset} style={{ ...S.btn(COLORS.muted, true), fontSize: 12 }}>Reset</button>
            </>
          )}
          {phase === "done" && (
            <>
              <div style={{ fontSize: 36, marginBottom: 6 }}>Done!</div>
              <div style={{ fontSize: 17, fontWeight: "bold", color: COLORS.green, marginBottom: 4 }}>5 rounds complete.</div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 18 }}>25 seconds of work. Go shower.</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={reset} style={{ ...S.btn(COLORS.muted, true), fontSize: 12 }}>Reset</button>
                <button onClick={() => { onLog(); reset(); }} style={{ ...S.btn(COLORS.green), boxShadow: "0 0 14px #A8E06355" }}>Log It</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <div style={{ ...S.card(COLORS.purple + "44"), background: COLORS.purple + "08" }}>
      <div style={{ ...S.badge(COLORS.purple), marginBottom: 6 }}>ANYTIME</div>
      <div style={{ fontWeight: "bold", fontSize: 15, marginBottom: 2 }}>Treadmill Walk</div>
      <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 14 }}>Log duration, speed, and incline</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        {[
          { label: "Duration (min)", val: duration, set: setDuration, placeholder: "45" },
          { label: "Speed (mph)", val: speed, set: setSpeed, placeholder: "3.5" },
          { label: "Incline (%)", val: incline, set: setIncline, placeholder: "10" },
        ].map(f => (
          <div key={f.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>{f.label}</div>
            <input style={{ ...S.input, width: "100%" }} type="number" min="0" step="0.1"
              placeholder={f.placeholder} value={f.val} onChange={e => f.set(e.target.value)} />
          </div>
        ))}
      </div>
      {miles && <div style={{ textAlign: "center", color: COLORS.purple, fontSize: 13, marginBottom: 10 }}>Est. distance: {miles} miles</div>}
      <input style={{ ...S.input, width: "100%", textAlign: "left", padding: "8px 10px", marginBottom: 12, fontSize: 12 }}
        type="text" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
      <button onClick={handleLog} disabled={!canLog}
        style={{ ...S.btn(COLORS.purple), width: "100%", opacity: canLog ? 1 : 0.4, boxShadow: canLog ? "0 0 14px #B388FF55" : "none", transition: "all .3s" }}>
        {done ? "Logged!" : "Log Treadmill Walk"}
      </button>
    </div>
  );
}

function StatsTab({ history, weightLog }) {
  const gymSessions = history.filter(h => h.session_name && h.session_name.startsWith("DAY"));
  const treadmillSessions = history.filter(h => h.session_name === "Treadmill Walk");
  const tabataSessions = history.filter(h => h.session_name === "Daily Tabata Sprints");
  const totalVolume = gymSessions.reduce((a, h) => a + (h.total_volume || 0), 0);
  const thisWeekVolume = gymSessions.filter(h => (Date.now() - new Date(h.logged_at)) < 7 * 86400000).reduce((a, h) => a + (h.total_volume || 0), 0);
  const totalMiles = treadmillSessions.reduce((a, h) => { const ex = h.exercises && h.exercises[0]; return a + (ex ? ex.miles || 0 : 0); }, 0);
  const totalTreadmillMin = treadmillSessions.reduce((a, h) => a + ((h.exercises && h.exercises[0] && h.exercises[0].duration) || 0), 0);
  const speedSessions = treadmillSessions.filter(h => h.exercises && h.exercises[0] && h.exercises[0].speed > 0);
  const avgSpeed = speedSessions.length > 0 ? (speedSessions.reduce((a, h) => a + h.exercises[0].speed, 0) / speedSessions.length).toFixed(1) : 0;
  const inclineSessions = treadmillSessions.filter(h => h.exercises && h.exercises[0] && h.exercises[0].incline > 0);
  const avgIncline = inclineSessions.length > 0 ? (inclineSessions.reduce((a, h) => a + h.exercises[0].incline, 0) / inclineSessions.length).toFixed(1) : 0;

  const allDates = [...new Set(history.map(h => new Date(h.logged_at).toDateString()))].sort((a, b) => new Date(b) - new Date(a));
  let currentStreak = 0, longestStreak = 0, streak = 0;
  for (let i = 0; i < allDates.length; i++) {
    const diff = i === 0 ? Math.floor((Date.now() - new Date(allDates[0])) / 86400000) : Math.floor((new Date(allDates[i - 1]) - new Date(allDates[i])) / 86400000);
    if (i === 0 && diff <= 1) { currentStreak = 1; streak = 1; }
    else if (diff === 1) { streak++; if (i < (currentStreak > 0 ? currentStreak : 1) + 1) currentStreak = streak; }
    else { streak = 1; }
    longestStreak = Math.max(longestStreak, streak);
  }

  const sessionCount = { A: 0, B: 0, C: 0 };
  gymSessions.forEach(h => {
    if (h.session_name && h.session_name.includes("DAY A")) sessionCount.A++;
    else if (h.session_name && h.session_name.includes("DAY B")) sessionCount.B++;
    else if (h.session_name && h.session_name.includes("DAY C")) sessionCount.C++;
  });

  const pbs = {};
  gymSessions.forEach(h => {
    (h.exercises || []).forEach(ex => {
      if (ex.weight > 0) {
        if (!pbs[ex.name] || ex.weight > pbs[ex.name]) pbs[ex.name] = ex.weight;
      }
    });
  });

  const weeklyVol = {};
  gymSessions.forEach(h => {
    const d = new Date(h.logged_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
    weeklyVol[key] = (weeklyVol[key] || 0) + (h.total_volume || 0);
  });
  const weekKeys = Object.keys(weeklyVol).slice(-6);
  const weekVals = weekKeys.map(k => weeklyVol[k]);
  const maxWeekVol = Math.max(...weekVals, 1);

  const startWeight = 225, goalWeight = 200;
  const currentWeight = (weightLog[0] && weightLog[0].weight) || startWeight;
  const weightLost = startWeight - currentWeight;
  const weeksElapsed = history.length > 0 ? Math.ceil((Date.now() - new Date(history[history.length - 1].logged_at)) / (7 * 86400000)) : 1;
  const pacePerWeek = weightLost / Math.max(weeksElapsed, 1);
  const weeksToGoal = pacePerWeek > 0 ? Math.ceil((currentWeight - goalWeight) / pacePerWeek) : null;

  return (
    <>
      <div style={{ fontWeight: "bold", fontSize: 18, marginBottom: 4 }}>Your Stats</div>
      <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Everything you have built so far.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Gym Sessions", value: gymSessions.length, color: COLORS.orange },
          { label: "Court Sessions", value: sessionCount.B, color: COLORS.yellow },
          { label: "Tabatas", value: tabataSessions.length, color: COLORS.green },
          { label: "Treadmill Walks", value: treadmillSessions.length, color: COLORS.purple },
        ].map(s => (
          <div key={s.label} style={{ ...S.statBox(s.color + "33") }}>
            <div style={{ fontSize: 26, fontWeight: "bold", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ ...S.statBox(COLORS.orange + "33") }}>
          <div style={{ fontSize: 26, fontWeight: "bold", color: COLORS.orange }}>{currentStreak}</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>Day Streak</div>
        </div>
        <div style={{ ...S.statBox(COLORS.yellow + "33") }}>
          <div style={{ fontSize: 26, fontWeight: "bold", color: COLORS.yellow }}>{longestStreak}</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>Longest Streak</div>
        </div>
      </div>
      <div style={S.card(COLORS.orange + "44")}>
        <div style={{ color: COLORS.orange, fontWeight: "bold", fontSize: 14, marginBottom: 12 }}>Weight Lifted</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: "bold", color: COLORS.orange }}>{totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) + "k" : totalVolume.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>Total lbs lifted</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: "bold", color: COLORS.yellow }}>{thisWeekVolume >= 1000 ? (thisWeekVolume / 1000).toFixed(1) + "k" : thisWeekVolume.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>This week</div>
          </div>
        </div>
        {gymSessions.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8 }}>Sessions by type</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {[{ k: "A", c: COLORS.orange }, { k: "B", c: COLORS.yellow }, { k: "C", c: COLORS.teal }].map(t => (
                <div key={t.k} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ background: "#222", borderRadius: 6, height: 6, overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ width: gymSessions.length > 0 ? (sessionCount[t.k] / Math.max(...Object.values(sessionCount), 1) * 100) + "%" : "0%", height: "100%", background: t.c, borderRadius: 6 }} />
                  </div>
                  <div style={{ fontSize: 11, color: t.c }}>Day {t.k}: {sessionCount[t.k]}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {weekKeys.length >= 2 && (
        <div style={S.card()}>
          <div style={{ color: COLORS.orange, fontWeight: "bold", fontSize: 14, marginBottom: 14 }}>Volume by Week</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
            {weekKeys.map((k, i) => (
              <div key={k} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ width: "100%", background: COLORS.orange, borderRadius: "4px 4px 0 0", height: Math.max(4, (weekVals[i] / maxWeekVol) * 70) }} />
                <div style={{ fontSize: 9, color: COLORS.muted, marginTop: 4 }}>{k}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={S.card(COLORS.purple + "44")}>
        <div style={{ color: COLORS.purple, fontWeight: "bold", fontSize: 14, marginBottom: 12 }}>Treadmill</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Total Miles", value: totalMiles.toFixed(1), color: COLORS.purple },
            { label: "Total Time", value: totalTreadmillMin >= 60 ? (totalTreadmillMin / 60).toFixed(1) + " hrs" : totalTreadmillMin + " min", color: COLORS.purple },
            { label: "Avg Speed", value: avgSpeed + " mph", color: COLORS.muted },
            { label: "Avg Incline", value: avgIncline + "%", color: COLORS.muted },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: "bold", color: s.color }}>{s.value || "-"}</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={S.card(COLORS.green + "44")}>
        <div style={{ color: COLORS.green, fontWeight: "bold", fontSize: 14, marginBottom: 12 }}>Weight Progress</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: "bold", color: COLORS.green }}>{weightLost > 0 ? weightLost.toFixed(1) : "0"} lbs</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>Lost</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: "bold", color: COLORS.yellow }}>{(currentWeight - goalWeight).toFixed(1)} lbs</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>To Goal</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: "bold", color: COLORS.teal }}>{weeksToGoal ? weeksToGoal + " wks" : "-"}</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>At this pace</div>
          </div>
        </div>
      </div>
      {Object.keys(pbs).length > 0 && (
        <div style={S.card()}>
          <div style={{ color: COLORS.yellow, fontWeight: "bold", fontSize: 14, marginBottom: 12 }}>Personal Bests</div>
          {Object.entries(pbs).map(([name, weight]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #222", fontSize: 13 }}>
              <span style={{ color: COLORS.muted }}>{name}</span>
              <span style={{ color: COLORS.yellow, fontWeight: "bold" }}>{weight} lbs</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function App() {
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

  const showSave = (ok) => { setSaveMsg(ok ? "Saved" : "Save failed"); setTimeout(() => setSaveMsg(""), 2000); };

  const loadData = useCallback(async () => {
    try {
      const [{ data: workouts }, { data: weights }] = await Promise.all([
        supabase.from("workouts").select("*").order("logged_at", { ascending: false }),
        supabase.from("weight_log").select("*").order("logged_at", { ascending: false }),
      ]);
      if (workouts) setHistory(workouts);
      if (weights) setWeightLog(weights);
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const session = SESSIONS[activeSession];
  const sessionKey = session.id;
  const sessionColor = session.color;
  const exercises = session.exercises;
  const anyChecked = exercises.some(ex => checked[sessionKey + "_" + ex.id]);
  const volume = calcVolume(
    exercises,
    Object.fromEntries(exercises.map(ex => [ex.id, checked[sessionKey + "_" + ex.id]])),
    Object.fromEntries(exercises.map(ex => [ex.id, (vals[sessionKey + "_" + ex.id]) || {}]))
  );

  const toggleCheck = (id) => setChecked(p => ({ ...p, [id]: !p[id] }));
  const setVal = (id, field, value) => setVals(p => ({ ...p, [id]: { ...(p[id] || {}), [field]: value } }));

  const logSession = async () => {
    const exVols = exercises
      .filter(ex => checked[sessionKey + "_" + ex.id])
      .map(ex => {
        let w;
        if (ex.barbell) {
          const perSide = parseFloat((vals[sessionKey + "_" + ex.id] && vals[sessionKey + "_" + ex.id].perSide)) || 0;
          w = 45 + perSide * 2;
        } else {
          w = parseFloat((vals[sessionKey + "_" + ex.id] && vals[sessionKey + "_" + ex.id].weight)) || 0;
        }
        const s = parseInt((vals[sessionKey + "_" + ex.id] && vals[sessionKey + "_" + ex.id].setsDone) || ex.sets);
        const r = parseInt(ex.reps) || 0;
        const vol = ex.noWeight || ex.timed ? 0 : w * s * r;
        return { name: ex.name, sets: s, reps: ex.reps, weight: w, volume: vol };
      });
    const payload = { session_name: session.label + ": " + session.name, color: sessionColor, total_volume: exVols.reduce((a, e) => a + e.volume, 0), exercises: exVols };
    const { data, error } = await supabase.from("workouts").insert([payload]).select();
    if (!error && data) {
      setHistory(p => [data[0], ...p]);
      const nc = { ...checked };
      exercises.forEach(ex => delete nc[sessionKey + "_" + ex.id]);
      setChecked(nc);
      showSave(true);
    } else showSave(false);
  };

  const logTabata = async () => {
    const payload = { session_name: "Daily Tabata Sprints", color: COLORS.green, total_volume: 0, exercises: [{ name: "Sprint in place", sets: 5, reps: "5s on/5s off", weight: 0, volume: 0 }] };
    const { data, error } = await supabase.from("workouts").insert([payload]).select();
    if (!error && data) { setHistory(p => [data[0], ...p]); showSave(true); }
    else showSave(false);
  };

  const logTreadmill = async ({ duration, speed, incline, miles, notes }) => {
    const label = [duration ? duration + " min" : null, speed ? speed + " mph" : null, incline ? incline + "% incline" : null, miles ? miles + " mi" : null, notes || null].filter(Boolean).join(" | ");
    const payload = { session_name: "Treadmill Walk", color: COLORS.purple, total_volume: 0, exercises: [{ name: label, sets: 1, reps: "walk", weight: 0, volume: 0, duration, speed, incline, miles }] };
    const { data, error } = await supabase.from("workouts").insert([payload]).select();
    if (!error && data) { setHistory(p => [data[0], ...p]); showSave(true); }
    else showSave(false);
  };

  const deleteLog = async (id) => { await supabase.from("workouts").delete().eq("id", id); setHistory(p => p.filter(h => h.id !== id)); };

  const logWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 100 || w > 400) return;
    const { data, error } = await supabase.from("weight_log").insert([{ weight: w }]).select();
    if (!error && data) { setWeightLog(p => [data[0], ...p]); setWeightInput(""); showSave(true); }
    else showSave(false);
  };

  const deleteWeight = async (id) => { await supabase.from("weight_log").delete().eq("id", id); setWeightLog(p => p.filter(e => e.id !== id)); };

  const daysAgo = (iso) => { const d = Math.floor((Date.now() - new Date(iso)) / 86400000); return d === 0 ? "Today" : d === 1 ? "Yesterday" : d + " days ago"; };
  const thisWeek = history.filter(h => (Date.now() - new Date(h.logged_at)) < 7 * 86400000).length;
  const totalLbs = history.reduce((a, h) => a + (h.total_volume || 0), 0);
  const lastGymSession = history.find(h => h.session_name && ["A", "B", "C"].some(x => h.session_name.includes("DAY " + x)));
  const lastDay = lastGymSession ? Math.floor((Date.now() - new Date(lastGymSession.logged_at)) / 86400000) : null;
  const restDay = lastDay !== null && lastDay < 1;

  if (loading) return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🏀</div>
        <div style={{ color: COLORS.orange, fontSize: 16 }}>Loading your plan...</div>
      </div>
    </div>
  );

  return (
    <div style={S.app}>
      <div style={{ ...S.header, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🏀</span>
          <div>
            <div style={{ fontWeight: "bold", fontSize: 18, color: COLORS.orange }}>Back to the Dunk</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>16-Week Basketball Comeback</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: saveMsg === "Saved" ? COLORS.green : "#ff4444" }}>{saveMsg}</div>
      </div>

      <div style={S.tabs}>
        {["workout", "history", "stats", "weight", "goals", "habits"].map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      <div style={{ padding: "16px 16px 80px" }}>

        {tab === "workout" && (
          <>
            <TabataTimer onLog={logTabata} />
            <TreadmillLogger onLog={logTreadmill} />
            <div style={{ ...S.card(restDay ? "#333" : COLORS.orange + "44"), background: restDay ? "#111" : COLORS.orange + "11", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>NEXT UP</div>
              {restDay
                ? <div style={{ fontSize: 14 }}>Rest today. Last session was {daysAgo(lastGymSession && lastGymSession.logged_at)}. Recovery is training.</div>
                : <div style={{ fontSize: 14 }}>Ready to train. <strong>{session.label}: {session.name}</strong> <span style={{ color: COLORS.muted, fontSize: 12, marginLeft: 6 }}>{session.location}</span></div>
              }
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {SESSIONS.map((s, i) => (
                <button key={s.id} onClick={() => setActiveSession(i)} style={{ ...S.btn(s.color, activeSession !== i), fontSize: 12, padding: "7px 14px" }}>{s.label}</button>
              ))}
            </div>
            <div style={S.card(sessionColor + "44")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ ...S.badge(sessionColor), marginBottom: 6 }}>{session.location.toUpperCase()}</div>
                  <div style={{ fontWeight: "bold", fontSize: 16 }}>{session.label}: {session.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>Check what you did. Log when ready.</div>
                </div>
                {volume > 0 && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>Volume</div>
                    <div style={{ color: sessionColor, fontWeight: "bold", fontSize: 15 }}>{volume.toLocaleString()} lbs</div>
                  </div>
                )}
              </div>
              {exercises.map(ex => (
                <ExRow key={ex.id} ex={ex}
                  checked={checked[sessionKey + "_" + ex.id]}
                  onCheck={() => toggleCheck(sessionKey + "_" + ex.id)}
                  vals={vals[sessionKey + "_" + ex.id] || {}}
                  onVal={(f, v) => setVal(sessionKey + "_" + ex.id, f, v)}
                  color={sessionColor} />
              ))}
              <button onClick={logSession}
                style={{ ...S.btn(sessionColor), width: "100%", marginTop: 16, fontSize: 14, padding: 12, opacity: anyChecked ? 1 : 0.5, boxShadow: anyChecked ? "0 0 18px " + sessionColor + "66" : "none", transition: "all .3s" }}>
                {anyChecked ? "End Workout & Log Session" : "Check at least one exercise to log"}
              </button>
            </div>
            <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 12, fontStyle: "italic", marginTop: 16 }}>
              I am a basketball player who trains. - James Clear
            </div>
          </>
        )}

        {tab === "history" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Sessions", value: history.length, color: COLORS.orange },
                { label: "This Week", value: thisWeek, color: COLORS.yellow },
                { label: "Total lbs", value: totalLbs > 0 ? (totalLbs / 1000).toFixed(1) + "k" : "0", color: COLORS.teal },
              ].map(s => (
                <div key={s.label} style={{ ...S.card(s.color + "33"), textAlign: "center", padding: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: "bold", color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{s.label}</div>
                </div>
              ))}
            </div>
            {history.length === 0 && <div style={{ textAlign: "center", color: COLORS.muted, padding: 40 }}>No sessions logged yet. Get to work.</div>}
            {history.map((h, i) => {
              const prev = history[i + 1];
              const gap = prev ? Math.floor((new Date(h.logged_at) - new Date(prev.logged_at)) / 86400000) : null;
              const expanded = expandedLog[h.id];
              const color = h.color || COLORS.orange;
              return (
                <div key={h.id} style={S.card(color + "33")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ ...S.badge(color), marginBottom: 4 }}>{daysAgo(h.logged_at)}</div>
                      <div style={{ fontWeight: "bold", fontSize: 14 }}>{h.session_name}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
                        {new Date(h.logged_at).toLocaleDateString("en-CA")}
                        {gap !== null && <span style={{ marginLeft: 8 }}>{gap}d rest before</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {h.total_volume > 0 && <div style={{ color, fontWeight: "bold", fontSize: 14 }}>{h.total_volume.toLocaleString()} lbs</div>}
                      <button onClick={() => setExpandedLog(p => ({ ...p, [h.id]: !p[h.id] }))} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16 }}>{expanded ? "▲" : "▼"}</button>
                      <button onClick={() => deleteLog(h.id)} style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", fontSize: 16 }}>🗑</button>
                    </div>
                  </div>
                  {expanded && (
                    <div style={{ marginTop: 10, borderTop: "1px solid #222", paddingTop: 10 }}>
                      {(h.exercises || []).map((ex, j) => (
                        <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                          <span style={{ color: COLORS.muted }}>{ex.name}</span>
                          <span>{ex.sets}x{ex.reps}{ex.weight > 0 ? " @ " + ex.weight + "lbs" : ""}{ex.volume > 0 ? " = " + ex.volume.toLocaleString() + " lbs" : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === "stats" && <StatsTab history={history} weightLog={weightLog} />}

        {tab === "weight" && (() => {
          const sorted = [...weightLog].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
          const latest = weightLog[0];
          const start = 225, goal = 200;
          const current = (latest && latest.weight) || start;
          const lost = start - current;
          const remaining = current - goal;
          const pct = Math.min(100, Math.max(0, (lost / (start - goal)) * 100));
          const last8 = sorted.slice(-8);
          return (
            <>
              <div style={{ fontWeight: "bold", fontSize: 18, marginBottom: 4 }}>Weight Tracker</div>
              <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Sunday morning, same conditions.</div>
              <div style={S.card(COLORS.orange + "44")}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: COLORS.muted }}>Start: 225 lbs</span>
                  <span style={{ fontSize: 12, color: COLORS.green }}>Goal: 200 lbs</span>
                </div>
                <div style={{ background: "#222", borderRadius: 8, height: 14, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ width: pct + "%", height: "100%", background: "linear-gradient(90deg, #FF6B35, #A8E063)", borderRadius: 8, transition: "width .5s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  {[
                    { label: "Current", val: current + " lbs", c: COLORS.orange },
                    { label: "Lost", val: lost > 0 ? "-" + lost.toFixed(1) + " lbs" : "0 lbs", c: lost > 0 ? COLORS.green : COLORS.muted },
                    { label: "To Go", val: (remaining > 0 ? remaining.toFixed(1) : "0") + " lbs", c: COLORS.yellow }
                  ].map(x => (
                    <div key={x.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: "bold", color: x.c }}>{x.val}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{x.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.card()}>
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10 }}>Log Today's Weight</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input style={{ ...S.input, flex: 1, width: "auto", fontSize: 15, padding: "10px 12px", textAlign: "left" }}
                    type="number" min="150" max="350" step="0.1" placeholder="e.g. 223.5"
                    value={weightInput} onChange={e => setWeightInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && logWeight()} />
                  <button onClick={logWeight} style={{ ...S.btn(COLORS.orange), padding: "10px 20px" }}>Log</button>
                </div>
              </div>
              {last8.length >= 2 && (
                <div style={S.card()}>
                  <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 10 }}>Trend (last {last8.length} entries)</div>
                  <svg width="100%" height="70" viewBox="0 0 300 70">
                    {(() => {
                      const weights = last8.map(e => e.weight);
                      const mn = Math.min(...weights) - 1, mx = Math.max(...weights) + 1;
                      const pts = weights.map((w, i) => ((i / (weights.length - 1)) * 280 + 10) + "," + (60 - ((w - mn) / (mx - mn)) * 55)).join(" ");
                      return (
                        <>
                          <polyline points={pts} fill="none" stroke={COLORS.orange} strokeWidth="2.5" strokeLinejoin="round" />
                          {weights.map((w, i) => <circle key={i} cx={(i / (weights.length - 1)) * 280 + 10} cy={60 - ((w - mn) / (mx - mn)) * 55} r="4" fill={COLORS.orange} />)}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
              {weightLog.map((e, i) => {
                const prev = weightLog[i + 1];
                const delta = prev ? e.weight - prev.weight : null;
                return (
                  <div key={e.id} style={{ ...S.card(), display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: 15 }}>{e.weight} lbs</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{new Date(e.logged_at).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })} - {daysAgo(e.logged_at)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {delta !== null && <div style={{ fontSize: 13, fontWeight: "bold", color: delta < 0 ? COLORS.green : delta > 0 ? "#ff4444" : COLORS.muted }}>{delta < 0 ? "▼" : delta > 0 ? "▲" : "-"} {Math.abs(delta).toFixed(1)} lbs</div>}
                      <button onClick={() => deleteWeight(e.id)} style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", fontSize: 16 }}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}

        {tab === "goals" && (
          <>
            <div style={{ fontWeight: "bold", fontSize: 18, marginBottom: 4 }}>16-Week Roadmap</div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>225 to 200 lbs. Dunk again.</div>
            {PHASES.map((p, i) => (
              <div key={i} style={S.card(p.color + "44")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={S.badge(p.color)}>{p.weeks}</div>
                  <div style={{ color: p.color, fontWeight: "bold", fontSize: 14 }}>{p.weight}</div>
                </div>
                <div style={{ fontSize: 14, marginBottom: 10 }}>{p.focus}</div>
                {p.goals.map((g, j) => <div key={j} style={{ fontSize: 13, color: COLORS.muted, padding: "3px 0", display: "flex", gap: 8 }}><span style={{ color: p.color }}>→</span>{g}</div>)}
              </div>
            ))}
            <div style={{ ...S.card(), background: "#111" }}>
              <div style={{ color: COLORS.orange, fontWeight: "bold", marginBottom: 8 }}>Nutrition Note</div>
              <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>Target 200g protein/day. Prioritize whole foods. Eat the bulk of carbs around training. Cut alcohol to weekends only. Hydrate: 3L water minimum on training days.</div>
            </div>
          </>
        )}

        {tab === "habits" && (
          <>
            <div style={{ fontWeight: "bold", fontSize: 18, marginBottom: 4 }}>Atomic Habits for Comeback</div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>James Clear's 4 Laws applied to your return.</div>
            {HABITS.map((h, i) => (
              <div key={i} style={S.card(h.color + "33")}>
                <div style={{ color: h.color, fontWeight: "bold", fontSize: 14, marginBottom: 10 }}>{h.law}</div>
                {h.items.map((item, j) => (
                  <div key={j} style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13, borderBottom: j < h.items.length - 1 ? "1px solid #222" : "none" }}>
                    <span style={{ color: h.color, fontSize: 10, marginTop: 4 }}>●</span><span>{item}</span>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ fontWeight: "bold", fontSize: 16, margin: "20px 0 10px" }}>Habit Stacking</div>
            {STACKS.map((s, i) => (
              <div key={i} style={{ ...S.card(), display: "flex", gap: 12, alignItems: "center", padding: 12 }}>
                <div style={{ background: COLORS.orange + "22", color: COLORS.orange, borderRadius: 8, padding: "6px 10px", fontSize: 11, minWidth: 90, textAlign: "center" }}>{s.trigger}</div>
                <div style={{ color: COLORS.muted, fontSize: 11 }}>→</div>
                <div style={{ fontSize: 13 }}>{s.habit}</div>
              </div>
            ))}
            <div style={{ ...S.card(COLORS.teal + "44"), marginTop: 20, background: COLORS.teal + "11" }}>
              <div style={{ color: COLORS.teal, fontWeight: "bold", fontSize: 15, marginBottom: 8 }}>The 2-Minute Rule</div>
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>Any new habit should take less than 2 minutes to start.</div>
              <div style={{ marginTop: 12, fontSize: 13, color: COLORS.muted, lineHeight: 1.8 }}>
                I will train hard → Put on workout clothes.<br />
                I will get to the court → Grab the ball and walk out.<br />
                I will eat clean → Prep one good meal.<br />
                I will lose 25 lbs → Step on the scale right now.
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
