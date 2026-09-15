import React, { useState, useEffect } from 'react';
import { C, FONT_DISPLAY, FONT_SERIF, FONT_MONO, RECOVERY, CONDITIONING_TYPES, S440_CLASSES, S440_NAME_BY_FOCUS, focusFromClassName, fetchS440Schedule, S440_FOCUS_OPTIONS, startOfDay, addDays, startOfWeek, fmtDur, normalizeAll, buildPlan, trailingSummary, streakInfo, fatigueSignal, dateKey, LEGS_OPTIONS, ENGINE_TAU, engineModel, engineBumpPreview } from './model';
import { Surface, Eyebrow, Btn } from './ui';

export function toLocalInput(d) {
  const x = new Date(d); const p = n => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}

export function TodayCard({ cardioSessions, workouts, constraints, onOpenLogger, onChooseLift, onGoWalk }) {
  const [showOverride, setShowOverride] = useState(false);
  const [showSci, setShowSci] = useState(false);
  const engine = normalizeAll(cardioSessions, workouts);
  const today = startOfDay(new Date());
  const plan = buildPlan(engine, today, 7, constraints);
  const rec = plan[0];
  const s7 = trailingSummary(engine, today, 7);
  const s14 = trailingSummary(engine, today, 14);
  const s30 = trailingSummary(engine, today, 30);
  const { streak, layoff } = streakInfo(engine, today);
  const engStat = engineModel(engine);

  // Projected engine bump for one scheduled item, using type defaults.
  const itemBumpPct = (it) => {
    const def = RECOVERY.TYPES[it.type];
    if (!def) return 0;
    let mins = def.defaultDurationMin, rpe = def.defaultRPE;
    if (it.type === "walk") mins *= 0.5;
    else if (it.type === "lift") return 0;
    else if (it.type === "cross_training") {
      const cls = S440_CLASSES[today.getDay()];
      if (!cls || cls.focus !== "cardio") return 0;
    }
    return engineBumpPreview(engStat.score, mins, rpe);
  };

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

      {/* What's happening in your body — recovery science, tap to collapse */}
      {rec.science && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowSci(v => !v)} className="btn" style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: C.electric, fontFamily: FONT_MONO, letterSpacing: "0.1em", fontWeight: 700 }}>🧬 PLAN DETAILS</span>
            <span style={{ fontSize: 9, color: C.dim }}>{showSci ? "▲" : "▼"}</span>
          </button>
          {showSci && (
            <p className="h-serif" style={{ fontSize: 14.5, color: C.cream, margin: "8px 0 0", lineHeight: 1.55, padding: "12px 14px", background: C.raised, borderRadius: 12, border: `1px solid ${C.line}` }}>{rec.science}</p>
          )}
        </div>
      )}

      {(rec.flags || []).map((f, i) => (
        <div key={i} style={{ marginTop: 10, fontSize: 12, color: C.red, fontFamily: FONT_MONO, display: "flex", gap: 6, alignItems: "center" }}>⚠ {f}</div>
      ))}

      {/* Fatigue guard — the same work has been feeling harder lately */}
      {(() => {
        const fat = fatigueSignal(engine, today);
        if (!fat) return null;
        return (
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: `${C.amber}12`, border: `1px solid ${C.amber}40`, fontSize: 12, color: C.amber, fontFamily: FONT_MONO, lineHeight: 1.5 }}>
            ⚠ Your last {fat.n} hard sessions felt about +{fat.delta.toFixed(1)} RPE harder than your usual. Fatigue may be building — an extra easy day now beats a flat week later.
          </div>
        );
      })()}

      {/* Primary action(s) — one button per scheduled item (e.g. Tabata + Lift) */}
      {trained ? (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {items.map((it, i) => (
              <Btn key={i} color={C[RECOVERY.TYPES[it.type].colorKey]} full={items.length === 1} size="lg" style={{ flex: 1 }} onClick={() => actOn(it)}>
                {actLabel(it)}
              </Btn>
            ))}
          </div>
          {/* What today's plan is worth to the engine — see the points before you spend the sweat */}
          {(() => {
            const totalPct = items.reduce((a, it) => a + itemBumpPct(it), 0);
            if (totalPct < 0.1) return null;
            return (
              <div style={{ marginTop: 8, fontSize: 12.5, color: C.moss, fontFamily: FONT_MONO, fontWeight: 700, textAlign: "center" }}>
                ⛽ Estimated score contribution +{totalPct.toFixed(1)}% ({Math.round(engStat.score)} → {Math.round(engStat.score * (1 + totalPct / 100))})
              </div>
            );
          })()}
        </>
      ) : (
        <>
          <Btn color={C.dim} ghost full style={{ marginTop: 16 }} onClick={() => setShowOverride(v => !v)}>
            {showOverride ? "Never mind" : "Train anyway →"}
          </Btn>
          {showOverride && (
            <div className="ease-up" style={{ marginTop: 12, padding: 14, borderRadius: 12, background: `${C.amber}12`, border: `1px solid ${C.amber}40` }}>
              <div style={{ fontSize: 12, color: C.amber, fontFamily: FONT_MONO, marginBottom: 10, lineHeight: 1.5 }}>⚠ Today's a recovery day. Pushing through cuts into recovery — go lighter than usual.</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[{ type: "tabata" }, { type: "long_interval" }, { type: "lift" }, { type: "cross_training" }, { type: "walk" }].map((it, i) => {
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
        <Eyebrow>Coming up · this week</Eyebrow>
        <div style={{ marginTop: 10 }}>
          {plan.slice(1).map((p, i) => {
            const its = itemsOf(p);
            const col = its.length ? C[RECOVERY.TYPES[its[0].type].colorKey] : C.dim;
            const emoji = its.length ? its.map(it => RECOVERY.TYPES[it.type].emoji).join(" ") : "🛌";
            const lbl = its.length ? its.map(itemLabel).join(" + ") : "Rest";
            const hasLift = its.some(it => it.type === "lift");
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < plan.length - 2 ? `1px solid ${C.line}` : "none" }}>
                <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, width: 36, flexShrink: 0 }}>{p.date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</span>
                <span style={{ fontSize: 17, width: 48, flexShrink: 0 }}>{emoji}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: col, letterSpacing: "-0.01em" }}>{lbl}</span>
                {hasLift && <span style={{ fontSize: 9, color: C.amber, fontFamily: FONT_MONO, fontWeight: 700, border: `1px solid ${C.amber}55`, borderRadius: 6, padding: "2px 6px" }}>+ LIFT</span>}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, marginTop: 8 }}>Tentative — updates every time you log.</div>
        {/* Tip-off forecast — where the engine will idle to by game day */}
        {(() => {
          if (constraints.gameDow == null || engStat.score <= 0) return null;
          const days = (constraints.gameDow - today.getDay() + 7) % 7;
          const gameDay = addDays(today, days);
          if (constraints.skipGameWeekStart === startOfWeek(gameDay).getTime()) return null;
          const forecast = engStat.score * Math.pow(1 - 1 / ENGINE_TAU, days);
          return (
            <div style={{ marginTop: 10, fontSize: 12, color: C.dim, fontFamily: FONT_MONO, lineHeight: 1.5 }}>
              🏀 {days === 0 ? "Tonight's game" : `${gameDay.toLocaleDateString("en-US", { weekday: "long" })}'s game`}: engine ≈ <b style={{ color: C.bone }}>{Math.round(forecast)}</b> at tip-off on idle alone — every session before then raises it.
            </div>
          );
        })()}
      </div>

      {/* Trailing summaries */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[["7-DAY", s7], ["14-DAY", s14], ["30-DAY", s30]].map(([lbl, s]) => (
          <div key={lbl} style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 12px" }}>
            <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.08em" }}>{lbl}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
              <span className="num-tab h-display" style={{ fontSize: 24, fontWeight: 700, color: C.bone, letterSpacing: "-0.03em" }}>{s.count}</span>
              <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO }}>· {s.hard} hard</span>
            </div>
            <div style={{ fontSize: 10, color: C.electric, fontFamily: FONT_MONO, marginTop: 5 }}>⏱ {fmtDur(s.minutes)}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 7, fontSize: 11, fontFamily: FONT_MONO, color: C.dim, flexWrap: "wrap" }}>
              {["tabata", "long_interval", "lift", "cross_training", "walk", "game"].map(k => (
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

export function ConditioningLogger({ state, onClose, onSave, onDelete }) {
  const editing = state.editing || null;
  const wanted = state.prefillType || (editing && editing.workout_type) || "tabata";
  const initType = CONDITIONING_TYPES.includes(wanted) ? wanted : "tabata";
  const [type, setType] = useState(initType);
  const [touchedRpe, setTouchedRpe] = useState(editing ? editing.rpe != null : false);
  const [when, setWhen] = useState(editing ? toLocalInput(editing.completed_at) : toLocalInput(new Date()));
  const [duration, setDuration] = useState(editing && editing.duration_min != null ? String(editing.duration_min) : "");
  const [rpe, setRpe] = useState(editing && editing.rpe != null ? Number(editing.rpe) : RECOVERY.TYPES[initType].defaultRPE);
  const [notes, setNotes] = useState(editing ? (editing.notes || "") : "");
  const [legs, setLegs] = useState(state.legs || null);
  // Box score — Thursday-night stat line, points and boards.
  const [points, setPoints] = useState(editing && editing.points != null ? String(editing.points) : "");
  const [rebounds, setRebounds] = useState(editing && editing.rebounds != null ? String(editing.rebounds) : "");
  // Sweat440 focus: default follows the class rotation for the session's weekday,
  // until the user picks one explicitly.
  const [focus, setFocus] = useState(editing ? (editing.focus || null) : null);
  const [touchedFocus, setTouchedFocus] = useState(editing ? editing.focus != null : false);
  // Live schedule first (what the gym actually held that day), weekly pattern as fallback.
  const [liveSched, setLiveSched] = useState(null);
  useEffect(() => { if (type === "cross_training") fetchS440Schedule().then(s => s && setLiveSched(s)); }, [type]);
  const dowClass = S440_CLASSES[new Date(when).getDay()];
  const liveEntries = liveSched && liveSched.byDate ? liveSched.byDate[dateKey(new Date(when))] : null;
  const liveName = liveEntries && liveEntries.length ? liveEntries[0].name : null;
  const autoName = liveName || (dowClass ? dowClass.name : null);
  const autoFocus = liveName
    ? (focusFromClassName(liveName) !== null ? focusFromClassName(liveName) : null)
    : (dowClass ? dowClass.focus : null);
  const effFocus = touchedFocus ? focus : autoFocus;
  const effClassName = touchedFocus ? (S440_NAME_BY_FOCUS[focus] || autoName) : autoName;

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
      legs: type === "game" ? legs : null,
      points: type === "game" && points !== "" ? Number(points) : null,
      rebounds: type === "game" && rebounds !== "" ? Number(rebounds) : null,
      focus: type === "cross_training" ? effFocus : null,
      class_name: type === "cross_training" ? effClassName : null,
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
          {CONDITIONING_TYPES.map(tk => RECOVERY.TYPES[tk]).map(t => {
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

        {/* Sweat440 focus — follows the Mon legs / Wed cardio / Fri upper rotation */}
        {type === "cross_training" && (
          <>
            <Eyebrow>Class focus</Eyebrow>
            <div style={{ display: "flex", gap: 8, margin: "8px 0 4px" }}>
              {S440_FOCUS_OPTIONS.map(o => {
                const on = effFocus === o.key;
                return (
                  <button key={o.key} className="btn" onClick={() => { setFocus(on ? null : o.key); setTouchedFocus(true); }} style={{
                    flex: 1, padding: "11px 6px", borderRadius: 12, cursor: "pointer",
                    border: `1px solid ${on ? C.pink : C.line}`, background: on ? `${C.pink}18` : C.raised,
                    color: on ? C.pink : C.cream, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 12,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  }}>
                    <span style={{ fontSize: 18 }}>{o.emoji}</span>{o.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, marginBottom: 18, lineHeight: 1.5 }}>
              {effClassName ? <><span style={{ color: C.pink, fontWeight: 700 }}>{effClassName}</span>{!touchedFocus ? (liveName ? " · live from the gym's schedule — tap to change" : " · from the weekly pattern — tap to change") : ""}</> : "Mon/Thu lower · Tue/Fri upper · Wed conditioning · weekends full body."}
            </div>
          </>
        )}

        {/* Post-game check-in — the real test of game shape */}
        {type === "game" && (
          <>
            <Eyebrow>Fourth-quarter legs</Eyebrow>
            <div style={{ display: "flex", gap: 8, margin: "8px 0 4px" }}>
              {LEGS_OPTIONS.map(o => {
                const on = legs === o.key; const col = C[o.colorKey];
                return (
                  <button key={o.key} className="btn" onClick={() => setLegs(on ? null : o.key)} style={{
                    flex: 1, padding: "11px 6px", borderRadius: 12, cursor: "pointer",
                    border: `1px solid ${on ? col : C.line}`, background: on ? `${col}18` : C.raised,
                    color: on ? col : C.cream, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 12,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  }}>
                    <span style={{ fontSize: 18 }}>{o.emoji}</span>{o.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, marginBottom: 18 }}>How were the legs late in the game? Tracked over the season as your game-shape trend.</div>

            {/* Stat line — what the engine actually produced tonight */}
            <Eyebrow>Box score (optional)</Eyebrow>
            <div style={{ display: "flex", gap: 10, margin: "8px 0 4px" }}>
              <div style={{ flex: 1 }}>
                <input type="number" inputMode="numeric" min="0" placeholder="—" value={points} onChange={e => setPoints(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "12px 14px", fontSize: 18, outline: "none", fontFamily: FONT_MONO, fontWeight: 700, textAlign: "center" }} />
                <div style={{ textAlign: "center", fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 5, letterSpacing: "0.08em" }}>POINTS</div>
              </div>
              <div style={{ flex: 1 }}>
                <input type="number" inputMode="numeric" min="0" placeholder="—" value={rebounds} onChange={e => setRebounds(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "12px 14px", fontSize: 18, outline: "none", fontFamily: FONT_MONO, fontWeight: 700, textAlign: "center" }} />
                <div style={{ textAlign: "center", fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 5, letterSpacing: "0.08em" }}>REBOUNDS</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, marginBottom: 18 }}>Log your stat line and watch season averages track your engine. FG/FT detail can go in notes.</div>
          </>
        )}

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

export function WalkLogger({ state, onClose, onSave, onDelete }) {
  const editing = (state && state.editing) || null;
  const ex = (editing && editing.exercises && editing.exercises[0]) || {};
  const [when, setWhen] = useState(editing ? toLocalInput(editing.logged_at) : toLocalInput(new Date()));
  const [duration, setDuration] = useState(ex.duration ? String(ex.duration) : "");
  const [speed, setSpeed] = useState(ex.speed ? String(ex.speed) : "");
  const [incline, setIncline] = useState(ex.incline ? String(ex.incline) : "");
  const [notes, setNotes] = useState(ex.notes || "");
  const miles = duration && speed ? ((parseFloat(duration) / 60) * parseFloat(speed)).toFixed(2) : null;
  const canSave = duration || speed || incline;

  const save = () => {
    if (!canSave) return;
    onSave({ editingId: editing ? editing.id : undefined, when, duration, speed, incline, miles, notes });
  };

  const field = (label, unit, val, set, ph) => (
    <div>
      <div style={{ textAlign: "center" }}><Eyebrow>{label}</Eyebrow></div>
      <input type="number" inputMode="decimal" step="0.1" value={val} onChange={e => set(e.target.value)} placeholder={ph}
        style={{ width: "100%", marginTop: 6, background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "12px 8px", fontSize: 16, outline: "none", textAlign: "center", fontFamily: FONT_MONO, boxSizing: "border-box" }} />
      <div style={{ textAlign: "center", fontSize: 9, color: C.mute, fontFamily: FONT_MONO, marginTop: 4 }}>{unit}</div>
    </div>
  );

  return (
    <div className="backdrop" style={{ alignItems: "flex-end", padding: 0 }} onClick={onClose}>
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, margin: "0 auto", background: C.panel,
        borderRadius: "22px 22px 0 0", borderTop: `1px solid ${C.line}`,
        padding: "10px 18px calc(24px + env(safe-area-inset-bottom))", maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: C.faint, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <h2 className="h-display" style={{ fontSize: 22, fontWeight: 700, color: C.bone, margin: 0, letterSpacing: "-0.03em" }}>{editing ? "🚶 Edit walk" : "🚶 Log a walk"}</h2>
          <button onClick={onClose} className="btn" style={{ border: "none", background: "transparent", color: C.dim, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {state && state.warn && (
          <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: `${C.amber}12`, border: `1px solid ${C.amber}40`, color: C.amber, fontSize: 12, fontFamily: FONT_MONO, lineHeight: 1.4 }}>⚠ {state.warn}</div>
        )}

        <Eyebrow>When</Eyebrow>
        <input type="datetime-local" value={when} max={toLocalInput(new Date())} onChange={e => setWhen(e.target.value)}
          style={{ width: "100%", margin: "8px 0 18px", background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: FONT_DISPLAY, boxSizing: "border-box" }} />

        {/* Quick durations — one tap for a casual walk */}
        <Eyebrow>Quick log</Eyebrow>
        <div style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
          {[20, 30, 45, 60, 90].map(n => {
            const on = String(n) === String(duration);
            return (
              <button key={n} className="btn" onClick={() => setDuration(String(n))} style={{
                flex: 1, padding: "12px 4px", borderRadius: 12, cursor: "pointer",
                border: `1px solid ${on ? C.plum : C.line}`, background: on ? `${C.plum}18` : C.raised,
                color: on ? C.plum : C.cream, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14,
              }}>{n}<span style={{ fontSize: 9, color: on ? C.plum : C.mute, fontFamily: FONT_MONO, display: "block", marginTop: 1 }}>MIN</span></button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {field("Minutes", "min", duration, setDuration, "45")}
          {field("Speed", "mph", speed, setSpeed, "3.5")}
          {field("Incline", "%", incline, setIncline, "8")}
        </div>
        {miles && <div style={{ textAlign: "center", color: C.plum, fontSize: 14, marginBottom: 14, fontFamily: FONT_SERIF, fontStyle: "italic" }}>≈ {miles} miles</div>}

        <Eyebrow>Notes (optional)</Eyebrow>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. podcast walk, felt good"
          style={{ width: "100%", margin: "8px 0 18px", background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />

        <Btn color={C.plum} full size="lg" onClick={save} disabled={!canSave}>{editing ? "Save changes" : (canSave ? "Log walk" : "Add minutes, speed or incline")}</Btn>
        {editing && onDelete && (
          <button onClick={() => onDelete(editing.id)} className="btn" style={{ width: "100%", marginTop: 10, padding: "12px", borderRadius: 12, border: `1px solid ${C.red}40`, background: "transparent", color: C.red, fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete walk</button>
        )}
      </div>
    </div>
  );
}

export function LiftDateSheet({ row, onClose, onSave, onDelete }) {
  const [when, setWhen] = useState(toLocalInput(row.logged_at));
  return (
    <div className="backdrop" style={{ alignItems: "flex-end", padding: 0 }} onClick={onClose}>
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, margin: "0 auto", background: C.panel,
        borderRadius: "22px 22px 0 0", borderTop: `1px solid ${C.line}`,
        padding: "10px 18px calc(24px + env(safe-area-inset-bottom))", maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: C.faint, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <h2 className="h-display" style={{ fontSize: 22, fontWeight: 700, color: C.bone, margin: 0, letterSpacing: "-0.03em" }}>🏋️ Edit lift date</h2>
          <button onClick={onClose} className="btn" style={{ border: "none", background: "transparent", color: C.dim, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO, marginBottom: 12 }}>{row.session_name}</div>
        <Eyebrow>When</Eyebrow>
        <input type="datetime-local" value={when} max={toLocalInput(new Date())} onChange={e => setWhen(e.target.value)}
          style={{ width: "100%", margin: "8px 0 18px", background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: FONT_DISPLAY, boxSizing: "border-box" }} />
        <Btn color={C.rust} full size="lg" onClick={() => onSave(row.id, new Date(when).toISOString())}>Save date</Btn>
        {onDelete && (
          <button onClick={() => onDelete(row.id)} className="btn" style={{ width: "100%", marginTop: 10, padding: "12px", borderRadius: 12, border: `1px solid ${C.red}40`, background: "transparent", color: C.red, fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete lift</button>
        )}
      </div>
    </div>
  );
}
