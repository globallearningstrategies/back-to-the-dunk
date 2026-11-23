import React, { useState } from 'react';
import { addDays, buildPlan, BRISK_WALK, C, dateKey, isGameNight, isRecoveryPlan, planItemLabel, sessionLabel, planItemMinutes, RECOVERY, startOfDay } from './model';
import { WarmupCard, LogGameCard } from './GameDayWarmup';
import { ALL_TIME, currentSeason, filterSeason, SeasonPicker, seasonRanges } from './seasons';
import { Icon } from './ui';
import { ShootingCard, shootingSessions, shotLabel } from './shooting';
import { COURT_RATINGS, coachMessage, engineBeforeGame, engineSummary, formatEngine, weeklyProgress } from './engine';

export function EngineChart({ series, compact = false }) {
  const [days, setDays] = useState(42);
  const shown = compact ? series.slice(-14) : days ? series.slice(-days) : series;
  const max = Math.max(1, ...shown.map(p => p.F));
  const width = 380, height = compact ? 50 : 140;
  const coords = shown.map((p,i) => `${8 + i * (width - 16) / Math.max(1, shown.length - 1)},${height - 8 - p.F / max * (height - 16)}`).join(' ');
  return <>
    {!compact && <div className="engine-actions" aria-label="Chart period">{[[14,'14 days'],[42,'42 days'],[0,'All time']].map(([n,label]) => <button key={n} className="engine-button" aria-pressed={days === n} onClick={() => setDays(n)}>{label}</button>)}</div>}
    {shown.length > 0 ? <svg role="img" aria-label={`Engine history: ${formatEngine(shown[0].F)} to ${formatEngine(shown[shown.length-1].F)} over ${shown.length} days`} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, display: 'block', marginTop: 8 }}>
      <line x1="8" x2="372" y1={height-8} y2={height-8} stroke={C.line}/>
      {shown.length === 1 ? <circle cx="8" cy={height-8-shown[0].F/max*(height-16)} r="3" fill={C.rust}/> : <polyline points={coords} fill="none" stroke={C.rust} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>}
    </svg> : <p className="engine-muted">Your first conditioning session starts this chart.</p>}
    {!compact && shown.length > 0 && <div className="engine-row engine-muted"><span>{new Date(shown[0].t).toLocaleDateString()}</span><span>Daily Engine · {new Date(shown[shown.length-1].t).toLocaleDateString()}</span></div>}
  </>;
}

export function EngineHero({ all, onProgress, compact = false }) {
  const engine = engineSummary(all);
  return <section className="engine-card" aria-label="Your Engine">
    <div className="engine-row"><span className="engine-label">Your Engine</span>{onProgress && <button className="engine-link" onClick={onProgress}>View progress →</button>}</div>
    <div className="engine-row">
      <div className="engine-number">{formatEngine(engine.score)}</div>
      <div style={{ textAlign: 'right' }}><div className="engine-muted">Personal best</div><strong style={{ fontSize: 22 }}>{formatEngine(engine.peak)}</strong>
        <div className="engine-muted">{engine.weekPct == null ? 'Weekly trend building' : `${engine.weekPct >= 0 ? '+' : ''}${engine.weekPct.toFixed(1)}% over 7 days`}</div>
      </div>
    </div>
    <EngineChart series={engine.series} compact={compact}/>
    {!compact && <>
      <div className="engine-grid" style={{ marginTop: 16 }}><div className="engine-mini"><span className="engine-label">7-day average</span><strong>{formatEngine(engine.currentAverage)}</strong></div><div className="engine-mini"><span className="engine-label">Previous 7 days</span><strong>{engine.previousAverage == null ? '—' : formatEngine(engine.previousAverage)}</strong></div></div>
      <details className="engine-details"><summary>How your Engine works</summary><p className="engine-muted">Engine is a smoothed training-load score built from 42-day weighting. Conditioning contributes minutes × reported effort; Sweat440 strength classes count at 60% (their 40s-on/20s-off intervals keep the heart working), brisk walks — where you can talk but not sing — count in full at effort 4, easy walks receive half weight, and gym lifting does not add directly.</p><p className="engine-muted">The score decreases slightly each day before new activity is added. A recovery-day dip is expected in this formula. It measures recorded training, not a direct fitness test or today’s freshness. Record the time and effort you actually did.</p></details>
    </>}
  </section>;
}

