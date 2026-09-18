import React, { useState } from 'react';
import { addDays, buildPlan, C, dateKey, RECOVERY, startOfDay, normalizeAll } from './model';
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
      <details className="engine-details"><summary>How your Engine works</summary><p className="engine-muted">Engine is a smoothed training-load score built from 42-day weighting. Conditioning contributes minutes × reported effort; walks receive half weight and lifting does not add directly. The calculation and your history are unchanged.</p><p className="engine-muted">The score decreases slightly each day before new activity is added. A recovery-day dip is expected in this formula. It measures recorded training, not a direct fitness test or today’s freshness. Record the time and effort you actually did.</p></details>
    </>}
  </section>;
}

export function TodayAction({ all, constraints, preferences, hasDraft, onResume, onStart, onPlan, onChange }) {
  const today = startOfDay(new Date());
  const rec = buildPlan(all, today, 7, constraints)[0];
  const items = rec.items || [];
  const first = items[0];
  const recovery = !first || items.every(i => i.type === 'walk');
  const logged = all.filter(s => startOfDay(s.date).getTime() === today.getTime());
  const title = hasDraft ? 'Your workout is ready to resume' : recovery ? 'Recovery is today’s work' : items.map(i => RECOVERY.TYPES[i.type].label).join(' + ');
  return <section className="engine-card" aria-label="Today’s next step">
    <div className="engine-label">{hasDraft ? 'Pick up where you left off' : logged.length ? 'Your next step' : 'Today’s plan'}</div>
    <h2>{title}</h2>
    <p className="engine-muted">{hasDraft ? 'Your completed sets and edits are saved on this device.' : coachMessage({ tone: preferences.coachingTone, recovery, complete: logged.length > 0, returning: rec.band === 'restart' })}</p>
    {!hasDraft && first && !recovery && <p className="engine-muted">About {items.reduce((sum,i) => sum + RECOVERY.TYPES[i.type].defaultDurationMin,0)} min · adjust to the time you have</p>}
    <button className="engine-button primary" style={{ width: '100%', marginTop: 10 }} onClick={hasDraft ? onResume : recovery ? onPlan : () => onStart(first.type)}>{hasDraft ? 'Resume workout' : recovery ? 'View recovery plan' : first.type === 'tabata' ? 'Log Tabata' : first.type === 'lift' ? 'Start workout' : 'Log this session'}</button>
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

export function WeeklyPlan({ all, constraints, preferences, weeklyGoals, onPlan }) {
  const weekly = weeklyProgress(all,preferences.weeklyGoal,weeklyGoals);
  const today = startOfDay(new Date());
  const upcoming = buildPlan(all,today,7,constraints);
  return <section className="engine-card"><div className="engine-row"><span className="engine-label">This week · Mon–Sun</span><button className="engine-link" onClick={onPlan}>View plan</button></div>
    <h2>{weekly.count} / {weekly.goal} sessions</h2>
    <div className="engine-week">{Array.from({length:7},(_,i) => {
      const day = addDays(weekly.start,i), done = all.some(s => startOfDay(s.date).getTime() === day.getTime());
      const plan = upcoming.find(p => p.date.getTime() === day.getTime());
      const rest = plan && (plan.action === 'rest' || plan.items?.every(it => it.type === 'walk'));
      const label = done ? 'Activity recorded' : rest ? 'Recovery planned' : day < today ? 'No activity recorded' : 'Training planned';
      return <div className={`engine-day ${day.getTime() === today.getTime() ? 'today' : ''}`} key={i} title={`${day.toLocaleDateString()} · ${label}`}><div>{day.toLocaleDateString('en-US',{weekday:'short'})}</div><span aria-label={label}>{done ? '✓' : rest ? '○' : '·'}</span></div>;
    })}</div>
    <p className="engine-muted">{weekly.count >= weekly.goal ? 'Weekly goal complete. Enjoy the recovery built into your plan.' : 'Your goal is weekly. Planned rest leaves room for the next session.'}</p>
    <p className="engine-muted">✓ Activity recorded · ○ Recovery planned</p>
    {weekly.weeksMet > 0 && <p className="engine-muted">{weekly.weeksMet} saved weekly {weekly.weeksMet === 1 ? 'goal' : 'goals'} completed.</p>}
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

export function SeasonStats({ games, onProgress }) {
  const stat = games
    .filter(g => g.workout_type === 'game' && (g.points != null || g.rebounds != null))
    .sort((a,b) => new Date(a.completed_at) - new Date(b.completed_at));
  if (!stat.length) return null;
  const avg = arr => arr.length ? arr.reduce((s,n) => s+n,0)/arr.length : null;
  const fmt1 = n => n == null ? '—' : String(Math.round(n*10)/10);
  const pts = stat.filter(g => g.points != null).map(g => g.points);
  const rbs = stat.filter(g => g.rebounds != null).map(g => g.rebounds);
  const trendOf = vals => {
    if (vals.length < 4) return null;
    const half = Math.floor(vals.length/2);
    return avg(vals.slice(-half)) - avg(vals.slice(0,half));
  };
  const pTrend = trendOf(pts), rTrend = trendOf(rbs);
  const trendText = t => t == null ? null : `${t >= 0 ? '▲' : '▼'} ${fmt1(Math.abs(t))} vs early season`;
  const last = stat[stat.length-1];
  const lastBits = [last.points != null ? `${last.points} pts` : null, last.rebounds != null ? `${last.rebounds} rebounds` : null].filter(Boolean).join(' · ');
  return <section className="engine-card" aria-label="Season stats">
    <div className="engine-row"><span className="engine-label">Season · points & rebounds</span>{onProgress && <button className="engine-link" onClick={onProgress}>Full box score →</button>}</div>
    <div className="engine-grid" style={{ marginTop: 10 }}>
      <div className="engine-mini"><span className="engine-label">Points / game</span><strong style={{ fontSize: 26 }}>{fmt1(avg(pts))}</strong>{trendText(pTrend) && <div className="engine-muted">{trendText(pTrend)}</div>}</div>
      <div className="engine-mini"><span className="engine-label">Rebounds / game</span><strong style={{ fontSize: 26 }}>{fmt1(avg(rbs))}</strong>{trendText(rTrend) && <div className="engine-muted">{trendText(rTrend)}</div>}</div>
    </div>
    <p className="engine-muted" style={{ marginTop: 10 }}>Last game: <strong>{lastBits}</strong> · {new Date(last.completed_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · {stat.length} {stat.length === 1 ? 'game' : 'games'} this season</p>
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

export function EngineProgress({ history, cardioSessions, preferences, courtRatings, onRate, onSettings, children }) {
  const all = normalizeAll(cardioSessions,history);
  return <><EngineHero all={all}/><SeasonStats games={cardioSessions}/><EngineMilestone all={all} preferences={preferences} onSettings={onSettings}/><CourtCheckIn games={cardioSessions} all={all} ratings={courtRatings} onRate={onRate}/><details className="engine-card"><summary style={{cursor:'pointer',minHeight:44,paddingTop:10,fontWeight:600}}>Training history, strength & body details</summary><div style={{marginTop:16}}>{children}</div></details></>;
}

export function PlanOverview({ all, constraints, onStart }) {
  const plan=buildPlan(all,startOfDay(new Date()),7,constraints);
  return <section className="engine-card"><span className="engine-label">Upcoming 7 days</span><h2>Your training plan</h2><p className="engine-muted">A suggested schedule based on your recorded sessions. It updates when you log activity. Adjust it to fit your week.</p>
    {plan.map((p,i)=>{
      const items=p.items||[],recovery=!items.length||items.every(it=>it.type==='walk');
      return <div key={p.date.getTime()} style={{padding:'14px 0',borderTop:'1px solid var(--line)'}}><div className="engine-label">{i===0?'Today':p.date.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</div><h3>{recovery?'Recovery':items.map(it=>RECOVERY.TYPES[it.type].label).join(' + ')}</h3>
        <p className="engine-muted">{p.reason}</p>{(p.flags||[]).map(flag=><p className="engine-muted" key={flag}>{flag}</p>)}
        {i===0 && <div className="engine-actions">{items.map(it=><button className={`engine-button ${recovery?'':'primary'}`} key={it.type} onClick={()=>onStart(it.type)}>{it.type==='walk'?'Log an easy walk':it.type==='game'?'Log basketball':it.type==='cross_training'?'Log class':it.type==='long_interval'?'Log 10 sprints':it.type==='tabata'?'Log Tabata':`Start ${RECOVERY.TYPES[it.type].label}`}</button>)}</div>}
      </div>;
    })}
    <p className="engine-muted">Recovery is part of this plan. A small Engine dip on a rest day is expected in the formula.</p>
  </section>;
}

export function EngineHome({ history, cardioSessions, constraints, preferences, weeklyGoals, courtRatings, onRate, hasDraft, onResume, onStart, onGoTab, onQuickAdd, onFastBreak, onOpenAwards }) {
  const all = normalizeAll(cardioSessions,history);
  const today = dateKey(new Date());
  const completed = all.filter(s => dateKey(s.date) === today);
  return <><EngineHero all={all} compact onProgress={() => onGoTab('stats')}/><SeasonStats games={cardioSessions} onProgress={() => onGoTab('stats')}/><TodayAction all={all} constraints={constraints} preferences={preferences} hasDraft={hasDraft} onResume={onResume} onStart={onStart} onPlan={() => onGoTab('goals')} onChange={() => onGoTab('workout')}/>
    <button className="engine-button" style={{width:'100%',marginBottom:14}} onClick={onFastBreak}>Log 10 sprints</button>
    {completed.length > 0 && <div className="engine-card"><span className="engine-label">Work recorded today</span><p>{completed.map(s => RECOVERY.TYPES[s.type].label).join(' · ')}</p><button className="engine-link" onClick={() => onGoTab('history')}>View or edit your sessions →</button></div>}
    <EngineMilestone all={all} preferences={preferences} onSettings={() => onGoTab('settings')}/><WeeklyPlan all={all} constraints={constraints} preferences={preferences} weeklyGoals={weeklyGoals} onPlan={() => onGoTab('goals')}/><CourtCheckIn games={cardioSessions} all={all} ratings={courtRatings} onRate={onRate} compact/>
    <section className="engine-card"><span className="engine-label">Quick log</span><div className="engine-actions"><button className="engine-button" onClick={onQuickAdd}>Activity</button><button className="engine-button" onClick={() => onGoTab('nutrition')}>Food</button><button className="engine-button" onClick={() => onGoTab('weight')}>Weight</button></div><button className="engine-link" onClick={onOpenAwards}>Your achievements →</button></section>
  </>;
}
