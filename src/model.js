import React from 'react';

export const LIGHT = {
  ink:      "#FAFAF7",
  panel:    "#FFFFFF",
  raised:   "#F4F2EC",
  line:     "#E5E1D8",
  faint:    "#D4CFC2",
  bone:     "#0A0908",
  cream:    "#1F1C18",
  dim:      "#6B655B",
  mute:     "#9A9389",
  rust:     "#E0451A",
  rustHi:   "#FF6B35",
  amber:    "#D97706",
  moss:     "#65A30D",
  electric: "#0891B2",
  plum:     "#9333EA",
  pink:     "#DB2777",
  red:      "#DC2626",
  backdrop: "rgba(10, 9, 8, 0.6)",
};

export const DARK = {
  ink:      "#0A0A0C",
  panel:    "#16161B",
  raised:   "#1F1F26",
  line:     "#2B2B33",
  faint:    "#3B3B45",
  bone:     "#F6F5F1",
  cream:    "#E3E0D9",
  dim:      "#928D84",
  mute:     "#6C6860",
  rust:     "#FF5A2C",
  rustHi:   "#FF7A45",
  amber:    "#F59E0B",
  moss:     "#84CC16",
  electric: "#22D3EE",
  plum:     "#A855F7",
  pink:     "#F472B6",
  red:      "#EF4444",
  backdrop: "rgba(0, 0, 0, 0.7)",
};

export const C = { ...LIGHT };

export const LS_THEME = "bttd_theme";

