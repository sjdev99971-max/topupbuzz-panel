"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getHealth, getMe, getAccounts, getPlans, getLocal, saveLocal, clearLocal,
  getTelegramWebApp, telegramMiniAuth, adminGetUsers, adminUpdatePlan, adminSetUserPlan,
  SUPPORT_USER
} from "@/lib/api";

type Tab = "overview" | "accounts" | "campaigns" | "plans" | "admin";

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
  const [tab, setTab] = useState<Tab>("overview");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

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
          } catch (e: any) {
            setError(e?.response?.data?.detail || "auth failed");
            router.push("/");
            return;
          }
        } else {
          router.push("/login");
          return;
        }
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
    }
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [ready, refresh]);

  const logout = () => { clearLocal("session"); router.push("/"); };

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-[var(--cyan)] text-3xl">◆</div>
    </div>
  );

  const tabs: {id: Tab; label: string; icon: string}[] = [
    { id: "overview", label: "overview", icon: "◆" },
    { id: "accounts", label: "accounts", icon: "◈" },
    { id: "campaigns", label: "campaigns", icon: "▲" },
    { id: "plans", label: "plans", icon: "★" },
  ];
  if (me?.is_admin) tabs.push({ id: "admin", label: "admin", icon: "♛" });

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)]/60 bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[var(--cyan)] text-lg">◆</span>
            <span className="text-sm hidden md:inline">topupbuzz<span className="text-[var(--cyan)]">.</span>control</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${health && !error ? "bg-[var(--ok)] pulse-cyan" : "bg-[var(--danger)]"}`} />
            <button onClick={logout} className="btn text-[11px] py-1.5 px-3">logout</button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* SIDEBAR */}
        <aside className="md:w-56 border-b md:border-b-0 md:border-r border-[var(--border)]/60 bg-[var(--bg2)]/40">
          {/* PROFILE CARD */}
          <div className="p-4 border-b border-[var(--border)]/60">
            <div className="flex items-center gap-3">
              {me?.photo_url ? (
                <img src={me.photo_url} alt="pic" className="w-12 h-12 rounded-full border-2 border-[var(--cyan)]/40 object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-[var(--cyan)]/40 bg-[var(--surface3)] flex items-center justify-center text-[var(--cyan)] text-lg">
                  {(me?.first_name?.[0] || me?.username?.[0] || "?").toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{me?.first_name || me?.username || "user"}</div>
                {me?.username && <div className="text-[10px] text-[var(--dim2)] truncate">@{me.username}</div>}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`tag ${me?.plan === "unverified" ? "tag-neutral" : me?.plan === "max" ? "tag-warn" : "tag-info"}`}>
                {me?.plan || "unverified"}
              </span>
              {me?.is_admin && <span className="tag tag-err">admin</span>}
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

        {/* MAIN */}
        <main className="flex-1 p-4 md:p-6">
          {tab === "overview" && <OverviewTab me={me} accounts={accounts} health={health} error={error} />}
          {tab === "accounts" && <AccountsTab accounts={accounts} router={router} />}
          {tab === "campaigns" && <CampaignsTab accounts={accounts} />}
          {tab === "plans" && <PlansTab plans={plans} me={me} />}
          {tab === "admin" && me?.is_admin && <AdminTab plans={plans} onRefresh={refresh} />}
        </main>
      </div>

      <footer className="border-t border-[var(--border)]/60 px-4 md:px-6 py-3 text-[10px] text-[var(--dim2)] flex justify-between">
        <span>topupbuzz // internal</span>
        <span>{SUPPORT_USER}</span>
      </footer>
    </div>
  );
}

function H({ children }: any) {
  return <h1 className="text-xl mb-4"><span className="text-[var(--dim)]">&gt;</span> {children}</h1>;
}

function OverviewTab({ me, accounts, health, error }: any) {
  const limits = me?.limits || {};
  return (
    <>
      <H>overview</H>
      {error && <div className="card corner p-4 mb-4 border-[var(--danger)]/40 text-[var(--danger)] text-xs">✕ {error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-4"><div className="text-[10px] text-[var(--dim2)] uppercase">accounts</div><div className="text-2xl mt-1 text-[var(--cyan)]">{accounts.length}<span className="text-xs text-[var(--dim)]">/{limits.max_accounts || 0}</span></div></div>
        <div className="card p-4"><div className="text-[10px] text-[var(--dim2)] uppercase">plan</div><div className="text-lg mt-1 text-[var(--amber)]">{me?.plan || "—"}</div></div>
        <div className="card p-4"><div className="text-[10px] text-[var(--dim2)] uppercase">expiry</div><div className="text-sm mt-1">{me?.plan_expiry ? new Date(me.plan_expiry * 1000).toLocaleDateString() : "—"}</div></div>
        <div className="card p-4"><div className="text-[10px] text-[var(--dim2)] uppercase">backend</div><div className="text-lg mt-1 text-[var(--purple)]">{health ? "up" : "—"}</div></div>
      </div>

      <div className="card corner p-5">
        <h3 className="text-sm mb-3"><span className="text-[var(--dim)]">&gt;</span> usage limits</h3>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><div className="text-[10px] text-[var(--dim2)] uppercase">max accounts</div><div className="mt-1 text-[var(--text)]">{limits.max_accounts ?? 0}</div></div>
          <div><div className="text-[10px] text-[var(--dim2)] uppercase">daily joins</div><div className="mt-1 text-[var(--text)]">{limits.max_daily_joins ?? 0}</div></div>
          <div><div className="text-[10px] text-[var(--dim2)] uppercase">daily messages</div><div className="mt-1 text-[var(--text)]">{limits.max_daily_messages ?? 0}</div></div>
        </div>
      </div>
    </>
  );
}

function AccountsTab({ accounts, router }: any) {
  return (
    <>
      <H>accounts</H>
      <div className="mb-4"><button onClick={() => router.push("/login")} className="btn btn-primary">+ add account</button></div>
      {accounts.length === 0 ? (
        <div className="card corner p-10 text-center text-[var(--dim2)] text-xs">// no accounts — click add</div>
      ) : (
        <div className="grid gap-3">
          {accounts.map((a: any) => (
            <div key={a.id} className="card corner p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[var(--cyan)]">◈</span>
                <span className="text-sm">{a.phone}</span>
              </div>
              <span className={`tag ${a.health === "Safe" ? "tag-ok" : "tag-warn"}`}>{a.health}</span>
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
      <H>campaigns</H>
      {accounts.length === 0 ? (
        <div className="card p-8 text-center text-[var(--dim2)] text-xs">// add account first</div>
      ) : (
        <div className="grid gap-3">
          {accounts.map((a: any) => (
            <div key={a.id} className="card p-5">
              <div className="text-sm mb-3">{a.phone}</div>
              <button className="btn btn-primary text-xs">configure</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PlansTab({ plans, me }: any) {
  return (
    <>
      <H>plans</H>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {plans.map((p: any) => {
          const current = me?.plan === p.name;
          return (
            <div key={p.name} className={`card corner p-5 ${current ? "border-[var(--cyan)]/60 glow-cyan" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm uppercase tracking-wider">{p.name}</span>
                {current && <span className="tag tag-info">current</span>}
              </div>
              <div className="text-3xl font-bold text-[var(--cyan)] mb-1">৳{p.price}</div>
              <div className="text-[10px] text-[var(--dim2)] mb-4">{p.days} days</div>
              <div className="space-y-1.5 text-[11px] text-[var(--dim)] mb-4">
                <div>• {p.max_accounts} accounts</div>
                <div>• {p.max_daily_joins} joins/day</div>
                <div>• {p.max_daily_messages} messages/day</div>
              </div>
              {!current && (
                <a href={`https://t.me/${SUPPORT_USER.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full text-xs">
                  buy →
                </a>
              )}
            </div>
          );
        })}
      </div>
      <div className="card corner p-5 text-center">
        <div className="text-xs text-[var(--dim)] mb-2">to purchase or upgrade plan</div>
        <a href={`https://t.me/${SUPPORT_USER.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="text-[var(--cyan)] text-lg">
          {SUPPORT_USER}
        </a>
      </div>
    </>
  );
}

function AdminTab({ plans, onRefresh }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [editPlan, setEditPlan] = useState<any>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setUsers(await adminGetUsers()); } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const savePlan = async (p: any) => {
    setBusy(true);
    try {
      await adminUpdatePlan(p);
      await onRefresh();
      alert(`✅ ${p.name} updated`);
    } catch (e: any) { alert("failed: " + e.message); }
    setBusy(false);
  };

  const setUserPlan = async (uid: number, plan: string) => {
    try {
      await adminSetUserPlan(uid, plan);
      await load();
      alert(`✅ user ${uid} → ${plan}`);
    } catch (e: any) { alert("failed: " + e.message); }
  };

  return (
    <>
      <H>admin panel</H>

      {/* PLAN PRICES */}
      <div className="card corner p-5 mb-6">
        <h3 className="text-sm mb-4"><span className="text-[var(--dim)]">&gt;</span> plan prices</h3>
        <div className="space-y-3">
          {plans.map((p: any) => (
            <div key={p.name} className="grid grid-cols-5 gap-2 items-center text-xs">
              <span className="uppercase text-[var(--cyan)]">{p.name}</span>
              <input type="number" defaultValue={p.price} placeholder="price"
                onChange={e => setEditPlan({...editPlan, [p.name]: {...p, price: +e.target.value}})}
                className="inp py-1.5 text-xs" />
              <input type="number" defaultValue={p.days} placeholder="days"
                onChange={e => setEditPlan({...editPlan, [p.name]: {...(editPlan[p.name] || p), days: +e.target.value}})}
                className="inp py-1.5 text-xs" />
              <input type="number" defaultValue={p.max_accounts} placeholder="accounts"
                onChange={e => setEditPlan({...editPlan, [p.name]: {...(editPlan[p.name] || p), max_accounts: +e.target.value}})}
                className="inp py-1.5 text-xs" />
              <button onClick={() => savePlan(editPlan[p.name] || p)} disabled={busy}
                className="btn btn-primary text-xs py-1.5">save</button>
            </div>
          ))}
        </div>
      </div>

      {/* USERS */}
      <div className="card corner p-5">
        <h3 className="text-sm mb-4"><span className="text-[var(--dim)]">&gt;</span> users ({users.length})</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between p-2 rounded border border-[var(--border)] text-xs">
              <div className="flex-1 min-w-0">
                <div className="truncate">{u.first_name || u.username || u.id}</div>
                <div className="text-[10px] text-[var(--dim2)]">id: {u.id}</div>
              </div>
              <span className={`tag mr-2 ${u.plan === "unverified" ? "tag-neutral" : "tag-info"}`}>{u.plan}</span>
              <select
                defaultValue={u.plan}
                onChange={e => setUserPlan(u.id, e.target.value)}
                className="inp py-1 text-xs max-w-[100px]"
              >
                <option value="unverified">unverified</option>
                <option value="basic">basic</option>
                <option value="pro">pro</option>
                <option value="max">max</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
