import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

const LIGHT = {
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
  red:      "#DC2626",
  backdrop: "rgba(10, 9, 8, 0.6)",
};

// Dark "court" mode — deep OLED-friendly black, surfaces lift toward charcoal,
// text flips to bone/cream lights, accents brighten so they pop on black.
const DARK = {
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
  red:      "#EF4444",
  backdrop: "rgba(0, 0, 0, 0.7)",
};

// Live palette object — referenced directly in inline styles throughout the app.
// applyThemePalette() mutates these keys in place so a top-level re-render recomputes
// every inline style against the new values (no component is memoized).
const C = { ...LIGHT };

const LS_THEME = "bttd_theme";

function loadThemePref() {
  try {
    const saved = localStorage.getItem(LS_THEME);
    if (saved === "light" || saved === "dark") return saved;
  } catch (e) {}
  if (typeof window !== "undefined" && window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

// Copy palette values onto the live C object. Cheap + pure enough to call
// during render so inline styles in the subtree read the current theme.
function applyThemePalette(mode) {
  const p = mode === "dark" ? DARK : LIGHT;
  Object.keys(p).forEach(k => { C[k] = p[k]; });
}

// Springy overshoot easing for progress fills — settles past target then back.
const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";

const FONT_DISPLAY = `"Bricolage Grotesque", -apple-system, system-ui, sans-serif`;
const FONT_SERIF   = `"Instrument Serif", "Times New Roman", serif`;
const FONT_MONO    = `"JetBrains Mono", ui-monospace, monospace`;

const injectStyles = (force) => {
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

/* ════════════════════════════════════════════════════════════
   DATA
   ════════════════════════════════════════════════════════════ */

// Single strength routine — the engine schedules "Lift" twice a week.
const SESSIONS = [
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

// Classic 4-minute tabata: 8 rounds of 20s all-out / 10s rest.
const TABATA_CONFIG = { rounds: 8, sprintSec: 20, restSec: 10 };

/* ════════════════════════════════════════════════════════════
   RECOVERY ENGINE — single source of tunable values
   ────────────────────────────────────────────────────────────
   Every recovery rule the scheduler uses lives here so the numbers
   (recovery spacing, RPE defaults, layoff thresholds, weekly targets)
   are easy to tune later without touching the logic below.
   Colors are stored as palette KEYS (resolved against the live `C`
   palette at render time) so they track dark/light theme correctly.
   ════════════════════════════════════════════════════════════ */
const RECOVERY = {
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

/* ── Recovery engine — pure functions over a normalized session list ──
   A "session" is { id, type, date(Date), rpe, duration, planned? }.
   `recommend()` returns { action:'rest'|'train', type, reason, band, flags[] }. */

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = startOfDay(d); x.setDate(x.getDate() + n); return x; }
// Whole calendar days from b to a (a - b). Positive when a is later.
function dayGap(a, b) { return Math.round((startOfDay(a) - startOfDay(b)) / 86400000); }
function isHardType(type) { return !!(RECOVERY.TYPES[type] && RECOVERY.TYPES[type].hard); }
function agoWord(days) { return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`; }

// Map raw cardio_sessions rows → normalized engine sessions.
function normalizeSessions(rows) {
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
      };
    });
}

// Merge everything the engine reasons about into one normalized stream:
// conditioning (cardio_sessions) + lifts and walks (workouts).
function normalizeAll(cardioRows, workoutRows) {
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

// Sessions falling within the trailing `windowDays` ending on refDate (inclusive).
function sessionsInTrailing(sessions, refDate, windowDays) {
  return sessions.filter(s => { const g = dayGap(refDate, s.date); return g >= 0 && g <= windowDays - 1; });
}

// Required gap (in days) before the next HARD session is allowed after `s`.
function requiredGapAfter(s) {
  let gap = RECOVERY.minEasyDaysAfterHard + 1;          // normal hard → train 2 days later
  if (s.type === "game") gap += RECOVERY.gameExtraRecoveryDays;
  if (s.rpe >= RECOVERY.brutalRPE) gap += 1;            // a brutal session needs one more
  return gap;
}

// The core recommendation for a single day. Returns an `items` array (what to
// do today: 0, 1, or 2 things) plus a one-line reason. `type` mirrors items[0]
// for convenient display. A day can pair a Tabata with a lift; walks fill
// recovery days as active recovery.
function recommend(allSessions, refDate) {
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
  };

  // Ramp band is driven by hard-training recency (walks don't count).
  let band;
  if (daysSinceHard === null) band = "fresh";
  else if (daysSinceHard <= RECOVERY.LAYOFF.normalMax) band = "normal";
  else if (daysSinceHard <= RECOVERY.LAYOFF.easeMax) band = "ease";
  else band = "restart";

  const mk = (action, items, reason) => ({ action, items, type: items[0] ? items[0].type : null, reason, band, flags, daysSinceLast, daysSinceHard });
  const rest = (reason) => mk("rest", [], reason);

  const walkOwed = done.walk < T.walk.weeklyTarget && !todays.some(s => s.type === "walk");

  // On a non-hard day, an owed walk is the active-recovery pick; else rest.
  const recoveryDay = (why) => walkOwed
    ? mk("train", [{ type: "walk" }], `${why} An easy walk is ideal active recovery (${done.walk}/${T.walk.weeklyTarget} this week).`)
    : rest(`${why} You're recovered and on track — take it easy.`);

  // Weekly conditioning targets, reduced by any games played (lowest priority first).
  let targetTab = T.tabata.weeklyTarget, targetLI = T.long_interval.weeklyTarget, off = done.game;
  const ct = Math.min(targetTab, off); targetTab -= ct; off -= ct;
  const cl = Math.min(targetLI, off); targetLI -= cl; off -= cl;
  const owedLI = Math.max(0, targetLI - done.long_interval);
  const owedTab = Math.max(0, targetTab - done.tabata);
  const owedLift = Math.max(0, T.lift.weeklyTarget - done.lift);
  const canRampHard = band !== "restart" && band !== "fresh" && !(band === "ease" && daysSinceHard >= RECOVERY.reentryTabataAfterDays);

  // 1) Already trained hard today — don't stack a second hard day...
  if (todaysHard.length) {
    if (daysSinceHard === 1) flags.push("Two hard days in a row — keep tomorrow easy.");
    // ...but a lift may pair with today's Tabata while you're already warm.
    const didTabataToday = todays.some(s => s.type === "tabata");
    const didLiftToday = todays.some(s => s.type === "lift");
    if (RECOVERY.pairLiftWithConditioning && didTabataToday && !didLiftToday && owedLift > 0 && canRampHard) {
      return mk("train", [{ type: "lift" }], `Tabata's done — pair a Lift with it while you're warm (${done.lift}/${T.lift.weeklyTarget} lifts this week).`);
    }
    return recoveryDay(`${T[todaysHard[0].type].label} already done today — let it absorb.`);
  }

  // 2) Overtraining guard — too many hard days lately overrides weekly targets.
  if (hardDays7 >= RECOVERY.overtrainingHardDays) {
    return recoveryDay(`${hardDays7} hard days in the last 7 — ease off the intensity, targets can wait.`);
  }

  // 3) Spacing — keep hard days apart (games/brutal sessions need longer).
  if (lastHard && daysSinceHard < requiredGapAfter(lastHard)) {
    const why = lastHard.type === "game"
      ? `Hard game ${agoWord(daysSinceHard)} still counts as load.`
      : `Hard ${T[lastHard.type].short} ${agoWord(daysSinceHard)} — space the hard days out.`;
    return recoveryDay(why);
  }

  // ── Eligible hard day. Layoff ramp first: ease a returning athlete in. ──
  if (band === "restart" || band === "fresh") {
    return mk("train", [{ type: "tabata" }], band === "fresh"
      ? "First session in — start with a Tabata to set a baseline."
      : `It's been ${daysSinceHard} days since real training — restart with a single Tabata. Give it a session or two to feel normal.`);
  }
  if (band === "ease" && daysSinceHard >= RECOVERY.reentryTabataAfterDays) {
    return mk("train", [{ type: "tabata" }], `${daysSinceHard} days off the hard stuff — ease back with a Tabata before more.`);
  }

  // Pick the conditioning primary by priority (Long Interval is the marquee).
  const primary = owedLI > 0 ? "long_interval" : owedTab > 0 ? "tabata" : null;

  if (primary === "long_interval") {
    return mk("train", [{ type: "long_interval" }], `Long Interval owed (${done.long_interval}/${targetLI}) and you're recovered — the week's marquee session.`);
  }
  if (primary === "tabata") {
    // Pair a lift onto the Tabata day (never onto the brutal Long Interval).
    if (RECOVERY.pairLiftWithConditioning && owedLift > 0) {
      return mk("train", [{ type: "tabata" }, { type: "lift" }],
        `Tabata + Lift — pair them today, then recover tomorrow (Tabata ${done.tabata}/${targetTab}, lifts ${done.lift}/${T.lift.weeklyTarget}).`);
    }
    return mk("train", [{ type: "tabata" }], `Tabata owed (${done.tabata}/${targetTab}) and you're recovered — quick and hard.`);
  }
  // No conditioning owed — get a lift in on its own if one's still owed.
  if (owedLift > 0) {
    return mk("train", [{ type: "lift" }], `Lift owed (${done.lift}/${T.lift.weeklyTarget}) and you're recovered — go move some weight.`);
  }
  // Everything's met → recovery day.
  if (done.game > 0) return recoveryDay("A game this week already covers your hard load.");
  return recoveryDay("Weekly targets met (2 Tabata · 1 Long Interval · 2 lifts).");
}

// Forward-simulated tentative plan. Each recommended session is added to the
// working set so spacing and weekly targets carry into the following days —
// which naturally drops a lower-priority session when there's no room to space.
function buildPlan(allSessions, fromDate, nDays) {
  const work = allSessions.slice();
  const out = [];
  for (let i = 0; i < nDays; i++) {
    const day = addDays(fromDate, i);
    const r = recommend(work, day);
    out.push({ date: day, ...r });
    (r.items || []).forEach(it => {
      const def = RECOVERY.TYPES[it.type];
      work.push({ type: it.type, code: it.code, date: day, rpe: def.defaultRPE, duration: def.defaultDurationMin, planned: true });
    });
  }
  return out;
}

// Trailing-window summary for the dashboard.
function trailingSummary(allSessions, refDate, windowDays) {
  const t = sessionsInTrailing(allSessions, refDate, windowDays);
  return {
    count: t.length,
    hard: t.filter(s => isHardType(s.type)).length,
    byType: {
      tabata: t.filter(s => s.type === "tabata").length,
      long_interval: t.filter(s => s.type === "long_interval").length,
      game: t.filter(s => s.type === "game").length,
      lift: t.filter(s => s.type === "lift").length,
      walk: t.filter(s => s.type === "walk").length,
    },
  };
}

// Current consecutive-day streak + days since last session, for display.
function streakInfo(allSessions, refDate) {
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

/* ════════════════════════════════════════════════════════════
   GAMIFICATION — XP, levels, ranks, achievements. All derived from
   logged data (no extra storage), so it can never drift out of sync.
   ════════════════════════════════════════════════════════════ */
const XP_BASE = { tabata: 40, long_interval: 90, game: 120, lift: 70, walk: 20 };
// Effort bonus: harder-felt sessions (higher RPE) are worth more.
function sessionXP(s) {
  const base = XP_BASE[s.type] || 0;
  const bonus = (s.rpe && s.type !== "walk") ? Math.max(0, s.rpe - 5) * 5 : 0;
  return base + bonus;
}
// Default XP for a freshly logged session (used for the "+XP" pop).
function xpForType(type) {
  const def = RECOVERY.TYPES[type];
  return sessionXP({ type, rpe: def ? def.defaultRPE : 0 });
}

// Level curve: each level costs a bit more than the last — fast early wins,
// satisfying long climb.
function levelInfo(totalXP) {
  let level = 1, need = 100, acc = 0;
  while (totalXP >= acc + need) { acc += need; level++; need = 100 + (level - 1) * 60; }
  return { level, into: totalXP - acc, span: need, progress: (totalXP - acc) / need, total: totalXP };
}
// Athletic rank tiers, climbing toward the dunk.
const RANKS = [
  [1, "Walk-On"], [3, "Rookie"], [6, "Starter"], [10, "Sixth Man"],
  [15, "Hooper"], [22, "Veteran"], [30, "All-Star"], [42, "Franchise"], [60, "Legend"],
];
function rankFor(level) {
  let r = RANKS[0][1];
  for (const [lvl, name] of RANKS) if (level >= lvl) r = name;
  return r;
}

const ACHIEVEMENTS = [
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
  { id: "early",    emoji: "🌅", name: "Early Bird",      desc: "Train before 7am",            goal: 1,   val: s => (s.earlyBird ? 1 : 0) },
  { id: "night",    emoji: "🌙", name: "Night Owl",       desc: "Train after 9pm",             goal: 1,   val: s => (s.nightOwl ? 1 : 0) },
  { id: "comeback", emoji: "🔄", name: "Comeback Kid",    desc: "Train after a 7+ day break",  goal: 1,   val: s => (s.comeback ? 1 : 0) },
  { id: "lvl10",    emoji: "⭐", name: "Double Digits",   desc: "Reach level 10",              goal: 10,  val: s => s.level },
  { id: "lvl25",    emoji: "🌟", name: "Elite",           desc: "Reach level 25",              goal: 25,  val: s => s.level },
  { id: "lost5",    emoji: "📉", name: "Down 5",          desc: "Drop 5 lbs",                  goal: 5,   val: s => s.weightLost },
  { id: "lost15",   emoji: "🎯", name: "Down 15",         desc: "Drop 15 lbs",                 goal: 15,  val: s => s.weightLost },
  { id: "lost25",   emoji: "👑", name: "Goal Weight",     desc: "Drop 25 lbs — the dunk awaits", goal: 25, val: s => s.weightLost },
];

// Roll up everything the game layer needs from raw rows.
function computeGameState(history, cardioSessions, weightLog) {
  const all = normalizeAll(cardioSessions, history);
  const today = startOfDay(new Date());
  const sessionXPTotal = all.reduce((a, s) => a + sessionXP(s), 0);
  const totalXP = sessionXPTotal + (weightLog ? weightLog.length * 15 : 0);
  const lvl = levelInfo(totalXP);

  // Best historical streak from distinct active days.
  const dayTimes = [...new Set(all.map(s => startOfDay(s.date).getTime()))].sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  for (const t of dayTimes) { run = (prev != null && t - prev === 86400000) ? run + 1 : 1; best = Math.max(best, run); prev = t; }
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
    },
    bestStreak: best, currentStreak: streak,
    earlyBird: all.some(s => s.date.getHours() < 7),
    nightOwl: all.some(s => s.date.getHours() >= 21),
    comeback,
    weightLost: Math.max(0, startW - curW),
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

// Celebration snapshot — what the player has already "seen", so we only
// celebrate genuinely new milestones (and never spam on first load).
const LS_GAME = "bttd_game_seen";
function loadGameSeen() { try { return JSON.parse(localStorage.getItem(LS_GAME)) || null; } catch (e) { return null; } }
function saveGameSeen(v) { try { localStorage.setItem(LS_GAME, JSON.stringify(v)); } catch (e) {} }

const PHASES = [
  { weeks: "01—04", color: C.rust,     weight: "225 → 218", focus: "Build the habit. Nail form. Ease in.",         goals: ["2× gym/week", "1× cardio/week", "Sleep 7+ hrs", "Cut late-night eating"] },
  { weeks: "05—08", color: C.amber,    weight: "218 → 212", focus: "Add intensity. Move more.",                    goals: ["Progress the weights", "Add interval cardio", "Drop processed meals", "Hit protein daily"] },
  { weeks: "09—12", color: C.moss,     weight: "212 → 206", focus: "Peak conditioning. Build real strength.",      goals: ["Push compound lifts", "3 sessions/week", "Nutrition locked", "Conditioning every week"] },
  { weeks: "13—16", color: C.plum,     weight: "206 → 200", focus: "Lock it in. Set a new baseline.",              goals: ["Test your strength", "Hit goal weight", "Progress photos", "Plan the next cycle"] },
];

/* ── DAILY HYPE — one line, rotates by calendar day so it's stable all day ── */
const WORK_QUOTES = [
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
function quoteOfDay() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - startOfYear) / 86400000);
  return WORK_QUOTES[dayOfYear % WORK_QUOTES.length];
}

/* ── KOSHER NUTRITION DATABASE ── */
const PRE_WORKOUT_FOODS = [
  { name: "Banana + 2 tbsp peanut butter",   protein: 8,  calories: 295, timing: "30–60 min before", note: "Quick carbs + sustained energy. Classic." },
  { name: "Greek yogurt + honey + berries",   protein: 18, calories: 220, timing: "60 min before",    note: "Fage 2% or Chobani. Pareve-friendly w/ coconut yogurt." },
  { name: "Oatmeal + whey + cinnamon",        protein: 28, calories: 380, timing: "60–90 min before", note: "Slow carbs. Fuels heavy lifts." },
  { name: "Bagel + cream cheese + lox",       protein: 22, calories: 420, timing: "90 min before",    note: "Carbs, protein, salt. Heavy day fuel." },
  { name: "Rice cakes + almond butter",       protein: 7,  calories: 200, timing: "30 min before",    note: "Fast carbs, light on stomach." },
  { name: "Quest bar (any flavor)",           protein: 21, calories: 190, timing: "30–45 min before", note: "OU certified. Toss in gym bag." },
  { name: "Black coffee + dates",             protein: 1,  calories: 140, timing: "20 min before",    note: "Caffeine + glucose. Fasted lift hack." },
];

const POST_WORKOUT_FOODS = [
  { name: "Fairlife Core Power 42g shake",    protein: 42, calories: 230, timing: "Within 30 min", note: "OU-D certified. Best on-the-go option. Drink one." },
  { name: "Whey isolate shake (Optimum/Now)", protein: 30, calories: 140, timing: "Within 30 min", note: "OU-D. Mix with water or milk." },
  { name: "Grilled chicken + rice + veg",     protein: 45, calories: 520, timing: "Within 90 min", note: "The classic. Bumps recovery hard." },
  { name: "Salmon + sweet potato",            protein: 35, calories: 480, timing: "Within 90 min", note: "Omega-3s + carbs. Inflammation fighter." },
  { name: "Cottage cheese + pineapple",       protein: 25, calories: 240, timing: "Within 60 min", note: "Casein digests slow. Great before bed too." },
  { name: "3 eggs + toast + avocado",         protein: 21, calories: 420, timing: "Within 60 min", note: "Cheap, fast, complete protein." },
  { name: "Tuna pouch + crackers",            protein: 25, calories: 250, timing: "Within 60 min", note: "Gym bag staple. StarKist/Bumble Bee OU." },
  { name: "Turkey roll-ups + hummus",         protein: 22, calories: 280, timing: "Within 60 min", note: "Empire kosher turkey. Pareve hummus." },
];

const ANYTIME_PROTEIN = [
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

/* ── MEAL COMBINATIONS — complete plates, not ingredients ── */
/* Each has total protein & calories, plus a breakdown showing each component */

const PRE_WORKOUT_MEALS = [
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

const POST_WORKOUT_MEALS = [
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

/* Protein target: 1g per pound of bodyweight (high-end for muscle gain + cut) */
const calcProteinTarget = (weightLbs) => Math.round(weightLbs * 1.0);
/* Goal modes: cut = aggressive deficit, lean = moderate deficit, maintain = TDEE, bulk = surplus */
const GOAL_MODES = {
  cut:      { label: "Cut",      delta: -800, blurb: "Aggressive deficit · ~1.5 lb/wk loss",   color: "rust" },
  lean:     { label: "Lean",     delta: -500, blurb: "Moderate deficit · ~1 lb/wk loss",       color: "amber" },
  maintain: { label: "Maintain", delta: 0,    blurb: "Eat to fuel · stay where you are",       color: "electric" },
  bulk:     { label: "Bulk",     delta: 400,  blurb: "Lean surplus · slow muscle gain",        color: "moss" },
};

const calcCalorieTarget = (weightLbs, heightInches, age = 35, activityFactor = 1.55, goalDelta = 0) => {
  // Mifflin-St Jeor for males, then activity multiplier, then goal adjustment
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const tdee = bmr * activityFactor;
  return Math.max(1200, Math.round(tdee + goalDelta)); // 1200 floor for safety
};

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

/* Loud, sustained alarm ring — for end-of-timer */
function ringAlarm() {
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

function speak(text) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch(e) {}
}

/* ── Notification helper — for when user switches apps ── */
function requestNotificationPermission() {
  if (!("Notification" in window)) return Promise.resolve("unsupported");
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Promise.resolve(Notification.permission);
  }
  return Notification.requestPermission();
}

function fireNotification(title, body) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return; // only when in another app/tab
    const n = new Notification(title, {
      body,
      icon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='80' font-size='80'>💪</text></svg>",
      tag: "bttd-timer",
      requireInteraction: false,
      silent: false,
    });
    n.onclick = () => { window.focus(); n.close(); };
    setTimeout(() => n.close(), 8000);
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
    // Use custom reps per set if available, otherwise default
    const customReps = vals[ex.id]?.customReps || {};
    let totalReps = 0;
    for (let i = 0; i < s; i++) {
      totalReps += parseFloat(customReps[i]) || parseFloat(ex.reps) || 0;
    }
    return v + w * totalReps;
  }, 0);
}
const fmtNum = (n) => n >= 10000 ? Math.round(n/1000) + "k" : n >= 1000 ? (n/1000).toFixed(1) + "k" : n.toLocaleString();

function calcStreak(history) {
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

function getLastWeight(history, exerciseName) {
  for (const h of history) {
    const ex = (h.exercises || []).find(e => e.name === exerciseName);
    if (ex && ex.weight > 0) return ex.weight;
  }
  return null;
}

// Richer lookup: returns { weight, reps, sets, daysAgo } for the most recent session
// containing this exercise, or null if never logged.
function getLastPerformance(history, exerciseName) {
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

// Progressive overload: suggested next weight = last + 5 lb.
const PROGRESS_STEP = 5;
const nextTarget = (w) => (parseFloat(w) || 0) + PROGRESS_STEP;

// Greedy: given a target TOTAL barbell weight, compute the plates to load PER SIDE.
// Bar = 45 lb. Returns an array of plate weights (heaviest first) or null if impossible.
function platesToReach(totalLbs) {
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

function isPR(history, exerciseName, weight) {
  if (!weight || weight <= 0) return false;
  let max = 0;
  for (const h of history) {
    for (const ex of (h.exercises || [])) {
      if (ex.name === exerciseName && ex.weight > max) max = ex.weight;
    }
  }
  return weight > max;
}

function thisWeekRange() {
  const start = new Date(); start.setDate(start.getDate() - start.getDay()); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  return { start, end };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late session";
}

/* localStorage helpers — for body stats since we don't want to add a new table */
const LS_BODY = "bttd_body_stats";
const LS_PROTEIN = "bttd_protein_log_v1";
const LS_CALORIES = "bttd_calorie_log_v1";
const LS_VITAMIN_D3 = "bttd_vitamin_d3_log_v1";
const LS_CREATINE = "bttd_creatine_log_v1";

function loadBodyStats() {
  try {
    const raw = localStorage.getItem(LS_BODY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Backfill defaults for new fields if migrating from older saves
      if (!parsed.goal) parsed.goal = "lean";
      if (typeof parsed.activityFactor !== "number") parsed.activityFactor = 1.55;
      return parsed;
    }
  } catch(e) {}
  return { heightInches: 77, weightLbs: 222, age: 47, goal: "lean", activityFactor: 1.55 };
}
function saveBodyStats(stats) {
  try { localStorage.setItem(LS_BODY, JSON.stringify(stats)); } catch(e) {}
}

/* LOCAL timezone date key — fixes the UTC midnight bug.
   Uses the device's local time so the day rolls over at YOUR midnight, not UTC's. */
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Local date key (YYYY-MM-DD) for an arbitrary Date.
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Keys for the current calendar week, Monday → Sunday.
function weekKeysMonday() {
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

function loadProteinLog() {
  try {
    const raw = localStorage.getItem(LS_PROTEIN);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return {};
}
function saveProteinLog(log) {
  try { localStorage.setItem(LS_PROTEIN, JSON.stringify(log)); } catch(e) {}
}

function loadCalorieLog() {
  try {
    const raw = localStorage.getItem(LS_CALORIES);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return {};
}
function saveCalorieLog(log) {
  try { localStorage.setItem(LS_CALORIES, JSON.stringify(log)); } catch(e) {}
}

function loadVitaminD3Log() {
  try {
    const raw = localStorage.getItem(LS_VITAMIN_D3);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return {};
}
function saveVitaminD3Log(log) {
  try { localStorage.setItem(LS_VITAMIN_D3, JSON.stringify(log)); } catch(e) {}
}

function loadCreatineLog() {
  try {
    const raw = localStorage.getItem(LS_CREATINE);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return {};
}
function saveCreatineLog(log) {
  try { localStorage.setItem(LS_CREATINE, JSON.stringify(log)); } catch(e) {}
}

/* Day key for N days ago in LOCAL time (0 = today). */
function dayKeyAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* Consecutive-day streak ending today. If today isn't logged yet,
   yesterday's streak still counts as "current" until the day rolls over. */
function calcSupplementStreak(log) {
  const start = log[dayKeyAgo(0)] ? 0 : 1;
  let streak = 0;
  for (let i = start; ; i++) {
    if (log[dayKeyAgo(i)]) streak++;
    else break;
  }
  return streak;
}

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

function NavItem({ g, active, onGo }) {
  return (
    <button onClick={() => onGo(g)} className="btn"
      style={{
        flex: 1, padding: "8px 4px", border: "none", background: "transparent",
        cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        position: "relative",
      }}>
      <span style={{ fontSize: 20, opacity: active ? 1 : 0.55, transition: "opacity 0.2s, transform 0.2s", transform: active ? "scale(1.05)" : "scale(1)" }}>
        {g.icon}
      </span>
      <span style={{
        fontSize: 10, fontWeight: active ? 700 : 500,
        color: active ? C.rust : C.dim,
        letterSpacing: "0.02em", fontFamily: FONT_DISPLAY, transition: "color 0.2s",
      }}>
        {g.label}
      </span>
      {active && <div style={{ position: "absolute", top: 0, left: "30%", right: "30%", height: 2, background: C.rust, borderRadius: 999 }} />}
    </button>
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

/* DECIMAL-FRIENDLY number input (replaces NumIn for places that need decimals) */
function NumIn({ value, onChange, placeholder, style = {}, decimal = true, step }) {
  return (
    <input
      type="number"
      inputMode={decimal ? "decimal" : "numeric"}
      step={step || (decimal ? "0.1" : "1")}
      value={value === undefined || value === null ? "" : value}
      onChange={e => onChange(e.target.value)}
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

/* ── TOAST + UNDO ──
   Module-level pub/sub so any component can fire a toast without prop drilling.
   Render <ToastHost/> once at the app root. */
let _toastListeners = [];
let _toastSeq = 0;
function toast(message, opts = {}) {
  const t = { id: ++_toastSeq, message, actionLabel: opts.actionLabel, onAction: opts.onAction, duration: opts.duration ?? 5000 };
  _toastListeners.forEach(fn => fn(t));
  return t.id;
}
function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const listener = (t) => {
      setItems(prev => [...prev, t]);
      if (t.duration > 0) setTimeout(() => setItems(prev => prev.filter(x => x.id !== t.id)), t.duration);
    };
    _toastListeners.push(listener);
    return () => { _toastListeners = _toastListeners.filter(l => l !== listener); };
  }, []);
  const dismiss = (id) => setItems(prev => prev.filter(x => x.id !== id));
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: "calc(82px + env(safe-area-inset-bottom))",
      zIndex: 9998, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      pointerEvents: "none", padding: "0 16px",
    }}>
      {items.map(t => (
        <div key={t.id} className="ease-up" style={{
          pointerEvents: "auto", maxWidth: 420, width: "100%",
          background: C.bone, color: C.ink, borderRadius: 14, padding: "12px 8px 12px 16px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
        }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, fontFamily: FONT_DISPLAY, letterSpacing: "-0.01em" }}>{t.message}</span>
          {t.onAction && (
            <button onClick={() => { t.onAction(); dismiss(t.id); }} className="btn" style={{
              background: "transparent", border: "none", color: C.rustHi, fontSize: 12, fontWeight: 700,
              fontFamily: FONT_MONO, letterSpacing: "0.08em", cursor: "pointer", padding: "6px 8px",
            }}>{t.actionLabel || "UNDO"}</button>
          )}
          <button onClick={() => dismiss(t.id)} className="btn" style={{
            background: "transparent", border: "none", color: C.mute, fontSize: 14, cursor: "pointer", padding: "6px 8px",
          }}>✕</button>
        </div>
      ))}
    </div>
  );
}

/* ── ANIMATED COUNT-UP NUMBER ──
   Smoothly tweens to its target value. Honors prefers-reduced-motion. */
function useCountUp(value, duration = 650) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(null);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const to = value;
    if (reduce || from === to) { fromRef.current = to; setDisplay(to); return; }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { fromRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return display;
}
function AnimatedNumber({ value, format = (n) => Math.round(n), duration = 650 }) {
  const display = useCountUp(value, duration);
  return <>{format(display)}</>;
}

/* ════════════════════════════════════════════════════════════
   COMPONENTS
   ════════════════════════════════════════════════════════════ */

/* ── Confetti — celebrate PRs and completions ── */
function Confetti({ show, onDone }) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(() => onDone && onDone(), 2400);
      return () => clearTimeout(t);
    }
  }, [show, onDone]);
  if (!show) return null;
  const pieces = Array.from({ length: 40 });
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {pieces.map((_, i) => {
        const colors = [C.rust, C.amber, C.moss, C.electric, C.plum];
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const dur = 1.6 + Math.random() * 0.8;
        const rot = Math.random() * 360;
        return (
          <div key={i} style={{
            position: "absolute", left: left + "%", top: "-12px",
            width: 8, height: 12, background: color,
            borderRadius: 2,
            transform: `rotate(${rot}deg)`,
            animation: `confetti-fall ${dur}s ${delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
          }} />
        );
      })}
    </div>
  );
}

/* ── Reps Editor Modal — tap a set dot to change its reps ── */
function RepsEditor({ open, currentReps, defaultReps, onSave, onClose, exerciseName, setIndex }) {
  const [val, setVal] = useState("");

  useEffect(() => {
    if (open) setVal(String(currentReps ?? defaultReps ?? ""));
  }, [open, currentReps, defaultReps]);

  if (!open) return null;

  const save = (n) => {
    const num = parseFloat(n);
    if (!isNaN(num) && num >= 0) {
      onSave(num);
      onClose();
    }
  };

  // Quick decrement options based on default
  const def = parseFloat(defaultReps) || 8;
  const quickOpts = [
    Math.max(1, def - 4),
    Math.max(1, def - 2),
    def,
    def + 2,
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="backdrop" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="ease-up" style={{
        background: C.panel, borderRadius: 22, padding: 24,
        maxWidth: 360, width: "100%",
        border: `1px solid ${C.line}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
      }}>
        <Eyebrow color={C.rust}>Set {setIndex + 1} · {exerciseName}</Eyebrow>
        <h3 className="h-display" style={{ fontSize: 22, margin: "10px 0 4px", color: C.bone }}>How many reps?</h3>
        <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO, marginBottom: 16 }}>
          Target was {defaultReps}. Hit what you hit.
        </div>

        <input
          type="number" inputMode="decimal" step="0.5"
          value={val} onChange={e => setVal(e.target.value)}
          autoFocus
          style={{
            width: "100%", padding: "16px",
            background: C.raised, border: `2px solid ${C.rust}55`,
            borderRadius: 14, color: C.bone,
            fontSize: 32, fontWeight: 700, fontFamily: FONT_DISPLAY,
            textAlign: "center", outline: "none",
            letterSpacing: "-0.03em", marginBottom: 14,
          }}
          onKeyDown={e => e.key === "Enter" && save(val)}
        />

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${quickOpts.length}, 1fr)`, gap: 6, marginBottom: 16 }}>
          {quickOpts.map(opt => (
            <button key={opt} onClick={() => save(opt)} className="btn" style={{
              padding: "10px 0", borderRadius: 10,
              background: opt === def ? C.rust + "20" : C.raised,
              border: `1px solid ${opt === def ? C.rust + "55" : C.line}`,
              color: opt === def ? C.rust : C.cream,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: FONT_DISPLAY,
            }}>{opt}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn ghost color={C.dim} onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
          <Btn color={C.rust} onClick={() => save(val)} style={{ flex: 1.5 }}>Save Reps</Btn>
        </div>
      </div>
    </div>
  );
}

/* ── Rest Timer between sets — with audible alarm ring at zero ── */
function RestTimer({ seconds, onClose, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  const [ringing, setRinging] = useState(false);
  const ringIntervalRef = useRef(null);

  useEffect(() => {
    if (remaining <= 0) {
      // ALARM: ring the alarm + repeat it twice for ~3 seconds total
      ringAlarm();
      setRinging(true);
      speak("Time to lift");
      fireNotification("⏰ Rest done", "Get back under the bar.");
      if (navigator.vibrate) navigator.vibrate([200, 80, 200, 80, 400]);

      // Repeat alarm
      let count = 0;
      ringIntervalRef.current = setInterval(() => {
        count++;
        if (count >= 2) {
          clearInterval(ringIntervalRef.current);
          setRinging(false);
          onClose && onClose();
        } else {
          ringAlarm();
          if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
        }
      }, 1700);
      return () => { if (ringIntervalRef.current) clearInterval(ringIntervalRef.current); };
    }
    if (remaining === 10) { beep(660, 0.1, 0.4); speak("Ten seconds"); }
    if (remaining <= 3 && remaining > 0) beep(660, 0.1, 0.4);
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const dismiss = () => {
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    setRinging(false);
    onClose && onClose();
  };

  const pct = ((seconds - remaining) / seconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = Math.max(0, remaining % 60);
  const display = mins > 0 ? `${mins}:${String(secs).padStart(2,"0")}` : String(Math.max(0, remaining));

  return (
    <div
      className={ringing ? "alarm-shake" : ""}
      style={{
        position: "fixed", bottom: 76, left: 0, right: 0,
        background: ringing ? C.rust : C.panel,
        borderTop: `1px solid ${ringing ? C.rust : C.line}`,
        padding: "16px 20px 20px", zIndex: 95,
        animation: ringing ? undefined : "ease-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        boxShadow: ringing ? `0 -8px 30px ${C.rust}55` : "0 -8px 30px rgba(0,0,0,0.08)",
        transition: "background 0.3s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <Eyebrow color={ringing ? C.ink : C.electric}>{ringing ? "TIME!" : "Rest Timer"}</Eyebrow>
          <div className="num-tab h-display" style={{
            fontSize: 36, fontWeight: 700,
            color: ringing ? C.ink : C.electric,
            letterSpacing: "-0.04em", lineHeight: 1, marginTop: 4,
          }}>
            {ringing ? "🔔 GO!" : display}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!ringing && <Btn ghost color={C.dim} onClick={() => setRemaining(r => Math.min(seconds, r + 30))} size="sm">+30s</Btn>}
          <Btn color={ringing ? C.ink : C.electric} ghost={ringing} onClick={dismiss} size="sm" style={ringing ? { color: C.ink, borderColor: C.ink } : {}}>
            {ringing ? "Stop" : "Skip"}
          </Btn>
        </div>
      </div>
      {!ringing && (
        <div style={{ background: C.raised, borderRadius: 999, height: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: pct + "%",
            background: `linear-gradient(90deg, ${C.electric}, ${C.moss})`,
            borderRadius: 999, transition: "width 1s linear",
          }} />
        </div>
      )}
    </div>
  );
}

const PLATES = [
  { weight: 45, color: "#3B82F6", height: 80, width: 12 },
  { weight: 35, color: "#EAB308", height: 70, width: 11 },
  { weight: 25, color: "#22C55E", height: 60, width: 10 },
  { weight: 10, color: "#FFFFFF", height: 44, width: 9  },
  { weight: 5,  color: "#6B7280", height: 34, width: 8  },
  { weight: 2.5,color: "#374151", height: 26, width: 7  },
];

function parsePlates(str) {
  if (!str) return [];
  try { return JSON.parse(str); } catch(e) { return []; }
}

function BarbellInput({ vals, onVal, lastPerf }) {
  const platesStr = vals?.plates || "[]";
  const plates = parsePlates(platesStr);
  const perSide = plates.reduce((sum, w) => sum + w, 0);
  const total = 45 + perSide * 2;
  const isEmpty = plates.length === 0;
  const lastPlates = lastPerf ? platesToReach(lastPerf.weight) : null;

  const addPlate = (weight) => {
    const next = [...plates, weight].sort((a,b) => b-a);
    onVal("plates", JSON.stringify(next));
    onVal("perSide", String(perSide + weight));
  };

  const removePlate = (idx) => {
    const next = [...plates];
    next.splice(idx, 1);
    onVal("plates", JSON.stringify(next));
    onVal("perSide", String(plates.reduce((s,w,i) => i === idx ? s : s+w, 0)));
  };

  const clearAll = () => {
    onVal("plates", "[]");
    onVal("perSide", "0");
  };

  const loadLast = () => {
    if (!lastPlates) return;
    onVal("plates", JSON.stringify([...lastPlates].sort((a,b) => b-a)));
    onVal("perSide", String(lastPlates.reduce((a,b) => a+b, 0)));
  };

  // Visualize: render plates from heaviest (innermost) to lightest (outermost)
  return (
    <div style={{
      background: C.raised, borderRadius: 14, padding: 14, marginTop: 10,
      border: `1px solid ${C.line}`,
    }}>
      {/* Total readout */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>BARBELL · 45 LB BAR</span>
        <span className="num-tab" style={{ fontSize: 24, fontWeight: 700, color: C.rust, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {total}<span style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginLeft: 4 }}>lbs</span>
        </span>
      </div>

      {/* "Load last" prompt — only shows when bar is empty AND we have history */}
      {isEmpty && lastPerf && lastPlates && (
        <button onClick={loadLast} className="btn"
          style={{
            width: "100%", padding: "10px 12px", marginBottom: 12,
            background: "transparent",
            border: `1px dashed ${C.electric}`,
            borderRadius: 10,
            color: C.electric,
            fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.05em",
            cursor: "pointer", textTransform: "uppercase", fontWeight: 600,
          }}>
          ↻ Load last: {lastPerf.weight} lb × {String(lastPerf.reps).split(",")[0]} reps
          {lastPerf.daysAgo !== null && (
            <span style={{ color: C.mute, marginLeft: 6, fontSize: 9 }}>
              ({lastPerf.daysAgo === 0 ? "today" : lastPerf.daysAgo === 1 ? "1d ago" : `${lastPerf.daysAgo}d ago`})
            </span>
          )}
        </button>
      )}
      {isEmpty && lastPerf && !lastPlates && (
        <div style={{
          marginBottom: 12, padding: "8px 12px",
          fontFamily: FONT_MONO, fontSize: 10, color: C.mute,
          letterSpacing: "0.05em", textAlign: "center",
        }}>
          LAST: {lastPerf.weight} LB × {String(lastPerf.reps).split(",")[0]} (can't auto-load — odd plate combo)
        </div>
      )}

      {/* Progressive overload nudge — bump the last weight by +5 */}
      {lastPerf && total < nextTarget(lastPerf.weight) && platesToReach(nextTarget(lastPerf.weight)) && (
        <button onClick={() => {
            const pl = platesToReach(nextTarget(lastPerf.weight));
            onVal("plates", JSON.stringify([...pl].sort((a, b) => b - a)));
            onVal("perSide", String(pl.reduce((a, b) => a + b, 0)));
            if (navigator.vibrate) navigator.vibrate(8);
          }} className="btn"
          style={{
            width: "100%", padding: "10px 12px", marginBottom: 12,
            background: `${C.moss}12`, border: `1px solid ${C.moss}55`, borderRadius: 10,
            color: C.moss, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.05em",
            cursor: "pointer", textTransform: "uppercase", fontWeight: 700,
          }}>
          ↗ Progress to {nextTarget(lastPerf.weight)} lb
          <span style={{ color: C.mute, marginLeft: 6, fontSize: 9 }}>(was {lastPerf.weight})</span>
        </button>
      )}

      {/* Visual barbell */}
      <div style={{
        background: "linear-gradient(180deg, #1A1814 0%, #0F0E0C 100%)", borderRadius: 10, padding: "16px 8px",
        marginBottom: 14, height: 110,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        border: `1px solid ${C.faint}`,
      }}>
        {/* Bar end caps */}
        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Left side plates - reversed (lightest outside) */}
          {[...plates].reverse().map((w, i) => {
            const p = PLATES.find(pl => pl.weight === w);
            if (!p) return null;
            return (
              <div key={"L"+i} onClick={() => removePlate(plates.length - 1 - i)} className="btn"
                style={{
                  width: p.width, height: p.height,
                  background: p.color, borderRadius: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff",
                  cursor: "pointer", flexShrink: 0,
                  boxShadow: "inset -1px 0 0 rgba(0,0,0,0.2)",
                }}>
                {p.weight === 2.5 ? "" : Math.floor(p.weight)}
              </div>
            );
          })}
          {/* Bar */}
          <div style={{ width: 6, height: 14, background: "#D1D5DB", borderRadius: 1 }} />
          <div style={{ width: 60, height: 5, background: "linear-gradient(180deg, #E5E7EB 0%, #6B7280 100%)", borderRadius: 1 }} />
          <div style={{ width: 6, height: 14, background: "#D1D5DB", borderRadius: 1 }} />
          {/* Right side plates */}
          {plates.map((w, i) => {
            const p = PLATES.find(pl => pl.weight === w);
            if (!p) return null;
            return (
              <div key={"R"+i} onClick={() => removePlate(i)} className="btn"
                style={{
                  width: p.width, height: p.height,
                  background: p.color, borderRadius: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff",
                  cursor: "pointer", flexShrink: 0,
                  boxShadow: "inset 1px 0 0 rgba(0,0,0,0.2)",
                }}>
                {p.weight === 2.5 ? "" : Math.floor(p.weight)}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {plates.length === 0 && (
          <div style={{ position: "absolute", bottom: 6, fontSize: 10, color: C.mute, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>
            JUST THE BAR · TAP A PLATE BELOW
          </div>
        )}
        {plates.length > 0 && (
          <div style={{ position: "absolute", bottom: 6, fontSize: 10, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>
            +{perSide} lbs PER SIDE · TAP PLATE TO REMOVE
          </div>
        )}
      </div>

      {/* Plate selector buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 10 }}>
        {PLATES.map(p => (
          <button key={p.weight} onClick={() => addPlate(p.weight)} className="btn"
            style={{
              padding: "10px 4px", borderRadius: 10,
              background: p.color === "#FFFFFF" ? "#F9FAFB" : p.color + "20",
              border: `1.5px solid ${p.color === "#FFFFFF" ? "#9CA3AF" : p.color}`,
              color: p.color === "#FFFFFF" ? "#374151" : p.color,
              fontFamily: FONT_DISPLAY,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              letterSpacing: "-0.01em",
            }}>
            +{p.weight}
          </button>
        ))}
      </div>

      {/* Clear */}
      {plates.length > 0 && (
        <button onClick={clearAll} className="btn"
          style={{
            width: "100%", padding: "8px", borderRadius: 8,
            background: "transparent", border: `1px solid ${C.line}`,
            color: C.dim, fontSize: 11, cursor: "pointer",
            fontFamily: FONT_MONO, letterSpacing: "0.05em",
          }}>
          CLEAR ALL PLATES
        </button>
      )}
    </div>
  );
}

function ExRow({ ex, checked, onCheck, vals, onVal, color, onRest, lastPerf, onEditReps }) {
  const setsDone = parseInt(vals?.setsDone) || 0;
  const targetSets = parseInt(ex.sets) || 0;
  const allSetsDone = setsDone >= targetSets && targetSets > 0;
  const customReps = vals?.customReps || {};

  // Auto-check the exercise when all sets done
  useEffect(() => {
    if (allSetsDone && !checked) onCheck();
    if (!allSetsDone && checked && setsDone > 0) onCheck(); // uncheck if user removes a set
  }, [allSetsDone]);

  const tapSet = (i) => {
    const newCount = setsDone === i + 1 ? i : i + 1;
    onVal("setsDone", String(newCount));
    // Trigger rest timer when ADDING a set (not when un-tapping)
    if (newCount > setsDone && newCount < targetSets && onRest) {
      onRest();
    }
    // Subtle haptic-like beep + vibration
    beep(880, 0.04, 0.15);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const longPressTimer = useRef(null);
  const longPressFiredRef = useRef(false);

  const handlePressStart = (i) => {
    longPressFiredRef.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFiredRef.current = true;
      // Open reps editor for this specific set
      if (onEditReps) {
        onEditReps(i, customReps[i] !== undefined ? customReps[i] : ex.reps);
      }
      beep(660, 0.15, 0.4);
      if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
    }, 500);
  };
  const handlePressEnd = (e, i) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (longPressFiredRef.current) {
      // Long press handled it — prevent the click
      e.preventDefault?.();
      e.stopPropagation?.();
    }
  };

  // Reset all reps (separate gesture: tap reset button)
  const resetAllSets = () => {
    onVal("setsDone", "0");
    onVal("customReps", {});
    beep(440, 0.2, 0.4);
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
  };

  return (
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: ex.timed || ex.noWeight ? 0 : 12 }}>
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
          {checked && <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1 5L4.5 8.5L12 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
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
          <div style={{ width: 72, flexShrink: 0 }}>
            {lastPerf && (parseFloat(vals?.weight) || 0) < nextTarget(lastPerf.weight) ? (
              <button onClick={() => onVal("weight", String(nextTarget(lastPerf.weight)))} className="btn"
                title={`Last: ${lastPerf.weight} lb. Tap to bump +${PROGRESS_STEP}.`}
                style={{
                  background: "transparent", border: "none", padding: 0,
                  fontSize: 11, fontFamily: FONT_MONO, color: C.moss,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  fontWeight: 700, cursor: "pointer", textAlign: "center", width: "100%",
                  marginBottom: 2, lineHeight: 1.2,
                }}>
                ↗ {nextTarget(lastPerf.weight)}
                <div style={{ fontSize: 8, color: C.mute, marginTop: 1, fontWeight: 500 }}>
                  WAS {lastPerf.weight}
                </div>
              </button>
            ) : (
              <div style={{ textAlign: "center" }}><Eyebrow>lbs</Eyebrow></div>
            )}
            <div style={{ height: 2 }} />
            <NumIn
              value={vals?.weight}
              onChange={v => onVal("weight", v)}
              placeholder={lastPerf ? String(lastPerf.weight) : "0"}
              decimal={true}
              step="0.5"
            />
          </div>
        )}
      </div>

      {/* Set dots — tap to track each completed set, hold to edit reps */}
      {!ex.noWeight && !ex.timed && (
        <div style={{ display: "flex", gap: 8, paddingLeft: 40, alignItems: "center", flexWrap: "wrap" }}>
          {Array.from({ length: targetSets }).map((_, i) => {
            const done = i < setsDone;
            const repsForSet = customReps[i] !== undefined ? customReps[i] : ex.reps;
            const isCustom = customReps[i] !== undefined && String(customReps[i]) !== String(ex.reps);
            return (
              <button
                key={i}
                onClick={(e) => {
                  if (longPressFiredRef.current) {
                    longPressFiredRef.current = false;
                    return;
                  }
                  tapSet(i);
                }}
                onMouseDown={() => handlePressStart(i)}
                onMouseUp={(e) => handlePressEnd(e, i)}
                onMouseLeave={(e) => handlePressEnd(e, i)}
                onTouchStart={() => handlePressStart(i)}
                onTouchEnd={(e) => handlePressEnd(e, i)}
                onContextMenu={(e) => e.preventDefault()}
                className="btn"
                style={{
                  width: 38, height: 38, borderRadius: "50%", padding: 0,
                  background: done ? color : "transparent",
                  border: `2px solid ${done ? color : C.faint}`,
                  color: done ? "#fff" : C.dim,
                  fontSize: 12, fontWeight: 700,
                  fontFamily: FONT_DISPLAY,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  position: "relative",
                  outline: isCustom ? `1px solid ${C.amber}` : "none",
                  outlineOffset: isCustom ? 2 : 0,
                }}
              >
                {repsForSet}
              </button>
            );
          })}
          <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginLeft: 4 }}>
            {setsDone}/{targetSets}
          </span>
          {setsDone > 0 && (
            <button onClick={resetAllSets} className="btn" style={{
              background: "transparent", border: "none",
              color: C.mute, fontSize: 10, cursor: "pointer",
              fontFamily: FONT_MONO, letterSpacing: "0.05em",
              marginLeft: "auto", padding: "4px 8px",
            }}>RESET</button>
          )}
        </div>
      )}
      {!ex.noWeight && !ex.timed && targetSets > 0 && (
        <div style={{ paddingLeft: 40, marginTop: 6, fontSize: 9, color: C.mute, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>
          TAP TO MARK SET · HOLD TO CHANGE REPS
        </div>
      )}

      {ex.barbell && <BarbellInput vals={vals} onVal={onVal} lastPerf={lastPerf} />}
    </div>
  );
}

/* ── Tabata Timer — premium ── */
function TabataTimer({ onLog, loggedToday }) {
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

  const start = () => { getAudioCtx(); requestNotificationPermission(); requestWakeLock(); setCountdown(5); };
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
        if (phase === "sprint") {
          beep(523, 0.15, 0.4); speak("Rest");
          fireNotification("😮‍💨 Rest", `Round ${round}/${TABATA_CONFIG.rounds} done. Catch your breath.`);
          setPhase("rest"); return TABATA_CONFIG.restSec;
        }
        else {
          setRound(r => {
            if (r >= TABATA_CONFIG.rounds) {
              ringAlarm(); speak("Done! Great work!");
              fireNotification("🏁 Tabata complete", "8 rounds. 4 minutes. Done.");
              releaseWakeLock(); setPhase("done"); return r;
            }
            beep(880, 0.18, 0.5); speak("Sprint!");
            fireNotification("💥 Sprint!", `Round ${r + 1}/${TABATA_CONFIG.rounds} — go.`);
            setPhase("sprint"); return r + 1;
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
          <Pill color={loggedToday ? C.moss : C.amber}>{loggedToday ? "✓ Done today" : "4-min Tabata"}</Pill>
          <h2 className="h-display" style={{ fontSize: 26, margin: "10px 0 4px", color: C.bone }}>Tabata Timer</h2>
          <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>{TABATA_CONFIG.rounds} rounds · {TABATA_CONFIG.sprintSec}s ON / {TABATA_CONFIG.restSec}s OFF · 4 min</div>
          <div style={{ fontSize: 11, color: C.mute, marginTop: 4, fontFamily: FONT_MONO }}>run it when the plan calls for it</div>
        </div>
        {phase === "idle" && countdown === null && <Btn color={C.moss} onClick={start}>Start</Btn>}
      </div>

      {/* Already did it elsewhere? One-tap log without running the timer. */}
      {phase === "idle" && countdown === null && (
        <button onClick={() => { onLog(); beep(880, 0.12, 0.4); if (navigator.vibrate) navigator.vibrate(10); }} className="btn"
          style={{
            width: "100%", marginTop: 16, padding: "11px 12px", borderRadius: 12, cursor: "pointer",
            background: loggedToday ? `${C.moss}12` : "transparent",
            border: `1px ${loggedToday ? "solid" : "dashed"} ${loggedToday ? C.moss : C.dim}66`,
            color: loggedToday ? C.moss : C.dim, fontFamily: FONT_MONO, fontSize: 11,
            letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700,
          }}>
          {loggedToday ? "✓ Tabata logged today · tap to log another" : "✓ Already did it? Log today's tabata"}
        </button>
      )}

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
              <p className="h-serif" style={{ fontSize: 18, color: C.cream, margin: "0 0 20px" }}>8 rounds. 4 minutes of work.</p>
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
            <NumIn value={val} onChange={set} placeholder={ph} decimal={true} step="0.1" />
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
  const gymSessions = history.filter(h => h.session_name && h.session_name !== "Treadmill Walk");
  const treadmillSessions = history.filter(h => h.session_name === "Treadmill Walk");
  // Conditioning now lives in cardio_sessions (engine-managed).
  const tabataSessions = cardioSessions.filter(s => s.workout_type === "tabata");
  const longIntervalSessions = cardioSessions.filter(s => s.workout_type === "long_interval");
  const gameSessions = cardioSessions.filter(s => s.workout_type === "game");

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

      {gymSessions.length === 0 && cardioSessions.length === 0 && treadmillSessions.length === 0 && (
        <Surface style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p className="h-serif" style={{ fontSize: 18, color: C.cream, margin: 0 }}>The numbers will come.</p>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 8, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>LOG A SESSION TO SEE YOUR STATS</div>
        </Surface>
      )}

      <div className="ease-up-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatCard kicker="TABATA" value={tabataSessions.length} color={C.moss} sub="sessions" />
        <StatCard kicker="LONG INT" value={longIntervalSessions.length} color={C.electric} sub="sessions" />
        <StatCard kicker="GAMES" value={gameSessions.length} color={C.rust} sub="played" />
      </div>
      <div className="ease-up-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatCard kicker="GYM" value={gymSessions.length} color={C.amber} sub="lift sessions" />
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
              {(() => {
                const lastWeekVol = gymSessions.filter(h => {
                  const d = Date.now() - new Date(h.logged_at);
                  return d >= 7*86400000 && d < 14*86400000;
                }).reduce((a,h) => a+(h.total_volume||0), 0);
                if (lastWeekVol === 0) return null;
                const diff = thisWeekVol - lastWeekVol;
                const pct = Math.round((diff / lastWeekVol) * 100);
                const up = diff > 0;
                return (
                  <div style={{ fontSize: 11, color: up ? C.moss : C.red, fontFamily: FONT_MONO, marginTop: 4, fontWeight: 600 }}>
                    {up ? "▲" : "▼"} {Math.abs(pct)}% vs last week
                  </div>
                );
              })()}
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
   NUTRITION TAB — Kosher pre/post workout + protein tracker
   ════════════════════════════════════════════════════════════ */

/* One daily supplement: tap-to-log toggle + streak + 7-day trail. */
function SupplementRow({ name, dose, blurb, icon, accent, log, onToggle }) {
  const today = todayKey();
  const takenToday = !!log[today];
  const streak = calcSupplementStreak(log);

  // Current week, Monday → Sunday.
  const weekLetters = ["M", "T", "W", "T", "F", "S", "S"];
  const trail = weekKeysMonday().map((k, i) => ({
    key: k,
    done: !!log[k],
    isToday: k === today,
    letter: weekLetters[i],
  }));

  const toggle = () => {
    onToggle(today);
    if (!takenToday) {
      beep(880, 0.08, 0.3);
      if (navigator.vibrate) navigator.vibrate(8);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          fontSize: 22, width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: accent + "15", border: `1px solid ${accent}30`,
        }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="h-display" style={{ fontSize: 17, fontWeight: 700, color: C.bone, letterSpacing: "-0.02em" }}>{name}</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.06em", marginTop: 2 }}>
            {dose}{streak > 0 ? ` · 🔥 ${streak} day${streak === 1 ? "" : "s"}` : ""}
          </div>
        </div>
        <button onClick={toggle} className="btn" style={{
          flexShrink: 0, padding: "10px 18px", borderRadius: 14,
          background: takenToday ? accent : "transparent",
          border: `1px solid ${takenToday ? accent : accent + "55"}`,
          color: takenToday ? C.ink : accent,
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          fontFamily: FONT_DISPLAY, letterSpacing: "-0.01em",
        }}>{takenToday ? "✓ Taken" : "Log it"}</button>
      </div>

      {/* 7-day trail */}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {trail.map(d => (
          <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: "100%", height: 6, borderRadius: 3,
              background: d.done ? accent : C.line,
              outline: d.isToday ? `1px solid ${accent}` : "none", outlineOffset: 1,
            }} />
            <div style={{ fontSize: 9, color: d.isToday ? accent : C.mute, fontFamily: FONT_MONO }}>{d.letter}</div>
          </div>
        ))}
      </div>

      <p className="h-serif" style={{ fontSize: 13, color: C.cream, margin: "10px 0 0", lineHeight: 1.4 }}>{blurb}</p>
    </div>
  );
}

function NutritionTab({ bodyStats, onUpdateBody, proteinLog, onProteinChange, calorieLog, onCalorieChange, vitaminD3Log, onVitaminD3Toggle, creatineLog, onCreatineToggle }) {
  const [editingBody, setEditingBody] = useState(false);
  const [tmpHeight, setTmpHeight] = useState(bodyStats.heightInches);
  const [tmpWeight, setTmpWeight] = useState(bodyStats.weightLbs);
  const [tmpAge, setTmpAge] = useState(bodyStats.age);
  const [tmpGoal, setTmpGoal] = useState(bodyStats.goal || "lean");
  const [foodFilter, setFoodFilter] = useState("preMeals"); // preMeals | postMeals | pre | post | snacks
  const [customAmount, setCustomAmount] = useState("");
  const [customCalAmount, setCustomCalAmount] = useState("");

  const today = todayKey();
  const todayProtein = proteinLog[today] || 0;
  const todayCalories = (calorieLog && calorieLog[today]) || 0;
  const proteinTarget = calcProteinTarget(bodyStats.weightLbs);
  const goal = bodyStats.goal || "lean";
  const goalInfo = GOAL_MODES[goal] || GOAL_MODES.lean;
  const calorieTarget = calcCalorieTarget(
    bodyStats.weightLbs,
    bodyStats.heightInches,
    bodyStats.age,
    bodyStats.activityFactor || 1.55,
    goalInfo.delta
  );
  const pct = Math.min(100, (todayProtein / proteinTarget) * 100);
  const remaining = Math.max(0, proteinTarget - todayProtein);
  const calPct = Math.min(100, (todayCalories / calorieTarget) * 100);
  const calRemaining = calorieTarget - todayCalories; // can be negative when over

  const heightFt = Math.floor(bodyStats.heightInches / 12);
  const heightIn = bodyStats.heightInches % 12;

  const saveBody = () => {
    const h = parseFloat(tmpHeight) || 77;
    const w = parseFloat(tmpWeight) || 222;
    const a = parseInt(tmpAge) || 47;
    onUpdateBody({ ...bodyStats, heightInches: h, weightLbs: w, age: a, goal: tmpGoal });
    setEditingBody(false);
  };

  const setGoal = (newGoal) => {
    onUpdateBody({ ...bodyStats, goal: newGoal });
    setTmpGoal(newGoal);
  };

  const addProtein = (grams) => {
    const newTotal = Math.max(0, todayProtein + grams);
    onProteinChange(today, newTotal);
    if (grams > 0) {
      beep(880, 0.08, 0.3);
      if (navigator.vibrate) navigator.vibrate(8);
    }
  };

  const setProteinAbsolute = (grams) => {
    onProteinChange(today, Math.max(0, grams));
  };

  const addCalories = (cals) => {
    const newTotal = Math.max(0, todayCalories + cals);
    onCalorieChange(today, newTotal);
    if (cals > 0 && navigator.vibrate) navigator.vibrate(6);
  };

  const setCaloriesAbsolute = (cals) => {
    onCalorieChange(today, Math.max(0, cals));
  };

  /* Log a meal/food: adds BOTH protein and calories in one tap */
  const logFood = (food) => {
    const proteinAmt = food.protein || food.totalProtein || 0;
    const calAmt = food.calories || 0;
    if (proteinAmt > 0) {
      onProteinChange(today, todayProtein + proteinAmt);
    }
    if (calAmt > 0) {
      onCalorieChange(today, todayCalories + calAmt);
    }
    if (proteinAmt > 0 || calAmt > 0) {
      beep(880, 0.08, 0.3);
      if (navigator.vibrate) navigator.vibrate(8);
    }
  };

  const FOOD_LISTS = {
    preMeals:  { items: PRE_WORKOUT_MEALS,  type: "meal", label: "Pre Meals",   icon: "🍽️", color: C.amber,    blurb: "Complete plates to eat 30–90 min before training. Tap to log." },
    postMeals: { items: POST_WORKOUT_MEALS, type: "meal", label: "Post Meals",  icon: "🍴", color: C.moss,     blurb: "Real meals for after the work. Within 60–90 min." },
    pre:       { items: PRE_WORKOUT_FOODS,  type: "quick", label: "Pre Quick",  icon: "🔋", color: C.amber,    blurb: "Quick singles when you don't have time for a full meal." },
    post:      { items: POST_WORKOUT_FOODS, type: "quick", label: "Post Quick", icon: "💪", color: C.moss,     blurb: "Fast options within 30–90 min after lifting." },
    snacks:    { items: ANYTIME_PROTEIN,    type: "quick", label: "Anytime",    icon: "🥤", color: C.electric, blurb: "Hit your number. Fairlife is your friend." },
  };

  const activeList = FOOD_LISTS[foodFilter];
  const ringColor = pct >= 100 ? C.moss : pct >= 70 ? C.amber : C.rust;

  // Calorie ring color logic differs based on goal:
  // - Cutting: under = good (moss), at target = amber, over = rust (you ate too much)
  // - Maintain: at target = moss, far either way = amber
  // - Bulking: under = rust (need more), at target = moss
  let calRingColor;
  if (goalInfo.delta < 0) {
    // Cut/Lean: staying under target is the win
    calRingColor = todayCalories <= calorieTarget ? (calPct >= 70 ? C.moss : C.amber) : C.rust;
  } else if (goalInfo.delta > 0) {
    // Bulk: hit target or just above
    calRingColor = todayCalories >= calorieTarget * 0.95 ? C.moss : calPct >= 70 ? C.amber : C.rust;
  } else {
    // Maintain: close to target
    const variance = Math.abs(todayCalories - calorieTarget) / calorieTarget;
    calRingColor = variance <= 0.10 ? C.moss : variance <= 0.20 ? C.amber : C.rust;
  }

  return (
    <>
      <PageTitle kicker="Fuel · the work">Nutrition</PageTitle>

      {/* ── PROTEIN RING — hero ── */}
      <div className="ease-up-1">
        <Surface accent={ringColor} padding={22}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <Eyebrow color={ringColor}>Today · Protein</Eyebrow>
              <div className="h-serif" style={{ fontSize: 14, color: C.dim, marginTop: 4 }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </div>
            </div>
            <Pill color={ringColor}>{Math.round(pct)}%</Pill>
          </div>

          {/* Ring */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
            <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 100 100" style={{ position: "absolute" }}>
                <circle cx="50" cy="50" r="44" stroke={C.line} strokeWidth="6" fill="none" />
                <circle
                  className="ring-progress"
                  cx="50" cy="50" r="44" stroke={ringColor} strokeWidth="6" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - pct / 100)}
                  style={{ transition: `stroke-dashoffset 0.75s ${SPRING}, stroke 0.3s` }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div className="num-tab h-display" style={{ fontSize: 32, fontWeight: 800, color: ringColor, lineHeight: 0.9, letterSpacing: "-0.03em" }}>
                  <AnimatedNumber value={todayProtein} />
                </div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 2, letterSpacing: "0.08em" }}>
                  / {proteinTarget}g
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.08em", marginBottom: 6 }}>REMAINING</div>
              <div className="num-tab h-display" style={{ fontSize: 36, fontWeight: 700, color: C.bone, letterSpacing: "-0.04em", lineHeight: 0.95 }}>
                {Math.round(remaining)}<span style={{ fontSize: 14, color: C.dim, fontWeight: 500, marginLeft: 4 }}>g</span>
              </div>
              <p className="h-serif" style={{ fontSize: 14, color: C.cream, margin: "10px 0 0", lineHeight: 1.4 }}>
                {pct >= 100 ? "Crushed it. Recovery on lock." : remaining <= 30 ? "One Fairlife away. Easy." : remaining <= 60 ? "Two solid meals to go." : "Big day ahead. Get after it."}
              </p>
            </div>
          </div>

          {/* Quick add buttons */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
            <Eyebrow>Quick Add Protein</Eyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10 }}>
              {[10, 20, 30, 42].map(g => (
                <button key={g} onClick={() => addProtein(g)} className="btn" style={{
                  padding: "12px 0", borderRadius: 12,
                  background: ringColor + "15", border: `1px solid ${ringColor}40`,
                  color: ringColor, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: FONT_DISPLAY, letterSpacing: "-0.01em",
                }}>+{g}g</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <NumIn
                value={customAmount}
                onChange={setCustomAmount}
                placeholder="Custom g (e.g. 24.5)"
                decimal={true}
                step="0.5"
                style={{ flex: 1 }}
              />
              <Btn color={ringColor} size="sm" onClick={() => {
                const v = parseFloat(customAmount);
                if (!isNaN(v) && v > 0) { addProtein(v); setCustomAmount(""); }
              }} disabled={!customAmount || parseFloat(customAmount) <= 0}>Add</Btn>
              {todayProtein > 0 && (
                <Btn ghost color={C.dim} size="sm" onClick={() => {
                  const prev = todayProtein;
                  setProteinAbsolute(0);
                  if (navigator.vibrate) navigator.vibrate(12);
                  toast("Protein reset to 0", { actionLabel: "UNDO", onAction: () => setProteinAbsolute(prev) });
                }}>↺</Btn>
              )}
            </div>
          </div>
        </Surface>
      </div>

      {/* ── CALORIE RING — second hero ── */}
      <div className="ease-up-1">
        <Surface accent={calRingColor} padding={22}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <Eyebrow color={calRingColor}>Today · Calories</Eyebrow>
              <div className="h-serif" style={{ fontSize: 14, color: C.dim, marginTop: 4 }}>
                Goal: <span style={{ color: calRingColor, fontWeight: 600 }}>{goalInfo.label}</span> · {goalInfo.delta < 0 ? `${goalInfo.delta} cal/day` : goalInfo.delta > 0 ? `+${goalInfo.delta} cal/day` : "TDEE"}
              </div>
            </div>
            <Pill color={calRingColor}>{Math.round(calPct)}%</Pill>
          </div>

          {/* Ring */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
            <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 100 100" style={{ position: "absolute" }}>
                <circle cx="50" cy="50" r="44" stroke={C.line} strokeWidth="6" fill="none" />
                <circle
                  className="ring-progress"
                  cx="50" cy="50" r="44" stroke={calRingColor} strokeWidth="6" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - Math.min(100, calPct) / 100)}
                  style={{ transition: `stroke-dashoffset 0.75s ${SPRING}, stroke 0.3s` }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 800, color: calRingColor, lineHeight: 0.9, letterSpacing: "-0.03em" }}>
                  <AnimatedNumber value={todayCalories} format={n => Math.round(n).toLocaleString()} />
                </div>
                <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, marginTop: 2, letterSpacing: "0.08em" }}>
                  / {calorieTarget.toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.08em", marginBottom: 6 }}>
                {calRemaining >= 0 ? "REMAINING" : "OVER BUDGET"}
              </div>
              <div className="num-tab h-display" style={{
                fontSize: 32, fontWeight: 700,
                color: calRemaining >= 0 ? C.bone : C.rust,
                letterSpacing: "-0.04em", lineHeight: 0.95,
              }}>
                {calRemaining >= 0 ? Math.round(calRemaining).toLocaleString() : `+${Math.round(-calRemaining).toLocaleString()}`}
                <span style={{ fontSize: 13, color: C.dim, fontWeight: 500, marginLeft: 4 }}>cal</span>
              </div>
              <p className="h-serif" style={{ fontSize: 13, color: C.cream, margin: "10px 0 0", lineHeight: 1.4 }}>
                {goalInfo.delta < 0 ? (
                  calRemaining >= 0
                    ? (calRemaining < 200 ? "Tight margin. One snack away from over." : calRemaining < 500 ? "Solid pace. Stay disciplined." : "Plenty of room. Don't skip protein.")
                    : "Over your cut target. Tomorrow's a new day."
                ) : goalInfo.delta > 0 ? (
                  calPct >= 100 ? "Hit your bulk target. Fueled to grow." : `Need ${Math.round(calRemaining)} more to hit bulk target.`
                ) : (
                  Math.abs(calRemaining) < 100 ? "Right on maintenance. Locked in." : calRemaining > 0 ? "Room to eat more." : "Slightly over. No big deal."
                )}
              </p>
            </div>
          </div>

          {/* Calorie quick-add buttons */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
            <Eyebrow>Quick Add Calories</Eyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10 }}>
              {[100, 250, 500, 700].map(c => (
                <button key={c} onClick={() => addCalories(c)} className="btn" style={{
                  padding: "12px 0", borderRadius: 12,
                  background: calRingColor + "15", border: `1px solid ${calRingColor}40`,
                  color: calRingColor, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: FONT_DISPLAY, letterSpacing: "-0.01em",
                }}>+{c}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <NumIn
                value={customCalAmount}
                onChange={setCustomCalAmount}
                placeholder="Custom cal (e.g. 320)"
                decimal={false}
                step="10"
                style={{ flex: 1 }}
              />
              <Btn color={calRingColor} size="sm" onClick={() => {
                const v = parseFloat(customCalAmount);
                if (!isNaN(v) && v > 0) { addCalories(v); setCustomCalAmount(""); }
              }} disabled={!customCalAmount || parseFloat(customCalAmount) <= 0}>Add</Btn>
              {todayCalories > 0 && (
                <Btn ghost color={C.dim} size="sm" onClick={() => {
                  const prev = todayCalories;
                  setCaloriesAbsolute(0);
                  if (navigator.vibrate) navigator.vibrate(12);
                  toast("Calories reset to 0", { actionLabel: "UNDO", onAction: () => setCaloriesAbsolute(prev) });
                }}>↺</Btn>
              )}
            </div>
            <p className="h-serif" style={{ fontSize: 12, color: C.mute, margin: "10px 0 0", lineHeight: 1.4, fontStyle: "italic" }}>
              Tip: tapping a meal or food card below auto-adds both protein AND calories at once.
            </p>
          </div>
        </Surface>
      </div>

      {/* ── DAILY SUPPLEMENTS ── */}
      <div className="ease-up-2">
        <Surface accent={C.plum}>
          <Eyebrow color={C.plum}>Daily · Supplements</Eyebrow>
          <p className="h-serif" style={{ fontSize: 14, color: C.cream, margin: "8px 0 18px", lineHeight: 1.4 }}>
            Tap to log each day. Consistency is the cheat code — keep the streak alive.
          </p>
          <SupplementRow
            name="Vitamin D3"
            dose="5,000 IU"
            icon="☀️"
            accent={C.amber}
            blurb="Bones, joints, immune system, mood. Take with a meal that has some fat."
            log={vitaminD3Log}
            onToggle={onVitaminD3Toggle}
          />
          <div style={{ height: 1, background: C.line, margin: "18px 0" }} />
          <SupplementRow
            name="Creatine"
            dose="5 g monohydrate"
            icon="⚡"
            accent={C.electric}
            blurb="Power, explosiveness, recovery. Daily dose matters more than timing — just don't skip."
            log={creatineLog}
            onToggle={onCreatineToggle}
          />
        </Surface>
      </div>

      {/* ── GOAL MODE SELECTOR ── */}
      <div className="ease-up-2">
        <Surface accent={C[goalInfo.color]}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <Eyebrow color={C[goalInfo.color]}>Eating Goal</Eyebrow>
              <p className="h-serif" style={{ fontSize: 14, color: C.cream, margin: "8px 0 0", lineHeight: 1.4 }}>
                {goalInfo.blurb}
              </p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {Object.entries(GOAL_MODES).map(([key, info]) => {
              const active = goal === key;
              const c = C[info.color];
              return (
                <button key={key} onClick={() => setGoal(key)} className="btn" style={{
                  padding: "12px 4px", borderRadius: 12,
                  background: active ? c : "transparent",
                  border: `1px solid ${active ? c : C.line}`,
                  color: active ? C.ink : C.cream,
                  fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em",
                  cursor: "pointer",
                }}>
                  <div style={{ fontSize: 14 }}>{info.label}</div>
                  <div style={{ fontSize: 10, fontFamily: FONT_MONO, marginTop: 3, opacity: 0.85 }}>
                    {info.delta > 0 ? `+${info.delta}` : info.delta}
                  </div>
                </button>
              );
            })}
          </div>
        </Surface>
      </div>

      {/* ── BODY STATS ── */}
      <div className="ease-up-2">
        <Surface accent={C.electric}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <Eyebrow color={C.electric}>Your Stats</Eyebrow>
              <div style={{ display: "flex", gap: 18, marginTop: 12 }}>
                <div>
                  <div className="num-tab h-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: C.bone }}>
                    {heightFt}'{heightIn}"
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 3, letterSpacing: "0.08em" }}>HEIGHT</div>
                </div>
                <div>
                  <div className="num-tab h-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: C.bone }}>
                    {bodyStats.weightLbs}<span style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>lb</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 3, letterSpacing: "0.08em" }}>WEIGHT</div>
                </div>
                <div>
                  <div className="num-tab h-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: C.bone }}>
                    {bodyStats.age}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 3, letterSpacing: "0.08em" }}>AGE</div>
                </div>
              </div>
            </div>
            {!editingBody && <Btn ghost color={C.electric} size="sm" onClick={() => setEditingBody(true)}>Edit</Btn>}
          </div>

          {editingBody && (
            <div className="ease-up" style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={{ textAlign: "center" }}><Eyebrow>Height (in)</Eyebrow></div>
                  <div style={{ height: 5 }} />
                  <NumIn value={tmpHeight} onChange={setTmpHeight} decimal={true} step="0.5" placeholder="77" />
                </div>
                <div>
                  <div style={{ textAlign: "center" }}><Eyebrow>Weight (lb)</Eyebrow></div>
                  <div style={{ height: 5 }} />
                  <NumIn value={tmpWeight} onChange={setTmpWeight} decimal={true} step="0.1" placeholder="222" />
                </div>
                <div>
                  <div style={{ textAlign: "center" }}><Eyebrow>Age</Eyebrow></div>
                  <div style={{ height: 5 }} />
                  <NumIn value={tmpAge} onChange={setTmpAge} decimal={false} step="1" placeholder="47" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn ghost color={C.dim} onClick={() => { setEditingBody(false); setTmpHeight(bodyStats.heightInches); setTmpWeight(bodyStats.weightLbs); setTmpAge(bodyStats.age); }} style={{ flex: 1 }}>Cancel</Btn>
                <Btn color={C.electric} onClick={saveBody} style={{ flex: 1.5 }}>Save Stats</Btn>
              </div>
            </div>
          )}

          {/* Calculated targets */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Eyebrow color={C.rust}>Daily Protein</Eyebrow>
              <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 700, color: C.rust, letterSpacing: "-0.03em", marginTop: 6 }}>
                {proteinTarget}<span style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginLeft: 3 }}>g</span>
              </div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4 }}>1g per lb · cut + lift</div>
            </div>
            <div>
              <Eyebrow color={C[goalInfo.color]}>Daily Calories</Eyebrow>
              <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 700, color: C[goalInfo.color], letterSpacing: "-0.03em", marginTop: 6 }}>
                {calorieTarget.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4 }}>
                {goalInfo.label.toUpperCase()} · {goalInfo.delta > 0 ? `+${goalInfo.delta}` : goalInfo.delta} from TDEE
              </div>
            </div>
          </div>
        </Surface>
      </div>

      {/* ── FOOD GUIDE FILTER — horizontal scroll for 5 categories ── */}
      <div className="ease-up-3" style={{
        display: "flex", gap: 6, marginBottom: 12,
        overflowX: "auto", paddingBottom: 4,
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}>
        {Object.entries(FOOD_LISTS).map(([key, info]) => (
          <button key={key} onClick={() => setFoodFilter(key)} className="btn" style={{
            flexShrink: 0, padding: "10px 14px",
            background: foodFilter === key ? info.color : "transparent",
            border: `1px solid ${foodFilter === key ? info.color : C.line}`,
            color: foodFilter === key ? C.ink : C.cream,
            borderRadius: 12, cursor: "pointer",
            fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 14, marginRight: 4 }}>{info.icon}</span>
            {info.label}
          </button>
        ))}
      </div>

      <div className="ease-up-4">
        <Surface accent={activeList.color}>
          <div style={{ marginBottom: 14 }}>
            <Eyebrow color={activeList.color}>{activeList.label} · Kosher</Eyebrow>
            <p className="h-serif" style={{ fontSize: 16, color: C.cream, margin: "8px 0 0", lineHeight: 1.4 }}>
              {activeList.blurb}
            </p>
          </div>

          {activeList.type === "meal" ? (
            /* ── MEAL CARDS — full plate view ── */
            activeList.items.map((meal, i) => (
              <div key={i} style={{
                padding: "18px 0",
                borderBottom: i < activeList.items.length - 1 ? `1px solid ${C.line}` : "none",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.bone, letterSpacing: "-0.015em", marginBottom: 4 }}>
                      {meal.name}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <span className="num-tab" style={{
                        fontSize: 13, color: activeList.color, fontWeight: 700, fontFamily: FONT_MONO,
                      }}>{meal.totalProtein}g protein</span>
                      <span style={{ fontSize: 11, color: C.mute, fontFamily: FONT_MONO }}>·</span>
                      <span className="num-tab" style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>
                        ~{meal.calories} cal
                      </span>
                    </div>
                    {meal.timing && (
                      <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 6, letterSpacing: "0.05em" }}>
                        {meal.timing.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button onClick={() => logFood(meal)} className="btn" style={{
                    background: activeList.color + "15",
                    border: `1px solid ${activeList.color}40`,
                    color: activeList.color,
                    padding: "10px 14px", borderRadius: 10,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: FONT_DISPLAY, flexShrink: 0,
                  }}>
                    LOG MEAL<br/>
                    <span style={{ fontSize: 13 }}>+{meal.totalProtein}g · {meal.calories}c</span>
                  </button>
                </div>

                {/* Components — what's actually on the plate */}
                <div style={{
                  background: C.raised, borderRadius: 10, padding: "12px 14px",
                  border: `1px solid ${C.line}`, marginTop: 8,
                }}>
                  <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, letterSpacing: "0.08em", marginBottom: 8 }}>
                    ON THE PLATE
                  </div>
                  {meal.components.map((c, ci) => (
                    <div key={ci} style={{
                      fontSize: 13, color: C.cream, lineHeight: 1.5,
                      paddingLeft: 14, position: "relative", marginBottom: 3,
                    }}>
                      <span style={{ position: "absolute", left: 0, color: activeList.color }}>›</span>
                      {c}
                    </div>
                  ))}
                </div>

                {meal.why && (
                  <p className="h-serif" style={{ fontSize: 13, color: C.dim, margin: "10px 0 0", lineHeight: 1.45, fontStyle: "italic" }}>
                    {meal.why}
                  </p>
                )}
                {meal.bestFor && (
                  <div style={{
                    display: "inline-block",
                    fontSize: 10, color: activeList.color, fontFamily: FONT_MONO,
                    letterSpacing: "0.05em", marginTop: 8,
                    padding: "3px 8px", borderRadius: 6,
                    background: activeList.color + "10",
                    border: `1px solid ${activeList.color}30`,
                  }}>
                    BEST FOR: {meal.bestFor.toUpperCase()}
                  </div>
                )}
              </div>
            ))
          ) : (
            /* ── QUICK CARDS — single ingredient/product view ── */
            activeList.items.map((food, i) => (
              <div key={i} style={{
                padding: "14px 0",
                borderBottom: i < activeList.items.length - 1 ? `1px solid ${C.line}` : "none",
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.bone, letterSpacing: "-0.01em" }}>{food.name}</span>
                    <span className="num-tab" style={{
                      fontSize: 12, color: activeList.color, fontWeight: 700, fontFamily: FONT_MONO,
                    }}>{food.protein}g</span>
                    {food.calories && (
                      <span className="num-tab" style={{
                        fontSize: 11, color: C.dim, fontFamily: FONT_MONO,
                      }}>· {food.calories} cal</span>
                    )}
                  </div>
                  {food.timing && (
                    <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4, letterSpacing: "0.05em" }}>
                      {food.timing.toUpperCase()}
                    </div>
                  )}
                  <p className="h-serif" style={{ fontSize: 13, color: C.dim, margin: "4px 0 0", lineHeight: 1.4 }}>
                    {food.note}
                  </p>
                </div>
                <button onClick={() => logFood(food)} className="btn" style={{
                  background: activeList.color + "15",
                  border: `1px solid ${activeList.color}40`,
                  color: activeList.color,
                  padding: "8px 14px", borderRadius: 10,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: FONT_DISPLAY, flexShrink: 0,
                }}>
                  +{food.protein}g{food.calories ? <><br/><span style={{ fontSize: 10, opacity: 0.85 }}>{food.calories}c</span></> : null}
                </button>
              </div>
            ))
          )}
        </Surface>
      </div>

      {/* ── KOSHER NOTES ── */}
      <Surface accent={C.plum} padding={20}>
        <Eyebrow color={C.plum}>Kosher Notes</Eyebrow>
        <p className="h-serif" style={{ fontSize: 15, color: C.cream, margin: "10px 0 0", lineHeight: 1.5 }}>
          All items above are commonly available with reliable hechshers (OU, OK, Star-K). Fairlife Core Power and Quest Bars are widely OU certified — easy gym-bag staples. Always double-check the label, since certifications change. For meat/dairy timing, plan post-workout shakes around your meals.
        </p>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
          <Eyebrow color={C.amber}>Hydration</Eyebrow>
          <p className="h-serif" style={{ fontSize: 14, color: C.cream, margin: "8px 0 0", lineHeight: 1.5 }}>
            Target ~{Math.round(bodyStats.weightLbs * 0.6)} oz water per day. Add 16–24 oz extra on training days. Electrolytes (LMNT, plain salt + lemon) on heavy sweat sessions.
          </p>
        </div>
      </Surface>

      <p className="h-serif" style={{ textAlign: "center", color: C.dim, fontSize: 16, margin: "24px 0 0" }}>
        "You are what you eat. Eat to be unstoppable."
        <span style={{ display: "block", fontFamily: FONT_MONO, fontStyle: "normal", fontSize: 10, letterSpacing: "0.15em", marginTop: 6 }}>— THE WORK</span>
      </p>
    </>
  );
}

/* ── datetime-local <input> helper (local time, not UTC) ── */
function toLocalInput(d) {
  const x = new Date(d); const p = n => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}

/* ════════════════════════════════════════════════════════════
   TODAY CARD — the recovery engine's recommendation, front & center
   ════════════════════════════════════════════════════════════ */
function TodayCard({ cardioSessions, workouts, onOpenLogger, onChooseLift, onGoWalk }) {
  const [showOverride, setShowOverride] = useState(false);
  const engine = normalizeAll(cardioSessions, workouts);
  const today = startOfDay(new Date());
  const plan = buildPlan(engine, today, RECOVERY.planDays);
  const rec = plan[0];
  const s7 = trailingSummary(engine, today, 7);
  const s30 = trailingSummary(engine, today, 30);
  const { streak, layoff } = streakInfo(engine, today);

  // Short label for one scheduled item (lifts show their A/B/C day).
  const itemLabel = (it) => RECOVERY.TYPES[it.type].short;
  const itemsOf = (p) => (p.action === "train" ? (p.items || []) : []);

  const items = itemsOf(rec);
  const trained = items.length > 0;
  const primDef = trained ? RECOVERY.TYPES[items[0].type] : null;
  const recColor = trained ? C[primDef.colorKey] : C.dim;
  const headEmoji = trained ? items.map(it => RECOVERY.TYPES[it.type].emoji).join(" ") : "🛌";
  const headline = trained ? items.map(itemLabel).join(" + ") : "Rest";

  // Tap a scheduled item → take the right action (log sheet, or jump to the tab).
  const actOn = (it, warn) => {
    if (it.type === "lift") onChooseLift();
    else if (it.type === "walk") onGoWalk();
    else onOpenLogger(warn ? { prefillType: it.type, warn } : { prefillType: it.type });
  };
  const actLabel = (it) => it.type === "lift" ? "🏋️ Lift" : it.type === "walk" ? "🚶 Log a walk" : `${RECOVERY.TYPES[it.type].emoji} ${RECOVERY.TYPES[it.type].short}`;

  const bandNote = {
    restart: layoff != null ? `Restart · ${layoff}d layoff` : "Restart",
    ease: layoff != null ? `Ease back · ${layoff}d off` : "Ease back",
    fresh: "Day one",
    normal: null,
  }[rec.band];

  return (
    <Surface accent={recColor} padding={22}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Eyebrow color={recColor}>Today · {new Date().toLocaleDateString("en-US", { weekday: "long" })}</Eyebrow>
        {bandNote && <span style={{ fontSize: 10, color: C.amber, fontFamily: FONT_MONO, letterSpacing: "0.06em" }}>{bandNote}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
        <span style={{ fontSize: 30, lineHeight: 1 }}>{headEmoji}</span>
        <h2 className="h-display" style={{ fontSize: 32, margin: 0, color: recColor, letterSpacing: "-0.04em", lineHeight: 1 }}>{headline}</h2>
      </div>
      <p className="h-serif" style={{ fontSize: 17, color: C.cream, margin: "10px 0 0", lineHeight: 1.45 }}>{rec.reason}</p>

      {(rec.flags || []).map((f, i) => (
        <div key={i} style={{ marginTop: 10, fontSize: 12, color: C.red, fontFamily: FONT_MONO, display: "flex", gap: 6, alignItems: "center" }}>⚠ {f}</div>
      ))}

      {/* Primary action(s) — one button per scheduled item (e.g. Tabata + Lift) */}
      {trained ? (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {items.map((it, i) => (
            <Btn key={i} color={C[RECOVERY.TYPES[it.type].colorKey]} full={items.length === 1} size="lg" style={{ flex: 1 }} onClick={() => actOn(it)}>
              {actLabel(it)}
            </Btn>
          ))}
        </div>
      ) : (
        <>
          <Btn color={C.dim} ghost full style={{ marginTop: 16 }} onClick={() => setShowOverride(v => !v)}>
            {showOverride ? "Never mind" : "Train anyway →"}
          </Btn>
          {showOverride && (
            <div className="ease-up" style={{ marginTop: 12, padding: 14, borderRadius: 12, background: `${C.amber}12`, border: `1px solid ${C.amber}40` }}>
              <div style={{ fontSize: 12, color: C.amber, fontFamily: FONT_MONO, marginBottom: 10, lineHeight: 1.5 }}>⚠ Today's a recovery day. Pushing through cuts into recovery — go lighter than usual.</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[{ type: "tabata" }, { type: "long_interval" }, { type: "lift" }, { type: "walk" }].map((it, i) => {
                  const d = RECOVERY.TYPES[it.type];
                  return <Btn key={i} color={C[d.colorKey]} size="sm" style={{ flex: "1 1 40%" }} onClick={() => actOn(it, "Recovery day — logging this as an override.")}>{actLabel(it)}</Btn>;
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tentative next-days plan */}
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
        <Eyebrow>Coming up</Eyebrow>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {plan.slice(1).map((p, i) => {
            const its = itemsOf(p);
            const col = its.length ? C[RECOVERY.TYPES[its[0].type].colorKey] : C.dim;
            const emoji = its.length ? its.map(it => RECOVERY.TYPES[it.type].emoji).join("") : "🛌";
            const lbl = its.length ? its.map(itemLabel).join(" + ") : "Rest";
            return (
              <div key={i} style={{ flex: 1, padding: "10px 6px", borderRadius: 12, background: C.raised, border: `1px solid ${C.line}`, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.06em" }}>{p.date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</div>
                <div style={{ fontSize: 17, marginTop: 6 }}>{emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: col, marginTop: 4, lineHeight: 1.2 }}>{lbl}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, marginTop: 8 }}>Tentative — updates every time you log.</div>
      </div>

      {/* Trailing summaries */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[["7-DAY", s7], ["30-DAY", s30]].map(([lbl, s]) => (
          <div key={lbl} style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.08em" }}>{lbl}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
              <span className="num-tab h-display" style={{ fontSize: 24, fontWeight: 700, color: C.bone, letterSpacing: "-0.03em" }}>{s.count}</span>
              <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO }}>· {s.hard} hard</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 11, fontFamily: FONT_MONO, color: C.dim, flexWrap: "wrap" }}>
              {["tabata", "long_interval", "lift", "walk", "game"].map(k => (
                <span key={k} title={RECOVERY.TYPES[k].label}>{RECOVERY.TYPES[k].emoji} {s.byType[k]}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: C.dim, fontFamily: FONT_MONO }}>
        <span>{streak > 0 ? `🔥 ${streak}-day streak` : (layoff != null ? `${layoff}d since last session` : "No sessions yet")}</span>
        <button onClick={() => onOpenLogger({})} className="btn" style={{ background: "transparent", border: "none", color: C.electric, fontFamily: FONT_MONO, fontSize: 11, cursor: "pointer", padding: 0, fontWeight: 700 }}>+ Log a session</button>
      </div>
    </Surface>
  );
}

/* ════════════════════════════════════════════════════════════
   CONDITIONING LOGGER — log / edit Tabata · Long Interval · Game
   Supports retroactive date+time, optional RPE, duration, notes.
   ════════════════════════════════════════════════════════════ */
function ConditioningLogger({ state, onClose, onSave, onDelete }) {
  const editing = state.editing || null;
  const initType = state.prefillType || (editing && editing.workout_type) || "tabata";
  const [type, setType] = useState(initType);
  const [touchedRpe, setTouchedRpe] = useState(editing ? editing.rpe != null : false);
  const [when, setWhen] = useState(editing ? toLocalInput(editing.completed_at) : toLocalInput(new Date()));
  const [duration, setDuration] = useState(editing && editing.duration_min != null ? String(editing.duration_min) : "");
  const [rpe, setRpe] = useState(editing && editing.rpe != null ? Number(editing.rpe) : RECOVERY.TYPES[initType].defaultRPE);
  const [notes, setNotes] = useState(editing ? (editing.notes || "") : "");

  const def = RECOVERY.TYPES[type];
  const chooseType = (tk) => { setType(tk); if (!touchedRpe) setRpe(RECOVERY.TYPES[tk].defaultRPE); };

  const save = () => {
    onSave({
      id: editing ? editing.id : undefined,
      type,
      completed_at: new Date(when).toISOString(),
      duration_min: duration !== "" ? Number(duration) : def.defaultDurationMin,
      rpe,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="backdrop" style={{ alignItems: "flex-end", padding: 0 }} onClick={onClose}>
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, margin: "0 auto",
        background: C.panel, borderRadius: "22px 22px 0 0",
        borderTop: `1px solid ${C.line}`, padding: "10px 18px calc(24px + env(safe-area-inset-bottom))",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: C.faint, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <h2 className="h-display" style={{ fontSize: 22, fontWeight: 700, color: C.bone, margin: 0, letterSpacing: "-0.03em" }}>{editing ? "Edit session" : "Log a session"}</h2>
          <button onClick={onClose} className="btn" style={{ border: "none", background: "transparent", color: C.dim, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {state.warn && (
          <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: `${C.amber}12`, border: `1px solid ${C.amber}40`, color: C.amber, fontSize: 12, fontFamily: FONT_MONO, lineHeight: 1.4 }}>⚠ {state.warn}</div>
        )}

        {/* Type */}
        <Eyebrow>Type</Eyebrow>
        <div style={{ display: "flex", gap: 8, margin: "8px 0 18px" }}>
          {Object.values(RECOVERY.TYPES).map(t => {
            const on = type === t.key; const col = C[t.colorKey];
            return (
              <button key={t.key} className="btn" onClick={() => chooseType(t.key)} style={{
                flex: 1, padding: "12px 6px", borderRadius: 12, cursor: "pointer",
                border: `1px solid ${on ? col : C.line}`, background: on ? `${col}18` : C.raised,
                color: on ? col : C.cream, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 20 }}>{t.emoji}</span>{t.short}
              </button>
            );
          })}
        </div>

        {/* When */}
        <Eyebrow>When</Eyebrow>
        <input type="datetime-local" value={when} max={toLocalInput(new Date())} onChange={e => setWhen(e.target.value)}
          style={{ width: "100%", margin: "8px 0 18px", background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: FONT_DISPLAY }} />

        {/* Duration */}
        <Eyebrow>Duration (min)</Eyebrow>
        <input type="number" inputMode="numeric" min="1" placeholder={String(def.defaultDurationMin)} value={duration} onChange={e => setDuration(e.target.value)}
          style={{ width: "100%", margin: "8px 0 18px", background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: FONT_MONO }} />

        {/* RPE */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Eyebrow>Perceived intensity (RPE)</Eyebrow>
          <span className="num-tab h-display" style={{ fontSize: 20, fontWeight: 700, color: C[def.colorKey] }}>{rpe}<span style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>/10</span></span>
        </div>
        <input type="range" min="1" max="10" step="1" value={rpe} onChange={e => { setRpe(Number(e.target.value)); setTouchedRpe(true); }}
          style={{ width: "100%", margin: "10px 0 4px", accentColor: C[def.colorKey] }} />
        <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, marginBottom: 18 }}>Default for {def.label}: {def.defaultRPE}. Adjust if it felt easier or harder.</div>

        {/* Notes */}
        <Eyebrow>Notes (optional)</Eyebrow>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. felt strong, legs heavy…"
          style={{ width: "100%", margin: "8px 0 18px", background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "12px 14px", fontSize: 14, outline: "none" }} />

        <Btn color={C[def.colorKey]} full size="lg" onClick={save}>{editing ? "Save changes" : `Log ${def.label}`}</Btn>
        {editing && (
          <button onClick={() => onDelete(editing.id)} className="btn" style={{ width: "100%", marginTop: 10, padding: "12px", borderRadius: 12, border: `1px solid ${C.red}40`, background: "transparent", color: C.red, fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete session</button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   GAMIFICATION UI — level hero, achievement grid, celebrations
   ════════════════════════════════════════════════════════════ */
function LevelHero({ game, streak, onOpenAwards }) {
  const pct = Math.round(game.progress * 100);
  const toNext = Math.max(0, game.span - game.into);
  const xp = useCountUp(game.totalXP, 700);
  return (
    <Surface accent={C.rust} padding={20} onClick={onOpenAwards} className="card-tap">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Level medallion */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg, ${C.rust}, ${C.amber})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 6px 18px ${C.rust}44` }}>
            <span style={{ fontSize: 9, color: "#fff", fontFamily: FONT_MONO, letterSpacing: "0.1em", opacity: 0.85, marginBottom: -2 }}>LVL</span>
            <span className="num-tab h-display" style={{ fontSize: 30, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{game.level}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="h-display" style={{ fontSize: 20, fontWeight: 800, color: C.bone, letterSpacing: "-0.03em" }}>{game.rank}</div>
            {streak > 0 && <span style={{ fontSize: 12, color: C.rust, fontFamily: FONT_MONO, fontWeight: 700 }}>🔥 {streak}d</span>}
          </div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginTop: 2 }}>{Math.round(xp).toLocaleString()} XP · {toNext} to level {game.level + 1}</div>
          {/* XP bar */}
          <div style={{ marginTop: 8, height: 10, borderRadius: 999, background: C.raised, border: `1px solid ${C.line}`, overflow: "hidden" }}>
            <div style={{ width: pct + "%", height: "100%", background: `linear-gradient(90deg, ${C.rust}, ${C.amber})`, borderRadius: 999, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", gap: 4 }}>
          {game.achievements.slice(0, 6).map(a => (
            <span key={a.id} style={{ fontSize: 17, filter: a.unlocked ? "none" : "grayscale(1)", opacity: a.unlocked ? 1 : 0.3 }}>{a.emoji}</span>
          ))}
        </div>
        <span style={{ fontSize: 11, color: C.electric, fontFamily: FONT_MONO, fontWeight: 700 }}>{game.unlockedCount}/{game.achievements.length} badges →</span>
      </div>
    </Surface>
  );
}

function AchievementsSheet({ game, onClose }) {
  const sorted = [...game.achievements].sort((a, b) => (b.unlocked - a.unlocked) || (b.progress - a.progress));
  return (
    <div className="backdrop" style={{ alignItems: "flex-end", padding: 0 }} onClick={onClose}>
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, margin: "0 auto", background: C.panel,
        borderRadius: "22px 22px 0 0", borderTop: `1px solid ${C.line}`,
        padding: "10px 18px calc(24px + env(safe-area-inset-bottom))", maxHeight: "88vh", overflowY: "auto",
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: C.faint, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h2 className="h-display" style={{ fontSize: 22, fontWeight: 700, color: C.bone, margin: 0, letterSpacing: "-0.03em" }}>Trophy Case</h2>
          <button onClick={onClose} className="btn" style={{ border: "none", background: "transparent", color: C.dim, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO, marginBottom: 16 }}>Level {game.level} · {game.rank} · {game.unlockedCount}/{game.achievements.length} unlocked</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {sorted.map(a => (
            <div key={a.id} style={{
              background: a.unlocked ? `${C.rust}10` : C.raised, border: `1px solid ${a.unlocked ? C.rust + "55" : C.line}`,
              borderRadius: 14, padding: 14, position: "relative", overflow: "hidden",
            }}>
              <div style={{ fontSize: 30, filter: a.unlocked ? "none" : "grayscale(1)", opacity: a.unlocked ? 1 : 0.35 }}>{a.emoji}</div>
              <div className="h-display" style={{ fontSize: 14, fontWeight: 700, color: a.unlocked ? C.bone : C.dim, marginTop: 8, letterSpacing: "-0.01em" }}>{a.name}</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 2, lineHeight: 1.35 }}>{a.desc}</div>
              {a.unlocked ? (
                <div style={{ fontSize: 10, color: C.rust, fontFamily: FONT_MONO, fontWeight: 700, marginTop: 8 }}>✓ UNLOCKED</div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 5, borderRadius: 999, background: C.faint, overflow: "hidden" }}>
                    <div style={{ width: Math.round(a.progress * 100) + "%", height: "100%", background: C.amber, borderRadius: 999 }} />
                  </div>
                  <div style={{ fontSize: 9, color: C.mute, fontFamily: FONT_MONO, marginTop: 4 }}>{Math.min(a.value, a.goal)}/{a.goal}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Full-screen dopamine hit when a new level or badge lands. Cycles a queue.
function CelebrationOverlay({ queue, onClose }) {
  const [i, setI] = useState(0);
  const item = queue[i];
  useEffect(() => {
    getAudioCtx(); beep(660, 0.1, 0.35);
    setTimeout(() => beep(880, 0.12, 0.4), 120);
    setTimeout(() => beep(1175, 0.18, 0.45), 260);
    if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
  }, [i]);
  if (!item) return null;
  const next = () => { if (i + 1 < queue.length) setI(i + 1); else onClose(); };
  const isLevel = item.kind === "level";
  const accent = isLevel ? C.amber : C.rust;
  return (
    <div className="backdrop" style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }} onClick={next}>
      <div className="celebrate-pop" onClick={e => e.stopPropagation()} style={{
        width: "86%", maxWidth: 360, background: C.panel, borderRadius: 24, border: `1px solid ${accent}55`,
        padding: "32px 24px", textAlign: "center", boxShadow: `0 20px 60px ${accent}33`,
      }}>
        <div style={{ fontSize: 11, color: accent, fontFamily: FONT_MONO, letterSpacing: "0.2em", fontWeight: 700 }}>
          {isLevel ? "LEVEL UP" : "ACHIEVEMENT UNLOCKED"}
        </div>
        <div className="celebrate-emoji" style={{ fontSize: 76, margin: "16px 0 8px", lineHeight: 1 }}>{isLevel ? "⬆️" : item.emoji}</div>
        <h2 className="h-display" style={{ fontSize: 30, fontWeight: 800, color: C.bone, margin: 0, letterSpacing: "-0.03em" }}>{item.title}</h2>
        <p className="h-serif" style={{ fontSize: 17, color: C.cream, margin: "8px 0 0" }}>{item.subtitle}</p>
        <Btn color={accent} full size="lg" style={{ marginTop: 22 }} onClick={next}>{i + 1 < queue.length ? "Next" : "Let's go 🔥"}</Btn>
        {queue.length > 1 && <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, marginTop: 10 }}>{i + 1} / {queue.length}</div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   HOME — consistency-first home screen
   ════════════════════════════════════════════════════════════ */
function HomeTab({ bodyStats, history, cardioSessions, weightLog, game, proteinLog, vitaminD3Log, creatineLog, onGoTab, onOpenLogger, onOpenAwards, onChooseLift, onGoWalk, theme, onToggleTheme }) {
  const today = todayKey();
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Daily rings
  const trainedToday = [
    ...history.map(h => new Date(h.logged_at)),
    ...cardioSessions.map(s => new Date(s.completed_at)),
  ].some(d => d.toDateString() === new Date().toDateString());
  const proteinTarget = calcProteinTarget(bodyStats.weightLbs);
  const todayProtein = proteinLog[today] || 0;
  const suppCount = (vitaminD3Log[today] ? 1 : 0) + (creatineLog[today] ? 1 : 0);

  const rings = [
    { label: "Train", pct: trainedToday ? 100 : 0, color: C.rust, center: trainedToday ? "✓" : "—", sub: trainedToday ? "Logged" : "Not yet", onTap: () => onGoTab("workout") },
    { label: "Fuel", pct: Math.min(100, (todayProtein / proteinTarget) * 100), color: C.amber, center: `${Math.round(Math.min(100, (todayProtein / proteinTarget) * 100))}`, sub: `${Math.round(todayProtein)}/${proteinTarget}g`, onTap: () => onGoTab("nutrition") },
    { label: "Stack", pct: (suppCount / 2) * 100, color: C.electric, center: `${suppCount}/2`, sub: suppCount === 2 ? "Dialed" : "Pending", onTap: () => onGoTab("nutrition") },
  ];

  const R = 40;
  const CIRC = 2 * Math.PI * R;

  /* ── MOMENTUM — combined training density over the last 14 days ── */
  const activeDays = new Set([
    ...history.map(h => new Date(h.logged_at).toDateString()),
    ...cardioSessions.map(s => new Date(s.completed_at).toDateString()),
  ]);
  const strip = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    strip.push({ key: d.toDateString(), active: activeDays.has(d.toDateString()), isToday: i === 0 });
  }
  const last7 = strip.slice(-7).filter(d => d.active).length;
  const last14 = strip.filter(d => d.active).length;
  // Consecutive-day streak (today not-yet-logged still counts as live).
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    if (activeDays.has(d.toDateString())) streak++;
    else if (i === 0) continue;
    else break;
  }
  // How long since the last session?
  let lastAgo = null;
  for (let i = 0; i < 60; i++) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    if (activeDays.has(d.toDateString())) { lastAgo = i; break; }
  }
  let momentumVerdict, momentumColor;
  if (trainedToday) { momentumVerdict = "On fire. You showed up today."; momentumColor = C.moss; }
  else if (lastAgo === 1) { momentumVerdict = "Momentum's hot — keep it rolling."; momentumColor = C.amber; }
  else if (lastAgo !== null && lastAgo <= 3) { momentumVerdict = "Don't let it cool. Get one in."; momentumColor = C.amber; }
  else if (lastAgo === null) { momentumVerdict = "Day one starts the second you log."; momentumColor = C.rust; }
  else { momentumVerdict = "Restart the engine. One session does it."; momentumColor = C.rust; }

  const [quoteText, quoteAuthor] = quoteOfDay();

  return (
    <>
      {/* ── Header ── */}
      <div className="ease-up" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Eyebrow>{dateStr}</Eyebrow>
          <button
            className="btn"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              flexShrink: 0, width: 38, height: 38, borderRadius: 999,
              border: `1px solid ${C.line}`, background: C.panel, color: C.bone,
              fontSize: 17, lineHeight: 1, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", padding: 0,
            }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
        <h1 className="h-display" style={{ fontSize: 34, margin: "8px 0 4px", color: C.bone, letterSpacing: "-0.04em", lineHeight: 1 }}>
          {greeting()}.
        </h1>
        <p className="h-serif" style={{ fontSize: 16, color: C.dim, margin: "6px 0 0", lineHeight: 1.4 }}>
          Small reps, stacked daily. That's the whole game.
        </p>
      </div>

      {/* ── LEVEL / XP / BADGES — progression spine ── */}
      <div className="ease-up-1" style={{ marginBottom: 14 }}>
        <LevelHero game={game} streak={game.stats.currentStreak} onOpenAwards={onOpenAwards} />
      </div>

      {/* ── TODAY — recovery engine recommendation, front & center ── */}
      <div className="ease-up-2" style={{ marginBottom: 18 }}>
        <TodayCard cardioSessions={cardioSessions} workouts={history} onOpenLogger={onOpenLogger} onChooseLift={onChooseLift} onGoWalk={onGoWalk} />
      </div>

      {/* ── DAILY RINGS — close them every day ── */}
      <div className="ease-up-1">
        <Surface>
          <Eyebrow>Today · Close the rings</Eyebrow>
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 16 }}>
            {rings.map(r => {
              const pct = Math.min(100, r.pct);
              return (
                <div key={r.label} onClick={r.onTap} className="card-tap" style={{ textAlign: "center", cursor: "pointer", flex: 1 }}>
                  <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto" }}>
                    <svg width="90" height="90" viewBox="0 0 100 100" style={{ position: "absolute" }}>
                      <circle cx="50" cy="50" r={R} stroke={C.line} strokeWidth="8" fill="none" />
                      <circle
                        className="ring-progress"
                        cx="50" cy="50" r={R} stroke={r.color} strokeWidth="8" fill="none"
                        strokeLinecap="round"
                        strokeDasharray={CIRC}
                        strokeDashoffset={CIRC * (1 - pct / 100)}
                        transform="rotate(-90 50 50)"
                        style={{ transition: `stroke-dashoffset 0.75s ${SPRING}` }}
                      />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="num-tab h-display" style={{ fontSize: 20, fontWeight: 800, color: r.color, letterSpacing: "-0.02em" }}>{r.center}</span>
                    </div>
                  </div>
                  <div className="h-display" style={{ fontSize: 13, fontWeight: 700, color: C.bone, marginTop: 8 }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 2 }}>{r.sub}</div>
                </div>
              );
            })}
          </div>
        </Surface>
      </div>

      {/* ── MOMENTUM — 14-day activity + a nudge back in ── */}
      <div className="ease-up-2">
        <Surface accent={momentumColor}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <Eyebrow color={momentumColor}>Momentum · last 14 days</Eyebrow>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
                {streak > 0 && <span style={{ fontSize: 22 }}>🔥</span>}
                <span className="num-tab h-display" style={{ fontSize: 32, fontWeight: 800, color: streak > 0 ? momentumColor : C.dim, letterSpacing: "-0.04em", lineHeight: 1 }}>{streak}</span>
                <span style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>day streak</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 700, color: C.bone, letterSpacing: "-0.03em", lineHeight: 1 }}>{last7}<span style={{ fontSize: 12, color: C.dim, fontWeight: 500 }}>/7</span></div>
              <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, marginTop: 3, letterSpacing: "0.06em" }}>THIS WEEK · {last14} IN 14D</div>
            </div>
          </div>

          {/* Activity strip */}
          <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
            {strip.map((d, i) => (
              <div key={i} title={d.key} style={{
                flex: 1, height: 26, borderRadius: 5,
                background: d.active ? momentumColor : C.raised,
                border: `1px solid ${d.active ? momentumColor : C.line}`,
                outline: d.isToday ? `1.5px solid ${C.bone}` : "none", outlineOffset: 1,
                transition: "background 0.3s",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: C.mute, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>
            <span>14 DAYS AGO</span><span>TODAY</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
            <p className="h-serif" style={{ fontSize: 15, color: C.cream, margin: 0, lineHeight: 1.4, flex: 1 }}>{momentumVerdict}</p>
            {!trainedToday && (
              <Btn color={momentumColor} size="sm" onClick={() => onGoTab("workout")} style={{ flexShrink: 0 }}>Train →</Btn>
            )}
          </div>
        </Surface>
      </div>

      {/* ── DAILY HYPE ── */}
      <div className="ease-up-3">
        <Surface accent={C.rust} padding={22}>
          <Eyebrow color={C.rust}>Today's word</Eyebrow>
          <p className="h-serif" style={{ fontSize: 22, color: C.bone, margin: "12px 0 0", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
            "{quoteText}"
          </p>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.15em", marginTop: 12, color: C.mute }}>— {quoteAuthor}</div>
        </Surface>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   APP
   ════════════════════════════════════════════════════════════ */

/* ── Sign-in gate — passwordless magic link. The app is private; nothing
   loads until the owner clicks the link emailed to them. ── */
function AuthGate() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email"); // email | code
  const [status, setStatus] = useState("idle"); // idle | sending | verifying | error
  const [errMsg, setErrMsg] = useState("");

  // Step 1 — email a 6-digit code (no link, so login finishes inside this app).
  const sendCode = async () => {
    const addr = email.trim();
    if (!addr || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) { setStatus("error"); setErrMsg("Enter a valid email."); return; }
    setStatus("sending"); setErrMsg("");
    const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { shouldCreateUser: true } });
    if (error) { setStatus("error"); setErrMsg(error.message); }
    else { setStatus("idle"); setStep("code"); setCode(""); }
  };

  // Step 2 — verify the code right here; supabase establishes the session
  // in THIS context (home-screen app or browser), no redirect needed.
  const verify = async () => {
    const token = code.replace(/\D/g, "");
    if (token.length < 6) { setStatus("error"); setErrMsg("Enter the 6-digit code."); return; }
    setStatus("verifying"); setErrMsg("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
    if (error) { setStatus("error"); setErrMsg(error.message || "That code didn't work — try again."); }
    // On success, onAuthStateChange handles the rest.
  };

  return (
    <div className="court-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="ease-up" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${C.rust}, ${C.amber})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 14px" }}>💪</div>
          <h1 className="h-display" style={{ fontSize: 26, fontWeight: 700, color: C.bone, letterSpacing: "-0.03em", margin: 0 }}>The Work</h1>
          <p className="h-serif" style={{ fontSize: 16, color: C.dim, margin: "8px 0 0" }}>Your private training log. Sign in to continue.</p>
        </div>

        <Surface padding={22}>
          {step === "code" ? (
            <>
              <Eyebrow>Enter the code</Eyebrow>
              <p className="h-serif" style={{ fontSize: 15, color: C.dim, margin: "8px 0 14px", lineHeight: 1.5 }}>
                We emailed a 6-digit code to <strong style={{ color: C.cream }}>{email.trim()}</strong>. Type it in below.
              </p>
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="Enter code"
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} onKeyDown={e => e.key === "Enter" && verify()}
                style={{ width: "100%", margin: "0 0 14px", background: C.raised, border: `1px solid ${status === "error" ? C.red : C.line}`, borderRadius: 12, color: C.bone, padding: "14px", fontSize: 26, letterSpacing: "0.2em", textAlign: "center", outline: "none", fontFamily: FONT_MONO }}
              />
              {status === "error" && <div style={{ fontSize: 12, color: C.red, fontFamily: FONT_MONO, marginBottom: 12 }}>⚠ {errMsg}</div>}
              <Btn color={C.rust} full size="lg" onClick={verify} disabled={status === "verifying"}>
                {status === "verifying" ? "Verifying…" : "Sign in"}
              </Btn>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                <button onClick={() => { setStep("email"); setStatus("idle"); setErrMsg(""); }} className="btn" style={{ background: "transparent", border: "none", color: C.dim, fontFamily: FONT_MONO, fontSize: 12, cursor: "pointer", padding: 0 }}>← Change email</button>
                <button onClick={sendCode} disabled={status === "sending"} className="btn" style={{ background: "transparent", border: "none", color: C.electric, fontFamily: FONT_MONO, fontSize: 12, cursor: "pointer", padding: 0 }}>{status === "sending" ? "Sending…" : "Resend code"}</button>
              </div>
            </>
          ) : (
            <>
              <Eyebrow>Email</Eyebrow>
              <input
                type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendCode()}
                style={{ width: "100%", margin: "8px 0 14px", background: C.raised, border: `1px solid ${status === "error" ? C.red : C.line}`, borderRadius: 12, color: C.bone, padding: "13px 14px", fontSize: 16, outline: "none", fontFamily: FONT_DISPLAY }}
              />
              {status === "error" && <div style={{ fontSize: 12, color: C.red, fontFamily: FONT_MONO, marginBottom: 12 }}>⚠ {errMsg}</div>}
              <Btn color={C.rust} full size="lg" onClick={sendCode} disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Email me a code"}
              </Btn>
              <p style={{ fontSize: 11, color: C.mute, fontFamily: FONT_MONO, margin: "14px 0 0", lineHeight: 1.5, textAlign: "center" }}>
                No password. We email you a 6-digit code to type in here.
              </p>
            </>
          )}
        </Surface>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(loadThemePref);
  // Synchronous so this render's inline styles read the current palette.
  applyThemePalette(theme);
  // CSS-level baked colors (body bg, .court-bg, .backdrop) + persistence.
  useEffect(() => {
    injectStyles(true);
    try { localStorage.setItem(LS_THEME, theme); } catch (e) {}
  }, [theme]);
  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(true);
  // Auth — the app is private; data is only loaded for the signed-in owner.
  const [authSession, setAuthSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeSession, setActiveSession] = useState(0);
  const [checked, setChecked] = useState({});
  const [vals, setVals] = useState({});
  const [history, setHistory] = useState([]);
  const [expandedLog, setExpandedLog] = useState({});
  const [weightLog, setWeightLog] = useState([]);
  const [weightInput, setWeightInput] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [cardioSessions, setCardioSessions] = useState([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // Conditioning logger sheet: { open, prefillType?, warn?, editing? }
  const [loggerState, setLoggerState] = useState({ open: false });
  const [restTimer, setRestTimer] = useState(null); // null or { seconds }
  const [confetti, setConfetti] = useState(false);
  // Gamification
  const [awardsOpen, setAwardsOpen] = useState(false);
  const [celebration, setCelebration] = useState(null); // null or [{kind,title,subtitle,emoji}]
  const [restEnabled, setRestEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Body stats + protein log + calorie log (localStorage-backed)
  const [bodyStats, setBodyStats] = useState(loadBodyStats());
  const [proteinLog, setProteinLog] = useState(loadProteinLog());
  const [calorieLog, setCalorieLog] = useState(loadCalorieLog());
  const [vitaminD3Log, setVitaminD3Log] = useState(loadVitaminD3Log());
  const [creatineLog, setCreatineLog] = useState(loadCreatineLog());

  // Reps editor state
  const [repsEditor, setRepsEditor] = useState(null); // { exId, sk, setIndex, currentReps, defaultReps, exerciseName }

  // Track when session is active for visibility-change banner
  const sessionActiveRef = useRef(false);
  useEffect(() => {
    sessionActiveRef.current = restTimer !== null || Object.keys(checked).some(k => checked[k]);
  }, [restTimer, checked]);

  // Visibility change handler — fire notif when user returns and timer is going
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && restTimer) {
        // App backgrounded during rest timer — make sure notification permission is fresh
        requestNotificationPermission();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [restTimer]);

  // Check notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotifEnabled(Notification.permission === "granted");
    }
  }, []);

  const showSave = (ok) => { setSaveMsg(ok ? "Saved" : "Failed"); setTimeout(() => setSaveMsg(""), 2400); };

  // Gamification state, derived purely from logged data.
  const game = useMemo(() => computeGameState(history, cardioSessions, weightLog), [history, cardioSessions, weightLog]);

  // Celebrate genuinely new levels / badges. First run for a given browser sets
  // a silent baseline (so a returning player isn't bombarded with old unlocks).
  useEffect(() => {
    if (loading) return;
    const seen = loadGameSeen();
    const currentBadges = game.achievements.filter(a => a.unlocked).map(a => a.id);
    if (!seen) { saveGameSeen({ level: game.level, badges: currentBadges }); return; }
    const queue = [];
    if (game.level > seen.level) {
      queue.push({ kind: "level", title: `Level ${game.level}`, subtitle: `You're a ${game.rank} now. Keep stacking.`, emoji: "⬆️" });
    }
    game.achievements
      .filter(a => a.unlocked && !seen.badges.includes(a.id))
      .forEach(a => queue.push({ kind: "badge", title: a.name, subtitle: a.desc, emoji: a.emoji }));
    if (queue.length) {
      setCelebration(prev => prev || queue);
      setConfetti(true);
      saveGameSeen({ level: game.level, badges: currentBadges });
    }
  }, [game, loading]);

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

  // Track the auth session. supabase-js auto-detects the magic-link token in
  // the URL on load and persists the session, so this fires once signed in.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthSession(data.session || null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setAuthSession(s || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load data only when signed in.
  useEffect(() => {
    if (!authSession) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!cancelled) await loadData();
    })();
    return () => { cancelled = true; };
  }, [authSession, loadData]);

  const signOut = async () => { await supabase.auth.signOut(); setHistory([]); setWeightLog([]); setCardioSessions([]); };

  // Pre-fill each exercise with last session's weight (editable). Only logs
  // exercises the user actually checks off, so seeding is safe. Never clobbers
  // a value the user already entered.
  useEffect(() => {
    const s = SESSIONS[activeSession];
    const key = s.id;
    setVals(prev => {
      let changed = false;
      const next = { ...prev };
      s.exercises.forEach(ex => {
        const k = key + "_" + ex.id;
        const cur = next[k] || {};
        const lp = getLastPerformance(history, ex.name);
        if (!lp) return;
        if (ex.barbell) {
          if (cur.plates === undefined && cur.perSide === undefined) {
            const pl = platesToReach(lp.weight);
            if (pl) {
              next[k] = { ...cur, plates: JSON.stringify([...pl].sort((a, b) => b - a)), perSide: String(pl.reduce((a, b) => a + b, 0)) };
              changed = true;
            }
          }
        } else if (!ex.noWeight && !ex.timed && !ex.bodyweight) {
          if (cur.weight === undefined) {
            next[k] = { ...cur, weight: String(lp.weight) };
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [activeSession, history]);

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

  // Reps editor handlers
  const openRepsEditor = (exId, ex, setIndex, currentReps) => {
    setRepsEditor({
      exId, sk, setIndex, currentReps,
      defaultReps: ex.reps,
      exerciseName: ex.name,
    });
  };

  const saveCustomReps = (newReps) => {
    if (!repsEditor) return;
    const fullId = repsEditor.sk + "_" + repsEditor.exId;
    const currentVals = vals[fullId] || {};
    const customReps = { ...(currentVals.customReps || {}) };
    customReps[repsEditor.setIndex] = newReps;
    setVals(p => ({...p, [fullId]: {...currentVals, customReps}}));
  };

  // Save body stats to localStorage when changed
  const updateBodyStats = (next) => {
    setBodyStats(next);
    saveBodyStats(next);
  };

  const updateProtein = (dateKey, grams) => {
    const next = { ...proteinLog, [dateKey]: grams };
    if (grams <= 0) delete next[dateKey];
    setProteinLog(next);
    saveProteinLog(next);
  };

  const updateCalories = (dateKey, cals) => {
    const next = { ...calorieLog, [dateKey]: cals };
    if (cals <= 0) delete next[dateKey];
    setCalorieLog(next);
    saveCalorieLog(next);
  };

  const toggleVitaminD3 = (dateKey) => {
    const next = { ...vitaminD3Log };
    if (next[dateKey]) delete next[dateKey];
    else next[dateKey] = true;
    setVitaminD3Log(next);
    saveVitaminD3Log(next);
  };

  const toggleCreatine = (dateKey) => {
    const next = { ...creatineLog };
    if (next[dateKey]) delete next[dateKey];
    else next[dateKey] = true;
    setCreatineLog(next);
    saveCreatineLog(next);
  };

  const logSession = async () => {
    const exVols = session.exercises.filter(ex => checked[sk+"_"+ex.id]).map(ex => {
      const exVals = vals[sk+"_"+ex.id] || {};
      const w = ex.barbell ? 45+(parseFloat(exVals.perSide)||0)*2 : parseFloat(exVals.weight)||0;
      const s = parseInt(exVals.setsDone || ex.sets);
      const customReps = exVals.customReps || {};

      // Compute total reps & per-set breakdown
      let totalReps = 0;
      const repsBreakdown = [];
      for (let i = 0; i < s; i++) {
        const r = customReps[i] !== undefined ? parseFloat(customReps[i]) : (parseFloat(ex.reps) || 0);
        totalReps += r;
        repsBreakdown.push(r);
      }
      const repsDisplay = repsBreakdown.length > 0 && repsBreakdown.some(r => r !== parseFloat(ex.reps))
        ? repsBreakdown.join(",")
        : ex.reps;

      return {
        name: ex.name, sets: s, reps: repsDisplay, weight: w,
        volume: (ex.noWeight||ex.timed||ex.bodyweight) ? 0 : w*totalReps,
      };
    });
    const payload = { session_name: session.code+": "+session.name, color: session.color, total_volume: exVols.reduce((a,e)=>a+e.volume,0), exercises: exVols };
    const { data, error } = await supabase.from("workouts").insert([payload]).select();
    if (!error && data) {
      setHistory(p => [data[0],...p]);
      const nc = {...checked}; session.exercises.forEach(ex => delete nc[sk+"_"+ex.id]); setChecked(nc);
      const newVals = {...vals}; session.exercises.forEach(ex => delete newVals[sk+"_"+ex.id]); setVals(newVals);
      setConfetti(true);
      setRestTimer(null);
      showSave(true);
      toast(`+${xpForType("lift")} XP 🏋️`);
    } else showSave(false);
  };

  // Tabata completions feed the recovery engine — write to cardio_sessions.
  const sortCardio = (rows) => [...rows].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
  const logTabata = async () => {
    const def = RECOVERY.TYPES.tabata;
    const { data, error } = await supabase.from("cardio_sessions").insert([{ workout_type: "tabata", completed_at: new Date().toISOString(), duration_min: def.defaultDurationMin, rpe: def.defaultRPE }]).select();
    if (!error && data) { setCardioSessions(p => sortCardio([data[0], ...p])); showSave(true); toast(`+${xpForType("tabata")} XP 🔥`); } else showSave(false);
  };

  // Create or update a conditioning session (Tabata / Long Interval / Game).
  const saveCardio = async ({ id, type, completed_at, duration_min, rpe, notes }) => {
    const row = { workout_type: type, completed_at, duration_min, rpe, notes };
    if (id != null) {
      const { data, error } = await supabase.from("cardio_sessions").update(row).eq("id", id).select();
      if (!error && data) { setCardioSessions(p => sortCardio(p.map(r => r.id === id ? data[0] : r))); showSave(true); } else showSave(false);
    } else {
      const { data, error } = await supabase.from("cardio_sessions").insert([row]).select();
      if (!error && data) { setCardioSessions(p => sortCardio([data[0], ...p])); setConfetti(true); showSave(true); toast(`+${sessionXP({ type, rpe })} XP ${RECOVERY.TYPES[type].emoji}`); } else showSave(false);
    }
    setLoggerState({ open: false });
  };

  const deleteCardio = async (id) => {
    const row = cardioSessions.find(r => r.id === id);
    setCardioSessions(p => p.filter(r => r.id !== id));
    setLoggerState({ open: false });
    await supabase.from("cardio_sessions").delete().eq("id", id);
    if (row) toast("Session deleted", { actionLabel: "UNDO", onAction: async () => {
      const { data } = await supabase.from("cardio_sessions").insert([row]).select();
      if (data) setCardioSessions(p => sortCardio([...p, data[0]]));
    }});
  };

  const logTreadmill = async ({ duration, speed, incline, miles, notes }) => {
    const label = [duration?duration+" min":null, speed?speed+" mph":null, incline?incline+"% incline":null, miles?miles+" mi":null, notes||null].filter(Boolean).join(" · ");
    const { data, error } = await supabase.from("workouts").insert([{ session_name: "Treadmill Walk", color: C.plum, total_volume: 0, exercises: [{ name: label, sets: 1, reps: "walk", weight: 0, volume: 0, duration, speed, incline, miles }] }]).select();
    if (!error && data) { setHistory(p => [data[0],...p]); showSave(true); toast(`+${xpForType("walk")} XP 🚶`); } else showSave(false);
  };

  const deleteLog = async id => {
    const row = history.find(h => h.id === id);
    setHistory(p => p.filter(h => h.id !== id));
    await supabase.from("workouts").delete().eq("id", id);
    if (row) toast("Workout deleted", { actionLabel: "UNDO", onAction: async () => {
      const { data } = await supabase.from("workouts").insert([row]).select();
      if (data) setHistory(p => [...p, data[0]].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    }});
  };
  const logWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 100 || w > 400) return;
    const { data, error } = await supabase.from("weight_log").insert([{ weight: w }]).select();
    if (!error && data) {
      setWeightLog(p => [data[0],...p]);
      setWeightInput("");
      showSave(true);
      // Also update body stats so protein math stays current
      updateBodyStats({ ...bodyStats, weightLbs: w });
    } else showSave(false);
  };
  const deleteWeight = async id => {
    const row = weightLog.find(e => e.id === id);
    setWeightLog(p => p.filter(e => e.id !== id));
    await supabase.from("weight_log").delete().eq("id", id);
    if (row) toast("Weight entry deleted", { actionLabel: "UNDO", onAction: async () => {
      const { data } = await supabase.from("weight_log").insert([row]).select();
      if (data) setWeightLog(p => [...p, data[0]].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    }});
  };

  const enableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifEnabled(result === "granted");
    if (result === "granted") {
      // Test notification
      try {
        const n = new Notification("💪 Notifications on", { body: "You'll get banners when timers finish.", silent: false });
        setTimeout(() => n.close(), 4000);
      } catch(e) {}
    }
  };

  const thisWeek = history.filter(h => (Date.now()-new Date(h.logged_at)) < 7*86400000).length;
  const totalLbs = history.reduce((a,h) => a+(h.total_volume||0), 0);
  const lastGym = history.find(h => h.session_name && h.session_name !== "Treadmill Walk");
  const restDay = lastGym && Math.floor((Date.now()-new Date(lastGym.logged_at))/86400000) < 1;

  // Did today's 4-minute tabata get logged?
  const tabataToday = cardioSessions.some(s => s.workout_type === "tabata" && new Date(s.completed_at).toDateString() === new Date().toDateString());

  // Primary navigation — three groups, each fronting a set of sub-tabs.
  const GROUPS = [
    { id: "today",    label: "Today",    icon: "🔥", tabs: ["home"] },
    { id: "train",    label: "Train",    icon: "🏋️", tabs: ["workout", "history", "goals"] },
    { id: "progress", label: "Progress", icon: "📊", tabs: ["stats", "weight", "nutrition"] },
  ];
  const SUB_LABELS = {
    home: "Today", workout: "Train", history: "Log", goals: "Plan",
    stats: "Stats", weight: "Weight", nutrition: "Fuel",
  };
  const groupOf = (id) => (GROUPS.find(g => g.tabs.includes(id)) || GROUPS[0]);
  const activeGroup = groupOf(tab);
  const goGroup = (g) => {
    setTab(g.tabs[0]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Wait for the auth check, then gate the whole app behind sign-in.
  if (!authReady) return (
    <div className="court-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="ease-up" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>💪</div>
        <div className="h-display" style={{ color: C.rust, fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>The Work</div>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 6, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>LOADING…</div>
      </div>
    </div>
  );
  if (!authSession) return <AuthGate />;

  if (loading) return (
    <div className="court-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="ease-up" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>💪</div>
        <div className="h-display" style={{ color: C.rust, fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>The Work</div>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 6, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>LOADING…</div>
      </div>
    </div>
  );

  return (
    <div className="court-bg" style={{ minHeight: "100vh", paddingBottom: 80 }}>

      {/* HEADER */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${C.ink}EE`, backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.line}`,
      }}>
        <div style={{ padding: "16px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${C.rust}, ${C.amber})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💪</div>
            <div>
              <div className="h-display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: C.bone, lineHeight: 1.1 }}>The Work</div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.1em", marginTop: 2 }}>SHOW UP · DO THE WORK</div>
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

      </header>

      <main style={{ padding: "20px 16px 100px", maxWidth: 480, margin: "0 auto" }}>

        {/* ── SUB-RAIL — switch within a group ── */}
        {activeGroup.tabs.length > 1 && (
          <div className="tab-rail" style={{ marginBottom: 18, padding: 4, background: C.raised, borderRadius: 14, border: `1px solid ${C.line}` }}>
            {activeGroup.tabs.map(id => {
              const on = tab === id;
              return (
                <button key={id} className="btn" onClick={() => { setTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); if (navigator.vibrate) navigator.vibrate(5); }}
                  style={{
                    flex: 1, whiteSpace: "nowrap", padding: "9px 14px", border: "none", borderRadius: 10,
                    background: on ? C.panel : "transparent", color: on ? C.bone : C.dim,
                    fontFamily: FONT_DISPLAY, fontWeight: on ? 700 : 500, fontSize: 13, letterSpacing: "-0.01em",
                    cursor: "pointer", boxShadow: on ? `0 1px 3px ${C.bone}14` : "none", transition: "background 0.2s, color 0.2s",
                  }}>
                  {SUB_LABELS[id]}
                </button>
              );
            })}
          </div>
        )}

        {/* ── HOME (consistency-first) ── */}
        {tab === "home" && (
          <HomeTab
            bodyStats={bodyStats}
            history={history}
            cardioSessions={cardioSessions}
            weightLog={weightLog}
            game={game}
            proteinLog={proteinLog}
            vitaminD3Log={vitaminD3Log}
            creatineLog={creatineLog}
            onGoTab={setTab}
            onOpenLogger={(opts) => setLoggerState({ open: true, ...opts })}
            onOpenAwards={() => setAwardsOpen(true)}
            onChooseLift={() => { setTab("workout"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onGoWalk={() => { setTab("workout"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}

        {/* ── TRAIN ── */}
        {tab === "workout" && (() => {
          const streak = calcStreak(history);
          const todaySessions = history.filter(h => new Date(h.logged_at).toDateString() === new Date().toDateString()).length;
          const todayCardio = cardioSessions.filter(s => new Date(s.completed_at).toDateString() === new Date().toDateString()).length;
          const todayTotal = todaySessions + todayCardio;
          const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
          return (
          <>
            {/* ── Today Hero ── */}
            <div className="ease-up" style={{ marginBottom: 20 }}>
              <Eyebrow>{dateStr}</Eyebrow>
              <h1 className="h-display" style={{ fontSize: 36, margin: "8px 0 4px", color: C.bone, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {greeting()}.
              </h1>
              <p className="h-serif" style={{ fontSize: 17, color: C.dim, margin: "6px 0 0", lineHeight: 1.4 }}>
                {todayTotal === 0 ? (restDay ? "Recovery is part of the work." : "Let's get to work.") : todayTotal === 1 ? "One down. Strong start." : `${todayTotal} sessions in today. Beast.`}
              </p>

              {/* Notification permission prompt — non-intrusive */}
              {!notifEnabled && "Notification" in window && Notification.permission === "default" && (
                <div onClick={enableNotifications} className="card-tap" style={{
                  marginTop: 14, padding: "10px 14px", borderRadius: 12,
                  background: C.electric + "15", border: `1px solid ${C.electric}40`,
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                }}>
                  <span style={{ fontSize: 18 }}>🔔</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.bone }}>Get timer alerts</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>Banner notifications when you switch apps mid-rest</div>
                  </div>
                  <span style={{ fontSize: 11, color: C.electric, fontFamily: FONT_MONO, fontWeight: 600 }}>ENABLE →</span>
                </div>
              )}

              {/* Weight reminder if 7+ days since last weigh-in */}
              {(() => {
                const lastW = weightLog[0];
                const daysSinceWeight = lastW ? Math.floor((Date.now() - new Date(lastW.logged_at)) / 86400000) : null;
                if (daysSinceWeight !== null && daysSinceWeight >= 7) {
                  return (
                    <div onClick={() => setTab("weight")} className="card-tap" style={{
                      marginTop: 14, padding: "10px 14px", borderRadius: 12,
                      background: C.amber + "15", border: `1px solid ${C.amber}40`,
                      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    }}>
                      <span style={{ fontSize: 18 }}>⚖️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.bone }}>Time to weigh in</div>
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{daysSinceWeight} days since last check</div>
                      </div>
                      <span style={{ fontSize: 12, color: C.amber, fontFamily: FONT_MONO }}>→</span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Streak + today stats row */}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <div style={{ flex: 1, background: C.panel, border: `1px solid ${streak > 0 ? C.rust + "40" : C.line}`, borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    {streak > 0 && <span style={{ fontSize: 18 }}>🔥</span>}
                    <span className="num-tab h-display" style={{ fontSize: 26, fontWeight: 700, color: streak > 0 ? C.rust : C.dim, letterSpacing: "-0.03em", lineHeight: 1 }}>{streak}</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4, letterSpacing: "0.08em" }}>DAY STREAK</div>
                </div>
                <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px" }}>
                  <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 700, color: todayTotal > 0 ? C.moss : C.dim, letterSpacing: "-0.03em", lineHeight: 1 }}>{todayTotal}</div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4, letterSpacing: "0.08em" }}>TODAY</div>
                </div>
                <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px" }}>
                  <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 700, color: thisWeek > 0 ? C.amber : C.dim, letterSpacing: "-0.03em", lineHeight: 1 }}>{thisWeek}</div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4, letterSpacing: "0.08em" }}>THIS WEEK</div>
                </div>
              </div>
            </div>

            <div className="ease-up-1"><TabataTimer onLog={logTabata} loggedToday={tabataToday} /></div>
            <div className="ease-up-2"><TreadmillLogger onLog={logTreadmill} /></div>

            {/* Status banners */}
            <div className="ease-up-3" style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}>
              <Surface accent={restDay ? C.faint : session.color} padding={14} style={{ marginBottom: 0 }}>
                <Eyebrow color={restDay ? C.dim : session.color}>Lift</Eyebrow>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: C.bone }}>
                  {restDay ? "Recover" : session.name}
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>
                  {restDay ? `Last: ${daysAgo(lastGym.logged_at)}` : "Ready when you are"}
                </div>
              </Surface>
              <Surface accent={tabataToday ? C.moss : C.amber} padding={14} style={{ marginBottom: 0 }}>
                <Eyebrow color={tabataToday ? C.moss : C.amber}>Tabata</Eyebrow>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: C.bone }}>
                  {tabataToday ? "✓ Done today" : "🔥 4-min Tabata"}
                </div>
                <div style={{ fontSize: 11, color: tabataToday ? C.moss : C.dim, marginTop: 2, fontFamily: FONT_MONO }}>
                  {tabataToday ? "Logged today" : "2×/week · per the plan"}
                </div>
              </Surface>
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
                    onRest={restEnabled && !ex.timed && !ex.noWeight ? () => setRestTimer({ seconds: 90 }) : null}
                    lastPerf={getLastPerformance(history, ex.name)}
                    onEditReps={(setIndex, currentReps) => openRepsEditor(ex.id, ex, setIndex, currentReps)}
                  />
                ))}
                <Btn color={session.color} onClick={logSession} disabled={!anyChecked} full size="lg" style={{ marginTop: 18 }}>
                  {anyChecked ? "End Workout & Log" : "Check an exercise to log"}
                </Btn>
              </Surface>
            </div>


            <p className="h-serif" style={{ textAlign: "center", color: C.dim, fontSize: 16, margin: "24px 0 0" }}>
              "I am someone who never misses a workout."
              <span style={{ display: "block", fontFamily: FONT_MONO, fontStyle: "normal", fontSize: 10, letterSpacing: "0.15em", marginTop: 6 }}>— JAMES CLEAR</span>
            </p>
          </>
          );
        })()}

        {/* ── NUTRITION ── */}
        {tab === "nutrition" && (
          <NutritionTab
            bodyStats={bodyStats}
            onUpdateBody={updateBodyStats}
            proteinLog={proteinLog}
            onProteinChange={updateProtein}
            calorieLog={calorieLog}
            onCalorieChange={updateCalories}
            vitaminD3Log={vitaminD3Log}
            onVitaminD3Toggle={toggleVitaminD3}
            creatineLog={creatineLog}
            onCreatineToggle={toggleCreatine}
          />
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <>
            <div className="ease-up"><PageTitle kicker="The work · is the win">Log</PageTitle></div>

            <div className="ease-up-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              <StatCard kicker="ALL" value={history.length} color={C.rust} />
              <StatCard kicker="WEEK" value={thisWeek} color={C.amber} />
              <StatCard kicker="LBS" value={fmtNum(totalLbs)} color={C.moss} />
            </div>

            {/* ── Conditioning sessions — engine-managed, editable ── */}
            <div className="ease-up-1" style={{ marginBottom: 16 }}>
              <Surface>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Eyebrow color={C.moss}>Conditioning · Tabata · Long Int · Games</Eyebrow>
                  <button onClick={() => setLoggerState({ open: true })} className="btn" style={{ background: "transparent", border: "none", color: C.electric, fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>+ Log</button>
                </div>
                {cardioSessions.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.dim, marginTop: 10, fontFamily: FONT_MONO }}>No conditioning logged yet.</div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    {cardioSessions.slice(0, 40).map((s, i) => {
                      const def = RECOVERY.TYPES[s.workout_type] || {};
                      const col = C[def.colorKey] || C.dim;
                      return (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < Math.min(cardioSessions.length, 40) - 1 ? `1px solid ${C.line}` : "none" }}>
                          <span style={{ fontSize: 20 }}>{def.emoji || "•"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.bone, letterSpacing: "-0.01em" }}>{def.label || s.workout_type}</div>
                            <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>
                              {new Date(s.completed_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })} · {daysAgo(s.completed_at)}
                              {s.duration_min != null ? ` · ${s.duration_min}m` : ""}{s.rpe != null ? ` · RPE ${s.rpe}` : ""}
                            </div>
                            {s.notes && <div style={{ fontSize: 11, color: C.mute, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.notes}</div>}
                          </div>
                          <span style={{ width: 8, height: 8, borderRadius: 999, background: col, flexShrink: 0 }} />
                          <button onClick={() => setLoggerState({ open: true, editing: s })} className="btn" style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 13, padding: 6 }}>✎</button>
                          <button onClick={() => deleteCardio(s.id)} className="btn" style={{ background: "transparent", border: "none", color: C.mute, cursor: "pointer", fontSize: 14, padding: 6 }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Surface>
            </div>

            {history.length === 0 && cardioSessions.length === 0 && (
              <Surface style={{ textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💪</div>
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
                    <input type="number" inputMode="decimal" min="100" max="400" step="0.1" placeholder="223.5" value={weightInput} onChange={e => setWeightInput(e.target.value)} onKeyDown={e => e.key==="Enter" && logWeight()}
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
            <div className="ease-up"><PageTitle kicker="Consistency · compounds">The Plan</PageTitle></div>

            {/* Quick Settings */}
            <div className="ease-up-1">
              <Surface>
                <Eyebrow color={C.electric}>Settings</Eyebrow>
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div>
                      <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>Rest timer</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>Auto-start after each set</div>
                    </div>
                    <button onClick={() => setRestEnabled(!restEnabled)} className="btn"
                      style={{
                        width: 50, height: 28, borderRadius: 14, border: "none",
                        background: restEnabled ? C.moss : C.faint,
                        position: "relative", cursor: "pointer", padding: 0,
                        transition: "background 0.2s",
                      }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 999, background: "#fff",
                        position: "absolute", top: 3, left: restEnabled ? 25 : 3,
                        transition: "left 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div>
                      <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>Banner notifications</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>Alerts when timers fire in the background</div>
                    </div>
                    {notifEnabled ? (
                      <span style={{ fontSize: 11, color: C.moss, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>● ON</span>
                    ) : (
                      <Btn color={C.electric} size="sm" onClick={enableNotifications}>Enable</Btn>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>Account</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{authSession?.user?.email || "Signed in"}</div>
                    </div>
                    <Btn color={C.red} ghost size="sm" onClick={signOut}>Sign out</Btn>
                  </div>
                </div>
              </Surface>
            </div>

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
                Target {calcProteinTarget(bodyStats.weightLbs)}g protein/day. Whole foods first. Carbs around training. Cut alcohol to weekends. 3L water minimum on training days. <strong style={{ color: C.amber }}>Detailed kosher food guide + protein tracker on the Fuel tab.</strong>
              </p>
            </Surface>

            <Surface accent={C.electric} padding={22}>
              <Eyebrow color={C.electric}>Atomic Habits · 4 Laws</Eyebrow>
              <div style={{ marginTop: 14 }}>
                {[
                  ["1.", "Make It Obvious", C.rust, "Gym bag packed the night before. Shoes by the door."],
                  ["2.", "Make It Attractive", C.amber, "Hype playlist only during training. Pair it with something you enjoy."],
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
                "I am someone who never misses a workout."
                <span className="mono" style={{ display: "block", fontStyle: "normal", fontSize: 10, letterSpacing: "0.15em", marginTop: 6, color: C.mute }}>— JAMES CLEAR</span>
              </p>
            </Surface>
          </>
        )}

      </main>

      {/* ── Floating overlays ── */}
      <Confetti show={confetti} onDone={() => setConfetti(false)} />
      {restTimer && (
        <RestTimer
          seconds={restTimer.seconds}
          onClose={() => setRestTimer(null)}
          onSkip={() => setRestTimer(null)}
        />
      )}
      {repsEditor && (
        <RepsEditor
          open={true}
          currentReps={repsEditor.currentReps}
          defaultReps={repsEditor.defaultReps}
          exerciseName={repsEditor.exerciseName}
          setIndex={repsEditor.setIndex}
          onSave={saveCustomReps}
          onClose={() => setRepsEditor(null)}
        />
      )}

      {/* ── Bottom Navigation ── */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90,
        background: `${C.ink}F2`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid ${C.line}`,
        padding: "8px 4px calc(8px + env(safe-area-inset-bottom)) 4px",
        display: "flex", justifyContent: "space-around",
      }}>
        {GROUPS.slice(0, 2).map(g => <NavItem key={g.id} g={g} active={activeGroup.id === g.id} onGo={goGroup} />)}

        {/* Quick-add FAB */}
        <button className="btn" onClick={() => { setQuickAddOpen(true); if (navigator.vibrate) navigator.vibrate(10); }}
          aria-label="Quick add"
          style={{
            flex: "0 0 auto", width: 52, height: 52, marginTop: -18, borderRadius: 999, border: "none",
            background: `linear-gradient(135deg, ${C.rust}, ${C.amber})`, color: "#fff",
            fontSize: 26, fontWeight: 700, lineHeight: 1, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 6px 18px ${C.rust}55`,
          }}>
          +
        </button>

        {GROUPS.slice(2).map(g => <NavItem key={g.id} g={g} active={activeGroup.id === g.id} onGo={goGroup} />)}
      </nav>

      {/* ── QUICK ADD bottom sheet ── */}
      {quickAddOpen && (() => {
        const tk = todayKey();
        const curProtein = proteinLog[tk] || 0;
        const pTarget = calcProteinTarget(bodyStats.weightLbs);
        const d3 = !!vitaminD3Log[tk];
        const cr = !!creatineLog[tk];
        const addProtein = (g) => { updateProtein(tk, curProtein + g); if (navigator.vibrate) navigator.vibrate(8); };
        const close = () => setQuickAddOpen(false);
        const chip = (label, on, onTap, color) => (
          <button className="btn" onClick={onTap} style={{
            flex: 1, padding: "12px 8px", borderRadius: 12, cursor: "pointer",
            border: `1px solid ${on ? color : C.line}`,
            background: on ? `${color}18` : C.raised, color: on ? color : C.cream,
            fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 13,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 18 }}>{on ? "✓" : "○"}</span>{label}
          </button>
        );
        return (
          <div className="backdrop" style={{ alignItems: "flex-end", padding: 0 }} onClick={close}>
            <div className="slide-up" onClick={e => e.stopPropagation()} style={{
              width: "100%", maxWidth: 480, margin: "0 auto",
              background: C.panel, borderRadius: "22px 22px 0 0",
              borderTop: `1px solid ${C.line}`, padding: "10px 18px calc(24px + env(safe-area-inset-bottom))",
              maxHeight: "85vh", overflowY: "auto",
            }}>
              <div style={{ width: 38, height: 4, borderRadius: 999, background: C.faint, margin: "0 auto 16px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <h2 className="h-display" style={{ fontSize: 22, fontWeight: 700, color: C.bone, margin: 0, letterSpacing: "-0.03em" }}>Quick add</h2>
                <button onClick={close} className="btn" style={{ border: "none", background: "transparent", color: C.dim, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>

              {/* Protein */}
              <Eyebrow>Protein · {Math.round(curProtein)}/{pTarget}g</Eyebrow>
              <div style={{ display: "flex", gap: 8, margin: "8px 0 18px" }}>
                {[20, 30, 40].map(g => (
                  <button key={g} className="btn" onClick={() => addProtein(g)} style={{
                    flex: 1, padding: "13px 8px", borderRadius: 12, cursor: "pointer",
                    border: `1px solid ${C.amber}40`, background: `${C.amber}12`, color: C.amber,
                    fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15,
                  }}>+{g}g</button>
                ))}
              </div>

              {/* Supplements */}
              <Eyebrow>Supplements</Eyebrow>
              <div style={{ display: "flex", gap: 8, margin: "8px 0 18px" }}>
                {chip("Vitamin D3", d3, () => { toggleVitaminD3(tk); if (navigator.vibrate) navigator.vibrate(8); }, C.electric)}
                {chip("Creatine", cr, () => { toggleCreatine(tk); if (navigator.vibrate) navigator.vibrate(8); }, C.plum)}
              </div>

              {/* Weight */}
              <Eyebrow>Bodyweight</Eyebrow>
              <div style={{ display: "flex", gap: 8, margin: "8px 0 18px" }}>
                <input type="number" inputMode="decimal" value={weightInput} onChange={e => setWeightInput(e.target.value)}
                  placeholder="lbs" style={{
                    flex: 1, padding: "13px 14px", borderRadius: 12, border: `1px solid ${C.line}`,
                    background: C.raised, color: C.bone, fontSize: 16, fontFamily: FONT_MONO, outline: "none",
                  }} />
                <button className="btn" onClick={async () => { await logWeight(); }} style={{
                  padding: "13px 22px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: C.moss, color: "#fff", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14,
                }}>Log</button>
              </div>

              {/* Conditioning — log Tabata / Long Interval / Game */}
              <Eyebrow>Log conditioning</Eyebrow>
              <div style={{ display: "flex", gap: 8, margin: "8px 0 18px" }}>
                {Object.values(RECOVERY.TYPES).map(t => (
                  <button key={t.key} className="btn" onClick={() => { close(); setLoggerState({ open: true, prefillType: t.key }); }} style={{
                    flex: 1, padding: "12px 6px", borderRadius: 12, cursor: "pointer",
                    border: `1px solid ${C[t.colorKey]}40`, background: `${C[t.colorKey]}12`, color: C[t.colorKey],
                    fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 12,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}><span style={{ fontSize: 18 }}>{t.emoji}</span>{t.short}</button>
                ))}
              </div>

              {/* Shortcuts */}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => { setTab("workout"); close(); window.scrollTo({ top: 0 }); }} style={{
                  flex: 1, padding: "13px 8px", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${C.rust}40`, background: `${C.rust}12`, color: C.rust,
                  fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14,
                }}>🏋️ Start a workout</button>
                <button className="btn" onClick={() => { setTab("nutrition"); close(); window.scrollTo({ top: 0 }); }} style={{
                  flex: 1, padding: "13px 8px", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${C.line}`, background: C.raised, color: C.cream,
                  fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14,
                }}>🥤 Full nutrition</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── CONDITIONING LOGGER sheet ── */}
      {loggerState.open && (
        <ConditioningLogger
          state={loggerState}
          onClose={() => setLoggerState({ open: false })}
          onSave={saveCardio}
          onDelete={deleteCardio}
        />
      )}

      {/* ── GAMIFICATION overlays ── */}
      {awardsOpen && <AchievementsSheet game={game} onClose={() => setAwardsOpen(false)} />}
      {celebration && <CelebrationOverlay queue={celebration} onClose={() => setCelebration(null)} />}

      <ToastHost />
    </div>
  );
}