export function loadThemePref() {
  try {
    const saved = localStorage.getItem(LS_THEME);
    if (saved === "light" || saved === "dark") return saved;
  } catch (e) {}
  if (typeof window !== "undefined" && window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function applyThemePalette(mode) {
  const p = mode === "dark" ? DARK : LIGHT;
  Object.keys(p).forEach(k => { C[k] = p[k]; });
}

export const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";

export const FONT_DISPLAY = `"Bricolage Grotesque", -apple-system, system-ui, sans-serif`;

export const FONT_SERIF   = `"Instrument Serif", "Times New Roman", serif`;

export const FONT_MONO    = `"JetBrains Mono", ui-monospace, monospace`;

export const injectStyles = (force) => {
  if (!document.getElementById("bttd-font-link")) {
    const link = document.createElement("link");
    link.id = "bttd-font-link";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }

  let style = document.getElementById("bttd-theme");
  if (style && !force) return;
  if (!style) {
    style = document.createElement("style");
    style.id = "bttd-theme";
    document.head.appendChild(style);
  }
  style.textContent = `
    *,*::before,*::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { margin: 0; background: ${C.ink}; font-family: ${FONT_DISPLAY}; color: ${C.bone}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; transition: background 0.4s ease, color 0.4s ease; }
    input,button,textarea { font-family: inherit; }
    input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
    ::-webkit-scrollbar { display: none; }

    /* Court-line texture */
    .court-bg {
      background-image:
        radial-gradient(ellipse 80% 60% at 50% -10%, ${C.rust}10 0%, transparent 60%),
        linear-gradient(${C.line}80 1px, transparent 1px),
        linear-gradient(90deg, ${C.line}80 1px, transparent 1px);
      background-size: 100% 100%, 80px 80px, 80px 80px;
      background-position: 0 0, 0 0, 0 0;
    }

    /* Animations */
    @keyframes ease-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ease-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pulse-dot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes draw-circle { from { stroke-dashoffset: 251; } to { stroke-dashoffset: var(--target, 0); } }
    @keyframes confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
    }
    @keyframes pop {
      0% { transform: scale(0.8); opacity: 0; }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); opacity: 1; }
    }
    .pop { animation: pop 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
    @keyframes glow-pulse {
      0%, 100% { box-shadow: 0 0 0 0 currentColor; }
      50% { box-shadow: 0 0 0 8px transparent; }
    }
    @keyframes alarm-flash {
      0%, 100% { background: ${C.rust}; }
      50% { background: ${C.amber}; }
    }
    @keyframes alarm-shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
    .alarm-flash { animation: alarm-flash 0.5s ease infinite; }
    .alarm-shake { animation: alarm-shake 0.6s ease infinite; }
    @keyframes slide-down {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .slide-down { animation: slide-down 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
    @keyframes slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .slide-up { animation: slide-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }

    @keyframes celebrate-pop {
      0% { opacity: 0; transform: scale(0.6) translateY(20px); }
      60% { opacity: 1; transform: scale(1.06) translateY(0); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .celebrate-pop { animation: celebrate-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    @keyframes celebrate-emoji {
      0% { transform: scale(0.3) rotate(-18deg); }
      55% { transform: scale(1.25) rotate(10deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    .celebrate-emoji { display: inline-block; animation: celebrate-emoji 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both; }

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

    /* Modal backdrop */
    .backdrop {
      position: fixed; inset: 0; background: ${C.backdrop};
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      z-index: 200; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
  `;
  document.head.appendChild(style);
};

export const SESSIONS = [
  {
    id: "lift", code: "L", name: "Strength & Power", location: "Gym", color: C.rust,
    exercises: [
      { id: "a1", name: "Barbell Squat",      sets: 4, reps: 6,  barbell: true,    note: "Full depth" },
      { id: "a2", name: "Bench Press",        sets: 4, reps: 8,  barbell: true,    note: "Controlled descent" },
      { id: "a3", name: "Romanian Deadlift",  sets: 3, reps: 8,  barbell: true,    note: "Hinge, don't squat" },
      { id: "a4", name: "Box Jump",           sets: 4, reps: 5,  bodyweight: true, note: "Max height" },
      { id: "a5", name: "Calf Raise",         sets: 4, reps: 20,                   note: "Slow & controlled" },
    ]
  }
];

export const TABATA_CONFIG = { rounds: 8, sprintSec: 20, restSec: 10 };

export const RECOVERY = {
  // The three activities the engine reasons about.
  TYPES: {
    tabata: {
      key: "tabata", label: "Tabata", short: "Tabata", emoji: "🔥", colorKey: "moss",
      defaultDurationMin: 4, defaultRPE: 8,
      hard: true,        // counts toward intensity / overtraining load
      scheduled: true,   // the engine can recommend this
      weeklyTarget: 2,   // rolling 7-day goal
      blurb: "4-min all-out intervals",
    },
    long_interval: {
      key: "long_interval", label: "Long Interval", short: "Long Int", emoji: "⚡", colorKey: "electric",
      defaultDurationMin: 20, defaultRPE: 9,
      hard: true, scheduled: true, weeklyTarget: 1,
      blurb: "~20-min hard intervals",
    },
    game: {
      key: "game", label: "Basketball Game", short: "Game", emoji: "🏀", colorKey: "rust",
      defaultDurationMin: 44, defaultRPE: 8, // two 22-min halves
      hard: true,
      scheduled: false,  // logged as an activity, never recommended
      weeklyTarget: 0,
      blurb: "Two 22-min halves",
    },
    lift: {
      key: "lift", label: "Lift", short: "Lift", emoji: "🏋️", colorKey: "amber",
      defaultDurationMin: 50, defaultRPE: 8,
      hard: true,        // strength work taxes recovery like conditioning does
      scheduled: true,
      weeklyTarget: 2,   // rotates A → B → C
      blurb: "Strength · A/B/C",
    },
    cross_training: {
      key: "cross_training", label: "Sweat440", short: "S440", emoji: "💦", colorKey: "pink",
      defaultDurationMin: 40, defaultRPE: 8,
      hard: true,        // a full hard session, whatever the day's focus
      scheduled: false,  // class runs on its own schedule; logged, never recommended
      weeklyTarget: 0,
      blurb: "40-min class · legs / cardio / upper",
    },
    walk: {
      key: "walk", label: "Treadmill Walk", short: "Walk", emoji: "🚶", colorKey: "plum",
      defaultDurationMin: 40, defaultRPE: 3,
      hard: false,       // low intensity — active recovery, no recovery cost of its own
      scheduled: true,
      weeklyTarget: 3,   // a few a week, mostly on recovery days
      blurb: "Active recovery",
    },
  },
  // Strength day rotation.
  // A lift may share a single hard day with a Tabata (never with the brutal
  // Long Interval), so other days stay free for walks and true rest.
  pairLiftWithConditioning: true,
  // Conditioning drop order when the week is full — lowest priority first.
  DROP_ORDER: ["tabata", "long_interval"],
  // Days since the last HARD session → ramp band. 0–2 normal, 3–6 ease back in,
  // 7+ treat as a restart. (Walks don't count — they're recovery, not training.)
  LAYOFF: { normalMax: 2, easeMax: 6 },
  // Above this many missed days, the comeback session is forced to a Tabata
  // (a moderate re-entry) even inside the "ease" band.
  reentryTabataAfterDays: 5,
  // Minimum easier/rest days required after a hard session before the next
  // hard one (1 = no back-to-back hard days; next hard allowed two days later).
  minEasyDaysAfterHard: 1,
  // A basketball game depletes more — delay the next hard session this many
  // extra days beyond the normal gap.
  gameExtraRecoveryDays: 1,
  // A brutal session (RPE ≥ this) adds one more recovery day.
  brutalRPE: 9,
  // This many HARD DAYS in the trailing 7 → force a recovery day (overrides
  // weekly targets). Counts distinct days, so a paired lift+Tabata day = one.
  overtrainingHardDays: 5,
  // How many days the tentative plan looks ahead (including today).
  planDays: 3,
};

export const CONDITIONING_TYPES = ["tabata", "long_interval", "game", "cross_training"];

export const S440_CLASSES = {
  1: { name: "SWEAT440 Strength – Lower",     focus: "legs",   desc: "Legs & glutes · progressive lower-body strength" },
  2: { name: "SWEAT440 Strength – Upper",     focus: "upper",  desc: "Chest, back, shoulders & arms" },
  3: { name: "SWEAT440 Athletic Conditioning", focus: "cardio", desc: "Conditioning circuits + core" },
  4: { name: "SWEAT440 Strength – Lower",     focus: "legs",   desc: "Lower body + conditioning" },
  5: { name: "SWEAT440 Strength – Upper",     focus: "upper",  desc: "Upper body + conditioning" },
  6: { name: "SWEAT440 Hybrid – Full Body",   focus: null,     desc: "Full-body mix" },
  0: { name: "SWEAT440 Hybrid – Full Body",   focus: null,     desc: "Full-body mix" },
};

export const S440_NAME_BY_FOCUS = { legs: "SWEAT440 Strength – Lower", upper: "SWEAT440 Strength – Upper", cardio: "SWEAT440 Athletic Conditioning" };

export const LS_S440_SCHEDULE = "bttd_s440_schedule_v1";

export const focusFromClassName = (n) => !n ? null
  : /lower|leg|glute/i.test(n) ? "legs"
  : /upper|arm|chest/i.test(n) ? "upper"
  : /conditioning|cardio|core|shred/i.test(n) ? "cardio"
  : null;

export async function fetchS440Schedule() {
  try {
    const cached = JSON.parse(localStorage.getItem(LS_S440_SCHEDULE) || "null");
    if (cached && cached.byDate && Date.now() - cached.fetchedAt < 6 * 3600 * 1000) return cached;
  } catch (e) {}
  try {
    const res = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/s440-schedule`, {
      headers: { Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_KEY}`, apikey: process.env.REACT_APP_SUPABASE_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.byDate) {
      try { localStorage.setItem(LS_S440_SCHEDULE, JSON.stringify(data)); } catch (e) {}
      return data;
    }
  } catch (e) {}
  return null;
}

export const S440_FOCUS_OPTIONS = [
  { key: "legs",   label: "Legs",   emoji: "🦵", blurb: "squats & lower body" },
  { key: "cardio", label: "Cardio", emoji: "❤️", blurb: "engine work" },
  { key: "upper",  label: "Upper",  emoji: "💪", blurb: "upper body" },
];

export const s440FocusFor = (key) => S440_FOCUS_OPTIONS.find(o => o.key === key) || null;

export const SCI = {
  liRecover: "A hard interval burns through your muscles' stored fuel (glycogen) and leaves microscopic tears in the fibers. Today your body refills that fuel, patches the fibers back stronger, and quietly upgrades your heart and mitochondria. That repair IS the fitness gain — resting now is what locks it in.",
  tabataRecover: "That all-out effort flooded your muscles with metabolites and taxed your nervous system. A lighter day clears them out and lets the adaptation set in, so your next hard effort actually feels easier.",
  liftRecover: "Your muscles are still rebuilding from that lift — the 'make me stronger' signal (protein synthesis) stays switched on for a day or two. Give them the day and they come back denser and more powerful.",
  overtrain: "Stacking hard days piles up fatigue faster than your body can clear it — stress hormones like cortisol stay elevated and performance dips. A true rest day resets your nervous system so your next session is sharp, not flat.",
  walk: "An easy walk pumps fresh blood through tired muscles — flushing out waste and delivering nutrients — and nudges you into 'rest-and-digest' mode. It actually speeds recovery more than sitting still, with zero added stress.",
  targetsMet: "You've banked the week's hard work. More isn't better here — you get fitter between sessions, not during them. The recovery is part of the plan, not a break from it.",
  gameCovered: "A full game is a huge fuel-burning, high-impact load — it counts as a hard session. Let your legs bounce back before the next push.",
  liDo: "Long intervals push your aerobic ceiling: sustained hard effort grows your heart's pumping power and builds more mitochondria — the tiny engines in your cells. It's the single biggest fitness driver of your week.",
  tabata: "Short, all-out bursts drive up your VO₂ max and train your body to clear lactate fast. Just four minutes also sparks an 'afterburn' (EPOC) that keeps your metabolism elevated for hours.",
  tabataLift: "Two adaptations at once: the lift signals your muscles to build, the Tabata sharpens your engine. Pairing them onto one hard day keeps tomorrow free to recover both.",
  lift: "Lifting creates tiny tears and a 'come back stronger' signal — muscle-building stays elevated for 24–48 hours. Add a little each time and you get denser, more powerful, more explosive off the floor.",
  restart: "After time off, aerobic fitness fades first (detraining). A single Tabata wakes the system back up without overwhelming it — give it a session or two and muscle memory snaps your old capacity back fast.",
  gameDo: "Game night is your hard session — full-court running is a big conditioning and impact load. Empty the tank on the court; the engine counts it as this week's hard work and recovers you around it.",
  crossDo: "Sweat440 day — 40 minutes at class pace is a full hard session, whether it's legs, cardio, or upper. The engine counts it as today's hard work and recovers you around it.",
  preGame: "Game tomorrow — keep your legs fresh today. Show up with full glycogen stores and springy legs, not sore ones. A short walk is fine; save the intensity for the court.",
  shabbat: "It's Shabbat — your built-in rest day. Recovery is when the adaptations actually happen, so a full day off is a feature, not a gap. An easy walk is perfectly in keeping if you're already out.",
};

export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

export function addDays(d, n) { const x = startOfDay(d); x.setDate(x.getDate() + n); return x; }

export function startOfWeek(d) { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

export function dayGap(a, b) { return Math.round((startOfDay(a) - startOfDay(b)) / 86400000); }

export function isHardType(type) { return !!(RECOVERY.TYPES[type] && RECOVERY.TYPES[type].hard); }

export function agoWord(days) { return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`; }

export function fmtDur(min) {
  if (min == null) return "—";
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function fmtDurShort(min) {
  const m = Math.round(min || 0);
  if (m < 60) return `${m}m`;
  const h = m / 60;
  return `${(Math.round(h * 10) / 10).toString().replace(/\.0$/, "")}h`;
}

export function normalizeSessions(rows) {
  return (rows || [])
    .filter(r => r && RECOVERY.TYPES[r.workout_type])
    .map(r => {
      const def = RECOVERY.TYPES[r.workout_type];
      return {
        id: r.id,
        type: r.workout_type,
        date: new Date(r.completed_at),
        rpe: r.rpe != null ? Number(r.rpe) : def.defaultRPE,
        duration: r.duration_min != null ? Number(r.duration_min) : def.defaultDurationMin,
        focus: r.focus || null,
      };
    });
}

export function normalizeAll(cardioRows, workoutRows) {
  const out = normalizeSessions(cardioRows);
  (workoutRows || []).forEach(w => {
    const name = w.session_name || "";
    if (name === "Treadmill Walk") {
      out.push({
        id: "w" + w.id, type: "walk", date: new Date(w.logged_at),
        rpe: RECOVERY.TYPES.walk.defaultRPE,
        duration: (w.exercises && w.exercises[0] && w.exercises[0].duration) || RECOVERY.TYPES.walk.defaultDurationMin,
      });
    } else if (name) {
      // Any other logged workout is a strength session.
      out.push({
        id: "w" + w.id, type: "lift", date: new Date(w.logged_at),
        rpe: RECOVERY.TYPES.lift.defaultRPE, duration: RECOVERY.TYPES.lift.defaultDurationMin,
      });
    }
  });
  return out;
}

export function sessionsInTrailing(sessions, refDate, windowDays) {
  return sessions.filter(s => { const g = dayGap(refDate, s.date); return g >= 0 && g <= windowDays - 1; });
}

export function requiredGapAfter(s) {
  let gap = RECOVERY.minEasyDaysAfterHard + 1;          // normal hard → train 2 days later
  if (s.type === "game") gap += RECOVERY.gameExtraRecoveryDays;
  if (s.rpe >= RECOVERY.brutalRPE) gap += 1;            // a brutal session needs one more
  return gap;
}

export function recommend(allSessions, refDate, constraints = {}) {
  const ref = startOfDay(refDate);
  const T = RECOVERY.TYPES;
  const flags = [];

  const todays = allSessions.filter(s => dayGap(ref, s.date) === 0);
  const todaysHard = todays.filter(s => isHardType(s.type));
  const before = allSessions.filter(s => dayGap(ref, s.date) >= 1);
  const beforeHard = before.filter(s => isHardType(s.type));
  const lastBefore = before.slice().sort((a, b) => b.date - a.date)[0] || null;
  const lastHard = beforeHard.slice().sort((a, b) => b.date - a.date)[0] || null;
  const daysSinceLast = lastBefore ? dayGap(ref, lastBefore.date) : null;
  const daysSinceHard = lastHard ? dayGap(ref, lastHard.date) : null;

  const t7 = sessionsInTrailing(allSessions, ref, 7);
  // Overtraining is judged on hard DAYS, so a paired lift+Tabata day counts once.
  const hardDays7 = new Set(t7.filter(s => isHardType(s.type)).map(s => startOfDay(s.date).getTime())).size;

  const done = {
    long_interval: t7.filter(s => s.type === "long_interval").length,
    tabata: t7.filter(s => s.type === "tabata").length,
    lift: t7.filter(s => s.type === "lift").length,
    walk: t7.filter(s => s.type === "walk").length,
    game: t7.filter(s => s.type === "game").length,
    cross_training: t7.filter(s => s.type === "cross_training").length,
    // Cardio-focused classes count as conditioning; legs/upper count as lifting.
    cross_cardio: t7.filter(s => s.type === "cross_training" && s.focus === "cardio").length,
  };

  // Ramp band is driven by hard-training recency (walks don't count).
  let band;
  if (daysSinceHard === null) band = "fresh";
  else if (daysSinceHard <= RECOVERY.LAYOFF.normalMax) band = "normal";
  else if (daysSinceHard <= RECOVERY.LAYOFF.easeMax) band = "ease";
  else band = "restart";

  const mk = (action, items, reason, science = "") => ({ action, items, type: items[0] ? items[0].type : null, reason, science, band, flags, daysSinceLast, daysSinceHard });
  const rest = (reason, science) => mk("rest", [], reason, science);

  const walkOwed = done.walk < T.walk.weeklyTarget && !todays.some(s => s.type === "walk");

  // On a non-hard day, an owed walk is the active-recovery pick; else rest.
  const recoveryDay = (why, restSci) => walkOwed
    ? mk("train", [{ type: "walk" }], `${why} An easy walk is ideal active recovery (${done.walk}/${T.walk.weeklyTarget} over the last 7 days).`, SCI.walk)
    : rest(`${why} You're recovered and on track — take it easy.`, restSci);

  // Which "still recovering" note fits the last hard session?
  const recoverSci = (type) => type === "long_interval" ? SCI.liRecover : type === "lift" || type === "cross_training" ? SCI.liftRecover : type === "game" ? SCI.gameCovered : SCI.tabataRecover;

  // Weekly conditioning targets, reduced by any games played (lowest priority first).
  let targetTab = T.tabata.weeklyTarget, targetLI = T.long_interval.weeklyTarget, off = done.game + done.cross_cardio;
  const ct = Math.min(targetTab, off); targetTab -= ct; off -= ct;
  const cl = Math.min(targetLI, off); targetLI -= cl; off -= cl;
  const owedLI = Math.max(0, targetLI - done.long_interval);
  const owedTab = Math.max(0, targetTab - done.tabata);
  // Legs/upper Sweat440 classes fill lift slots; cardio-focused ones counted above.
  const owedLift = Math.max(0, T.lift.weeklyTarget - done.lift - (done.cross_training - done.cross_cardio));
  const canRampHard = band !== "restart" && band !== "fresh" && !(band === "ease" && daysSinceHard >= RECOVERY.reentryTabataAfterDays);

  // Fixed weekly schedule (Shabbat, game night) — these override training.
  const dow = ref.getDay();
  const gameOn = (d) => constraints.gameDow != null && d.getDay() === constraints.gameDow
    && constraints.skipGameWeekStart !== startOfWeek(d).getTime();
  const isShabbat = (constraints.restDows || []).includes(dow);
  const gameToday = gameOn(ref) && !todays.some(s => s.type === "game");
  const gameTomorrow = gameOn(addDays(ref, 1));
  const classToday = (constraints.classDows || []).includes(dow) && !todays.some(s => s.type === "cross_training");

  // 1) Already trained hard today — don't stack a second hard day...
  if (todaysHard.length) {
    if (daysSinceHard === 1) flags.push("Two hard days in a row — keep tomorrow easy.");
    // ...but a lift may pair with today's Tabata while you're already warm.
    const didTabataToday = todays.some(s => s.type === "tabata");
    const didLiftToday = todays.some(s => s.type === "lift");
    if (RECOVERY.pairLiftWithConditioning && didTabataToday && !didLiftToday && owedLift > 0 && canRampHard) {
      return mk("train", [{ type: "lift" }], `Tabata's done — pair a Lift with it while you're warm (${done.lift}/${T.lift.weeklyTarget} lifts over the last 7 days).`, SCI.lift);
    }
    return recoveryDay(`${T[todaysHard[0].type].label} already done today — let it absorb.`, recoverSci(todaysHard[0].type));
  }

  // Fixed events first — they override the training plan.
  if (gameToday) {
    if (daysSinceHard === 1) flags.push("Game lands on a hard day — take it a touch easier out there.");
    return mk("train", [{ type: "game" }], "Game night 🏀 — that's your hard session. Leave it all on the court.", SCI.gameDo);
  }
  if (isShabbat) {
    return recoveryDay("It's Shabbat — your scheduled rest day, no hard training.", SCI.shabbat);
  }
  if (classToday) {
    if (daysSinceHard === 1) flags.push("Class lands the day after a hard session — pace yourself in there.");
    return mk("train", [{ type: "cross_training" }], `Sweat440 day 💦 — ${S440_CLASSES[dow] ? S440_CLASSES[dow].name.replace("SWEAT440 ", "") : "class"} is today's hard session.`, SCI.crossDo);
  }
  if (gameTomorrow) {
    return recoveryDay("Game tomorrow — keep your legs fresh today.", SCI.preGame);
  }

  // 2) Overtraining guard — too many hard days lately overrides weekly targets.
  if (hardDays7 >= RECOVERY.overtrainingHardDays) {
    return recoveryDay(`${hardDays7} hard days in the last 7 — ease off the intensity, targets can wait.`, SCI.overtrain);
  }

  // 3) Spacing — keep hard days apart (games/brutal sessions need longer).
  if (lastHard && daysSinceHard < requiredGapAfter(lastHard)) {
    const why = lastHard.type === "game"
      ? `Hard game ${agoWord(daysSinceHard)} still counts as load.`
      : `Hard ${T[lastHard.type].short} ${agoWord(daysSinceHard)} — space the hard days out.`;
    return recoveryDay(why, recoverSci(lastHard.type));
  }

  // ── Eligible hard day. Layoff ramp first: ease a returning athlete in. ──
  if (band === "restart" || band === "fresh") {
    return mk("train", [{ type: "tabata" }], band === "fresh"
      ? "First session in — start with a Tabata to set a baseline."
      : `It's been ${daysSinceHard} days since real training — restart with a single Tabata. Give it a session or two to feel normal.`, SCI.restart);
  }
  if (band === "ease" && daysSinceHard >= RECOVERY.reentryTabataAfterDays) {
    return mk("train", [{ type: "tabata" }], `${daysSinceHard} days off the hard stuff — ease back with a Tabata before more.`, SCI.restart);
  }

  // Pick the conditioning primary by priority (Long Interval is the marquee).
  const primary = owedLI > 0 ? "long_interval" : owedTab > 0 ? "tabata" : null;

  if (primary === "long_interval") {
    return mk("train", [{ type: "long_interval" }], `Long Interval owed (${done.long_interval}/${targetLI}) and you're recovered — the week's marquee session.`, SCI.liDo);
  }
  if (primary === "tabata") {
    // Pair a lift onto the Tabata day (never onto the brutal Long Interval).
    if (RECOVERY.pairLiftWithConditioning && owedLift > 0) {
      return mk("train", [{ type: "tabata" }, { type: "lift" }],
        `Tabata + Lift — pair them today, then recover tomorrow (Tabata ${done.tabata}/${targetTab}, lifts ${done.lift}/${T.lift.weeklyTarget}).`, SCI.tabataLift);
    }
    return mk("train", [{ type: "tabata" }], `Tabata owed (${done.tabata}/${targetTab}) and you're recovered — quick and hard.`, SCI.tabata);
  }
  // No conditioning owed — get a lift in on its own if one's still owed.
  if (owedLift > 0) {
    return mk("train", [{ type: "lift" }], `Lift owed (${done.lift}/${T.lift.weeklyTarget}) and you're recovered — go move some weight.`, SCI.lift);
  }
  // Everything's met → recovery day.
  if (done.game > 0) return recoveryDay("A game in the last 7 days already counts toward your hard sessions.", SCI.gameCovered);
  return recoveryDay("Weekly targets met (2 Tabata · 1 Long Interval · 2 lifts).", SCI.targetsMet);
}

export function buildPlan(allSessions, fromDate, nDays, constraints = {}) {
  const work = allSessions.slice();
  const out = [];
  for (let i = 0; i < nDays; i++) {
    const day = addDays(fromDate, i);
    const r = recommend(work, day, constraints);
    out.push({ date: day, ...r });
    (r.items || []).forEach(it => {
      const def = RECOVERY.TYPES[it.type];
      work.push({ type: it.type, code: it.code, date: day, rpe: def.defaultRPE, duration: def.defaultDurationMin, planned: true });
    });
  }
  return out;
}

export function trailingSummary(allSessions, refDate, windowDays) {
  const t = sessionsInTrailing(allSessions, refDate, windowDays);
  return {
    count: t.length,
    hard: t.filter(s => isHardType(s.type)).length,
    minutes: t.reduce((a, s) => a + (s.duration || 0), 0),
    crossCardio: t.filter(s => s.type === "cross_training" && s.focus === "cardio").length,
    byType: {
      tabata: t.filter(s => s.type === "tabata").length,
      long_interval: t.filter(s => s.type === "long_interval").length,
      game: t.filter(s => s.type === "game").length,
      lift: t.filter(s => s.type === "lift").length,
      walk: t.filter(s => s.type === "walk").length,
      cross_training: t.filter(s => s.type === "cross_training").length,
    },
  };
}

export function streakInfo(allSessions, refDate) {
  const days = new Set(allSessions.map(s => startOfDay(s.date).getTime()));
  let streak = 0;
  for (let i = 0; ; i++) {
    const key = addDays(refDate, -i).getTime();
    if (days.has(key)) streak++;
    else if (i === 0) continue; // today not logged yet still keeps the streak live
    else break;
  }
  let layoff = null;
  for (let i = 0; i < 120; i++) {
    if (days.has(addDays(refDate, -i).getTime())) { layoff = i; break; }
  }
  return { streak, layoff };
}

export function weightProjection(weightLog, goal = 200) {
  const pts = [...(weightLog || [])]
    .map(w => ({ t: new Date(w.logged_at).getTime(), w: Number(w.weight) }))
    .filter(p => p.w > 0)
    .sort((a, b) => a.t - b.t);
  const cutoff = Date.now() - 60 * 86400000;
  const recent = pts.filter(p => p.t >= cutoff);
  const use = recent.length >= 3 ? recent : pts;
  if (use.length < 3) return null;
  if ((use[use.length - 1].t - use[0].t) / 86400000 < 14) return null; // too little spread to trust a slope
  const n = use.length;
  const mt = use.reduce((a, p) => a + p.t, 0) / n;
  const mw = use.reduce((a, p) => a + p.w, 0) / n;
  let num = 0, den = 0;
  use.forEach(p => { num += (p.t - mt) * (p.w - mw); den += (p.t - mt) * (p.t - mt); });
  if (!den) return null;
  const perDay = (num / den) * 86400000;
  const weekly = perDay * 7;
  const cur = use[use.length - 1].w;
  if (cur <= goal) return { weekly, done: true };
  if (weekly >= -0.1) return { weekly, stalled: true };
  const days = (cur - goal) / -perDay;
  if (days > 550) return { weekly, stalled: true }; // over ~18 months out isn't a projection, it's noise
  return { weekly, eta: new Date(Date.now() + days * 86400000) };
}

export function fatigueSignal(allSessions, refDate) {
  const recent = sessionsInTrailing(allSessions, refDate, 10).filter(s => isHardType(s.type) && !s.planned);
  if (recent.length < 3) return null;
  const deltas = [];
  for (const s of recent) {
    const base = allSessions.filter(b => b.type === s.type && !b.planned && dayGap(s.date, b.date) > 0 && dayGap(s.date, b.date) <= 60);
    if (base.length >= 2) deltas.push(s.rpe - base.reduce((a, b) => a + b.rpe, 0) / base.length);
  }
  if (deltas.length < 3) return null;
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return avg >= 0.7 ? { delta: avg, n: deltas.length } : null;
}

export const XP_BASE = { tabata: 40, long_interval: 90, game: 120, lift: 70, walk: 20, cross_training: 80 };

export function sessionXP(s) {
  const base = XP_BASE[s.type] || 0;
  const bonus = (s.rpe && s.type !== "walk") ? Math.max(0, s.rpe - 5) * 5 : 0;
  return base + bonus;
}

export function levelInfo(totalXP) {
  let level = 1, need = 100, acc = 0;
  while (totalXP >= acc + need) { acc += need; level++; need = 100 + (level - 1) * 60; }
  return { level, into: totalXP - acc, span: need, progress: (totalXP - acc) / need, total: totalXP };
}

export const RANKS = [
  [1, "Walk-On"], [3, "Rookie"], [6, "Starter"], [10, "Sixth Man"],
  [15, "Hooper"], [22, "Veteran"], [30, "All-Star"], [42, "Franchise"], [60, "Legend"],
];

export function rankFor(level) {
  let r = RANKS[0][1];
  for (const [lvl, name] of RANKS) if (level >= lvl) r = name;
  return r;
}

export const ACHIEVEMENTS = [
  { id: "first",    emoji: "🌱", name: "First Rep",       desc: "Log your very first session", goal: 1,   val: s => s.totalSessions },
  { id: "ten",      emoji: "💪", name: "Perfect 10",      desc: "10 sessions logged",          goal: 10,  val: s => s.totalSessions },
  { id: "fifty",    emoji: "⚙️", name: "Grinder",         desc: "50 sessions logged",          goal: 50,  val: s => s.totalSessions },
  { id: "century",  emoji: "💯", name: "Century Club",    desc: "100 sessions logged",         goal: 100, val: s => s.totalSessions },
  { id: "streak3",  emoji: "✨", name: "Hat Trick",       desc: "3 days in a row",             goal: 3,   val: s => s.bestStreak },
  { id: "streak7",  emoji: "🔥", name: "Week Warrior",    desc: "7-day streak",                goal: 7,   val: s => s.bestStreak },
  { id: "streak14", emoji: "🌋", name: "Unstoppable",     desc: "14-day streak",               goal: 14,  val: s => s.bestStreak },
  { id: "streak30", emoji: "🏆", name: "Iron Will",       desc: "30-day streak",               goal: 30,  val: s => s.bestStreak },
  { id: "tab10",    emoji: "⚡", name: "Tabata Ten",      desc: "10 Tabatas done",             goal: 10,  val: s => s.byType.tabata },
  { id: "li5",      emoji: "🌀", name: "Long Hauler",     desc: "5 Long Intervals",            goal: 5,   val: s => s.byType.long_interval },
  { id: "lift25",   emoji: "🏋️", name: "Iron Paradise",   desc: "25 lifts",                    goal: 25,  val: s => s.byType.lift },
  { id: "game1",    emoji: "🏀", name: "Baller",          desc: "Play a game",                 goal: 1,   val: s => s.byType.game },
  { id: "game10",   emoji: "🔟", name: "Run It Back",     desc: "10 games played",             goal: 10,  val: s => s.byType.game },
  { id: "walk20",   emoji: "🚶", name: "Active Recovery", desc: "20 recovery walks",           goal: 20,  val: s => s.byType.walk },
  { id: "cross10",  emoji: "💦", name: "Class Act",       desc: "10 Sweat440 classes",         goal: 10,  val: s => s.byType.cross_training },
  { id: "eng85",    emoji: "🚗", name: "Tuned Up",        desc: "Engine score 85",             goal: 85,  val: s => s.enginePeak },
  { id: "eng95",    emoji: "🏎️", name: "New Redline",     desc: "Reach Engine 95", goal: 95, val: s => s.enginePeak },
  { id: "eng100",   emoji: "💯", name: "Century Motor",   desc: "Engine score 100",            goal: 100, val: s => s.enginePeak },
  { id: "eng110",   emoji: "🏁", name: "Game-Ready",      desc: "Reach Engine 110", goal: 110, val: s => s.enginePeak },
  { id: "early",    emoji: "🌅", name: "Early Bird",      desc: "Train before 7am",            goal: 1,   val: s => (s.earlyBird ? 1 : 0) },
  { id: "night",    emoji: "🌙", name: "Night Owl",       desc: "Train after 9pm",             goal: 1,   val: s => (s.nightOwl ? 1 : 0) },
  { id: "comeback", emoji: "🔄", name: "Comeback Kid",    desc: "Train after a 7+ day break",  goal: 1,   val: s => (s.comeback ? 1 : 0) },
  { id: "days30",   emoji: "📅", name: "Regular",         desc: "Train on 30 different days",   goal: 30,  val: s => s.activeDays },
  { id: "days100",  emoji: "🗓️", name: "Lifestyle",       desc: "Train on 100 different days",  goal: 100, val: s => s.activeDays },
  { id: "lost5",    emoji: "📉", name: "Down 5",          desc: "Drop 5 lbs",                  goal: 5,   val: s => s.weightLost },
  { id: "lost15",   emoji: "🎯", name: "Down 15",         desc: "Drop 15 lbs",                 goal: 15,  val: s => s.weightLost },
  { id: "lost25",   emoji: "👑", name: "Goal Weight",     desc: "Drop 25 lbs", goal: 25, val: s => s.weightLost },
];

export function computeGameState(history, cardioSessions, weightLog) {
  const all = normalizeAll(cardioSessions, history);
  const today = startOfDay(new Date());
  const sessionXPTotal = all.reduce((a, s) => a + sessionXP(s), 0);
  const totalXP = sessionXPTotal + (weightLog ? weightLog.length * 15 : 0);
  const lvl = levelInfo(totalXP);

  // Best historical streak from distinct active days.
  const dayTimes = [...new Set(all.map(s => startOfDay(s.date).getTime()))].sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  for (const t of dayTimes) { run = (prev != null && dayGap(new Date(t), new Date(prev)) === 1) ? run + 1 : 1; best = Math.max(best, run); prev = t; }
  const { streak } = streakInfo(all, today);

  // Sorted by time for comeback detection.
  const sorted = all.slice().sort((a, b) => a.date - b.date);
  let comeback = false;
  for (let i = 1; i < sorted.length; i++) if (dayGap(sorted[i].date, sorted[i - 1].date) >= 7) { comeback = true; break; }

  const startW = 225, curW = (weightLog && weightLog[0] && weightLog[0].weight) || startW;

  const stats = {
    totalSessions: all.length,
    byType: {
      tabata: all.filter(s => s.type === "tabata").length,
      long_interval: all.filter(s => s.type === "long_interval").length,
      game: all.filter(s => s.type === "game").length,
      lift: all.filter(s => s.type === "lift").length,
      walk: all.filter(s => s.type === "walk").length,
      cross_training: all.filter(s => s.type === "cross_training").length,
    },
    enginePeak: Math.round(engineModel(all).peak),
    bestStreak: best, currentStreak: streak,
    earlyBird: all.some(s => s.date.getHours() < 7),
    nightOwl: all.some(s => s.date.getHours() >= 21),
    comeback,
    weightLost: Math.max(0, startW - curW),
    activeDays: dayTimes.length,
    level: lvl.level,
  };

  const achievements = ACHIEVEMENTS.map(a => {
    const value = a.val(stats);
    return { ...a, value, unlocked: value >= a.goal, progress: Math.max(0, Math.min(1, value / a.goal)) };
  });

  return {
    totalXP, ...lvl, rank: rankFor(lvl.level),
    stats, achievements,
    unlockedCount: achievements.filter(a => a.unlocked).length,
  };
}

export const LS_GAME = "bttd_game_seen";

export const LS_SCHEDULE = "bttd_schedule";

export const DEFAULT_SCHEDULE = { shabbat: true, gameNight: true, gameDow: 4, skipGameWeek: null, crossClass: false, classDows: [1, 3, 5] };

export const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const PHASES = [
  { weeks: "01—04", color: C.rust,     weight: "225 → 218", focus: "Build the habit. Nail form. Ease in.",         goals: ["2× gym/week", "1× cardio/week", "Sleep 7+ hrs", "Cut late-night eating"] },
  { weeks: "05—08", color: C.amber,    weight: "218 → 212", focus: "Add intensity. Move more.",                    goals: ["Progress the weights", "Add interval cardio", "Drop processed meals", "Hit protein daily"] },
  { weeks: "09—12", color: C.moss,     weight: "212 → 206", focus: "Peak conditioning. Build real strength.",      goals: ["Push compound lifts", "3 sessions/week", "Nutrition locked", "Conditioning every week"] },
  { weeks: "13—16", color: C.plum,     weight: "206 → 200", focus: "Lock it in. Set a new baseline.",              goals: ["Test your strength", "Hit goal weight", "Progress photos", "Plan the next cycle"] },
];

export const WORK_QUOTES = [
  ["Hard work beats talent when talent doesn't work hard.", "TIM NOTKE"],
  ["Discipline is choosing what you want most over what you want now.", "ABRAHAM LINCOLN"],
  ["Don't count the days. Make the days count.", "MUHAMMAD ALI"],
  ["Suffer the pain of discipline or suffer the pain of regret.", "JIM ROHN"],
  ["Every rep is a vote for the person you're becoming.", "THE WORK"],
  ["Fall in love with the process and the results will come.", "ERIC THOMAS"],
  ["Pressure is a privilege.", "BILLIE JEAN KING"],
  ["You don't have to be great to start — you have to start to be great.", "ZIG ZIGLAR"],
  ["The only bad workout is the one that didn't happen.", "THE WORK"],
  ["Consistency is the cheat code.", "THE WORK"],
  ["Be stronger than your excuses.", "THE WORK"],
  ["The body achieves what the mind believes.", "THE WORK"],
  ["Show up on the days you don't feel like it. That's the whole game.", "THE WORK"],
  ["You're one workout away from a good mood.", "THE WORK"],
  ["Everybody wants to be a beast — until it's time to do what beasts do.", "ERIC THOMAS"],
  ["Take care of your body. It's the only place you have to live.", "JIM ROHN"],
  ["Strength does not come from winning. Your struggles develop your strength.", "ARNOLD SCHWARZENEGGER"],
  ["The successful warrior is the average person, with laser-like focus.", "BRUCE LEE"],
  ["Today's effort is tomorrow's strength.", "THE WORK"],
  ["Discipline equals freedom.", "JOCKO WILLINK"],
];

export function quoteOfDay() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - startOfYear) / 86400000);
  return WORK_QUOTES[dayOfYear % WORK_QUOTES.length];
}

