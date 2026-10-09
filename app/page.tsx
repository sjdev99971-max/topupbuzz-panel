"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getHealth, getTelegramWebApp, telegramMiniAuth, saveLocal, getLocal } from "@/lib/api";

export default function Landing() {
  const router = useRouter();
  const [online, setOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const existing = getLocal("session");
    if (existing) { router.push("/dashboard"); return; }

    const tg = getTelegramWebApp();
    if (tg?.initData) {
      telegramMiniAuth(tg.initData)
        .then(res => {
          saveLocal("session", res.user);
          tg.expand?.();
          router.push("/dashboard");
        })
        .catch(() => setChecking(false));
    } else {
      setChecking(false);
    }

    getHealth().then(() => setOnline(true)).catch(() => setOnline(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-[var(--cyan)] text-3xl mb-3">◆</div>
          <div className="text-xs text-[var(--dim)]">authenticating…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="px-6 md:px-10 py-5 flex items-center justify-between border-b border-[var(--border)]/40">
        <div className="flex items-center gap-3">
          <span className="text-[var(--cyan)] text-xl">◆</span>
          <span className="text-sm">topupbuzz<span className="text-[var(--cyan)]">.</span>control</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${online ? "bg-[var(--ok)] pulse-cyan" : "bg-[var(--danger)]"}`} />
          <span className="text-xs text-[var(--dim)] hidden md:inline">
            {online ? "operational" : "offline"}
          </span>
        </div>
      </nav>

      <section className="relative flex-1 flex items-center justify-center px-6 py-16 overflow-hidden">
        <div className="hero-grid-bg" />
        <div className="relative max-w-3xl w-full text-center">
          <div className="anim-up anim-d1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border2)] bg-black/40 text-xs text-[var(--dim)] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] pulse-cyan" />
            telegram automation platform
          </div>

          <h1 className="anim-up anim-d2 text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-[var(--text)]">broadcast.</span>{" "}
            <span className="glow-text">automate.</span>{" "}
            <span className="text-[var(--text)]">scale.</span>
          </h1>

          <p className="anim-up anim-d3 text-[var(--dim)] max-w-lg mx-auto text-sm md:text-base leading-relaxed mb-10">
            Open from Telegram bot — auto-authenticated via Mini App. No passwords, no OTP.
          </p>

          <div className="anim-up anim-d4 flex flex-wrap items-center justify-center gap-3">
            <a href="https://t.me/topupbuzz_bot" target="_blank" rel="noopener noreferrer" className="btn btn-primary text-sm px-6 py-3">
              open in telegram →
            </a>
            <Link href="/login" className="btn text-sm px-6 py-3">
              web login
            </Link>
          </div>

          <p className="anim-up anim-d4 text-[10px] text-[var(--dim2)] mt-6">
            for accounts with 2FA — use web login
          </p>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]/40 px-6 py-6 text-xs text-[var(--dim2)] flex justify-between">
        <span>topupbuzz // internal</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