export function TodayAction({ all, constraints, preferences, hasDraft, onResume, onStart, onPlan, onChange }) {
  const today = startOfDay(new Date());
  const rec = buildPlan(all, today, 7, constraints)[0];
  const items = rec.items || [];
  const first = items[0];
  const recovery = isRecoveryPlan(items);
  const briskWalk = first && first.type === 'walk' && first.pace === 'brisk';
  const logged = all.filter(s => startOfDay(s.date).getTime() === today.getTime());
  const title = hasDraft ? 'Your workout is ready to resume' : recovery ? 'Recovery is today’s work' : items.map(planItemLabel).join(' + ');
  return <section className="engine-card" aria-label="Today’s next step">
    <div className="engine-label">{hasDraft ? 'Pick up where you left off' : logged.length ? 'Your next step' : 'Today’s plan'}</div>
    <h2>{title}</h2>
    <p className="engine-muted">{hasDraft ? 'Your completed sets and edits are saved on this device.' : coachMessage({ tone: preferences.coachingTone, recovery, complete: logged.length > 0, returning: rec.band === 'restart' })}</p>
    {!hasDraft && first && !recovery && <p className="engine-muted">About {items.reduce((sum,i) => sum + planItemMinutes(i),0)} min{briskWalk ? ` · ${BRISK_WALK.test.toLowerCase()}` : ''} · adjust to the time you have</p>}
    <button className="engine-button primary" style={{ width: '100%', marginTop: 10 }} onClick={hasDraft ? onResume : recovery ? onPlan : () => onStart(briskWalk ? 'brisk_walk' : first.type)}>{hasDraft ? 'Resume workout' : recovery ? 'View recovery plan' : briskWalk ? 'Log brisk walk' : first.type === 'tabata' ? 'Log Tabata' : first.type === 'lift' ? 'Start workout' : 'Log this session'}</button>
    <div className="engine-row engine-wrap"><button className="engine-link" onClick={onChange}>Choose another session</button>{first?.type === 'lift' && !hasDraft && <button className="engine-link" onClick={() => onStart(first.type, true)}>Shorter session</button>}{recovery && <button className="engine-link" onClick={() => onStart('walk')}>Log an easy walk</button>}</div>
    <details className="engine-details"><summary>Why this plan?</summary><p className="engine-muted">{rec.reason}</p>{(rec.flags || []).map(flag => <p key={flag} className="engine-muted">{flag}</p>)}</details>
  </section>;
}

export function EngineMilestone({ all, preferences, onSettings }) {
  const engine = engineSummary(all), target = Number(preferences.engineTarget) || 100;
  const met = engine.score >= target;
  return <section className="engine-card"><div className="engine-row"><span className="engine-label">Your milestone</span><button className="engine-link" onClick={onSettings}>Edit goal</button></div>
    <h2>Engine {target}</h2><div className="engine-meter" role="progressbar" aria-label="Engine milestone progress" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(target,Math.max(0,engine.score))}><div style={{ width: `${Math.min(100,engine.score/target*100)}%` }}/></div>
    <p className="engine-muted">{met ? 'Milestone reached. Keep following your plan as you build consistency at this level.' : `${formatEngine(target-engine.score)} points to your chosen milestone. Build toward it through your planned sessions.`}</p>
    {engine.previousAverage != null && engine.currentAverage > engine.previousAverage && <p>Your 7-day average is up {formatEngine(engine.currentAverage-engine.previousAverage)} points.</p>}
  </section>;
}

