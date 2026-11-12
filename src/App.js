import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { supabase } from './data/client';
import { fetchAll, mutateRecord, restorePayload } from './data/records';
import { UserDataProvider, useUserData } from './data/UserData';
import { accountKey, readJSON, writeJSON, DEFAULT_BODY } from './data/storage';
import { useWorkoutDraft } from './data/useWorkoutDraft';
import { C, LS_THEME, loadThemePref, applyThemePalette, FONT_DISPLAY, FONT_MONO, injectStyles, SESSIONS, normalizeAll, weightProjection, computeGameState, DEFAULT_SCHEDULE, requestNotificationPermission, VAPID_PUBLIC_KEY, urlBase64ToUint8Array, pushSupported, daysAgo, getLastPerformance, platesToReach, todayKey, engineModel } from './model';
import { Surface, Eyebrow, NavItem, Btn, PageTitle, toast, ToastHost, Confetti, Icon, Sheet, Switch } from './ui';
import { RestTimer, DynoCard } from './training';
import { NutritionTab } from './nutrition';
import { toLocalInput, ConditioningLogger, WalkLogger, LiftDateSheet } from './logging';
import { FastBreakLog, FAST_BREAK_NOTES } from './FastBreakLog';
import { AchievementsSheet, CelebrationOverlay } from './home';
import { AuthGate } from './auth';
import { EngineHome, EngineProgress, GoalSettings } from './engine-ui';
import { DEFAULT_PREFERENCES, engineAchievements, exerciseRecord, formatEngine, nutritionTotals, weekKey } from './engine';
import { TrainWorkspace } from './WorkoutFlow';
import { WeeklyGamePlanner } from './WeeklyGamePlanner';
import { ActivityLog } from './ActivityLog';
import { ThreePointLog, ShootingCard, newShotId, formatPct, shotPct } from './shooting';
import { FoodJournal, newFoodId } from './FoodJournal';
import { setFeedbackPreferences, vibrate } from './model';
import './engine.css';

// The detailed statistics screen is the heaviest module and sits behind a
// collapsed section, so it loads only when someone opens it.
const StatsTab = lazy(() => import('./statistics').then(m => ({ default: m.StatsTab })));

function Boot({ title, message, children }) {
  return <div className="engine-app engine-boot" data-theme={loadThemePref()} role={children ? 'alert' : 'status'}><div>
    <div className="engine-boot-mark" aria-hidden="true">🏀</div><h1>{title}</h1>{message && <p>{message}</p>}
    {children ? <div className="engine-actions">{children}</div> : <div className="engine-skeleton" aria-hidden="true"/>}
  </div></div>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let authEvent = false;
    applyThemePalette(loadThemePref()); injectStyles(true);
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      authEvent = true;
      if (active) { setSession(next); setReady(true); setError(''); }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authEvent) return;
      if (error) setError(error.message);
      else setSession(data.session);
      setReady(true);
    }).catch(e => { if (active) { setError(e.message); setReady(true); } });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  if (error) return <Boot title="Couldn’t open your account" message={error}><button className="engine-button primary" onClick={() => window.location.reload()}>Retry</button></Boot>;
  if (!ready) return <Boot title="Back to the Dunk" message="Loading Back to the Dunk…"/>;
  if (!session) return <AuthGate />;
  return <UserDataProvider key={session.user.id} userId={session.user.id}><AccountApp userId={session.user.id} userEmail={session.user.email} /></UserDataProvider>;
}

