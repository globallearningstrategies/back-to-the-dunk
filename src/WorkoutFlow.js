import React, { useEffect, useRef, useState } from 'react';
import { SESSIONS, getLastPerformance, beep, vibrate, fireNotification } from './model';
import { exerciseRecord } from './engine';
import { toLocalInput } from './logging';

function SetEditor({ ex, values, checked, last, onChange, onRest }) {
  const targets = Math.max(1,parseInt(ex.sets) || 1);
  const baseWeight = values.weight ?? (ex.barbell ? 45 + (Number(values.perSide) || 0)*2 : last?.weight ?? '');
  const unweighted = ex.noWeight || ex.timed || ex.bodyweight;
  const done = values.completedSets || Object.fromEntries(Array.from({length:Number(values.setsDone) || (checked ? targets : 0)},(_,i) => [i,true]));
  const toggle = i => {
    const weight = Number(values.setWeights?.[i] ?? baseWeight) || 0;
    const reps = Number(values.customReps?.[i] ?? parseFloat(ex.reps)) || 0;
    const next = {...done,[i]:!done[i]};
    onChange({...values,weight:String(weight),completedSets:next,setsDone:String(Object.values(next).filter(Boolean).length),
      setWeights:{...values.setWeights,[i]:weight},customReps:{...values.customReps,[i]:reps}});
    if (!done[i]) { beep(880,.04,.15); vibrate(10); if (onRest && Object.values(next).filter(Boolean).length<targets) onRest(); }
  };
  return <>
    <p className="engine-muted">Target: {ex.sets} × {ex.reps}{ex.note ? ` · ${ex.note}` : ''}</p>
    <p className="engine-muted">{last ? `Last time: ${last.weight ? `${last.weight} lb · ` : ''}${last.sets || ''} sets · ${last.reps} reps` : 'First time here. Choose the numbers that fit today.'}</p>
    {ex.barbell && <p className="engine-muted">Weight below is the total including the bar.</p>}
    {Array.from({length:targets},(_,i) => <div className="workout-set" key={i}>
      <span style={{paddingBottom:20}}>{i+1}</span>
      <label className="engine-field">{ex.timed ? 'Seconds' : 'Reps'}<input aria-label={`${ex.name} set ${i+1} ${ex.timed ? 'seconds' : 'reps'}`} type="number" min="0" max="10000" step="1" value={values.customReps?.[i] ?? (parseFloat(ex.reps) || 0)} onChange={e => onChange({...values,completedSets:done,customReps:{...values.customReps,[i]:e.target.value}})}/></label>
      {unweighted ? <span className="engine-muted" style={{paddingBottom:20}}>Bodyweight</span> : <label className="engine-field">lb<input aria-label={`${ex.name} set ${i+1} weight`} type="number" min="0" max="2000" step="0.5" value={values.setWeights?.[i] ?? baseWeight} onChange={e => onChange({...values,completedSets:done,setWeights:{...values.setWeights,[i]:e.target.value}})}/></label>}
      <button className={`engine-button ${done[i] ? '' : 'primary'}`} aria-label={`${done[i] ? 'Undo' : 'Complete'} set ${i+1}`} aria-pressed={!!done[i]} style={{marginBottom:6}} onClick={() => toggle(i)}>{done[i] ? '✓' : 'Done'}</button>
    </div>)}
  </>;
}

