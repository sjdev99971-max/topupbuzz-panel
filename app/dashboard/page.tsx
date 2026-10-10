"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StealthBanner from "@/components/StealthBanner";
import ThemeToggle from "@/components/ThemeToggle";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SkelList, SkelCard } from "@/components/Skeleton";
import { toast } from "@/components/Toast";
import {
  getHealth, getMe, getAccounts, getPlans, getLocal, saveLocal, clearLocal,
  getTelegramWebApp, telegramMiniAuth, deleteAccount, getSession,
  adminGetUsers, adminUpdatePlan, adminSetUserPlan, adminBroadcast,
  getAnalytics, setStealth, SUPPORT_USER
} from "@/lib/api";

type Tab = "overview" | "accounts" | "plans" | "admin";

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
  const [health, setHealth] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState<any>(null);

  useEffect(() => {
    (async () => {
      let session = getLocal("session");
      if (!session) {
        const tg = await waitForTelegram(2500);
        if (tg?.initData) {
          try {
            tg.ready(); tg.expand();
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

  const refresh = useCallback(async () => {
    try {
      const [h, a, p, m] = await Promise.all([
        getHealth(), getAccounts(), getPlans(), getMe()
      ]);
      setHealth(h); setAccounts(a); setPlans(p); setMe(m);
      saveLocal("session", m);
      setError("");
    } catch (e: any) {
      if (e?.response?.status === 404) { clearLocal("session"); router.push("/"); return; }
      setError(e.message);
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [ready, refresh]);

  const logout = () => { clearLocal("session"); clearLocal("stealth_id"); router.push("/"); };

  const copySession = async (id: string) => {
    try {
      const r = await getSession(id);
      await navigator.clipboard.writeText(r.session);
      toast("session copied to clipboard", "success");
    } catch { toast("failed to copy", "error"); }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteAccount(confirmDel.id);
      toast("account deleted", "success");
      setConfirmDel(null);
      refresh();
    } catch { toast("delete failed", "error"); }
  };

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-[var(--blue)] text-3xl spin">◌</div>
    </div>
  );

  const tabs: {id: Tab; label: string; icon: string}[] = [
    { id: "overview", label: "overview", icon: "◆" },
    { id: "accounts", label: "accounts", icon: "◈" },
    { id: "plans", label: "plans", icon: "★" },
  ];
  if (me?.is_admin) tabs.push({ id: "admin", label: "admin", icon: "♛" });

  return (
    <div className="min-h-screen flex flex-col">
      <StealthBanner />

      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[var(--blue)] text-lg">◆</span>
            <span className="text-sm hidden md:inline">topupbuzz<span className="text-[var(--blue)]">.</span>control</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${health && !error ? "bg-[var(--green)] pulse-dot" : "bg-[var(--pink)]"}`} />
            <ThemeToggle />
            <button onClick={logout} className="btn btn-sm text-[11px]">logout</button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="md:w-60 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg2)]/50">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              {me?.photo_url ? (
                <img src={me.photo_url} alt="" className="w-12 h-12 rounded-full border-2 border-[var(--blue)]/40 object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-[var(--blue)]/40 bg-[var(--surface3)] flex items-center justify-center text-[var(--blue)] text-lg">
                  {(me?.first_name?.[0] || me?.username?.[0] || "?").toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{me?.first_name || me?.username || "user"}</div>
                {me?.username && <div className="text-[10px] text-[var(--dim2)] truncate">@{me.username}</div>}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className={`tag ${me?.plan === "unverified" ? "tag-neutral" : me?.plan === "max" ? "tag-warn" : "tag-info"}`}>
                {me?.plan || "unverified"}
              </span>
              {me?.is_admin && <span className="tag tag-err">admin</span>}
              {me?.stealth_active && <span className="tag tag-warn">stealth</span>}
            </div>
          </div>

          <nav className="flex md:flex-col overflow-x-auto md:overflow-visible">
            {tabs.map(s => (
              <div key={s.id} onClick={() => setTab(s.id)}
                className={`nav-item whitespace-nowrap ${tab === s.id ? "active" : ""}`}>
                <span className="opacity-70">{s.icon}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6 min-w-0">
          {error && (
            <div className="card corner p-3 mb-4 border-[var(--pink)]/40 bg-[var(--pink)]/5 text-xs text-[var(--pink)]">
              ✕ {error}
            </div>
          )}
          {tab === "overview" && <Overview me={me} accounts={accounts} health={health} loading={loading} analytics={analytics} setAnalytics={setAnalytics} />}
          {tab === "accounts" && <Accounts accounts={accounts} loading={loading} router={router} onDelete={setConfirmDel} onCopySession={copySession} refresh={refresh} />}
          {tab === "plans" && <Plans plans={plans} me={me} />}
          {tab === "admin" && me?.is_admin && <Admin plans={plans} refresh={refresh} />}
        </main>
      </div>

      <footer className="border-t border-[var(--border)] px-4 md:px-6 py-3 text-[10px] text-[var(--dim2)] flex justify-between">
        <span>topupbuzz // internal</span>
        <a href={`https://t.me/${SUPPORT_USER.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--blue)]">
          {SUPPORT_USER}
        </a>
      </footer>

      <ConfirmDialog
        open={!!confirmDel}
        title="delete account?"
        message={`Are you sure you want to delete ${confirmDel?.phone}? This cannot be undone.`}
        danger
        onCancel={() => setConfirmDel(null)}
        onConfirm={doDelete}
      />
    </div>
  );
}

/* ---------- OVERVIEW ---------- */
function Overview({ me, accounts, health, loading, analytics, setAnalytics }: any) {
  const limits = me?.limits || {};
  const pct = limits.max_accounts ? Math.min(100, (accounts.length / limits.max_accounts) * 100) : 0;

  useEffect(() => {
    if (!analytics) getAnalytics().then(setAnalytics).catch(() => {});
  }, [analytics, setAnalytics]);

  return (
    <>
      <h1 className="text-xl mb-5"><span className="text-[var(--dim)]">&gt;</span> overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="accounts" value={loading ? "…" : `${accounts.length}/${limits.max_accounts || 0}`} color="var(--blue)" />
        <Stat label="plan" value={me?.plan || "—"} color="var(--yellow)" />
        <Stat label="expires" value={me?.plan_expiry ? new Date(me.plan_expiry * 1000).toLocaleDateString() : "—"} color="var(--purple)" />
        <Stat label="backend" value={health ? "up" : "—"} color={health ? "var(--green)" : "var(--pink)"} />
      </div>

      <div className="card corner p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm"><span className="text-[var(--dim)]">&gt;</span> plan usage</h3>
          <span className="text-xs text-[var(--dim)]">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--surface3)] overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: pct > 80 ? "linear-gradient(90deg,#f7768e,#ff9e64)" : "linear-gradient(90deg,#7aa2f7,#bb9af7)"
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <Mini label="accounts" value={limits.max_accounts ?? 0} />
          <Mini label="daily joins" value={limits.max_daily_joins ?? 0} />
          <Mini label="daily messages" value={limits.max_daily_messages ?? 0} />
        </div>
      </div>

      {analytics?.daily?.length > 0 && (
        <div className="card corner p-5">
          <h3 className="text-sm mb-3"><span className="text-[var(--dim)]">&gt;</span> activity (7d)</h3>
          <div className="flex items-end gap-2 h-24">
            {analytics.daily.map((d: any, i: number) => {
              const max = Math.max(...analytics.daily.map((x: any) => x.cnt));
              const h = max ? (d.cnt / max) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-gradient-to-t from-[var(--blue)]/40 to-[var(--blue)]" style={{ height: `${Math.max(4, h)}%` }} />
                  <span className="text-[9px] text-[var(--dim2)]">{String(d.day).slice(-5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- ACCOUNTS ---------- */
function Accounts({ accounts, loading, router, onDelete, onCopySession, refresh }: any) {
  const [q, setQ] = useState("");
  const filtered = q ? accounts.filter((a: any) => a.phone.includes(q)) : accounts;

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h1 className="text-xl"><span className="text-[var(--dim)]">&gt;</span> accounts</h1>
        <div className="flex items-center gap-2">
          <input className="inp text-xs py-1.5 max-w-[180px]" placeholder="search phone…"
            value={q} onChange={e => setQ(e.target.value)} />
          <button onClick={refresh} className="btn btn-sm">↻</button>
          <button onClick={() => router.push("/login")} className="btn btn-primary btn-sm">+ add</button>
        </div>
      </div>

      {loading ? <SkelList count={3} /> : filtered.length === 0 ? (
        <div className="card corner p-10 text-center">
          <div className="text-[var(--dim)] text-xs mb-4">// no accounts yet</div>
          <button onClick={() => router.push("/login")} className="btn btn-primary">+ connect first account</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((a: any) => (
            <div key={a.id} className="card card-hover corner p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded bg-[var(--surface3)] border border-[var(--border2)] flex items-center justify-center text-[var(--blue)] shrink-0">◈</div>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{a.phone}</div>
                    <div className="text-[10px] text-[var(--dim2)] truncate">{a.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`tag ${a.health === "Safe" ? "tag-ok" : "tag-warn"}`}>{a.health}</span>
                  <button onClick={() => router.push(`/dashboard/accounts/${a.id}`)} className="btn btn-sm btn-primary">
                    configure
                  </button>
                  <button onClick={() => onCopySession(a.id)} className="btn btn-sm" title="copy session">⎘</button>
                  <button onClick={() => onDelete(a)} className="btn btn-sm btn-danger">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------- PLANS ---------- */
function Plans({ plans, me }: any) {
  return (
    <>
      <h1 className="text-xl mb-5"><span className="text-[var(--dim)]">&gt;</span> plans</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {plans.map((p: any) => {
          const current = me?.plan === p.name;
          return (
            <div key={p.name} className={`card corner p-5 ${current ? "border-[var(--blue)]/60" : "card-hover"}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm uppercase tracking-wider">{p.name}</span>
                {current && <span className="tag tag-info">current</span>}
              </div>
              <div className="text-3xl font-bold text-[var(--blue)] mb-1">৳{p.price}</div>
              <div className="text-[10px] text-[var(--dim2)] mb-4">{p.days} days</div>
              <div className="space-y-1.5 text-[11px] text-[var(--dim)] mb-4">
                <div>• {p.max_accounts} accounts</div>
                <div>• {p.max_daily_joins} joins/day</div>
                <div>• {p.max_daily_messages} messages/day</div>
              </div>
              {!current && p.price > 0 && (
                <a href={`https://t.me/${SUPPORT_USER.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary w-full btn-sm">buy →</a>
              )}
            </div>
          );
        })}
      </div>
      <div className="card corner p-5 text-center">
        <div className="text-xs text-[var(--dim)] mb-2">to purchase or upgrade</div>
        <a href={`https://t.me/${SUPPORT_USER.replace("@","")}`} target="_blank" rel="noopener noreferrer"
          className="text-[var(--blue)] text-lg">{SUPPORT_USER}</a>
      </div>
    </>
  );
}

/* ---------- ADMIN ---------- */
function Admin({ plans, refresh }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [editPlan, setEditPlan] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [broadcast, setBroadcast] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try { setUsers(await adminGetUsers()); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const savePlan = async (p: any) => {
    setBusy(true);
    try {
      await adminUpdatePlan(p);
      await refresh();
      toast(`${p.name} updated`, "success");
    } catch { toast("update failed", "error"); }
    setBusy(false);
  };

  const setUserPlan = async (uid: number, plan: string) => {
    try {
      await adminSetUserPlan(uid, plan);
      await load();
      toast(`user ${uid} → ${plan}`, "success");
    } catch { toast("failed", "error"); }
  };

  const stealthUser = (uid: number) => {
    setStealth(uid);
    toast(`stealth: user ${uid}`, "info");
    window.location.href = "/dashboard";
  };

  const sendBroadcast = async () => {
    if (!broadcast.trim()) return;
    if (!confirm(`Send to all users?`)) return;
    try {
      const r = await adminBroadcast(broadcast);
      toast(`sent: ${r.sent}, failed: ${r.failed}`, "success");
      setBroadcast("");
    } catch { toast("broadcast failed", "error"); }
  };

  const filtered = q ? users.filter(u =>
    String(u.id).includes(q) ||
    (u.username || "").toLowerCase().includes(q.toLowerCase()) ||
    (u.first_name || "").toLowerCase().includes(q.toLowerCase())
  ) : users;

  return (
    <>
      <h1 className="text-xl mb-5"><span className="text-[var(--dim)]">&gt;</span> admin panel</h1>

      {/* PLAN PRICES */}
      <div className="card corner p-5 mb-5">
        <h3 className="text-sm mb-4"><span className="text-[var(--dim)]">&gt;</span> plan pricing</h3>
        <div className="space-y-2">
          {plans.map((p: any) => (
            <div key={p.name} className="grid grid-cols-6 gap-2 items-center text-xs">
              <span className="uppercase text-[var(--blue)]">{p.name}</span>
              <input type="number" defaultValue={p.price} placeholder="৳"
                onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), price: +e.target.value}})}
                className="inp py-1 text-xs" />
              <input type="number" defaultValue={p.days} placeholder="days"
                onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), days: +e.target.value}})}
                className="inp py-1 text-xs" />
              <input type="number" defaultValue={p.max_accounts} placeholder="acc"
                onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), max_accounts: +e.target.value}})}
                className="inp py-1 text-xs" />
              <input type="number" defaultValue={p.max_daily_messages} placeholder="msg"
                onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), max_daily_messages: +e.target.value}})}
                className="inp py-1 text-xs" />
              <button onClick={() => savePlan(editPlan[p.name] || p)} disabled={busy}
                className="btn btn-primary btn-sm py-1">save</button>
            </div>
          ))}
        </div>
      </div>

      {/* BROADCAST */}
      <div className="card corner p-5 mb-5">
        <h3 className="text-sm mb-3"><span className="text-[var(--dim)]">&gt;</span> broadcast</h3>
        <div className="flex gap-2">
          <input className="inp text-xs py-1.5 flex-1" placeholder="message…"
            value={broadcast} onChange={e => setBroadcast(e.target.value)} />
          <button onClick={sendBroadcast} className="btn btn-primary btn-sm">send</button>
        </div>
        <p className="text-[10px] text-[var(--dim2)] mt-2">⚠ sends via Telegram bot to all users</p>
      </div>

      {/* USERS */}
      <div className="card corner p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm"><span className="text-[var(--dim)]">&gt;</span> users ({filtered.length})</h3>
          <input className="inp text-xs py-1.5 max-w-[200px]" placeholder="search id/username…"
            value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center text-xs text-[var(--dim2)] py-8">no users</div>
          ) : filtered.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between p-2 rounded border border-[var(--border)] text-xs gap-2">
              <div className="flex-1 min-w-0">
                <div className="truncate">{u.first_name || u.username || u.id}</div>
                <div className="text-[10px] text-[var(--dim2)]">id: {u.id}</div>
              </div>
              <span className={`tag shrink-0 ${u.plan === "unverified" ? "tag-neutral" : "tag-info"}`}>{u.plan}</span>
              <select defaultValue={u.plan} onChange={e => setUserPlan(u.id, e.target.value)}
                className="inp py-1 text-xs max-w-[100px]">
                <option value="unverified">unverified</option>
                <option value="basic">basic</option>
                <option value="pro">pro</option>
                <option value="max">max</option>
              </select>
              <button onClick={() => stealthUser(u.id)} className="btn btn-sm shrink-0" title="stealth">🕵️</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, color }: any) {
  return (
    <div className="card p-4">
      <div className="text-[10px] text-[var(--dim2)] uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold mt-1 truncate" style={{ color }}>{value}</div>
    </div>
  );
}
function Mini({ label, value }: any) {
  return (
    <div>
      <div className="text-[10px] text-[var(--dim2)] uppercase">{label}</div>
      <div className="text-[var(--text)] mt-0.5">{value}</div>
    </div>
  );
}
