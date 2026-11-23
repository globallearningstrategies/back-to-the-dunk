import React, { useState, useEffect } from 'react';
import { C, FONT_DISPLAY, FONT_SERIF, FONT_MONO, RECOVERY, CONDITIONING_TYPES, S440_CLASSES, S440_NAME_BY_FOCUS, focusFromClassName, fetchS440Schedule, S440_FOCUS_OPTIONS, startOfDay, addDays, startOfWeek, fmtDur, normalizeAll, buildPlan, trailingSummary, streakInfo, fatigueSignal, dateKey, LEGS_OPTIONS, ENGINE_TAU, engineLoadOf, BRISK_WALK, engineModel, engineBumpPreview } from './model';
import { Surface, Eyebrow, Btn, Sheet } from './ui';
import { COURT_RATINGS } from './engine';
import { PregameCheck, dayKeyOf, pregameLabel } from './pregame';

export function toLocalInput(d) {
  const x = new Date(d); const p = n => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
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
  const [court, setCourt] = useState(state.court || null);
  const [error, setError] = useState("");
  // Box score — Thursday-night stat line, points and boards.
  const [points, setPoints] = useState(editing && editing.points != null ? String(editing.points) : "");
  const [rebounds, setRebounds] = useState(editing && editing.rebounds != null ? String(editing.rebounds) : "");
  const [assists, setAssists] = useState(editing && editing.assists != null ? String(editing.assists) : "");
  const [steals, setSteals] = useState(editing && editing.steals != null ? String(editing.steals) : "");
  const [threes, setThrees] = useState(editing && editing.threes_made != null ? String(editing.threes_made) : "");
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
      court: type === "game" ? court : null,
      points: type === "game" && points !== "" ? Number(points) : null,
      rebounds: type === "game" && rebounds !== "" ? Number(rebounds) : null,
      assists: type === "game" && assists !== "" ? Number(assists) : null,
      steals: type === "game" && steals !== "" ? Number(steals) : null,
      threes_made: type === "game" && threes !== "" ? Number(threes) : null,
      focus: type === "cross_training" ? effFocus : null,
      class_name: type === "cross_training" ? effClassName : null,
    });
  };

  const badStat = v => v !== "" && (!Number.isInteger(Number(v)) || Number(v) < 0 || Number(v) > 200);
  const submit = e => {
    e.preventDefault();
    const mins = duration !== "" ? Number(duration) : def.defaultDurationMin;
    if (!Number.isFinite(mins) || mins <= 0 || mins > 1440) { setError("Enter a positive number of minutes."); return; }
    const date = new Date(when);
    if (!Number.isFinite(date.getTime()) || date > new Date()) { setError("Choose a date and time that has already happened."); return; }
    if (type === "game" && [points, rebounds, assists, steals, threes].some(badStat)) { setError("Stats should be whole numbers."); return; }
    if (type === "game" && threes !== "" && points !== "" && Number(threes) * 3 > Number(points)) { setError("Made threes can’t add up to more than your points."); return; }
    setError("");
    save();
  };
  const choice = (options, value, set, label) => <div className="engine-actions" role="group" aria-label={label}>
    {options.map(o => <button key={o.key} type="button" className="engine-button" aria-pressed={value === o.key} onClick={() => set(value === o.key ? null : o.key)}>{o.emoji ? `${o.emoji} ` : ""}{o.label}</button>)}
  </div>;

  return <Sheet label={editing ? "Edit session" : "Quick log"} title={editing ? `Edit ${def.label.toLowerCase()}` : type === "game" ? "Log your game" : `Log ${def.label}`} titleId="conditioning-title" onClose={onClose} onSubmit={submit}>
    {state.warn && <p className="engine-muted">⚠ {state.warn}</p>}
    {!state.lockType && <>
      <div className="engine-label" style={{ marginTop: 10 }}>Type</div>
      <div className="engine-actions" role="group" aria-label="Session type">{CONDITIONING_TYPES.map(tk => RECOVERY.TYPES[tk]).map(t =>
        <button key={t.key} type="button" className="engine-button" aria-pressed={type === t.key} onClick={() => chooseType(t.key)}>{t.emoji} {t.short}</button>)}</div>
    </>}

    {type === "game" && <>
      <div className="engine-grid" style={{ marginTop: 14 }}>
        <label className="engine-field log-stat">Points<input aria-label="Points" type="number" inputMode="numeric" min="0" step="1" placeholder="—" value={points} onChange={e => { setPoints(e.target.value); setError(""); }}/></label>
        <label className="engine-field log-stat">Rebounds<input aria-label="Rebounds" type="number" inputMode="numeric" min="0" step="1" placeholder="—" value={rebounds} onChange={e => { setRebounds(e.target.value); setError(""); }}/></label>
      </div>
      <details className="engine-details log-more" open={!!(assists || steals || threes)}><summary>Assists, steals, threes made</summary>
        <div className="log-stat-row">
          <label className="engine-field log-stat">Assists<input aria-label="Assists" type="number" inputMode="numeric" min="0" step="1" placeholder="—" value={assists} onChange={e => { setAssists(e.target.value); setError(""); }}/></label>
          <label className="engine-field log-stat">Steals<input aria-label="Steals" type="number" inputMode="numeric" min="0" step="1" placeholder="—" value={steals} onChange={e => { setSteals(e.target.value); setError(""); }}/></label>
          <label className="engine-field log-stat">3PM<input aria-label="Threes made" type="number" inputMode="numeric" min="0" step="1" placeholder="—" value={threes} onChange={e => { setThrees(e.target.value); setError(""); }}/></label>
        </div>
      </details>
      {state.onPregame && <details className="engine-details" open={!state.pregame?.[dayKeyOf(when)]}><summary>Before the game{state.pregame?.[dayKeyOf(when)] ? ` · ${pregameLabel(state.pregame[dayKeyOf(when)])}` : ' · optional'}</summary>
        <PregameCheck value={state.pregame?.[dayKeyOf(when)] || {}} onChange={v => state.onPregame(dayKeyOf(when), v)}/>
      </details>}
      <div className="engine-label" style={{ marginTop: 6 }}>How was your engine?</div>
      {choice(COURT_RATINGS, court, setCourt, "Court rating")}
      <div className="engine-label" style={{ marginTop: 16 }}>Fourth-quarter legs</div>
      {choice(LEGS_OPTIONS, legs, setLegs, "Fourth-quarter legs")}
    </>}

    {type === "cross_training" && <>
      <div className="engine-label" style={{ marginTop: 14 }}>Class focus</div>
      {choice(S440_FOCUS_OPTIONS, effFocus, v => { setFocus(v); setTouchedFocus(true); }, "Class focus")}
      <p className="engine-muted">{effClassName ? <><strong>{effClassName.replace("SWEAT440 ", "")}</strong>{!touchedFocus ? (liveName ? " · from the gym’s schedule" : " · from the weekly pattern") : ""}</> : "Mon/Thu lower · Tue/Fri upper · Wed conditioning · weekends full body."}</p>
    </>}

    <div className="engine-row" style={{ marginTop: 16 }}><span className="engine-label">Effort</span><strong className="log-rpe">{rpe}<span>/10</span></strong></div>
    <input className="log-range" aria-label="Effort (1–10)" type="range" min="1" max="10" step="1" value={rpe} onChange={e => { setRpe(Number(e.target.value)); setTouchedRpe(true); }}/>
    <p className="engine-muted">Typical for {def.label}: {def.defaultRPE}. Adjust if it felt easier or harder.</p>

    <details className="engine-details" open={!!editing}><summary>Minutes, date and notes</summary>
      <label className="engine-field">Minutes<input aria-label="Duration in minutes" type="number" inputMode="decimal" min="1" step="any" placeholder={String(def.defaultDurationMin)} value={duration} onChange={e => { setDuration(e.target.value); setError(""); }}/></label>
      <label className="engine-field">When<input aria-label="Session date" type="datetime-local" max={toLocalInput(new Date())} value={when} onChange={e => { setWhen(e.target.value); setError(""); }}/></label>
      <label className="engine-field">Notes<input aria-label="Notes" type="text" placeholder="e.g. felt strong, legs heavy…" value={notes} onChange={e => setNotes(e.target.value)}/></label>
    </details>
    {error && <p role="alert">{error}</p>}
    <button className="engine-button primary" type="submit" style={{ width: "100%", marginTop: 12 }}>{editing ? "Save changes" : type === "game" ? "Save game" : `Log ${def.label}`}</button>
    {editing && <button type="button" className="engine-link" style={{ width: "100%", marginTop: 6 }} onClick={() => onDelete(editing.id)}>Delete session</button>}
  </Sheet>;
}