export function CourtCheckIn({ games, all, ratings, onRate, compact = false }) {
  const sorted = [...games].filter(g => g.workout_type === 'game' && new Date(g.completed_at) <= new Date()).sort((a,b) => new Date(b.completed_at)-new Date(a.completed_at));
  const pending = sorted.find(g => !ratings[g.id]);
  const [editing, setEditing] = useState(null);
  const game = sorted.find(g => String(g.id) === String(editing)) || pending;
  const rated = sorted.filter(g => COURT_RATINGS.some(r => r.key === ratings[g.id]));
  if (compact && !game) return null;
  return <section className="engine-card" aria-label="Court check-in"><span className="engine-label">Engine → court</span><h2>{game ? 'How was your engine?' : 'How it feels on court'}</h2>
    {game ? <><p className="engine-muted">Game on {new Date(game.completed_at).toLocaleDateString()} · Engine entering the game: {formatEngine(engineBeforeGame(all,game))}</p><div className="engine-actions">{COURT_RATINGS.map(r => <button key={r.key} className="engine-button" aria-pressed={ratings[game.id] === r.key} onClick={() => { onRate(game.id,r.key); setEditing(null); }}>{r.label}</button>)}</div>{editing && <button className="engine-link" onClick={() => setEditing(null)}>Cancel</button>}</> : <p className="engine-muted">{sorted.length ? 'Your game check-ins are up to date.' : 'Log a basketball game to connect your Engine with your own experience.'}</p>}
    {!compact && rated.length > 0 && <>
      <table className="engine-table"><thead><tr><th scope="col">Game</th><th scope="col">Engine before</th><th scope="col">Your rating</th></tr></thead><tbody>{rated.slice(0,10).map(g => <tr key={g.id}><td>{new Date(g.completed_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</td><td>{formatEngine(engineBeforeGame(all,g))}</td><td><button className="engine-link" aria-label={`Edit court rating for ${new Date(g.completed_at).toLocaleDateString()}`} onClick={() => setEditing(g.id)}>{COURT_RATINGS.find(r => r.key === ratings[g.id]).label}</button></td></tr>)}</tbody></table>
      <details className="engine-details"><summary>Average Engine by court rating</summary>{COURT_RATINGS.map(r => { const group = rated.filter(g => ratings[g.id] === r.key); return <p key={r.key} className="engine-muted">{r.label}: {group.length ? formatEngine(group.reduce((sum,g) => sum+engineBeforeGame(all,g),0)/group.length) : '—'} · {group.length} {group.length === 1 ? 'game' : 'games'}</p>; })}<p className="engine-muted">These are your observations, not a prediction. Scores exclude each game’s own training contribution and update if you correct your history.</p></details>
    </>}
  </section>;
}

export function SeasonStats({ games, onProgress, onEdit, seasonName = 'this season' }) {
  const stat = games
    .filter(g => g.workout_type === 'game' && ['points','rebounds','assists','steals','threes_made'].some(k => g[k] != null))
    .sort((a,b) => new Date(a.completed_at) - new Date(b.completed_at));
  if (!stat.length) return <section className="engine-card" aria-label="Season stats"><span className="engine-label">Box score · {seasonName}</span><p className="engine-muted">No games with stats yet in {seasonName}.</p></section>;
  const avg = arr => arr.length ? arr.reduce((s,n) => s+n,0)/arr.length : null;
  const fmt1 = n => n == null ? '—' : String(Math.round(n*10)/10);
  const vals = k => stat.filter(g => g[k] != null).map(g => g[k]);
  const trendOf = v => {
    if (v.length < 4) return null;
    const half = Math.floor(v.length/2);
    return avg(v.slice(-half)) - avg(v.slice(0,half));
  };
  const trendText = t => t == null ? null : `${t >= 0 ? '▲' : '▼'} ${fmt1(Math.abs(t))} vs earlier games`;
  const tile = (k, label, big) => { const v = vals(k); return <div className="engine-mini" key={k}><span className="engine-label">{label}</span><strong style={{ fontSize: big ? 26 : 22 }}>{fmt1(avg(v))}</strong>{big && trendText(trendOf(v)) && <div className="engine-muted">{trendText(trendOf(v))}</div>}{!big && <div className="engine-muted">{v.length} {v.length === 1 ? 'game' : 'games'}</div>}</div>; };
  const extras = [['assists','Assists / game'],['steals','Steals / game'],['threes_made','3PM / game']].filter(([k]) => vals(k).length);
  const last = stat[stat.length-1];
  const lastBits = [['points','pts'],['rebounds','reb'],['assists','ast'],['steals','stl'],['threes_made','3PM']].filter(([k]) => last[k] != null).map(([k,u]) => `${last[k]} ${u}`).join(' · ');
  return <section className="engine-card" aria-label="Season stats">
    <div className="engine-row"><span className="engine-label">Box score · {seasonName}</span>{onProgress && <button className="engine-link" onClick={onProgress}>Full box score →</button>}</div>
    <div className="engine-grid" style={{ marginTop: 10 }}>{tile('points','Points / game',true)}{tile('rebounds','Rebounds / game',true)}</div>
    {extras.length > 0 && <div className="season-extras" style={{ marginTop: 10 }}>{extras.map(([k,l]) => tile(k,l,false))}</div>}
    <div className="engine-row" style={{ marginTop: 10 }}><p className="engine-muted" style={{ margin: 0 }}>Last game: <strong>{lastBits}</strong> · {new Date(last.completed_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · {stat.length} {stat.length === 1 ? 'game' : 'games'}</p>{onEdit && <button className="engine-link" aria-label="Edit last game" onClick={() => onEdit(last)}>Edit</button>}</div>
  </section>;
}

export function GoalSettings({ preferences, onSave }) {
  const [target,setTarget] = useState(String(preferences.engineTarget));
  const [goal,setGoal] = useState(String(preferences.weeklyGoal));
  const [error,setError] = useState('');
  const [saved,setSaved] = useState(false);
  return <section className="engine-card"><span className="engine-label">Build your Engine</span><h2>Your goals</h2><form onSubmit={e => {
    e.preventDefault(); const t=Number(target), g=Number(goal);
    if (!Number.isFinite(t) || t<=0 || t>10000 || !Number.isInteger(g) || g<1 || g>21) { setError('Choose a positive Engine target up to 10,000 and 1–21 sessions per week.'); return; }
    onSave({engineTarget:t,weeklyGoal:g}); setError(''); setSaved(true);
  }}>
    <label className="engine-field">Engine milestone<input type="number" min="1" max="10000" step="1" value={target} onChange={e => {setTarget(e.target.value);setSaved(false);}} required/></label>
    <label className="engine-field">Weekly session goal<input type="number" min="1" max="21" step="1" value={goal} onChange={e => {setGoal(e.target.value);setSaved(false);}} required/></label>
    <p className="engine-muted">Choose what fits your week. All recorded activity counts toward this goal. Updating it applies to this week and future weeks; earlier saved goals stay as they were.</p>
    {error && <p role="alert">{error}</p>}<button className="engine-button primary" type="submit">Save goals</button>{saved && <p role="status" className="engine-muted">Goals updated.</p>}
  </form></section>;
}

export function EngineProgress({ all, cardioSessions, preferences, courtRatings, onRate, onSettings, onEditGame, shooting, insights, extra, children }) {
  const seasons = preferences.seasons || [];
  const [seasonId, setSeasonId] = useState(() => currentSeason(seasons).id);
  const range = seasonId === 'all' ? ALL_TIME : seasonRanges(seasons).find(r => r.id === seasonId) || currentSeason(seasons);
  const seasonGames = filterSeason(cardioSessions, range);
  // The detailed breakdown is expensive, so it mounts only once it is opened.
  const [details, setDetails] = useState(false);
  return <><EngineHero all={all}/><SeasonPicker seasons={seasons} value={range.id} onChange={setSeasonId}/><SeasonStats games={seasonGames} onEdit={onEditGame} seasonName={range.id === 'all' ? 'all games' : range.name}/>{insights && insights(seasonGames, range)}{shooting}{extra}<EngineMilestone all={all} preferences={preferences} onSettings={onSettings}/><CourtCheckIn games={cardioSessions} all={all} ratings={courtRatings} onRate={onRate}/><details className="engine-card" onToggle={e => { if (e.currentTarget.open) setDetails(true); }}><summary style={{cursor:'pointer',minHeight:44}}>Training history, strength & body details</summary>{details && <div style={{marginTop:16}}>{children}</div>}</details></>;
}

export function EngineHome({ all, shooting = {}, constraints, preferences, cardioSessions, courtRatings, onRate, hasDraft, onResume, onStart, onGoTab, onQuickAdd, onLogType, onFastBreak, onThrees, onWarmup, onWalk, onLogGame, warmedUp, extraCards, recap }) {
  const today = dateKey(new Date());
  const gameLogged = cardioSessions.some(g => g.workout_type === 'game' && dateKey(new Date(g.completed_at)) === today);
  const gameNight = isGameNight(constraints, new Date()) && !gameLogged;
  const readyToLog = gameNight && onLogGame && (warmedUp || new Date().getHours() >= 20);
  const completed = [...all.filter(s => dateKey(s.date) === today).map(sessionLabel),
    ...shootingSessions(shooting).filter(s => dateKey(s.at) === today).map(shotLabel)];
  return <>
    {recap}
    {readyToLog ? <LogGameCard onLog={onLogGame} onWarmup={onWarmup}/> : onWarmup && gameNight && <WarmupCard gameNight onStart={onWarmup}/>}
    <TodayAction all={all} constraints={constraints} preferences={preferences} hasDraft={hasDraft} onResume={onResume} onStart={onStart} onPlan={() => onGoTab('goals')} onChange={() => onGoTab('workout')}/>
    {completed.length > 0 && <section className="engine-card" aria-label="Today's activity"><div className="engine-row"><span className="engine-label">Today’s activity</span><button className="engine-link" onClick={() => onGoTab('history')}>View log →</button></div><p>{completed.join(' · ')}</p></section>}
    <section className="engine-card" aria-label="Quick log"><span className="engine-label">Quick log</span><p className="engine-muted">Already done? Add it in a tap.</p>
      <div className="engine-tiles">
        {onLogType && <button className="engine-tile" aria-label="Basketball" onClick={() => onLogType('game')}><span className="engine-tile-icon"><Icon name="ball" size={20}/></span><span><strong>Basketball</strong><small>Game or pickup</small></span></button>}
        {onThrees && <button className="engine-tile" aria-label="100 threes" onClick={onThrees}><span className="engine-tile-icon"><Icon name="target" size={20}/></span><span><strong>100 threes</strong><small>Shots and makes</small></span></button>}
        {onLogType && <button className="engine-tile" aria-label="Sweat440" onClick={() => onLogType('cross_training')}><span className="engine-tile-icon"><Icon name="drop" size={20}/></span><span><strong>Sweat440</strong><small>Class</small></span></button>}
        {onFastBreak && <button className="engine-tile" aria-label="10 sprints" onClick={onFastBreak}><span className="engine-tile-icon"><Icon name="bolt" size={20}/></span><span><strong>10 sprints</strong><small>Fast breaks</small></span></button>}
        {onWalk && <button className="engine-tile" aria-label="Brisk walk" onClick={() => onWalk('brisk')}><span className="engine-tile-icon"><Icon name="walk" size={20}/></span><span><strong>Brisk walk</strong><small>{BRISK_WALK.test}</small></span></button>}
        <button className="engine-tile" aria-label="Other activity" onClick={onQuickAdd}><span className="engine-tile-icon"><Icon name="plus" size={20}/></span><span><strong>Other</strong><small>Walk, Tabata, food…</small></span></button>
      </div>
    </section>
    {onWarmup && !gameNight && <WarmupCard onStart={onWarmup}/>}
    <ShootingCard log={shooting} onLog={onThrees} compact/>
    {extraCards}
    <CourtCheckIn games={cardioSessions} all={all} ratings={courtRatings} onRate={onRate} compact/>
  </>;
}
