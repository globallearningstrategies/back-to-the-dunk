import React, { useState } from 'react';
import { supabase } from './data/client';
import { C, FONT_DISPLAY, FONT_MONO } from './model';
import { Surface, Eyebrow, Btn } from './ui';

export function AuthGate() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email"); // email | code
  const [status, setStatus] = useState("idle"); // idle | sending | verifying | error
  const [errMsg, setErrMsg] = useState("");

  // Step 1 — email a 6-digit code (no link, so login finishes inside this app).
  const sendCode = async () => {
    const addr = email.trim();
    if (!addr || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) { setStatus("error"); setErrMsg("Enter a valid email."); return; }
    setStatus("sending"); setErrMsg("");
    try {
    const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { shouldCreateUser: true } });
    if (error) { setStatus("error"); setErrMsg(error.message); }
    else { setStatus("idle"); setStep("code"); setCode(""); }
    } catch (e) { setStatus("error"); setErrMsg(e.message || "Could not connect. Try again."); }
  };

  // Step 2 — verify the code right here; supabase establishes the session
  // in THIS context (home-screen app or browser), no redirect needed.
  const verify = async () => {
    const token = code.replace(/\D/g, "");
    if (token.length < 6) { setStatus("error"); setErrMsg("Enter the 6-digit code."); return; }
    setStatus("verifying"); setErrMsg("");
    try {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
    if (error) { setStatus("error"); setErrMsg(error.message || "That code didn't work — try again."); }
    } catch (e) { setStatus("error"); setErrMsg(e.message || "Could not connect. Try again."); }
    // On success, onAuthStateChange handles the rest.
  };

  return (
    <div className="court-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="ease-up" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${C.rust}, ${C.amber})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 14px" }}>💪</div>
          <h1 className="h-display" style={{ fontSize: 26, fontWeight: 700, color: C.bone, letterSpacing: "-0.03em", margin: 0 }}>The Work</h1>
          <p className="h-serif" style={{ fontSize: 16, color: C.dim, margin: "8px 0 0" }}>Your private training log. Sign in to continue.</p>
        </div>

        <Surface padding={22}>
          {step === "code" ? (
            <>
              <Eyebrow>Enter the code</Eyebrow>
              <p className="h-serif" style={{ fontSize: 15, color: C.dim, margin: "8px 0 14px", lineHeight: 1.5 }}>
                We emailed a 6-digit code to <strong style={{ color: C.cream }}>{email.trim()}</strong>. Type it in below.
              </p>
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="Enter code"
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} onKeyDown={e => e.key === "Enter" && verify()}
                style={{ width: "100%", margin: "0 0 14px", background: C.raised, border: `1px solid ${status === "error" ? C.red : C.line}`, borderRadius: 12, color: C.bone, padding: "14px", fontSize: 26, letterSpacing: "0.2em", textAlign: "center", outline: "none", fontFamily: FONT_MONO }}
              />
              {status === "error" && <div style={{ fontSize: 12, color: C.red, fontFamily: FONT_MONO, marginBottom: 12 }}>⚠ {errMsg}</div>}
              <Btn color={C.rust} full size="lg" onClick={verify} disabled={status === "verifying"}>
                {status === "verifying" ? "Verifying…" : "Sign in"}
              </Btn>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                <button onClick={() => { setStep("email"); setStatus("idle"); setErrMsg(""); }} className="btn" style={{ background: "transparent", border: "none", color: C.dim, fontFamily: FONT_MONO, fontSize: 12, cursor: "pointer", padding: 0 }}>← Change email</button>
                <button onClick={sendCode} disabled={status === "sending"} className="btn" style={{ background: "transparent", border: "none", color: C.electric, fontFamily: FONT_MONO, fontSize: 12, cursor: "pointer", padding: 0 }}>{status === "sending" ? "Sending…" : "Resend code"}</button>
              </div>
            </>
          ) : (
            <>
              <Eyebrow>Email</Eyebrow>
              <input
                type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendCode()}
                style={{ width: "100%", margin: "8px 0 14px", background: C.raised, border: `1px solid ${status === "error" ? C.red : C.line}`, borderRadius: 12, color: C.bone, padding: "13px 14px", fontSize: 16, outline: "none", fontFamily: FONT_DISPLAY }}
              />
              {status === "error" && <div style={{ fontSize: 12, color: C.red, fontFamily: FONT_MONO, marginBottom: 12 }}>⚠ {errMsg}</div>}
              <Btn color={C.rust} full size="lg" onClick={sendCode} disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Email me a code"}
              </Btn>
              <p style={{ fontSize: 11, color: C.mute, fontFamily: FONT_MONO, margin: "14px 0 0", lineHeight: 1.5, textAlign: "center" }}>
                No password. We email you a 6-digit code to type in here.
              </p>
            </>
          )}
        </Surface>
      </div>
    </div>
  );
}
