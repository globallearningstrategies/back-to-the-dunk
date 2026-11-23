import React, { useMemo, useState } from 'react';
import { addDays, isBriskWalk, isHardType, sessionLabel, startOfDay } from './model';
import { COURT_RATINGS, engineBeforeGame, formatEngine } from './engine';
import { dayKeyOf } from './pregame';

/* Game insights — does what you do before a game show up on the court?
   Everything here is your own logged history: no predictions, and every
   comparison shows how many games it rests on. */
export const MIN_GAMES_PER_GROUP = 2;
export const PREGAME_FACTORS = [
  { key: 'sleep', best: 'good', title: 'Sleep', topLabel: 'Slept well', restLabel: 'Poor or OK sleep' },
  { key: 'legs', best: 'fresh', title: 'Legs', topLabel: 'Fresh legs', restLabel: 'Normal or heavy legs' },
];
const RATING_SCORE = { struggled: 1, solid: 2, strong: 3 };

export function dayBeforeKind(all, game) {
  const gameDay = startOfDay(new Date(game.completed_at)).getTime();
  const prev = addDays(new Date(gameDay), -1).getTime();
  const sessions = all.filter(s => startOfDay(s.date).getTime() === prev && String(s.id) !== String(game.id));
  const hard = sessions.find(s => isHardType(s.type));
  if (hard) return { kind: 'hard', label: hard.type === 'cross_training' ? 'Sweat440' : sessionLabel(hard) };
  if (sessions.some(isBriskWalk)) return { kind: 'light', label: 'Brisk walk' };
  if (sessions.some(s => s.type === 'walk')) return { kind: 'light', label: 'Easy walk' };
  return { kind: 'light', label: 'Rest' };
}

const avg = list => list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
const fmt1 = n => n == null ? '—' : String(Math.round(n * 10) / 10);

export function gameInsights(cardioSessions, all, ratings = {}, now = new Date(), pregame = {}) {
  const games = cardioSessions
    .filter(g => g.workout_type === 'game' && new Date(g.completed_at) <= now)
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .map(g => ({
      id: g.id, date: new Date(g.completed_at), raw: g,
      points: g.points, rebounds: g.rebounds, rating: ratings[g.id] || null,
      engine: engineBeforeGame(all, g), before: dayBeforeKind(all, g), pre: pregame[dayKeyOf(g.completed_at)] || null,
    }));
  const group = kind => {
    const list = games.filter(g => g.before.kind === kind);
    const pts = list.filter(g => g.points != null).map(g => g.points);
    const reb = list.filter(g => g.rebounds != null).map(g => g.rebounds);
    const rated = list.filter(g => RATING_SCORE[g.rating]);
    return { games: list.length, statGames: pts.length, points: avg(pts), rebounds: avg(reb),
      strongShare: rated.length ? rated.filter(g => g.rating === 'strong').length / rated.length : null, rated: rated.length };
  };
  const hard = group('hard'), light = group('light');
  const comparable = hard.statGames >= MIN_GAMES_PER_GROUP && light.statGames >= MIN_GAMES_PER_GROUP;

  // Higher vs lower Engine: split the games that have points at the median Engine.
  const withPts = games.filter(g => g.points != null).sort((a, b) => a.engine - b.engine);
  let engineSplit = null;
  if (withPts.length >= 4) {
    const half = Math.floor(withPts.length / 2);
    const low = withPts.slice(0, half), high = withPts.slice(withPts.length - half);
    engineSplit = { low: avg(low.map(g => g.points)), high: avg(high.map(g => g.points)), each: half,
      cut: (low[low.length - 1].engine + high[0].engine) / 2 };
  }
  // Sleep and legs from the pre-game check: the best answer vs everything else.
  const factors = PREGAME_FACTORS.map(f => {
    const scored = games.filter(g => g.points != null && g.pre && g.pre[f.key]);
    const top = scored.filter(g => g.pre[f.key] === f.best), rest = scored.filter(g => g.pre[f.key] !== f.best);
    return { ...f, top: { games: top.length, points: avg(top.map(g => g.points)) }, rest: { games: rest.length, points: avg(rest.map(g => g.points)) },
      comparable: top.length >= MIN_GAMES_PER_GROUP && rest.length >= MIN_GAMES_PER_GROUP, answered: scored.length };
  });
  return { games, hard, light, comparable, engineSplit, factors };
}

