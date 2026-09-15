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
      if (navigator.vibrate) navigator.vibrate(8);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          fontSize: 22, width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: accent + "15", border: `1px solid ${accent}30`,
        }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="h-display" style={{ fontSize: 17, fontWeight: 700, color: C.bone, letterSpacing: "-0.02em" }}>{name}</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.06em", marginTop: 2 }}>
            {dose}{streak > 0 ? ` · 🔥 ${streak} day${streak === 1 ? "" : "s"}` : ""}
          </div>
        </div>
        <button onClick={toggle} className="btn" style={{
          flexShrink: 0, padding: "10px 18px", borderRadius: 14,
          background: takenToday ? accent : "transparent",
          border: `1px solid ${takenToday ? accent : accent + "55"}`,
          color: takenToday ? C.ink : accent,
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          fontFamily: FONT_DISPLAY, letterSpacing: "-0.01em",
        }}>{takenToday ? "✓ Taken" : "Log it"}</button>
      </div>

      {/* 7-day trail */}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {trail.map(d => (
          <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: "100%", height: 6, borderRadius: 3,
              background: d.done ? accent : C.line,
              outline: d.isToday ? `1px solid ${accent}` : "none", outlineOffset: 1,
            }} />
            <div style={{ fontSize: 9, color: d.isToday ? accent : C.mute, fontFamily: FONT_MONO }}>{d.letter}</div>
          </div>
        ))}
      </div>

      <p className="h-serif" style={{ fontSize: 13, color: C.cream, margin: "10px 0 0", lineHeight: 1.4 }}>{blurb}</p>
    </div>
  );
}

