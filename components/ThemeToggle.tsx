"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // FORCE dark unless user explicitly toggled
    const stored = localStorage.getItem("theme_pref");
    const t: "dark" | "light" = stored === "light" ? "light" : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme_pref", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <button onClick={toggle} className="btn btn-sm btn-icon" title="Toggle theme">
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
