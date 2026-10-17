"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import HelpModal from "@/components/HelpModal";
import RefreshButton from "@/components/RefreshButton";
import { filterAccounts, sortAccounts } from "@/lib/filters";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import HealthDashboard from "@/components/HealthDashboard";
import MobileNav from "@/components/MobileNav";
import Avatar from "@/components/Avatar";
import StealthBanner from "@/components/StealthBanner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SkelList } from "@/components/Skeleton";
import { toast } from "@/components/Toast";
import {
  getHealth, getMe, getAccounts, getPlans, getLocal, saveLocal, clearLocal,
  getTelegramWebApp, telegramMiniAuth, deleteAccount, getSession,
  getMyStats, setStealth, SUPPORT_USER
} from "@/lib/api";

type Tab = "overview" | "accounts" | "analytics" | "health" | "plans";

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

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const tg = await waitForTelegram(2500);
      // Always try fresh mini-auth first
      if (tg?.initData) {
        try {
          tg.ready(); tg.expand();
          const res = await telegramMiniAuth(tg.initData);
          saveLocal("session", res.user);
          setMe(res.user);
          setReady(true);
          return;
        } catch (e: any) {
          console.error("Mini auth failed:", e?.response?.data);
        }
      }
      // Fallback to localStorage
      const session = getLocal("session");
      if (session) { setMe(session); setReady(true); return; }
      router.push("/login");
    })();
  }, [router]);

  const refresh = useCallback(async () => {
    const calls: [string, Promise<any>][] = [
      ["health", getHealth()], ["accounts", getAccounts()],
      ["plans", getPlans()], ["me", getMe()], ["stats", getMyStats()]
    ];
    const results = await Promise.allSettled(calls.map(c => c[1]));
    const failed: string[] = [];
    results.forEach((r, i) => {
      const name = calls[i][0];
      if (r.status === "fulfilled") {
        if (name === "health") setHealth(r.value);
        if (name === "accounts") setAccounts(r.value);
        if (name === "plans") setPlans(r.value);
        if (name === "me") { setMe(r.value); saveLocal("session", r.value); }
        if (name === "stats") setStats(r.value);
      } else {
        const status = (r.reason as any)?.response?.status || "?";
        const detail = (r.reason as any)?.response?.data?.detail || (r.reason as any)?.message || "err";
        failed.push(`${name}[${status}]: ${detail}`);
        console.error(`❌ ${name} failed:`, status, detail);
      }
    });
    setError(failed.length > 0 ? failed.join(" · ") : "");
    const m = results[3];

    // Only logout on hard 401 for /me
    if (m.status === "rejected" && (m as any).reason?.response?.status === 401) {
      clearLocal("session"); router.push("/"); return;
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    refresh();
    // Auto-refresh removed for mobile performance
  }, [ready, refresh]);

  const logout = () => { clearLocal("session"); clearLocal("stealth_id"); router.push("/"); };

  const copySession = async (id: string) => {
    try {
      const r = await getSession(id);
      await navigator.clipboard.writeText(r.session);
      toast("session copied", "success");
    } catch { toast("copy failed", "error"); }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteAccount(confirmDel.id);
      toast("deleted", "success");
      setConfirmDel(null);
      refresh();
    } catch { toast("delete failed", "error"); }
  };

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--border2)] border-t-[var(--accent)] rounded-full spin" />
    </div>
  );

  const tabs: {id: Tab; label: string; icon: string}[] = [
    { id: "overview", label: "Home", icon: "◆" },
    { id: "accounts", label: "Accounts", icon: "▤" },
    { id: "analytics", label: "Stats", icon: "▲" },
    { id: "health", label: "Health", icon: "◉" },
    { id: "plans", label: "Plans", icon: "★" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <StealthBanner />

      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-lg">
        <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">T</div>
            <span className="font-semibold text-[15px]">TopUpBuzz</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${health && !error ? "bg-[var(--success)]" : "bg-[var(--danger)]"}`} />
            <span className="text-xs text-[var(--dim)] hidden sm:inline">
              {health && !error ? "Connected" : "Offline"}
            </span>
            {(me?.is_admin || String(me?.id) === "6860469874") && (
              <Link href="/admin" className="btn btn-sm hidden sm:inline-flex">
                <span className="text-[var(--accent2)]">♛</span>
                Admin
              </Link>
            )}
            <a href={`${process.env.NEXT_PUBLIC_API_URL}/export/csv`} className="btn btn-sm btn-icon hidden sm:inline-flex" title="Export CSV" download
               onClick={(e) => {
                 // Can't send custom headers via <a>, use fetch
                 e.preventDefault();
                 fetch(`${process.env.NEXT_PUBLIC_API_URL}/export/csv`, {
                   headers: {
                     "X-Api-Key": process.env.NEXT_PUBLIC_API_KEY || "",
                     "X-Telegram-Id": String(me?.id || ""),
                   }
                 }).then(r => r.blob()).then(b => {
                   const u = URL.createObjectURL(b);
                   const a = document.createElement("a");
                   a.href = u; a.download = `logs_${Date.now()}.csv`; a.click();
                   URL.revokeObjectURL(u);
                 }).catch(() => {});
               }}>
              ⬇
            </a>
            <NotificationBell />
            <RefreshButton onRefresh={refresh} />
            
            <button onClick={logout} className="btn btn-sm btn-ghost">
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">⏏</span>
            </button>
          </div>
        </div>
      </header>

      {/* LAYOUT */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* SIDEBAR */}
        <aside className="md:w-60 border-b md:border-b-0 md:border-r border-[var(--border)] md:min-h-[calc(100vh-3.5rem)] md:sticky md:top-14 md:self-start">
          {/* Profile */}
          <div className="p-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <Avatar user={me} size={44} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  {me?.first_name || me?.username || "user"}
                </div>
                {me?.username && (
                  <div className="text-xs text-[var(--dim)] truncate">@{me.username}</div>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <span className={`tag ${me?.plan === "unverified" ? "tag-neutral" : me?.plan === "max" ? "tag-purple" : "tag-info"}`}>
                {me?.plan || "unverified"}
              </span>
              {me?.is_admin && <span className="tag tag-err">admin</span>}
              {me?.stealth_active && <span className="tag tag-warn">stealth</span>}
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex md:flex-col py-2">
            {tabs.map(s => (
              <div key={s.id} onClick={() => setTab(s.id)}
                className={`nav-item whitespace-nowrap ${tab === s.id ? "active" : ""}`}>
                <span className="opacity-70 text-sm">{s.icon}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* MAIN */}
        <main className="flex-1 min-w-0 p-4 md:p-8">
          {error && (
            <div className="card p-3 mb-5 border-[var(--danger)]/40 bg-[var(--danger)]/5 text-xs text-[var(--danger)] fade">
              ✕ {error}
            </div>
          )}

          {tab === "overview" && <Overview me={me} stats={stats} accounts={accounts} loading={loading} />}
          {tab === "accounts" && <Accounts accounts={accounts} loading={loading} router={router} onDelete={setConfirmDel} onCopySession={copySession} refresh={refresh} />}
          {tab === "analytics" && <AnalyticsPanel />}
          {tab === "health" && <HealthDashboard />}
          {tab === "plans" && <Plans plans={plans} me={me} />}
        </main>
      </div>

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete account?"
        message={`Remove ${confirmDel?.phone}? This cannot be undone.`}
        danger
        onCancel={() => setConfirmDel(null)}
        onConfirm={doDelete}
      />

      <HelpModal />

      <MobileNav tabs={tabs} active={tab} onChange={(id: string) => setTab(id as Tab)} isAdmin={!!(me?.is_admin || String(me?.id) === "6860469874")} />

      <footer className="border-t border-[var(--border)] px-4 md:px-6 py-3 text-[11px] text-[var(--dim2)] flex justify-between">
        <span>topupbuzz // v0.2</span>
        <a href={`https://t.me/${SUPPORT_USER.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">
          {SUPPORT_USER}
        </a>
      </footer>
    </div>
  );
}