function LiftFlow({ draft, history, onRest, onSave, busy }) {
  const { flow, setFlow, activeSession, vals, setVals, checked, setChecked, liftDate, setLiftDate } = draft;
  const session = SESSIONS[activeSession] || SESSIONS[0];
  const exercises = flow.short ? session.exercises.slice(0,Math.min(3,session.exercises.length)) : session.exercises;
  const index = Math.min(flow.index || 0,exercises.length-1);
  const original = exercises[index], key = `${session.id}_${original.id}`;
  const values = vals[key] || {};
  const ex = values.swap || original;
  const [swapping,setSwapping] = useState(false);
  const [replacement,setReplacement] = useState('');
  const [review,setReview] = useState(false);
  const [error,setError] = useState('');
  const available = SESSIONS.flatMap(s => s.exercises).filter((e,i,arr) => arr.findIndex(x => x.name===e.name)===i && e.name!==ex.name);
  const records = session.exercises.map(e => exerciseRecord(vals[`${session.id}_${e.id}`]?.swap || e, vals[`${session.id}_${e.id}`], checked[`${session.id}_${e.id}`])).filter(Boolean);
  const update = next => {
    setVals(p => ({...p,[key]:next}));
    setChecked(p => ({...p,[key]:Object.values(next.completedSets || {}).filter(Boolean).length >= (Number(ex.sets)||1)}));
  };
  const move = next => {setFlow({...flow,index:next});setSwapping(false);window.scrollTo({top:0,behavior:'auto'});};
  return <section className="engine-card"><div className="engine-label">{session.code} · {flow.short ? 'Short session' : session.name}</div>
    <div className="engine-row"><h2>{review ? 'Review your workout' : `Exercise ${index+1} of ${exercises.length}`}</h2><button className="engine-link" onClick={() => setReview(!review)}>{review ? 'Back to sets' : 'Review'}</button></div>
    {review ? <>
      {records.length ? records.map((r,i) => <p key={i}>{r.name} · {r.sets} {r.sets===1?'set':'sets'}</p>) : <p className="engine-muted">No completed sets yet. Complete a set to save this workout.</p>}
      <label className="engine-field">Workout date<input aria-label="Workout date" type="datetime-local" value={liftDate} max={toLocalInput(new Date())} onChange={e => setLiftDate(e.target.value)}/></label>
      <p className="engine-muted">Only completed sets will be recorded. Unfinished exercises are left out.</p>
      {error && <p role="alert">{error}</p>}
      <button className="engine-button primary" disabled={busy || !records.length} onClick={async () => {
        if (records.some(r => r.set_details.some(s => !Number.isFinite(s.reps) || s.reps<=0 || s.reps>10000 || !Number.isFinite(s.weight) || s.weight<0 || s.weight>2000))) {setError('Check completed sets: reps must be positive and weights cannot be negative.');return;}
        if (await onSave()) setReview(false);
      }}>{busy ? 'Saving…' : 'Save workout'}</button>
    </> : <>
      <h3 style={{fontSize:24}}>{ex.name}</h3><SetEditor key={key+ex.name} ex={ex} values={values} checked={checked[key]} last={getLastPerformance(history,ex.name)} onChange={update} onRest={onRest}/>
      <div className="engine-actions"><button className="engine-button" disabled={index===0} onClick={() => move(index-1)}>Previous</button><button className="engine-button primary" onClick={() => index===exercises.length-1 ? setReview(true) : move(index+1)}>{index===exercises.length-1 ? 'Review workout' : 'Next exercise'}</button></div>
      <div className="engine-row"><button className="engine-link" onClick={() => setSwapping(!swapping)}>Swap exercise</button><button className="engine-link" onClick={() => index===exercises.length-1 ? setReview(true) : move(index+1)}>Skip for now</button></div>
      {swapping && <div className="engine-mini">
        {exerciseRecord(ex,values,checked[key]) ? <p className="engine-muted">This exercise already has completed sets. Keep those records and skip ahead, or undo its sets before replacing it.</p> : <><label className="engine-field">Replacement<select value={replacement} onChange={e => setReplacement(e.target.value)}><option value="">Choose an exercise</option>{available.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}</select></label><button className="engine-button" disabled={!replacement} onClick={() => { const next=available.find(e=>e.name===replacement); if(next) {setVals(p=>({...p,[key]:{swap:next,completedSets:{}}}));setChecked(p=>({...p,[key]:false}));setSwapping(false);setReplacement('');} }}>Use this exercise</button></>}
      </div>}
      <button className="engine-link" style={{marginTop:12}} onClick={() => setReview(true)}>Finish early & review</button>
    </>}
  </section>;
}

