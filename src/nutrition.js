import { vibrate } from './model';
import React, { useState } from 'react';
import { C, SPRING, FONT_DISPLAY, FONT_MONO, PRE_WORKOUT_FOODS, POST_WORKOUT_FOODS, ANYTIME_PROTEIN, PRE_WORKOUT_MEALS, POST_WORKOUT_MEALS, calcProteinTarget, GOAL_MODES, calcCalorieTarget, beep, todayKey, weekKeysMonday, calcSupplementStreak } from './model';
import { Surface, Eyebrow, Pill, Btn, NumIn, PageTitle, toast, AnimatedNumber } from './ui';

export function SupplementRow({ name, dose, blurb, icon, accent, log, onToggle }) {
  const today = todayKey();
  const takenToday = !!log[today];
  const streak = calcSupplementStreak(log);

  // Current week, Monday → Sunday.
  const weekLetters = ["M", "T", "W", "T", "F", "S", "S"];
  const trail = weekKeysMonday().map((k, i) => ({
    key: k,
    done: !!log[k],
    isToday: k === today,
    letter: weekLetters[i],
  }));

  const toggle = () => {
    onToggle(today);
    if (!takenToday) {
      beep(880, 0.08, 0.3);
      vibrate(8);
    }
  };

  return (
    <div className="fuel-supplement">
      <div className="engine-row">
        <div className="fuel-icon" aria-hidden="true" style={{ background: `color-mix(in srgb, ${accent} 16%, var(--raised))` }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong className="fuel-name">{name}</strong>
          <div className="engine-muted">
            {dose}{streak > 0 ? ` · 🔥 ${streak} day${streak === 1 ? "" : "s"}` : ""}
          </div>
        </div>
        <button type="button" onClick={toggle} className={`engine-button${takenToday ? "" : " primary"}`} aria-pressed={takenToday} aria-label={`${name} taken today`} style={{ flexShrink: 0 }}>
          {takenToday ? "✓ Taken" : "Log it"}
        </button>
      </div>

      {/* 7-day trail */}
      <div className="fuel-trail" role="img" aria-label={`${name} this week: ${trail.filter(d => d.done).length} of 7 days`}>
        {trail.map(d => (
          <div key={d.key} className={d.isToday ? "today" : undefined}>
            <span data-done={d.done} />
            {d.letter}
          </div>
        ))}
      </div>

      <p className="engine-muted">{blurb}</p>
    </div>
  );
}

export function NutritionTab({ guideOnly = false, onLogFood, bodyStats, onUpdateBody, proteinLog, onProteinChange, calorieLog, onCalorieChange, vitaminD3Log, onVitaminD3Toggle, creatineLog, onCreatineToggle }) {
  const [editingBody, setEditingBody] = useState(false);
  const [tmpHeight, setTmpHeight] = useState(bodyStats.heightInches);
  const [tmpWeight, setTmpWeight] = useState(bodyStats.weightLbs);
  const [tmpAge, setTmpAge] = useState(bodyStats.age);
  const [tmpGoal, setTmpGoal] = useState(bodyStats.goal || "lean");
  const [foodFilter, setFoodFilter] = useState("preMeals"); // preMeals | postMeals | pre | post | snacks
  const [customAmount, setCustomAmount] = useState("");
  const [customCalAmount, setCustomCalAmount] = useState("");

  const today = todayKey();
  const todayProtein = proteinLog[today] || 0;
  const todayCalories = (calorieLog && calorieLog[today]) || 0;
  const proteinTarget = calcProteinTarget(bodyStats.weightLbs);
  const goal = bodyStats.goal || "lean";
  const goalInfo = GOAL_MODES[goal] || GOAL_MODES.lean;
  const calorieTarget = calcCalorieTarget(
    bodyStats.weightLbs,
    bodyStats.heightInches,
    bodyStats.age,
    bodyStats.activityFactor || 1.55,
    goalInfo.delta
  );
  const pct = Math.min(100, (todayProtein / proteinTarget) * 100);
  const remaining = Math.max(0, proteinTarget - todayProtein);
  const calPct = Math.min(100, (todayCalories / calorieTarget) * 100);
  const calRemaining = calorieTarget - todayCalories; // can be negative when over

  const heightFt = Math.floor(bodyStats.heightInches / 12);
  const heightIn = bodyStats.heightInches % 12;

  const saveBody = () => {
    const h = parseFloat(tmpHeight) || 77;
    const w = parseFloat(tmpWeight) || 222;
    const a = parseInt(tmpAge) || 47;
    onUpdateBody({ ...bodyStats, heightInches: h, weightLbs: w, age: a, goal: tmpGoal });
    setEditingBody(false);
  };

  const setGoal = (newGoal) => {
    onUpdateBody({ ...bodyStats, goal: newGoal });
    setTmpGoal(newGoal);
  };

  const addProtein = (grams) => {
    const newTotal = Math.max(0, todayProtein + grams);
    onProteinChange(today, newTotal);
    if (grams > 0) {
      beep(880, 0.08, 0.3);
      vibrate(8);
    }
  };

  const setProteinAbsolute = (grams) => {
    onProteinChange(today, Math.max(0, grams));
  };

  const addCalories = (cals) => {
    const newTotal = Math.max(0, todayCalories + cals);
    onCalorieChange(today, newTotal);
    if (cals > 0 && navigator.vibrate) navigator.vibrate(6);
  };

  const setCaloriesAbsolute = (cals) => {
    onCalorieChange(today, Math.max(0, cals));
  };

  /* Log a meal/food: adds BOTH protein and calories in one tap */
  const logFood = (food) => {
    if (onLogFood) {onLogFood(food);return;}
    const proteinAmt = food.protein || food.totalProtein || 0;
    const calAmt = food.calories || 0;
    if (proteinAmt > 0) {
      onProteinChange(today, todayProtein + proteinAmt);
    }
    if (calAmt > 0) {
      onCalorieChange(today, todayCalories + calAmt);
    }
    if (proteinAmt > 0 || calAmt > 0) {
      beep(880, 0.08, 0.3);
      vibrate(8);
    }
  };

  const FOOD_LISTS = {
    preMeals:  { items: PRE_WORKOUT_MEALS,  type: "meal", label: "Pre Meals",   icon: "🍽️", color: C.amber,    blurb: "Complete plates to eat 30–90 min before training. Tap to log." },
    postMeals: { items: POST_WORKOUT_MEALS, type: "meal", label: "Post Meals",  icon: "🍴", color: C.moss,     blurb: "Real meals for after the work. Within 60–90 min." },
    pre:       { items: PRE_WORKOUT_FOODS,  type: "quick", label: "Pre Quick",  icon: "🔋", color: C.amber,    blurb: "Quick singles when you don't have time for a full meal." },
    post:      { items: POST_WORKOUT_FOODS, type: "quick", label: "Post Quick", icon: "💪", color: C.moss,     blurb: "Fast options within 30–90 min after lifting." },
    snacks:    { items: ANYTIME_PROTEIN,    type: "quick", label: "Anytime",    icon: "🥤", color: C.electric, blurb: "Hit your number. Fairlife is your friend." },
  };

  const activeList = FOOD_LISTS[foodFilter];
  const ringColor = pct >= 100 ? C.moss : pct >= 70 ? C.amber : C.rust;

  // Calorie ring color logic differs based on goal:
  // - Cutting: under = good (moss), at target = amber, over = rust (you ate too much)
  // - Maintain: at target = moss, far either way = amber
  // - Bulking: under = rust (need more), at target = moss
  let calRingColor;
  if (goalInfo.delta < 0) {
    // Cut/Lean: staying under target is the win
    calRingColor = todayCalories <= calorieTarget ? (calPct >= 70 ? C.moss : C.amber) : C.rust;
  } else if (goalInfo.delta > 0) {
    // Bulk: hit target or just above
    calRingColor = todayCalories >= calorieTarget * 0.95 ? C.moss : calPct >= 70 ? C.amber : C.rust;
  } else {
    // Maintain: close to target
    const variance = Math.abs(todayCalories - calorieTarget) / calorieTarget;
    calRingColor = variance <= 0.10 ? C.moss : variance <= 0.20 ? C.amber : C.rust;
  }

  return (
    <>
      {!guideOnly && <>
      <PageTitle kicker="Fuel · the work">Nutrition</PageTitle>

      {/* ── PROTEIN RING — hero ── */}
      <div className="ease-up-1">
        <Surface accent={ringColor} padding={22}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <Eyebrow color={ringColor}>Today · Protein</Eyebrow>
              <div className="h-serif" style={{ fontSize: 14, color: C.dim, marginTop: 4 }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </div>
            </div>
            <Pill color={ringColor}>{Math.round(pct)}%</Pill>
          </div>

          {/* Ring */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
            <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 100 100" style={{ position: "absolute" }}>
                <circle cx="50" cy="50" r="44" stroke={C.line} strokeWidth="6" fill="none" />
                <circle
                  className="ring-progress"
                  cx="50" cy="50" r="44" stroke={ringColor} strokeWidth="6" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - pct / 100)}
                  style={{ transition: `stroke-dashoffset 0.75s ${SPRING}, stroke 0.3s` }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div className="num-tab h-display" style={{ fontSize: 32, fontWeight: 800, color: ringColor, lineHeight: 0.9, letterSpacing: "-0.03em" }}>
                  <AnimatedNumber value={todayProtein} />
                </div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 2, letterSpacing: "0.08em" }}>
                  / {proteinTarget}g
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.08em", marginBottom: 6 }}>REMAINING</div>
              <div className="num-tab h-display" style={{ fontSize: 36, fontWeight: 700, color: C.bone, letterSpacing: "-0.04em", lineHeight: 0.95 }}>
                {Math.round(remaining)}<span style={{ fontSize: 14, color: C.dim, fontWeight: 500, marginLeft: 4 }}>g</span>
              </div>
              <p className="h-serif" style={{ fontSize: 14, color: C.cream, margin: "10px 0 0", lineHeight: 1.4 }}>
                {pct >= 100 ? "Crushed it. Recovery on lock." : remaining <= 30 ? "One Fairlife away. Easy." : remaining <= 60 ? "Two solid meals to go." : "Big day ahead. Get after it."}
              </p>
            </div>
          </div>

          {/* Quick add buttons */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
            <Eyebrow>Quick Add Protein</Eyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10 }}>
              {[10, 20, 30, 42].map(g => (
                <button key={g} onClick={() => addProtein(g)} className="btn" style={{
                  padding: "12px 0", borderRadius: 12,
                  background: ringColor + "15", border: `1px solid ${ringColor}40`,
                  color: ringColor, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: FONT_DISPLAY, letterSpacing: "-0.01em",
                }}>+{g}g</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <NumIn
                value={customAmount}
                onChange={setCustomAmount}
                placeholder="Custom g (e.g. 24.5)"
                decimal={true}
                step="0.5"
                style={{ flex: 1 }}
              />
              <Btn color={ringColor} size="sm" onClick={() => {
                const v = parseFloat(customAmount);
                if (!isNaN(v) && v > 0) { addProtein(v); setCustomAmount(""); }
              }} disabled={!customAmount || parseFloat(customAmount) <= 0}>Add</Btn>
              {todayProtein > 0 && (
                <Btn ghost color={C.dim} size="sm" onClick={() => {
                  const prev = todayProtein;
                  setProteinAbsolute(0);
                  vibrate(12);
                  toast("Protein reset to 0", { actionLabel: "UNDO", onAction: () => setProteinAbsolute(prev) });
                }}>↺</Btn>
              )}
            </div>
          </div>
        </Surface>
      </div>

      {/* ── CALORIE RING — second hero ── */}
      <div className="ease-up-1">
        <Surface accent={calRingColor} padding={22}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <Eyebrow color={calRingColor}>Today · Calories</Eyebrow>
              <div className="h-serif" style={{ fontSize: 14, color: C.dim, marginTop: 4 }}>
                Goal: <span style={{ color: calRingColor, fontWeight: 600 }}>{goalInfo.label}</span> · {goalInfo.delta < 0 ? `${goalInfo.delta} cal/day` : goalInfo.delta > 0 ? `+${goalInfo.delta} cal/day` : "TDEE"}
              </div>
            </div>
            <Pill color={calRingColor}>{Math.round(calPct)}%</Pill>
          </div>

          {/* Ring */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
            <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 100 100" style={{ position: "absolute" }}>
                <circle cx="50" cy="50" r="44" stroke={C.line} strokeWidth="6" fill="none" />
                <circle
                  className="ring-progress"
                  cx="50" cy="50" r="44" stroke={calRingColor} strokeWidth="6" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - Math.min(100, calPct) / 100)}
                  style={{ transition: `stroke-dashoffset 0.75s ${SPRING}, stroke 0.3s` }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 800, color: calRingColor, lineHeight: 0.9, letterSpacing: "-0.03em" }}>
                  <AnimatedNumber value={todayCalories} format={n => Math.round(n).toLocaleString()} />
                </div>
                <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, marginTop: 2, letterSpacing: "0.08em" }}>
                  / {calorieTarget.toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.08em", marginBottom: 6 }}>
                {calRemaining >= 0 ? "REMAINING" : "OVER BUDGET"}
              </div>
              <div className="num-tab h-display" style={{
                fontSize: 32, fontWeight: 700,
                color: calRemaining >= 0 ? C.bone : C.rust,
                letterSpacing: "-0.04em", lineHeight: 0.95,
              }}>
                {calRemaining >= 0 ? Math.round(calRemaining).toLocaleString() : `+${Math.round(-calRemaining).toLocaleString()}`}
                <span style={{ fontSize: 13, color: C.dim, fontWeight: 500, marginLeft: 4 }}>cal</span>
              </div>
              <p className="h-serif" style={{ fontSize: 13, color: C.cream, margin: "10px 0 0", lineHeight: 1.4 }}>
                {goalInfo.delta < 0 ? (
                  calRemaining >= 0
                    ? (calRemaining < 200 ? "Tight margin. One snack away from over." : calRemaining < 500 ? "Solid pace. Stay disciplined." : "Plenty of room. Don't skip protein.")
                    : "Over your cut target. Tomorrow's a new day."
                ) : goalInfo.delta > 0 ? (
                  calPct >= 100 ? "Hit your bulk target. Fueled to grow." : `Need ${Math.round(calRemaining)} more to hit bulk target.`
                ) : (
                  Math.abs(calRemaining) < 100 ? "Right on maintenance. Locked in." : calRemaining > 0 ? "Room to eat more." : "Slightly over. No big deal."
                )}
              </p>
            </div>
          </div>

          {/* Calorie quick-add buttons */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
            <Eyebrow>Quick Add Calories</Eyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10 }}>
              {[100, 250, 500, 700].map(c => (
                <button key={c} onClick={() => addCalories(c)} className="btn" style={{
                  padding: "12px 0", borderRadius: 12,
                  background: calRingColor + "15", border: `1px solid ${calRingColor}40`,
                  color: calRingColor, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: FONT_DISPLAY, letterSpacing: "-0.01em",
                }}>+{c}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <NumIn
                value={customCalAmount}
                onChange={setCustomCalAmount}
                placeholder="Custom cal (e.g. 320)"
                decimal={false}
                step="10"
                style={{ flex: 1 }}
              />
              <Btn color={calRingColor} size="sm" onClick={() => {
                const v = parseFloat(customCalAmount);
                if (!isNaN(v) && v > 0) { addCalories(v); setCustomCalAmount(""); }
              }} disabled={!customCalAmount || parseFloat(customCalAmount) <= 0}>Add</Btn>
              {todayCalories > 0 && (
                <Btn ghost color={C.dim} size="sm" onClick={() => {
                  const prev = todayCalories;
                  setCaloriesAbsolute(0);
                  vibrate(12);
                  toast("Calories reset to 0", { actionLabel: "UNDO", onAction: () => setCaloriesAbsolute(prev) });
                }}>↺</Btn>
              )}
            </div>
            <p className="h-serif" style={{ fontSize: 12, color: C.mute, margin: "10px 0 0", lineHeight: 1.4, fontStyle: "italic" }}>
              Tip: tapping a meal or food card below auto-adds both protein AND calories at once.
            </p>
          </div>
        </Surface>
      </div>

      </>}
      {/* ── DAILY SUPPLEMENTS ── */}
      <section className="engine-card fuel-card" aria-label="Daily supplements">
        <span className="engine-label">Daily</span>
        <h2>Supplements</h2>
        <p className="engine-muted">
          Tap to log each day. Consistency is the cheat code — keep the streak alive.
        </p>
        <SupplementRow
          name="Vitamin D3"
          dose="5,000 IU"
          icon="☀️"
          accent={C.amber}
          blurb="Bones, joints, immune system, mood. Take with a meal that has some fat."
          log={vitaminD3Log}
          onToggle={onVitaminD3Toggle}
        />
        <SupplementRow
          name="Creatine"
          dose="5 g monohydrate"
          icon="⚡"
          accent={C.electric}
          blurb="Power, explosiveness, recovery. Daily dose matters more than timing — just don't skip."
          log={creatineLog}
          onToggle={onCreatineToggle}
        />
      </section>

      {/* ── GOAL MODE SELECTOR ── */}
      <section className="engine-card fuel-card" aria-label="Eating goal">
        <span className="engine-label">Eating goal</span>
        <h2>{goalInfo.label}</h2>
        <p className="engine-muted">{goalInfo.blurb}</p>
        <div className="fuel-goals" role="group" aria-label="Choose eating goal">
          {Object.entries(GOAL_MODES).map(([key, info]) => (
            <button key={key} type="button" onClick={() => setGoal(key)} className="engine-button" aria-pressed={goal === key}>
              {info.label}
              <small>{info.delta > 0 ? `+${info.delta}` : info.delta}</small>
            </button>
          ))}
        </div>
      </section>

      {/* ── BODY STATS ── */}
      <section className="engine-card fuel-card" aria-label="Your stats and targets">
        <div className="engine-row">
          <span className="engine-label">Your stats</span>
          {!editingBody && <button type="button" className="engine-link" onClick={() => setEditingBody(true)}>Edit</button>}
        </div>
        <div className="fuel-stats">
          <div className="engine-mini"><span className="engine-label">Height</span><strong>{heightFt}'{heightIn}"</strong></div>
          <div className="engine-mini"><span className="engine-label">Weight</span><strong>{bodyStats.weightLbs}<small> lb</small></strong></div>
          <div className="engine-mini"><span className="engine-label">Age</span><strong>{bodyStats.age}</strong></div>
        </div>

        {editingBody && (
          <div className="fuel-edit">
            <div className="fuel-stats">
              <label className="engine-field">Height (in)
                <input type="number" inputMode="decimal" step="0.5" placeholder="77" value={tmpHeight ?? ""} onChange={e => setTmpHeight(e.target.value)} />
              </label>
              <label className="engine-field">Weight (lb)
                <input type="number" inputMode="decimal" step="0.1" placeholder="222" value={tmpWeight ?? ""} onChange={e => setTmpWeight(e.target.value)} />
              </label>
              <label className="engine-field">Age
                <input type="number" inputMode="numeric" step="1" placeholder="47" value={tmpAge ?? ""} onChange={e => setTmpAge(e.target.value)} />
              </label>
            </div>
            <div className="engine-actions">
              <button type="button" className="engine-button primary" onClick={saveBody}>Save stats</button>
              <button type="button" className="engine-button" onClick={() => { setEditingBody(false); setTmpHeight(bodyStats.heightInches); setTmpWeight(bodyStats.weightLbs); setTmpAge(bodyStats.age); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Calculated targets */}
        <h3 className="engine-label fuel-subhead">Daily targets</h3>
        <div className="engine-grid">
          <div className="engine-mini">
            <span className="engine-label">Protein</span>
            <strong>{proteinTarget}g</strong>
            <span className="engine-muted">1g per lb · cut + lift</span>
          </div>
          <div className="engine-mini">
            <span className="engine-label">Calories</span>
            <strong>{calorieTarget.toLocaleString()}</strong>
            <span className="engine-muted">{goalInfo.label} · {goalInfo.delta > 0 ? `+${goalInfo.delta}` : goalInfo.delta} from TDEE</span>
          </div>
        </div>
      </section>

      {/* ── FOOD GUIDE — filter chips + list ── */}
      <section className="engine-card fuel-card" aria-label="Food guide">
        <span className="engine-label">{activeList.label} · Kosher</span>
        <h2>Food guide</h2>
        <div className="engine-chips fuel-chips" role="group" aria-label="Food guide category">
          {Object.entries(FOOD_LISTS).map(([key, info]) => (
            <button key={key} type="button" onClick={() => setFoodFilter(key)} className="engine-chip" aria-pressed={foodFilter === key}>
              <span aria-hidden="true">{info.icon} </span>{info.label}
            </button>
          ))}
        </div>
        <p className="engine-muted">{activeList.blurb}</p>

        {activeList.type === "meal" ? (
          /* ── MEAL CARDS — full plate view ── */
          activeList.items.map((meal, i) => (
            <div key={i} className="fuel-food">
              <div className="engine-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong className="fuel-name">{meal.name}</strong>
                  <div className="engine-muted fuel-num">{meal.totalProtein}g protein · ~{meal.calories} cal</div>
                  {meal.timing && <div className="fuel-timing">{meal.timing}</div>}
                </div>
                <button type="button" onClick={() => logFood(meal)} className="engine-button fuel-log" aria-label={`Log ${meal.name}: ${meal.totalProtein}g protein, ${meal.calories} calories`}>
                  Log meal
                  <small>+{meal.totalProtein}g · {meal.calories}c</small>
                </button>
              </div>

              {/* Components — what's actually on the plate */}
              <div className="engine-mini fuel-plate">
                <span className="engine-label">On the plate</span>
                <ul>
                  {meal.components.map((c, ci) => <li key={ci}>{c}</li>)}
                </ul>
              </div>

              {meal.why && <p className="engine-muted">{meal.why}</p>}
              {meal.bestFor && <span className="fuel-tag">Best for: {meal.bestFor}</span>}
            </div>
          ))
        ) : (
          /* ── QUICK CARDS — single ingredient/product view ── */
          activeList.items.map((food, i) => (
            <div key={i} className="fuel-food engine-row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong className="fuel-name">{food.name}</strong>
                <div className="engine-muted fuel-num">{food.protein}g protein{food.calories ? ` · ${food.calories} cal` : ""}</div>
                {food.timing && <div className="fuel-timing">{food.timing}</div>}
                <p className="engine-muted">{food.note}</p>
              </div>
              <button type="button" onClick={() => logFood(food)} className="engine-button fuel-log" aria-label={`Log ${food.name}: ${food.protein}g protein${food.calories ? `, ${food.calories} calories` : ""}`}>
                +{food.protein}g
                {food.calories ? <small>{food.calories}c</small> : null}
              </button>
            </div>
          ))
        )}
      </section>

      {/* ── KOSHER NOTES ── */}
      <section className="engine-card fuel-card" aria-label="Kosher notes and hydration">
        <span className="engine-label">Kosher notes</span>
        <p>
          All items above are commonly available with reliable hechshers (OU, OK, Star-K). Fairlife Core Power and Quest Bars are widely OU certified — easy gym-bag staples. Always double-check the label, since certifications change. For meat/dairy timing, plan post-workout shakes around your meals.
        </p>
        <h3 className="engine-label fuel-subhead">Hydration</h3>
        <p>
          Target ~{Math.round(bodyStats.weightLbs * 0.6)} oz water per day. Add 16–24 oz extra on training days. Electrolytes (LMNT, plain salt + lemon) on heavy sweat sessions.
        </p>
      </section>

      <p className="engine-muted fuel-quote">
        "You are what you eat. Eat to be unstoppable."
        <span className="engine-label">— The work</span>
      </p>
    </>
  );
}
