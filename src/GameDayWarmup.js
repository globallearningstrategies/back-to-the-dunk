import React, { useEffect, useRef, useState } from 'react';
import { beep, speak, vibrate } from './model';
import { PregameCheck } from './pregame';

/* Game Day Warm-Up — a 10-minute pre-game routine in 4 timed phases.
   Works two ways: start the countdown and it moves through each drill on its
   own (chime + vibration at every phase change), or go at your own pace and
   tap "Next" / check drills off. The screen stays awake while it is open. */
export const WARMUP_PHASES = [
  { id: 'engine', title: 'Turn On the Engine', range: 'Minutes 0–3', drills: [
    { id: 'jog', name: 'Light Jogging & High Skips', seconds: 90, cue: 'Baseline to baseline, big arm swings.' },
    { id: 'shuffle', name: 'Side Shuffles & Carioca', seconds: 90, cue: 'Low defensive stance, sideline to sideline.' },
  ] },
  { id: 'mobility', title: 'Dynamic Mobility', range: 'Minutes 3–6', drills: [
    { id: 'lunge', name: 'Walking Lunges with a Twist', seconds: 60, cue: 'Deep lunge, rotate torso over front knee.' },
    { id: 'swings', name: 'Leg Swings', seconds: 60, cue: '10 front-to-back, 10 side-to-side per leg against a wall.' },
    { id: 'inchworm', name: 'Inchworms to Push-Up', seconds: 60, cue: 'Walk hands to plank, 1 push-up, walk feet to hands.' },
  ] },
  { id: 'explosive', title: 'Explosive Activation', range: 'Minutes 6–8', drills: [
    { id: 'pogo', name: 'Pogo Jumps', seconds: 30, cue: 'Light, quick bounces on balls of feet, stiff ankles.' },
    { id: 'closeout', name: 'Defensive Slide + Closeout Sprints', seconds: 90, cue: '4–5 reps — shuffle to free-throw line, sprint to 3-point line with hands high, chop feet to stop.' },
  ] },
  { id: 'ball', title: 'Game-Speed Ball Touches', range: 'Minutes 8–10', drills: [
    { id: 'pound', name: 'Pound Dribbles & Combos', seconds: 60, cue: 'Hard waist- and ankle-height dribbles, crossovers, between-the-legs.' },
    { id: 'layups', name: 'Game-Speed Layups & Pull-Ups', seconds: 60, cue: '4–5 full-speed drives + 4–5 one-dribble pull-up jumpers.' },
  ] },
];

export const WARMUP_DRILLS = WARMUP_PHASES.flatMap((phase, p) => phase.drills.map(d => ({ ...d, phase: p, phaseTitle: phase.title })));
export const WARMUP_SECONDS = WARMUP_DRILLS.reduce((sum, d) => sum + d.seconds, 0);