function IntervalFlow({ draft, onSave, busy }) {
  const {flow,setFlow} = draft;
  const [now,setNow] = useState(Date.now());
  const [effort,setEffort] = useState('8');
  const [review,setReview] = useState(false);
  const [error,setError] = useState('');
  const timer = flow.timer || { elapsed:0,startedAt:null,running:false };
  const target = (flow.minutes || (flow.mode==='tabata' ? 4 : 10))*60;
  const elapsed = Math.min(target,Math.max(0,(timer.elapsed || 0) + (timer.running ? (now-timer.startedAt)/1000 : 0)));
  const completed = elapsed>=target;
  const cycle = flow.mode==='tabata' ? 30 : 60;
  const workSeconds = flow.mode==='tabata' ? 20 : 15;
  const phaseSeconds = Math.floor(elapsed)%cycle;
  const work = phaseSeconds<workSeconds;
  const phase = completed ? 'Complete' : work ? 'Work' : 'Easy';
  const lastPhase = useRef(phase);
  useEffect(() => {
    if(completed && timer.running) setFlow({...flow,timer:{elapsed:target,startedAt:null,running:false}});
  },[completed,timer.running]);
  useEffect(() => {
    if (!timer.running) return;
    const id=setInterval(()=>setNow(Date.now()),250); return ()=>clearInterval(id);
  },[timer.running]);
  useEffect(() => { if (lastPhase.current!==phase && timer.running) {beep(completed?880:660,.15,.25);vibrate(80);fireNotification(completed?'Session complete':`${phase} interval`,completed?'Return to The Work to record your session.':`${phase} interval started.`);} lastPhase.current=phase; },[phase,timer.running,completed]);
  useEffect(() => {
    if (!timer.running || completed || !navigator.wakeLock) return;
    let lock, active=true;
    const acquire=async()=>{if(document.visibilityState==='visible'){try{const next=await navigator.wakeLock.request('screen');if(active)lock=next;else await next.release();}catch{ /* Screen wake lock is optional. */ }}};
    acquire();document.addEventListener('visibilitychange',acquire);
    return()=>{active=false;document.removeEventListener('visibilitychange',acquire);if(lock)lock.release().catch(()=>{});};
  },[timer.running,completed]);
  const pause = () => setFlow({...flow,timer:{elapsed,startedAt:null,running:false}});
  const begin = () => {setNow(Date.now());setFlow({...flow,timer:{elapsed,startedAt:Date.now(),running:true}});};
  const remaining = Math.max(0,Math.ceil(target-elapsed));
  const clock = value => `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;
  return <section className="engine-card"><span className="engine-label">Conditioning</span><h2>{flow.mode==='tabata' ? 'Tabata intervals' : 'Fast break intervals'}</h2>
    <p className="engine-muted">{flow.mode==='tabata' ? '20 seconds work · 10 seconds easy' : '15 seconds work · 45 seconds easy'}. Choose your pace.</p>
    {!elapsed && !timer.running && <div className="engine-actions" aria-label="Session duration">{(flow.mode==='tabata'?[2,4]:[10,12,15]).map(m => <button className="engine-button" key={m} aria-pressed={target===m*60} onClick={()=>setFlow({...flow,minutes:m})}>{m} min</button>)}</div>}
    <div style={{textAlign:'center',padding:'24px 0'}}><div className="engine-label">{completed ? 'Session complete' : timer.running ? phase : 'Paused'}</div><div className="engine-number" style={{marginTop:8}}>{clock(remaining)}</div><p className="engine-muted">{completed ? 'Review your time and effort below.' : `${Math.ceil((work ? workSeconds : cycle)-phaseSeconds)} sec ${work?'work':'easy'} · round ${Math.floor(elapsed/cycle)+1}`}</p></div>
    {!completed && !review && <div className="engine-actions"><button className="engine-button primary" onClick={timer.running?pause:begin}>{timer.running?'Pause':elapsed?'Resume timer':'Start timer'}</button>{elapsed>0 && <button className="engine-button" onClick={()=>{pause();setReview(true);}}>Finish early</button>}</div>}
    {(review || completed) && <div className="engine-mini"><h3>Record what you did</h3><p>{(elapsed/60).toFixed(1)} minutes completed</p><label className="engine-field">How hard did it feel? (1–10)<input aria-label="Session effort" type="number" min="1" max="10" step="1" value={effort} onChange={e=>setEffort(e.target.value)}/></label>
      {error && <p role="alert">{error}</p>}<button className="engine-button primary" disabled={busy} onClick={async()=>{
        const rpe=Number(effort);if(!Number.isInteger(rpe)||rpe<1||rpe>10||elapsed<6){setError('Record at least 6 seconds and an effort from 1 to 10.');return;}
        await onSave({workout_type:flow.mode==='tabata'?'tabata':'long_interval',duration_min:Math.round(elapsed/6)/10,rpe,notes:flow.mode==='tabata'?'Tabata timer':'Fast break timer'});
      }}>{busy?'Saving…':'Save session'}</button>{!completed && <button className="engine-link" onClick={()=>setReview(false)}>Back to timer</button>}
    </div>}
    <p className="engine-muted">Timer progress is saved on this device. Pause it when you stop training.</p>
  </section>;
}

export function TrainWorkspace({ draft, history, onStart, onStartTimer, onRest, onSaveLift, onSaveConditioning, onFastBreak, onLog, onWalk, onDyno, busy }) {
  const {flow,setFlow,setActiveSession} = draft;
  const [confirmDiscard,setConfirmDiscard] = useState(false);
  const [timerClosed,setTimerClosed] = useState(false);
  const exitTimer = () => {
    setFlow({active:false,mode:'lift'});
    draft.dismissResume();setConfirmDiscard(false);setTimerClosed(true);
  };
  if(flow?.active) return <><div className="engine-row" style={{marginBottom:12}}><span className="engine-label">{flow.mode==='lift'?'Workout in progress':'Optional timer'}</span>{flow.mode==='lift' ? <button className="engine-link" onClick={()=>setConfirmDiscard(!confirmDiscard)}>Change session</button> : <button className="engine-button" disabled={busy} onClick={exitTimer}>Exit timer</button>}</div>
    {flow.mode!=='lift' && <p className="engine-muted">Exit stops the timer without logging a session.</p>}
    {confirmDiscard && flow.mode==='lift' && <section className="engine-card"><p>Your lift sets stay saved.</p><button className="engine-button" onClick={()=>{setFlow({...flow,active:false});setConfirmDiscard(false);}}>Back to session choices</button></section>}
    {flow.mode==='lift' ? <LiftFlow draft={draft} history={history} onRest={onRest} onSave={onSaveLift} busy={busy}/> : <IntervalFlow draft={draft} onSave={onSaveConditioning} busy={busy}/>}
  </>;
  return <>{timerClosed && <p className="engine-muted" role="status">Timer closed. No session was logged.</p>}<section className="engine-card"><span className="engine-label">Fast breaks</span><h2>10 sprints</h2><p className="engine-muted">Sprint, then walk back to your starting spot. Repeat 10 times.</p><div className="engine-actions"><button className="engine-button primary" onClick={onFastBreak}>Log 10 sprints</button></div></section><section className="engine-card"><span className="engine-label">Build your Engine</span><h2>Choose your session</h2><p className="engine-muted">Log training you’ve already completed.</p><div className="engine-actions"><button className="engine-button primary" onClick={()=>onLog('tabata')}>Log Tabata</button></div><div className="engine-actions"><button className="engine-button" onClick={()=>onLog('game')}>Log basketball</button><button className="engine-button" onClick={()=>onLog('cross_training')}>Log class</button><button className="engine-button" onClick={onWalk}>Log walk</button><button className="engine-button" onClick={()=>onLog('long_interval')}>Log conditioning</button></div></section>
    <section className="engine-card"><span className="engine-label">Strength supports your game</span><h2>Lift</h2><p className="engine-muted">Strength sessions count toward your weekly goal. They don’t add directly to the Engine formula.</p>{SESSIONS.map((s,i)=><div className="engine-row" key={s.id} style={{borderBottom:'1px solid var(--line)',padding:'10px 0'}}><div><strong>{s.code} · {s.name}</strong><div className="engine-muted">{s.exercises.length} exercises · {s.location}</div></div><button className="engine-button" onClick={()=>{setActiveSession(i);onStart('lift');}}>Start {s.code}</button></div>)}</section>
    <details className="engine-card"><summary style={{minHeight:44,cursor:'pointer'}}>Optional timers</summary><p className="engine-muted">Only open these when you want a guided clock. You can exit at any time.</p><div className="engine-actions"><button className="engine-button" onClick={()=>{setTimerClosed(false);onStartTimer('long_interval');}}>Fast break timer</button><button className="engine-button" onClick={()=>{setTimerClosed(false);onStartTimer('tabata');}}>Tabata timer</button></div></details>
    <details className="engine-card"><summary style={{minHeight:44,cursor:'pointer'}}>Conditioning benchmark</summary>{onDyno}</details>
  </>;
}
