"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getHealth, telegramMiniAuth, saveLocal, getLocal } from "@/lib/api";

function waitForTelegram(timeout = 2000): Promise<any> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) return resolve(tg);
      if (Date.now() - start > timeout) return resolve(null);
      setTimeout(check, 50);
    };
    check();
  });
}

export default function Landing() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "landing">("checking");
  const [online, setOnline] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      // 1. Existing session
      if (getLocal("session")) {
        router.push("/dashboard");
        return;
      }

      // 2. Wait for Telegram SDK
      const tg = await waitForTelegram(2500);

      if (tg && tg.initData && tg.initData.length > 0) {
        // 3. Auto-login via Mini App
        try {
          tg.ready();
          tg.expand();
          const res = await telegramMiniAuth(tg.initData);
          saveLocal("session", res.user);
          router.push("/dashboard");
          return;
        } catch (e: any) {
          setError(e?.response?.data?.detail || "auth failed");
        }
      } else if (tg && !tg.initData) {
        // Opened in Telegram but initData missing — probably opened as regular URL
        setError("opened outside mini app — use the button below");
      }

      setState("landing");
    })();

    getHealth().then(() => setOnline(true)).catch(() => setOnline(false));
  }, [router]);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-[var(--cyan)] text-3xl mb-3">◆</div>
          <div className="text-xs text-[var(--dim)]">checking…</div>
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
        <span className={`w-2 h-2 rounded-full ${online ? "bg-[var(--ok)] pulse-cyan" : "bg-[var(--danger)]"}`} />
      </nav>

      <section className="relative flex-1 flex items-center justify-center px-6 py-16 overflow-hidden">
        <div className="hero-grid-bg" />
        <div className="relative max-w-3xl w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border2)] bg-black/40 text-xs text-[var(--dim)] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] pulse-cyan" />
            telegram automation platform
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            <span>broadcast.</span>{" "}
            <span className="glow-text">automate.</span>{" "}
            <span>scale.</span>
          </h1>

          <p className="text-[var(--dim)] max-w-lg mx-auto text-sm md:text-base mb-10">
            Open from Telegram bot — auto-authenticated via Mini App.
          </p>

          {error && (
            <div className="mb-6 p-3 rounded border border-[var(--amber)]/40 bg-[var(--amber)]/5 text-xs text-[var(--amber)] max-w-md mx-auto">
              ⚠ {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://t.me/S4JahidBot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary text-sm px-6 py-3"
            >
              open in telegram →
            </a>
            <Link href="/login" className="btn text-sm px-6 py-3">
              web login
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]/40 px-6 py-6 text-xs text-[var(--dim2)] flex justify-between">
        <span>topupbuzz // internal</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
