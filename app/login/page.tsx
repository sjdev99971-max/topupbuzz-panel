"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendOtp, verifyOtp, saveLocal, getLocal } from "@/lib/api";

type Step = "phone" | "otp" | "password" | "success";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+880");
  const [sessionId, setSessionId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const sess = getLocal("session");
      const tgId = sess?.id;
      const res = await sendOtp(phone.trim(), tgId);
      setSessionId(res.session_id);
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < otp.length - 1) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === "Enter") handleVerify();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 5);
    if (txt.length) {
      const next = txt.split("").concat(["", "", "", "", ""]).slice(0, 5);
      setOtp(next);
      otpRefs.current[Math.min(txt.length, 4)]?.focus();
      e.preventDefault();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 5) { setError("enter full 5-digit code"); return; }
    setError(""); setLoading(true);
    try {
      const res = await verifyOtp(sessionId, code, password || undefined);
      if (res.needs_password) {
        setStep("password");
        setError("");
        setLoading(false);
        return;
      }
      saveLocal("account", res);
      setUserInfo(res);
      setStep("success");
      setTimeout(() => router.push("/dashboard"), 1800);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "verification failed");
      setOtp(["", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async () => {
    setError(""); setLoading(true);
    try {
      const code = otp.join("");
      const res = await verifyOtp(sessionId, code, password);
      saveLocal("account", res);
      setUserInfo(res);
      setStep("success");
      setTimeout(() => router.push("/dashboard"), 1800);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "wrong password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="px-6 md:px-10 py-5 flex items-center justify-between border-b border-[var(--border)]/40">
        <Link href="/" className="flex items-center gap-3">
          <div className="text-[var(--cyan)] text-xl">◆</div>
          <span className="text-[var(--text)] text-sm">
            topupbuzz<span className="text-[var(--cyan)]">.</span>control
          </span>
        </Link>
        <Link href="/" className="text-xs text-[var(--dim)] hover:text-[var(--cyan)]">← back</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* PROGRESS */}
          <div className="flex items-center gap-2 mb-6 text-xs">
            {["phone", "code", "verify"].map((s, i) => {
              const active = (step === "phone" && i === 0) || (step === "otp" && i === 1) || (step === "password" && i === 1) || (step === "success" && i === 2);
              const done = (step === "otp" && i === 0) || ((step === "password" || step === "success") && i <= 1);
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${
                    done ? "bg-[var(--cyan)]/20 border-[var(--cyan)] text-[var(--cyan)]"
                    : active ? "border-[var(--cyan)] text-[var(--cyan)] pulse-cyan"
                    : "border-[var(--border2)] text-[var(--dim2)]"
                  }`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider ${active || done ? "text-[var(--cyan)]" : "text-[var(--dim2)]"}`}>{s}</span>
                  {i < 2 && <div className={`flex-1 h-px ${done ? "bg-[var(--cyan)]/40" : "bg-[var(--border2)]"}`} />}
                </div>
              );
            })}
          </div>

          <div className="card corner p-6 md:p-8">
            {/* HEADER */}
            <div className="mb-6">
              <h1 className="text-xl mb-1.5">
                <span className="text-[var(--dim)]">$</span>{" "}
                {step === "phone" && "authenticate"}
                {step === "otp" && "verify code"}
                {step === "password" && "2fa required"}
                {step === "success" && "welcome"}
              </h1>
              <p className="text-xs text-[var(--dim)]">
                {step === "phone" && "enter your telegram phone number"}
                {step === "otp" && "check your telegram app for the code"}
                {step === "password" && "your account has 2-step verification enabled"}
                {step === "success" && "account connected successfully"}
              </p>
            </div>

            {/* ERROR */}
            {error && (
              <div className="mb-4 p-3 rounded border border-[var(--danger)]/30 bg-[var(--danger)]/5 text-xs text-[var(--danger)]">
                ✕ {error}
              </div>
            )}

            {/* STEP: PHONE */}
            {step === "phone" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--dim)] mb-2">
                    phone number
                  </label>
                  <input
                    type="tel"
                    className="inp"
                    placeholder="+8801712345678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                    autoFocus
                  />
                  <p className="text-[10px] text-[var(--dim2)] mt-1.5">
                    include country code, e.g. +880 for bangladesh
                  </p>
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={loading || phone.length < 8}
                  className="btn btn-primary w-full py-3"
                >
                  {loading ? <><span className="spin inline-block">◌</span> sending…</> : "send code →"}
                </button>
              </div>
            )}

            {/* STEP: OTP */}
            {step === "otp" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--dim)] mb-3">
                    verification code
                  </label>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKey(i, e)}
                        className="otp-box"
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--dim2)] mt-3 text-center">
                    sent to <span className="text-[var(--cyan)]">{phone}</span> via telegram
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setStep("phone"); setOtp(["","","","",""]); setError(""); }} className="btn flex-1">
                    ← back
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={loading || otp.join("").length < 5}
                    className="btn btn-primary flex-1"
                  >
                    {loading ? <><span className="spin inline-block">◌</span> verifying…</> : "verify →"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP: PASSWORD */}
            {step === "password" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--dim)] mb-2">
                    2-step verification password
                  </label>
                  <input
                    type="password"
                    className="inp"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handlePassword()}
                    autoFocus
                  />
                </div>
                <button onClick={handlePassword} disabled={loading || !password} className="btn btn-primary w-full py-3">
                  {loading ? <><span className="spin inline-block">◌</span> verifying…</> : "confirm →"}
                </button>
              </div>
            )}

            {/* STEP: SUCCESS */}
            {step === "success" && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full border-2 border-[var(--cyan)] flex items-center justify-center mx-auto mb-4 pulse-cyan">
                  <span className="text-[var(--cyan)] text-3xl">✓</span>
                </div>
                <p className="text-[var(--text)] mb-1">connected</p>
                <p className="text-xs text-[var(--dim)]">
                  {userInfo?.phone} {userInfo?.username && `(@${userInfo.username})`}
                </p>
                <p className="text-[10px] text-[var(--dim2)] mt-3">redirecting to dashboard…</p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-[var(--dim2)] text-center mt-4">
            session stored securely · never shared
          </p>
        </div>
      </div>
    </div>
  );
}