export const PRE_WORKOUT_FOODS = [
  { name: "Banana + 2 tbsp peanut butter",   protein: 8,  calories: 295, timing: "30–60 min before", note: "Quick carbs + sustained energy. Classic." },
  { name: "Greek yogurt + honey + berries",   protein: 18, calories: 220, timing: "60 min before",    note: "Fage 2% or Chobani. Pareve-friendly w/ coconut yogurt." },
  { name: "Oatmeal + whey + cinnamon",        protein: 28, calories: 380, timing: "60–90 min before", note: "Slow carbs. Fuels heavy lifts." },
  { name: "Bagel + cream cheese + lox",       protein: 22, calories: 420, timing: "90 min before",    note: "Carbs, protein, salt. Heavy day fuel." },
  { name: "Rice cakes + almond butter",       protein: 7,  calories: 200, timing: "30 min before",    note: "Fast carbs, light on stomach." },
  { name: "Quest bar (any flavor)",           protein: 21, calories: 190, timing: "30–45 min before", note: "OU certified. Toss in gym bag." },
  { name: "Black coffee + dates",             protein: 1,  calories: 140, timing: "20 min before",    note: "Caffeine + glucose. Fasted lift hack." },
];

export const POST_WORKOUT_FOODS = [
  { name: "Fairlife Core Power 42g shake",    protein: 42, calories: 230, timing: "Within 30 min", note: "OU-D certified. Best on-the-go option. Drink one." },
  { name: "Whey isolate shake (Optimum/Now)", protein: 30, calories: 140, timing: "Within 30 min", note: "OU-D. Mix with water or milk." },
  { name: "Grilled chicken + rice + veg",     protein: 45, calories: 520, timing: "Within 90 min", note: "The classic. Bumps recovery hard." },
  { name: "Salmon + sweet potato",            protein: 35, calories: 480, timing: "Within 90 min", note: "Omega-3s + carbs. Inflammation fighter." },
  { name: "Cottage cheese + pineapple",       protein: 25, calories: 240, timing: "Within 60 min", note: "Casein digests slow. Great before bed too." },
  { name: "3 eggs + toast + avocado",         protein: 21, calories: 420, timing: "Within 60 min", note: "Cheap, fast, complete protein." },
  { name: "Tuna pouch + crackers",            protein: 25, calories: 250, timing: "Within 60 min", note: "Gym bag staple. StarKist/Bumble Bee OU." },
  { name: "Turkey roll-ups + hummus",         protein: 22, calories: 280, timing: "Within 60 min", note: "Empire kosher turkey. Pareve hummus." },
];

