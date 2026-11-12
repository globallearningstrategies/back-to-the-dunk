import React, { useState } from 'react';
import { toLocalInput } from './logging';
import { Sheet } from './ui';

/* Three-point shooting log. A session is { at, attempts, makes } stored in the
   synced `shooting` map. It is skill work, not conditioning: it appears in the
   activity log and shooting stats but never changes the Engine score. */
export const SHOT_GOAL = 100;
export const newShotId = () => `shot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const shotPct = (makes, attempts) => makes == null || !attempts ? null : makes / attempts * 100;
export const formatPct = value => value == null ? '—' : `${Math.round(value * 10) / 10}%`;

export function shootingSessions(log = {}) {
  return Object.entries(log)
    .filter(([, v]) => v && Number(v.attempts) > 0 && Number.isFinite(new Date(v.at).getTime()))
    .map(([id, v]) => ({ id, at: new Date(v.at), attempts: Number(v.attempts), makes: v.makes == null ? null : Number(v.makes) }))
    .sort((a, b) => b.at - a.at);
}

export function shootingSummary(log, asOf = new Date()) {
  const sessions = shootingSessions(log);
  const tracked = sessions.filter(s => s.makes != null);
  const total = list => { const attempts = list.reduce((n, s) => n + s.attempts, 0); return attempts ? list.reduce((n, s) => n + s.makes, 0) / attempts * 100 : null; };
  const weekAgo = asOf.getTime() - 7 * 86400000;
  const recent = tracked.slice(0, 5), earlier = tracked.slice(5, 10);
  return {
    sessions, tracked,
    count: sessions.length,
    attempts: sessions.reduce((n, s) => n + s.attempts, 0),
    makes: tracked.reduce((n, s) => n + s.makes, 0),
    pct: total(tracked),
    recentPct: total(recent),
    trend: recent.length && earlier.length ? total(recent) - total(earlier) : null,
    best: tracked.reduce((best, s) => best == null || shotPct(s.makes, s.attempts) > shotPct(best.makes, best.attempts) ? s : best, null),
    weekShots: sessions.filter(s => s.at.getTime() > weekAgo && s.at <= asOf).reduce((n, s) => n + s.attempts, 0),
  };
}

export function validateShots({ attempts, makes, when }, now = new Date()) {
  const a = Number(attempts), date = new Date(when);
  if (!Number.isInteger(a) || a < 1 || a > 2000) return { error: 'Shots taken should be a whole number from 1 to 2,000.' };
  const m = makes === '' || makes == null ? null : Number(makes);
  if (m != null && (!Number.isInteger(m) || m < 0 || m > a)) return { error: `Makes should be a whole number from 0 to ${a}.` };
  if (!Number.isFinite(date.getTime()) || date > now) return { error: 'Choose a date and time that has already happened.' };
  return { value: { at: date.toISOString(), attempts: a, makes: m } };
}

export function ThreePointLog({ editing, onSave, onDelete, onClose }) {
  const [makes, setMakes] = useState(editing?.makes != null ? String(editing.makes) : '');
  const [attempts, setAttempts] = useState(String(editing?.attempts ?? SHOT_GOAL));
  const [when, setWhen] = useState(() => toLocalInput(editing?.at ?? new Date()));
  const [error, setError] = useState('');
  const pct = makes === '' ? null : shotPct(Number(makes), Number(attempts));
  const step = n => setMakes(String(Math.min(Number(attempts) || SHOT_GOAL, Math.max(0, (Number(makes) || 0) + n))));
  const save = event => {
    event.preventDefault();
    const result = validateShots({ attempts, makes, when });
    if (result.error) { setError(result.error); return; }
    onSave(editing?.id, result.value);
  };
  const standard = Number(attempts) === SHOT_GOAL;
  return <Sheet label="Shooting · Quick log" title={editing ? 'Edit shooting session' : `${standard ? SHOT_GOAL : attempts || '—'} threes`} titleId="three-point-title" onClose={onClose} onSubmit={save}>
    <p className="engine-muted">How many went in? Leave it blank to log the reps without a count.</p>
    <div className="shot-hero"><input aria-label="Threes made" type="number" inputMode="numeric" min="0" max={attempts || SHOT_GOAL} step="1" placeholder="–" value={makes} autoFocus={!editing} onChange={e => { setMakes(e.target.value); setError(''); }}/><span>/ {attempts || '—'} made</span></div>
    <div className="shot-steps">{[-5, -1, 1, 5].map(n => <button key={n} type="button" className="engine-button" aria-label={`${n > 0 ? 'Add' : 'Remove'} ${Math.abs(n)}`} onClick={() => step(n)}>{n > 0 ? `+${n}` : `−${Math.abs(n)}`}</button>)}</div>
    <p className="shot-pct" role="status">{pct == null || !Number.isFinite(pct) ? ' ' : `${formatPct(pct)} from three`}</p>
    <details className="engine-details"><summary>Adjust shots taken or date</summary>
      <div className="engine-actions" aria-label="Quick shot counts">{[50, 100, 200].map(n => <button key={n} type="button" className="engine-button" aria-pressed={Number(attempts) === n} onClick={() => setAttempts(String(n))}>{n} shots</button>)}</div>
      <label className="engine-field">Shots taken<input aria-label="Threes attempted" type="number" inputMode="numeric" min="1" max="2000" step="1" value={attempts} onChange={e => { setAttempts(e.target.value); setError(''); }}/></label>
      <label className="engine-field">When<input aria-label="Shooting date" type="datetime-local" max={toLocalInput(new Date())} value={when} onChange={e => { setWhen(e.target.value); setError(''); }}/></label>
    </details>
    {error && <p role="alert">{error}</p>}
    <button className="engine-button primary" type="submit" style={{ width: '100%', marginTop: 12 }}>{editing ? 'Save changes' : `Log ${attempts || SHOT_GOAL} threes`}</button>
    {editing && <button type="button" className="engine-link" style={{ width: '100%', marginTop: 6 }} onClick={() => onDelete(editing.id)}>Delete session</button>}
  </Sheet>;
}

export function ShootingCard({ log, onLog, compact = false }) {
  const s = shootingSummary(log);
  if (compact && !s.count) return null;
  const bars = [...s.tracked.slice(0, 10)].reverse();
  const last = s.sessions[0];
  return <section className="engine-card" aria-label="Three-point shooting">
    <div className="engine-row"><span className="engine-label">Three-point shooting</span>{onLog && <button className="engine-link" onClick={onLog}>Log threes</button>}</div>
    {!s.count ? <p className="engine-muted">Log your first 100 threes to start tracking volume and percentage.</p> : <>
      <div className="engine-grid" style={{ marginTop: 6 }}>
        <div className="engine-mini"><span className="engine-label">{compact ? 'Last 5 sessions' : 'All-time'}</span><strong style={{ fontSize: 26 }}>{formatPct(compact ? s.recentPct : s.pct)}</strong><div className="engine-muted">{s.trend == null ? `${s.makes} of ${s.tracked.reduce((n, x) => n + x.attempts, 0)} made` : `${s.trend >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(s.trend * 10) / 10)} pts vs previous 5`}</div></div>
        <div className="engine-mini"><span className="engine-label">Shots taken</span><strong style={{ fontSize: 26 }}>{s.attempts.toLocaleString()}</strong><div className="engine-muted">{s.weekShots.toLocaleString()} in the last 7 days</div></div>
      </div>
      {!compact && bars.length > 1 && <div className="shot-bars" role="img" aria-label={`Percentage in your last ${bars.length} counted sessions, oldest first: ${bars.map(b => formatPct(shotPct(b.makes, b.attempts))).join(', ')}`}>{bars.map(b => <div key={b.id} title={`${b.at.toLocaleDateString()} · ${formatPct(shotPct(b.makes, b.attempts))}`} style={{ height: `${Math.max(6, shotPct(b.makes, b.attempts))}%` }}/>)}</div>}
      <p className="engine-muted" style={{ marginTop: 10 }}>Last session: <strong>{last.makes == null ? `${last.attempts} shots` : `${last.makes}/${last.attempts}`}</strong> · {last.at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{!compact && s.best ? ` · Best ${s.best.makes}/${s.best.attempts}` : ''}</p>
    </>}
  </section>;
}
