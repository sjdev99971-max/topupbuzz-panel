"use client";
import { useRouter } from "next/navigation";

export default function MobileNav({ tabs, active, onChange, isAdmin }: any) {
  const router = useRouter();
  const allTabs = isAdmin
    ? [...tabs, { id: "admin", label: "Admin", icon: "♛", href: "/admin" }]
    : tabs;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--bg2)]/95 backdrop-blur-lg">
      <div className="flex items-center justify-around px-1 py-1.5">
        {allTabs.map((t: any) => {
          const isActive = active === t.id;
          const handle = () => {
            if (t.href) router.push(t.href);
            else if (onChange) onChange(t.id);
          };
          return (
            <button key={t.id} onClick={handle}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-0.5 rounded-lg transition ${
                isActive ? "text-[var(--accent)] bg-[var(--accent)]/5" : "text-[var(--dim)]"
              }`}>
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="text-[9px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