export const ANYTIME_PROTEIN = [
  { name: "Fairlife Core Power Elite (42g)",  protein: 42, calories: 230, note: "OU-D. Lactose-free. King of shelf-stable." },
  { name: "Fairlife Core Power (26g)",        protein: 26, calories: 170, note: "OU-D. Smaller, cheaper." },
  { name: "Quest Bar",                         protein: 21, calories: 190, note: "OU. Low sugar." },
  { name: "Built Bar",                         protein: 17, calories: 130, note: "OU. Tastes like candy." },
  { name: "ONE Bar",                           protein: 20, calories: 220, note: "OU-D." },
  { name: "Owyn vegan shake (20g)",            protein: 20, calories: 180, note: "OU pareve. Dairy-free option." },
  { name: "Premier Protein shake (30g)",       protein: 30, calories: 160, note: "OU-D." },
  { name: "Greek yogurt cup (Fage 0%)",        protein: 18, calories: 100, note: "OU-D." },
  { name: "Hard-boiled eggs (2)",              protein: 12, calories: 140, note: "Cheapest protein." },
  { name: "Beef jerky (Jack Link's Original)", protein: 12, calories: 80,  note: "OU. Note: not all flavors certified." },
];

export const PRE_WORKOUT_MEALS = [
  {
    name: "The Pre-Lift Power Bowl",
    timing: "60–90 min before",
    totalProtein: 42, calories: 520,
    components: [
      "1 cup oatmeal (cooked w/ water)",
      "1 scoop whey isolate (vanilla)",
      "1 banana sliced on top",
      "1 tbsp almond butter, cinnamon, drizzle of honey",
    ],
    why: "Slow carbs (oats) + complete protein (whey) + quick fuel (banana). Sustains heavy compound lifts for 60–90 min.",
    bestFor: "Strength + Power day · Full Body Circuit",
  },
  {
    name: "Bagel & Lox Stack",
    timing: "90 min before",
    totalProtein: 38, calories: 580,
    components: [
      "1 whole wheat bagel, toasted",
      "3 oz smoked salmon (lox)",
      "2 tbsp whipped cream cheese",
      "Sliced tomato, red onion, capers",
      "8 oz orange juice",
    ],
    why: "Heavy day fuel — carbs from bagel + OJ, complete protein + omegas from lox. Sodium helps the pump.",
    bestFor: "Heavy squat or deadlift day",
  },
  {
    name: "Greek Yogurt Parfait + Eggs",
    timing: "60 min before",
    totalProtein: 35, calories: 420,
    components: [
      "1 cup Fage 2% Greek yogurt",
      "2 hard-boiled eggs",
      "½ cup granola (Bear Naked or KIND, OU)",
      "Handful of berries + honey",
    ],
    why: "Pareve-flexible. Combines fast (whey in yogurt) and slower (eggs, granola) protein for steady energy.",
    bestFor: "Conditioning + cardio day",
  },
  {
    name: "Tuna Pita + Banana",
    timing: "45–60 min before",
    totalProtein: 32, calories: 410,
    components: [
      "1 whole wheat pita",
      "1 pouch tuna (StarKist OU)",
      "1 tbsp olive oil mayo, lettuce, tomato",
      "1 banana on the side",
    ],
    why: "Lean protein + complex carbs. Sits light, no dairy bloat for cardio work.",
    bestFor: "Conditioning + cardio · long sessions",
  },
  {
    name: "Quick Coffee + Quest Stack",
    timing: "20–30 min before",
    totalProtein: 25, calories: 280,
    components: [
      "1 Quest bar (chocolate chip cookie dough)",
      "Black coffee or espresso",
      "2 Medjool dates",
    ],
    why: "Minimal prep, gym-bag friendly. Caffeine + dates = fast energy. Quest bar handles protein.",
    bestFor: "Early-morning lift · short notice",
  },
  {
    name: "PB&J + Protein Shake (Old Reliable)",
    timing: "45–60 min before",
    totalProtein: 35, calories: 510,
    components: [
      "2 slices whole grain bread",
      "2 tbsp natural peanut butter",
      "1 tbsp jelly",
      "1 Fairlife Core Power 26g shake",
    ],
    why: "The classic. Quick to throw together at 6am. Carbs, fats, complete protein in 5 minutes.",
    bestFor: "Any session · busy mornings",
  },
];