/* ============ OVERVIEW ============ */
function Overview({ me, stats, accounts, loading }: any) {
  const limits = me?.limits || {};
  const t = stats?.totals || {};
  const success = Number(t.success) || 0;
  const failed = Number(t.failed) || 0;
  const total = Number(t.total) || 0;
  const rate = total ? (success / total) * 100 : 0;
  const usagePct = limits.max_accounts ? Math.min(100, (accounts.length / limits.max_accounts) * 100) : 0;

  return (
    <div className="fade space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-[var(--dim)] mt-0.5">
          Welcome back, {me?.first_name || me?.username || "user"}
        </p>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Accounts" value={loading ? "…" : `${accounts.length}/${limits.max_accounts || 0}`}
          sub={usagePct > 0 ? `${usagePct.toFixed(0)}% used` : undefined} />
        <StatCard label="Messages Sent" value={total.toLocaleString()} sub="all time" />
        <StatCard label="Success Rate" value={`${rate.toFixed(1)}%`}
          sub={`${success} ok / ${failed} failed`}
          accent={rate >= 90 ? "success" : rate >= 70 ? "warning" : "danger"} />
        <StatCard label="Active Accounts" value={Number(t.accounts_active) || 0} sub="used in campaigns" />
      </div>

      {/* USAGE BAR */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold">Plan usage</div>
            <div className="text-xs text-[var(--dim)]">{me?.plan || "unverified"} plan</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--dim)]">Accounts</div>
            <div className="text-sm font-semibold">{accounts.length} / {limits.max_accounts || 0}</div>
          </div>
        </div>
        <div className="bar">
          <div className={`bar-fill ${usagePct > 80 ? "warn" : ""}`} style={{ width: `${usagePct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-[var(--border)]">
          <MiniStat label="Max accounts" value={limits.max_accounts ?? 0} />
          <MiniStat label="Daily joins" value={limits.max_daily_joins ?? 0} />
          <MiniStat label="Daily messages" value={limits.max_daily_messages ?? 0} />
        </div>
      </div>

      {/* ACTIVITY CHART */}
      {stats?.daily?.length > 0 ? (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-sm font-semibold">Activity</div>
              <div className="text-xs text-[var(--dim)]">Last 7 days</div>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--dim)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[var(--success)]" /> Success
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[var(--danger)]" /> Failed
              </span>
            </div>
          </div>
          <ChartBars daily={stats.daily} />
        </div>
      ) : (
        <div className="card p-8 text-center">
          <div className="text-2xl mb-2 opacity-30">◈</div>
          <div className="text-sm text-[var(--dim)]">No activity yet</div>
          <div className="text-xs text-[var(--dim2)] mt-1">Configure an account to start campaigns</div>
        </div>
      )}
    </div>
  );
}

/* ============ ACCOUNTS ============ */
function Accounts({ accounts, loading, router, onDelete, onCopySession, refresh }: any) {
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"created" | "phone" | "health">("created");
  const filtered = sortAccounts(filterAccounts(accounts, q), sortBy);

  return (
    <div className="fade space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-[var(--dim)] mt-0.5">{accounts.length} registered</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="inp text-xs py-2 max-w-[140px]" placeholder="Search…"
            value={q} onChange={e => setQ(e.target.value)} />
          <select className="inp text-xs py-2 max-w-[110px]"
            value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="created">Newest</option>
            <option value="phone">Phone</option>
            <option value="health">Health</option>
          </select>
          <button onClick={refresh} className="btn btn-sm" title="Refresh">↻</button>
          <button onClick={() => router.push("/login")} className="btn btn-primary btn-sm">+ Add</button>
        </div>
      </div>

      {loading ? <SkelList count={3} /> : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-3xl mb-3 opacity-30">▤</div>
          <div className="text-sm text-[var(--dim)] mb-4">No accounts yet</div>
          <button onClick={() => router.push("/login")} className="btn btn-primary">Connect your first account</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((a: any) => (
            <div key={a.id} className="card card-hover p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-[var(--surface3)] flex items-center justify-center text-[var(--accent)] shrink-0 text-sm font-bold">▤</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate mono">{a.phone}</div>
                    <div className="text-[11px] text-[var(--dim2)] truncate mono">{a.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`tag ${a.health === "Safe" ? "tag-ok" : "tag-warn"}`}>
                    {a.health}
                  </span>
                  <button onClick={() => router.push(`/dashboard/accounts/${a.id}`)} className="btn btn-sm btn-primary">
                    Configure
                  </button>
                  <button onClick={() => onCopySession(a.id)} className="btn btn-sm btn-icon" title="Copy session">⎘</button>
                  <button onClick={() => onDelete(a)} className="btn btn-sm btn-icon btn-danger" title="Delete">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ PLANS ============ */
function Plans({ plans, me }: any) {
  return (
    <div className="fade space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Plans</h1>
        <p className="text-sm text-[var(--dim)] mt-0.5">Choose what fits your needs</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p: any) => {
          const current = me?.plan === p.name;
          const isMax = p.name === "max";
          return (
            <div key={p.name} className={`card p-5 relative ${current ? "border-[var(--accent)]" : "card-hover"}`}>
              {current && (
                <div className="absolute -top-2.5 left-5 px-2 py-0.5 text-[10px] font-bold bg-[var(--accent)] text-white rounded-full uppercase tracking-wider">
                  Current
                </div>
              )}
              <div className="text-xs font-semibold text-[var(--dim)] uppercase tracking-wider mb-3">
                {p.name}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold">৳{p.price}</span>
                <span className="text-xs text-[var(--dim)]">/ {p.days}d</span>
              </div>
              <div className="space-y-2 mt-5 mb-6 text-[13px]">
                <Feature label={`${p.max_accounts} Telegram accounts`} on={p.max_accounts > 0} />
                <Feature label={`${p.max_daily_joins} group joins/day`} on={p.max_daily_joins > 0} />
                <Feature label={`${p.max_daily_messages} messages/day`} on={p.max_daily_messages > 0} />
                <Feature label="Campaign scheduler" on={p.price > 0} />
                <Feature label="Live logs & analytics" on={p.price > 0} />
              </div>
              {!current && p.price > 0 ? (
                <a href={`https://t.me/${SUPPORT_USER.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                  className={`btn w-full ${isMax ? "btn-primary" : ""}`}>
                  Get started
                </a>
              ) : current ? (
                <button disabled className="btn w-full" style={{opacity:0.5}}>Your plan</button>
              ) : (
                <button disabled className="btn w-full" style={{opacity:0.5}}>Free</button>
              )}
            </div>
          );
        })}
      </div>

      <div className="card p-6 text-center">
        <div className="text-sm text-[var(--dim)] mb-2">Need help choosing?</div>
        <a href={`https://t.me/${SUPPORT_USER.replace("@","")}`} target="_blank" rel="noopener noreferrer"
          className="text-[var(--accent)] font-semibold text-lg hover:underline">
          {SUPPORT_USER}
        </a>
      </div>
    </div>
  );
}

