"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getHealth, getAccounts, getLogs, getLocal, clearLocal } from "@/lib/api";

type Tab = "overview" | "accounts" | "campaigns" | "logs";

const SIDEBAR = [
  { id: "overview", label: "overview", icon: "◆" },
  { id: "accounts", label: "accounts", icon: "◈" },
  { id: "campaigns", label: "campaigns", icon: "▲" },
  { id: "logs", label: "logs", icon: "≡" },
] as const;

export default function Dashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [health, setHealth] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState("");
  const [lastSync, setLastSync] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = getLocal("account");
    if (!u) { router.push("/login"); return; }
    setUser(u);
    setAuthChecked(true);
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      const [h, a] = await Promise.all([getHealth(), getAccounts()]);
      setHealth(h); setAccounts(a); setError("");
      setLastSync(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e?.message || "connection failed");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    refresh();
    const id = setInterval(refresh, 15000);
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => { clearInterval(id); clearInterval(t); };
  }, [authChecked, refresh]);

  const logout = () => { clearLocal("account"); router.push("/login"); };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center text-[var(--dim)] text-xs">loading…</div>;

  const online = !!health && !error;

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)]/60 bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-[var(--cyan)] text-lg">◆</span>
            <div>
              <div className="text-sm">topupbuzz<span className="text-[var(--cyan)]">.</span>control</div>
              <div className="text-[10px] text-[var(--dim2)] uppercase tracking-widest">dashboard</div>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <div className="hidden md:flex items-center gap-2 text-[var(--dim2)]">
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${online ? "bg-[var(--ok)] pulse-cyan" : "bg-[var(--danger)]"}`} />
              <span className={online ? "text-[var(--ok)]" : "text-[var(--danger)]"}>
                {online ? "online" : "offline"}
              </span>
            </div>
            <button onClick={logout} className="btn text-[11px] py-1.5 px-3">
              logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* SIDEBAR */}
        <aside className="md:w-56 border-b md:border-b-0 md:border-r border-[var(--border)]/60 bg-[var(--bg2)]/40">
          <nav className="flex md:flex-col overflow-x-auto md:overflow-visible">
            {SIDEBAR.map(s => (
              <div key={s.id} onClick={() => setTab(s.id as Tab)}
                className={`nav-item whitespace-nowrap ${tab === s.id ? "active" : ""}`}>
                <span className="opacity-70">{s.icon}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </nav>
          <div className="hidden md:block p-4 border-t border-[var(--border)]/60">
            <div className="text-[10px] text-[var(--dim2)] uppercase tracking-wider mb-1">user</div>
            <div className="text-[11px] text-[var(--text)] truncate">{user?.phone || "—"}</div>
            <div className="text-[10px] text-[var(--dim2)] uppercase tracking-wider mt-3 mb-1">last sync</div>
            <div className="text-[11px] text-[var(--dim)]">{lastSync || "—"}</div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-4 md:p-6 max-w-full overflow-x-hidden">
          {tab === "overview" && <OverviewTab {...{ health, accounts, error, loading, refresh }} />}
          {tab === "accounts" && <AccountsTab {...{ accounts, loading, refresh, router }} />}
          {tab === "campaigns" && <CampaignsTab accounts={accounts} />}
          {tab === "logs" && <LogsTab accounts={accounts} />}
        </main>
      </div>

      <footer className="border-t border-[var(--border)]/60 px-4 md:px-6 py-3 text-[10px] text-[var(--dim2)] flex justify-between">
        <span>topupbuzz // internal</span>
        <span className="hidden md:inline">apis.topup.buzz</span>
      </footer>
    </div>
  );
}

function SectionTitle({ title, subtitle, onRefresh }: any) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
      <div>
        <h1 className="text-lg"><span className="text-[var(--dim)]">&gt;</span> {title}</h1>
        {subtitle && <p className="text-[11px] text-[var(--dim2)] mt-0.5">{subtitle}</p>}
      </div>
      {onRefresh && <button onClick={onRefresh} className="btn text-xs">↻ refresh</button>}
    </div>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="card p-4">
      <div className="text-[10px] text-[var(--dim2)] uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color }}>{value}</div>
    </div>
  );
}

function OverviewTab({ health, accounts, error, loading, refresh }: any) {
  const active = accounts.filter((a: any) => a.health === "Safe").length;
  const flagged = accounts.length - active;
  return (
    <>
      <SectionTitle title="overview" subtitle="real-time system status" onRefresh={refresh} />
      {error && (
        <div className="card corner p-4 mb-4 border-[var(--danger)]/40 bg-[var(--danger)]/5">
          <div className="text-[var(--danger)] text-xs uppercase tracking-wider mb-1">✕ connection error</div>
          <div className="text-sm">{error}</div>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="accounts" value={loading ? "…" : accounts.length} color="var(--cyan)" />
        <StatCard label="active" value={loading ? "…" : active} color="var(--ok)" />
        <StatCard label="flagged" value={loading ? "…" : flagged} color="var(--amber)" />
        <StatCard label="backend" value={health ? "up" : "—"} color="var(--purple)" />
      </div>
      <div className="card corner p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm"><span className="text-[var(--dim)]">&gt;</span> backend health</h3>
          {health && <span className="tag tag-ok"><span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] pulse-cyan" /> responding</span>}
        </div>
        <pre className="text-xs text-[var(--cyan)] bg-black/40 p-4 rounded border border-[var(--border)] overflow-auto max-h-64">
{health ? JSON.stringify(health, null, 2) : loading ? "// pinging…" : "// no data"}
        </pre>
      </div>
      <div className="card p-5">
        <h3 className="text-sm mb-3"><span className="text-[var(--dim)]">&gt;</span> recent accounts</h3>
        {accounts.length === 0 ? (
          <div className="text-[var(--dim2)] text-xs py-6 text-center">// no accounts — go to accounts tab to add one</div>
        ) : (
          <div className="space-y-2">
            {accounts.slice(0, 5).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded border border-[var(--border)] hover:border-[var(--cyan)]/40 transition">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--cyan)] text-xs">◈</span>
                  <span className="text-sm">{a.phone}</span>
                </div>
                <span className={`tag ${a.health === "Safe" ? "tag-ok" : "tag-warn"}`}>{a.health}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AccountsTab({ accounts, loading, refresh, router }: any) {
  return (
    <>
      <SectionTitle title="accounts" subtitle={`${accounts.length} registered`} onRefresh={refresh} />
      <div className="mb-4">
        <button onClick={() => router.push("/login")} className="btn btn-primary">+ add account</button>
      </div>
      {loading ? (
        <div className="card p-8 text-center text-[var(--dim)] text-xs">// loading…</div>
      ) : accounts.length === 0 ? (
        <div className="card corner p-10 text-center">
          <div className="text-[var(--dim)] text-xs mb-4">// no accounts yet</div>
          <button onClick={() => router.push("/login")} className="btn btn-primary">
            + connect first account
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {accounts.map((a: any) => (
            <div key={a.id} className="card card-glow corner p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[var(--surface3)] border border-[var(--border2)] flex items-center justify-center text-[var(--cyan)]">◈</div>
                  <div>
                    <div className="text-sm">{a.phone}</div>
                    <div className="text-[10px] text-[var(--dim2)]">id: {a.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`tag ${a.health === "Safe" ? "tag-ok" : "tag-warn"}`}>{a.health}</span>
                  <button className="btn text-xs py-1.5 px-3">settings</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function CampaignsTab({ accounts }: any) {
  return (
    <>
      <SectionTitle title="campaigns" subtitle="blast scheduler" />
      {accounts.length === 0 ? (
        <div className="card p-8 text-center text-[var(--dim2)] text-xs">// add an account first</div>
      ) : (
        <div className="grid gap-3">
          {accounts.map((a: any) => (
            <div key={a.id} className="card corner p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm">{a.phone}</div>
                  <div className="text-[10px] text-[var(--dim2)]">{a.id}</div>
                </div>
                <span className="tag tag-neutral">idle</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                <div><div className="text-[10px] text-[var(--dim2)] uppercase tracking-wider">source</div><div className="mt-0.5">—</div></div>
                <div><div className="text-[10px] text-[var(--dim2)] uppercase tracking-wider">groups</div><div className="mt-0.5">0</div></div>
                <div><div className="text-[10px] text-[var(--dim2)] uppercase tracking-wider">interval</div><div className="mt-0.5">5m</div></div>
                <div><div className="text-[10px] text-[var(--dim2)] uppercase tracking-wider">status</div><div className="mt-0.5">stopped</div></div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary text-xs">▶ start</button>
                <button className="btn text-xs">configure</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function LogsTab({ accounts }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  useEffect(() => { if (!selected && accounts.length > 0) setSelected(accounts[0].id); }, [accounts, selected]);
  useEffect(() => {
    if (!selected) return;
    getLogs(selected).then(setLogs).catch(() => setLogs([]));
  }, [selected]);
  return (
    <>
      <SectionTitle title="logs" subtitle="broadcast history" />
      <div className="flex gap-2 flex-wrap mb-4">
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="inp max-w-xs">
          <option value="">— select account —</option>
          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.phone}</option>)}
        </select>
      </div>
      <div className="card p-4 bg-black/30">
        {logs.length === 0 ? (
          <div className="text-[var(--dim2)] text-xs py-8 text-center">// no log entries</div>
        ) : (
          <div className="space-y-1 text-xs">
            {logs.map((l: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)]/40 last:border-0">
                <span className="text-[var(--dim2)] w-40 shrink-0">{l.ts}</span>
                <span className={`tag ${l.status?.startsWith("success") ? "tag-ok" : "tag-err"} shrink-0`}>
                  {l.status?.split(":")[0] || "?"}
                </span>
                <span className="truncate">{l.group_title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