export const POST_WORKOUT_MEALS = [
  {
    name: "The Recovery Plate (chicken & rice)",
    timing: "Within 60–90 min",
    totalProtein: 55, calories: 680,
    components: [
      "8 oz grilled chicken breast",
      "1 cup white or jasmine rice",
      "Roasted broccoli + olive oil",
      "Lemon, garlic, herbs",
    ],
    why: "The legendary post-lift meal. High leucine for muscle protein synthesis + carbs to replenish glycogen.",
    bestFor: "Strength + Power day · max recovery",
  },
  {
    name: "Salmon + Sweet Potato Fix",
    timing: "Within 90 min",
    totalProtein: 42, calories: 590,
    components: [
      "6 oz baked salmon",
      "1 large baked sweet potato",
      "Sautéed spinach with garlic",
      "Drizzle of olive oil + sea salt",
    ],
    why: "Omega-3s reduce inflammation from heavy lifting. Sweet potato refills glycogen without spiking insulin hard.",
    bestFor: "Heavy leg day · joint recovery",
  },
  {
    name: "Fairlife Shake + Real Food Combo",
    timing: "Shake within 30 min, meal within 90",
    totalProtein: 60, calories: 620,
    components: [
      "1 Fairlife Core Power 42g (right after lift)",
      "Then 90 min later: 2 cups pasta with marinara",
      "+ 4 oz ground turkey or beef",
      "+ side salad with vinaigrette",
    ],
    why: "Two-stage recovery. Fast-acting whey shuts down catabolism immediately, real meal does the rebuild work.",
    bestFor: "Hardest sessions · double protein hit",
  },
  {
    name: "Steak Tacos (Carne Asada Style)",
    timing: "Within 90 min",
    totalProtein: 48, calories: 720,
    components: [
      "5 oz flank or skirt steak (kosher cut)",
      "3 corn tortillas",
      "Black beans (½ cup)",
      "Pico de gallo, avocado, cilantro, lime",
    ],
    why: "Complete protein + iron from red meat. Carbs from tortillas + beans. Fights post-lift fatigue.",
    bestFor: "Heavy pull day · weekend lift",
  },
  {
    name: "Big Breakfast for Dinner",
    timing: "Within 60 min",
    totalProtein: 45, calories: 640,
    components: [
      "4 large eggs + 2 egg whites scrambled",
      "2 slices sourdough toast",
      "½ avocado",
      "1 cup berries + Greek yogurt on side",
    ],
    why: "Cheap, fast, dense. All complete proteins. Works as legit dinner if you trained in the evening.",
    bestFor: "Late-night lifts · simple meal prep",
  },
  {
    name: "Cottage Cheese Power Bowl",
    timing: "Within 60 min · also pre-bed",
    totalProtein: 38, calories: 460,
    components: [
      "1.5 cups cottage cheese (Friendship OU-D)",
      "½ cup pineapple chunks",
      "Handful of granola",
      "1 tbsp honey + cinnamon",
    ],
    why: "Casein in cottage cheese digests slow — feeds muscles for 6+ hours. Doubles as a perfect pre-bed meal.",
    bestFor: "Evening workouts · before sleep",
  },
  {
    name: "Lox & Bagel Recovery (Sunday Morning)",
    timing: "Within 90 min",
    totalProtein: 35, calories: 540,
    components: [
      "1 everything bagel",
      "4 oz Nova lox",
      "2 tbsp cream cheese",
      "Capers, red onion, tomato, cucumber",
    ],
    why: "Carbs + protein + omega-3s in one nostalgic plate. Perfect after a Sunday morning lift.",
    bestFor: "Weekend cardio + lift session",
  },
  {
    name: "Turkey & Avocado Power Wrap",
    timing: "Within 60 min",
    totalProtein: 40, calories: 520,
    components: [
      "Large whole-wheat tortilla",
      "5 oz Empire turkey breast slices",
      "½ avocado, lettuce, tomato",
      "1 tbsp hummus, mustard",
      "Side: apple + handful of almonds",
    ],
    why: "Portable, no microwave needed. Lean protein + healthy fats. Easy to prep night before.",
    bestFor: "Lunch break workouts · meal-prep day",
  },
];

