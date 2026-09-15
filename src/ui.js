import React, { useState, useEffect, useRef } from 'react';
import { C, FONT_DISPLAY, FONT_MONO } from './model';

export function Surface({ children, accent, style = {}, onClick, className = "", padding = 20 }) {
  return (
    <div
      onClick={onClick}
      className={`tap ${className}`}
      style={{
        background: C.panel,
        border: `1px solid ${accent ? accent + "30" : C.line}`,
        borderRadius: 18,
        padding,
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {accent && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 0% 0%, ${accent}10, transparent 60%)`, pointerEvents: "none" }} />}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

export function Eyebrow({ children, color = C.dim }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
      color, fontWeight: 600, fontFamily: FONT_MONO,
    }}>{children}</div>
  );
}

export function Pill({ children, color = C.rust, size = "sm" }) {
  const px = size === "sm" ? "5px 10px" : "7px 14px";
  return (
    <span style={{
      background: color + "15",
      color, border: `1px solid ${color}30`,
      borderRadius: 999, padding: px,
      fontSize: size === "sm" ? 10 : 12, fontWeight: 600,
      letterSpacing: "0.06em", textTransform: "uppercase",
      fontFamily: FONT_MONO, display: "inline-block",
    }}>{children}</span>
  );
}

export function NavItem({ g, active, onGo }) {
  return (
    <button onClick={() => onGo(g)} className="btn"
      style={{
        flex: 1, padding: "8px 4px", border: "none", background: "transparent",
        cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        position: "relative",
      }}>
      <span style={{ fontSize: 20, opacity: active ? 1 : 0.55, transition: "opacity 0.2s, transform 0.2s", transform: active ? "scale(1.05)" : "scale(1)" }}>
        {g.icon}
      </span>
      <span style={{
        fontSize: 10, fontWeight: active ? 700 : 500,
        color: active ? C.rust : C.dim,
        letterSpacing: "0.02em", fontFamily: FONT_DISPLAY, transition: "color 0.2s",
      }}>
        {g.label}
      </span>
      {active && <div style={{ position: "absolute", top: 0, left: "30%", right: "30%", height: 2, background: C.rust, borderRadius: 999 }} />}
    </button>
  );
}

export function Btn({ children, color = C.rust, ghost, onClick, disabled, full, size = "md", style = {}, className = "" }) {
  const padding = size === "sm" ? "9px 16px" : size === "lg" ? "16px 26px" : "13px 22px";
  const fontSize = size === "sm" ? 12 : size === "lg" ? 15 : 14;
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`btn ${className}`}
      style={{
        background: ghost ? "transparent" : color,
        border: `1px solid ${ghost ? color + "55" : color}`,
        color: ghost ? color : C.ink,
        padding, borderRadius: 14,
        cursor: disabled ? "default" : "pointer",
        fontSize, fontWeight: 600,
        letterSpacing: "-0.01em",
        opacity: disabled ? 0.32 : 1,
        width: full ? "100%" : undefined,
        ...style,
      }}
    >{children}</button>
  );
}

export function NumIn({ value, onChange, placeholder, style = {}, decimal = true, step }) {
  return (
    <input
      type="number"
      inputMode={decimal ? "decimal" : "numeric"}
      step={step || (decimal ? "0.1" : "1")}
      value={value === undefined || value === null ? "" : value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: C.raised, border: `1px solid ${C.line}`,
        borderRadius: 10, color: C.bone,
        padding: "9px 10px", fontSize: 14,
        textAlign: "center", width: "100%",
        outline: "none", transition: "border-color 0.15s",
        ...style,
      }}
      onFocus={e => e.target.style.borderColor = C.rust + "66"}
      onBlur={e => e.target.style.borderColor = C.line}
    />
  );
}

export function PageTitle({ kicker, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {kicker && <Eyebrow>{kicker}</Eyebrow>}
      <h1 className="h-display" style={{ fontSize: 40, margin: "8px 0 0", color: C.bone }}>{children}</h1>
    </div>
  );
}

export let _toastListeners = [];

export let _toastSeq = 0;

export function toast(message, opts = {}) {
  const t = { id: ++_toastSeq, message, actionLabel: opts.actionLabel, onAction: opts.onAction, duration: opts.duration ?? 5000 };
  _toastListeners.forEach(fn => fn(t));
  return t.id;
}

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const listener = (t) => {
      setItems(prev => [...prev, t]);
      if (t.duration > 0) setTimeout(() => setItems(prev => prev.filter(x => x.id !== t.id)), t.duration);
    };
    _toastListeners.push(listener);
    return () => { _toastListeners = _toastListeners.filter(l => l !== listener); };
  }, []);
  const dismiss = (id) => setItems(prev => prev.filter(x => x.id !== id));
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: "calc(82px + env(safe-area-inset-bottom))",
      zIndex: 9998, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      pointerEvents: "none", padding: "0 16px",
    }}>
      {items.map(t => (
        <div key={t.id} className="ease-up" style={{
          pointerEvents: "auto", maxWidth: 420, width: "100%",
          background: C.bone, color: C.ink, borderRadius: 14, padding: "12px 8px 12px 16px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
        }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, fontFamily: FONT_DISPLAY, letterSpacing: "-0.01em" }}>{t.message}</span>
          {t.onAction && (
            <button onClick={() => { t.onAction(); dismiss(t.id); }} className="btn" style={{
              background: "transparent", border: "none", color: C.rustHi, fontSize: 12, fontWeight: 700,
              fontFamily: FONT_MONO, letterSpacing: "0.08em", cursor: "pointer", padding: "6px 8px",
            }}>{t.actionLabel || "UNDO"}</button>
          )}
          <button onClick={() => dismiss(t.id)} className="btn" style={{
            background: "transparent", border: "none", color: C.mute, fontSize: 14, cursor: "pointer", padding: "6px 8px",
          }}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function useCountUp(value, duration = 650) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(null);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const to = value;
    if (reduce || from === to) { fromRef.current = to; setDisplay(to); return; }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { fromRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return display;
}

export function AnimatedNumber({ value, format = (n) => Math.round(n), duration = 650 }) {
  const display = useCountUp(value, duration);
  return <>{format(display)}</>;
}

export function Confetti({ show, onDone }) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(() => onDone && onDone(), 2400);
      return () => clearTimeout(t);
    }
  }, [show, onDone]);
  if (!show) return null;
  const pieces = Array.from({ length: 40 });
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {pieces.map((_, i) => {
        const colors = [C.rust, C.amber, C.moss, C.electric, C.plum];
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const dur = 1.6 + Math.random() * 0.8;
        const rot = Math.random() * 360;
        return (
          <div key={i} style={{
            position: "absolute", left: left + "%", top: "-12px",
            width: 8, height: 12, background: color,
            borderRadius: 2,
            transform: `rotate(${rot}deg)`,
            animation: `confetti-fall ${dur}s ${delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
          }} />
        );
      })}
    </div>
  );
}
