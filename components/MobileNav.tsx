"use client";
import { useRouter, usePathname } from "next/navigation";

export default function MobileNav({ tabs, active, onChange }: any) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--bg2)]/95 backdrop-blur-lg">
      <div className="flex items-center justify-around px-1 py-1.5">
        {tabs.map((t: any) => (
          <button key={t.id} onClick={() => onChange ? onChange(t.id) : null}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition ${
              active === t.id ? "text-[var(--accent)] bg-[var(--accent)]/5" : "text-[var(--dim)]"
            }`}>
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
