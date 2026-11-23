import React, { useState } from 'react';
import { toLocalInput } from './logging';
import { Sheet } from './ui';
import './shooting.css';

/* Shooting log. A session is { at, attempts, makes } stored in the synced
   `shooting` map. Optional fields: `kind: 'ft'` marks free throws (missing kind
   = three-pointers) and `spots: { lc, lw, top, rw, rc }` holds makes per spot for
   a 5 x 20 "by spot" three-point session (attempts 100, makes = sum). It is skill work, not conditioning: it appears in the
   activity log and shooting stats but never changes the Engine score. */
export const SHOT_GOAL = 100;
export const newShotId = () => `shot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const shotPct = (makes, attempts) => makes == null || !attempts ? null : makes / attempts * 100;
export const formatPct = value => value == null ? '—' : `${Math.round(value * 10) / 10}%`;

export const FT_GOAL = 50;
export const SPOT_SHOTS = 20;
export const SHOT_SPOTS = [['lc', 'Left corner'], ['lw', 'Left wing'], ['top', 'Top'], ['rw', 'Right wing'], ['rc', 'Right corner']].map(([id, label]) => ({ id, label }));
const SHOT_MODE_KEY = 'btd-shot-mode';

const normSpots = spots => {
  if (!spots || typeof spots !== 'object') return null;
  const out = {};
  for (const { id } of SHOT_SPOTS) { const n = Number(spots[id]); if (!Number.isInteger(n) || n < 0 || n > SPOT_SHOTS) return null; out[id] = n; }
  return out;
};

export function shootingSessions(log = {}) {
  return Object.entries(log)
    .filter(([, v]) => v && Number(v.attempts) > 0 && Number.isFinite(new Date(v.at).getTime()))
    .map(([id, v]) => {
      const kind = v.kind === 'ft' ? 'ft' : 'three';
      return { id, at: new Date(v.at), attempts: Number(v.attempts), makes: v.makes == null ? null : Number(v.makes), kind, spots: kind === 'three' ? normSpots(v.spots) : null };
    })
    .sort((a, b) => b.at - a.at);
}

/* "100 threes" / "50 free throws" — for the activity log and Today list. */
export function shotLabel(session) {
  const n = Number(session?.attempts) || 0;
  return session?.kind === 'ft' ? `${n} free throw${n === 1 ? '' : 's'}` : `${n} three${n === 1 ? '' : 's'}`;
}

function summarize(sessions, asOf) {
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

/* Top-level fields describe three-pointers only (so existing callers keep
   showing three-point numbers); `ft` is the same shape for free throws and
   `spots` / `bestSpot` / `worstSpot` total every by-spot session. */
export function shootingSummary(log, asOf = new Date()) {
  const all = shootingSessions(log);
  const threes = summarize(all.filter(s => s.kind === 'three'), asOf);
  const spotSessions = threes.sessions.filter(s => s.spots);
  const spots = spotSessions.length ? SHOT_SPOTS.map(({ id, label }) => {
    const makes = spotSessions.reduce((n, s) => n + s.spots[id], 0), attempts = spotSessions.length * SPOT_SHOTS;
    return { id, label, makes, attempts, pct: shotPct(makes, attempts) };
  }) : [];
  const bestSpot = spots.reduce((b, x) => b == null || x.pct > b.pct ? x : b, null);
  const worstSpot = spots.reduce((w, x) => w == null || x.pct < w.pct ? x : w, null);
  return { ...threes, ft: summarize(all.filter(s => s.kind === 'ft'), asOf), spotSessions: spotSessions.length, spots, bestSpot, worstSpot };
}

export function validateShots({ attempts, makes, when, kind }, now = new Date()) {
  const a = Number(attempts), date = new Date(when);
  if (!Number.isInteger(a) || a < 1 || a > 2000) return { error: 'Shots taken should be a whole number from 1 to 2,000.' };
  const m = makes === '' || makes == null ? null : Number(makes);
  if (m != null && (!Number.isInteger(m) || m < 0 || m > a)) return { error: `Makes should be a whole number from 0 to ${a}.` };
  if (!Number.isFinite(date.getTime()) || date > now) return { error: 'Choose a date and time that has already happened.' };
  const value = { at: date.toISOString(), attempts: a, makes: m };
  if (kind === 'ft') value.kind = 'ft';
  return { value };
}

/* By-spot threes: every one of the five spots needs a make count from 0 to 20. */
export function validateSpots({ spots = {}, when }, now = new Date()) {
  const out = {};
  for (const { id, label } of SHOT_SPOTS) {
    const raw = spots[id], n = raw === '' || raw == null ? NaN : Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > SPOT_SHOTS) return { error: `Enter makes from 0 to ${SPOT_SHOTS} for ${label.toLowerCase()}.` };
    out[id] = n;
  }
  const makes = Object.values(out).reduce((a, b) => a + b, 0);
  const base = validateShots({ attempts: SPOT_SHOTS * SHOT_SPOTS.length, makes, when }, now);
  return base.error ? base : { value: { ...base.value, spots: out } };
}

const readMode = () => { try { return localStorage.getItem(SHOT_MODE_KEY) === 'spots' ? 'spots' : 'total'; } catch (e) { return 'total'; } };
const writeMode = mode => { try { localStorage.setItem(SHOT_MODE_KEY, mode); } catch (e) {} };

const blankSpots = spots => Object.fromEntries(SHOT_SPOTS.map(({ id }) => [id, spots && spots[id] != null ? String(spots[id]) : '']));

/* Bottom sheet for logging a shooting session. `kind="ft"` logs free throws;
   otherwise threes, with a Total / By spot toggle. Editing an existing session
   follows that session's kind and mode. */
export function ThreePointLog({ editing, onSave, onDelete, onClose, kind: kindProp }) {
  const kind = editing ? (editing.kind === 'ft' ? 'ft' : 'three') : kindProp === 'ft' ? 'ft' : 'three';
  const ft = kind === 'ft';
  const goal = ft ? FT_GOAL : SHOT_GOAL;
  const noun = ft ? 'free throws' : 'threes';
  const [mode, setModeState] = useState(() => ft ? 'total' : editing ? (editing.spots ? 'spots' : 'total') : readMode());
  const [makes, setMakes] = useState(editing?.makes != null ? String(editing.makes) : '');
  const [attempts, setAttempts] = useState(String(editing?.attempts ?? goal));
  const [spots, setSpots] = useState(() => blankSpots(editing?.spots));
  const [when, setWhen] = useState(() => toLocalInput(editing?.at ?? new Date()));
  const [error, setError] = useState('');
  const bySpot = mode === 'spots';
  const setMode = next => { setModeState(next); writeMode(next); setError(''); };
  const spotTotal = SHOT_SPOTS.reduce((n, { id }) => n + (Number(spots[id]) || 0), 0);
  const spotsFilled = SHOT_SPOTS.some(({ id }) => spots[id] !== '');
  const spotAttempts = SPOT_SHOTS * SHOT_SPOTS.length;
  const pct = bySpot ? (spotsFilled ? shotPct(spotTotal, spotAttempts) : null) : makes === '' ? null : shotPct(Number(makes), Number(attempts));
  const step = n => setMakes(String(Math.min(Number(attempts) || goal, Math.max(0, (Number(makes) || 0) + n))));
  const setSpot = (id, value) => { setSpots(prev => ({ ...prev, [id]: value })); setError(''); };
  const stepSpot = (id, n) => setSpot(id, String(Math.min(SPOT_SHOTS, Math.max(0, (Number(spots[id]) || 0) + n))));
  const save = event => {
    event.preventDefault();
    const result = bySpot ? validateSpots({ spots, when }) : validateShots({ attempts, makes, when, kind });
    if (result.error) { setError(result.error); return; }
    onSave(editing?.id, result.value);
  };
  const shown = bySpot ? spotAttempts : attempts || '—';
  const title = editing ? (ft ? 'Edit free-throw session' : 'Edit shooting session') : `${shown} ${noun}`;
  return <Sheet label={ft ? 'Free throws · Quick log' : 'Shooting · Quick log'} title={title} titleId="three-point-title" onClose={onClose} onSubmit={save}>
    {!ft && <div className="engine-actions shot-mode" role="group" aria-label="Logging mode">
      <button type="button" className="engine-button" aria-pressed={!bySpot} onClick={() => setMode('total')}>Total</button>
      <button type="button" className="engine-button" aria-pressed={bySpot} onClick={() => setMode('spots')}>By spot</button>
    </div>}
    {bySpot ? <>
      <p className="engine-muted">{SPOT_SHOTS} shots from each of five spots. Enter how many went in at each.</p>
      <div className="shot-spots">{SHOT_SPOTS.map(({ id, label }) => <div className="shot-spot" key={id}>
        <label htmlFor={`shot-spot-${id}`}>{label}</label>
        <button type="button" className="engine-button" aria-label={`Remove 1 at ${label.toLowerCase()}`} onClick={() => stepSpot(id, -1)}>−</button>
        <input id={`shot-spot-${id}`} aria-label={`${label} makes`} type="number" inputMode="numeric" min="0" max={SPOT_SHOTS} step="1" placeholder="–" value={spots[id]} onChange={e => setSpot(id, e.target.value)}/>
        <button type="button" className="engine-button" aria-label={`Add 1 at ${label.toLowerCase()}`} onClick={() => stepSpot(id, 1)}>+</button>
        <span className="engine-muted">/ {SPOT_SHOTS}</span>
      </div>)}</div>
      <p className="shot-pct" role="status">{spotTotal}/{spotAttempts}{pct == null ? '' : ` · ${formatPct(pct)} from three`}</p>
    </> : <>
      <p className="engine-muted">How many went in? Leave it blank to log the reps without a count.</p>
      <div className="shot-hero"><input aria-label={ft ? 'Free throws made' : 'Threes made'} type="number" inputMode="numeric" min="0" max={attempts || goal} step="1" placeholder="–" value={makes} autoFocus={!editing} onChange={e => { setMakes(e.target.value); setError(''); }}/><span>/ {attempts || '—'} made</span></div>
      <div className="shot-steps">{[-5, -1, 1, 5].map(n => <button key={n} type="button" className="engine-button" aria-label={`${n > 0 ? 'Add' : 'Remove'} ${Math.abs(n)}`} onClick={() => step(n)}>{n > 0 ? `+${n}` : `−${Math.abs(n)}`}</button>)}</div>
      <p className="shot-pct" role="status">{pct == null || !Number.isFinite(pct) ? ' ' : `${formatPct(pct)} ${ft ? 'from the line' : 'from three'}`}</p>
    </>}
    <details className="engine-details"><summary>{bySpot ? 'Adjust date' : 'Adjust shots taken or date'}</summary>
      {!bySpot && <>
        <div className="engine-actions" aria-label="Quick shot counts">{(ft ? [20, 50, 100] : [50, 100, 200]).map(n => <button key={n} type="button" className="engine-button" aria-pressed={Number(attempts) === n} onClick={() => setAttempts(String(n))}>{n} shots</button>)}</div>
        <label className="engine-field">Shots taken<input aria-label={ft ? 'Free throws attempted' : 'Threes attempted'} type="number" inputMode="numeric" min="1" max="2000" step="1" value={attempts} onChange={e => { setAttempts(e.target.value); setError(''); }}/></label>
      </>}
      <label className="engine-field">When<input aria-label="Shooting date" type="datetime-local" max={toLocalInput(new Date())} value={when} onChange={e => { setWhen(e.target.value); setError(''); }}/></label>
    </details>
    {error && <p role="alert">{error}</p>}
    <button className="engine-button primary" type="submit" style={{ width: '100%', marginTop: 12 }}>{editing ? 'Save changes' : `Log ${bySpot ? spotAttempts : attempts || goal} ${noun}`}</button>
    {editing && <button type="button" className="engine-link" style={{ width: '100%', marginTop: 6 }} onClick={() => onDelete(editing.id)}>Delete session</button>}
  </Sheet>;
}

/* Convenience wrapper: the same sheet set up for free throws. */
export const FreeThrowLog = props => <ThreePointLog {...props} kind="ft"/>;

const SPOT_XY = { lc: [16, 40], lw: [44, 96], top: [110, 122], rw: [176, 96], rc: [204, 40] };

function SpotCourt({ spots, bestId, worstId }) {
  return <svg className="shot-court" viewBox="-8 0 236 146" aria-hidden="true" focusable="false">
    <line x1="-4" y1="6" x2="224" y2="6"/>
    <path d="M14 6 V24 A96 96 0 0 0 206 24 V6"/>
    <circle className="shot-court-rim" cx="110" cy="20" r="6"/>
    {spots.map(s => {
      const [x, y] = SPOT_XY[s.id];
      const tag = s.id === bestId ? ' best' : s.id === worstId ? ' worst' : '';
      return <g key={s.id} className={`shot-court-spot${tag}`}>
        <circle cx={x} cy={y} r="17"/>
        <text x={x} y={y + 4} textAnchor="middle">{s.pct == null ? '—' : `${Math.round(s.pct)}%`}</text>
      </g>;
    })}
  </svg>;
}

export function ShootingCard({ log, onLog, onLogFt, compact = false }) {
  const s = shootingSummary(log);
  if (compact && !s.count) return null;
  const bars = [...s.tracked.slice(0, 10)].reverse();
  const last = s.sessions[0];
  const ft = s.ft;
  const distinct = s.bestSpot && s.worstSpot && s.bestSpot.pct !== s.worstSpot.pct;
  const bestId = distinct ? s.bestSpot.id : null, worstId = distinct ? s.worstSpot.id : null;
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
    {!compact && s.spots.length > 0 && <div className="shot-spot-summary">
      <span className="engine-label">By spot · {s.spotSessions} session{s.spotSessions === 1 ? '' : 's'}</span>
      <SpotCourt spots={s.spots} bestId={bestId} worstId={worstId}/>
      <ul className="shot-spot-list" aria-label="Three-point percentage by spot">{s.spots.map(x => <li key={x.id} className={x.id === bestId ? 'best' : x.id === worstId ? 'worst' : undefined}>
        <span>{x.label}{x.id === bestId && <em> · Best</em>}{x.id === worstId && <em> · Needs work</em>}</span>
        <span className="engine-muted">{x.makes}/{x.attempts}</span>
        <strong>{formatPct(x.pct)}</strong>
      </li>)}</ul>
    </div>}
    {!compact && (ft.count > 0 || onLogFt) && <div className="shot-ft" aria-label="Free throws">
      <div className="engine-row"><span className="engine-label">Free throws</span>{onLogFt && <button className="engine-link" onClick={onLogFt}>Log free throws</button>}</div>
      {ft.count ? <p className="shot-ft-line"><strong>{formatPct(ft.pct)}</strong> <span className="engine-muted">{ft.tracked.length ? `${ft.makes} of ${ft.tracked.reduce((n, x) => n + x.attempts, 0)} made · ` : ''}{ft.count} session{ft.count === 1 ? '' : 's'} · {ft.attempts.toLocaleString()} shots</span></p>
        : <p className="engine-muted">No free throws logged yet.</p>}
    </div>}
  </section>;
}
