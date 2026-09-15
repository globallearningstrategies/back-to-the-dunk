import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './data/client';
import { fetchAll, mutateRecord, restorePayload } from './data/records';
import { UserDataProvider, useUserData } from './data/UserData';
import { accountKey, readJSON, writeJSON, DEFAULT_BODY } from './data/storage';
import { useWorkoutDraft } from './data/useWorkoutDraft';
import { C, LS_THEME, loadThemePref, applyThemePalette, FONT_DISPLAY, FONT_MONO, injectStyles, SESSIONS, RECOVERY, s440FocusFor, startOfWeek, normalizeAll, weightProjection, computeGameState, DEFAULT_SCHEDULE, DOW_NAMES, PHASES, calcProteinTarget, requestNotificationPermission, VAPID_PUBLIC_KEY, urlBase64ToUint8Array, pushSupported, daysAgo, calcVolume, fmtNum, calcStreak, getLastPerformance, platesToReach, greeting, todayKey, engineModel, engineBumpPreview } from './model';
import { Surface, Eyebrow, Pill, NavItem, Btn, PageTitle, toast, ToastHost, Confetti } from './ui';
import { RepsEditor, RestTimer, ExRow, TabataTimer, FastBreakTimer, DynoCard } from './training';
import { StatCard, StatsTab } from './statistics';
import { NutritionTab } from './nutrition';
import { toLocalInput, ConditioningLogger, WalkLogger, LiftDateSheet } from './logging';
import { AchievementsSheet, CelebrationOverlay, HomeTab } from './home';
import { AuthGate } from './auth';

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
  if (error) return <div role="alert">{error} <button onClick={() => window.location.reload()}>Retry</button></div>;
  if (!ready) return <div role="status">Loading The Work…</div>;
  if (!session) return <AuthGate />;
  return <UserDataProvider key={session.user.id} userId={session.user.id}><AccountApp userId={session.user.id} userEmail={session.user.email} /></UserDataProvider>;
}

