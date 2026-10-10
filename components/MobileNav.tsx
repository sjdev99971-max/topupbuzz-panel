"use client";
import { useRouter } from "next/navigation";

export default function MobileNav({ tabs, active, onChange, isAdmin }: any) {
  const router = useRouter();
  const allTabs = isAdmin
    ? [...tabs, { id: "admin", label: "Admin", icon: "♛", href: "/admin" }]
    : tabs;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border2)] bg-[var(--bg2)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
        {allTabs.map((t: any) => {
          const isActive = active === t.id;
          const handle = () => {
            if (t.href) router.push(t.href);
            else if (onChange) onChange(t.id);
          };
          return (
            <button key={t.id} onClick={handle}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition relative ${
                isActive ? "text-[var(--accent)]" : "text-[var(--dim)]"
              }`}>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b bg-[var(--accent)]" />
              )}
              <span className="text-base leading-none">{t.icon}</span>
              <span className={`text-[10px] leading-none mt-0.5 ${isActive ? "font-semibold" : "font-medium"}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
