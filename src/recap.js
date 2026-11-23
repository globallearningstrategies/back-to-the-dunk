import React from 'react';
import { addDays, engineModel, isBriskWalk, startOfDay, startOfWeek } from './model';
import { formatEngine } from './engine';
import { shootingSessions, shotPct, formatPct } from './shooting';

/* Weekly recap (Mon–Sun). On Sunday it covers the week so far; from Monday it
   covers the week that just ended. */
export function recapWeekStart(now = new Date()) {
  const thisWeek = startOfWeek(now);
  return now.getDay() === 0 ? thisWeek : addDays(thisWeek, -7);
}

export function weekRecap({ all, cardioSessions, shooting, goal }, weekStart, now = new Date()) {
  const end = addDays(weekStart, 7);
  const inWeek = d => { const t = new Date(d); return t >= weekStart && t < end && t <= now; };
  const sessions = all.filter(s => inWeek(s.date));
  const games = cardioSessions.filter(g => g.workout_type === 'game' && inWeek(g.completed_at)).sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));
  const shots = shootingSessions(shooting).filter(s => inWeek(s.at));
  const threes = shots.filter(s => s.kind !== 'ft'), counted = threes.filter(s => s.makes != null);
  const brisk = sessions.filter(isBriskWalk);
  const asOfEnd = new Date(Math.min(now.getTime(), end.getTime() - 1));
  const engineStart = engineModel(all, new Date(weekStart.getTime() - 1)).score;
  const engineEnd = engineModel(all, asOfEnd).score;
  const best = games.filter(g => g.points != null).sort((a, b) => b.points - a.points)[0] || null;
  return {
    weekStart, end: addDays(weekStart, 6), sessions: sessions.length, goal,
    engineStart, engineEnd, engineChange: engineEnd - engineStart,
    games: games.map(g => ({ id: g.id, date: new Date(g.completed_at), points: g.points, rebounds: g.rebounds })), best,
    threes: { attempts: threes.reduce((n, s) => n + s.attempts, 0), pct: counted.length ? shotPct(counted.reduce((n, s) => n + s.makes, 0), counted.reduce((n, s) => n + s.attempts, 0)) : null },
    briskWalks: brisk.length, briskMinutes: brisk.reduce((n, s) => n + (s.duration || 0), 0),
  };
}

export function recapHeadline(r) {
  if (r.goal && r.sessions >= r.goal) return `Weekly goal hit — ${r.sessions} sessions.`;
  if (!r.sessions) return 'A quiet week. One session starts the next one.';
  return `${r.sessions} ${r.sessions === 1 ? 'session' : 'sessions'}${r.goal ? ` of ${r.goal}` : ''} this week.`;
}

export function WeekRecap({ recap: r, onDismiss, onOpenLog }) {
  const range = `${r.weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${r.end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const up = r.engineChange >= 0;
  return <section className="engine-card" aria-label="Weekly recap" id="weekly-recap">
    <div className="engine-row"><span className="engine-label">Your week · {range}</span>{onDismiss && <button className="engine-link" onClick={onDismiss}>Dismiss</button>}</div>
    <h2>{recapHeadline(r)}</h2>
    <div className="engine-grid">
      <div className="engine-mini"><span className="engine-label">Engine</span><strong>{formatEngine(r.engineEnd)}</strong><div className="engine-muted">{up ? '▲' : '▼'} {formatEngine(Math.abs(r.engineChange))} this week</div></div>
      <div className="engine-mini"><span className="engine-label">Sessions</span><strong>{r.sessions}{r.goal ? <span className="engine-muted"> / {r.goal}</span> : null}</strong><div className="engine-muted">{r.briskWalks ? `${r.briskWalks} brisk ${r.briskWalks === 1 ? 'walk' : 'walks'} · ${Math.round(r.briskMinutes)} min` : 'All logged activity'}</div></div>
      <div className="engine-mini"><span className="engine-label">Games</span><strong>{r.games.length}</strong><div className="engine-muted">{r.best ? `Best: ${r.best.points} pts${r.best.rebounds != null ? ` · ${r.best.rebounds} reb` : ''}` : r.games.length ? 'No stats logged' : 'No games this week'}</div></div>
      <div className="engine-mini"><span className="engine-label">Threes</span><strong>{r.threes.attempts}</strong><div className="engine-muted">{r.threes.pct == null ? (r.threes.attempts ? 'Makes not counted' : 'No shooting logged') : `${formatPct(r.threes.pct)} made`}</div></div>
    </div>
    {onOpenLog && <button className="engine-link" onClick={onOpenLog}>See every session →</button>}
  </section>;
}
