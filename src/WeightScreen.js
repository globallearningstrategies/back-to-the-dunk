import React, { useState } from 'react';
import { daysAgo, weightProjection } from './model';

/* Weight — progress from your own starting weight toward your own goal, both
   set in Settings. Defaults match the original 225 → 200 plan. */
export const DEFAULT_WEIGHT_GOAL = { startWeight: 225, goalWeight: 200 };
export const weightGoalOf = body => ({
  start: Number(body?.startWeight) || DEFAULT_WEIGHT_GOAL.startWeight,
  goal: Number(body?.goalWeight) || DEFAULT_WEIGHT_GOAL.goalWeight,
});
const fmt = n => (Math.round(n * 10) / 10).toString();

export function WeightTrend({ entries }) {
  const last = [...entries].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at)).slice(-12);
  if (last.length < 2) return null;
  const W = 340, H = 120, L = 34, R = 8, T = 10, B = 22;
  const ws = last.map(e => Number(e.weight));
  const mn = Math.floor(Math.min(...ws) - 1), mx = Math.ceil(Math.max(...ws) + 1);
  const x = i => L + i / (last.length - 1) * (W - L - R), y = w => T + (mx - w) / (mx - mn) * (H - T - B);
  const path = ws.map((w, i) => `${i ? 'L' : 'M'}${x(i)},${y(w)}`).join(' ');
  return <svg className="weight-trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight trend over your last ${last.length} check-ins: ${fmt(ws[0])} to ${fmt(ws[ws.length - 1])} lb`}>
    {[mx, (mx + mn) / 2, mn].map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="insight-grid"/><text x={L - 6} y={y(t) + 4} textAnchor="end" className="insight-tick">{fmt(t)}</text></g>)}
    <path d={path} className="weight-line"/>
    {ws.map((w, i) => <circle key={i} cx={x(i)} cy={y(w)} r="4" className="weight-dot"><title>{`${new Date(last[i].logged_at).toLocaleDateString()} · ${fmt(w)} lb`}</title></circle>)}
    <text x={L} y={H - 4} className="insight-tick">{new Date(last[0].logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
    <text x={W - R} y={H - 4} textAnchor="end" className="insight-tick">{new Date(last[last.length - 1].logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
  </svg>;
}

export function WeightScreen({ weightLog, body, busy, onLog, onDelete, onEditGoal }) {
  const [input, setInput] = useState('');
  const { start, goal } = weightGoalOf(body);
  const losing = start >= goal;
  const cur = weightLog[0] ? Number(weightLog[0].weight) : null;
  const span = Math.abs(start - goal) || 1;
  const moved = cur == null ? 0 : losing ? start - cur : cur - start;
  const toGo = cur == null ? Math.abs(start - goal) : Math.max(0, losing ? cur - goal : goal - cur);
  const pct = Math.min(100, Math.max(0, moved / span * 100));
  const proj = weightProjection(weightLog, goal, start);
  const submit = async e => { e.preventDefault(); if (await onLog(input)) setInput(''); };
  return <>
    <div className="engine-row" style={{ marginBottom: 16 }}>
      <div><span className="engine-label">Weekly check-in</span><h1 className="screen-title">Weight</h1></div>
      <button className="engine-link" onClick={onEditGoal}>Edit goal</button>
    </div>
    <section className="engine-card" aria-label="Weight progress">
      <div className="engine-row" style={{ alignItems: 'flex-end' }}>
        <div><span className="engine-label">Current</span><div className="engine-number">{cur == null ? '—' : fmt(cur)}<span className="weight-unit">lb</span></div></div>
        <div style={{ textAlign: 'right' }}><span className="engine-label">{losing ? 'Lost' : 'Gained'}</span><strong className="weight-moved">{moved > 0 ? `${losing ? '−' : '+'}${fmt(moved)}` : '0'}</strong></div>
      </div>
      <div className="engine-meter" role="progressbar" aria-label={`Progress from ${start} to ${goal} lb`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}><div style={{ width: `${pct}%` }}/></div>
      <div className="engine-row engine-muted"><span>Start {fmt(start)}</span><strong>{fmt(toGo)} lb to go</strong><span>Goal {fmt(goal)}</span></div>
      {proj && <p style={{ marginTop: 12 }}>{proj.done ? `You’re at your goal of ${fmt(goal)}. 🎉`
        : proj.stalled ? `${proj.weekly < 0 ? '▼' : '▲'} ${fmt(Math.abs(proj.weekly))} lb/week · the trend is flat right now, so there’s no projection yet.`
        : <>{`${proj.weekly < 0 ? '▼' : '▲'} ${fmt(Math.abs(proj.weekly))} lb/week · on pace for `}<strong>{fmt(goal)}</strong>{` by `}<strong>{proj.eta.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</strong></>}</p>}
    </section>
    <form className="engine-card" onSubmit={submit} aria-label="Log weight">
      <span className="engine-label">Log weight</span>
      <div className="engine-row" style={{ marginTop: 10, alignItems: 'stretch' }}>
        <input className="weight-input" aria-label="Weight in pounds" type="number" inputMode="decimal" min="100" max="400" step="0.1" placeholder={cur ? fmt(cur) : '220.0'} value={input} onChange={e => setInput(e.target.value)}/>
        <button className="engine-button primary" type="submit" disabled={busy || !input}>Log</button>
      </div>
    </form>
    {weightLog.length >= 2 && <section className="engine-card"><span className="engine-label">Trend · last {Math.min(12, weightLog.length)} check-ins</span><WeightTrend entries={weightLog}/></section>}
    {weightLog.length > 0 && <div className="engine-feed">{weightLog.map((e, i) => {
      const prev = weightLog[i + 1], delta = prev ? Number(e.weight) - Number(prev.weight) : null;
      const when = `${new Date(e.logged_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${daysAgo(e.logged_at)}`;
      return <div className="engine-entry" key={e.id}>
        <div className="engine-entry-body"><strong>{fmt(Number(e.weight))} lb</strong><span>{when}</span></div>
        {delta !== null && <span className="weight-delta" data-dir={delta === 0 ? 'flat' : (delta < 0) === losing ? 'good' : 'bad'}>{delta < 0 ? '▼' : delta > 0 ? '▲' : '—'} {fmt(Math.abs(delta))}</span>}
        <button className="engine-icon-button" aria-label="Delete weight entry" disabled={busy} onClick={() => onDelete(e.id)}>✕</button>
      </div>;
    })}</div>}
  </>;
}

export function BodySettings({ body, latestWeight, onSave }) {
  const { start, goal } = weightGoalOf(body);
  const [form, setForm] = useState({ feet: String(Math.floor((body.heightInches || 70) / 12)), inches: String((body.heightInches || 70) % 12), age: String(body.age || ''), start: String(start), goal: String(goal) });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const set = key => e => { setForm(f => ({ ...f, [key]: e.target.value })); setSaved(false); setError(''); };
  const submit = e => {
    e.preventDefault();
    const ft = Number(form.feet), inch = Number(form.inches), age = Number(form.age), s = Number(form.start), g = Number(form.goal);
    const height = ft * 12 + inch;
    if (!Number.isInteger(ft) || !Number.isFinite(inch) || inch < 0 || inch >= 12 || height < 48 || height > 96) { setError('Enter a height between 4 ft and 8 ft.'); return; }
    if (!Number.isInteger(age) || age < 13 || age > 100) { setError('Enter an age between 13 and 100.'); return; }
    if (![s, g].every(w => Number.isFinite(w) && w >= 100 && w <= 400)) { setError('Weights should be between 100 and 400 lb.'); return; }
    if (s === g) { setError('Your goal should differ from your starting weight.'); return; }
    onSave({ ...body, heightInches: height, age, startWeight: s, goalWeight: g });
    setSaved(true);
  };
  return <form className="engine-card" onSubmit={submit} aria-label="Body and weight goal">
    <h2>Body & weight goal</h2>
    <p className="engine-muted">Used for your Weight progress and your food targets.</p>
    <div className="engine-grid">
      <label className="engine-field">Height (ft)<input aria-label="Height feet" type="number" inputMode="numeric" min="4" max="8" step="1" value={form.feet} onChange={set('feet')}/></label>
      <label className="engine-field">Height (in)<input aria-label="Height inches" type="number" inputMode="decimal" min="0" max="11.5" step="0.5" value={form.inches} onChange={set('inches')}/></label>
      <label className="engine-field">Starting weight (lb)<input aria-label="Starting weight" type="number" inputMode="decimal" step="0.1" value={form.start} onChange={set('start')}/></label>
      <label className="engine-field">Goal weight (lb)<input aria-label="Goal weight" type="number" inputMode="decimal" step="0.1" value={form.goal} onChange={set('goal')}/></label>
    </div>
    <label className="engine-field">Age<input aria-label="Age" type="number" inputMode="numeric" min="13" max="100" step="1" value={form.age} onChange={set('age')}/></label>
    {latestWeight != null && <p className="engine-muted">Latest check-in: {fmt(latestWeight)} lb. <button type="button" className="engine-link" onClick={() => { setForm(f => ({ ...f, start: String(latestWeight) })); setSaved(false); }}>Start from today’s weight</button></p>}
    {error && <p role="alert">{error}</p>}
    <button className="engine-button primary" type="submit">Save</button>
    {saved && <p role="status" className="engine-muted">Saved.</p>}
  </form>;
}
