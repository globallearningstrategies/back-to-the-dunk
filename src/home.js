import React, { useState, useEffect } from 'react';
import { C, SPRING, FONT_DISPLAY, FONT_MONO, RECOVERY, startOfDay, addDays, startOfWeek, fmtDur, fmtDurShort, normalizeAll, trailingSummary, quoteOfDay, calcProteinTarget, getAudioCtx, beep, greeting, todayKey } from './model';
import { Surface, Eyebrow, Btn } from './ui';
import { WeeklyRecap, BodySim, HeartSim, TimeTrainedCard } from './statistics';
import { TodayCard } from './logging';

export function ProgressHero({ game, cardioSessions, workouts, onOpenAwards, onGoTab }) {
  const [mode, setMode] = useState("weeks");
  const all = normalizeAll(cardioSessions, workouts);
  const today = startOfDay(new Date());
  const wkStart = startOfWeek(today);

  const weeks = [];
  for (let i = 9; i >= 0; i--) {
    const ws = addDays(wkStart, -7 * i).getTime();
    const we = addDays(wkStart, -7 * i + 7).getTime();
    weeks.push({ count: all.filter(s => { const t = s.date.getTime(); return t >= ws && t < we; }).length, label: "" });
  }
  const months = [];
  for (let i = 7; i >= 0; i--) {
    const ms = new Date(today.getFullYear(), today.getMonth() - i, 1).getTime();
    const me = new Date(today.getFullYear(), today.getMonth() - i + 1, 1).getTime();
    months.push({ count: all.filter(s => { const t = s.date.getTime(); return t >= ms && t < me; }).length, label: new Date(ms).toLocaleDateString("en-US", { month: "short" }).slice(0, 3) });
  }
  const bars = mode === "weeks" ? weeks : months;
  const maxCount = Math.max(4, ...bars.map(b => b.count));
  const thisWeek = weeks[weeks.length - 1].count;
  const streak = game.stats.currentStreak;
  const total = game.stats.totalSessions;

  // This week vs targets, by type (trailing 7 days).
  const sum7 = trailingSummary(all, today, 7);
  const t7 = sum7.byType;
  const targets = [
    { type: "tabata", done: t7.tabata, goal: RECOVERY.TYPES.tabata.weeklyTarget },
    { type: "long_interval", done: t7.long_interval, goal: RECOVERY.TYPES.long_interval.weeklyTarget },
    // Legs/upper Sweat440 classes fill lift slots, matching the engine.
    { type: "lift", done: t7.lift + t7.cross_training - sum7.crossCardio, goal: RECOVERY.TYPES.lift.weeklyTarget },
    { type: "walk", done: t7.walk, goal: RECOVERY.TYPES.walk.weeklyTarget },
  ];

  const stat = (label, value, color) => (
    <div style={{ flex: 1 }}>
      <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, marginTop: 4, letterSpacing: "0.06em" }}>{label}</div>
    </div>
  );
  const tab = (m, txt) => (
    <button onClick={() => setMode(m)} className="btn" style={{ padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: mode === m ? C.panel : "transparent", color: mode === m ? C.bone : C.dim, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 11, boxShadow: mode === m ? `0 1px 2px ${C.bone}14` : "none" }}>{txt}</button>
  );

  return (
    <Surface accent={C.rust} padding={20}>
      {/* Headline stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {stat("DAY STREAK", streak > 0 ? `🔥 ${streak}` : "0", streak > 0 ? C.rust : C.dim)}
        {stat("THIS WEEK", thisWeek, thisWeek > 0 ? C.moss : C.dim)}
        {stat("TOTAL DONE", total, C.bone)}
      </div>

      {/* Workouts bar graph — weeks / months toggle, tap for full history */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow>Workouts done</Eyebrow>
        <div style={{ display: "flex", gap: 2, background: C.raised, borderRadius: 10, padding: 2, border: `1px solid ${C.line}` }}>
          {tab("weeks", "Weeks")}{tab("months", "Months")}
        </div>
      </div>
      <div onClick={() => onGoTab && onGoTab("stats")} className="card-tap" style={{ cursor: "pointer", marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: mode === "weeks" ? 5 : 8, height: 64 }}>
          {bars.map((b, i) => {
            const isNow = i === bars.length - 1;
            const h = Math.max(4, Math.round((b.count / maxCount) * 56));
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }} title={`${b.count} workouts`}>
                <div style={{ fontSize: 9, color: b.count ? C.cream : "transparent", fontFamily: FONT_MONO, marginBottom: 3 }}>{b.count}</div>
                <div style={{ width: "100%", height: h, borderRadius: "4px 4px 2px 2px", background: b.count ? (isNow ? `linear-gradient(180deg, ${C.rustHi}, ${C.rust})` : `${C.rust}99`) : C.raised, border: `1px solid ${b.count ? "transparent" : C.line}`, transition: "height 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
                {mode === "months" && <div style={{ fontSize: 8, color: C.mute, fontFamily: FONT_MONO, marginTop: 4 }}>{b.label}</div>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: C.mute, fontFamily: FONT_MONO }}>
          {mode === "weeks" ? <><span>10 WEEKS AGO</span><span>THIS WEEK · tap for full history →</span></> : <span style={{ marginLeft: "auto" }}>tap for full history →</span>}
        </div>
      </div>

      {/* This week vs plan */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
        <Eyebrow>This week's plan</Eyebrow>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {targets.map(t => {
            const def = RECOVERY.TYPES[t.type];
            const met = t.done >= t.goal;
            return (
              <div key={t.type} style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 10, background: met ? `${C[def.colorKey]}18` : C.raised, border: `1px solid ${met ? C[def.colorKey] : C.line}` }}>
                <div style={{ fontSize: 16 }}>{def.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: met ? C[def.colorKey] : C.cream, fontFamily: FONT_MONO, marginTop: 3 }}>{Math.min(t.done, t.goal)}/{t.goal}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges link */}
      <button onClick={onOpenAwards} className="btn" style={{ width: "100%", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`, background: "transparent", border: "none", borderTopLeftRadius: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {game.achievements.filter(a => a.unlocked).slice(0, 6).map(a => (
            <span key={a.id} style={{ fontSize: 17 }}>{a.emoji}</span>
          ))}
          {game.unlockedCount === 0 && <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO }}>No badges yet</span>}
        </div>
        <span style={{ fontSize: 11, color: C.electric, fontFamily: FONT_MONO, fontWeight: 700 }}>{game.unlockedCount}/{game.achievements.length} badges →</span>
      </button>
    </Surface>
  );
}

export function AchievementsSheet({ game, onClose }) {
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

export function CelebrationOverlay({ queue, onClose }) {
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

export function HomeTab({ bodyStats, history, cardioSessions, weightLog, game, constraints, proteinLog, vitaminD3Log, creatineLog, onGoTab, onOpenLogger, onOpenAwards, onChooseLift, onGoWalk, theme, onToggleTheme }) {
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
  // What was actually done each day, so the strip can show it.
  const dayTypes = new Map();
  normalizeAll(cardioSessions, history).forEach(s => {
    const k = s.date.toDateString();
    if (!dayTypes.has(k)) dayTypes.set(k, []);
    dayTypes.get(k).push(s.type);
  });
  const strip = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const types = [...new Set(dayTypes.get(d.toDateString()) || [])];
    strip.push({
      key: d.toDateString(), active: activeDays.has(d.toDateString()), isToday: i === 0,
      dow: "SMTWTFS"[d.getDay()],
      emojis: types.map(t => RECOVERY.TYPES[t] && RECOVERY.TYPES[t].emoji).filter(Boolean),
      label: types.map(t => RECOVERY.TYPES[t] && RECOVERY.TYPES[t].label).filter(Boolean).join(" + "),
    });
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

      {/* ── THE REBUILD + THE ENGINE — the digital twin opens the app ── */}
      <div className="ease-up-1">
        <BodySim cardioSessions={cardioSessions} workouts={history} weightLog={weightLog} />
      </div>
      <div className="ease-up-1">
        <HeartSim cardioSessions={cardioSessions} workouts={history} />
      </div>

      {/* ── LEVEL / XP / BADGES — progression spine ── */}
      <div className="ease-up-1" style={{ marginBottom: 14 }}>
        <ProgressHero game={game} cardioSessions={cardioSessions} workouts={history} onOpenAwards={onOpenAwards} onGoTab={onGoTab} />
      </div>

      {/* ── TODAY — recovery engine recommendation, front & center ── */}
      <div className="ease-up-2" style={{ marginBottom: 18 }}>
        <TodayCard cardioSessions={cardioSessions} workouts={history} constraints={constraints} onOpenLogger={onOpenLogger} onChooseLift={onChooseLift} onGoWalk={onGoWalk} />
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

          {/* Activity strip — each day shows what was done, with its weekday under it */}
          <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
            {strip.map((d, i) => (
              <div key={i} title={d.label ? `${d.key} · ${d.label}` : d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
                <div style={{
                  width: "100%", height: 30, borderRadius: 5,
                  background: d.active ? momentumColor : C.raised,
                  border: `1px solid ${d.active ? momentumColor : C.line}`,
                  outline: d.isToday ? `1.5px solid ${C.bone}` : "none", outlineOffset: 1,
                  transition: "background 0.3s",
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxSizing: "border-box",
                }}>
                  {d.emojis.length > 0 && (
                    <span style={{ fontSize: d.emojis.length > 1 ? 8.5 : 12, lineHeight: 1, letterSpacing: "-1px" }}>
                      {d.emojis.slice(0, 2).join("")}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 8, fontFamily: FONT_MONO, lineHeight: 1, color: d.isToday ? C.bone : C.mute, fontWeight: d.isToday ? 700 : 400 }}>{d.dow}</span>
              </div>
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

      {/* ── TIME TRAINED — weekly minutes vs your average ── */}
      <div className="ease-up-3">
        <TimeTrainedCard cardioSessions={cardioSessions} workouts={history} />
      </div>

      {/* ── SUNDAY RECAP — weeks run Mon → Sun, so Sunday closes this week ── */}
      {new Date().getDay() === 0 && (
        <div className="ease-up-3">
          <WeeklyRecap sessions={normalizeAll(cardioSessions, history)} weightLog={weightLog} />
        </div>
      )}

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
