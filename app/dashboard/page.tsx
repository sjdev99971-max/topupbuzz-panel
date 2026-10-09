"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getHealth, getAccounts, getLocal, clearLocal, getTelegramWebApp, telegramMiniAuth, saveLocal } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 1. Try existing session
      let u = getLocal("session");
      // 2. Try Mini App auto-auth
      if (!u) {
        const tg = getTelegramWebApp();
        if (tg?.initData) {
          try {
            const res = await telegramMiniAuth(tg.initData);
            saveLocal("session", res.user);
            u = res.user;
          } catch {}
        }
      }
      if (!u) { router.push("/login"); return; }
      setUser(u);
      setAuthChecked(true);
    })();
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      const [h, a] = await Promise.all([getHealth(), getAccounts()]);
      setHealth(h); setAccounts(a); setError("");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [authChecked, refresh]);

  const logout = () => { clearLocal("session"); router.push("/login"); };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center text-[var(--dim)] text-xs">loading…</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--border)]/60 bg-[var(--bg)]/80 backdrop-blur-md px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[var(--cyan)] text-lg">◆</span>
          <span className="text-sm">topupbuzz<span className="text-[var(--cyan)]">.</span>control</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className={`w-2 h-2 rounded-full ${health && !error ? "bg-[var(--ok)] pulse-cyan" : "bg-[var(--danger)]"}`} />
          <span className={health && !error ? "text-[var(--ok)]" : "text-[var(--danger)]"}>
            {health && !error ? "online" : "offline"}
          </span>
          <span className="text-[var(--dim)] hidden md:inline">@{user?.username || user?.first_name || user?.id}</span>
          <button onClick={logout} className="btn text-[11px] py-1.5 px-3">logout</button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl mb-1"><span className="text-[var(--dim)]">&gt;</span> dashboard</h1>
        <p className="text-xs text-[var(--dim2)] mb-6">
          welcome, {user?.first_name || user?.username || "user"} 👋
        </p>

        {error && (
          <div className="card corner p-4 mb-4 border-[var(--danger)]/40">
            <div className="text-[var(--danger)] text-xs">✕ {error}</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card p-4"><div className="text-[10px] text-[var(--dim2)] uppercase">accounts</div><div className="text-2xl mt-1 text-[var(--cyan)]">{accounts.length}</div></div>
          <div className="card p-4"><div className="text-[10px] text-[var(--dim2)] uppercase">active</div><div className="text-2xl mt-1 text-[var(--ok)]">{accounts.filter((a:any)=>a.health==="Safe").length}</div></div>
          <div className="card p-4"><div className="text-[10px] text-[var(--dim2)] uppercase">flagged</div><div className="text-2xl mt-1 text-[var(--amber)]">{accounts.filter((a:any)=>a.health!=="Safe").length}</div></div>
          <div className="card p-4"><div className="text-[10px] text-[var(--dim2)] uppercase">backend</div><div className="text-2xl mt-1 text-[var(--purple)]">{health?"up":"—"}</div></div>
        </div>

        <div className="card corner p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm"><span className="text-[var(--dim)]">&gt;</span> accounts</h2>
            <Link href="/login" className="btn btn-primary text-xs">+ add account</Link>
          </div>
          {loading ? (
            <div className="text-center py-8 text-[var(--dim2)] text-xs">// loading…</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-[var(--dim2)] text-xs">// no accounts yet — click add</div>
          ) : (
            <div className="space-y-2">
              {accounts.map((a:any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded border border-[var(--border)] hover:border-[var(--cyan)]/40 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--cyan)]">◈</span>
                    <span className="text-sm">{a.phone}</span>
                  </div>
                  <span className={`tag ${a.health === "Safe" ? "tag-ok" : "tag-warn"}`}>{a.health}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[var(--border)]/60 px-4 md:px-6 py-3 text-[10px] text-[var(--dim2)] flex justify-between">
        <span>topupbuzz // internal</span>
        <span>apis.topup.buzz</span>
      </footer>
    </div>
  );
}