export const calcProteinTarget = (weightLbs) => Math.round(weightLbs * 1.0);

export const GOAL_MODES = {
  cut:      { label: "Cut",      delta: -800, blurb: "Aggressive deficit · ~1.5 lb/wk loss",   color: "rust" },
  lean:     { label: "Lean",     delta: -500, blurb: "Moderate deficit · ~1 lb/wk loss",       color: "amber" },
  maintain: { label: "Maintain", delta: 0,    blurb: "Eat to fuel · stay where you are",       color: "electric" },
  bulk:     { label: "Bulk",     delta: 400,  blurb: "Lean surplus · slow muscle gain",        color: "moss" },
};

export const calcCalorieTarget = (weightLbs, heightInches, age = 35, activityFactor = 1.55, goalDelta = 0) => {
  // Mifflin-St Jeor for males, then activity multiplier, then goal adjustment
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const tdee = bmr * activityFactor;
  return Math.max(1200, Math.round(tdee + goalDelta)); // 1200 floor for safety
};

let feedbackPreferences = {sound:true,vibration:true};
export function setFeedbackPreferences(value) { feedbackPreferences = value; }
export function vibrate(pattern) { if (feedbackPreferences.vibration && navigator.vibrate) navigator.vibrate(pattern); }
export let _audioCtx = null;

