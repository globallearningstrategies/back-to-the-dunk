import React, { useState, useEffect, useRef } from 'react';
import { C, FONT_DISPLAY, FONT_MONO, RECOVERY, startOfDay, addDays, startOfWeek, fmtDur, fmtDurShort, normalizeAll, fmtNum, LEGS_OPTIONS, engineModel } from './model';
import { Surface, Eyebrow, PageTitle, toast } from './ui';

export function StatCard({ kicker, value, unit, color, big, sub }) {
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

export function ConsistencyCalendar({ sessions }) {
  const today = startOfDay(new Date());
  // The grid is wider than a phone — start scrolled to NOW (the right end),
  // so recent months show first and history is a swipe away.
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, []);
  const countMap = new Map();
  sessions.forEach(s => { const t = startOfDay(s.date).getTime(); countMap.set(t, (countMap.get(t) || 0) + 1); });

  const COLS = 53;
  const end = addDays(startOfWeek(today), 7);     // exclusive upper bound (next Sunday)
  const start = addDays(end, -7 * COLS);
  const columns = [];
  let activeCount = 0;
  for (let w = 0; w < COLS; w++) {
    const colStart = addDays(start, w * 7);
    const days = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(colStart, d);
      if (day.getTime() > today.getTime()) { days.push(null); continue; }
      const ts = day.getTime();
      const count = countMap.get(ts) || 0;
      if (count > 0) activeCount++;
      days.push({ ts, count, isToday: ts === today.getTime() });
    }
    columns.push({ month: colStart.getMonth(), label: colStart.toLocaleDateString("en-US", { month: "short" }), days });
  }
  const color = (c) => c <= 0 ? C.raised : c === 1 ? `${C.rust}66` : c === 2 ? `${C.rust}AA` : C.rustHi;
  const CELL = 12, GAP = 3;

  return (
    <Surface accent={C.rust}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Eyebrow color={C.rust}>Consistency · last 12 months</Eyebrow>
        <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO }}>{activeCount} active days</span>
      </div>
      <div ref={scrollRef} style={{ overflowX: "auto", marginTop: 12, paddingBottom: 4 }}>
        <div style={{ minWidth: "min-content" }}>
          {/* Month labels */}
          <div style={{ display: "flex", gap: GAP, marginBottom: 4 }}>
            {columns.map((col, ci) => {
              const show = ci === 0 ? false : col.month !== columns[ci - 1].month;
              return <div key={ci} style={{ width: CELL, fontSize: 8, color: C.mute, fontFamily: FONT_MONO, overflow: "visible", whiteSpace: "nowrap" }}>{show ? col.label : ""}</div>;
            })}
          </div>
          {/* 7 rows × 53 week-columns */}
          <div style={{ display: "flex", gap: GAP }}>
            {columns.map((col, ci) => (
              <div key={ci} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                {col.days.map((cell, di) => cell === null
                  ? <div key={di} style={{ width: CELL, height: CELL }} />
                  : <div key={di} title={`${new Date(cell.ts).toLocaleDateString("en-CA")} · ${cell.count} workout${cell.count === 1 ? "" : "s"}`}
                      style={{ width: CELL, height: CELL, borderRadius: 2, background: color(cell.count), boxShadow: cell.isToday ? `0 0 0 1.5px ${C.bone}` : "none" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 10, fontSize: 9, color: C.mute, fontFamily: FONT_MONO }}>
        <span>‹ swipe left for older months</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>Less</span>
          {[0, 1, 2, 3].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: 2, background: color(c), display: "inline-block" }} />)}
          <span>More</span>
        </span>
      </div>
    </Surface>
  );
}

export function QuarterRecap({ sessions, weightLog }) {
  const from = addDays(startOfDay(new Date()), -90);
  const qs = sessions.filter(s => s.date >= from);
  const count = qs.length;
  const minutes = qs.reduce((a, s) => a + (s.duration || 0), 0);
  const activeDays = new Set(qs.map(s => startOfDay(s.date).getTime())).size;
  const byType = { tabata: 0, long_interval: 0, game: 0, lift: 0, walk: 0, cross_training: 0 };
  qs.forEach(s => { if (byType[s.type] != null) byType[s.type]++; });

  const sortedW = [...(weightLog || [])].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
  let wDelta = null;
  const inWin = sortedW.filter(w => new Date(w.logged_at) >= from);
  if (inWin.length) {
    const before = sortedW.filter(w => new Date(w.logged_at) < from);
    const baseline = before.length ? before[before.length - 1].weight : inWin[0].weight;
    wDelta = +(inWin[inWin.length - 1].weight - baseline).toFixed(1);
  }
  const wStr = wDelta != null && wDelta !== 0 ? `${wDelta < 0 ? "−" : "+"}${Math.abs(wDelta)} lb` : null;
  const shareText = `Last 3 months on The Work — ${count} workout${count === 1 ? "" : "s"} · ${fmtDur(minutes)} trained · ${activeDays} active days${wStr ? ` · ${wStr}` : ""} 💪`;
  const share = () => {
    if (navigator.share) navigator.share({ text: shareText }).catch(() => {});
    else { try { navigator.clipboard.writeText(shareText); toast("Copied to clipboard"); } catch (e) { toast(shareText); } }
  };

  const big = (value, label, color) => (
    <div style={{ flex: 1 }}>
      <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, marginTop: 5, letterSpacing: "0.06em" }}>{label}</div>
    </div>
  );

  return (
    <Surface accent={C.plum} padding={20}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Eyebrow color={C.plum}>Last 3 months</Eyebrow>
        <button onClick={share} className="btn" style={{ background: `${C.plum}18`, border: `1px solid ${C.plum}55`, color: C.plum, borderRadius: 9, padding: "5px 12px", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Share ↗</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {big(count, "WORKOUTS", C.bone)}
        {big(fmtDurShort(minutes), "TRAINED", C.electric)}
        {big(activeDays, "ACTIVE DAYS", C.moss)}
        {big(wStr || "—", "WEIGHT", wDelta < 0 ? C.moss : wDelta > 0 ? C.red : C.dim)}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`, fontSize: 12, fontFamily: FONT_MONO, color: C.dim, flexWrap: "wrap" }}>
        {["tabata", "long_interval", "lift", "cross_training", "walk", "game"].map(k => (
          <span key={k} title={RECOVERY.TYPES[k].label}>{RECOVERY.TYPES[k].emoji} {byType[k]}</span>
        ))}
      </div>
    </Surface>
  );
}

export function MonthlyRecap({ sessions, weightLog }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthName = now.toLocaleDateString("en-US", { month: "long" });
  const ms = sessions.filter(s => s.date.getTime() >= monthStart);
  const count = ms.length;
  const activeDays = new Set(ms.map(s => startOfDay(s.date).getTime())).size;
  const byType = { tabata: 0, long_interval: 0, game: 0, lift: 0, walk: 0, cross_training: 0 };
  ms.forEach(s => { if (byType[s.type] != null) byType[s.type]++; });

  const sortedW = [...(weightLog || [])].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
  let wDelta = null;
  const monthW = sortedW.filter(w => new Date(w.logged_at).getTime() >= monthStart);
  if (monthW.length) {
    const before = sortedW.filter(w => new Date(w.logged_at).getTime() < monthStart);
    const baseline = before.length ? before[before.length - 1].weight : monthW[0].weight;
    wDelta = +(monthW[monthW.length - 1].weight - baseline).toFixed(1);
  }
  const wStr = wDelta != null && wDelta !== 0 ? `${wDelta < 0 ? "−" : "+"}${Math.abs(wDelta)} lb` : null;
  const shareText = `${monthName} on The Work — ${count} workout${count === 1 ? "" : "s"}, ${activeDays} active day${activeDays === 1 ? "" : "s"}${wStr ? `, ${wStr}` : ""} 💪`;
  const share = () => {
    if (navigator.share) navigator.share({ text: shareText }).catch(() => {});
    else { try { navigator.clipboard.writeText(shareText); toast("Copied to clipboard"); } catch (e) { toast(shareText); } }
  };

  const big = (value, label, color) => (
    <div style={{ flex: 1 }}>
      <div className="num-tab h-display" style={{ fontSize: 30, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, marginTop: 5, letterSpacing: "0.06em" }}>{label}</div>
    </div>
  );

  return (
    <Surface accent={C.amber} padding={20}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Eyebrow color={C.amber}>{monthName} · this month</Eyebrow>
        <button onClick={share} className="btn" style={{ background: `${C.amber}18`, border: `1px solid ${C.amber}55`, color: C.amber, borderRadius: 9, padding: "5px 12px", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Share ↗</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {big(count, "WORKOUTS", C.bone)}
        {big(activeDays, "ACTIVE DAYS", C.moss)}
        {big(wStr || "—", "WEIGHT", wDelta < 0 ? C.moss : wDelta > 0 ? C.red : C.dim)}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`, fontSize: 12, fontFamily: FONT_MONO, color: C.dim, flexWrap: "wrap" }}>
        {["tabata", "long_interval", "lift", "cross_training", "walk", "game"].map(k => (
          <span key={k} title={RECOVERY.TYPES[k].label}>{RECOVERY.TYPES[k].emoji} {byType[k]}</span>
        ))}
      </div>
    </Surface>
  );
}

