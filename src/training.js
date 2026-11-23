import { vibrate } from './model';
import React, { useState, useEffect, useRef } from 'react';
import { useUserData } from './data/UserData';
import { C, FONT_DISPLAY, FONT_MONO, TABATA_CONFIG, getAudioCtx, beep, ringAlarm, speak, requestNotificationPermission, fireNotification, PROGRESS_STEP, nextTarget, platesToReach } from './model';
import { Surface, Eyebrow, Pill, Btn, NumIn } from './ui';

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
      vibrate([200, 80, 200, 80, 400]);

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
          vibrate([200, 80, 200]);
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
