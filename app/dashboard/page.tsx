"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  getHealth, getMe, getAccounts, getPlans, getMyStats, 
  getLocal, saveLocal, clearLocal, getTelegramWebApp, 
  telegramMiniAuth, deleteAccount 
} from "@/lib/api";

type Tab = "home" | "accounts" | "stats" | "plans" | "me";

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");
  const [me, setMe] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let session = getLocal("session");
      if (!session) {
        const tg = getTelegramWebApp();
        if (tg?.initData) {
          try {
            const res = await telegramMiniAuth(tg.initData);
            saveLocal("session", res.user);
            session = res.user;
          } catch { router.push("/"); return; }
        } else { router.push("/login"); return; }
      }
      setMe(session);
      setReady(true);
    })();
  }, [router]);

  const loadData = useCallback(async () => {
    try {
      const [accs, plns, sts, m] = await Promise.all([
        getAccounts().catch(() => []),
        getPlans().catch(() => []),
        getMyStats().catch(() => null),
        getMe().catch(() => null)
      ]);
      if (m) { setMe(m); saveLocal("session", m); }
      setAccounts(accs);
      setPlans(plns);
      setStats(sts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) loadData();
  }, [ready, loadData]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-[var(--dim)]">Loading...</div>;

  const t = stats?.totals || {};
  const success = Number(t.success) || 0;
  const failed = Number(t.failed) || 0;
  const totalMsgs = Number(t.total) || 0;

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] font-bold">T</div>
           <span className="font-semibold text-white">TopUpBuzz</span>
        </div>
        <div className="flex items-center gap-2">
          {me?.is_admin && (
            <Link href="/admin" className="text-xs bg-[var(--accent)] text-black px-3 py-1 rounded-full font-bold">Admin</Link>
          )}
          <div className="text-xs text-[var(--dim)]">@{me?.username || 'User'}</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {tab === "home" && <HomeTab stats={stats} accounts={accounts} loading={loading} router={router} />}
      {tab === "accounts" && <AccountsTab accounts={accounts} loading={loading} router={router} loadData={loadData} />}
      {tab === "stats" && <StatsTab stats={stats} />}
      {tab === "plans" && <PlansTab plans={plans} me={me} />}
      {tab === "me" && <MeTab me={me} />}

      {/* BOTTOM NAV */}
      <div className="bottom-nav">
        {[
          { id: "home", icon: "◈", label: "Home" },
          { id: "accounts", icon: "📁", label: "Accounts" },
          { id: "stats", icon: "📊", label: "Stats" },
          { id: "plans", icon: "💎", label: "Plans" },
          { id: "me", icon: "👤", label: "Me" }
        ].map((t) => (
          <div key={t.id} className={`nav-item ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id as Tab)}>
            <span className="text-xl">{t.icon}</span>
            <span>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= TABS =================

function HomeTab({ stats, accounts, loading, router }: any) {
  const t = stats?.totals || {};
  const success = Number(t.success) || 0;
  const failed = Number(t.failed) || 0;
  const total = Number(t.total) || 0;

  return (
    <div className="space-y-6">
      {/* STATS GRID */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="icon-box mb-3 text-xl">📈</div>
          <div className="text-3xl font-bold text-white">{loading ? "..." : total}</div>
          <div className="text-xs text-[var(--dim)] mt-1">Posts sent</div>
        </div>
        <div className="card">
          <div className="icon-box mb-3 text-xl">✅</div>
          <div className="text-3xl font-bold text-white">{loading ? "..." : success}</div>
          <div className="text-xs text-[var(--dim)] mt-1">Success</div>
        </div>
        <div className="card">
          <div className="icon-box mb-3 text-xl">📁</div>
          <div className="text-3xl font-bold text-white">{accounts.length}</div>
          <div className="text-xs text-[var(--dim)] mt-1">Accounts</div>
        </div>
        <div className="card">
          <div className="icon-box mb-3 text-xl">❌</div>
          <div className="text-3xl font-bold text-white">{loading ? "..." : failed}</div>
          <div className="text-xs text-[var(--dim)] mt-1">Failed</div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <h3 className="text-xs font-bold text-[var(--dim)] tracking-widest uppercase mb-3">Quick Actions</h3>
        <div className="space-y-3">
          <div className="card flex items-center gap-4 cursor-pointer hover:border-[var(--accent)]" onClick={() => router.push("/login")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black text-xl">➕</div>
            <div>
              <div className="text-white font-medium">Add Account</div>
              <div className="text-xs text-[var(--dim)]">Login with Telegram OTP</div>
            </div>
          </div>
          <div className="card flex items-center gap-4 cursor-pointer hover:border-[var(--accent)]" onClick={() => accounts[0] && router.push(`/dashboard/accounts/${accounts[0].id}`)}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black text-xl">➤</div>
            <div>
              <div className="text-white font-medium">Start Campaign</div>
              <div className="text-xs text-[var(--dim)]">Configure & broadcast now</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountsTab({ accounts, loading, router, loadData }: any) {
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    try {
      await deleteAccount(id);
      loadData();
    } catch { alert("Failed to delete"); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">My Accounts</h2>
      {loading ? (
        <div className="text-center text-[var(--dim)] mt-10">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="card text-center p-8">
          <div className="text-[var(--dim)] text-sm mb-4">No accounts yet.</div>
          <button className="btn-green w-full" onClick={() => router.push("/login")}>+ Connect First Account</button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((a: any) => (
            <div key={a.id} className="card flex items-center gap-4">
              <div className="icon-box text-lg">◈</div>
              <div className="flex-1">
                <div className="text-white font-medium">{a.phone}</div>
                <div className="text-xs text-[var(--dim)]">{a.health}</div>
              </div>
              <button className="text-xs bg-[var(--accent)] text-black px-3 py-1.5 rounded-lg font-medium" onClick={() => router.push(`/dashboard/accounts/${a.id}`)}>
                Configure
              </button>
              <button className="text-red-500 text-lg px-2" onClick={() => handleDelete(a.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsTab({ stats }: any) {
  const t = stats?.totals || {};
  const daily = stats?.daily || [];
  const max = Math.max(1, ...daily.map((d: any) => (Number(d.success) || 0) + (Number(d.failed) || 0)));

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">Analytics</h2>
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4 text-white">Last 7 Days Activity</h3>
        <div className="flex items-end gap-2 h-32 mt-4">
          {daily.length === 0 ? <div className="text-center text-xs text-[var(--dim)] w-full">No data yet</div> : daily.map((d: any, i: number) => {
            const s = Number(d.success) || 0;
            const f = Number(d.failed) || 0;
            const sH = (s / max) * 100;
            const fH = (f / max) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-full flex flex-col justify-end h-full">
                  {f > 0 && <div className="w-full bg-red-500 rounded-t-sm" style={{ height: `${fH}%` }} />}
                  {s > 0 && <div className="w-full bg-[var(--accent)] rounded-t-sm" style={{ height: `${sH}%` }} />}
                </div>
                <span className="text-[9px] text-[var(--dim)] mt-1">{String(d.day).slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlansTab({ plans, me }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">Plans</h2>
      <div className="grid gap-3">
        {plans.map((p: any) => {
          const current = me?.plan === p.name;
          return (
            <div key={p.name} className={`card ${current ? "border-[var(--accent)]" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold uppercase text-white">{p.name}</span>
                {current && <span className="text-[10px] bg-[var(--accent-dim)] text-[var(--accent)] px-2 py-0.5 rounded-full">Current</span>}
              </div>
              <div className="text-2xl font-bold text-[var(--accent)] mb-1">৳{p.price}</div>
              <div className="text-xs text-[var(--dim)] mb-4">{p.days} days</div>
              <div className="space-y-1 text-xs text-[var(--dim)] mb-4">
                <div>• {p.max_accounts} Accounts</div>
                <div>• {p.max_daily_messages} Msgs/Day</div>
              </div>
              {!current && p.price > 0 && (
                <a href="https://t.me/DEVELOPER_JAHID_BHAI" target="_blank" className="btn-green w-full text-sm py-2">Buy Now</a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MeTab({ me }: any) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 text-center" style={{ background: "linear-gradient(180deg, var(--accent-dim) 0%, transparent 100%)", border: "1px solid var(--accent)" }}>
        <div className="w-20 h-20 rounded-full mx-auto bg-[var(--surface)] border-2 border-[var(--accent)] flex items-center justify-center overflow-hidden mb-4">
          {me?.photo_url ? <img src={me.photo_url} alt="pic" className="w-full h-full object-cover" /> : <span className="text-2xl text-[var(--accent)]">●</span>}
        </div>
        <h2 className="text-xl font-bold text-white">{me?.first_name || me?.username || "User"}</h2>
        <p className="text-sm text-[var(--dim)] mt-1">@{me?.username || "unknown"}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-[var(--accent)]/30 text-[var(--accent)] text-sm">
          <span>👑</span> {me?.plan === "unverified" ? "No Premium" : me?.plan}
        </div>
      </div>

      <button className="btn-green w-full mt-4 bg-red-500/10 !text-red-500 border border-red-500/30 hover:bg-red-500/20" onClick={() => { clearLocal("session"); window.location.href = "/"; }}>
        Log out
      </button>
    </div>
  );
}
