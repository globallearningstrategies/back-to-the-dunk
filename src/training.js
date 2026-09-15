import React, { useState, useEffect, useRef } from 'react';
import { useUserData } from './data/UserData';
import { C, FONT_DISPLAY, FONT_MONO, TABATA_CONFIG, getAudioCtx, beep, ringAlarm, speak, requestNotificationPermission, fireNotification, PROGRESS_STEP, nextTarget, platesToReach } from './model';
import { Surface, Eyebrow, Pill, Btn, NumIn } from './ui';

export function RepsEditor({ open, currentReps, defaultReps, onSave, onClose, exerciseName, setIndex }) {
  const [val, setVal] = useState("");

  useEffect(() => {
    if (open) setVal(String(currentReps ?? defaultReps ?? ""));
  }, [open, currentReps, defaultReps]);

  if (!open) return null;

  const save = (n) => {
    const num = parseFloat(n);
    if (!isNaN(num) && num >= 0) {
      onSave(num);
      onClose();
    }
  };

  // Quick decrement options based on default
  const def = parseFloat(defaultReps) || 8;
  const quickOpts = [
    Math.max(1, def - 4),
    Math.max(1, def - 2),
    def,
    def + 2,
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="backdrop" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="ease-up" style={{
        background: C.panel, borderRadius: 22, padding: 24,
        maxWidth: 360, width: "100%",
        border: `1px solid ${C.line}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
      }}>
        <Eyebrow color={C.rust}>Set {setIndex + 1} · {exerciseName}</Eyebrow>
        <h3 className="h-display" style={{ fontSize: 22, margin: "10px 0 4px", color: C.bone }}>How many reps?</h3>
        <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO, marginBottom: 16 }}>
          Target was {defaultReps}. Hit what you hit.
        </div>

        <input
          type="number" inputMode="decimal" step="0.5"
          value={val} onChange={e => setVal(e.target.value)}
          autoFocus
          style={{
            width: "100%", padding: "16px",
            background: C.raised, border: `2px solid ${C.rust}55`,
            borderRadius: 14, color: C.bone,
            fontSize: 32, fontWeight: 700, fontFamily: FONT_DISPLAY,
            textAlign: "center", outline: "none",
            letterSpacing: "-0.03em", marginBottom: 14,
          }}
          onKeyDown={e => e.key === "Enter" && save(val)}
        />

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${quickOpts.length}, 1fr)`, gap: 6, marginBottom: 16 }}>
          {quickOpts.map(opt => (
            <button key={opt} onClick={() => save(opt)} className="btn" style={{
              padding: "10px 0", borderRadius: 10,
              background: opt === def ? C.rust + "20" : C.raised,
              border: `1px solid ${opt === def ? C.rust + "55" : C.line}`,
              color: opt === def ? C.rust : C.cream,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: FONT_DISPLAY,
            }}>{opt}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn ghost color={C.dim} onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
          <Btn color={C.rust} onClick={() => save(val)} style={{ flex: 1.5 }}>Save Reps</Btn>
        </div>
      </div>
    </div>
  );
}

export function RestTimer({ seconds, onClose, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  const [ringing, setRinging] = useState(false);
  const ringIntervalRef = useRef(null);

  useEffect(() => {
    if (remaining <= 0) {
      // ALARM: ring the alarm + repeat it twice for ~3 seconds total
      ringAlarm();
      setRinging(true);
      speak("Time to lift");
      fireNotification("⏰ Rest done", "Get back under the bar.");
      if (navigator.vibrate) navigator.vibrate([200, 80, 200, 80, 400]);

      // Repeat alarm
      let count = 0;
      ringIntervalRef.current = setInterval(() => {
        count++;
        if (count >= 2) {
          clearInterval(ringIntervalRef.current);
          setRinging(false);
          onClose && onClose();
        } else {
          ringAlarm();
          if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
        }
      }, 1700);
      return () => { if (ringIntervalRef.current) clearInterval(ringIntervalRef.current); };
    }
    if (remaining === 10) { beep(660, 0.1, 0.4); speak("Ten seconds"); }
    if (remaining <= 3 && remaining > 0) beep(660, 0.1, 0.4);
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const dismiss = () => {
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    setRinging(false);
    onClose && onClose();
  };

  const pct = ((seconds - remaining) / seconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = Math.max(0, remaining % 60);
  const display = mins > 0 ? `${mins}:${String(secs).padStart(2,"0")}` : String(Math.max(0, remaining));

  return (
    <div
      className={ringing ? "alarm-shake" : ""}
      style={{
        position: "fixed", bottom: 76, left: 0, right: 0,
        background: ringing ? C.rust : C.panel,
        borderTop: `1px solid ${ringing ? C.rust : C.line}`,
        padding: "16px 20px 20px", zIndex: 95,
        animation: ringing ? undefined : "ease-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        boxShadow: ringing ? `0 -8px 30px ${C.rust}55` : "0 -8px 30px rgba(0,0,0,0.08)",
        transition: "background 0.3s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <Eyebrow color={ringing ? C.ink : C.electric}>{ringing ? "TIME!" : "Rest Timer"}</Eyebrow>
          <div className="num-tab h-display" style={{
            fontSize: 36, fontWeight: 700,
            color: ringing ? C.ink : C.electric,
            letterSpacing: "-0.04em", lineHeight: 1, marginTop: 4,
          }}>
            {ringing ? "🔔 GO!" : display}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!ringing && <Btn ghost color={C.dim} onClick={() => setRemaining(r => Math.min(seconds, r + 30))} size="sm">+30s</Btn>}
          <Btn color={ringing ? C.ink : C.electric} ghost={ringing} onClick={dismiss} size="sm" style={ringing ? { color: C.ink, borderColor: C.ink } : {}}>
            {ringing ? "Stop" : "Skip"}
          </Btn>
        </div>
      </div>
      {!ringing && (
        <div style={{ background: C.raised, borderRadius: 999, height: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: pct + "%",
            background: `linear-gradient(90deg, ${C.electric}, ${C.moss})`,
            borderRadius: 999, transition: "width 1s linear",
          }} />
        </div>
      )}
    </div>
  );
}

export const PLATES = [
  { weight: 45, color: "#3B82F6", height: 80, width: 12 },
  { weight: 35, color: "#EAB308", height: 70, width: 11 },
  { weight: 25, color: "#22C55E", height: 60, width: 10 },
  { weight: 10, color: "#FFFFFF", height: 44, width: 9  },
  { weight: 5,  color: "#6B7280", height: 34, width: 8  },
  { weight: 2.5,color: "#374151", height: 26, width: 7  },
];

export function parsePlates(str) {
  if (!str) return [];
  try { return JSON.parse(str); } catch(e) { return []; }
}

export function BarbellInput({ vals, onVal, lastPerf }) {
  const platesStr = vals?.plates || "[]";
  const plates = parsePlates(platesStr);
  const perSide = plates.reduce((sum, w) => sum + w, 0);
  const total = 45 + perSide * 2;
  const isEmpty = plates.length === 0;
  const lastPlates = lastPerf ? platesToReach(lastPerf.weight) : null;

  const addPlate = (weight) => {
    const next = [...plates, weight].sort((a,b) => b-a);
    onVal("plates", JSON.stringify(next));
    onVal("perSide", String(perSide + weight));
  };

  const removePlate = (idx) => {
    const next = [...plates];
    next.splice(idx, 1);
    onVal("plates", JSON.stringify(next));
    onVal("perSide", String(plates.reduce((s,w,i) => i === idx ? s : s+w, 0)));
  };

  const clearAll = () => {
    onVal("plates", "[]");
    onVal("perSide", "0");
  };

  const loadLast = () => {
    if (!lastPlates) return;
    onVal("plates", JSON.stringify([...lastPlates].sort((a,b) => b-a)));
    onVal("perSide", String(lastPlates.reduce((a,b) => a+b, 0)));
  };

  // Visualize: render plates from heaviest (innermost) to lightest (outermost)
  return (
    <div style={{
      background: C.raised, borderRadius: 14, padding: 14, marginTop: 10,
      border: `1px solid ${C.line}`,
    }}>
      {/* Total readout */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>BARBELL · 45 LB BAR</span>
        <span className="num-tab" style={{ fontSize: 24, fontWeight: 700, color: C.rust, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {total}<span style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginLeft: 4 }}>lbs</span>
        </span>
      </div>

      {/* "Load last" prompt — only shows when bar is empty AND we have history */}
      {isEmpty && lastPerf && lastPlates && (
        <button onClick={loadLast} className="btn"
          style={{
            width: "100%", padding: "10px 12px", marginBottom: 12,
            background: "transparent",
            border: `1px dashed ${C.electric}`,
            borderRadius: 10,
            color: C.electric,
            fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.05em",
            cursor: "pointer", textTransform: "uppercase", fontWeight: 600,
          }}>
          ↻ Load last: {lastPerf.weight} lb × {String(lastPerf.reps).split(",")[0]} reps
          {lastPerf.daysAgo !== null && (
            <span style={{ color: C.mute, marginLeft: 6, fontSize: 9 }}>
              ({lastPerf.daysAgo === 0 ? "today" : lastPerf.daysAgo === 1 ? "1d ago" : `${lastPerf.daysAgo}d ago`})
            </span>
          )}
        </button>
      )}
      {isEmpty && lastPerf && !lastPlates && (
        <div style={{
          marginBottom: 12, padding: "8px 12px",
          fontFamily: FONT_MONO, fontSize: 10, color: C.mute,
          letterSpacing: "0.05em", textAlign: "center",
        }}>
          LAST: {lastPerf.weight} LB × {String(lastPerf.reps).split(",")[0]} (can't auto-load — odd plate combo)
        </div>
      )}

      {/* Progressive overload nudge — bump the last weight by +5 */}
      {lastPerf && total < nextTarget(lastPerf.weight) && platesToReach(nextTarget(lastPerf.weight)) && (
        <button onClick={() => {
            const pl = platesToReach(nextTarget(lastPerf.weight));
            onVal("plates", JSON.stringify([...pl].sort((a, b) => b - a)));
            onVal("perSide", String(pl.reduce((a, b) => a + b, 0)));
            if (navigator.vibrate) navigator.vibrate(8);
          }} className="btn"
          style={{
            width: "100%", padding: "10px 12px", marginBottom: 12,
            background: `${C.moss}12`, border: `1px solid ${C.moss}55`, borderRadius: 10,
            color: C.moss, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.05em",
            cursor: "pointer", textTransform: "uppercase", fontWeight: 700,
          }}>
          ↗ Progress to {nextTarget(lastPerf.weight)} lb
          <span style={{ color: C.mute, marginLeft: 6, fontSize: 9 }}>(was {lastPerf.weight})</span>
        </button>
      )}

      {/* Visual barbell */}
      <div style={{
        background: "linear-gradient(180deg, #1A1814 0%, #0F0E0C 100%)", borderRadius: 10, padding: "16px 8px",
        marginBottom: 14, height: 110,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        border: `1px solid ${C.faint}`,
      }}>
        {/* Bar end caps */}
        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Left side plates - reversed (lightest outside) */}
          {[...plates].reverse().map((w, i) => {
            const p = PLATES.find(pl => pl.weight === w);
            if (!p) return null;
            return (
              <div key={"L"+i} onClick={() => removePlate(plates.length - 1 - i)} className="btn"
                style={{
                  width: p.width, height: p.height,
                  background: p.color, borderRadius: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff",
                  cursor: "pointer", flexShrink: 0,
                  boxShadow: "inset -1px 0 0 rgba(0,0,0,0.2)",
                }}>
                {p.weight === 2.5 ? "" : Math.floor(p.weight)}
              </div>
            );
          })}
          {/* Bar */}
          <div style={{ width: 6, height: 14, background: "#D1D5DB", borderRadius: 1 }} />
          <div style={{ width: 60, height: 5, background: "linear-gradient(180deg, #E5E7EB 0%, #6B7280 100%)", borderRadius: 1 }} />
          <div style={{ width: 6, height: 14, background: "#D1D5DB", borderRadius: 1 }} />
          {/* Right side plates */}
          {plates.map((w, i) => {
            const p = PLATES.find(pl => pl.weight === w);
            if (!p) return null;
            return (
              <div key={"R"+i} onClick={() => removePlate(i)} className="btn"
                style={{
                  width: p.width, height: p.height,
                  background: p.color, borderRadius: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff",
                  cursor: "pointer", flexShrink: 0,
                  boxShadow: "inset 1px 0 0 rgba(0,0,0,0.2)",
                }}>
                {p.weight === 2.5 ? "" : Math.floor(p.weight)}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {plates.length === 0 && (
          <div style={{ position: "absolute", bottom: 6, fontSize: 10, color: C.mute, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>
            JUST THE BAR · TAP A PLATE BELOW
          </div>
        )}
        {plates.length > 0 && (
          <div style={{ position: "absolute", bottom: 6, fontSize: 10, color: C.dim, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>
            +{perSide} lbs PER SIDE · TAP PLATE TO REMOVE
          </div>
        )}
      </div>

      {/* Plate selector buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 10 }}>
        {PLATES.map(p => (
          <button key={p.weight} onClick={() => addPlate(p.weight)} className="btn"
            style={{
              padding: "10px 4px", borderRadius: 10,
              background: p.color === "#FFFFFF" ? "#F9FAFB" : p.color + "20",
              border: `1.5px solid ${p.color === "#FFFFFF" ? "#9CA3AF" : p.color}`,
              color: p.color === "#FFFFFF" ? "#374151" : p.color,
              fontFamily: FONT_DISPLAY,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              letterSpacing: "-0.01em",
            }}>
            +{p.weight}
          </button>
        ))}
      </div>

      {/* Clear */}
      {plates.length > 0 && (
        <button onClick={clearAll} className="btn"
          style={{
            width: "100%", padding: "8px", borderRadius: 8,
            background: "transparent", border: `1px solid ${C.line}`,
            color: C.dim, fontSize: 11, cursor: "pointer",
            fontFamily: FONT_MONO, letterSpacing: "0.05em",
          }}>
          CLEAR ALL PLATES
        </button>
      )}
    </div>
  );
}

export function ExRow({ ex, checked, onCheck, vals, onVal, color, onRest, lastPerf, onEditReps }) {
  const setsDone = parseInt(vals?.setsDone) || 0;
  const targetSets = parseInt(ex.sets) || 0;
  const allSetsDone = setsDone >= targetSets && targetSets > 0;
  const customReps = vals?.customReps || {};

  // Auto-check the exercise when all sets done
  useEffect(() => {
    if (allSetsDone && !checked) onCheck();
    if (!allSetsDone && checked && setsDone > 0) onCheck(); // uncheck if user removes a set
  }, [allSetsDone]);

  const tapSet = (i) => {
    const newCount = setsDone === i + 1 ? i : i + 1;
    onVal("setsDone", String(newCount));
    // Trigger rest timer when ADDING a set (not when un-tapping)
    if (newCount > setsDone && newCount < targetSets && onRest) {
      onRest();
    }
    // Subtle haptic-like beep + vibration
    beep(880, 0.04, 0.15);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const longPressTimer = useRef(null);
  const longPressFiredRef = useRef(false);

  const handlePressStart = (i) => {
    longPressFiredRef.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFiredRef.current = true;
      // Open reps editor for this specific set
      if (onEditReps) {
        onEditReps(i, customReps[i] !== undefined ? customReps[i] : ex.reps);
      }
      beep(660, 0.15, 0.4);
      if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
    }, 500);
  };
  const handlePressEnd = (e, i) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (longPressFiredRef.current) {
      // Long press handled it — prevent the click
      e.preventDefault?.();
      e.stopPropagation?.();
    }
  };

  // Reset all reps (separate gesture: tap reset button)
  const resetAllSets = () => {
    onVal("setsDone", "0");
    onVal("customReps", {});
    beep(440, 0.2, 0.4);
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
  };

  return (
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: ex.timed || ex.noWeight ? 0 : 12 }}>
        <button
          onClick={onCheck} className="btn"
          style={{
            width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginTop: 2, padding: 0,
            background: checked ? color : "transparent",
            border: `1.5px solid ${checked ? color : C.faint}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {checked && <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1 5L4.5 8.5L12 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em",
            color: checked ? C.dim : C.bone,
            textDecoration: checked ? "line-through" : "none",
            textDecorationColor: C.dim,
          }}>{ex.name}</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 3, fontFamily: FONT_MONO, letterSpacing: "0.02em" }}>
            {ex.sets} × {ex.reps}{ex.note ? ` · ${ex.note}` : ""}
          </div>
        </div>
        {!ex.noWeight && !ex.timed && !ex.bodyweight && !ex.barbell && (
          <div style={{ width: 72, flexShrink: 0 }}>
            {lastPerf && (parseFloat(vals?.weight) || 0) < nextTarget(lastPerf.weight) ? (
              <button onClick={() => onVal("weight", String(nextTarget(lastPerf.weight)))} className="btn"
                title={`Last: ${lastPerf.weight} lb. Tap to bump +${PROGRESS_STEP}.`}
                style={{
                  background: "transparent", border: "none", padding: 0,
                  fontSize: 11, fontFamily: FONT_MONO, color: C.moss,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  fontWeight: 700, cursor: "pointer", textAlign: "center", width: "100%",
                  marginBottom: 2, lineHeight: 1.2,
                }}>
                ↗ {nextTarget(lastPerf.weight)}
                <div style={{ fontSize: 8, color: C.mute, marginTop: 1, fontWeight: 500 }}>
                  WAS {lastPerf.weight}
                </div>
              </button>
            ) : (
              <div style={{ textAlign: "center" }}><Eyebrow>lbs</Eyebrow></div>
            )}
            <div style={{ height: 2 }} />
            <NumIn
              value={vals?.weight}
              onChange={v => onVal("weight", v)}
              placeholder={lastPerf ? String(lastPerf.weight) : "0"}
              decimal={true}
              step="0.5"
            />
          </div>
        )}
      </div>

      {/* Set dots — tap to track each completed set, hold to edit reps */}
      {!ex.noWeight && !ex.timed && (
        <div style={{ display: "flex", gap: 8, paddingLeft: 40, alignItems: "center", flexWrap: "wrap" }}>
          {Array.from({ length: targetSets }).map((_, i) => {
            const done = i < setsDone;
            const repsForSet = customReps[i] !== undefined ? customReps[i] : ex.reps;
            const isCustom = customReps[i] !== undefined && String(customReps[i]) !== String(ex.reps);
            return (
              <button
                key={i}
                onClick={(e) => {
                  if (longPressFiredRef.current) {
                    longPressFiredRef.current = false;
                    return;
                  }
                  tapSet(i);
                }}
                onMouseDown={() => handlePressStart(i)}
                onMouseUp={(e) => handlePressEnd(e, i)}
                onMouseLeave={(e) => handlePressEnd(e, i)}
                onTouchStart={() => handlePressStart(i)}
                onTouchEnd={(e) => handlePressEnd(e, i)}
                onContextMenu={(e) => e.preventDefault()}
                className="btn"
                style={{
                  width: 38, height: 38, borderRadius: "50%", padding: 0,
                  background: done ? color : "transparent",
                  border: `2px solid ${done ? color : C.faint}`,
                  color: done ? "#fff" : C.dim,
                  fontSize: 12, fontWeight: 700,
                  fontFamily: FONT_DISPLAY,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  position: "relative",
                  outline: isCustom ? `1px solid ${C.amber}` : "none",
                  outlineOffset: isCustom ? 2 : 0,
                }}
              >
                {repsForSet}
              </button>
            );
          })}
          <span style={{ fontSize: 11, color: C.dim, fontFamily: FONT_MONO, marginLeft: 4 }}>
            {setsDone}/{targetSets}
          </span>
          {setsDone > 0 && (
            <button onClick={resetAllSets} className="btn" style={{
              background: "transparent", border: "none",
              color: C.mute, fontSize: 10, cursor: "pointer",
              fontFamily: FONT_MONO, letterSpacing: "0.05em",
              marginLeft: "auto", padding: "4px 8px",
            }}>RESET</button>
          )}
        </div>
      )}
      {!ex.noWeight && !ex.timed && targetSets > 0 && (
        <div style={{ paddingLeft: 40, marginTop: 6, fontSize: 9, color: C.mute, fontFamily: FONT_MONO, letterSpacing: "0.05em" }}>
          TAP TO MARK SET · HOLD TO CHANGE REPS
        </div>
      )}

      {ex.barbell && <BarbellInput vals={vals} onVal={onVal} lastPerf={lastPerf} />}
    </div>
  );
}

export function TabataTimer({ onLog, loggedToday }) {
  const [phase, setPhase] = useState("idle");
  const [round, setRound] = useState(1);
  const [count, setCount] = useState(TABATA_CONFIG.sprintSec);
  const [countdown, setCountdown] = useState(null);
  const wakeLockRef = useRef(null);

  const requestWakeLock = async () => {
    try { if ("wakeLock" in navigator) wakeLockRef.current = await navigator.wakeLock.request("screen"); } catch(e) {}
  };
  const releaseWakeLock = () => {
    try { if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; } } catch(e) {}
  };

  const start = () => { getAudioCtx(); requestNotificationPermission(); requestWakeLock(); setCountdown(5); };
  const reset = () => { releaseWakeLock(); setPhase("idle"); setRound(1); setCount(TABATA_CONFIG.sprintSec); setCountdown(null); };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null); beep(1046, 0.25, 0.5); speak("Sprint!");
      setPhase("sprint"); setRound(1); setCount(TABATA_CONFIG.sprintSec); return;
    }
    beep(660, 0.08, 0.3);
    if (countdown === 3) speak("Get ready");
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    const interval = setInterval(() => {
      setCount(c => {
        if (c > 1) { beep(440, 0.06, 0.2); return c - 1; }
        if (phase === "sprint") {
          beep(523, 0.15, 0.4); speak("Rest");
          fireNotification("😮‍💨 Rest", `Round ${round}/${TABATA_CONFIG.rounds} done. Catch your breath.`);
          setPhase("rest"); return TABATA_CONFIG.restSec;
        }
        else {
          setRound(r => {
            if (r >= TABATA_CONFIG.rounds) {
              ringAlarm(); speak("Done! Great work!");
              fireNotification("🏁 Tabata complete", "8 rounds. 4 minutes. Done.");
              releaseWakeLock(); setPhase("done"); return r;
            }
            beep(880, 0.18, 0.5); speak("Sprint!");
            fireNotification("💥 Sprint!", `Round ${r + 1}/${TABATA_CONFIG.rounds} — go.`);
            setPhase("sprint"); return r + 1;
          });
          return TABATA_CONFIG.sprintSec;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const isSprint = phase === "sprint";
  const isRest = phase === "rest";
  const activeColor = isSprint ? C.moss : C.amber;
  const max = isSprint ? TABATA_CONFIG.sprintSec : TABATA_CONFIG.restSec;
  const pct = ((max - count) / max) * 100;

  return (
    <Surface accent={C.moss} style={{ background: C.panel }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <Pill color={loggedToday ? C.moss : C.amber}>{loggedToday ? "✓ Done today" : "4-min Tabata"}</Pill>
          <h2 className="h-display" style={{ fontSize: 26, margin: "10px 0 4px", color: C.bone }}>Tabata Timer</h2>
          <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>{TABATA_CONFIG.rounds} rounds · {TABATA_CONFIG.sprintSec}s ON / {TABATA_CONFIG.restSec}s OFF · 4 min</div>
          <div style={{ fontSize: 11, color: C.mute, marginTop: 4, fontFamily: FONT_MONO }}>run it when the plan calls for it</div>
        </div>
        {phase === "idle" && countdown === null && <Btn color={C.moss} onClick={start}>Start</Btn>}
      </div>

      {/* Already did it elsewhere? One-tap log without running the timer. */}
      {phase === "idle" && countdown === null && (
        <button onClick={() => { onLog(); beep(880, 0.12, 0.4); if (navigator.vibrate) navigator.vibrate(10); }} className="btn"
          style={{
            width: "100%", marginTop: 16, padding: "11px 12px", borderRadius: 12, cursor: "pointer",
            background: loggedToday ? `${C.moss}12` : "transparent",
            border: `1px ${loggedToday ? "solid" : "dashed"} ${loggedToday ? C.moss : C.dim}66`,
            color: loggedToday ? C.moss : C.dim, fontFamily: FONT_MONO, fontSize: 11,
            letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700,
          }}>
          {loggedToday ? "✓ Tabata logged today · tap to log another" : "✓ Already did it? Log today's tabata"}
        </button>
      )}

      {countdown !== null && (
        <div className="ease-up" style={{ textAlign: "center", padding: "32px 0 12px" }}>
          <Eyebrow color={C.amber}>Get Ready</Eyebrow>
          <div className="num-tab h-display" style={{ fontSize: 140, fontWeight: 800, color: C.amber, lineHeight: 0.85, marginTop: 12 }}>{countdown}</div>
          <Btn ghost color={C.dim} onClick={reset} size="sm" style={{ marginTop: 24 }}>Cancel</Btn>
        </div>
      )}

      {countdown === null && phase !== "idle" && (
        <div className="ease-in" style={{ marginTop: 20 }}>
          {(isSprint || isRest) && (
            <>
              <div style={{ position: "relative", width: 220, height: 220, margin: "0 auto" }}>
                <svg width="220" height="220" viewBox="0 0 100 100" style={{ position: "absolute" }}>
                  <circle cx="50" cy="50" r="45" stroke={C.line} strokeWidth="4" fill="none" />
                  <circle
                    className="ring-progress"
                    cx="50" cy="50" r="45" stroke={activeColor} strokeWidth="4" fill="none"
                    strokeLinecap="round"
                    strokeDasharray="282.7"
                    strokeDashoffset={282.7 - (pct / 100) * 282.7}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <Eyebrow color={C.dim}>R{round} / {TABATA_CONFIG.rounds}</Eyebrow>
                  <div className="num-tab h-display" style={{ fontSize: 90, fontWeight: 800, color: activeColor, lineHeight: 0.9, marginTop: 4 }}>{count}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: activeColor, letterSpacing: "0.2em", marginTop: 2 }}>{isSprint ? "SPRINT" : "REST"}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 24 }}>
                {Array.from({ length: TABATA_CONFIG.rounds }).map((_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: 999,
                    background: i < round - 1 ? C.moss : i === round - 1 ? C.moss + "AA" : C.faint,
                    transition: "all 0.3s",
                  }} />
                ))}
              </div>
              <Btn ghost color={C.dim} onClick={reset} full style={{ marginTop: 20, fontSize: 12 }}>Reset</Btn>
            </>
          )}
          {phase === "done" && (
            <div className="ease-up" style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🏁</div>
              <h3 className="h-display" style={{ fontSize: 28, color: C.moss, margin: "0 0 6px" }}>Done.</h3>
              <p className="h-serif" style={{ fontSize: 18, color: C.cream, margin: "0 0 20px" }}>8 rounds. 4 minutes of work.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn ghost color={C.dim} onClick={reset} style={{ flex: 1 }}>Reset</Btn>
                <Btn color={C.moss} onClick={async () => { if (await onLog()) reset(); }} style={{ flex: 1 }}>Log It</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}

export const FASTBREAK_CONFIG = { sprintSec: 15, floatSec: 45, choices: [10, 12, 15] };

export function FastBreakTimer({ onLog, cardioSessions = [] }) {
  const [minutes, setMinutes] = useState(12);   // one round = 60s, so rounds = minutes
  const [phase, setPhase] = useState("idle");   // idle | sprint | float | done
  const [round, setRound] = useState(1);
  const [count, setCount] = useState(FASTBREAK_CONFIG.sprintSec);
  const [countdown, setCountdown] = useState(null);
  const wakeLockRef = useRef(null);

  const requestWakeLock = async () => {
    try { if ("wakeLock" in navigator) wakeLockRef.current = await navigator.wakeLock.request("screen"); } catch(e) {}
  };
  const releaseWakeLock = () => {
    try { if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; } } catch(e) {}
  };

  const start = () => { getAudioCtx(); requestNotificationPermission(); requestWakeLock(); setCountdown(5); };
  const reset = () => { releaseWakeLock(); setPhase("idle"); setRound(1); setCount(FASTBREAK_CONFIG.sprintSec); setCountdown(null); };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null); beep(1046, 0.25, 0.5); speak("Sprint!");
      setPhase("sprint"); setRound(1); setCount(FASTBREAK_CONFIG.sprintSec); return;
    }
    beep(660, 0.08, 0.3);
    if (countdown === 3) speak("Get ready");
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    const interval = setInterval(() => {
      setCount(c => {
        // Tick beeps only in the last 3s of the float so the long recovery stays quiet.
        if (c > 1) { if (phase === "sprint" || c <= 4) beep(440, 0.06, 0.2); return c - 1; }
        if (phase === "sprint") {
          beep(523, 0.15, 0.4); speak("Easy pace");
          fireNotification("😮‍💨 Float", `Sprint ${round}/${minutes} done — walk it off.`);
          setPhase("float"); return FASTBREAK_CONFIG.floatSec;
        }
        else {
          setRound(r => {
            if (r >= minutes) {
              ringAlarm(); speak("Done! That's game pace!");
              fireNotification("🏁 Fast break drill complete", `${minutes} sprints in ${minutes} minutes. Game shape work.`);
              releaseWakeLock(); setPhase("done"); return r;
            }
            beep(880, 0.18, 0.5); speak("Sprint!");
            fireNotification("💥 Sprint!", `${r + 1}/${minutes} — go hard.`);
            setPhase("sprint"); return r + 1;
          });
          return FASTBREAK_CONFIG.sprintSec;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, minutes]);

  // Progression nudge: after 5 short drills without a long one, push for 15 min.
  const fbDrills = cardioSessions.filter(s => (s.notes || "").startsWith("Fast break"));
  const shortDone = fbDrills.filter(s => (s.duration_min || 0) <= 12).length;
  const longDone = fbDrills.filter(s => (s.duration_min || 0) >= 14).length;
  const nudge15 = shortDone >= 5 && longDone === 0;

  const isSprint = phase === "sprint";
  const isFloat = phase === "float";
  const activeColor = isSprint ? C.electric : C.amber;
  const max = isSprint ? FASTBREAK_CONFIG.sprintSec : FASTBREAK_CONFIG.floatSec;
  const pct = ((max - count) / max) * 100;

  return (
    <Surface accent={C.electric} style={{ background: C.panel }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <Pill color={C.electric}>Game pace</Pill>
          <h2 className="h-display" style={{ fontSize: 26, margin: "10px 0 4px", color: C.bone }}>🏃 Fast Break</h2>
          <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO }}>{FASTBREAK_CONFIG.sprintSec}s SPRINT / {FASTBREAK_CONFIG.floatSec}s FLOAT · {minutes} min</div>
          <div style={{ fontSize: 11, color: C.mute, marginTop: 4, fontFamily: FONT_MONO }}>logs as a Long Interval</div>
        </div>
        {phase === "idle" && countdown === null && <Btn color={C.electric} onClick={start}>Start</Btn>}
      </div>

      {/* Duration picker — a round is one minute, so rounds = minutes */}
      {phase === "idle" && countdown === null && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {FASTBREAK_CONFIG.choices.map(m => (
            <button key={m} className="btn" onClick={() => setMinutes(m)} style={{
              flex: 1, padding: "10px 6px", borderRadius: 12, cursor: "pointer",
              border: `1px solid ${minutes === m ? C.electric : C.line}`,
              background: minutes === m ? `${C.electric}18` : C.raised,
              color: minutes === m ? C.electric : C.dim, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13,
            }}>{m} min</button>
          ))}
        </div>
      )}

      {phase === "idle" && countdown === null && nudge15 && (
        <div style={{
          marginTop: 12, padding: "12px 14px", borderRadius: 12,
          background: `${C.amber}14`, border: `1px solid ${C.amber}44`,
          fontSize: 14, color: C.cream, lineHeight: 1.55,
        }}>
          <b style={{ color: C.amber }}>🔓 Level up:</b> you've banked {shortDone} short
          drills — your engine can handle the full <b>15 minutes</b>. Fifteen sprints
          ≈ one real half of stop-and-go. Tap 15 min and find out.
        </div>
      )}

      {/* Phone stayed on the sideline? One-tap log without running the timer. */}
      {phase === "idle" && countdown === null && (
        <button onClick={() => { onLog(minutes); beep(880, 0.12, 0.4); if (navigator.vibrate) navigator.vibrate(10); }} className="btn"
          style={{
            width: "100%", marginTop: 12, padding: "11px 12px", borderRadius: 12, cursor: "pointer",
            background: "transparent", border: `1px dashed ${C.dim}66`,
            color: C.dim, fontFamily: FONT_MONO, fontSize: 11,
            letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700,
          }}>
          ✓ Already ran it? Log {minutes} sprints · {minutes} min
        </button>
      )}

      {countdown !== null && (
        <div className="ease-up" style={{ textAlign: "center", padding: "32px 0 12px" }}>
          <Eyebrow color={C.amber}>Get Ready</Eyebrow>
          <div className="num-tab h-display" style={{ fontSize: 140, fontWeight: 800, color: C.amber, lineHeight: 0.85, marginTop: 12 }}>{countdown}</div>
          <Btn ghost color={C.dim} onClick={reset} size="sm" style={{ marginTop: 24 }}>Cancel</Btn>
        </div>
      )}

      {countdown === null && phase !== "idle" && (
        <div className="ease-in" style={{ marginTop: 20 }}>
          {(isSprint || isFloat) && (
            <>
              <div style={{ position: "relative", width: 220, height: 220, margin: "0 auto" }}>
                <svg width="220" height="220" viewBox="0 0 100 100" style={{ position: "absolute" }}>
                  <circle cx="50" cy="50" r="45" stroke={C.line} strokeWidth="4" fill="none" />
                  <circle
                    className="ring-progress"
                    cx="50" cy="50" r="45" stroke={activeColor} strokeWidth="4" fill="none"
                    strokeLinecap="round"
                    strokeDasharray="282.7"
                    strokeDashoffset={282.7 - (pct / 100) * 282.7}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <Eyebrow color={C.dim}>SPRINT {round} / {minutes}</Eyebrow>
                  <div className="num-tab h-display" style={{ fontSize: 90, fontWeight: 800, color: activeColor, lineHeight: 0.9, marginTop: 4 }}>{count}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: activeColor, letterSpacing: "0.2em", marginTop: 2 }}>{isSprint ? "SPRINT" : "FLOAT"}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 24 }}>
                {Array.from({ length: minutes }).map((_, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: 999,
                    background: i < round - 1 ? C.electric : i === round - 1 ? C.electric + "AA" : C.faint,
                    transition: "all 0.3s",
                  }} />
                ))}
              </div>
              <Btn ghost color={C.dim} onClick={reset} full style={{ marginTop: 20, fontSize: 12 }}>Reset</Btn>
            </>
          )}
          {phase === "done" && (
            <div className="ease-up" style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🏁</div>
              <h3 className="h-display" style={{ fontSize: 28, color: C.electric, margin: "0 0 6px" }}>Game pace.</h3>
              <p className="h-serif" style={{ fontSize: 18, color: C.cream, margin: "0 0 20px" }}>{minutes} sprints in {minutes} minutes.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn ghost color={C.dim} onClick={reset} style={{ flex: 1 }}>Reset</Btn>
                <Btn color={C.electric} onClick={async () => { if (await onLog(minutes)) reset(); }} style={{ flex: 1 }}>Log It</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}

export const LS_DYNO = "bttd_dyno_v1";

export const DYNO_RETEST_DAYS = 42;

export const cooperVo2 = (miles) => 35.97 * miles - 11.29;

export function DynoCard({ onLog }) {
  const cloud = useUserData();
  const tests = cloud.get('dyno', []);
  const setTests = next => cloud.set('dyno', next, []);
  const [open, setOpen] = useState(false);
  const [miles, setMiles] = useState("");

  const last = tests.length ? tests[tests.length - 1] : null;
  const prev = tests.length > 1 ? tests[tests.length - 2] : null;
  const daysSince = last ? Math.floor((Date.now() - new Date(last.date)) / 86400000) : null;
  const due = !last || daysSince >= DYNO_RETEST_DAYS;

  const save = async () => {
    const mi = parseFloat(miles);
    if (!mi || mi <= 0 || mi > 3.5) return;
    const vo2 = +cooperVo2(mi).toFixed(1);
    const next = [...tests, { date: new Date().toISOString(), miles: mi, vo2 }];
    if (!(await onLog(mi, vo2))) return;
    setTests(next);
    setMiles(""); setOpen(false);
  };

  return (
    <Surface accent={C.amber} style={{ background: C.panel }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <Pill color={C.amber}>Every 6 weeks</Pill>
          <h2 className="h-display" style={{ fontSize: 26, margin: "10px 0 4px", color: C.bone }}>🧪 Dyno Day</h2>
          <div style={{ fontSize: 13, color: C.dim }}>12 min — cover as much ground as you can. That's the whole test.</div>
        </div>
        {!open && <Btn color={C.amber} onClick={() => setOpen(true)}>{last ? "Re-test" : "First test"}</Btn>}
      </div>

      {last && !open && (
        <div style={{ marginTop: 14, background: C.raised, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span className="num-tab h-display" style={{ fontSize: 34, fontWeight: 800, color: C.amber, letterSpacing: "-0.03em" }}>{last.vo2}</span>
            <span style={{ fontSize: 14, color: C.cream, fontWeight: 600 }}>est. VO₂max</span>
            {prev && (
              <span style={{ fontSize: 14, fontWeight: 700, color: last.vo2 >= prev.vo2 ? C.moss : C.rust }}>
                {last.vo2 >= prev.vo2 ? "▲" : "▼"} {Math.abs(last.vo2 - prev.vo2).toFixed(1)} vs last test
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>
            {last.miles} mi on {new Date(last.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {daysSince === 0 ? "today" : `${daysSince}d ago`}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: due ? C.amber : C.dim, fontFamily: FONT_MONO }}>
            {due ? "🔔 RE-TEST IS DUE — see what 6 weeks of work bought you" : `Next dyno day in ${DYNO_RETEST_DAYS - daysSince} days`}
          </div>
        </div>
      )}
      {!last && !open && (
        <div style={{ fontSize: 13, color: C.dim, marginTop: 12, lineHeight: 1.6 }}>
          This is the dyno pull for your engine: one honest number (VO₂max) you can watch
          climb test over test. Do it fresh, count laps or use your phone's distance.
        </div>
      )}

      {open && (
        <div className="ease-up" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, color: C.cream, lineHeight: 1.6, marginBottom: 12 }}>
            Warm up 5 min, then <b>run/walk as far as you can in exactly 12 minutes</b>.
            Enter the distance you covered:
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="number" inputMode="decimal" step="0.01" min="0" max="3.5" placeholder="e.g. 1.25"
              value={miles} onChange={(e) => setMiles(e.target.value)}
              style={{
                flex: 1, background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12,
                padding: "14px 14px", color: C.bone, fontSize: 20, fontFamily: FONT_MONO, fontWeight: 700,
              }}
            />
            <span style={{ fontSize: 15, color: C.dim, fontWeight: 700 }}>miles</span>
          </div>
          {parseFloat(miles) > 0 && parseFloat(miles) <= 3.5 && (
            <div style={{ fontSize: 14, color: C.amber, fontWeight: 700, marginTop: 10 }}>
              → est. VO₂max {cooperVo2(parseFloat(miles)).toFixed(1)}
              {last ? ` (last test: ${last.vo2})` : ""}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Btn ghost color={C.dim} onClick={() => { setOpen(false); setMiles(""); }} style={{ flex: 1 }}>Cancel</Btn>
            <Btn color={C.amber} onClick={save} style={{ flex: 1 }}>Save test</Btn>
          </div>
        </div>
      )}
    </Surface>
  );
}
