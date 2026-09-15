import { addDays, startOfDay, startOfWeek, dateKey, engineModel, engineLoadOf, ENGINE_TAU } from './model';

export const DEFAULT_PREFERENCES = {
  engineTarget: 100, weeklyGoal: 3, coachingTone: 'encouraging',
  sound: true, vibration: true, motion: true, supplements: false,
};
export const COURT_RATINGS = [
  { key: 'struggled', label: 'Struggled' }, { key: 'solid', label: 'Solid' }, { key: 'strong', label: 'Strong' },
];
export const weekKey = date => dateKey(startOfWeek(date));
export const formatEngine = value => Number(value || 0).toFixed(1);

export function engineSummary(all, asOf = new Date()) {
  const engine = engineModel(all, asOf);
  const today = startOfDay(asOf);
  const daily = new Map(engine.series.map(p => [p.t, p.F]));
  const average = offset => Array.from({ length: 7 }, (_, i) => daily.get(addDays(today, -offset - i).getTime()) || 0).reduce((a,b) => a+b, 0) / 7;
  const currentAverage = average(0);
  const previousAverage = engine.series.length >= 14 ? average(7) : null;
  return { ...engine, currentAverage, previousAverage };
}

export function weeklyProgress(all, goal, savedGoals = {}, asOf = new Date()) {
  const start = startOfWeek(asOf);
  const key = weekKey(start);
  const count = day => all.filter(s => s.date >= day && s.date < addDays(day, 7) && s.date <= asOf).length;
  const weeks = Object.entries(savedGoals).map(([key, target]) => {
    const date = new Date(`${key}T00:00:00`);
    return { key, date, target, count: count(date) };
  }).filter(w => w.date <= start && Number.isFinite(w.date.getTime()) && w.target > 0).sort((a,b) => a.date-b.date);
  let run = 0, best = 0, last = null;
  for (const w of weeks) {
    if (w.date.getTime() === start.getTime() && w.count < w.target) continue;
    run = w.count >= w.target ? (last && addDays(last, 7).getTime() === w.date.getTime() ? run + 1 : 1) : 0;
    best = Math.max(best, run); last = w.date;
  }
  const current = weeks.find(w => w.key === key);
  return { key, start, end: addDays(start, 6), count: count(start), goal: current ? current.target : goal,
    weeksMet: weeks.filter(w => w.count >= w.target).length, best, weeks };
}

export function engineAchievements(game, all, preferences, goals) {
  const engine = engineSummary(all);
  const weekly = weeklyProgress(all, preferences.weeklyGoal, goals);
  const held = engine.series.length >= 7 && engine.series.slice(-7).every(p => p.F >= preferences.engineTarget);
  const extras = [
    { id: 'planweek1', emoji: '✓', name: 'Week complete', desc: 'Meet a saved weekly session goal', goal: 1, value: weekly.weeksMet },
    { id: 'planweek4', emoji: '🏀', name: 'Building a rhythm', desc: 'Meet your saved goal four weeks in a row', goal: 4, value: weekly.best },
    { id: 'engineheld', emoji: '⚙️', name: 'Holding your level', desc: `Seven days at Engine ${preferences.engineTarget} or above`, goal: 1, value: held ? 1 : 0 },
  ].map(a => ({ ...a, unlocked: a.value >= a.goal, progress: Math.min(1, a.value / a.goal) }));
  const achievements = [...game.achievements.filter(a => !a.id.startsWith('streak') && !a.id.startsWith('lost')), ...extras];
  return { ...game, achievements, unlockedCount: achievements.filter(a => a.unlocked).length };
}

// The score entering a game excludes that game and all sessions logged later.
export function engineBeforeGame(all, game) {
  const when = new Date(game.completed_at);
  return engineModel(all.filter(s => s.date < when && String(s.id) !== String(game.id)), when).score;
}

export function sessionContribution(session) { return engineLoadOf(session) / ENGINE_TAU; }

export function coachMessage({ tone, recovery, complete, returning }) {
  const messages = {
    calm: { recovery: 'Recovery is on the plan today.', complete: 'Today’s session is recorded. Your next step is ready.', returning: 'Welcome back. Take the next session at your pace.', train: 'Your next session is ready.' },
    encouraging: { recovery: 'Recovery counts as following the plan. Enjoy the space.', complete: 'Work recorded. Give yourself credit for showing up.', returning: 'Good to have you back. One session is a fresh start.', train: 'One clear next step. Let’s build your engine.' },
    intense: { recovery: 'Recover with purpose. The next game matters.', complete: 'Work banked. Follow the plan for what comes next.', returning: 'Back in the game. Start with today’s plan.', train: 'Build the engine. Bring it to the court.' },
  };
  return (messages[tone] || messages.encouraging)[recovery ? 'recovery' : complete ? 'complete' : returning ? 'returning' : 'train'];
}

export function exerciseRecord(ex, values = {}, checked = false) {
  const done = values.completedSets;
  const indices = done ? Object.keys(done).filter(k => done[k]).map(Number).sort((a,b) => a-b)
    : Array.from({ length: Number(values.setsDone) || (checked ? Number(ex.sets) : 0) }, (_, i) => i);
  if (!indices.length) return null;
  const baseWeight = ex.barbell ? 45 + (Number(values.perSide) || 0) * 2 : Number(values.weight) || 0;
  const unweighted = ex.noWeight || ex.timed || ex.bodyweight;
  const sets = indices.map(i => ({
    reps: Number(values.customReps?.[i] ?? ex.reps) || 0,
    weight: unweighted ? 0 : Number(values.setWeights?.[i] ?? baseWeight),
  }));
  return { name: ex.name, sets: sets.length, reps: sets.map(s => s.reps).join(','),
    weight: sets[sets.length - 1].weight, set_details: sets,
    volume: unweighted ? 0 : sets.reduce((sum,s) => sum + s.weight*s.reps, 0) };
}

export function nutritionTotals(baseProtein, baseCalories, entries) {
  const protein = { ...baseProtein }, calories = { ...baseCalories };
  Object.values(entries).filter(Boolean).forEach(e => {
    protein[e.day] = (Number(protein[e.day]) || 0) + Number(e.protein || 0) * Number(e.portions || 1);
    calories[e.day] = (Number(calories[e.day]) || 0) + Number(e.calories || 0) * Number(e.portions || 1);
  });
  return { protein, calories };
}