export function NutritionTab({ bodyStats, onUpdateBody, proteinLog, onProteinChange, calorieLog, onCalorieChange, vitaminD3Log, onVitaminD3Toggle, creatineLog, onCreatineToggle }) {
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
      if (navigator.vibrate) navigator.vibrate(8);
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
      if (navigator.vibrate) navigator.vibrate(8);
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
                  if (navigator.vibrate) navigator.vibrate(12);
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
                  if (navigator.vibrate) navigator.vibrate(12);
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

      {/* ── DAILY SUPPLEMENTS ── */}
      <div className="ease-up-2">
        <Surface accent={C.plum}>
          <Eyebrow color={C.plum}>Daily · Supplements</Eyebrow>
          <p className="h-serif" style={{ fontSize: 14, color: C.cream, margin: "8px 0 18px", lineHeight: 1.4 }}>
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
          <div style={{ height: 1, background: C.line, margin: "18px 0" }} />
          <SupplementRow
            name="Creatine"
            dose="5 g monohydrate"
            icon="⚡"
            accent={C.electric}
            blurb="Power, explosiveness, recovery. Daily dose matters more than timing — just don't skip."
            log={creatineLog}
            onToggle={onCreatineToggle}
          />
        </Surface>
      </div>

      {/* ── GOAL MODE SELECTOR ── */}
      <div className="ease-up-2">
        <Surface accent={C[goalInfo.color]}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <Eyebrow color={C[goalInfo.color]}>Eating Goal</Eyebrow>
              <p className="h-serif" style={{ fontSize: 14, color: C.cream, margin: "8px 0 0", lineHeight: 1.4 }}>
                {goalInfo.blurb}
              </p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {Object.entries(GOAL_MODES).map(([key, info]) => {
              const active = goal === key;
              const c = C[info.color];
              return (
                <button key={key} onClick={() => setGoal(key)} className="btn" style={{
                  padding: "12px 4px", borderRadius: 12,
                  background: active ? c : "transparent",
                  border: `1px solid ${active ? c : C.line}`,
                  color: active ? C.ink : C.cream,
                  fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em",
                  cursor: "pointer",
                }}>
                  <div style={{ fontSize: 14 }}>{info.label}</div>
                  <div style={{ fontSize: 10, fontFamily: FONT_MONO, marginTop: 3, opacity: 0.85 }}>
                    {info.delta > 0 ? `+${info.delta}` : info.delta}
                  </div>
                </button>
              );
            })}
          </div>
        </Surface>
      </div>

      {/* ── BODY STATS ── */}
      <div className="ease-up-2">
        <Surface accent={C.electric}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <Eyebrow color={C.electric}>Your Stats</Eyebrow>
              <div style={{ display: "flex", gap: 18, marginTop: 12 }}>
                <div>
                  <div className="num-tab h-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: C.bone }}>
                    {heightFt}'{heightIn}"
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 3, letterSpacing: "0.08em" }}>HEIGHT</div>
                </div>
                <div>
                  <div className="num-tab h-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: C.bone }}>
                    {bodyStats.weightLbs}<span style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>lb</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 3, letterSpacing: "0.08em" }}>WEIGHT</div>
                </div>
                <div>
                  <div className="num-tab h-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: C.bone }}>
                    {bodyStats.age}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 3, letterSpacing: "0.08em" }}>AGE</div>
                </div>
              </div>
            </div>
            {!editingBody && <Btn ghost color={C.electric} size="sm" onClick={() => setEditingBody(true)}>Edit</Btn>}
          </div>

          {editingBody && (
            <div className="ease-up" style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={{ textAlign: "center" }}><Eyebrow>Height (in)</Eyebrow></div>
                  <div style={{ height: 5 }} />
                  <NumIn value={tmpHeight} onChange={setTmpHeight} decimal={true} step="0.5" placeholder="77" />
                </div>
                <div>
                  <div style={{ textAlign: "center" }}><Eyebrow>Weight (lb)</Eyebrow></div>
                  <div style={{ height: 5 }} />
                  <NumIn value={tmpWeight} onChange={setTmpWeight} decimal={true} step="0.1" placeholder="222" />
                </div>
                <div>
                  <div style={{ textAlign: "center" }}><Eyebrow>Age</Eyebrow></div>
                  <div style={{ height: 5 }} />
                  <NumIn value={tmpAge} onChange={setTmpAge} decimal={false} step="1" placeholder="47" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn ghost color={C.dim} onClick={() => { setEditingBody(false); setTmpHeight(bodyStats.heightInches); setTmpWeight(bodyStats.weightLbs); setTmpAge(bodyStats.age); }} style={{ flex: 1 }}>Cancel</Btn>
                <Btn color={C.electric} onClick={saveBody} style={{ flex: 1.5 }}>Save Stats</Btn>
              </div>
            </div>
          )}

          {/* Calculated targets */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Eyebrow color={C.rust}>Daily Protein</Eyebrow>
              <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 700, color: C.rust, letterSpacing: "-0.03em", marginTop: 6 }}>
                {proteinTarget}<span style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginLeft: 3 }}>g</span>
              </div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4 }}>1g per lb · cut + lift</div>
            </div>
            <div>
              <Eyebrow color={C[goalInfo.color]}>Daily Calories</Eyebrow>
              <div className="num-tab h-display" style={{ fontSize: 26, fontWeight: 700, color: C[goalInfo.color], letterSpacing: "-0.03em", marginTop: 6 }}>
                {calorieTarget.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4 }}>
                {goalInfo.label.toUpperCase()} · {goalInfo.delta > 0 ? `+${goalInfo.delta}` : goalInfo.delta} from TDEE
              </div>
            </div>
          </div>
        </Surface>
      </div>

      {/* ── FOOD GUIDE FILTER — horizontal scroll for 5 categories ── */}
      <div className="ease-up-3" style={{
        display: "flex", gap: 6, marginBottom: 12,
        overflowX: "auto", paddingBottom: 4,
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}>
        {Object.entries(FOOD_LISTS).map(([key, info]) => (
          <button key={key} onClick={() => setFoodFilter(key)} className="btn" style={{
            flexShrink: 0, padding: "10px 14px",
            background: foodFilter === key ? info.color : "transparent",
            border: `1px solid ${foodFilter === key ? info.color : C.line}`,
            color: foodFilter === key ? C.ink : C.cream,
            borderRadius: 12, cursor: "pointer",
            fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 14, marginRight: 4 }}>{info.icon}</span>
            {info.label}
          </button>
        ))}
      </div>

      <div className="ease-up-4">
        <Surface accent={activeList.color}>
          <div style={{ marginBottom: 14 }}>
            <Eyebrow color={activeList.color}>{activeList.label} · Kosher</Eyebrow>
            <p className="h-serif" style={{ fontSize: 16, color: C.cream, margin: "8px 0 0", lineHeight: 1.4 }}>
              {activeList.blurb}
            </p>
          </div>

          {activeList.type === "meal" ? (
            /* ── MEAL CARDS — full plate view ── */
            activeList.items.map((meal, i) => (
              <div key={i} style={{
                padding: "18px 0",
                borderBottom: i < activeList.items.length - 1 ? `1px solid ${C.line}` : "none",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.bone, letterSpacing: "-0.015em", marginBottom: 4 }}>
                      {meal.name}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <span className="num-tab" style={{
                        fontSize: 13, color: activeList.color, fontWeight: 700, fontFamily: FONT_MONO,
                      }}>{meal.totalProtein}g protein</span>
                      <span style={{ fontSize: 11, color: C.mute, fontFamily: FONT_MONO }}>·</span>
                      <span className="num-tab" style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>
                        ~{meal.calories} cal
                      </span>
                    </div>
                    {meal.timing && (
                      <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 6, letterSpacing: "0.05em" }}>
                        {meal.timing.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button onClick={() => logFood(meal)} className="btn" style={{
                    background: activeList.color + "15",
                    border: `1px solid ${activeList.color}40`,
                    color: activeList.color,
                    padding: "10px 14px", borderRadius: 10,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: FONT_DISPLAY, flexShrink: 0,
                  }}>
                    LOG MEAL<br/>
                    <span style={{ fontSize: 13 }}>+{meal.totalProtein}g · {meal.calories}c</span>
                  </button>
                </div>

                {/* Components — what's actually on the plate */}
                <div style={{
                  background: C.raised, borderRadius: 10, padding: "12px 14px",
                  border: `1px solid ${C.line}`, marginTop: 8,
                }}>
                  <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, letterSpacing: "0.08em", marginBottom: 8 }}>
                    ON THE PLATE
                  </div>
                  {meal.components.map((c, ci) => (
                    <div key={ci} style={{
                      fontSize: 13, color: C.cream, lineHeight: 1.5,
                      paddingLeft: 14, position: "relative", marginBottom: 3,
                    }}>
                      <span style={{ position: "absolute", left: 0, color: activeList.color }}>›</span>
                      {c}
                    </div>
                  ))}
                </div>

                {meal.why && (
                  <p className="h-serif" style={{ fontSize: 13, color: C.dim, margin: "10px 0 0", lineHeight: 1.45, fontStyle: "italic" }}>
                    {meal.why}
                  </p>
                )}
                {meal.bestFor && (
                  <div style={{
                    display: "inline-block",
                    fontSize: 10, color: activeList.color, fontFamily: FONT_MONO,
                    letterSpacing: "0.05em", marginTop: 8,
                    padding: "3px 8px", borderRadius: 6,
                    background: activeList.color + "10",
                    border: `1px solid ${activeList.color}30`,
                  }}>
                    BEST FOR: {meal.bestFor.toUpperCase()}
                  </div>
                )}
              </div>
            ))
          ) : (
            /* ── QUICK CARDS — single ingredient/product view ── */
            activeList.items.map((food, i) => (
              <div key={i} style={{
                padding: "14px 0",
                borderBottom: i < activeList.items.length - 1 ? `1px solid ${C.line}` : "none",
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.bone, letterSpacing: "-0.01em" }}>{food.name}</span>
                    <span className="num-tab" style={{
                      fontSize: 12, color: activeList.color, fontWeight: 700, fontFamily: FONT_MONO,
                    }}>{food.protein}g</span>
                    {food.calories && (
                      <span className="num-tab" style={{
                        fontSize: 11, color: C.dim, fontFamily: FONT_MONO,
                      }}>· {food.calories} cal</span>
                    )}
                  </div>
                  {food.timing && (
                    <div style={{ fontSize: 10, color: C.dim, fontFamily: FONT_MONO, marginTop: 4, letterSpacing: "0.05em" }}>
                      {food.timing.toUpperCase()}
                    </div>
                  )}
                  <p className="h-serif" style={{ fontSize: 13, color: C.dim, margin: "4px 0 0", lineHeight: 1.4 }}>
                    {food.note}
                  </p>
                </div>
                <button onClick={() => logFood(food)} className="btn" style={{
                  background: activeList.color + "15",
                  border: `1px solid ${activeList.color}40`,
                  color: activeList.color,
                  padding: "8px 14px", borderRadius: 10,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: FONT_DISPLAY, flexShrink: 0,
                }}>
                  +{food.protein}g{food.calories ? <><br/><span style={{ fontSize: 10, opacity: 0.85 }}>{food.calories}c</span></> : null}
                </button>
              </div>
            ))
          )}
        </Surface>
      </div>

      {/* ── KOSHER NOTES ── */}
      <Surface accent={C.plum} padding={20}>
        <Eyebrow color={C.plum}>Kosher Notes</Eyebrow>
        <p className="h-serif" style={{ fontSize: 15, color: C.cream, margin: "10px 0 0", lineHeight: 1.5 }}>
          All items above are commonly available with reliable hechshers (OU, OK, Star-K). Fairlife Core Power and Quest Bars are widely OU certified — easy gym-bag staples. Always double-check the label, since certifications change. For meat/dairy timing, plan post-workout shakes around your meals.
        </p>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
          <Eyebrow color={C.amber}>Hydration</Eyebrow>
          <p className="h-serif" style={{ fontSize: 14, color: C.cream, margin: "8px 0 0", lineHeight: 1.5 }}>
            Target ~{Math.round(bodyStats.weightLbs * 0.6)} oz water per day. Add 16–24 oz extra on training days. Electrolytes (LMNT, plain salt + lemon) on heavy sweat sessions.
          </p>
        </div>
      </Surface>

      <p className="h-serif" style={{ textAlign: "center", color: C.dim, fontSize: 16, margin: "24px 0 0" }}>
        "You are what you eat. Eat to be unstoppable."
        <span style={{ display: "block", fontFamily: FONT_MONO, fontStyle: "normal", fontSize: 10, letterSpacing: "0.15em", marginTop: 6 }}>— THE WORK</span>
      </p>
    </>
  );
}