export function AccountApp({ userId, userEmail }) {
  const cloud = useUserData();
  const draft = useWorkoutDraft(userId, toLocalInput(new Date()));
  const { activeSession, setActiveSession, checked, setChecked, vals, setVals, liftDate, setLiftDate } = draft;
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
  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(true);
  // Auth — the app is private; data is only loaded for the signed-in owner.





  const [history, setHistory] = useState([]);
  const [expandedLog, setExpandedLog] = useState({});
  const [weightLog, setWeightLog] = useState([]);
  const [weightInput, setWeightInput] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [cardioSessions, setCardioSessions] = useState([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // Conditioning logger sheet: { open, prefillType?, warn?, editing? }
  const [loggerState, setLoggerState] = useState({ open: false });
  const [restTimer, setRestTimer] = useState(null); // null or { seconds }
  const [confetti, setConfetti] = useState(false);
  // Gamification
  const [awardsOpen, setAwardsOpen] = useState(false);
  const [celebration, setCelebration] = useState(null); // null or [{kind,title,subtitle,emoji}]
  const [walkState, setWalkState] = useState({ open: false }); // { open, editing? }
  const [liftEdit, setLiftEdit] = useState(null); // workout row being date-edited

  const [restEnabled, setRestEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Body stats + protein log + calorie log (localStorage-backed)
  const bodyStats = cloud.get('body', DEFAULT_BODY);
  const setBodyStats = next => cloud.set('body', next, DEFAULT_BODY);
  const proteinLog = cloud.get('protein', {});
  const setProteinLog = next => cloud.set('protein', next, {});
  const calorieLog = cloud.get('calories', {});
  const setCalorieLog = next => cloud.set('calories', next, {});
  const vitaminD3Log = cloud.get('vitaminD3', {});
  const setVitaminD3Log = next => cloud.set('vitaminD3', next, {});
  const creatineLog = cloud.get('creatine', {});
  const setCreatineLog = next => cloud.set('creatine', next, {});

  // Reps editor state
  const [repsEditor, setRepsEditor] = useState(null); // { exId, sk, setIndex, currentReps, defaultReps, exerciseName }

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
  const game = useMemo(() => computeGameState(history, cardioSessions, weightLog), [history, cardioSessions, weightLog]);

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
  const constraints = useMemo(() => ({
    restDows: schedule.shabbat ? [6] : [],
    gameDow: schedule.gameNight ? schedule.gameDow : null,
    skipGameWeekStart: schedule.skipGameWeek,
    classDows: schedule.crossClass ? (schedule.classDows || []) : [],
  }), [schedule]);

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
  const anyChecked = session.exercises.some(ex => checked[sk+"_"+ex.id]);
  const volume = calcVolume(
    session.exercises,
    Object.fromEntries(session.exercises.map(ex => [ex.id, checked[sk+"_"+ex.id]])),
    Object.fromEntries(session.exercises.map(ex => [ex.id, vals[sk+"_"+ex.id] || {}]))
  );

  const toggleCheck = id => setChecked(p => ({...p, [id]: !p[id]}));
  const setVal = (id, f, v) => setVals(p => ({...p, [id]: {...(p[id]||{}), [f]: v}}));

  // Reps editor handlers
  const openRepsEditor = (exId, ex, setIndex, currentReps) => {
    setRepsEditor({
      exId, sk, setIndex, currentReps,
      defaultReps: ex.reps,
      exerciseName: ex.name,
    });
  };

  const saveCustomReps = (newReps) => {
    if (!repsEditor) return;
    const fullId = repsEditor.sk + "_" + repsEditor.exId;
    const currentVals = vals[fullId] || {};
    const customReps = { ...(currentVals.customReps || {}) };
    customReps[repsEditor.setIndex] = newReps;
    setVals(p => ({...p, [fullId]: {...currentVals, customReps}}));
  };

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
    if (!anyChecked) throw new Error('Check at least one exercise first.');
    const exVols = session.exercises.filter(ex => checked[sk+"_"+ex.id]).map(ex => {
      const exVals = vals[sk+"_"+ex.id] || {};
      const w = ex.barbell ? 45+(parseFloat(exVals.perSide)||0)*2 : parseFloat(exVals.weight)||0;
      const s = parseInt(exVals.setsDone || ex.sets);
      const customReps = exVals.customReps || {};

      // Compute total reps & per-set breakdown
      let totalReps = 0;
      const repsBreakdown = [];
      for (let i = 0; i < s; i++) {
        const r = customReps[i] !== undefined ? parseFloat(customReps[i]) : (parseFloat(ex.reps) || 0);
        totalReps += r;
        repsBreakdown.push(r);
      }
      const repsDisplay = repsBreakdown.length > 0 && repsBreakdown.some(r => r !== parseFloat(ex.reps))
        ? repsBreakdown.join(",")
        : ex.reps;

      return {
        name: ex.name, sets: s, reps: repsDisplay, weight: w,
        volume: (ex.noWeight||ex.timed||ex.bodyweight) ? 0 : w*totalReps,
      };
    });
    const payload = { session_name: session.code+": "+session.name, color: session.color, total_volume: exVols.reduce((a,e)=>a+e.volume,0), exercises: exVols };
    if (liftDate) payload.logged_at = new Date(liftDate).toISOString();
    const row = await write('workouts', 'insert', payload);
    setHistory(p => sortByLogged([row, ...p]));
    setChecked(p => Object.fromEntries(Object.entries(p).filter(([key]) => !key.startsWith(sk + '_'))));
    setVals(p => Object.fromEntries(Object.entries(p).filter(([key]) => !key.startsWith(sk + '_'))));
    setLiftDate(toLocalInput(new Date())); setRestTimer(null); setConfetti(true);
    showSave(true); toast('Lift logged');
  });
  const logConditioning = payload => run(async () => {
    const row = await write('cardio_sessions', 'insert', { completed_at: new Date().toISOString(), ...payload });
    setCardioSessions(p => sortCardio([row, ...p])); setConfetti(true); showSave(true); toast('Session logged');
  });
  const logTabata = () => logConditioning({ workout_type: 'tabata', duration_min: RECOVERY.TYPES.tabata.defaultDurationMin, rpe: RECOVERY.TYPES.tabata.defaultRPE });
  const logFastBreak = minutes => logConditioning({ workout_type: 'long_interval', duration_min: minutes, rpe: 9, notes: `Fast break drill · 15s sprint / 45s float × ${minutes}` });
  const logDyno = (miles, vo2) => logConditioning({ workout_type: 'long_interval', duration_min: 12, rpe: 10, notes: `Dyno day · Cooper 12-min test · ${miles} mi · est VO₂max ${vo2}` });
  const saveCardio = ({ id, type, completed_at, duration_min, rpe, notes, legs, points, rebounds, focus, class_name }) => run(async () => {
    if (!Number.isFinite(duration_min) || duration_min <= 0 || rpe < 1 || rpe > 10) throw new Error('Enter a positive duration and effort from 1 to 10.');
    const row = await write('cardio_sessions', id != null ? 'update' : 'insert', { workout_type: type, completed_at, duration_min, rpe, notes, points, rebounds, focus, class_name }, id);
    setCardioSessions(p => sortCardio(id != null ? p.map(r => r.id === id ? row : r) : [row, ...p]));
    setGameLegs(row.id, legs); showSave(true); setLoggerState({ open: false });
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

  const thisWeek = history.filter(h => (Date.now()-new Date(h.logged_at)) < 7*86400000).length;
  const totalLbs = history.reduce((a,h) => a+(h.total_volume||0), 0);
  const lastGym = history.find(h => h.session_name && h.session_name !== "Treadmill Walk");
  const restDay = lastGym && Math.floor((Date.now()-new Date(lastGym.logged_at))/86400000) < 1;

  // Did today's 4-minute tabata get logged?
  const tabataToday = cardioSessions.some(s => s.workout_type === "tabata" && new Date(s.completed_at).toDateString() === new Date().toDateString());

  // Primary navigation — three groups, each fronting a set of sub-tabs.
  const GROUPS = [
    { id: "today",    label: "Today",    icon: "🔥", tabs: ["home"] },
    { id: "train",    label: "Train",    icon: "🏋️", tabs: ["workout", "history", "goals"] },
    { id: "progress", label: "Progress", icon: "📊", tabs: ["stats", "weight", "nutrition"] },
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

  if (loadError || (!cloud.ready && cloud.error)) return <div role="alert" style={{ padding: 24 }}>
    <p>{loadError || cloud.error}</p><button onClick={() => { loadData(); cloud.retry(); }}>Retry loading</button>
    <button onClick={signOut}>Sign out</button>
  </div>;

  if (loading || !cloud.ready) return (
    <div className="court-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="ease-up" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>💪</div>
        <div className="h-display" style={{ color: C.rust, fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>The Work</div>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 6, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>LOADING…</div>
      </div>
    </div>
  );

  return (
    <div className="court-bg" style={{ minHeight: "100vh", paddingBottom: 80 }}>

      <div role="status" aria-live="polite" style={{ padding: '8px 20px', color: C.bone, background: C.panel }}>
        {busy ? 'Saving…' : cloud.syncing ? 'Syncing…' : cloud.error || cloud.pendingCount ? 'Changes waiting to sync.' : 'Synced'}
        {cloud.error && <><span> {cloud.error} </span><button onClick={cloud.retry}>Retry sync</button></>}
        {draft.error && <p role="alert">{draft.error}</p>}
        {draft.resumed && <p>Your unfinished workout is ready. <button onClick={() => { setTab('workout'); draft.dismissResume(); }}>Resume workout</button></p>}
        {cloud.legacyAvailable && <p>Training and nutrition data was found in this browser. Import it only if it belongs to this account. <button onClick={cloud.importLegacy}>Import my saved data</button></p>}
      </div>
      {/* HEADER */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${C.ink}EE`, backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.line}`,
      }}>
        <div style={{ padding: "16px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${C.rust}, ${C.amber})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💪</div>
            <div>
              <div className="h-display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: C.bone, lineHeight: 1.1 }}>The Work</div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.1em", marginTop: 2 }}>SHOW UP · DO THE WORK</div>
            </div>
          </div>
          {saveMsg && (
            <div className="ease-in" style={{
              fontSize: 11, fontFamily: FONT_MONO, letterSpacing: "0.1em",
              color: saveMsg === "Saved" ? C.moss : C.red,
              border: `1px solid ${saveMsg === "Saved" ? C.moss : C.red}40`,
              background: `${saveMsg === "Saved" ? C.moss : C.red}10`,
              padding: "4px 10px", borderRadius: 999,
            }}>
              ● {saveMsg.toUpperCase()}
            </div>
          )}
        </div>

      </header>

      <main style={{ padding: "20px 16px 100px", maxWidth: 480, margin: "0 auto" }}>

        {/* ── SUB-RAIL — switch within a group ── */}
        {activeGroup.tabs.length > 1 && (
          <div className="tab-rail" style={{ marginBottom: 18, padding: 4, background: C.raised, borderRadius: 14, border: `1px solid ${C.line}` }}>
            {activeGroup.tabs.map(id => {
              const on = tab === id;
              return (
                <button key={id} className="btn" onClick={() => { setTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); if (navigator.vibrate) navigator.vibrate(5); }}
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

        {/* ── HOME (consistency-first) ── */}
        {tab === "home" && (
          <HomeTab
            bodyStats={bodyStats}
            history={history}
            cardioSessions={cardioSessions}
            weightLog={weightLog}
            game={game}
            constraints={constraints}
            proteinLog={proteinLog}
            vitaminD3Log={vitaminD3Log}
            creatineLog={creatineLog}
            onGoTab={setTab}
            onOpenLogger={(opts) => setLoggerState({ open: true, ...opts })}
            onOpenAwards={() => setAwardsOpen(true)}
            onChooseLift={() => { setTab("workout"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onGoWalk={() => setWalkState({ open: true })}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}

        {/* ── TRAIN ── */}
        {tab === "workout" && (() => {
          const streak = calcStreak(history);
          const todaySessions = history.filter(h => new Date(h.logged_at).toDateString() === new Date().toDateString()).length;
          const todayCardio = cardioSessions.filter(s => new Date(s.completed_at).toDateString() === new Date().toDateString()).length;
          const todayTotal = todaySessions + todayCardio;
          const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
          return (
          <>
            {/* ── Today Hero ── */}
            <div className="ease-up" style={{ marginBottom: 20 }}>
              <Eyebrow>{dateStr}</Eyebrow>
              <h1 className="h-display" style={{ fontSize: 36, margin: "8px 0 4px", color: C.bone, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {greeting()}.
              </h1>
              <p className="h-serif" style={{ fontSize: 17, color: C.dim, margin: "6px 0 0", lineHeight: 1.4 }}>
                {todayTotal === 0 ? (restDay ? "Recovery is part of the work." : "Let's get to work.") : todayTotal === 1 ? "One down. Strong start." : `${todayTotal} sessions in today. Beast.`}
              </p>

              {/* Notification permission prompt — non-intrusive */}
              {!notifEnabled && "Notification" in window && Notification.permission === "default" && (
                <div onClick={enableNotifications} className="card-tap" style={{
                  marginTop: 14, padding: "10px 14px", borderRadius: 12,
                  background: C.electric + "15", border: `1px solid ${C.electric}40`,
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                }}>
                  <span style={{ fontSize: 18 }}>🔔</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.bone }}>Get timer alerts</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>Banner notifications when you switch apps mid-rest</div>
                  </div>
                  <span style={{ fontSize: 11, color: C.electric, fontFamily: FONT_MONO, fontWeight: 600 }}>ENABLE →</span>
                </div>
              )}

              {/* Weight reminder if 7+ days since last weigh-in */}
              {(() => {
                const lastW = weightLog[0];
                const daysSinceWeight = lastW ? Math.floor((Date.now() - new Date(lastW.logged_at)) / 86400000) : null;
                if (daysSinceWeight !== null && daysSinceWeight >= 7) {
                  return (
                    <div onClick={() => setTab("weight")} className="card-tap" style={{
                      marginTop: 14, padding: "10px 14px", borderRadius: 12,
                      background: C.amber + "15", border: `1px solid ${C.amber}40`,
                      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    }}>
                      <span style={{ fontSize: 18 }}>⚖️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.bone }}>Time to weigh in</div>
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{daysSinceWeight} days since last check</div>
                      </div>
                      <span style={{ fontSize: 12, color: C.amber, fontFamily: FONT_MONO }}>→</span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Streak + today stats row */}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <div style={{ flex: 1, background: C.panel, border: `1px solid ${streak > 0 ? C.rust + "40" : C.line}`, borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    {streak > 0 && <span style={{ fontSize: 18 }}>🔥</span>}
                    <span className="num-tab h-display" style={{ fontSize: 26, fontWeight: 700, color: streak > 0 ? C.rust : C.dim, letterSpacing: "-0.03em", lineHeight: 1 }}>{streak}</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4, letterSpacing: "0.08em" }}>DAY STREAK</div>
                </div>
                <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px" }}>
                  <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 700, color: todayTotal > 0 ? C.moss : C.dim, letterSpacing: "-0.03em", lineHeight: 1 }}>{todayTotal}</div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4, letterSpacing: "0.08em" }}>TODAY</div>
                </div>
                <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px" }}>
                  <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 700, color: thisWeek > 0 ? C.amber : C.dim, letterSpacing: "-0.03em", lineHeight: 1 }}>{thisWeek}</div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4, letterSpacing: "0.08em" }}>THIS WEEK</div>
                </div>
              </div>
            </div>

            <div className="ease-up-1"><TabataTimer onLog={logTabata} loggedToday={tabataToday} /></div>
            <div className="ease-up-2"><FastBreakTimer onLog={logFastBreak} cardioSessions={cardioSessions} /></div>
            <div className="ease-up-2"><DynoCard onLog={logDyno} /></div>
            <div className="ease-up-2">
              <Surface accent={C.plum}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <Pill color={C.plum}>Anytime · Recovery</Pill>
                    <h2 className="h-display" style={{ fontSize: 22, margin: "10px 0 2px", color: C.bone }}>Walk</h2>
                    <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>minutes · speed · incline</div>
                  </div>
                  <Btn color={C.plum} onClick={() => setWalkState({ open: true })}>Log a walk</Btn>
                </div>
              </Surface>
            </div>

            {/* Status banners */}
            <div className="ease-up-3" style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}>
              <Surface accent={restDay ? C.faint : session.color} padding={14} style={{ marginBottom: 0 }}>
                <Eyebrow color={restDay ? C.dim : session.color}>Lift</Eyebrow>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: C.bone }}>
                  {restDay ? "Recover" : session.name}
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>
                  {restDay ? `Last: ${daysAgo(lastGym.logged_at)}` : "Ready when you are"}
                </div>
              </Surface>
              <Surface accent={tabataToday ? C.moss : C.amber} padding={14} style={{ marginBottom: 0 }}>
                <Eyebrow color={tabataToday ? C.moss : C.amber}>Tabata</Eyebrow>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: C.bone }}>
                  {tabataToday ? "✓ Done today" : "🔥 4-min Tabata"}
                </div>
                <div style={{ fontSize: 11, color: tabataToday ? C.moss : C.dim, marginTop: 2, fontFamily: FONT_MONO }}>
                  {tabataToday ? "Logged today" : "2×/week · per the plan"}
                </div>
              </Surface>
            </div>

            <div className="ease-up-4">
              <Surface accent={session.color}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                  <div>
                    <Pill color={session.color}>{session.location}</Pill>
                    <h3 className="h-display" style={{ fontSize: 28, margin: "10px 0 4px", color: C.bone, letterSpacing: "-0.03em" }}>{session.name}</h3>
                    <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>{session.exercises.length} exercises</div>
                  </div>
                  {volume > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <Eyebrow>Volume</Eyebrow>
                      <div className="num-tab h-display" style={{ fontSize: 30, fontWeight: 700, color: session.color, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 4 }}>{fmtNum(volume)}</div>
                      <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 2 }}>LBS</div>
                    </div>
                  )}
                </div>
                {session.exercises.map(ex => (
                  <ExRow key={ex.id} ex={ex}
                    checked={checked[sk+"_"+ex.id]}
                    onCheck={() => toggleCheck(sk+"_"+ex.id)}
                    vals={vals[sk+"_"+ex.id] || {}}
                    onVal={(f,v) => setVal(sk+"_"+ex.id, f, v)}
                    color={session.color}
                    onRest={restEnabled && !ex.timed && !ex.noWeight ? () => setRestTimer({ seconds: 90 }) : null}
                    lastPerf={getLastPerformance(history, ex.name)}
                    onEditReps={(setIndex, currentReps) => openRepsEditor(ex.id, ex, setIndex, currentReps)}
                  />
                ))}
                <div style={{ marginTop: 16 }}>
                  <Eyebrow>Workout date</Eyebrow>
                  <input type="datetime-local" value={liftDate} max={toLocalInput(new Date())} onChange={e => setLiftDate(e.target.value)}
                    style={{ width: "100%", marginTop: 6, background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, color: C.bone, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: FONT_DISPLAY, boxSizing: "border-box" }} />
                </div>
                <Btn color={session.color} onClick={logSession} disabled={!anyChecked || busy} full size="lg" style={{ marginTop: 12 }}>
                  {anyChecked ? "End Workout & Log" : "Check an exercise to log"}
                </Btn>
              </Surface>
            </div>


            <p className="h-serif" style={{ textAlign: "center", color: C.dim, fontSize: 16, margin: "24px 0 0" }}>
              "I am someone who never misses a workout."
              <span style={{ display: "block", fontFamily: FONT_MONO, fontStyle: "normal", fontSize: 10, letterSpacing: "0.15em", marginTop: 6 }}>— JAMES CLEAR</span>
            </p>
          </>
          );
        })()}

        {/* ── NUTRITION ── */}
        {tab === "nutrition" && (
          <NutritionTab
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
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (() => {
          // One unified feed — every logged activity, newest first.
          const feed = [
            ...cardioSessions.map(s => ({ kind: "cardio", id: s.id, type: s.workout_type, date: new Date(s.completed_at), duration: s.duration_min, rpe: s.rpe, notes: s.notes, focus: s.focus, raw: s })),
            ...history.map(w => {
              const isWalk = w.session_name === "Treadmill Walk";
              return { kind: "workout", id: w.id, type: isWalk ? "walk" : "lift", date: new Date(w.logged_at), title: isWalk ? "Walk" : "Lift", subtitle: (w.exercises && w.exercises[0] && w.exercises[0].name) || w.session_name, volume: w.total_volume || 0, exercises: w.exercises, raw: w };
            }),
          ].sort((a, b) => b.date - a.date);
          const twoWeekCount = feed.filter(f => (Date.now() - f.date.getTime()) < 14 * 86400000).length;
          return (
          <>
            <div className="ease-up"><PageTitle kicker="The work · is the win">Log</PageTitle></div>

            <div className="ease-up-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <StatCard kicker="ALL" value={feed.length} color={C.rust} sub="logged" />
              <StatCard kicker="14-DAY" value={twoWeekCount} color={C.amber} sub="sessions" />
              <StatCard kicker="LBS" value={fmtNum(totalLbs)} color={C.moss} sub="lifted" />
            </div>

            <div className="ease-up-1" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button onClick={() => setQuickAddOpen(true)} className="btn" style={{ background: C.rust, border: "none", color: "#fff", borderRadius: 10, padding: "8px 14px", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Log a workout</button>
            </div>

            {feed.length === 0 && (
              <Surface style={{ textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💪</div>
                <p className="h-serif" style={{ fontSize: 18, color: C.cream, margin: 0 }}>The page is blank.</p>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 8, fontFamily: FONT_MONO }}>GO WRITE THE FIRST CHAPTER</div>
              </Surface>
            )}

            {feed.map((f) => {
              const def = RECOVERY.TYPES[f.type] || {};
              const col = C[def.colorKey] || C.rust;
              const title = f.kind === "cardio" ? (def.label || f.type) : f.title;
              const focusOpt = f.kind === "cardio" && f.type === "cross_training" ? s440FocusFor(f.focus) : null;
              const clsName = f.kind === "cardio" && f.type === "cross_training" && f.raw.class_name ? f.raw.class_name.replace("SWEAT440 ", "") : null;
              const detail = f.kind === "cardio"
                ? [clsName ? `${focusOpt ? focusOpt.emoji + " " : ""}${clsName}` : focusOpt ? `${focusOpt.emoji} ${focusOpt.label} day` : null, f.raw.points != null ? `🏀 ${f.raw.points} pts` : null, f.raw.rebounds != null ? `${f.raw.rebounds} reb` : null, f.duration != null ? `${f.duration} min` : null, f.rpe != null ? `RPE ${f.rpe}` : null].filter(Boolean).join(" · ")
                : f.subtitle;
              const canExpand = f.kind === "workout" && f.type === "lift" && f.exercises && f.exercises.length;
              const expanded = expandedLog[f.kind + f.id];
              return (
                <Surface key={f.kind + f.id} accent={col} padding={14}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 26 }}>{def.emoji || "•"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="h-display" style={{ fontSize: 16, fontWeight: 700, color: C.bone, letterSpacing: "-0.01em" }}>{title}</span>
                        <Pill color={col}>{daysAgo(f.date)}</Pill>
                      </div>
                      {detail && <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontFamily: FONT_MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</div>}
                      {f.notes && <div style={{ fontSize: 11, color: C.mute, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.notes}</div>}
                      <div style={{ fontSize: 10, color: C.mute, marginTop: 3, fontFamily: FONT_MONO }}>{f.date.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      {f.volume > 0 && (
                        <div style={{ textAlign: "right", marginRight: 2 }}>
                          <div className="num-tab" style={{ color: col, fontSize: 15, fontWeight: 700 }}>{fmtNum(f.volume)}</div>
                          <div style={{ fontSize: 8, color: C.dim, fontFamily: FONT_MONO }}>LBS</div>
                        </div>
                      )}
                      {canExpand && <button onClick={() => setExpandedLog(p => ({ ...p, [f.kind + f.id]: !p[f.kind + f.id] }))} className="btn" style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 13, padding: 6 }}>{expanded ? "▲" : "▼"}</button>}
                      <button onClick={() => {
                        if (f.kind === "cardio") setLoggerState({ open: true, editing: f.raw });
                        else if (f.type === "walk") setWalkState({ open: true, editing: f.raw });
                        else setLiftEdit(f.raw);
                      }} className="btn" style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 13, padding: 6 }}>✎</button>
                      <button onClick={() => (f.kind === "cardio" ? deleteCardio(f.id) : deleteLog(f.id))} className="btn" style={{ background: "transparent", border: "none", color: C.mute, cursor: "pointer", fontSize: 14, padding: 6 }}>✕</button>
                    </div>
                  </div>
                  {canExpand && expanded && (
                    <div className="ease-up" style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                      {f.exercises.map((ex, j) => (
                        <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: j < f.exercises.length - 1 ? `1px solid ${C.line}` : "none" }}>
                          <span style={{ color: C.cream }}>{ex.name}</span>
                          <span className="num-tab" style={{ color: C.dim, fontFamily: FONT_MONO, fontSize: 12 }}>{ex.sets}×{ex.reps}{ex.weight > 0 ? ` @ ${ex.weight}` : ""}{ex.volume > 0 ? ` = ${fmtNum(ex.volume)}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Surface>
              );
            })}
          </>
          );
        })()}

        {/* ── STATS ── */}
        {tab === "stats" && <StatsTab history={history} weightLog={weightLog} cardioSessions={cardioSessions} legsLog={legsLog} />}

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
            <div className="ease-up"><PageTitle kicker="Consistency · compounds">The Plan</PageTitle></div>

            {/* Weekly schedule — Shabbat + game night the engine plans around */}
            {(() => {
              const wkNow = startOfWeek(new Date()).getTime();
              const playingThisWeek = schedule.skipGameWeek !== wkNow;
              const Switch = ({ on, onToggle }) => (
                <button onClick={onToggle} className="btn" style={{ width: 50, height: 28, borderRadius: 14, border: "none", background: on ? C.moss : C.faint, position: "relative", cursor: "pointer", padding: 0, flexShrink: 0, transition: "background 0.2s" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 999, background: "#fff", position: "absolute", top: 3, left: on ? 25 : 3, transition: "left 0.2s cubic-bezier(0.22,1,0.36,1)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </button>
              );
              return (
                <div className="ease-up-1">
                  <Surface accent={C.electric}>
                    <Eyebrow color={C.electric}>Weekly schedule</Eyebrow>
                    {/* Shabbat */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 10px", borderBottom: `1px solid ${C.line}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>🕯️ Shabbat (Saturday)</div>
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>No hard training — rest or an easy walk</div>
                      </div>
                      <Switch on={schedule.shabbat} onToggle={() => updateSchedule({ ...schedule, shabbat: !schedule.shabbat })} />
                    </div>
                    {/* Game night */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 10px", borderBottom: schedule.gameNight ? `1px solid ${C.line}` : "none" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>🏀 Game night</div>
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>League night — the engine plans around it</div>
                      </div>
                      <Switch on={schedule.gameNight} onToggle={() => updateSchedule({ ...schedule, gameNight: !schedule.gameNight })} />
                    </div>
                    {schedule.gameNight && (
                      <>
                        <div style={{ display: "flex", gap: 5, marginTop: 12 }}>
                          {DOW_NAMES.map((d, i) => (
                            <button key={i} onClick={() => updateSchedule({ ...schedule, gameDow: i })} className="btn" style={{
                              flex: 1, padding: "8px 0", borderRadius: 9, cursor: "pointer", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 11,
                              border: `1px solid ${schedule.gameDow === i ? C.rust : C.line}`, background: schedule.gameDow === i ? `${C.rust}18` : C.raised, color: schedule.gameDow === i ? C.rust : C.dim,
                            }}>{d}</button>
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>Playing this week?</div>
                            <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>{playingThisWeek ? `Game on ${DOW_NAMES[schedule.gameDow]} night` : "Off this week — no game planned"}</div>
                          </div>
                          <Switch on={playingThisWeek} onToggle={() => updateSchedule({ ...schedule, skipGameWeek: playingThisWeek ? wkNow : null })} />
                        </div>
                      </>
                    )}
                    {/* Sweat440 class days */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 10px", borderTop: `1px solid ${C.line}`, marginTop: schedule.gameNight ? 12 : 0 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>💦 Sweat440 class</div>
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>Recurring class days — the engine plans around them</div>
                      </div>
                      <Switch on={schedule.crossClass} onToggle={() => updateSchedule({ ...schedule, crossClass: !schedule.crossClass })} />
                    </div>
                    {schedule.crossClass && (
                      <>
                        <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                          {DOW_NAMES.map((d, i) => {
                            const on = (schedule.classDows || []).includes(i);
                            return (
                              <button key={i} onClick={() => updateSchedule({ ...schedule, classDows: on ? (schedule.classDows || []).filter(x => x !== i) : [...(schedule.classDows || []), i] })} className="btn" style={{
                                flex: 1, padding: "8px 0", borderRadius: 9, cursor: "pointer", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 11,
                                border: `1px solid ${on ? C.pink : C.line}`, background: on ? `${C.pink}18` : C.raised, color: on ? C.pink : C.dim,
                              }}>{d}</button>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, marginTop: 8 }}>Tap every day you have class — pick as many as apply.</div>
                      </>
                    )}
                  </Surface>
                </div>
              );
            })()}

            {/* Quick Settings */}
            <div className="ease-up-1">
              <Surface>
                <Eyebrow color={C.electric}>Settings</Eyebrow>
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div>
                      <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>Rest timer</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>Auto-start after each set</div>
                    </div>
                    <button onClick={() => setRestEnabled(!restEnabled)} className="btn"
                      style={{
                        width: 50, height: 28, borderRadius: 14, border: "none",
                        background: restEnabled ? C.moss : C.faint,
                        position: "relative", cursor: "pointer", padding: 0,
                        transition: "background 0.2s",
                      }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 999, background: "#fff",
                        position: "absolute", top: 3, left: restEnabled ? 25 : 3,
                        transition: "left 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div>
                      <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>Banner notifications</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>Alerts when timers fire in the background</div>
                    </div>
                    {notifEnabled ? (
                      <span style={{ fontSize: 11, color: C.moss, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>● ON</span>
                    ) : (
                      <Btn color={C.electric} size="sm" onClick={enableNotifications}>Enable</Btn>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>💊 Daily D3 reminder</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO }}>Push to this phone every morning at 9</div>
                    </div>
                    <button onClick={toggleD3Push} className="btn"
                      style={{
                        width: 50, height: 28, borderRadius: 14, border: "none",
                        background: d3Push ? C.moss : C.faint,
                        position: "relative", cursor: "pointer", padding: 0, flexShrink: 0,
                        transition: "background 0.2s",
                      }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 999, background: "#fff",
                        position: "absolute", top: 3, left: d3Push ? 25 : 3,
                        transition: "left 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>Account</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: FONT_MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail || "Signed in"}</div>
                    </div>
                    <Btn color={C.red} ghost size="sm" onClick={signOut}>Sign out</Btn>
                  </div>
                </div>
              </Surface>
            </div>

            {PHASES.map((p, i) => (
              <div key={i} className={`ease-up-${Math.min(i+1, 4)}`}>
                <Surface accent={p.color}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                    <div>
                      <Eyebrow color={p.color}>Weeks {p.weeks}</Eyebrow>
                      <div className="num-tab h-display" style={{ fontSize: 28, fontWeight: 700, color: p.color, letterSpacing: "-0.03em", marginTop: 6 }}>
                        {p.weight} <span style={{ fontSize: 12, color: C.dim, fontWeight: 500, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>LBS</span>
                      </div>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: p.color + "22", border: `1px solid ${p.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: p.color, fontFamily: FONT_MONO }}>{i+1}</div>
                  </div>
                  <p className="h-serif" style={{ fontSize: 18, color: C.cream, margin: "0 0 14px", lineHeight: 1.4 }}>{p.focus}</p>
                  <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
                    {p.goals.map((g, j) => (
                      <div key={j} style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13, color: C.cream, alignItems: "baseline" }}>
                        <span style={{ color: p.color, fontFamily: FONT_MONO, fontSize: 11 }}>0{j+1}</span>
                        <span style={{ flex: 1 }}>{g}</span>
                      </div>
                    ))}
                  </div>
                </Surface>
              </div>
            ))}

            <Surface accent={C.amber} padding={22}>
              <Eyebrow color={C.amber}>Nutrition</Eyebrow>
              <p className="h-serif" style={{ fontSize: 17, color: C.cream, margin: "12px 0 0", lineHeight: 1.6 }}>
                Target {calcProteinTarget(bodyStats.weightLbs)}g protein/day. Whole foods first. Carbs around training. Cut alcohol to weekends. 3L water minimum on training days. <strong style={{ color: C.amber }}>Detailed kosher food guide + protein tracker on the Fuel tab.</strong>
              </p>
            </Surface>

            <Surface accent={C.electric} padding={22}>
              <Eyebrow color={C.electric}>Atomic Habits · 4 Laws</Eyebrow>
              <div style={{ marginTop: 14 }}>
                {[
                  ["1.", "Make It Obvious", C.rust, "Gym bag packed the night before. Shoes by the door."],
                  ["2.", "Make It Attractive", C.amber, "Hype playlist only during training. Pair it with something you enjoy."],
                  ["3.", "Make It Easy", C.moss, "2-Minute Rule: just lace up. The rest follows."],
                  ["4.", "Make It Satisfying", C.plum, "Log every session. The streak is the reward."],
                ].map(([n, law, color, tip]) => (
                  <div key={law} style={{ padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                      <span className="mono" style={{ color: color, fontSize: 11, fontWeight: 700 }}>{n}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color, letterSpacing: "-0.01em" }}>{law}</div>
                        <p className="h-serif" style={{ fontSize: 14, color: C.cream, margin: "4px 0 0", lineHeight: 1.5 }}>{tip}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="h-serif" style={{ fontSize: 16, color: C.dim, margin: "16px 0 0", textAlign: "center" }}>
                "I am someone who never misses a workout."
                <span className="mono" style={{ display: "block", fontStyle: "normal", fontSize: 10, letterSpacing: "0.15em", marginTop: 6, color: C.mute }}>— JAMES CLEAR</span>
              </p>
            </Surface>
          </>
        )}

      </main>

      {/* ── Floating overlays ── */}
      <Confetti show={confetti} onDone={() => setConfetti(false)} />
      {restTimer && (
        <RestTimer
          seconds={restTimer.seconds}
          onClose={() => setRestTimer(null)}
          onSkip={() => setRestTimer(null)}
        />
      )}
      {repsEditor && (
        <RepsEditor
          open={true}
          currentReps={repsEditor.currentReps}
          defaultReps={repsEditor.defaultReps}
          exerciseName={repsEditor.exerciseName}
          setIndex={repsEditor.setIndex}
          onSave={saveCustomReps}
          onClose={() => setRepsEditor(null)}
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
        {GROUPS.slice(0, 2).map(g => <NavItem key={g.id} g={g} active={activeGroup.id === g.id} onGo={goGroup} />)}

        {/* Quick-add FAB */}
        <button className="btn" onClick={() => { setQuickAddOpen(true); if (navigator.vibrate) navigator.vibrate(10); }}
          aria-label="Quick add"
          style={{
            flex: "0 0 auto", width: 52, height: 52, marginTop: -18, borderRadius: 999, border: "none",
            background: `linear-gradient(135deg, ${C.rust}, ${C.amber})`, color: "#fff",
            fontSize: 26, fontWeight: 700, lineHeight: 1, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 6px 18px ${C.rust}55`,
          }}>
          +
        </button>

        {GROUPS.slice(2).map(g => <NavItem key={g.id} g={g} active={activeGroup.id === g.id} onGo={goGroup} />)}
      </nav>

      {/* ── QUICK ADD bottom sheet ── */}
      {quickAddOpen && (() => {
        const tk = todayKey();
        const curProtein = proteinLog[tk] || 0;
        const pTarget = calcProteinTarget(bodyStats.weightLbs);
        const d3 = !!vitaminD3Log[tk];
        const cr = !!creatineLog[tk];
        const addProtein = (g) => { updateProtein(tk, curProtein + g); if (navigator.vibrate) navigator.vibrate(8); };
        const close = () => setQuickAddOpen(false);
        const chip = (label, on, onTap, color) => (
          <button className="btn" onClick={onTap} style={{
            flex: 1, padding: "12px 8px", borderRadius: 12, cursor: "pointer",
            border: `1px solid ${on ? color : C.line}`,
            background: on ? `${color}18` : C.raised, color: on ? color : C.cream,
            fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 13,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 18 }}>{on ? "✓" : "○"}</span>{label}
          </button>
        );
        return (
          <div className="backdrop" style={{ alignItems: "flex-end", padding: 0 }} onClick={close}>
            <div className="slide-up" onClick={e => e.stopPropagation()} style={{
              width: "100%", maxWidth: 480, margin: "0 auto",
              background: C.panel, borderRadius: "22px 22px 0 0",
              borderTop: `1px solid ${C.line}`, padding: "10px 18px calc(24px + env(safe-area-inset-bottom))",
              maxHeight: "85vh", overflowY: "auto",
            }}>
              <div style={{ width: 38, height: 4, borderRadius: 999, background: C.faint, margin: "0 auto 16px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <h2 className="h-display" style={{ fontSize: 22, fontWeight: 700, color: C.bone, margin: 0, letterSpacing: "-0.03em" }}>Quick add</h2>
                <button onClick={close} className="btn" style={{ border: "none", background: "transparent", color: C.dim, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>

              {/* Protein */}
              <Eyebrow>Protein · {Math.round(curProtein)}/{pTarget}g</Eyebrow>
              <div style={{ display: "flex", gap: 8, margin: "8px 0 18px" }}>
                {[20, 30, 40].map(g => (
                  <button key={g} className="btn" onClick={() => addProtein(g)} style={{
                    flex: 1, padding: "13px 8px", borderRadius: 12, cursor: "pointer",
                    border: `1px solid ${C.amber}40`, background: `${C.amber}12`, color: C.amber,
                    fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15,
                  }}>+{g}g</button>
                ))}
              </div>

              {/* Supplements */}
              <Eyebrow>Supplements</Eyebrow>
              <div style={{ display: "flex", gap: 8, margin: "8px 0 18px" }}>
                {chip("Vitamin D3", d3, () => { toggleVitaminD3(tk); if (navigator.vibrate) navigator.vibrate(8); }, C.electric)}
                {chip("Creatine", cr, () => { toggleCreatine(tk); if (navigator.vibrate) navigator.vibrate(8); }, C.plum)}
              </div>

              {/* Weight */}
              <Eyebrow>Bodyweight</Eyebrow>
              <div style={{ display: "flex", gap: 8, margin: "8px 0 18px" }}>
                <input type="number" inputMode="decimal" value={weightInput} onChange={e => setWeightInput(e.target.value)}
                  placeholder="lbs" style={{
                    flex: 1, padding: "13px 14px", borderRadius: 12, border: `1px solid ${C.line}`,
                    background: C.raised, color: C.bone, fontSize: 16, fontFamily: FONT_MONO, outline: "none",
                  }} />
                <button className="btn" onClick={async () => { await logWeight(); }} style={{
                  padding: "13px 22px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: C.moss, color: "#fff", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14,
                }}>Log</button>
              </div>

              {/* Log a workout — routes to the right logger per type */}
              <Eyebrow>Log a workout</Eyebrow>
              <div style={{ display: "flex", gap: 6, margin: "8px 0 18px" }}>
                {Object.values(RECOVERY.TYPES).map(t => (
                  <button key={t.key} className="btn" onClick={() => {
                    close();
                    if (t.key === "walk") setWalkState({ open: true });
                    else if (t.key === "lift") { setTab("workout"); window.scrollTo({ top: 0 }); }
                    else setLoggerState({ open: true, prefillType: t.key });
                  }} style={{
                    flex: 1, padding: "12px 4px", borderRadius: 12, cursor: "pointer",
                    border: `1px solid ${C[t.colorKey]}40`, background: `${C[t.colorKey]}12`, color: C[t.colorKey],
                    fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 11,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}><span style={{ fontSize: 18 }}>{t.emoji}</span>{t.short}</button>
                ))}
              </div>

              {/* Fast break drill — ran it phone-down? One tap logs it, done.
                 Each button shows what it pays the engine. */}
              <Eyebrow>🏃 Fast break · already ran it?</Eyebrow>
              {(() => {
                const engScore = engineModel(normalizeAll(cardioSessions, history)).score;
                return (
                  <div style={{ display: "flex", gap: 8, margin: "8px 0 18px" }}>
                    {[10, 12, 15].map(m => (
                      <button key={m} className="btn" onClick={() => { logFastBreak(m); close(); if (navigator.vibrate) navigator.vibrate(10); }} style={{
                        flex: 1, padding: "11px 8px", borderRadius: 12, cursor: "pointer",
                        border: `1px solid ${C.electric}40`, background: `${C.electric}12`, color: C.electric,
                        fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      }}>
                        {m} min
                        {engScore > 0 && <span style={{ fontSize: 10.5, color: C.moss, fontFamily: FONT_MONO, fontWeight: 700 }}>⛽ +{engineBumpPreview(engScore, m, 9).toFixed(1)}%</span>}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Shortcuts */}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => { setTab("workout"); close(); window.scrollTo({ top: 0 }); }} style={{
                  flex: 1, padding: "13px 8px", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${C.rust}40`, background: `${C.rust}12`, color: C.rust,
                  fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14,
                }}>🏋️ Start a workout</button>
                <button className="btn" onClick={() => { setTab("nutrition"); close(); window.scrollTo({ top: 0 }); }} style={{
                  flex: 1, padding: "13px 8px", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${C.line}`, background: C.raised, color: C.cream,
                  fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14,
                }}>🥤 Full nutrition</button>
              </div>
            </div>
          </div>
        );
      })()}

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
      {celebration && <CelebrationOverlay queue={celebration} onClose={() => setCelebration(null)} />}

      <ToastHost />
    </div>
  );
}
