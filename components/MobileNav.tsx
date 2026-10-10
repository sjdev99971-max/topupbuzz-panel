"use client";
import { useRouter } from "next/navigation";

export default function MobileNav({ tabs, active, onChange, isAdmin }: any) {
  const router = useRouter();
  const allTabs = isAdmin
    ? [...tabs, { id: "admin", label: "Admin", icon: "♛", href: "/admin" }]
    : tabs;

  return (
    <nav
      className="md:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#0d0d13",
        borderTop: "1px solid #2a2a3d",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.5)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {allTabs.map((t: any) => {
          const isActive = active === t.id;
          const handle = () => {
            if (t.href) router.push(t.href);
            else if (onChange) onChange(t.id);
          };
          return (
            <button
              key={t.id}
              onClick={handle}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "8px 4px",
                minHeight: 58,
                background: isActive ? "rgba(122,162,247,0.08)" : "transparent",
                border: "none",
                color: isActive ? "#7aa2f7" : "#8b8b9e",
                fontFamily: "inherit",
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 32,
                    height: 3,
                    background: "#7aa2f7",
                    borderRadius: "0 0 3px 3px",
                    boxShadow: "0 0 12px #7aa2f7",
                  }}
                />
              )}
              <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
              <span style={{ lineHeight: 1, letterSpacing: 0.02 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