export const clock = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.ceil(s)) % 60).padStart(2, '0')}`;
const formatDuration = s => s >= 60 && s % 60 === 0 ? `${s / 60} min` : s > 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;

// Keep the phone awake while the warm-up is on screen. The lock is dropped by
// the browser whenever the page is hidden, so it is requested again on return.
function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.wakeLock) return;
    let lock = null, alive = true;
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try { const next = await navigator.wakeLock.request('screen'); if (alive) lock = next; else next.release(); } catch { /* optional */ }
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => { alive = false; document.removeEventListener('visibilitychange', acquire); if (lock) lock.release().catch(() => {}); };
  }, [active]);
}

function cueChange(from, to) {
  const next = WARMUP_DRILLS[to];
  if (!next) {                       // finished
    beep(784, 0.15, 0.45); setTimeout(() => beep(988, 0.15, 0.45), 170); setTimeout(() => beep(1319, 0.35, 0.5), 340);
    vibrate([80, 60, 80, 60, 200]);
    speak('Warm-up complete. Go hoop.');
    return;
  }
  if (WARMUP_DRILLS[from]?.phase !== next.phase) {   // new phase: strong cue
    beep(660, 0.12, 0.45); setTimeout(() => beep(880, 0.12, 0.45), 150); setTimeout(() => beep(1175, 0.22, 0.5), 300);
    vibrate([120, 80, 120]);
    speak(`Phase ${next.phase + 1}. ${WARMUP_PHASES[next.phase].title}. ${next.name}.`);
  } else {                                           // next drill in the same phase
    beep(880, 0.12, 0.4);
    vibrate(90);
    speak(next.name);
  }
}

export function GameDayWarmup({ onClose, onComplete, onLogGame, pregame, onPregame }) {
  const [index, setIndex] = useState(0);              // current drill; WARMUP_DRILLS.length = finished
  const [done, setDone] = useState({});               // drill id -> true
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);          // seconds into the current drill, while paused
  const [startedAt, setStartedAt] = useState(null);   // timestamp the current drill's clock (re)started
  const [now, setNow] = useState(() => Date.now());
  const finished = index >= WARMUP_DRILLS.length;
  const drill = WARMUP_DRILLS[Math.min(index, WARMUP_DRILLS.length - 1)];
  const inDrill = running && startedAt != null ? elapsed + Math.max(0, now - startedAt) / 1000 : elapsed;
  const remaining = finished ? 0 : Math.max(0, drill.seconds - inDrill);
  const totalLeft = finished ? 0 : remaining + WARMUP_DRILLS.slice(index + 1).reduce((s, d) => s + d.seconds, 0);
  const doneCount = Object.values(done).filter(Boolean).length;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useWakeLock(!finished);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  useEffect(() => { if (finished && completeRef.current) completeRef.current(); }, [finished]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [running]);

  // Auto-advance. Time is measured from timestamps, so if the phone was locked
  // through several drills the routine catches up to where it should be.
  useEffect(() => {
    if (!running || startedAt == null || finished) return;
    let i = index, over = elapsed + (now - startedAt) / 1000;
    if (over < WARMUP_DRILLS[i].seconds) return;
    const completed = {};
    while (i < WARMUP_DRILLS.length && over >= WARMUP_DRILLS[i].seconds) {
      over -= WARMUP_DRILLS[i].seconds; completed[WARMUP_DRILLS[i].id] = true; i += 1;
    }
    setDone(p => ({ ...p, ...completed }));
    cueChange(index, i);
    setIndex(i); setElapsed(0);
    if (i >= WARMUP_DRILLS.length) { setRunning(false); setStartedAt(null); }
    else setStartedAt(Date.now() - over * 1000);
  }, [now, running, startedAt, elapsed, index, finished]);

  const goTo = (next, markCurrent) => {
    if (markCurrent && !finished) setDone(p => ({ ...p, [drill.id]: true }));
    const target = Math.max(0, Math.min(WARMUP_DRILLS.length, next));
    if (target !== index) cueChange(index, target);
    setIndex(target); setElapsed(0);
    if (target >= WARMUP_DRILLS.length) { setRunning(false); setStartedAt(null); }
    else if (running) { const t = Date.now(); setNow(t); setStartedAt(t); }
  };
  const start = () => { beep(880, 0.08, 0.35); vibrate(40); if (index === 0 && !elapsed) speak(`Phase 1. ${WARMUP_PHASES[0].title}. ${drill.name}.`); const t = Date.now(); setNow(t); setStartedAt(t); setRunning(true); setTouched(true); };
  const pause = () => { setElapsed(startedAt == null ? elapsed : elapsed + Math.max(0, Date.now() - startedAt) / 1000); setStartedAt(null); setRunning(false); };
  const restart = () => { setTouched(false); setIndex(0); setDone({}); setElapsed(0); setStartedAt(null); setRunning(false); };
  const toggle = (d, i) => {
    const on = !done[d.id];
    setDone(p => ({ ...p, [d.id]: on }));
    vibrate(20);
    // Checking off the drill you're on moves you to the next one you haven't done.
    if (on && i === index) {
      const next = WARMUP_DRILLS.findIndex((x, j) => j > i && !done[x.id]);
      goTo(next === -1 ? WARMUP_DRILLS.length : next, false);
    }
  };

  const [touched, setTouched] = useState(false);       // timer has been started at least once
  const timed = running || touched;
  return <div className="warmup" role="dialog" aria-modal="true" aria-labelledby="warmup-title">
    <header className="warmup-top">
      <button className="warmup-ghost" onClick={onClose}>Exit</button>
      <div className="warmup-total" aria-label={`${clock(totalLeft)} left in warm-up`}>{finished ? 'Done' : `${clock(totalLeft)} left`}</div>
      <button className="warmup-ghost" onClick={restart} disabled={!index && !doneCount && !timed}>Restart</button>
    </header>
    <div className="warmup-progress" aria-hidden="true">{WARMUP_DRILLS.map((d, i) => <span key={d.id} data-state={done[d.id] ? 'done' : i === index ? 'now' : ''}/>)}</div>

    {finished ? <section className="warmup-now" aria-live="polite">
      <div className="warmup-kicker">Game Day Warm-Up</div>
      <h1 id="warmup-title" className="warmup-drill">You’re warm.<br/>Go hoop. 🏀</h1>
      <p className="warmup-cue">{doneCount} of {WARMUP_DRILLS.length} drills done. After the game, Today will be ready to log your points, rebounds and how your engine felt.</p>
      <div className="warmup-controls"><button className="warmup-primary" onClick={onClose}>Close</button><button className="warmup-secondary" onClick={restart}>Run it again</button></div>
      {onLogGame && <div className="warmup-row"><button className="warmup-ghost" onClick={onLogGame}>Log the game now</button></div>}
    </section> : <section className="warmup-now" aria-live="polite">
      {onPregame && index === 0 && !touched && <div className="warmup-pregame">
        <div className="warmup-kicker">Before you start · optional</div>
        <PregameCheck variant="court" value={pregame || {}} onChange={onPregame}/>
      </div>}
      <div className="warmup-kicker">Phase {drill.phase + 1} of 4 · {drill.phaseTitle}</div>
      <h1 id="warmup-title" className="warmup-drill">{drill.name}</h1>
      <p className="warmup-cue">{drill.cue}</p>
      <div className="warmup-clock" role="timer" aria-label={timed ? `${clock(remaining)} remaining` : `${formatDuration(drill.seconds)} drill`}>{timed ? clock(remaining) : formatDuration(drill.seconds)}</div>
      {timed && <div className="warmup-bar" aria-hidden="true"><div style={{ width: `${Math.min(100, inDrill / drill.seconds * 100)}%` }}/></div>}
      <div className="warmup-controls">
        <button className="warmup-primary" onClick={running ? pause : start}>{running ? 'Pause' : timed ? 'Resume' : 'Start timer'}</button>
        <button className="warmup-secondary" onClick={() => goTo(index + 1, true)}>{running ? 'Skip ›' : 'Next ›'}</button>
      </div>
      <div className="warmup-row">
        <button className="warmup-ghost" onClick={() => goTo(index - 1, false)} disabled={index === 0}>‹ Back</button>
        <span>{running ? 'Moves on by itself — chime at each phase' : timed ? 'Paused' : 'Or go at your own pace and tap Next'}</span>
      </div>
    </section>}

    <section className="warmup-list" aria-label="Warm-up checklist">
      {WARMUP_PHASES.map((phase, p) => <div key={phase.id} className="warmup-phase">
        <h2><span>Phase {p + 1} · {phase.title}</span><small>{phase.range}</small></h2>
        {phase.drills.map(d => {
          const i = WARMUP_DRILLS.findIndex(x => x.id === d.id);
          return <button key={d.id} className="warmup-item" role="checkbox" aria-checked={!!done[d.id]} data-current={i === index ? 'true' : undefined} onClick={() => toggle(d, i)}>
            <span className="warmup-check" aria-hidden="true">{done[d.id] ? '✓' : ''}</span>
            <span className="warmup-item-text"><strong>{d.name}</strong><small>{d.cue}</small></span>
            <span className="warmup-item-time">{formatDuration(d.seconds)}</span>
          </button>;
        })}
      </div>)}
    </section>
  </div>;
}

export function WarmupCard({ gameNight, onStart }) {
  return <section className={`engine-card warmup-card${gameNight ? ' game-night' : ''}`} aria-label="Basketball game warm-up">
    <span className="engine-label">{gameNight ? 'Game night' : 'Before you play'}</span>
    <h2>Basketball Game Warm-Up</h2>
    <p className="engine-muted">10 minutes · 4 phases · engine, mobility, explosiveness, ball touches.</p>
    <button className="engine-button primary warmup-start" onClick={onStart}>Start warm-up</button>
  </section>;
}

export function LogGameCard({ onLog, onWarmup }) {
  return <section className={`engine-card warmup-card game-night`} aria-label="Log tonight's game">
    <span className="engine-label">Game night</span>
    <h2>How did it go tonight?</h2>
    <p className="engine-muted">Points, rebounds and how your engine felt — one screen, under a minute.</p>
    <button className="engine-button primary warmup-start" onClick={onLog}>Log tonight’s game</button>
    {onWarmup && <button className="engine-link" onClick={onWarmup}>Open the warm-up again</button>}
  </section>;
}