export function WalkLogger({ state, onClose, onSave, onDelete }) {
  const editing = (state && state.editing) || null;
  const ex = (editing && editing.exercises && editing.exercises[0]) || {};
  const [pace, setPace] = useState(editing ? (ex.pace === "brisk" ? "brisk" : "easy") : (state && state.pace) || "easy");
  const [when, setWhen] = useState(editing ? toLocalInput(editing.logged_at) : toLocalInput(new Date()));
  const [duration, setDuration] = useState(ex.duration ? String(ex.duration) : "");
  const [speed, setSpeed] = useState(ex.speed ? String(ex.speed) : "");
  const [incline, setIncline] = useState(ex.incline ? String(ex.incline) : "");
  const [notes, setNotes] = useState(ex.notes || "");
  const [error, setError] = useState("");
  const miles = duration && speed ? ((parseFloat(duration) / 60) * parseFloat(speed)).toFixed(2) : null;
  const brisk = pace === "brisk";
  const mins = Number(duration);
  const credit = Number.isFinite(mins) && mins > 0 ? engineLoadOf({ type: "walk", pace, duration: mins, rpe: brisk ? BRISK_WALK.rpe : RECOVERY.TYPES.walk.defaultRPE }) / ENGINE_TAU : null;

  const save = e => {
    e.preventDefault();
    if (!Number.isFinite(mins) || mins <= 0 || mins > 1440) { setError("Enter how many minutes you walked."); return; }
    const date = new Date(when);
    if (!Number.isFinite(date.getTime()) || date > new Date()) { setError("Choose a date and time that has already happened."); return; }
    onSave({ editingId: editing ? editing.id : undefined, when, duration, speed, incline, miles, notes, pace });
  };
  const clear = set => e => { set(e.target.value); setError(""); };

  return <Sheet label={editing ? "Edit walk" : "Walk · Quick log"} title={editing ? "Edit walk" : brisk ? "Log a brisk walk" : "Log a walk"} titleId="walk-title" onClose={onClose} onSubmit={save}>
    {state && state.warn && <p className="engine-muted">⚠ {state.warn}</p>}
    <div className="engine-label" style={{ marginTop: 10 }}>Pace</div>
    <div className="engine-tiles" role="radiogroup" aria-label="Walking pace" style={{ marginTop: 8 }}>
      {[["easy", "Easy", "Recovery stroll"], ["brisk", "Brisk", BRISK_WALK.test]].map(([key, name, hint]) =>
        <button key={key} type="button" role="radio" aria-checked={pace === key} className="engine-tile walk-pace" onClick={() => setPace(key)}>
          <span><strong>{name}</strong><small>{hint}</small></span>
        </button>)}
    </div>
    <p className="engine-muted">{brisk
      ? "Talk test: you can hold a conversation, but you couldn’t sing. That steady effort builds your aerobic base, so brisk walks earn full Engine credit."
      : "An easy walk helps you recover and earns half Engine credit."}</p>
    <div className="engine-actions" aria-label="Quick durations">{[20, 30, 45, 60, 90].map(n =>
      <button key={n} type="button" className="engine-button" aria-pressed={String(n) === String(duration)} onClick={() => { setDuration(String(n)); setError(""); }}>{n} min</button>)}</div>
    <label className="engine-field">Minutes<input aria-label="Walk minutes" type="number" inputMode="decimal" min="1" max="1440" step="any" placeholder="45" value={duration} onChange={clear(setDuration)}/></label>
    {credit != null && <p className="engine-muted" role="status">Adds about +{credit.toFixed(1)} to your Engine today.</p>}
    <details className="engine-details"><summary>Treadmill, notes or date</summary>
      <div className="engine-grid">
        <label className="engine-field">Speed (mph)<input aria-label="Walk speed" type="number" inputMode="decimal" step="0.1" placeholder="3.5" value={speed} onChange={clear(setSpeed)}/></label>
        <label className="engine-field">Incline (%)<input aria-label="Walk incline" type="number" inputMode="decimal" step="0.5" placeholder="8" value={incline} onChange={clear(setIncline)}/></label>
      </div>
      {miles && <p className="engine-muted">≈ {miles} miles</p>}
      <label className="engine-field">Notes<input aria-label="Walk notes" type="text" placeholder="e.g. neighbourhood loop, podcast" value={notes} onChange={clear(setNotes)}/></label>
      <label className="engine-field">When<input aria-label="Walk date" type="datetime-local" max={toLocalInput(new Date())} value={when} onChange={clear(setWhen)}/></label>
    </details>
    {error && <p role="alert">{error}</p>}
    <button className="engine-button primary" type="submit" style={{ width: "100%", marginTop: 12 }}>{editing ? "Save changes" : brisk ? "Log brisk walk" : "Log walk"}</button>
    {editing && onDelete && <button type="button" className="engine-link" style={{ width: "100%", marginTop: 6 }} onClick={() => onDelete(editing.id)}>Delete walk</button>}
  </Sheet>;
}
export function LiftDateSheet({ row, onClose, onSave, onDelete }) {
  const [when, setWhen] = useState(toLocalInput(row.logged_at));
  const [error, setError] = useState("");
  const submit = e => {
    e.preventDefault();
    const date = new Date(when);
    if (!Number.isFinite(date.getTime()) || date > new Date()) { setError("Choose a date and time that has already happened."); return; }
    onSave(row.id, date.toISOString());
  };
  return <Sheet label="Edit lift" title="Change the date" titleId="lift-date-title" onClose={onClose} onSubmit={submit}>
    <p className="engine-muted">{row.session_name}</p>
    <label className="engine-field">When<input aria-label="Lift date" type="datetime-local" max={toLocalInput(new Date())} value={when} onChange={e => { setWhen(e.target.value); setError(""); }}/></label>
    {error && <p role="alert">{error}</p>}
    <button className="engine-button primary" type="submit" style={{ width: "100%", marginTop: 8 }}>Save date</button>
    {onDelete && <button type="button" className="engine-link" style={{ width: "100%", marginTop: 6 }} onClick={() => onDelete(row.id)}>Delete lift</button>}
  </Sheet>;
}