function verdict(hard, light) {
  const diff = light.points - hard.points;
  if (Math.abs(diff) < 1) return 'So far your scoring looks about the same either way.';
  return diff > 0
    ? `You’ve scored ${fmt1(diff)} more points per game after a light day.`
    : `You’ve scored ${fmt1(-diff)} more points per game after a hard day.`;
}

export function EngineScatter({ games, onSelect, selected }) {
  const pts = games.filter(g => g.points != null);
  if (pts.length < 2) return null;
  const W = 340, H = 196, L = 34, R = 10, T = 10, B = 44;
  const xMax = Math.max(10, ...pts.map(g => g.engine)) * 1.08;
  const yMax = Math.max(10, ...pts.map(g => g.points)) * 1.1;
  const x = v => L + v / xMax * (W - L - R), y = v => H - B - v / yMax * (H - T - B);
  const yTicks = [0, Math.round(yMax / 2), Math.round(yMax * 0.9)];
  const xTicks = [0, Math.round(xMax / 3), Math.round(xMax * 2 / 3)];
  return <><div className="insight-axis">Points</div><svg className="insight-scatter" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Points by Engine entering each game, ${pts.length} games. Table below lists each game.`}>
    {yTicks.map(t => <g key={`y${t}`}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="insight-grid"/><text x={L - 6} y={y(t) + 4} textAnchor="end" className="insight-tick">{t}</text></g>)}
    {xTicks.map(t => <text key={`x${t}`} x={x(t)} y={H - B + 16} textAnchor="middle" className="insight-tick">{t}</text>)}
    <text x={W - R} y={H - 4} textAnchor="end" className="insight-tick">Engine before game →</text>
    {pts.map(g => <g key={g.id} className="insight-dot" data-selected={selected === g.id ? 'true' : undefined} onClick={() => onSelect(g.id)}>
      <circle cx={x(g.engine)} cy={y(g.points)} r="16" fill="transparent"/>
      <circle cx={x(g.engine)} cy={y(g.points)} r={selected === g.id ? 7 : 5.5}/>
      <title>{`${g.date.toLocaleDateString()} · ${g.points} pts · Engine ${formatEngine(g.engine)}`}</title>
    </g>)}
  </svg></>;
}

export function GameInsights({ cardioSessions, all, ratings, onEditGame, seasonName, pregame = {} }) {
  const data = useMemo(() => gameInsights(cardioSessions, all, ratings, new Date(), pregame), [cardioSessions, all, ratings, pregame]);
  const [selected, setSelected] = useState(null);
  const { games, hard, light, comparable, engineSplit, factors } = data;
  if (!games.length) return null;
  const pick = games.find(g => g.id === selected);
  const hasExtra = games.some(g => ['assists','steals','threes_made'].some(k => g.raw[k] != null));
  const ratingLabel = key => COURT_RATINGS.find(r => r.key === key)?.label || '—';
  return <section className="engine-card" aria-label="Game insights">
    <span className="engine-label">What shows up on the court{seasonName ? ` · ${seasonName}` : ''}</span>
    <h2>Hard day before a game?</h2>
    {comparable ? <>
      <p>{verdict(hard, light)}</p>
      <div className="engine-grid">
        <div className="engine-mini"><span className="engine-label">After a light day</span><strong>{fmt1(light.points)} pts</strong><div className="engine-muted">{fmt1(light.rebounds)} reb · {light.statGames} games</div>{light.strongShare != null && <div className="engine-muted">Felt strong {Math.round(light.strongShare * 100)}%</div>}</div>
        <div className="engine-mini"><span className="engine-label">After a hard day</span><strong>{fmt1(hard.points)} pts</strong><div className="engine-muted">{fmt1(hard.rebounds)} reb · {hard.statGames} games</div>{hard.strongShare != null && <div className="engine-muted">Felt strong {Math.round(hard.strongShare * 100)}%</div>}</div>
      </div>
      <p className="engine-muted">Light day = rest or a walk. Hard day = a game, Sweat440, sprints, Tabata or a lift.</p>
    </> : <p className="engine-muted">{`Log points in at least ${MIN_GAMES_PER_GROUP} games after a hard day and ${MIN_GAMES_PER_GROUP} after a light day to compare. So far: ${hard.statGames} after hard, ${light.statGames} after light.`}</p>}

    <h3 style={{ marginTop: 18 }}>Sleep and legs</h3>
    {factors.some(f => f.comparable) ? <div className="engine-grid">{factors.filter(f => f.comparable).map(f => <div className="engine-mini" key={f.key}>
      <span className="engine-label">{f.title}</span>
      <div><strong style={{ display: 'inline', fontSize: 20 }}>{fmt1(f.top.points)}</strong> <span className="engine-muted">pts · {f.topLabel.toLowerCase()} ({f.top.games})</span></div>
      <div><strong style={{ display: 'inline', fontSize: 20 }}>{fmt1(f.rest.points)}</strong> <span className="engine-muted">pts · {f.restLabel.toLowerCase()} ({f.rest.games})</span></div>
    </div>)}</div> : <p className="engine-muted">{`Answer the two quick questions (sleep and legs) when you start the warm-up or log a game. After ${MIN_GAMES_PER_GROUP} games each way, this compares your scoring. So far: ${Math.max(...factors.map(f => f.answered))} games answered.`}</p>}

    <h3 style={{ marginTop: 18 }}>Engine vs points</h3>
    {engineSplit ? <p>{Math.abs(engineSplit.high - engineSplit.low) < 1
      ? `Your scoring has been similar in higher- and lower-Engine games (${engineSplit.each} each).`
      : `In your ${engineSplit.each} highest-Engine games you averaged ${fmt1(engineSplit.high)} points, vs ${fmt1(engineSplit.low)} in your ${engineSplit.each} lowest.`}</p>
      : <p className="engine-muted">Log points in 4 or more games to compare higher- and lower-Engine nights.</p>}
    <EngineScatter games={games} selected={selected} onSelect={id => setSelected(selected === id ? null : id)}/>
    <p className="engine-muted insight-pick" role="status">{pick
      ? <>{pick.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · <strong>{pick.points} pts</strong>{pick.rebounds != null ? ` · ${pick.rebounds} reb` : ''} · Engine {formatEngine(pick.engine)} · day before: {pick.before.label}</>
      : 'Tap a dot to see that game.'}</p>

    <details className="engine-details"><summary>Every game</summary>
      <div className="insight-table-wrap"><table className="engine-table">
        <thead><tr><th scope="col">Game</th><th scope="col">Pts</th><th scope="col">Reb</th>{hasExtra && <><th scope="col">Ast</th><th scope="col">Stl</th><th scope="col">3PM</th></>}<th scope="col">Engine</th><th scope="col">Day before</th><th scope="col">Felt</th></tr></thead>
        <tbody>{games.map(g => <tr key={g.id}>
          <td>{onEditGame ? <button className="engine-link" aria-label={`Edit game on ${g.date.toLocaleDateString()}`} onClick={() => onEditGame(g.raw)}>{g.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</button> : g.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
          <td>{g.points ?? '—'}</td><td>{g.rebounds ?? '—'}</td>{hasExtra && <><td>{g.raw.assists ?? '—'}</td><td>{g.raw.steals ?? '—'}</td><td>{g.raw.threes_made ?? '—'}</td></>}<td>{formatEngine(g.engine)}</td><td>{g.before.label}</td><td>{ratingLabel(g.rating)}</td>
        </tr>)}</tbody>
      </table></div>
    </details>
    <p className="engine-muted">These are patterns in your own games, not proof of cause — opponents, sleep and minutes played matter too. They get more reliable with every game you log.</p>
  </section>;
}
