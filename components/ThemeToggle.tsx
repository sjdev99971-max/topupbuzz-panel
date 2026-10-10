"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Force dark on first visit ever; respect user toggle only if they've actively switched
    const stored = localStorage.getItem("theme");
    const t = stored === "light" ? "light" : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    if (!stored) localStorage.setItem("theme", "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <button onClick={toggle} className="btn btn-sm" title="toggle theme">
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