export function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

export function beep(freq, dur, vol) {
  if (!feedbackPreferences.sound) return;
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

export function ringAlarm() {
  if (!feedbackPreferences.sound) return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    // Three rising chirps + one held tone — like a real alarm
    const pattern = [
      { f: 880,  t: 0.00, d: 0.18 },
      { f: 1175, t: 0.20, d: 0.18 },
      { f: 1568, t: 0.40, d: 0.18 },
      { f: 880,  t: 0.65, d: 0.18 },
      { f: 1175, t: 0.85, d: 0.18 },
      { f: 1568, t: 1.05, d: 0.18 },
      { f: 1760, t: 1.30, d: 0.55 },
    ];
    pattern.forEach(p => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = p.f;
      gain.gain.setValueAtTime(0.0001, now + p.t);
      gain.gain.exponentialRampToValueAtTime(0.55, now + p.t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.t + p.d);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + p.t);
      osc.stop(now + p.t + p.d + 0.05);
    });
  } catch(e) {}
}

export function speak(text) {
  if (!feedbackPreferences.sound) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch(e) {}
}

export function requestNotificationPermission() {
  if (!("Notification" in window)) return Promise.resolve("unsupported");
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Promise.resolve(Notification.permission);
  }
  return Notification.requestPermission();
}

