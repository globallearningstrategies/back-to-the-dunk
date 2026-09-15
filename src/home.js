import React, { useState, useEffect } from 'react';
import { C, FONT_MONO, beep, vibrate } from './model';
import { Btn } from './ui';

export function AchievementsSheet({ game, onClose }) {
  const sorted = [...game.achievements].sort((a, b) => (b.unlocked - a.unlocked) || (b.progress - a.progress));
  return (
    <div className="backdrop" style={{ alignItems: "flex-end", padding: 0 }} onClick={onClose}>
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, margin: "0 auto", background: C.panel,
        borderRadius: "22px 22px 0 0", borderTop: `1px solid ${C.line}`,
        padding: "10px 18px calc(24px + env(safe-area-inset-bottom))", maxHeight: "88vh", overflowY: "auto",
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: C.faint, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h2 className="h-display" style={{ fontSize: 22, fontWeight: 700, color: C.bone, margin: 0, letterSpacing: "-0.03em" }}>Trophy Case</h2>
          <button onClick={onClose} className="btn" style={{ border: "none", background: "transparent", color: C.dim, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: C.dim, fontFamily: FONT_MONO, marginBottom: 16 }}>Level {game.level} · {game.rank} · {game.unlockedCount}/{game.achievements.length} unlocked</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {sorted.map(a => (
            <div key={a.id} style={{
              background: a.unlocked ? `${C.rust}10` : C.raised, border: `1px solid ${a.unlocked ? C.rust + "55" : C.line}`,
              borderRadius: 14, padding: 14, position: "relative", overflow: "hidden",
            }}>
              <div style={{ fontSize: 30, filter: a.unlocked ? "none" : "grayscale(1)", opacity: a.unlocked ? 1 : 0.35 }}>{a.emoji}</div>
              <div className="h-display" style={{ fontSize: 14, fontWeight: 700, color: a.unlocked ? C.bone : C.dim, marginTop: 8, letterSpacing: "-0.01em" }}>{a.name}</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 2, lineHeight: 1.35 }}>{a.desc}</div>
              {a.unlocked ? (
                <div style={{ fontSize: 10, color: C.rust, fontFamily: FONT_MONO, fontWeight: 700, marginTop: 8 }}>✓ UNLOCKED</div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 5, borderRadius: 999, background: C.faint, overflow: "hidden" }}>
                    <div style={{ width: Math.round(a.progress * 100) + "%", height: "100%", background: C.amber, borderRadius: 999 }} />
                  </div>
                  <div style={{ fontSize: 9, color: C.mute, fontFamily: FONT_MONO, marginTop: 4 }}>{Math.min(a.value, a.goal)}/{a.goal}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CelebrationOverlay({ queue, onClose }) {
  const [i, setI] = useState(0);
  const item = queue[i];
  useEffect(() => {
    beep(660, 0.1, 0.35);
    setTimeout(() => beep(880, 0.12, 0.4), 120);
    setTimeout(() => beep(1175, 0.18, 0.45), 260);
    vibrate([30, 40, 60]);
  }, [i]);
  if (!item) return null;
  const next = () => { if (i + 1 < queue.length) setI(i + 1); else onClose(); };
  const isLevel = item.kind === "level";
  const accent = isLevel ? C.amber : C.rust;
  return (
    <div className="backdrop" style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }} onClick={next}>
      <div className="celebrate-pop" onClick={e => e.stopPropagation()} style={{
        width: "86%", maxWidth: 360, background: C.panel, borderRadius: 24, border: `1px solid ${accent}55`,
        padding: "32px 24px", textAlign: "center", boxShadow: `0 20px 60px ${accent}33`,
      }}>
        <div style={{ fontSize: 11, color: accent, fontFamily: FONT_MONO, letterSpacing: "0.2em", fontWeight: 700 }}>
          {isLevel ? "LEVEL UP" : "ACHIEVEMENT UNLOCKED"}
        </div>
        <div className="celebrate-emoji" style={{ fontSize: 76, margin: "16px 0 8px", lineHeight: 1 }}>{isLevel ? "⬆️" : item.emoji}</div>
        <h2 className="h-display" style={{ fontSize: 30, fontWeight: 800, color: C.bone, margin: 0, letterSpacing: "-0.03em" }}>{item.title}</h2>
        <p className="h-serif" style={{ fontSize: 17, color: C.cream, margin: "8px 0 0" }}>{item.subtitle}</p>
        <Btn color={accent} full size="lg" style={{ marginTop: 22 }} onClick={next}>{i + 1 < queue.length ? "Next" : "Let's go 🔥"}</Btn>
        {queue.length > 1 && <div style={{ fontSize: 10, color: C.mute, fontFamily: FONT_MONO, marginTop: 10 }}>{i + 1} / {queue.length}</div>}
      </div>
    </div>
  );
}
