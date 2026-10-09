"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";

export default function Landing() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    getHealth().then(() => setOnline(true)).catch(() => setOnline(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* NAV */}
      <nav className="relative z-10 px-6 md:px-10 py-5 flex items-center justify-between border-b border-[var(--border)]/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="text-[var(--cyan)] text-xl">◆</div>
          <span className="text-[var(--text)] text-sm tracking-wide">
            topupbuzz<span className="text-[var(--cyan)]">.</span>control
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${online === true ? "bg-[var(--ok)] pulse-cyan" : online === false ? "bg-[var(--danger)]" : "bg-[var(--dim2)]"}`} />
          <span className="text-xs text-[var(--dim)] hidden md:inline">
            {online === true ? "operational" : online === false ? "offline" : "checking…"}
          </span>
          <Link href="/login" className="btn btn-primary text-xs py-2 px-4">
            sign in →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative flex-1 flex items-center justify-center px-6 py-16 md:py-24 overflow-hidden">
        <div className="hero-grid-bg" />
        <div className="relative max-w-4xl w-full text-center">
          <div className="anim-up anim-d1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border2)] bg-black/40 text-xs text-[var(--dim)] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] pulse-cyan" />
            telegram automation platform
          </div>

          <h1 className="anim-up anim-d2 text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-[var(--text)]">broadcast.</span>{" "}
            <span className="glow-text">automate.</span>{" "}
            <span className="text-[var(--text)]">scale.</span>
          </h1>

          <p className="anim-up anim-d3 text-[var(--dim)] max-w-xl mx-auto text-sm md:text-base leading-relaxed mb-10">
            Connect your Telegram accounts, select target groups, and blast messages
            on schedule — all from a single dashboard.
          </p>

          <div className="anim-up anim-d4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="btn btn-primary text-sm px-6 py-3">
              start now →
            </Link>
            <a href="#features" className="btn text-sm px-6 py-3">
              learn more
            </a>
          </div>

          {/* terminal preview */}
          <div className="anim-up anim-d4 mt-14 mx-auto max-w-lg text-left">
            <div className="card corner p-4 text-xs">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--border)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--danger)]/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--amber)]/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--ok)]/60" />
                <span className="ml-2 text-[var(--dim2)]">terminal</span>
              </div>
              <div className="space-y-1.5 text-[var(--dim)]">
                <div><span className="text-[var(--cyan)]">$</span> topupbuzz connect</div>
                <div className="text-[var(--dim2)]">→ establishing session...</div>
                <div><span className="text-[var(--ok)]">✓</span> authenticated</div>
                <div><span className="text-[var(--cyan)]">$</span> campaign start</div>
                <div className="text-[var(--dim2)]">→ blasting 42 groups...</div>
                <div><span className="text-[var(--ok)]">✓</span> delivered 42/42 in 3.2s</div>
                <div className="text-[var(--cyan)]">▊</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative px-6 md:px-10 py-20 border-t border-[var(--border)]/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              <span className="text-[var(--dim)]">&gt;</span>{" "}
              <span className="glow-text-sm">capabilities</span>
            </h2>
            <p className="text-[var(--dim)] text-sm">everything you need in one place</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: "◈", title: "multi-account", desc: "connect unlimited telegram accounts with secure session storage." },
              { icon: "◉", title: "smart filtering", desc: "auto-detect groups, filter by keyword, blacklist unwanted targets." },
              { icon: "▶", title: "scheduled blast", desc: "set interval and fire to all selected groups simultaneously." },
              { icon: "≡", title: "live logs", desc: "watch every delivery in real-time with detailed status." },
              { icon: "🛡", title: "flood-safe", desc: "built-in jitter and concurrency control to avoid bans." },
              { icon: "◆", title: "web panel", desc: "control everything from a clean, dark, keyboard-friendly UI." },
            ].map((f, i) => (
              <div key={i} className={`card card-glow corner p-5 anim-up anim-d${(i % 4) + 1}`}>
                <div className="text-[var(--cyan)] text-2xl mb-3">{f.icon}</div>
                <h3 className="text-[var(--text)] text-sm mb-1.5 tracking-wide">{f.title}</h3>
                <p className="text-[var(--dim)] text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--border)]/40 px-6 md:px-10 py-6 text-xs text-[var(--dim2)] flex flex-wrap justify-between gap-2">
        <span>topupbuzz // internal use only</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