export function fireNotification(title, body) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return; // only when in another app/tab
    const n = new Notification(title, {
      body,
      icon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='80' font-size='80'>💪</text></svg>",
      tag: "bttd-timer",
      requireInteraction: false,
      silent: !feedbackPreferences.sound,
    });
    n.onclick = () => { window.focus(); n.close(); };
    setTimeout(() => n.close(), 8000);
  } catch(e) {}
}

export const VAPID_PUBLIC_KEY = "BOHVU8MxqhXzR_P_nXZtsSrBbWCxuTLv0ipCmfLR5jThhAbnpqaY_dxNwqIBAOurEDo3nGTYvtUDDtJSOSrIDHE";

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export function daysAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : d + "d ago";
}

export function calcVolume(exercises, checked, vals) {
  return exercises.reduce((v, ex) => {
    if (!checked[ex.id] || ex.noWeight || ex.timed || ex.bodyweight) return v;
    const w = ex.barbell ? 45 + (parseFloat(vals[ex.id]?.perSide) || 0) * 2 : parseFloat(vals[ex.id]?.weight) || 0;
    const s = parseInt(vals[ex.id]?.setsDone || ex.sets);
    // Use custom reps per set if available, otherwise default
    const customReps = vals[ex.id]?.customReps || {};
    let totalReps = 0;
    for (let i = 0; i < s; i++) {
      totalReps += parseFloat(customReps[i]) || parseFloat(ex.reps) || 0;
    }
    return v + w * totalReps;
  }, 0);
}

export const fmtNum = (n) => n >= 10000 ? Math.round(n/1000) + "k" : n >= 1000 ? (n/1000).toFixed(1) + "k" : n.toLocaleString();

export function calcStreak(history) {
  if (!history.length) return 0;
  const dayStrings = [...new Set(history.map(h => new Date(h.logged_at).toDateString()))];
  const today = new Date(); today.setHours(0,0,0,0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (dayStrings.includes(d.toDateString())) {
      streak++;
    } else if (i === 0) {
      // Allow yesterday to count if today has nothing yet
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function getLastWeight(history, exerciseName) {
  for (const h of history) {
    const ex = (h.exercises || []).find(e => e.name === exerciseName);
    if (ex && ex.weight > 0) return ex.weight;
  }
  return null;
}

export function getLastPerformance(history, exerciseName) {
  for (const h of history) {
    const ex = (h.exercises || []).find(e => e.name === exerciseName);
    if (ex && ex.weight > 0) {
      const logged = h.logged_at ? new Date(h.logged_at) : null;
      const daysAgo = logged ? Math.max(0, Math.floor((Date.now() - logged.getTime()) / 86400000)) : null;
      return {
        weight: ex.weight,
        reps: ex.reps,        // can be a number or "10,8,6" string
        sets: ex.sets,
        daysAgo,
      };
    }
  }
  return null;
}

export const PROGRESS_STEP = 5;

export const nextTarget = (w) => (parseFloat(w) || 0) + PROGRESS_STEP;

export function platesToReach(totalLbs) {
  const target = (parseFloat(totalLbs) || 0) - 45;
  if (target <= 0) return [];
  const perSide = target / 2;
  // Allow ~0.05 lb tolerance for floating point
  if (Math.abs(perSide - Math.round(perSide * 2) / 2) > 0.05 && perSide < 2.5) return null;
  const sizes = [45, 35, 25, 10, 5, 2.5];
  const result = [];
  let remaining = perSide;
  for (const w of sizes) {
    while (remaining >= w - 0.01) {
      result.push(w);
      remaining -= w;
    }
  }
  if (remaining > 0.05) return null; // can't make exact total with standard plates
  return result;
}

export function isPR(history, exerciseName, weight) {
  if (!weight || weight <= 0) return false;
  let max = 0;
  for (const h of history) {
    for (const ex of (h.exercises || [])) {
      if (ex.name === exerciseName && ex.weight > max) max = ex.weight;
    }
  }
  return weight > max;
}

export function thisWeekRange() {
  const start = new Date(); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  return { start, end };
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late session";
}

export const LS_BODY = "bttd_body_stats";

export const LS_PROTEIN = "bttd_protein_log_v1";

export const LS_CALORIES = "bttd_calorie_log_v1";

export const LS_VITAMIN_D3 = "bttd_vitamin_d3_log_v1";

export const LS_CREATINE = "bttd_creatine_log_v1";

export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekKeysMonday() {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7; // 0=Sun → 6, 1=Mon → 0, ...
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    keys.push(dateKey(d));
  }
  return keys;
}

export const LS_GAME_LEGS = "bttd_game_legs_v1";

export const LEGS_OPTIONS = [
  { key: "gassed", emoji: "💨", label: "Gassed", colorKey: "red" },
  { key: "okay",   emoji: "😮‍💨", label: "Okay",   colorKey: "amber" },
  { key: "strong", emoji: "💪", label: "Strong", colorKey: "moss" },
];

export function dayKeyAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function calcSupplementStreak(log) {
  const start = log[dayKeyAgo(0)] ? 0 : 1;
  let streak = 0;
  for (let i = start; ; i++) {
    if (log[dayKeyAgo(i)]) streak++;
    else break;
  }
  return streak;
}

export const ENGINE_TAU = 42;

export function engineLoadOf(s) {
  if (s.type === "walk") return (s.duration || 0) * 0.5 * (s.rpe || 3);
  if (s.type === "cross_training") return s.focus === "cardio" ? (s.duration || 0) * (s.rpe || 8) : 0;
  if (s.type === "tabata" || s.type === "long_interval" || s.type === "game") return (s.duration || 0) * (s.rpe || 8);
  return 0;
}

export function engineModel(all, asOf = new Date()) {
  const sessions = all.map(s => ({ s, day: startOfDay(s.date).getTime(), load: engineLoadOf(s) }))
    .filter(x => x.load > 0).sort((a, b) => a.day - b.day);
  if (!sessions.length) return { score: 0, weekPct: null, bumps: [], series: [], peak: 0, peakDay: null, fedStreak: 0 };
  const today = startOfDay(asOf);
  let F = 0, i = 0;
  const daily = new Map();
  const fedDays = new Set();
  const bumps = [];
  const series = [];
  for (let d = new Date(sessions[0].day); d.getTime() <= today.getTime(); d = addDays(d, 1)) {
    const t = d.getTime();
    F *= 1 - 1 / ENGINE_TAU;
    while (i < sessions.length && sessions[i].day === t) {
      const dF = sessions[i].load / ENGINE_TAU;
      bumps.push({ s: sessions[i].s, day: t, pct: F > 0 ? (dF / F) * 100 : 100 });
      F += dF; fedDays.add(t); i++;
    }
    daily.set(t, F);
    series.push({ t, F });
  }
  const weekAgo = daily.get(addDays(today, -7).getTime());
  const weekPct = weekAgo > 0 ? ((F - weekAgo) / weekAgo) * 100 : null;
  // All-time high, and how many consecutive days the engine has been fed
  // (today not yet fed doesn't break the streak until tomorrow).
  let peak = 0, peakDay = null;
  series.forEach(p => { if (p.F > peak) { peak = p.F; peakDay = p.t; } });
  let fedStreak = 0;
  for (let k = fedDays.has(today.getTime()) ? 0 : 1; ; k++) {
    if (fedDays.has(addDays(today, -k).getTime())) fedStreak++;
    else break;
  }
  return { score: F, weekPct, bumps, series, peak, peakDay, fedStreak };
}

export const engineBumpPreview = (score, mins, rpe = 9) =>
  score > 0 ? ((mins * rpe) / ENGINE_TAU / score) * 100 : 0;