/* ============ HELPERS ============ */
function StatCard({ label, value, sub, accent, icon }: any) {
  const color = accent === "success" ? "var(--success)" : accent === "warning" ? "var(--warning)" :
                accent === "danger" ? "var(--danger)" : "var(--text)";
  return (
    <div className="stat">
      {icon && (
        <div className="absolute top-3 right-3 text-[var(--dim2)] opacity-40 text-base">{icon}</div>
      )}
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <div>
      <div className="text-[11px] text-[var(--dim)] font-semibold uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}

function Feature({ label, on }: any) {
  return (
    <div className={`flex items-center gap-2 ${on ? "" : "opacity-40"}`}>
      <span className={on ? "text-[var(--success)]" : "text-[var(--dim2)]"}>{on ? "✓" : "—"}</span>
      <span className="text-[var(--text)]">{label}</span>
    </div>
  );
}

function ChartBars({ daily }: any) {
  const max = Math.max(1, ...daily.map((d: any) => (Number(d.success)||0) + (Number(d.failed)||0)));
  return (
    <div className="chart-bars">
      {daily.map((d: any, i: number) => {
        const s = Number(d.success) || 0;
        const f = Number(d.failed) || 0;
        const sH = (s / max) * 100;
        const fH = (f / max) * 100;
        const dayLabel = String(d.day).slice(5);
        return (
          <div key={i} className="chart-bar-wrap">
            <div className="chart-bar-track">
              {f > 0 && <div className="chart-bar chart-bar-err" style={{ height: `${fH}%` }} />}
              {s > 0 && <div className="chart-bar chart-bar-ok" style={{ height: `${sH}%` }} />}
            </div>
            <div className="chart-bar-label">{dayLabel}</div>
          </div>
        );
      })}
    </div>
  );
}
