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
      fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
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
    <button onClick={() => onGo(g)} aria-label={g.label} aria-current={active ? "page" : undefined} className="btn"
      style={{
        flex: 1, padding: "8px 4px", border: "none", background: "transparent",
        cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        position: "relative",
      }}>
      <span style={{ color: active ? C.rust : C.dim, transition: "color 0.2s" }}>
        <Icon name={g.icon} size={23} strokeWidth={active ? 2.1 : 1.7} />
      </span>
      <span style={{
        fontSize: 11, fontWeight: active ? 700 : 500,
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

/* ── Icons — one stroke family so navigation and actions read as a set. ── */
const ICONS = {
  home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></>,
  ball: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c3 2.6 3 10.2 0 12.8M18.4 5.6c-3 2.6-3 10.2 0 12.8"/></>,
  fuel: <><path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M9 3c-1 1.5 1 2.5 0 4M13.5 3c-1 1.5 1 2.5 0 4"/></>,
  chart: <><path d="M4 19h16"/><path d="m5 15 4.5-5 3.5 3L19 6"/><path d="M15 6h4v4"/></>,
  gear: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></>,
  trash: <><path d="M4 7h16M10 3.5h4M6 7l1 13h10l1-13M10 11v5M14 11v5"/></>,
  chevron: <path d="m6 9 6 6 6-6"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.6"/></>,
  bolt: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z"/>,
  walk: <><circle cx="13" cy="4.5" r="1.8"/><path d="m9 21 2.5-6-2-3 1-4.5 3.5 1 2 3.5 3 1M8 10l2.5-2.5M13.5 15l2.5 6"/></>,
  flame: <path d="M12 21c4 0 6.5-2.7 6.5-6.3 0-3.2-2.2-5-3.3-7.7-.4 1.7-1.3 2.7-2.4 3.3C13 7 11.5 4.5 9.5 3c.3 3.2-4 5.5-4 11.2C5.5 18.3 8 21 12 21Z"/>,
  drop: <path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11Z"/>,
  scale: <><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 9.5a5 5 0 0 1 7 0L13 12h-2L8.5 9.5Z"/></>,
};

export function Icon({ name, size = 22, strokeWidth = 1.8, style }) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0, ...style }}>{ICONS[name]}</svg>;
}

/* ── Sheet — the one bottom-sheet used by every quick logger. Escape and the
   backdrop close it, the page behind it stops scrolling, and passing onSubmit
   makes the panel itself a form so Enter saves. ── */
export function Sheet({ label, title, titleId, onClose, onSubmit, closeDisabled, children }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, []);
  const Panel = onSubmit ? 'form' : 'div';
  return <div className="backdrop sheet-host" onClick={onClose}>
    <Panel className="sheet slide-up" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-label={titleId ? undefined : title} onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
      <div className="sheet-grip" aria-hidden="true"/>
      <div className="engine-row"><span className="engine-label">{label}</span><button type="button" className="engine-link" onClick={onClose} disabled={closeDisabled}>Close</button></div>
      <h2 id={titleId}>{title}</h2>
      {children}
    </Panel>
  </div>;
}

export function Switch({ checked, onChange, label, disabled }) {
  return <button type="button" role="switch" className="engine-switch" aria-checked={!!checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}><span/></button>;
}