export function AccountApp({ userId, userEmail }) {
  const cloud = useUserData();
  const draft = useWorkoutDraft(userId, toLocalInput(new Date()));
  const { activeSession, checked, setChecked, vals, setVals, liftDate, setLiftDate } = draft;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const run = async (action) => {
    if (busyRef.current || !mounted.current) return false;
    busyRef.current = true; setBusy(true);
    try { await action(); return true; }
    catch (e) { if (mounted.current) { showSave(false); toast(e.message || 'Could not save. Please try again.'); } return false; }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };
  const write = async (table, operation, payload, id) => {
    const row = await mutateRecord(supabase, userId, table, operation, payload, id);
    if (!mounted.current) throw new Error('Account changed.');
    return row;
  };
  const [theme, setTheme] = useState(loadThemePref);
  // Synchronous so this render's inline styles read the current palette.
  applyThemePalette(theme);
  // CSS-level baked colors (body bg, .court-bg, .backdrop) + persistence.
  useEffect(() => {
    injectStyles(true);
    try { localStorage.setItem(LS_THEME, theme); } catch (e) {}
  }, [theme]);

  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(true);
  // Auth — the app is private; data is only loaded for the signed-in owner.





  const [history, setHistory] = useState([]);
  const [weightLog, setWeightLog] = useState([]);
  const [weightInput, setWeightInput] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [cardioSessions, setCardioSessions] = useState([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [fastBreakOpen, setFastBreakOpen] = useState(false);
  const [shotState, setShotState] = useState({ open: false }); // { open, editing? }
  // Conditioning logger sheet: { open, prefillType?, warn?, editing? }
  const [loggerState, setLoggerState] = useState({ open: false });
  const [restTimer, setRestTimer] = useState(null); // null or { seconds }
  const [confetti, setConfetti] = useState(false);
  // Gamification
  const [awardsOpen, setAwardsOpen] = useState(false);
  const [celebration, setCelebration] = useState(null); // null or [{kind,title,subtitle,emoji}]
  const [walkState, setWalkState] = useState({ open: false }); // { open, editing? }
  const [liftEdit, setLiftEdit] = useState(null); // workout row being date-edited

  const preferences = cloud.get('preferences', DEFAULT_PREFERENCES);
  const weeklyGoals = cloud.get('weeklyGoals', {});
  const courtRatings = cloud.get('court', {});
  const foodEntries = cloud.get('foodEntries', {});
  const foodFavorites = cloud.get('foodFavorites', {});
  const shooting = cloud.get('shooting', {});
  const setShot = (id, value) => cloud.set('shooting', prev => ({...prev,[id]:value}), {});
  const setPreferences = next => cloud.set('preferences', next, DEFAULT_PREFERENCES);
  const updatePreferences = patch => setPreferences(prev => ({...prev,...patch}));
  const setFoodEntry = (id, value) => cloud.set('foodEntries', prev => ({...prev,[id]:value}), {});
  const setFavorite = (id, value) => cloud.set('foodFavorites', prev => ({...prev,[id]:value}), {});
  const rateCourt = (id, rating) => {cloud.set('court', prev => ({...prev,[id]:rating}), {});toast('Court check-in recorded');};
  const saveShooting = (id, value) => {
    const key = id || newShotId();
    setShot(key, value); setShotState({ open: false });
    if (id) { toast('Shooting session updated'); return; }
    if (preferences.motion) setConfetti(true);
    const pct = shotPct(value.makes, value.attempts);
    setSessionResult({title:`${value.attempts} threes recorded`,detail:pct == null ? 'Reps banked. Add your makes next time to track your percentage.' : `${value.makes} of ${value.attempts} made · ${formatPct(pct)} from three.`});
    setTab('home'); window.scrollTo({top:0,behavior:'auto'});
    toast('Shooting logged', { actionLabel: 'UNDO', onAction: () => { setShot(key, null); setSessionResult(null); } });
  };
  const deleteShooting = id => {
    const previous = shooting[id];
    setShot(id, null); setShotState({ open: false });
    if (previous) toast('Entry deleted', { actionLabel: 'UNDO', onAction: () => setShot(id, previous) });
  };
  const saveGoals = patch => {
    updatePreferences(patch);
    cloud.set('weeklyGoals', prev => ({...prev,[weekKey(new Date())]:patch.weeklyGoal}), {});
  };
  const restEnabled = preferences.restTimer !== false;
  const setRestEnabled = value => updatePreferences({restTimer:value});
  const [sessionResult,setSessionResult] = useState(null);
  setFeedbackPreferences(preferences);
  const thisWeekKey = weekKey(new Date());
  useEffect(() => {
    if (cloud.ready && !weeklyGoals[thisWeekKey]) cloud.set('weeklyGoals', prev => ({...prev,[thisWeekKey]:preferences.weeklyGoal}), {});
  }, [cloud.ready, thisWeekKey]);
  const startTraining = (type, short = false) => {
    if (type === 'walk') {setWalkState({open:true});return;}
    if (type === 'long_interval') {setFastBreakOpen(true);return;}
    if (type === 'game' || type === 'cross_training' || type === 'tabata') {setLoggerState({open:true,prefillType:type});return;}
    draft.setFlow({active:true,mode:'lift',short,index:0});
    setTab('workout');window.scrollTo({top:0,behavior:'auto'});
  };
  const startTimer = type => {
    draft.setFlow({active:true,mode:type,minutes:type==='tabata'?4:10});
    setTab('workout');window.scrollTo({top:0,behavior:'auto'});
  };
  const hasLiftDraft = Object.values(checked).some(Boolean) || Object.values(vals).some(v => Number(v.setsDone)>0 || Object.values(v.completedSets || {}).some(Boolean));
  const hasDraft = !!draft.flow?.active || !!draft.flow?.timer?.elapsed || !!draft.flow?.timer?.startedAt || hasLiftDraft;
  const resumeTraining = () => {draft.setFlow({...draft.flow,active:true,mode:draft.flow?.mode || 'lift'});setTab('workout');draft.dismissResume();window.scrollTo({top:0,behavior:'auto'});};
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Body stats + protein log + calorie log (localStorage-backed)
  const bodyStats = cloud.get('body', DEFAULT_BODY);
  const setBodyStats = next => cloud.set('body', next, DEFAULT_BODY);
  const proteinLog = cloud.get('protein', {});
  const setProteinLog = next => cloud.set('protein', next, {});
  const calorieLog = cloud.get('calories', {});
  const setCalorieLog = next => cloud.set('calories', next, {});
  const nutrition = nutritionTotals(proteinLog,calorieLog,foodEntries);
  const vitaminD3Log = cloud.get('vitaminD3', {});
  const setVitaminD3Log = next => cloud.set('vitaminD3', next, {});
  const creatineLog = cloud.get('creatine', {});
  const setCreatineLog = next => cloud.set('creatine', next, {});

  // Reps editor state

  // Track when session is active for visibility-change banner
  const sessionActiveRef = useRef(false);
  useEffect(() => {
    sessionActiveRef.current = restTimer !== null || Object.keys(checked).some(k => checked[k]);
  }, [restTimer, checked]);

  // Visibility change handler — fire notif when user returns and timer is going
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && restTimer) {
        // App backgrounded during rest timer — make sure notification permission is fresh
        requestNotificationPermission();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [restTimer]);

  // Check notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotifEnabled(Notification.permission === "granted");
    }
  }, []);

  const showSave = (ok) => { setSaveMsg(ok ? "Saved" : "Failed"); setTimeout(() => setSaveMsg(""), 2400); };

  // Gamification state, derived purely from logged data.
  const all = useMemo(() => normalizeAll(cardioSessions, history), [cardioSessions, history]);
  const game = useMemo(() => engineAchievements(computeGameState(history, cardioSessions, weightLog), all, preferences, weeklyGoals), [history, cardioSessions, weightLog, all, preferences, weeklyGoals]);

  // Post-game legs check-ins, keyed by cardio session id.
  const legsLog = cloud.get('legs', {});
  const setLegsLog = next => cloud.set('legs', next, {});
  const setGameLegs = (sessionId, val) => {
    setLegsLog(prev => {
      const next = { ...prev };
      if (val) next[sessionId] = val; else delete next[sessionId];

      return next;
    });
  };

  // Daily D3 reminder — phone push subscription state.
  const [d3Push, setD3Push] = useState(false);
  useEffect(() => {
    if (!pushSupported()) return;
    navigator.serviceWorker.getRegistration()
      .then(reg => reg && reg.pushManager.getSubscription())
      .then(sub => setD3Push(!!sub))
      .catch(() => {});
  }, []);
  const toggleD3Push = async () => {
    try {
      if (!pushSupported()) {
        toast("Not supported in this browser — on iPhone, add the app to your Home Screen (Share → Add to Home Screen), open it from there, then flip this on.");
        return;
      }
      if (d3Push) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg && await reg.pushManager.getSubscription();
        if (sub) {
          const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          if (error) throw error;
          await sub.unsubscribe();
        }
        setD3Push(false);
        toast("Daily D3 reminder off");
      } else {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { toast("Notifications are blocked — allow them for this app in Settings, then try again."); return; }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
        const { error } = await supabase.from("push_subscriptions").insert({ subscription: sub.toJSON() });
        if (error && error.code !== "23505") throw error; // 23505 = this device already registered
        setD3Push(true);
        toast("💊 Daily D3 reminder on — every morning at 9");
      }
    } catch (e) {
      toast("Couldn't set up the reminder: " + (e.message || e));
    }
  };

  // Fixed weekly schedule (Shabbat / game night) → engine constraints.
  const schedule = cloud.get('schedule', DEFAULT_SCHEDULE);
  const setSchedule = next => cloud.set('schedule', next, DEFAULT_SCHEDULE);
  const updateSchedule = (next) => { setSchedule(next); };
  const weeklyGamePlan = cloud.get('weeklyGamePlan', {});
  const saveWeeklyGamePlan = next => cloud.set('weeklyGamePlan', next, {});
  const constraints = useMemo(() => ({
    restDows: schedule.shabbat ? [6] : [],
    gameDow: schedule.gameNight ? schedule.gameDow : null,
    skipGameWeekStart: schedule.skipGameWeek,
    classDows: schedule.crossClass ? (schedule.classDows || []) : [],
    gameWeekId: weeklyGamePlan.weekId,
    gameDates: weeklyGamePlan.gameDays,
    classWeekId: weeklyGamePlan.weekId,
    classDates: weeklyGamePlan.classDates,
    sprintWeekId: weeklyGamePlan.weekId,
    sprintDate: weeklyGamePlan.sprintDate,
    // Keep the weekly planner's readiness and availability choices in sync with
    // the daily recommendation engine, not just the visual weekly schedule.
    condition: weeklyGamePlan.weekId === weekKey(new Date()) ? weeklyGamePlan.condition : "normal",
    blockedDays: weeklyGamePlan.weekId === weekKey(new Date()) ? (weeklyGamePlan.blockedDays || []) : [],
  }), [schedule, weeklyGamePlan]);

  // Celebrate genuinely new levels / badges. First run for a given browser sets
  // a silent baseline (so a returning player isn't bombarded with old unlocks).
  useEffect(() => {
    if (loading) return;
    const seen = readJSON(accountKey(userId, 'game-seen'), null);
    const currentBadges = game.achievements.filter(a => a.unlocked).map(a => a.id);
    if (!seen) { writeJSON(accountKey(userId, 'game-seen'), { level: game.level, badges: currentBadges }); return; }
    const queue = [];
    game.achievements
      .filter(a => a.unlocked && !seen.badges.includes(a.id))
      .forEach(a => queue.push({ kind: "badge", title: a.name, subtitle: a.desc, emoji: a.emoji }));
    if (queue.length) {
      setCelebration(prev => prev || queue);
      setConfetti(true);
      writeJSON(accountKey(userId, 'game-seen'), { level: game.level, badges: currentBadges });
    }
  }, [game, loading]);

  const loadController = useRef(null);
  const loadData = useCallback(async () => {
    if (loadController.current) loadController.current.abort();
    const controller = new AbortController(); loadController.current = controller;
    setLoading(true); setLoadError('');
    try {
      const [workouts, weights, cardio] = await Promise.all([
        fetchAll(supabase, 'workouts', userId, 'logged_at', controller.signal),
        fetchAll(supabase, 'weight_log', userId, 'logged_at', controller.signal),
        fetchAll(supabase, 'cardio_sessions', userId, 'completed_at', controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setHistory(workouts); setWeightLog(weights); setCardioSessions(cardio);
    } catch(e) { if (!controller.signal.aborted) setLoadError(e.message || 'Could not load your history.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [userId]);
  useEffect(() => { loadData(); return () => { if (loadController.current) loadController.current.abort(); }; }, [loadData]);
  const signOut = async () => {
    await cloud.retry();
    const { error } = await supabase.auth.signOut();
    if (error) toast('Could not sign out. Please try again.');
  };

  // Pre-fill each exercise with last session's weight (editable). Only logs
  // exercises the user actually checks off, so seeding is safe. Never clobbers
  // a value the user already entered.
  useEffect(() => {
    const s = SESSIONS[activeSession];
    const key = s.id;
    setVals(prev => {
      let changed = false;
      const next = { ...prev };
      s.exercises.forEach(ex => {
        const k = key + "_" + ex.id;
        const cur = next[k] || {};
        const lp = getLastPerformance(history, ex.name);
        if (!lp) return;
        if (ex.barbell) {
          if (cur.plates === undefined && cur.perSide === undefined) {
            const pl = platesToReach(lp.weight);
            if (pl) {
              next[k] = { ...cur, plates: JSON.stringify([...pl].sort((a, b) => b - a)), perSide: String(pl.reduce((a, b) => a + b, 0)) };
              changed = true;
            }
          }
        } else if (!ex.noWeight && !ex.timed && !ex.bodyweight) {
          if (cur.weight === undefined) {
            next[k] = { ...cur, weight: String(lp.weight) };
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [activeSession, history]);

  const session = SESSIONS[activeSession];
  const sk = session.id;
  // Save body stats to localStorage when changed
  const updateBodyStats = (next) => {
    setBodyStats(next);

  };

  const updateProtein = (dateKey, grams) => {
    const next = { ...proteinLog, [dateKey]: grams };
    if (grams <= 0) delete next[dateKey];
    setProteinLog(next);

  };

  const updateCalories = (dateKey, cals) => {
    const next = { ...calorieLog, [dateKey]: cals };
    if (cals <= 0) delete next[dateKey];
    setCalorieLog(next);

  };

  const toggleVitaminD3 = (dateKey) => {
    const next = { ...vitaminD3Log };
    if (next[dateKey]) delete next[dateKey];
    else next[dateKey] = true;
    setVitaminD3Log(next);

  };

  const toggleCreatine = (dateKey) => {
    const next = { ...creatineLog };
    if (next[dateKey]) delete next[dateKey];
    else next[dateKey] = true;
    setCreatineLog(next);

  };

  const sortCardio = rows => [...rows].sort((a,b) => new Date(b.completed_at)-new Date(a.completed_at));
  const sortByLogged = rows => [...rows].sort((a,b) => new Date(b.logged_at)-new Date(a.logged_at));
  const logSession = () => run(async () => {
    const exVols = session.exercises.map(ex => {
      const value = vals[sk+"_"+ex.id] || {};
      return exerciseRecord(value.swap || ex, value, checked[sk+"_"+ex.id]);
    }).filter(Boolean);
    if (!exVols.length) throw new Error('Complete at least one set first.');
    if (!liftDate || !Number.isFinite(new Date(liftDate).getTime()) || new Date(liftDate)>new Date()) throw new Error('Choose a valid workout date.');
    if (exVols.some(ex => ex.set_details.some(set => !Number.isFinite(set.reps) || set.reps<=0 || set.reps>10000 || !Number.isFinite(set.weight) || set.weight<0 || set.weight>2000))) throw new Error('Check the reps and weights of your completed sets.');
    const payload = { session_name: session.code+": "+session.name, color: session.color, total_volume: exVols.reduce((a,e)=>a+e.volume,0), exercises: exVols };
    if (liftDate) payload.logged_at = new Date(liftDate).toISOString();
    const row = await write('workouts', 'insert', payload);
    setHistory(p => sortByLogged([row, ...p]));
    setChecked(p => Object.fromEntries(Object.entries(p).filter(([key]) => !key.startsWith(sk + '_'))));
    setVals(p => Object.fromEntries(Object.entries(p).filter(([key]) => !key.startsWith(sk + '_'))));
    setLiftDate(toLocalInput(new Date())); setRestTimer(null); setConfetti(true);
    draft.setFlow({active:false,mode:'lift'});draft.dismissResume();setTab('home');
    setSessionResult({title:'Workout recorded',detail:`${exVols.reduce((sum,e)=>sum+e.sets,0)} completed sets. Strength supports your game and counts toward your weekly goal.`});
    showSave(true); toast('Lift logged');
  });
  const logConditioning = payload => run(async () => {
    if (!Number.isFinite(payload.duration_min) || payload.duration_min<=0 || !Number.isInteger(payload.rpe) || payload.rpe<1 || payload.rpe>10) throw new Error('Enter a positive duration and effort from 1 to 10.');
    const before = engineModel(all).score;
    const row = await write('cardio_sessions', 'insert', { completed_at: new Date().toISOString(), ...payload });
    const after = engineModel(normalizeAll([row,...cardioSessions],history)).score;
    setCardioSessions(p => sortCardio([row, ...p])); setConfetti(true); showSave(true); toast('Session logged');
    draft.setFlow({active:false});draft.dismissResume();setTab('home');
    setSessionResult({title:'Session recorded',detail:`${payload.duration_min} min · effort ${payload.rpe}/10. Engine ${formatEngine(before)} → ${formatEngine(after)} (+${formatEngine(after-before)} points).`});
  });
  const logDyno = (miles, vo2) => logConditioning({ workout_type: 'long_interval', duration_min: 12, rpe: 10, notes: `Dyno day · Cooper 12-min test · ${miles} mi · est VO₂max ${vo2}` });
  const saveCardio = ({ id, type, completed_at, duration_min, rpe, notes, legs, points, rebounds, focus, class_name }) => run(async () => {
    if (!Number.isFinite(duration_min) || duration_min <= 0 || rpe < 1 || rpe > 10) throw new Error('Enter a positive duration and effort from 1 to 10.');
    const row = await write('cardio_sessions', id != null ? 'update' : 'insert', { workout_type: type, completed_at, duration_min, rpe, notes, points, rebounds, focus, class_name }, id);
    setCardioSessions(p => sortCardio(id != null ? p.map(r => r.id === id ? row : r) : [row, ...p]));
    setGameLegs(row.id, legs); showSave(true); setLoggerState({ open: false });
    if (id == null) {
      const before=engineModel(all).score;
      const after=engineModel(normalizeAll([row,...cardioSessions],history)).score;
      setSessionResult({title:type==='game'?'Game recorded':notes===FAST_BREAK_NOTES?'10 sprints recorded':'Session recorded',detail:`${duration_min} min · effort ${rpe}/10. Engine ${formatEngine(before)} → ${formatEngine(after)}.`});
      setTab('home');
    }
  });
  const deleteEntry = (table, id, rows, setRows, sort, after) => run(async () => {
    const row = rows.find(r => r.id === id);
    await write(table, 'delete', null, id);
    setRows(p => p.filter(r => r.id !== id));
    if (after) after();
    if (row) toast('Entry deleted', { actionLabel: 'UNDO', onAction: () => run(async () => {
      const restored = await write(table, 'insert', restorePayload(row, table));
      setRows(p => sort([...p, restored])); toast('Entry restored');
    }) });
  });
  const deleteCardio = id => deleteEntry('cardio_sessions', id, cardioSessions, setCardioSessions, sortCardio, () => setLoggerState({ open: false }));
  const deleteLog = id => deleteEntry('workouts', id, history, setHistory, sortByLogged, () => { setWalkState({ open: false }); setLiftEdit(null); });
  const deleteWeight = id => deleteEntry('weight_log', id, weightLog, setWeightLog, sortByLogged);
  const saveWalk = ({ editingId, when, duration, speed, incline, miles, notes }) => run(async () => {
    if (!Number.isFinite(Number(duration)) || Number(duration) <= 0) throw new Error('Enter a positive walking duration.');
    const label = [duration ? duration + ' min' : null, speed ? speed + ' mph' : null, incline ? incline + '% incline' : null, miles && miles > 0 ? miles + ' mi' : null, notes || null].filter(Boolean).join(' · ');
    const payload = { session_name: 'Treadmill Walk', color: C.plum, total_volume: 0,
      exercises: [{ name: label, sets: 1, reps: 'walk', weight: 0, volume: 0, duration: Number(duration) || 0, speed: Number(speed) || 0, incline: Number(incline) || 0, miles: Number(miles) || 0, notes: notes || '' }], logged_at: new Date(when).toISOString() };
    const row = await write('workouts', editingId != null ? 'update' : 'insert', payload, editingId);
    setHistory(p => sortByLogged(editingId != null ? p.map(r => r.id === editingId ? row : r) : [row, ...p]));
    showSave(true); setWalkState({ open: false });
  });
  const saveLiftDate = (id, whenISO) => run(async () => {
    const row = await write('workouts', 'update', { logged_at: whenISO }, id);
    setHistory(p => sortByLogged(p.map(r => r.id === id ? row : r))); showSave(true); setLiftEdit(null);
  });
  const logWeight = () => run(async () => {
    const weight = Number(weightInput);
    if (!Number.isFinite(weight) || weight < 100 || weight > 400) throw new Error('Enter a weight between 100 and 400 lb.');
    const row = await write('weight_log', 'insert', { weight });
    setWeightLog(p => sortByLogged([row, ...p])); setWeightInput(''); showSave(true);
    updateBodyStats({ ...bodyStats, weightLbs: weight });
  });

  const enableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifEnabled(result === "granted");
    if (result === "granted") {
      // Test notification
      try {
        const n = new Notification("💪 Notifications on", { body: "You'll get banners when timers finish.", silent: false });
        setTimeout(() => n.close(), 4000);
      } catch(e) {}
    }
  };


  // Did today's 4-minute tabata get logged?

  // Primary navigation — three groups, each fronting a set of sub-tabs.
  const GROUPS = [
    { id: "today", label: "Today", icon: "home", tabs: ["home"] },
    { id: "plan", label: "Plan", icon: "calendar", tabs: ["goals"] },
    { id: "train", label: "Train", icon: "ball", tabs: ["workout"] },
    { id: "fuel", label: "Fuel", icon: "fuel", tabs: ["nutrition"] },
    { id: "progress", label: "Progress", icon: "chart", tabs: ["stats", "history", "weight"] },
  ];
  const SUB_LABELS = {
    home: "Today", workout: "Train", history: "Log", goals: "Plan",
    stats: "Progress", weight: "Weight", nutrition: "Fuel",
  };
  const groupOf = (id) => (GROUPS.find(g => g.tabs.includes(id)) || GROUPS[0]);
  const activeGroup = groupOf(tab);
  const goGroup = (g) => {
    setTab(g.tabs[0]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loadError || (!cloud.ready && cloud.error)) return <Boot title="Couldn’t load your history" message={loadError || cloud.error}>
    <button className="engine-button primary" onClick={() => { loadData(); cloud.retry(); }}>Retry loading</button>
    <button className="engine-button" onClick={signOut}>Sign out</button>
  </Boot>;

  if (loading || !cloud.ready) return <Boot title="Back to the Dunk" message="Loading your training…"/>;

  return (
    <div className="court-bg engine-app" data-theme={theme} data-motion={preferences.motion ? "on" : "off"} style={{ minHeight: "100vh", paddingBottom: 80 }}>

      {(cloud.error || draft.error || cloud.legacyAvailable) && <div role="status" aria-live="polite" style={{ padding: '8px 20px', color: C.bone, background: C.panel, borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
        {(cloud.error || cloud.pendingCount > 0) && <span>Changes waiting to sync. </span>}
        {cloud.error && <><span>{cloud.error} </span><button className="engine-link" onClick={cloud.retry}>Retry sync</button></>}
        {draft.error && <p role="alert">{draft.error}</p>}

        {cloud.legacyAvailable && <p>Training and nutrition data was found in this browser. Import it only if it belongs to this account. <button className="engine-button" onClick={cloud.importLegacy}>Import my saved data</button></p>}
      </div>}
      {/* HEADER */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${C.ink}EE`, backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.line}`,
      }}>
        <div style={{ padding: "calc(10px + env(safe-area-inset-top)) 16px 10px", maxWidth: 480, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 11, background: `linear-gradient(135deg, ${C.rust}, ${C.amber})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🏀</div>
            <div>
              <div className="h-display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: C.bone, lineHeight: 1.1 }}>Back to the Dunk</div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.1em", marginTop: 2 }}>BUILT FOR THE COURT</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span role="status" className="engine-status" data-state={saveMsg==='Failed'||cloud.error?'error':busy||cloud.syncing||cloud.pendingCount?'busy':'ok'}>{saveMsg==='Failed'?'Not saved':busy?'Saving…':cloud.syncing?'Syncing…':cloud.pendingCount?'Pending':saveMsg||'Synced'}</span>
            <button className="engine-icon-button framed" aria-label="Settings" aria-current={tab==='settings'?'page':undefined} onClick={()=>{setTab('settings');window.scrollTo({top:0,behavior:'auto'});}}><Icon name="gear" size={20}/></button>
          </div>
        </div>

      </header>

      <main style={{ padding: "20px 16px 100px", maxWidth: 480, margin: "0 auto" }}>

        {/* ── SUB-RAIL — switch within a group ── */}
        {tab!=="settings" && activeGroup.tabs.length > 1 && !(tab==="workout" && draft.flow?.active) && (
          <div className="tab-rail" style={{ marginBottom: 18, padding: 4, background: C.raised, borderRadius: 14, border: `1px solid ${C.line}` }}>
            {activeGroup.tabs.map(id => {
              const on = tab === id;
              return (
                <button key={id} className="btn" onClick={() => { setTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); vibrate(5); }}
                  style={{
                    flex: 1, whiteSpace: "nowrap", padding: "9px 14px", border: "none", borderRadius: 10,
                    background: on ? C.panel : "transparent", color: on ? C.bone : C.dim,
                    fontFamily: FONT_DISPLAY, fontWeight: on ? 700 : 500, fontSize: 13, letterSpacing: "-0.01em",
                    cursor: "pointer", boxShadow: on ? `0 1px 3px ${C.bone}14` : "none", transition: "background 0.2s, color 0.2s",
                  }}>
                  {SUB_LABELS[id]}
                </button>
              );
            })}
          </div>
        )}

        {tab === "home" && <>
          {sessionResult && <section className="engine-card" role="status"><div className="engine-row"><strong>{sessionResult.title}</strong><button className="engine-link" onClick={()=>setSessionResult(null)}>Dismiss</button></div><p>{sessionResult.detail}</p></section>}
          <EngineHome cardioSessions={cardioSessions} constraints={constraints} preferences={preferences} weeklyGoals={weeklyGoals} courtRatings={courtRatings} onRate={rateCourt} hasDraft={hasDraft} onResume={resumeTraining} onStart={startTraining} onGoTab={setTab} onQuickAdd={()=>setQuickAddOpen(true)} onFastBreak={()=>setFastBreakOpen(true)} onThrees={()=>setShotState({open:true})} shooting={shooting} all={all} onOpenAwards={()=>setAwardsOpen(true)} onLogType={type=>setLoggerState({open:true,prefillType:type})}
            stack={{ d3: !!vitaminD3Log[todayKey()], creatine: !!creatineLog[todayKey()] }}
            onStack={(which) => {
              const day = todayKey();
              if (which === 'd3') { const was = !!vitaminD3Log[day]; toggleVitaminD3(day); toast(was ? 'Vitamin D3 unchecked' : '💊 Vitamin D3 logged — stack on'); }
              else { const was = !!creatineLog[day]; toggleCreatine(day); toast(was ? 'Creatine unchecked' : '💪 Creatine logged — stack on'); }
            }}/>
        </>}

        {(tab === "workout" || draft.flow?.active) && <div hidden={tab!=="workout"}>
          <TrainWorkspace draft={draft} history={history} onStart={startTraining} onStartTimer={startTimer} onRest={restEnabled?()=>setRestTimer({seconds:90,startedAt:Date.now()}):null} onSaveLift={logSession} onSaveConditioning={logConditioning} onFastBreak={()=>setFastBreakOpen(true)} onThrees={()=>setShotState({open:true})} onLog={type=>setLoggerState({open:true,prefillType:type})} onWalk={()=>setWalkState({open:true})} onDyno={<DynoCard onLog={logDyno}/>} busy={busy}/>
        </div>}

        {/* ── NUTRITION ── */}
        {tab === "nutrition" && (
          <FoodJournal entries={foodEntries} favorites={foodFavorites} onEntry={setFoodEntry} onFavorite={setFavorite} proteinLog={nutrition.protein} calorieLog={nutrition.calories} bodyStats={bodyStats}>
          <NutritionTab guideOnly onLogFood={food=>{const id=newFoodId();setFoodEntry(id,{name:food.name,protein:food.protein||food.totalProtein||0,calories:food.calories||0,portions:1,day:todayKey(),createdAt:new Date().toISOString()});toast('Food added',{actionLabel:'UNDO',onAction:()=>setFoodEntry(id,null)});}}
            bodyStats={bodyStats}
            onUpdateBody={updateBodyStats}
            proteinLog={proteinLog}
            onProteinChange={updateProtein}
            calorieLog={calorieLog}
            onCalorieChange={updateCalories}
            vitaminD3Log={vitaminD3Log}
            onVitaminD3Toggle={toggleVitaminD3}
            creatineLog={creatineLog}
            onCreatineToggle={toggleCreatine}
          />
          </FoodJournal>
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && <ActivityLog cardioSessions={cardioSessions} history={history} shooting={shooting} busy={busy}
          onAdd={() => setQuickAddOpen(true)}
          onEdit={f => f.kind === 'cardio' ? setLoggerState({ open: true, editing: f.raw }) : f.kind === 'shooting' ? setShotState({ open: true, editing: f.raw }) : f.kind === 'walk' ? setWalkState({ open: true, editing: f.raw }) : setLiftEdit(f.raw)}
          onDelete={f => f.kind === 'cardio' ? deleteCardio(f.id) : f.kind === 'shooting' ? deleteShooting(f.id) : deleteLog(f.id)}/>}

        {/* ── STATS ── */}
        {tab === "stats" && <EngineProgress all={all} cardioSessions={cardioSessions} preferences={preferences} courtRatings={courtRatings} onRate={rateCourt} onSettings={()=>setTab("settings")} shooting={<ShootingCard log={shooting} onLog={()=>setShotState({open:true})}/>}><Suspense fallback={<p className="engine-muted" role="status">Loading details…</p>}><StatsTab history={history} weightLog={weightLog} cardioSessions={cardioSessions} legsLog={legsLog} /></Suspense></EngineProgress>}

        {/* ── WEIGHT ── */}
        {tab === "weight" && (() => {
          const sorted = [...weightLog].sort((a,b) => new Date(a.logged_at)-new Date(b.logged_at));
          const cur = weightLog[0]?.weight || 225;
          const lost = 225-cur, remaining = cur-200;
          const pct = Math.min(100, Math.max(0, (lost/25)*100));
          const last8 = sorted.slice(-8);
          return (
            <>
              <div className="ease-up"><PageTitle kicker="225 → 200 · Weekly check-in">Weight</PageTitle></div>

              <div className="ease-up-1">
                <Surface accent={C.rust} padding={24}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                    <div>
                      <Eyebrow>Current</Eyebrow>
                      <div className="num-tab h-display" style={{ fontSize: 56, fontWeight: 700, color: C.bone, letterSpacing: "-0.05em", lineHeight: 0.9, marginTop: 6 }}>
                        {cur}<span style={{ fontSize: 18, color: C.dim, fontWeight: 500, marginLeft: 4, letterSpacing: 0 }}>lbs</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Eyebrow color={C.moss}>Lost</Eyebrow>
                      <div className="num-tab h-display" style={{ fontSize: 32, fontWeight: 700, color: C.moss, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 6 }}>
                        {lost > 0 ? "−"+lost.toFixed(1) : "0"}
                      </div>
                    </div>
                  </div>
                  <div style={{ background: C.raised, borderRadius: 999, height: 8, overflow: "hidden", border: `1px solid ${C.line}` }}>
                    <div style={{
                      width: pct+"%", height: "100%",
                      background: `linear-gradient(90deg, ${C.rust}, ${C.amber} 50%, ${C.moss})`,
                      borderRadius: 999, transition: "width 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: C.dim, fontFamily: FONT_MONO }}>
                    <span>225</span><span style={{ color: C.amber }}>{remaining > 0 ? remaining.toFixed(1) : "0"} TO GO</span><span style={{ color: C.moss }}>200</span>
                  </div>
                  {(() => {
                    const proj = weightProjection(weightLog, 200);
                    if (!proj) return null;
                    const rate = `${proj.weekly < 0 ? "▼" : "▲"} ${Math.abs(proj.weekly).toFixed(1)} lb/week`;
                    return (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                        {proj.done ? (
                          <p className="h-serif" style={{ fontSize: 15, color: C.moss, margin: 0 }}>You're at goal. 200 is here. 🎉</p>
                        ) : proj.stalled ? (
                          <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>{rate} · trend is flat right now — the projection kicks back in once the scale starts moving.</div>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                            <span style={{ fontSize: 12, color: C.moss, fontFamily: FONT_MONO, fontWeight: 600 }}>{rate}</span>
                            <span className="h-serif" style={{ fontSize: 15, color: C.cream }}>On pace for <b style={{ color: C.moss }}>200</b> by <b style={{ color: C.moss }}>{proj.eta.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</b></span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Surface>
              </div>

              <div className="ease-up-2">
                <Surface>
                  <Eyebrow>Log Weight</Eyebrow>
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <input type="number" inputMode="decimal" min="100" max="400" step="0.1" placeholder="223.5" value={weightInput} onChange={e => setWeightInput(e.target.value)} onKeyDown={e => e.key==="Enter" && logWeight()}
                      style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "13px 16px", fontSize: 18, flex: 1, outline: "none", fontWeight: 600, fontFamily: FONT_DISPLAY }} />
                    <Btn color={C.rust} onClick={logWeight}>Log</Btn>
                  </div>
                </Surface>
              </div>

              {last8.length >= 2 && (
                <div className="ease-up-3">
                  <Surface>
                    <Eyebrow>Trend · last {last8.length}</Eyebrow>
                    <svg width="100%" height="100" viewBox="0 0 300 100" style={{ overflow: "visible", marginTop: 12 }}>
                      {(() => {
                        const ws = last8.map(e => e.weight);
                        const mn = Math.min(...ws)-1, mx = Math.max(...ws)+1;
                        const pts = ws.map((w,i) => ({ x: (i/(ws.length-1))*280+10, y: 80-((w-mn)/(mx-mn))*70 }));
                        const path = pts.map((p,i) => i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`).join(" ");
                        const area = path + ` L${pts[pts.length-1].x},90 L${pts[0].x},90 Z`;
                        return <>
                          <defs>
                            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={C.rust} stopOpacity="0.3"/>
                              <stop offset="100%" stopColor={C.rust} stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <path d={area} fill="url(#grad)" />
                          <path d={path} fill="none" stroke={C.rust} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                          {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={C.rust} stroke={C.panel} strokeWidth="2" />)}
                        </>;
                      })()}
                    </svg>
                  </Surface>
                </div>
              )}

              {weightLog.map((e,i) => {
                const prev = weightLog[i+1];
                const delta = prev ? e.weight-prev.weight : null;
                return (
                  <Surface key={e.id} padding={14}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div className="num-tab h-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{e.weight} <span style={{ fontSize: 12, color: C.dim, fontWeight: 500 }}>lbs</span></div>
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 4, fontFamily: FONT_MONO }}>
                          {new Date(e.logged_at).toLocaleDateString("en-CA",{weekday:"short",month:"short",day:"numeric"})} · {daysAgo(e.logged_at)}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {delta !== null && (
                          <div className="num-tab" style={{ fontSize: 14, fontWeight: 700, color: delta < 0 ? C.moss : delta > 0 ? C.red : C.dim, fontFamily: FONT_MONO }}>
                            {delta < 0 ? "▼" : delta > 0 ? "▲" : "—"} {Math.abs(delta).toFixed(1)}
                          </div>
                        )}
                        <button aria-label="Delete weight entry" disabled={busy} onClick={() => deleteWeight(e.id)} className="btn" style={{ background: "transparent", border: "none", color: C.mute, cursor: "pointer", fontSize: 14, padding: 6 }}>✕</button>
                      </div>
                    </div>
                  </Surface>
                );
              })}
            </>
          );
        })()}

        {/* ── PLAN ── */}
        {tab === "goals" && (
          <>
            <div className="ease-up"><PageTitle kicker="Games first · recovery built in">Your week</PageTitle></div>

            <WeeklyGamePlanner value={weeklyGamePlan} onChange={saveWeeklyGamePlan} all={all} />

          </>
        )}

        {tab === "settings" && <>
          <PageTitle kicker="The Work">Settings</PageTitle>
          <GoalSettings preferences={preferences} onSave={saveGoals}/>
          <section className="engine-card"><h2>Make it yours</h2>
            <label className="engine-field">Coaching tone<select aria-label="Coaching tone" value={preferences.coachingTone} onChange={e=>updatePreferences({coachingTone:e.target.value})}><option value="calm">Calm</option><option value="encouraging">Encouraging</option><option value="intense">Intense</option></select></label>
            <label className="engine-field">Appearance<select aria-label="Appearance" value={theme} onChange={e=>setTheme(e.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select></label>
            {[['sound','Sounds & voice','Timer beeps and spoken cues'],['vibration','Vibration','Haptic taps on supported phones'],['motion','Animations & celebrations','Confetti and screen transitions']].map(([key,name,hint])=><div key={key} className="engine-setting"><div><strong>{name}</strong><small>{hint}</small></div><Switch label={key} checked={!!preferences[key]} onChange={value=>updatePreferences({[key]:value})}/></div>)}
            <div className="engine-setting"><div><strong>Rest timer</strong><small>Starts automatically after each set</small></div><Switch label="Rest timer" checked={restEnabled} onChange={setRestEnabled}/></div>
          </section>
          <section className="engine-card"><h2>Reminders</h2>
            <div className="engine-setting"><div><strong>Banner notifications</strong><small>Alerts when timers finish in the background</small></div>{notifEnabled ? <span className="engine-status">On</span> : <button className="engine-button" onClick={enableNotifications}>Enable</button>}</div>
            <div className="engine-setting"><div><strong>Daily D3 reminder</strong><small>A push notification at the time below</small></div><Switch label="Daily D3 reminder" checked={d3Push} onChange={toggleD3Push}/></div>
            <ReminderTimes />
          </section>
          <section className="engine-card"><h2>Account</h2>
            <div className="engine-setting"><div style={{minWidth:0}}><strong>Signed in</strong><small style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userEmail || 'Signed in'}</small></div><button className="engine-button" onClick={signOut}>Sign out</button></div>
          </section>

        </>}

      </main>

      {/* ── Floating overlays ── */}
      <Confetti show={confetti && preferences.motion} onDone={() => setConfetti(false)} />
      {restTimer && (
        <RestTimer key={restTimer.startedAt}
          seconds={restTimer.seconds}
          onClose={() => setRestTimer(null)}
          onSkip={() => setRestTimer(null)}
        />
      )}
      {/* ── Bottom Navigation ── */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90,
        background: `${C.ink}F2`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid ${C.line}`,
        padding: "8px 4px calc(8px + env(safe-area-inset-bottom)) 4px",
        display: "flex", justifyContent: "space-around",
      }}>
        {GROUPS.map(g => <NavItem key={g.id} g={g} active={tab!=='settings' && activeGroup.id===g.id} onGo={goGroup}/>)}
      </nav>

      {/* ── QUICK ADD bottom sheet ── */}
      {quickAddOpen && <Sheet label="Quick add" title="Log your work" titleId="quick-add-title" onClose={()=>setQuickAddOpen(false)}>
        {[['On the court',[['game','Basketball','Game or pickup','ball',()=>setLoggerState({open:true,prefillType:'game'})],['threes','100 threes','Shots and makes','target',()=>setShotState({open:true})]]],
          ['Conditioning',[['sprints','10 sprints','Fast breaks','bolt',()=>setFastBreakOpen(true)],['cross_training','Class','Sweat440','drop',()=>setLoggerState({open:true,prefillType:'cross_training'})],['tabata','Tabata','4-minute intervals','flame',()=>setLoggerState({open:true,prefillType:'tabata'})],['long_interval','Conditioning','Longer intervals','chart',()=>setLoggerState({open:true,prefillType:'long_interval'})],['walk','Walk','Easy recovery','walk',()=>setWalkState({open:true})]]],
          ['Body',[['food','Food','Meals and protein','fuel',()=>setTab('nutrition')],['weight','Weight','Weekly check-in','scale',()=>setTab('weight')]]]].map(([heading,items])=><React.Fragment key={heading}>
          <div className="engine-label engine-section-label">{heading}</div>
          <div className="engine-tiles">{items.map(([key,name,hint,icon,go])=><button key={key} className="engine-tile" aria-label={name} onClick={()=>{setQuickAddOpen(false);go();}}><span className="engine-tile-icon"><Icon name={icon} size={20}/></span><span><strong>{name}</strong><small>{hint}</small></span></button>)}</div>
        </React.Fragment>)}
      </Sheet>}

      {fastBreakOpen && <FastBreakLog onSave={saveCardio} onClose={()=>setFastBreakOpen(false)} busy={busy}/>}
      {shotState.open && <ThreePointLog editing={shotState.editing} onSave={saveShooting} onDelete={deleteShooting} onClose={()=>setShotState({open:false})}/>}

      {/* ── CONDITIONING LOGGER sheet ── */}
      {loggerState.open && (
        <ConditioningLogger
          state={{ ...loggerState, legs: loggerState.editing ? legsLog[loggerState.editing.id] || null : null }}
          onClose={() => setLoggerState({ open: false })}
          onSave={saveCardio}
          onDelete={deleteCardio}
        />
      )}

      {/* ── WALK LOGGER sheet ── */}
      {walkState.open && <WalkLogger state={walkState} onClose={() => setWalkState({ open: false })} onSave={saveWalk} onDelete={deleteLog} />}
      {liftEdit && <LiftDateSheet row={liftEdit} onClose={() => setLiftEdit(null)} onSave={saveLiftDate} onDelete={deleteLog} />}

      {/* ── GAMIFICATION overlays ── */}
      {awardsOpen && <AchievementsSheet game={game} onClose={() => setAwardsOpen(false)} />}
      {celebration && preferences.motion && <CelebrationOverlay queue={celebration} onClose={() => setCelebration(null)} />}

      <ToastHost />
    </div>
  );
}

/* ── Reminder schedule — pick when each daily push arrives (Eastern time).
   Stored in reminder_settings; the server checks it every 15 minutes and
   sends each reminder once per day after its time passes. ── */
function ReminderTimes() {
  const [times, setTimes] = useState({ d3: "07:00", engine: "18:00" });
  const [engineOn, setEngineOn] = useState(true);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    let q = null;
    try { q = supabase.from("reminder_settings").select("id, send_time, enabled"); } catch (e) {}
    if (!q || typeof q.then !== "function") { setLoaded(true); return; }
    q.then(({ data }) => {
      if (!active) return;
      if (data && data.length) {
        setTimes(t => { const n = { ...t }; data.forEach(r => { if (r.send_time) n[r.id] = r.send_time.slice(0, 5); }); return n; });
        const eng = data.find(r => r.id === "engine");
        if (eng) setEngineOn(eng.enabled !== false);
      }
      setLoaded(true);
    }).catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  const persist = (row, okMsg) => {
    let q = null;
    try { q = supabase.from("reminder_settings").upsert(row); } catch (e) {}
    if (!q || typeof q.then !== "function") return;
    q.then(({ error }) => {
      if (!error) toast(okMsg); else toast("Couldn't save — try again");
    }).catch(() => toast("Couldn't save — try again"));
  };
  const saveTime = (id, val) => {
    if (!val) return;
    setTimes(p => ({ ...p, [id]: val }));
    persist({ id, send_time: val }, "⏰ Reminder time saved");
  };
  const toggleEngine = () => {
    const next = !engineOn;
    setEngineOn(next);
    persist({ id: "engine", enabled: next }, next ? "⛽ Engine nudge on" : "Engine nudge off");
  };
  const timeInput = (id) => (
    <input type="time" value={times[id]} disabled={!loaded} onChange={e => saveTime(id, e.target.value)}
      aria-label={id === "d3" ? "D3 reminder time" : "Engine nudge time"}
      style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 10, color: C.bone, minHeight: 44, padding: "8px 10px", fontSize: 16, fontWeight: 600, flexShrink: 0 }} />
  );
  return <>
    <div className="engine-setting"><div><strong>D3 reminder time</strong><small>Every day at this time</small></div>{timeInput("d3")}</div>
    <div className="engine-setting"><div><strong>Engine nudge</strong><small>Only on days with nothing logged yet</small></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>{timeInput("engine")}<Switch label="Engine nudge" checked={engineOn} onChange={toggleEngine}/></div>
    </div>
  </>;
}
