"use client";

import { useEffect, useState, useCallback } from "react";
import { getHealth, getAccounts, getLogs } from "@/lib/api";

type Tab = "overview" | "accounts" | "campaigns" | "logs";

const SIDEBAR = [
  { id: "overview",  label: "overview",  icon: "◆" },
  { id: "accounts",  label: "accounts",  icon: "◈" },
  { id: "campaigns", label: "campaigns", icon: "▲" },
  { id: "logs",      label: "logs",      icon: "≡" },
] as const;

export default function Home() {
  const [tab, setTab] = useState<Tab>("overview");
  const [health, setHealth] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>("");
  const [time, setTime] = useState<string>("");

  const refresh = useCallback(async () => {
    try {
      const [h, a] = await Promise.all([getHealth(), getAccounts()]);
      setHealth(h);
      setAccounts(a);
      setError("");
      setLastSync(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e?.message || "connection failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    const tick = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => { clearInterval(id); clearInterval(tick); };
  }, [refresh]);

  const online = health && !error;

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur-sm sticky top-0 z-20">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-[var(--accent)] text-lg font-bold">◆</div>
            <div>
              <div className="text-[var(--text)] text-sm">
                <span className="text-[var(--text-dim)]">$</span> topupbuzz<span className="text-[var(--accent)]">.</span>control
              </div>
              <div className="text-[10px] text-[var(--text-dim)] tracking-widest uppercase">
                v0.1 / internal
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex items-center gap-2 text-[var(--text-dim)]">
              <span>time</span>
              <span className="text-[var(--text)]">{time}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${online ? "bg-[var(--success)] pulse-dot" : "bg-[var(--danger)]"}`} />
              <span className={online ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                {online ? "online" : "offline"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* SIDEBAR */}
        <aside className="md:w-56 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--surface)]/40">
          <nav className="flex md:flex-col overflow-x-auto md:overflow-visible">
            {SIDEBAR.map((s) => (
              <div
                key={s.id}
                onClick={() => setTab(s.id as Tab)}
                className={`nav-item whitespace-nowrap ${tab === s.id ? "active" : ""}`}
              >
                <span className="opacity-70">{s.icon}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </nav>
          <div className="hidden md:block p-4 mt-auto border-t border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-1">last sync</div>
            <div className="text-[11px] text-[var(--text)]">{lastSync || "—"}</div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-4 md:p-6 fade-in" key={tab}>
          {tab === "overview" && (
            <OverviewTab
              health={health}
              accounts={accounts}
              error={error}
              loading={loading}
              onRefresh={refresh}
            />
          )}
          {tab === "accounts" && <AccountsTab accounts={accounts} loading={loading} />}
          {tab === "campaigns" && <CampaignsTab accounts={accounts} />}
          {tab === "logs" && <LogsTab accounts={accounts} />}
        </main>
      </div>

      <footer className="border-t border-[var(--border)] px-4 md:px-6 py-3 text-[10px] text-[var(--text-dim)] flex justify-between">
        <span>topupbuzz // built with next + fastapi</span>
        <span className="hidden md:inline">api: apis.topup.buzz</span>
      </footer>
    </div>
  );
}

/* ---------- TAB: OVERVIEW ---------- */
function OverviewTab({ health, accounts, error, loading, onRefresh }: any) {
  const stats = [
    { label: "accounts", value: accounts.length, accent: "var(--accent)" },
    { label: "active", value: accounts.filter((a: any) => a.health === "Safe").length, accent: "var(--success)" },
    { label: "flagged", value: accounts.filter((a: any) => a.health !== "Safe").length, accent: "var(--warn)" },
    { label: "uptime", value: health ? "up" : "—", accent: "var(--accent2)" },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle title="system overview" subtitle="real-time status" onRefresh={onRefresh} />

      {error && (
        <div className="card card-corner p-4 border-[var(--danger)]/40">
          <div className="text-[var(--danger)] text-xs uppercase tracking-wider mb-1">
            ✕ connection error
          </div>
          <div className="text-[var(--text)] text-sm">{error}</div>
        </div>
      )}

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
              {s.label}
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: s.accent }}>
              {loading ? "…" : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* HEALTH PANEL */}
      <div className="card card-corner p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-[var(--text)]">
            <span className="text-[var(--text-dim)]">&gt;</span> backend health
          </h3>
          {health && (
            <span className="tag tag-ok">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] pulse-dot" />
              responding
            </span>
          )}
        </div>
        <pre className="text-xs text-[var(--accent)] bg-black/30 p-4 rounded border border-[var(--border)] overflow-auto max-h-64">
{health ? JSON.stringify(health, null, 2) : loading ? "// pinging backend..." : "// no data"}
        </pre>
      </div>

      {/* RECENT ACCOUNTS */}
      <div className="card p-5">
        <h3 className="text-sm mb-3">
          <span className="text-[var(--text-dim)]">&gt;</span> recent accounts
        </h3>
        {accounts.length === 0 ? (
          <div className="text-[var(--text-dim)] text-xs py-6 text-center">
            // no accounts registered
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.slice(0, 5).map((a: any) => (
              <div key={a.id}
                className="flex items-center justify-between p-3 rounded border border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--accent)] text-xs">◈</span>
                  <span className="text-sm">{a.phone}</span>
                </div>
                <span className={`tag ${a.health === "Safe" ? "tag-ok" : "tag-warn"}`}>
                  {a.health}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- TAB: ACCOUNTS ---------- */
function AccountsTab({ accounts, loading }: any) {
  return (
    <div className="space-y-4">
      <SectionTitle title="accounts" subtitle={`${accounts.length} registered`} />

      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-primary">+ add account</button>
        <button className="btn">↻ refresh</button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-[var(--text-dim)] text-xs">
          // loading accounts...
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-[var(--text-dim)] text-xs mb-3">// no accounts yet</div>
          <button className="btn btn-primary">+ register first account</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {accounts.map((a: any) => (
            <div key={a.id} className="card card-corner p-4 hover:bg-[var(--surface3)]/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[var(--surface3)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                    ◈
                  </div>
                  <div>
                    <div className="text-sm">{a.phone}</div>
                    <div className="text-[10px] text-[var(--text-dim)]">id: {a.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`tag ${a.health === "Safe" ? "tag-ok" : "tag-warn"}`}>
                    {a.health}
                  </span>
                  <button className="btn">settings</button>
                  <button className="btn btn-danger">remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- TAB: CAMPAIGNS ---------- */
function CampaignsTab({ accounts }: any) {
  return (
    <div className="space-y-4">
      <SectionTitle title="campaigns" subtitle="blast scheduler" />

      {accounts.length === 0 ? (
        <div className="card p-8 text-center text-[var(--text-dim)] text-xs">
          // add an account first
        </div>
      ) : (
        <div className="grid gap-3">
          {accounts.map((a: any) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm">{a.phone}</div>
                  <div className="text-[10px] text-[var(--text-dim)]">campaign for {a.id}</div>
                </div>
                <span className="tag tag-neutral">idle</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <Field label="source" value="—" />
                <Field label="groups" value="0" />
                <Field label="interval" value="5m" />
                <Field label="status" value="stopped" />
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn btn-primary">▶ start</button>
                <button className="btn">configure</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- TAB: LOGS ---------- */
function LogsTab({ accounts }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (!selected && accounts.length > 0) setSelected(accounts[0].id);
  }, [accounts, selected]);

  useEffect(() => {
    if (!selected) return;
    getLogs(selected).then(setLogs).catch(() => setLogs([]));
  }, [selected]);

  return (
    <div className="space-y-4">
      <SectionTitle title="logs" subtitle="broadcast history" />

      <div className="flex gap-2 flex-wrap">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-[var(--surface2)] border border-[var(--border)] rounded px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
        >
          <option value="">— select account —</option>
          {accounts.map((a: any) => (
            <option key={a.id} value={a.id}>{a.phone}</option>
          ))}
        </select>
        <button className="btn">↻ refresh</button>
      </div>

      <div className="card p-4 bg-black/20">
        {logs.length === 0 ? (
          <div className="text-[var(--text-dim)] text-xs py-6 text-center">
            // no log entries
          </div>
        ) : (
          <div className="space-y-1 text-xs">
            {logs.map((l: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)]/40 last:border-0">
                <span className="text-[var(--text-dim)] w-40 shrink-0">{l.ts}</span>
                <span className={`tag ${l.status?.startsWith("success") ? "tag-ok" : "tag-err"} shrink-0`}>
                  {l.status?.split(":")[0] || "?"}
                </span>
                <span className="text-[var(--text)] truncate">{l.group_title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- SHARED ---------- */
function SectionTitle({ title, subtitle, onRefresh }: any) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-lg text-[var(--text)]">
          <span className="text-[var(--text-dim)]">&gt;</span> {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] text-[var(--text-dim)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {onRefresh && (
        <button onClick={onRefresh} className="btn">↻ refresh</button>
      )}
    </div>
  );
}

function Field({ label, value }: any) {
  return (
    <div>
      <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">{label}</div>
      <div className="text-[var(--text)] mt-0.5">{value}</div>
    </div>
  );
}
