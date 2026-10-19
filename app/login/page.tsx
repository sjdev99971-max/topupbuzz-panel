"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, User, ChevronDown, ArrowRight, Delete } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  
  const handleNumClick = (num: string) => {
    if (phone.length < 15) setPhone(prev => prev + num);
  };
  
  const handleDelete = () => {
    setPhone(prev => prev.slice(0, -1));
  };

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
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-[#1cd45a] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(28,212,90,0.2)]">
            <Send size={36} className="text-black ml-1" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2">
          Echoo <span className="text-[#1cd45a]">Post</span>
        </h1>
        <p className="text-center text-white/50 text-[15px] mb-8">
          Connect your Telegram account to get started.
        </p>

        <button className="w-full bg-[#2b8bf5] text-white py-4 rounded-2xl font-semibold text-[16px] flex items-center justify-center gap-2 mb-6">
          <User size={20} /> Share Telegram number
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-white/10"></div>
          <span className="text-xs text-white/40 font-medium">or enter manually</span>
          <div className="h-[1px] flex-1 bg-white/10"></div>
        </div>

        <div className="relative mb-3">
          <select className="w-full bg-[#141414] border border-white/10 text-white/60 appearance-none rounded-2xl px-5 py-4 outline-none focus:border-[#1cd45a]">
            <option>Country</option>
            <option>Bangladesh (+880)</option>
            <option>India (+91)</option>
            <option>USA (+1)</option>
          </select>
          <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        </div>

        <div className="flex items-center bg-[#141414] border border-white/10 rounded-2xl px-5 py-4 mb-4 focus-within:border-[#1cd45a] transition-colors">
          <span className="text-[#1cd45a] text-lg mr-3 font-semibold">+</span>
          <input 
            type="text" 
            value={phone}
            readOnly
            placeholder="" 
            className="bg-transparent outline-none flex-1 text-lg tracking-widest placeholder-white/20"
          />
          <div className="h-6 w-[2px] bg-[#1cd45a] animate-pulse"></div>
        </div>

        <div className="flex justify-end mb-6">
          <button 
            onClick={() => console.log("Phone:", phone)}
            className="w-14 h-14 bg-[#1cd45a] text-black rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
          >
            <ArrowRight size={24} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-auto pb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num} 
              onClick={() => handleNumClick(num.toString())}
              className="bg-[#141414] rounded-2xl py-4 text-2xl font-semibold active:bg-white/10 transition-colors"
            >
              {num}
            </button>
          ))}
          <div className="bg-transparent"></div>
          <button 
            onClick={() => handleNumClick("0")}
            className="bg-[#141414] rounded-2xl py-4 text-2xl font-semibold active:bg-white/10 transition-colors"
          >
            0
          </button>
          <button 
            onClick={handleDelete}
            className="bg-[#141414] rounded-2xl flex items-center justify-center active:bg-white/10 transition-colors"
          >
            <Delete size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