export function WeeklyRecap({ sessions, weightLog, prev = false }) {
  // prev=true recaps the week that just ended (weeks run Sun → Sat).
  const thisWk = startOfWeek(new Date());
  const wkStart = prev ? addDays(thisWk, -7) : thisWk;
  const wkEnd = prev ? thisWk : null;
  const ws = sessions.filter(s => s.date >= wkStart && (!wkEnd || s.date < wkEnd));
  const count = ws.length;
  const minutes = ws.reduce((a, s) => a + (s.duration || 0), 0);
  const activeDays = new Set(ws.map(s => startOfDay(s.date).getTime())).size;
  const byType = { tabata: 0, long_interval: 0, game: 0, lift: 0, walk: 0, cross_training: 0 };
  ws.forEach(s => { if (byType[s.type] != null) byType[s.type]++; });

  const sortedW = [...(weightLog || [])].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
  let wDelta = null;
  const weekW = sortedW.filter(w => new Date(w.logged_at) >= wkStart && (!wkEnd || new Date(w.logged_at) < wkEnd));
  if (weekW.length) {
    const before = sortedW.filter(w => new Date(w.logged_at) < wkStart);
    const baseline = before.length ? before[before.length - 1].weight : weekW[0].weight;
    wDelta = +(weekW[weekW.length - 1].weight - baseline).toFixed(1);
  }
  const wStr = wDelta != null && wDelta !== 0 ? `${wDelta < 0 ? "−" : "+"}${Math.abs(wDelta)} lb` : null;
  const shareText = `${prev ? "Last week" : "This week"} on The Work — ${count} workout${count === 1 ? "" : "s"} · ${fmtDur(minutes)} trained${wStr ? ` · ${wStr}` : ""} 💪`;
  const share = () => {
    if (navigator.share) navigator.share({ text: shareText }).catch(() => {});
    else { try { navigator.clipboard.writeText(shareText); toast("Copied to clipboard"); } catch (e) { toast(shareText); } }
  };

  const big = (value, label, color) => (
    <div style={{ flex: 1 }}>
      <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, marginTop: 5, letterSpacing: "0.06em" }}>{label}</div>
    </div>
  );

  return (
    <Surface accent={C.moss} padding={20}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Eyebrow color={C.moss}>{prev ? "Last week · the recap" : "This week"}</Eyebrow>
        <button onClick={share} className="btn" style={{ background: `${C.moss}18`, border: `1px solid ${C.moss}55`, color: C.moss, borderRadius: 9, padding: "5px 12px", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Share ↗</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {big(count, "WORKOUTS", C.bone)}
        {big(fmtDur(minutes), "TRAINED", C.electric)}
        {big(wStr || "—", "WEIGHT", wDelta < 0 ? C.moss : wDelta > 0 ? C.red : C.dim)}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`, fontSize: 12, fontFamily: FONT_MONO, color: C.dim, flexWrap: "wrap" }}>
        {["tabata", "long_interval", "lift", "cross_training", "walk", "game"].map(k => (
          <span key={k} title={RECOVERY.TYPES[k].label}>{RECOVERY.TYPES[k].emoji} {byType[k]}</span>
        ))}
      </div>
    </Surface>
  );
}

export function StrengthProgress({ gymSessions }) {
  // Per-exercise top-set weight per session, oldest first.
  const byName = {};
  [...gymSessions].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at)).forEach(h => {
    (h.exercises || []).forEach(ex => {
      if (!(ex.weight > 0)) return;
      if (!byName[ex.name]) byName[ex.name] = [];
      const arr = byName[ex.name];
      const last = arr[arr.length - 1];
      if (last && last.key === h.id) last.w = Math.max(last.w, ex.weight);
      else arr.push({ key: h.id, t: new Date(h.logged_at), w: ex.weight });
    });
  });
  const names = Object.keys(byName).filter(n => byName[n].length >= 2)
    .sort((a, b) => byName[b].length - byName[a].length).slice(0, 4);
  const [sel, setSel] = useState(null);
  if (!names.length) return null;
  const active = sel && names.includes(sel) ? sel : names[0];
  const pts = byName[active].slice(-10);
  const pr = Math.max(...byName[active].map(p => p.w));
  const first = pts[0].w, latest = pts[pts.length - 1].w, gain = latest - first;
  const mn = Math.min(...pts.map(p => p.w));
  const span = Math.max(1, pr - mn);

  return (
    <Surface accent={C.amber}>
      <Eyebrow color={C.amber}>Strength · top set over time</Eyebrow>
      <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        {names.map(n => (
          <button key={n} onClick={() => setSel(n)} className="btn" style={{
            padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 12,
            border: `1px solid ${n === active ? C.amber : C.line}`, background: n === active ? `${C.amber}18` : C.raised, color: n === active ? C.amber : C.dim,
          }}>{n}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 14 }}>
        <span className="num-tab h-display" style={{ fontSize: 30, fontWeight: 800, color: C.bone, letterSpacing: "-0.03em", lineHeight: 1 }}>{latest}<span style={{ fontSize: 13, color: C.dim, fontWeight: 500 }}> lbs</span></span>
        {gain !== 0 && (
          <span style={{ fontSize: 12, color: gain > 0 ? C.moss : C.red, fontFamily: FONT_MONO, fontWeight: 600 }}>
            {gain > 0 ? "▲" : "▼"} {Math.abs(gain)} lbs over {pts.length} sessions
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 84, marginTop: 12 }}>
        {pts.map((p, i) => {
          const isPRBar = p.w === pr;
          const h = 12 + Math.round(((p.w - mn) / span) * 54);
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }} title={`${p.t.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${p.w} lbs`}>
              <div style={{ fontSize: 8.5, color: isPRBar ? C.moss : C.cream, fontFamily: FONT_MONO, marginBottom: 3, fontWeight: isPRBar ? 700 : 400 }}>{p.w}</div>
              <div style={{ width: "100%", height: h, borderRadius: "4px 4px 2px 2px", background: isPRBar ? `linear-gradient(180deg, ${C.moss}, ${C.moss}99)` : `${C.amber}66`, transition: "height 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
              <div style={{ fontSize: 7.5, color: C.mute, fontFamily: FONT_MONO, marginTop: 3, whiteSpace: "nowrap" }}>{p.t.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, marginTop: 8 }}>Green bar = personal record. Heaviest set of each session.</div>
    </Surface>
  );
}

export const MUSCLE_GROUPS = [
  { key: "shoulders", label: "Shoulders", re: /shoulder|ohp|overhead|raise|delt|arnold/i },
  { key: "chest",     label: "Chest",     re: /bench|chest|fly|push[- ]?up|dip/i },
  { key: "arms",      label: "Arms",      re: /curl|tricep|bicep|row|pull|chin|lat/i },
  { key: "core",      label: "Core",      re: /\bab\b|abs|crunch|plank|core|sit[- ]?up/i },
  { key: "quads",     label: "Quads",     re: /squat|lunge|leg press|leg ext|deadlift|rdl|glute|hip|hamstring|quad|\bleg\b/i },
  { key: "calves",    label: "Calves",    re: /calf|calves/i },
];

export function muscleWork(cardioSessions, workouts) {
  const cutoff = Date.now() - 28 * 86400000;
  const w = {};
  MUSCLE_GROUPS.forEach(g => { w[g.key] = { recent: 0, lifetime: 0 }; });
  const add = (key, when, amt) => {
    w[key].lifetime += amt;
    if (when >= cutoff) w[key].recent += amt;
  };
  (cardioSessions || []).forEach(s => {
    const t = new Date(s.completed_at).getTime();
    if (s.workout_type === "cross_training") {
      if (s.focus === "upper") { add("chest", t, 1); add("shoulders", t, 1); add("arms", t, 1); add("core", t, 0.5); }
      else if (s.focus === "legs") { add("quads", t, 1); add("calves", t, 1); add("core", t, 0.5); }
      else if (s.focus === "cardio") { add("quads", t, 0.7); add("calves", t, 0.7); add("core", t, 0.3); }
      else { add("quads", t, 0.6); add("calves", t, 0.5); add("chest", t, 0.6); add("shoulders", t, 0.6); add("arms", t, 0.5); add("core", t, 0.4); } // total body
    } else { // tabata / long interval / game — running is leg work
      add("quads", t, 1); add("calves", t, 1); add("core", t, 0.3);
    }
  });
  (workouts || []).forEach(wk => {
    if (!wk.session_name) return;
    const t = new Date(wk.logged_at).getTime();
    if (wk.session_name === "Treadmill Walk") { add("quads", t, 0.3); add("calves", t, 0.3); return; }
    const hit = new Set();
    (wk.exercises || []).forEach(ex => {
      const name = ex.name || "";
      for (const g of MUSCLE_GROUPS) if (g.re.test(name)) { hit.add(g.key); break; }
    });
    if (hit.size === 0) { hit.add("chest"); hit.add("quads"); } // unlabeled lift: assume full body
    hit.forEach(k => add(k, t, 1));                             // each group once per gym session
  });
  return w;
}

export function muscleFill(recent) {
  if (recent >= 6) return { color: C.rust,   alpha: "F0", label: "On fire" };
  if (recent >= 3) return { color: C.rustHi, alpha: "CC", label: "Building" };
  if (recent >= 1) return { color: C.amber,  alpha: "88", label: "Warming" };
  return { color: C.faint, alpha: "FF", label: "Dormant" };
}

export const muscleGrow = (lifetime) => 1 + Math.min(0.15, lifetime * 0.005);

export function MuscleBody({ work, width = 150 }) {
  const info = {};
  MUSCLE_GROUPS.forEach(g => {
    const d = work[g.key] || { recent: 0, lifetime: 0 };
    info[g.key] = { fill: (f => `${f.color}${f.alpha}`)(muscleFill(Math.round(d.recent))), grow: muscleGrow(d.lifetime) };
  });
  const stroke = C.line;
  // Scale a muscle about its own center so growth reads as the muscle swelling.
  const T = (cx, cy, key) => `translate(${cx} ${cy}) scale(${info[key].grow}) translate(${-cx} ${-cy})`;
  const F = (key) => info[key].fill;

  return (
    <svg width={width} height={width * 1.73} viewBox="0 0 220 380" style={{ flexShrink: 0 }}>
      {/* base silhouette */}
      <circle cx="110" cy="26" r="16" fill={C.raised} stroke={stroke} strokeWidth="1.5" />
      <rect x="101" y="40" width="18" height="12" rx="5" fill={C.raised} stroke={stroke} strokeWidth="1" />
      <path d="M 74 56 L 146 56 C 152 100 146 134 140 172 L 80 172 C 74 134 68 100 74 56 Z" fill={C.raised} stroke={stroke} strokeWidth="1.5" />
      <rect x="47" y="60" width="21" height="102" rx="10.5" fill={C.raised} stroke={stroke} strokeWidth="1.5" transform="rotate(5 57 60)" />
      <rect x="152" y="60" width="21" height="102" rx="10.5" fill={C.raised} stroke={stroke} strokeWidth="1.5" transform="rotate(-5 163 60)" />
      <rect x="83" y="172" width="26" height="112" rx="12" fill={C.raised} stroke={stroke} strokeWidth="1.5" />
      <rect x="111" y="172" width="26" height="112" rx="12" fill={C.raised} stroke={stroke} strokeWidth="1.5" />
      <rect x="86" y="284" width="20" height="76" rx="9" fill={C.raised} stroke={stroke} strokeWidth="1.5" />
      <rect x="114" y="284" width="20" height="76" rx="9" fill={C.raised} stroke={stroke} strokeWidth="1.5" />

      {/* traps + delts */}
      <g transform={T(110, 70, "shoulders")}>
        <path d="M 95 52 L 78 62 L 108 62 Z" fill={F("shoulders")} stroke={stroke} strokeWidth="1" />
        <path d="M 125 52 L 142 62 L 112 62 Z" fill={F("shoulders")} stroke={stroke} strokeWidth="1" />
        <ellipse cx="72" cy="74" rx="14" ry="13" fill={F("shoulders")} stroke={stroke} strokeWidth="1" />
        <ellipse cx="148" cy="74" rx="14" ry="13" fill={F("shoulders")} stroke={stroke} strokeWidth="1" />
      </g>
      {/* pecs */}
      <g transform={T(110, 95, "chest")}>
        <path d="M 84 72 C 74 84 80 102 96 106 C 104 108 108 104 108 98 L 108 76 C 100 70 90 70 84 72 Z" fill={F("chest")} stroke={stroke} strokeWidth="1" />
        <path d="M 136 72 C 146 84 140 102 124 106 C 116 108 112 104 112 98 L 112 76 C 120 70 130 70 136 72 Z" fill={F("chest")} stroke={stroke} strokeWidth="1" />
      </g>
      {/* biceps + forearms */}
      <g transform={T(58, 112, "arms")}>
        <ellipse cx="59" cy="102" rx="9" ry="18" fill={F("arms")} stroke={stroke} strokeWidth="1" transform="rotate(7 59 102)" />
        <ellipse cx="63" cy="142" rx="7" ry="17" fill={F("arms")} stroke={stroke} strokeWidth="1" transform="rotate(9 63 142)" />
      </g>
      <g transform={T(162, 112, "arms")}>
        <ellipse cx="161" cy="102" rx="9" ry="18" fill={F("arms")} stroke={stroke} strokeWidth="1" transform="rotate(-7 161 102)" />
        <ellipse cx="157" cy="142" rx="7" ry="17" fill={F("arms")} stroke={stroke} strokeWidth="1" transform="rotate(-9 157 142)" />
      </g>
      {/* abs + obliques */}
      <g transform={T(110, 138, "core")}>
        <rect x="94" y="112" width="32" height="52" rx="9" fill={F("core")} stroke={stroke} strokeWidth="1" />
        <line x1="110" y1="114" x2="110" y2="162" stroke={stroke} strokeWidth="1.2" />
        <line x1="96" y1="126" x2="124" y2="126" stroke={stroke} strokeWidth="1" />
        <line x1="96" y1="139" x2="124" y2="139" stroke={stroke} strokeWidth="1" />
        <line x1="96" y1="152" x2="124" y2="152" stroke={stroke} strokeWidth="1" />
        <path d="M 88 114 C 84 128 84 146 88 160 L 92 158 C 89 145 89 128 92 116 Z" fill={F("core")} stroke={stroke} strokeWidth="0.8" />
        <path d="M 132 114 C 136 128 136 146 132 160 L 128 158 C 131 145 131 128 128 116 Z" fill={F("core")} stroke={stroke} strokeWidth="0.8" />
      </g>
      {/* quads */}
      <g transform={T(96, 224, "quads")}>
        <path d="M 86 176 C 78 200 78 236 88 262 C 94 270 102 268 106 258 C 110 234 108 200 104 178 Z" fill={F("quads")} stroke={stroke} strokeWidth="1" />
      </g>
      <g transform={T(124, 224, "quads")}>
        <path d="M 134 176 C 142 200 142 236 132 262 C 126 270 118 268 114 258 C 110 234 112 200 116 178 Z" fill={F("quads")} stroke={stroke} strokeWidth="1" />
      </g>
      {/* calves */}
      <g transform={T(96, 312, "calves")}>
        <ellipse cx="96" cy="310" rx="10" ry="24" fill={F("calves")} stroke={stroke} strokeWidth="1" />
      </g>
      <g transform={T(124, 312, "calves")}>
        <ellipse cx="124" cy="310" rx="10" ry="24" fill={F("calves")} stroke={stroke} strokeWidth="1" />
      </g>
    </svg>
  );
}

export function BodySim({ cardioSessions, workouts, weightLog }) {
  const work = muscleWork(cardioSessions, workouts);
  const cur = (weightLog && weightLog[0] && Number(weightLog[0].weight)) || 225;
  const pctToGoal = Math.round((1 - Math.max(0, Math.min(1, (cur - 200) / 25))) * 100);

  return (
    <Surface accent={C.rust}>
      <Eyebrow color={C.rust}>The rebuild · muscles worked</Eyebrow>
      <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "center" }}>
        <MuscleBody work={work} width={150} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {MUSCLE_GROUPS.map(g => {
            const d = work[g.key];
            const n = Math.round(d.recent);
            const f = muscleFill(n);
            const grownPct = Math.round((muscleGrow(d.lifetime) - 1) * 100);
            return (
              <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5.5px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ width: 9, height: 9, borderRadius: 999, background: `${f.color}${f.alpha}`, border: `1px solid ${C.line}`, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: n > 0 ? C.bone : C.dim }}>{g.label}</span>
                </div>
                <span style={{ fontSize: 11.5, color: C.dim, fontFamily: FONT_MONO, whiteSpace: "nowrap" }}>{n}× 4wk{grownPct > 0 ? ` · +${grownPct}%` : ""}</span>
              </div>
            );
          })}
          <div style={{ paddingTop: 8, display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="num-tab h-display" style={{ fontSize: 20, fontWeight: 800, color: C.moss, letterSpacing: "-0.03em" }}>{pctToGoal}%</span>
            <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO }}>TO {200} LBS ({cur})</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: C.mute, fontFamily: FONT_MONO, marginTop: 12, lineHeight: 1.55 }}>
        Color = worked in the last 4 weeks · +% = how much bigger that muscle is drawn from your lifetime volume. A simulation from your logs, not a scan.
      </div>
    </Surface>
  );
}

export function lerpHex(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export function AnatomicalHeart({ growth, beatDur, size = 150 }) {
  const g = Math.max(0, Math.min(1, growth));
  const myo = lerpHex("#D89A90", "#B41E1E", g);        // myocardium: pale → crimson
  const myoDeep = lerpHex("#C08279", "#7E1010", g);    // shaded muscle
  const artery = lerpHex("#D8A79B", "#C33A2A", g);     // aorta
  const vein = lerpHex("#9FB0C4", "#5F7FB2", g);       // vena cava / veins
  const pulm = lerpHex("#B4A5C4", "#7D5FA8", g);       // pulmonary trunk
  const scale = 0.78 + 0.26 * g;                       // chambers grow with training
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${scale})`, animation: `bttdBeat ${beatDur}s ease-in-out infinite`, filter: g > 0.4 ? `drop-shadow(0 0 ${Math.round(10 * g)}px ${myo}55)` : "none" }}>
        <svg width={size} height={size} viewBox="0 0 200 200">
          <defs>
            <radialGradient id="bttdMyo" cx="38%" cy="32%" r="80%">
              <stop offset="0%" stopColor={myo} />
              <stop offset="70%" stopColor={myoDeep} />
              <stop offset="100%" stopColor={lerpHex(myoDeep, "#000000", 0.25)} />
            </radialGradient>
            <linearGradient id="bttdAo" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={lerpHex(artery, "#FFFFFF", 0.18)} />
              <stop offset="100%" stopColor={artery} />
            </linearGradient>
          </defs>

          {/* superior vena cava (blue, behind the base) */}
          <path d="M 136 18 C 138 34, 139 48, 138 62 L 120 66 C 121 48, 122 32, 122 18 Z" fill={vein} />
          {/* aortic arch with three branch stubs */}
          <path d="M 86 62 C 80 32, 106 16, 124 30 C 134 38, 138 50, 136 60 L 118 58 C 119 48, 115 42, 109 40 C 101 37, 96 46, 99 60 Z" fill="url(#bttdAo)" />
          <rect x="90" y="18" width="7" height="18" rx="3.5" fill={artery} transform="rotate(-8 93 27)" />
          <rect x="101" y="14" width="7" height="18" rx="3.5" fill={artery} />
          <rect x="112" y="16" width="7" height="18" rx="3.5" fill={artery} transform="rotate(8 115 25)" />
          {/* pulmonary trunk crossing beneath the arch */}
          <path d="M 74 74 C 66 56, 76 42, 94 44 L 96 56 C 86 55, 80 62, 84 74 Z" fill={pulm} />

          {/* heart body — atria across the base, ventricles tapering to the apex */}
          <path d="M 62 84
                   C 50 70, 62 54, 78 60
                   C 88 50, 108 52, 116 62
                   C 132 52, 152 62, 154 82
                   C 158 108, 142 142, 112 166
                   C 104 176, 94 178, 88 170
                   C 62 148, 50 112, 62 84 Z" fill="url(#bttdMyo)" />

          {/* interventricular groove — the seam between the ventricles */}
          <path d="M 105 72 C 101 96, 99 126, 95 156" stroke={lerpHex(myoDeep, "#000000", 0.35)} strokeWidth="3" fill="none" opacity="0.4" strokeLinecap="round" />

          {/* coronary arteries — vascularization fills in as fitness builds */}
          <g stroke={lerpHex("#E8B8AE", "#E4574A", g)} strokeWidth="1.7" fill="none" strokeLinecap="round" opacity={0.15 + 0.8 * g}>
            <path d="M 103 74 C 94 82, 85 96, 80 116 C 78 124, 77 130, 78 136" />
            <path d="M 90 94 C 84 100, 80 108, 78 116" />
            <path d="M 106 84 C 116 94, 124 110, 122 128 C 121 136, 118 142, 114 148" />
            <path d="M 116 106 C 122 112, 126 120, 126 128" />
          </g>

          {/* sheen */}
          <ellipse cx="82" cy="98" rx="13" ry="26" fill="#FFFFFF" opacity={0.10 + 0.06 * g} transform="rotate(18 82 98)" />
        </svg>
      </div>
    </div>
  );
}

export function HeartSim({ cardioSessions, workouts }) {
  const all = normalizeAll(cardioSessions, workouts);
  const isAerobic = (s) => s.type === "tabata" || s.type === "long_interval" || s.type === "game" || (s.type === "cross_training" && s.focus === "cardio");
  const minsIn = (from, to) => all.filter(s => { const t = s.date.getTime(); return t >= from && t < to; })
    .reduce((a, s) => a + (isAerobic(s) ? (s.duration || 0) : s.type === "walk" ? (s.duration || 0) * 0.5 : 0), 0);
  const now = Date.now(), W = 28 * 86400000;
  const mins = Math.round(minsIn(now - W, now + 1));
  const prev = Math.round(minsIn(now - 2 * W, now - W));
  const lifetime = Math.round(minsIn(0, now + 1));
  // Strength blends the current block (can dip on an off month) with the
  // lifetime base (keeps earned adaptation from vanishing overnight).
  const growth = Math.min(1, 0.6 * Math.min(1, mins / 300) + 0.4 * Math.min(1, lifetime / 3000));
  const beatDur = (0.85 + 0.45 * growth).toFixed(2); // fitter heart = slower, calmer resting beat
  const TIERS = [
    { name: "Idling", min: 0, blurb: "under 1h of hard cardio in 4 weeks" },
    { name: "Warming up", min: 60, blurb: "1h – 2h 30m per 4 weeks" },
    { name: "Strong pump", min: 150, blurb: "2h 30m – 5h per 4 weeks" },
    { name: "Athlete's heart", min: 300, blurb: "5h+ per 4 weeks" },
  ];
  const tierIdx = TIERS.reduce((a, t, i) => (mins >= t.min ? i : a), 0);
  const tier = TIERS[tierIdx].name;
  const nextTier = TIERS[tierIdx + 1] || null;
  const diff = mins - prev;
  const [showInfo, setShowInfo] = useState(false);

  // The receipt: where this block's aerobic minutes actually came from.
  const RECEIPT_LABELS = {
    long_interval: { emoji: "⚡", label: "Long intervals / fast breaks" },
    cross_training: { emoji: "💦", label: "Conditioning classes" },
    game: { emoji: "🏀", label: "Basketball games" },
    tabata: { emoji: "🔥", label: "Tabatas" },
    walk: { emoji: "🚶", label: "Walks (half credit — easy aerobic)" },
  };
  const receipt = {};
  all.forEach(s => {
    const t = s.date.getTime();
    if (t < now - W || t > now) return;
    let credit = 0, key = null;
    if (s.type === "walk") { credit = (s.duration || 0) * 0.5; key = "walk"; }
    else if (s.type === "cross_training" && s.focus === "cardio") { credit = s.duration || 0; key = "cross_training"; }
    else if (s.type === "tabata" || s.type === "long_interval" || s.type === "game") { credit = s.duration || 0; key = s.type; }
    if (key && credit > 0) {
      if (!receipt[key]) receipt[key] = { n: 0, min: 0 };
      receipt[key].n++; receipt[key].min += credit;
    }
  });

  return (
    <Surface accent={C.red}>
      <style>{`@keyframes bttdBeat { 0%, 100% { transform: scale(1); } 12% { transform: scale(1.09); } 24% { transform: scale(1); } 36% { transform: scale(1.05); } 48% { transform: scale(1); } }`}</style>
      <Eyebrow color={C.red}>The engine · your heart on cardio</Eyebrow>
      <div style={{ display: "flex", gap: 16, marginTop: 14, alignItems: "center" }}>
        <div style={{ flexShrink: 0 }}>
          <AnatomicalHeart growth={growth} beatDur={beatDur} size={140} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="h-display" style={{ fontSize: 20, fontWeight: 800, color: C.red, letterSpacing: "-0.02em" }}>{tier}</div>
          <div className="num-tab" style={{ fontSize: 14.5, color: C.bone, fontFamily: FONT_MONO, fontWeight: 700, marginTop: 6, lineHeight: 1.45 }}>{fmtDur(mins)} <span style={{ color: C.dim, fontWeight: 400 }}>of hard cardio in the last 4 weeks</span></div>
          {prev > 0 && Math.abs(diff) >= 5 && (
            <div style={{ fontSize: 12.5, color: diff > 0 ? C.moss : C.amber, fontFamily: FONT_MONO, marginTop: 5, fontWeight: 600, lineHeight: 1.45 }}>
              {diff > 0 ? "▲" : "▼"} {fmtDur(Math.abs(diff))} {diff > 0 ? "more" : "less"} than the 4 weeks before that
            </div>
          )}
          {nextTier && (
            <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>{fmtDur(nextTier.min - mins)} more → {nextTier.name}</div>
          )}
        </div>
      </div>

      {/* Engine score — the number that answers "how's my motor?" */}
      {(() => {
        const eng = engineModel(all);
        if (eng.score <= 0) return null;
        const recent = eng.bumps.slice(-3).reverse();
        return (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: C.red, fontFamily: FONT_MONO, letterSpacing: "0.08em", fontWeight: 700 }}>ENGINE SCORE</span>
              <span className="num-tab h-display" style={{ fontSize: 30, fontWeight: 800, color: C.bone, letterSpacing: "-0.03em", lineHeight: 1 }}>{Math.round(eng.score)}</span>
              {eng.weekPct != null && Math.abs(eng.weekPct) >= 0.5 && (
                <span style={{ fontSize: 13, color: eng.weekPct > 0 ? C.moss : C.amber, fontFamily: FONT_MONO, fontWeight: 700 }}>
                  {eng.weekPct > 0 ? "▲" : "▼"} {Math.abs(eng.weekPct).toFixed(1)}% this week
                </span>
              )}
            </div>
            {/* All-time high + fed streak */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 7, fontSize: 12, fontFamily: FONT_MONO }}>
              {eng.score >= eng.peak - 0.05
                ? <span style={{ color: C.moss, fontWeight: 700 }}>🏁 ALL-TIME HIGH</span>
                : <span style={{ color: C.dim }}>peak {Math.round(eng.peak)} · {(eng.peak - eng.score).toFixed(1)} pts to reclaim</span>}
              {eng.fedStreak > 0 && <span style={{ color: C.amber, fontWeight: 600 }}>⛽ fed {eng.fedStreak} day{eng.fedStreak === 1 ? "" : "s"} straight</span>}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {recent.map((b, i) => (
                <span key={i} style={{ fontSize: 11.5, fontFamily: FONT_MONO, color: C.cream, background: C.raised, border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 10px" }}>
                  {(RECOVERY.TYPES[b.s.type] || {}).emoji} {new Date(b.day).toLocaleDateString("en-US", { weekday: "short" })} +{b.pct.toFixed(1)}%
                </span>
              ))}
            </div>
            {/* Engine history — the line you can't stop watching */}
            {eng.series.length >= 14 && (() => {
              const window = eng.series.slice(-120);
              const maxY = Math.max(115, eng.peak * 1.08);
              const X = (i) => (i / (window.length - 1)) * 316 + 2;
              const Y = (v) => 78 - (v / maxY) * 74;
              const pts = window.map((p, i) => `${X(i).toFixed(1)},${Y(p.F).toFixed(1)}`).join(" ");
              const peakIdx = window.reduce((a, p, i) => (p.F > window[a].F ? i : a), 0);
              const last = window[window.length - 1];
              return (
                <div style={{ marginTop: 12 }}>
                  <svg viewBox="0 0 320 84" style={{ width: "100%", height: "auto", display: "block" }}>
                    <line x1="2" y1={Y(110)} x2="318" y2={Y(110)} stroke={C.moss} strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
                    <text x="316" y={Y(110) - 3} textAnchor="end" fontSize="8" fill={C.moss} fontFamily="monospace">110 GAME-READY</text>
                    <polyline points={pts} fill="none" stroke={C.red} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    <circle cx={X(peakIdx)} cy={Y(window[peakIdx].F)} r="3" fill={C.amber} />
                    <text x={Math.min(290, Math.max(24, X(peakIdx)))} y={Math.max(9, Y(window[peakIdx].F) - 6)} textAnchor="middle" fontSize="8" fill={C.amber} fontFamily="monospace">peak {Math.round(eng.peak)}</text>
                    <circle cx={X(window.length - 1)} cy={Y(last.F)} r="3.5" fill={C.bone} />
                  </svg>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.mute, fontFamily: FONT_MONO }}>
                    <span>{new Date(window[0].t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span>TODAY</span>
                  </div>
                </div>
              );
            })()}
            {/* Game-ready target: a full 40-min game is ~320 load; it stops
               feeling like a spike once it's ≤ ~3× your chronic daily load. */}
            {(() => {
              const GAME_READY = 110;
              const pct = Math.min(100, Math.round((eng.score / GAME_READY) * 100));
              const there = eng.score >= GAME_READY;
              return (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.06em" }}>🏀 GAME-READY · TWO 20-MIN HALVES</span>
                    <span className="num-tab" style={{ fontSize: 12.5, color: there ? C.moss : C.bone, fontFamily: FONT_MONO, fontWeight: 700 }}>{Math.round(eng.score)} / {GAME_READY}</span>
                  </div>
                  <div style={{ background: C.raised, borderRadius: 999, height: 7, overflow: "hidden", border: `1px solid ${C.line}`, marginTop: 6 }}>
                    <div style={{ width: pct + "%", height: "100%", background: there ? C.moss : `linear-gradient(90deg, ${C.red}, ${C.rustHi})`, borderRadius: 999, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: C.dim, fontFamily: FONT_MONO, marginTop: 6, lineHeight: 1.5 }}>
                    {there
                      ? "Above game-ready — a full 40-minute game is routine load for your engine now."
                      : `At ${GAME_READY}, a full game (~320 load) is only ~3× your daily base — hard but routine, not a Q2 gas-out.`}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* The full explanation, for anyone asking "what does all this mean?" */}
      <button onClick={() => setShowInfo(v => !v)} className="btn" style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
        <span style={{ fontSize: 12, color: C.electric, fontFamily: FONT_MONO, letterSpacing: "0.08em", fontWeight: 700 }}>ⓘ WHAT DO THESE NUMBERS MEAN?</span>
        <span style={{ fontSize: 9, color: C.dim }}>{showInfo ? "▲" : "▼"}</span>
      </button>
      {showInfo && (
        <div className="ease-up" style={{ marginTop: 10, padding: "12px 14px", background: C.raised, borderRadius: 12, border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 11.5, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.08em", fontWeight: 700 }}>WHERE YOUR {fmtDur(mins).toUpperCase()} CAME FROM (LAST 28 DAYS)</div>
          <div style={{ marginTop: 8 }}>
            {Object.keys(RECEIPT_LABELS).filter(k => receipt[k]).map(k => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "5px 0", fontSize: 14 }}>
                <span style={{ color: C.cream }}>{RECEIPT_LABELS[k].emoji} {receipt[k].n}× {RECEIPT_LABELS[k].label}</span>
                <span className="num-tab" style={{ color: C.bone, fontFamily: FONT_MONO, fontWeight: 700, flexShrink: 0 }}>{fmtDur(Math.round(receipt[k].min))}</span>
              </div>
            ))}
            {Object.keys(receipt).length === 0 && <div style={{ fontSize: 14, color: C.dim }}>Nothing yet this block — the next hard cardio session starts the clock.</div>}
          </div>
          <p style={{ fontSize: 13.5, color: C.cream, margin: "10px 0 0", lineHeight: 1.6 }} className="h-serif">
            Only work that pushes your heart counts: Tabatas, long intervals and fast-break drills, basketball games, and cardio-focused Sweat440 classes at full value — easy walks at half value. Lifts and strength classes build muscle, so they feed the body card instead.
          </p>

          <div style={{ fontSize: 11.5, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.08em", marginTop: 16, fontWeight: 700 }}>THE COMPARISON</div>
          <p style={{ fontSize: 13.5, color: C.cream, margin: "6px 0 0", lineHeight: 1.6 }} className="h-serif">
            {prev > 0
              ? <>The little arrow compares this rolling 4-week block against the 4 weeks before it: {fmtDur(mins)} now vs {fmtDur(prev)} then{Math.abs(diff) >= 5 ? ` — so you're ${fmtDur(Math.abs(diff))} ${diff > 0 ? "ahead of" : "behind"} your previous pace` : " — essentially even"}. It's a trend check, not a judgement — a lighter month after a heavy one is often exactly what the plan wants.</>
              : <>The arrow (when it appears) compares this rolling 4-week block against the 4 weeks before it. Your previous block has no logged cardio, so there's nothing to compare yet — it shows up once two blocks exist.</>}
          </p>

          <div style={{ fontSize: 11.5, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.08em", marginTop: 16, fontWeight: 700 }}>THE TIERS</div>
          <div style={{ marginTop: 6 }}>
            {TIERS.map((t, i) => (
              <div key={t.name} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "3px 0" }}>
                <span style={{ fontSize: 14, fontWeight: i === tierIdx ? 800 : 500, color: i === tierIdx ? C.red : C.dim, minWidth: 122 }}>{i === tierIdx ? "→ " : ""}{t.name}</span>
                <span style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>{t.blurb}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11.5, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.08em", marginTop: 16, fontWeight: 700 }}>THE ENGINE SCORE — YOUR % IMPROVEMENTS</div>
          {(() => {
            const eng = engineModel(all);
            const last = eng.bumps.slice(-6).reverse();
            return (
              <>
                <p style={{ fontSize: 13.5, color: C.cream, margin: "6px 0 0", lineHeight: 1.6 }} className="h-serif">
                  Every aerobic session earns a training load — minutes × how hard it felt (RPE), the "session-RPE" method sports scientists use. Your Engine score is a 42-day rolling build-up of that load (what coaching platforms call CTL, chronic training load): each session tops it up by its load ÷ 42, and it drains about 2.4% on any day you don't feed it — because real fitness fades without work. The percentages below are how much each session grew your score the moment you logged it. Longer and harder = bigger bump: a full game lifts you far more than a 10-minute fast break.
                </p>
                <div style={{ marginTop: 8 }}>
                  {last.map((b, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "5px 0", fontSize: 14 }}>
                      <span style={{ color: C.cream }}>{(RECOVERY.TYPES[b.s.type] || {}).emoji} {new Date(b.day).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {(RECOVERY.TYPES[b.s.type] || {}).label}{b.s.duration ? ` · ${Math.round(b.s.duration)}m` : ""}</span>
                      <span className="num-tab" style={{ color: C.moss, fontFamily: FONT_MONO, fontWeight: 700, flexShrink: 0 }}>+{b.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 13.5, color: C.cream, margin: "8px 0 0", lineHeight: 1.6 }} className="h-serif">
                  It's a consistency engine, not a lab test — a model of your aerobic base built purely from what you log, so it can't know your actual VO₂max. But its direction is trustworthy: weeks it climbs, your motor is genuinely building.
                </p>
              </>
            );
          })()}

          <div style={{ fontSize: 11.5, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.08em", marginTop: 16, fontWeight: 700 }}>WHY THE HEART CHANGES</div>
          <p style={{ fontSize: 13.5, color: C.cream, margin: "6px 0 0", lineHeight: 1.6 }} className="h-serif">
            The drawing grows and deepens in color as your aerobic base builds — 60% from this 4-week block, 40% from everything you've ever logged ({fmtDur(lifetime)} lifetime), so one quiet week dims it a little but never erases what you've built. The coronary vessels fill in as it strengthens, and the beat slows down, because that's the real adaptation: endurance work stretches the left ventricle so it holds and pumps more blood per stroke — the classic "athlete's heart." A bigger, more efficient pump needs fewer beats at rest, which is why trained resting heart rates drift down over months of this. All of it here is a simulation drawn from your logs — a mirror of your training, not a medical measurement.
          </p>
        </div>
      )}

      {!showInfo && (
        <div style={{ fontSize: 13.5, color: C.cream, marginTop: 10, lineHeight: 1.6 }} className="h-serif">
          Yes — it really does get bigger. Endurance work stretches the left ventricle so it holds and pumps more blood per beat (the "athlete's heart"), and your resting rate drops because each beat does more.
        </div>
      )}
    </Surface>
  );
}

export function BoxScoreCard({ gameSessions, allActivity }) {
  const stat = gameSessions
    .filter(g => g.points != null || g.rebounds != null)
    .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));
  if (!stat.length) return null;

  const eng = engineModel(allActivity);
  const byDay = new Map(eng.series.map(p => [p.t, p.F]));
  const engAt = (g) => {
    const e = byDay.get(startOfDay(new Date(g.completed_at)).getTime());
    return e != null ? Math.round(e) : null;
  };

  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const pts = stat.filter(g => g.points != null).map(g => g.points);
  const rbs = stat.filter(g => g.rebounds != null).map(g => g.rebounds);
  const ppg = avg(pts), rpg = avg(rbs);
  const fmt1 = (n) => n == null ? "—" : (Math.round(n * 10) / 10).toString();

  // Recent-half vs early-half trend, once there's enough of a season.
  const trendOf = (vals) => {
    if (vals.length < 4) return null;
    const half = Math.floor(vals.length / 2);
    return avg(vals.slice(-half)) - avg(vals.slice(0, half));
  };
  const pTrend = trendOf(pts), rTrend = trendOf(rbs);

  // Does a bigger engine produce a bigger stat line?
  const withEng = stat.map(g => ({ g, e: engAt(g), line: (g.points || 0) + (g.rebounds || 0) })).filter(x => x.e != null);
  let engVerdict = null;
  if (withEng.length >= 4) {
    const med = [...withEng].sort((a, b) => a.e - b.e)[Math.floor(withEng.length / 2)].e;
    const hi = withEng.filter(x => x.e >= med), lo = withEng.filter(x => x.e < med);
    if (hi.length >= 2 && lo.length >= 2) {
      const hAvg = avg(hi.map(x => x.line)), lAvg = avg(lo.map(x => x.line));
      engVerdict = `⛽ Big-engine nights (score ${med}+) average ${fmt1(hAvg)} pts+reb · smaller-engine nights ${fmt1(lAvg)}.`;
    }
  }

  const recent = stat.slice(-8);
  return (
    <div className="ease-up-2" style={{ marginBottom: 12 }}>
      <Surface accent={C.rust}>
        <Eyebrow color={C.rust}>Box score · Thursday nights</Eyebrow>

        {/* Season averages — the headline */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
          <div>
            <div className="num-tab h-display" style={{ fontSize: 36, fontWeight: 800, color: C.rust, letterSpacing: "-0.04em", lineHeight: 1 }}>{fmt1(ppg)}</div>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>PTS / GAME</div>
            {pTrend != null && <div style={{ fontSize: 12, fontWeight: 700, color: pTrend >= 0 ? C.moss : C.amber, fontFamily: FONT_MONO, marginTop: 4 }}>{pTrend >= 0 ? "▲" : "▼"} {fmt1(Math.abs(pTrend))}</div>}
          </div>
          <div>
            <div className="num-tab h-display" style={{ fontSize: 36, fontWeight: 800, color: C.electric, letterSpacing: "-0.04em", lineHeight: 1 }}>{fmt1(rpg)}</div>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>REB / GAME</div>
            {rTrend != null && <div style={{ fontSize: 12, fontWeight: 700, color: rTrend >= 0 ? C.moss : C.amber, fontFamily: FONT_MONO, marginTop: 4 }}>{rTrend >= 0 ? "▲" : "▼"} {fmt1(Math.abs(rTrend))}</div>}
          </div>
          <div>
            <div className="num-tab h-display" style={{ fontSize: 36, fontWeight: 800, color: C.bone, letterSpacing: "-0.04em", lineHeight: 1 }}>{stat.length}</div>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>GAMES</div>
          </div>
        </div>

        {/* Game-by-game stat lines */}
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.line}` }}>
          {recent.map(g => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.bone }}>
                  {new Date(g.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                {g.notes && <div style={{ fontSize: 10.5, color: C.mute, fontFamily: FONT_MONO, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.notes}</div>}
              </div>
              <div style={{ textAlign: "center", width: 52 }}>
                <div className="num-tab h-display" style={{ fontSize: 22, fontWeight: 800, color: C.rust, lineHeight: 1 }}>{g.points != null ? g.points : "—"}</div>
                <div style={{ fontSize: 8.5, color: C.dim, fontFamily: FONT_MONO, marginTop: 2 }}>PTS</div>
              </div>
              <div style={{ textAlign: "center", width: 52 }}>
                <div className="num-tab h-display" style={{ fontSize: 22, fontWeight: 800, color: C.electric, lineHeight: 1 }}>{g.rebounds != null ? g.rebounds : "—"}</div>
                <div style={{ fontSize: 8.5, color: C.dim, fontFamily: FONT_MONO, marginTop: 2 }}>REB</div>
              </div>
              {engAt(g) != null && (
                <div style={{ textAlign: "center", width: 52 }}>
                  <div className="num-tab h-display" style={{ fontSize: 16, fontWeight: 700, color: C.amber, lineHeight: 1, marginTop: 3 }}>⛽{engAt(g)}</div>
                  <div style={{ fontSize: 8.5, color: C.dim, fontFamily: FONT_MONO, marginTop: 4 }}>ENGINE</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {engVerdict
          ? <p className="h-serif" style={{ fontSize: 14.5, color: C.cream, margin: "12px 0 0", lineHeight: 1.5 }}>{engVerdict}</p>
          : <div style={{ fontSize: 11, color: C.mute, fontFamily: FONT_MONO, marginTop: 12, lineHeight: 1.5 }}>
              Log points + rebounds with each game. Once a few are in, this card shows whether a bigger engine shows up in the stat line.
            </div>}
      </Surface>
    </div>
  );
}

export function StatsTab({ history, weightLog, cardioSessions, legsLog = {} }) {
  const allActivity = normalizeAll(cardioSessions, history);
  const gymSessions = history.filter(h => h.session_name && h.session_name !== "Treadmill Walk");
  const treadmillSessions = history.filter(h => h.session_name === "Treadmill Walk");
  // Conditioning now lives in cardio_sessions (engine-managed).
  const tabataSessions = cardioSessions.filter(s => s.workout_type === "tabata");
  const longIntervalSessions = cardioSessions.filter(s => s.workout_type === "long_interval");
  const gameSessions = cardioSessions.filter(s => s.workout_type === "game");
  const crossSessions = cardioSessions.filter(s => s.workout_type === "cross_training");

  const totalVolume = gymSessions.reduce((a, h) => a + (h.total_volume || 0), 0);
  const wkStartMs = startOfWeek(new Date()).getTime();
  const thisWeekVol = gymSessions.filter(h => new Date(h.logged_at).getTime() >= wkStartMs).reduce((a,h) => a+(h.total_volume||0),0);
  const totalMiles = treadmillSessions.reduce((a,h) => a + (h.exercises?.[0]?.miles||0), 0);
  const totalMin = treadmillSessions.reduce((a,h) => a + (h.exercises?.[0]?.duration||0), 0);

  const pbs = {};
  gymSessions.forEach(h => (h.exercises||[]).forEach(ex => { if (ex.weight > 0 && (!pbs[ex.name] || ex.weight > pbs[ex.name])) pbs[ex.name] = ex.weight; }));

  const weeklyVol = {};
  gymSessions.forEach(h => {
    const d = new Date(h.logged_at); const ws = startOfWeek(d);
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
      <PageTitle kicker="Proof · of the work">Progress</PageTitle>

      {gymSessions.length === 0 && cardioSessions.length === 0 && treadmillSessions.length === 0 && (
        <Surface style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p className="h-serif" style={{ fontSize: 18, color: C.cream, margin: 0 }}>The numbers will come.</p>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 8, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>LOG A SESSION TO SEE YOUR STATS</div>
        </Surface>
      )}

      {allActivity.length > 0 && (
        <>
          <div className="ease-up-1" style={{ marginBottom: 12 }}>
            <WeeklyRecap sessions={allActivity} weightLog={weightLog} />
          </div>
          <div className="ease-up-1" style={{ marginBottom: 12 }}>
            <MonthlyRecap sessions={allActivity} weightLog={weightLog} />
          </div>
          <div className="ease-up-1" style={{ marginBottom: 12 }}>
            <QuarterRecap sessions={allActivity} weightLog={weightLog} />
          </div>
          <div className="ease-up-2" style={{ marginBottom: 12 }}>
            <ConsistencyCalendar sessions={allActivity} />
          </div>
          <div className="ease-up-2" style={{ marginBottom: 12 }}>
            <TimeTrainedCard cardioSessions={cardioSessions} workouts={history} />
          </div>
          <div className="ease-up-2" style={{ marginBottom: 12 }}>
            <Surface accent={C.moss}>
              <Eyebrow color={C.moss}>Weight goal · 225 → 200</Eyebrow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
                <div>
                  <div className="num-tab h-display" style={{ fontSize: 30, fontWeight: 700, color: C.moss, letterSpacing: "-0.04em", lineHeight: 1 }}>{lost > 0 ? "−" + lost.toFixed(1) : "0"}</div>
                  <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>LOST</div>
                </div>
                <div>
                  <div className="num-tab h-display" style={{ fontSize: 30, fontWeight: 700, color: C.bone, letterSpacing: "-0.04em", lineHeight: 1 }}>{curW}</div>
                  <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>CURRENT</div>
                </div>
                <div>
                  <div className="num-tab h-display" style={{ fontSize: 30, fontWeight: 700, color: C.amber, letterSpacing: "-0.04em", lineHeight: 1 }}>{(curW - goalW).toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginTop: 6 }}>TO GOAL</div>
                </div>
              </div>
            </Surface>
          </div>
          <div className="ease-up-2" style={{ marginBottom: 12 }}>
            <BodySim cardioSessions={cardioSessions} workouts={history} weightLog={weightLog} />
          </div>
          <div className="ease-up-2" style={{ marginBottom: 12 }}>
            <HeartSim cardioSessions={cardioSessions} workouts={history} />
          </div>
        </>
      )}

      <div className="ease-up-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatCard kicker="TABATA" value={tabataSessions.length} color={C.moss} sub="sessions" />
        <StatCard kicker="LONG INT" value={longIntervalSessions.length} color={C.electric} sub="sessions" />
        <StatCard kicker="GAMES" value={gameSessions.length} color={C.rust} sub="played" />
      </div>
      <div className="ease-up-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatCard kicker="GYM" value={gymSessions.length} color={C.amber} sub="lift sessions" />
        <StatCard kicker="S440" value={crossSessions.length} color={C.pink} sub="classes" />
        <StatCard kicker="WALKS" value={treadmillSessions.length} color={C.plum} sub="treadmill" />
      </div>

      {/* Box score — Thursday-night stat lines, and what the engine produced */}
      <BoxScoreCard gameSessions={gameSessions} allActivity={allActivity} />

      {/* Game shape — fourth-quarter legs over the season */}
      {gameSessions.length > 0 && (() => {
        const games = [...gameSessions].sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at)).slice(-10);
        const checked = games.filter(g => legsLog[g.id]);
        const score = { gassed: 0, okay: 1, strong: 2 };
        let verdict = null;
        if (checked.length >= 4) {
          const half = Math.floor(checked.length / 2);
          const avg = (arr) => arr.reduce((a, g) => a + score[legsLog[g.id]], 0) / arr.length;
          const diff = avg(checked.slice(half)) - avg(checked.slice(0, half));
          verdict = diff > 0.3 ? { txt: "Legs are lasting longer late in games — conditioning is showing up where it counts.", col: C.moss }
            : diff < -0.3 ? { txt: "Late-game legs are trending down — worth watching your recovery.", col: C.amber }
            : { txt: "Late-game legs holding steady.", col: C.dim };
        }
        return (
          <div className="ease-up-2" style={{ marginBottom: 12 }}>
            <Surface accent={C.rust}>
              <Eyebrow color={C.rust}>Game shape · fourth-quarter legs</Eyebrow>
              <div style={{ display: "flex", gap: 5, marginTop: 14 }}>
                {games.map(g => {
                  const legs = legsLog[g.id];
                  const opt = LEGS_OPTIONS.find(o => o.key === legs);
                  return (
                    <div key={g.id} style={{ flex: 1, textAlign: "center" }} title={new Date(g.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + (opt ? ` · ${opt.label}` : " · no check-in")}>
                      <div style={{
                        height: 40, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
                        background: opt ? `${C[opt.colorKey]}18` : C.raised, border: `1px solid ${opt ? C[opt.colorKey] : C.line}`,
                      }}>{opt ? opt.emoji : <span style={{ color: C.mute, fontSize: 11 }}>—</span>}</div>
                      <div style={{ fontSize: 7.5, color: C.mute, fontFamily: FONT_MONO, marginTop: 4, whiteSpace: "nowrap" }}>{new Date(g.completed_at).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 10, fontFamily: FONT_MONO, color: C.dim, flexWrap: "wrap" }}>
                {LEGS_OPTIONS.map(o => <span key={o.key}>{o.emoji} {o.label}</span>)}
              </div>
              {verdict
                ? <p className="h-serif" style={{ fontSize: 14.5, color: verdict.col, margin: "12px 0 0", lineHeight: 1.4 }}>{verdict.txt}</p>
                : <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, marginTop: 10 }}>Log "fourth-quarter legs" when you log a game — the trend shows up here.</div>}
              {/* Proof the engine shows up on the court: engine level on each kind of game night */}
              {(() => {
                const eng = engineModel(allActivity);
                const byDay = new Map(eng.series.map(p => [p.t, p.F]));
                const grp = { strong: [], okay: [], gassed: [] };
                checked.forEach(g => {
                  const e = byDay.get(startOfDay(new Date(g.completed_at)).getTime());
                  if (e != null && grp[legsLog[g.id]]) grp[legsLog[g.id]].push(e);
                });
                const avg = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
                const parts = [
                  avg(grp.strong) != null ? `💪 strong-legs games: ${avg(grp.strong)}` : null,
                  avg(grp.okay) != null ? `😮‍💨 okay: ${avg(grp.okay)}` : null,
                  avg(grp.gassed) != null ? `💨 gassed: ${avg(grp.gassed)}` : null,
                ].filter(Boolean);
                if (parts.length < 2) return null;
                return (
                  <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO, marginTop: 10, lineHeight: 1.5 }}>
                    ⛽ Avg engine at tip-off — {parts.join(" · ")}
                  </div>
                );
              })()}
            </Surface>
          </div>
        );
      })()}

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
                  const t = new Date(h.logged_at).getTime();
                  return t >= wkStartMs - 7*86400000 && t < wkStartMs;
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

      {gymSessions.length > 0 && (
        <div className="ease-up-2" style={{ marginBottom: 12 }}>
          <StrengthProgress gymSessions={gymSessions} />
        </div>
      )}

      <div className="ease-up-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatCard kicker="MILES" value={totalMiles.toFixed(1)} color={C.plum} />
        <StatCard kicker="TIME" value={totalMin >= 60 ? (totalMin/60).toFixed(1) : totalMin} unit={totalMin >= 60 ? "hrs" : "min"} color={C.plum} />
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

export function TimeTrainedCard({ cardioSessions, workouts }) {
  const all = normalizeAll(cardioSessions, workouts);
  const today = startOfDay(new Date());
  const wkStart = startOfWeek(today);

  // Last 8 calendar weeks (Sun–Sat), oldest first; last entry is this week.
  const WEEKS = 8;
  const weeks = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const ws = addDays(wkStart, -7 * i);
    const we = addDays(ws, 7);
    const mins = all.reduce((a, s) => (s.date >= ws && s.date < we ? a + (s.duration || 0) : a), 0);
    weeks.push({ ws, mins, isNow: i === 0 });
  }
  const thisWeekMin = weeks[weeks.length - 1].mins;

  // Weekly average over completed weeks since training began (zero weeks
  // count — a week off should pull the average down), current week excluded.
  const firstT = all.length ? Math.min(...all.map(s => s.date.getTime())) : null;
  const done = firstT == null ? [] : weeks.slice(0, -1).filter(w => w.ws.getTime() >= startOfWeek(new Date(firstT)).getTime());
  const avgMin = done.length ? done.reduce((a, w) => a + w.mins, 0) / done.length : null;

  const diff = avgMin != null ? thisWeekMin - avgMin : null;
  const maxMin = Math.max(30, ...weeks.map(w => w.mins), avgMin || 0);
  const CHART_H = 64;

  return (
    <Surface accent={C.electric}>
      <Eyebrow color={C.electric}>Time trained · per week</Eyebrow>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="num-tab h-display" style={{ fontSize: 30, fontWeight: 800, color: thisWeekMin > 0 ? C.electric : C.dim, letterSpacing: "-0.03em", lineHeight: 1 }}>{fmtDur(thisWeekMin)}</div>
          <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, marginTop: 4, letterSpacing: "0.06em" }}>THIS WEEK</div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="num-tab h-display" style={{ fontSize: 30, fontWeight: 800, color: C.bone, letterSpacing: "-0.03em", lineHeight: 1 }}>{avgMin != null ? fmtDur(avgMin) : "—"}</div>
          <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, marginTop: 4, letterSpacing: "0.06em" }}>WEEKLY AVG</div>
        </div>
      </div>
      {diff != null && Math.round(Math.abs(diff)) >= 1 && (
        <div style={{ fontSize: 11, color: diff > 0 ? C.moss : C.amber, fontFamily: FONT_MONO, marginTop: 8, fontWeight: 600 }}>
          {diff > 0 ? "▲" : "▼"} {fmtDur(Math.abs(diff))} {diff > 0 ? "ahead of" : "behind"} your average week
        </div>
      )}

      {/* Weekly bars with the average as a dashed reference line */}
      <div style={{ position: "relative", marginTop: 16 }}>
        {avgMin != null && avgMin > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: Math.round((avgMin / maxMin) * CHART_H), borderTop: `1px dashed ${C.dim}88`, pointerEvents: "none" }} title={`Average: ${fmtDur(avgMin)}/week`} />
        )}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: CHART_H + 14 }}>
          {weeks.map((w, i) => {
            const h = Math.max(4, Math.round((w.mins / maxMin) * CHART_H));
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }} title={`Week of ${w.ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${fmtDur(w.mins)}`}>
                <div style={{ fontSize: 8.5, color: w.mins ? C.cream : "transparent", fontFamily: FONT_MONO, marginBottom: 3, whiteSpace: "nowrap" }}>{fmtDurShort(w.mins)}</div>
                <div style={{ width: "100%", height: h, borderRadius: "4px 4px 2px 2px", background: w.mins ? (w.isNow ? `linear-gradient(180deg, ${C.electric}, ${C.electric}99)` : `${C.electric}66`) : C.raised, border: `1px solid ${w.mins ? "transparent" : C.line}`, transition: "height 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: C.mute, fontFamily: FONT_MONO }}>
        <span>8 WEEKS AGO</span><span>THIS WEEK</span>
      </div>
    </Surface>
  );
}

