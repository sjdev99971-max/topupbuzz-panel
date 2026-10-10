"use client";
import { useEffect, useState } from "react";
import { getStealth, clearStealth, getMeStealth } from "@/lib/api";

export default function StealthBanner() {
  const [target, setTarget] = useState<any>(null);

  useEffect(() => {
    const sid = getStealth();
    if (!sid) return;
    getMeStealth().then(setTarget).catch(() => clearStealth());
  }, []);

  if (!target?.stealth_active) return null;

  const exit = () => {
    clearStealth();
    window.location.href = "/dashboard";
  };

  return (
    <div className="bg-[var(--yellow)]/10 border-b border-[var(--yellow)]/40 px-4 py-2 flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-[var(--yellow)]">
        <span className="w-2 h-2 rounded-full bg-[var(--yellow)] pulse-dot" />
        <span className="uppercase tracking-wider font-bold">🕵️ stealth mode</span>
        <span className="text-[var(--dim)]">→</span>
        <span className="text-[var(--text)]">
          {target.first_name || target.username || target.id}
        </span>
        <span className="text-[10px] text-[var(--dim2)]">(id: {target.id})</span>
      </div>
      <button onClick={exit} className="btn btn-sm btn-danger text-[11px]">
        exit stealth
      </button>
    </div>
  );
}
