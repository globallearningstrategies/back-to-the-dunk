import React from 'react';

/* Conditioning test (the 12-minute "Dyno Day" Cooper test). Results are saved
   in the synced `dyno` list; older ones may only exist in session notes
   ("Dyno day · Cooper 12-min test · 1.6 mi · est VO₂max 46.3"), so both are read. */
export const RETEST_DAYS = 42;
const DAY = 86400000;
const dayKey = d => new Date(d).toISOString().slice(0, 10);
export const isDynoNotes = notes => typeof notes === 'string' && notes.startsWith('Dyno day');

export function conditioningTests(saved = [], cardioSessions = []) {
  const tests = (Array.isArray(saved) ? saved : []).filter(t => t && t.date && Number(t.vo2) > 0)
    .map(t => ({ date: new Date(t.date), miles: Number(t.miles) || null, vo2: Number(t.vo2) }));
  const have = new Set(tests.map(t => dayKey(t.date)));
  for (const s of cardioSessions) {
    if (!isDynoNotes(s.notes)) continue;
    const vo2 = /VO₂max ([\d.]+)/.exec(s.notes), mi = / ([\d.]+) mi\b/.exec(s.notes);
    if (!vo2 || have.has(dayKey(s.completed_at))) continue;
    tests.push({ date: new Date(s.completed_at), miles: mi ? Number(mi[1]) : null, vo2: Number(vo2[1]) });
    have.add(dayKey(s.completed_at));
  }
  return tests.sort((a, b) => a.date - b.date);
}

export function testStatus(tests, now = new Date()) {
  const last = tests[tests.length - 1] || null;
  if (!last) return { last: null, due: false, daysSince: null, dueDate: null };
  const daysSince = Math.floor((now - last.date) / DAY);
  return { last, daysSince, due: daysSince >= RETEST_DAYS, dueDate: new Date(last.date.getTime() + RETEST_DAYS * DAY) };
}

const fmt = n => (Math.round(n * 10) / 10).toString();

export function ConditioningTestCard({ tests, onStart, compact = false }) {
  const { last, due, daysSince, dueDate } = testStatus(tests);
  if (compact && !due) return null;
  const prev = tests.length > 1 ? tests[tests.length - 2] : null;
  const change = last && prev ? last.vo2 - prev.vo2 : null;
  const shown = tests.slice(-8);
  const lo = Math.min(...shown.map(t => t.vo2)) - 2, hi = Math.max(...shown.map(t => t.vo2)) + 2;
  return <section className="engine-card" aria-label="Conditioning test">
    <div className="engine-row"><span className="engine-label">Conditioning test · 12 minutes</span>{onStart && <button className="engine-link" onClick={onStart}>{last ? (due ? 'Take the test' : 'Open test') : 'Take your first test'}</button>}</div>
    {!last ? <p className="engine-muted">Cover as much ground as you can in 12 minutes. It gives you one honest fitness number (estimated VO₂max) to re-test every 6 weeks.</p> : <>
      <div className="engine-grid" style={{ marginTop: 6 }}>
        <div className="engine-mini"><span className="engine-label">Est. VO₂max</span><strong style={{ fontSize: 26 }}>{fmt(last.vo2)}</strong><div className="engine-muted">{change == null ? 'First result' : `${change >= 0 ? '▲' : '▼'} ${fmt(Math.abs(change))} since last test`}</div></div>
        <div className="engine-mini"><span className="engine-label">{due ? 'Re-test' : 'Next test'}</span><strong style={{ fontSize: 22 }}>{due ? 'Due now' : dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong><div className="engine-muted">Last: {daysSince === 0 ? 'today' : `${daysSince} days ago`}{last.miles ? ` · ${fmt(last.miles)} mi` : ''}</div></div>
      </div>
      {!compact && shown.length > 1 && <div className="shot-bars" role="img" aria-label={`Estimated VO2max over your last ${shown.length} tests: ${shown.map(t => fmt(t.vo2)).join(', ')}`}>{shown.map(t => <div key={t.date.toISOString()} title={`${t.date.toLocaleDateString()} · ${fmt(t.vo2)}`} style={{ height: `${Math.max(8, (t.vo2 - lo) / (hi - lo) * 100)}%` }}/>)}</div>}
      {compact && <p className="engine-muted">It’s been {daysSince} days — re-test to see how your engine has moved.</p>}
    </>}
  </section>;
}
