"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SkelList } from "@/components/Skeleton";
import { toast } from "@/components/Toast";
import {
  getMe, getLocal, clearLocal, getTelegramWebApp, telegramMiniAuth,
  getAdminStats, adminGetUsers, adminUpdatePlan, adminSetUserPlan,
  adminBroadcast, setStealth, getPlans, getAccounts, SUPPORT_USER
} from "@/lib/api";

type Tab = "stats" | "users" | "accounts" | "broadcast" | "pricing";

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("stats");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [broadcast, setBroadcast] = useState("");
  const [busy, setBusy] = useState(false);
  const [editPlan, setEditPlan] = useState<any>({});
  const [quickId, setQuickId] = useState("");
  const [quickPlan, setQuickPlan] = useState("basic");
  const [quickDays, setQuickDays] = useState("30");
  const [confirmStealth, setConfirmStealth] = useState<any>(null);

  useEffect(() => {
    (async () => {
      let session = getLocal("session");
      if (!session) {
        const tg = getTelegramWebApp();
        if (tg?.initData) {
          try {
            const r = await telegramMiniAuth(tg.initData);
            saveLocalSession(r.user);
            session = r.user;
          } catch { router.push("/"); return; }
        } else { router.push("/login"); return; }
      }
      if (!session.is_admin) { router.push("/dashboard"); return; }
      setMe(session);
      setReady(true);
    })();
  }, [router]);

  const saveLocalSession = (u: any) => {
    if (typeof window !== "undefined") localStorage.setItem("session", JSON.stringify(u));
  };

  const refresh = useCallback(async () => {
    const calls: [string, Promise<any>][] = [
      ["stats", getAdminStats()], ["users", adminGetUsers()],
      ["accounts", getAccounts()], ["plans", getPlans()]
    ];
    const results = await Promise.allSettled(calls.map(c => c[1]));
    const failed: string[] = [];
    results.forEach((r, i) => {
      const name = calls[i][0];
      if (r.status === "fulfilled") {
        if (name === "stats") setStats(r.value);
        if (name === "users") setUsers(r.value);
        if (name === "accounts") setAccounts(r.value);
        if (name === "plans") setPlans(r.value);
      } else {
        const status = (r.reason as any)?.response?.status || "?";
        const detail = (r.reason as any)?.response?.data?.detail || (r.reason as any)?.message;
        failed.push(`${name}[${status}]: ${detail}`);
        console.error(`❌ admin.${name}:`, status, detail);
      }
    });
    if (failed.length > 0) toast(failed.join(" · "), "error");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!ready) return;
    refresh();
  }, [ready, refresh]);

  const logout = () => { clearLocal("session"); clearLocal("stealth_id"); router.push("/"); };

  const doStealth = (user: any) => setConfirmStealth(user);
  const confirmStealthAction = () => {
    if (!confirmStealth) return;
    setStealth(confirmStealth.id);
    toast(`Stealth: ${confirmStealth.username || confirmStealth.id}`, "info");
    router.push("/dashboard");
  };

  const setUserPlan = async (uid: number, plan: string) => {
    try {
      await adminSetUserPlan(uid, plan);
      toast(`User ${uid} → ${plan}`, "success");
      refresh();
    } catch { toast("Update failed", "error"); }
  };

  const handleQuickDeliver = async () => {
    if (!quickId.trim()) return toast("Enter User ID", "error");
    setBusy(true);
    try {
      await adminSetUserPlan(Number(quickId), quickPlan, Number(quickDays));
      toast(`✅ Successfully delivered ${quickPlan} to ${quickId}`, "success");
      setQuickId(""); // Clear input
      refresh(); // Refresh list
    } catch { 
      toast("Delivery failed. Check User ID.", "error"); 
    }
    setBusy(false);
  };

  const savePlan = async (p: any) => {
    setBusy(true);
    try {
      await adminUpdatePlan(p);
      toast(`${p.name} pricing updated`, "success");
      refresh();
    } catch { toast("Save failed", "error"); }
    setBusy(false);
  };

  const sendBroadcast = async () => {
    if (!broadcast.trim()) return;
    if (!confirm(`Send to all ${stats?.counters?.users || "?"} users?`)) return;
    setBusy(true);
    try {
      const r = await adminBroadcast(broadcast);
      toast(`Sent: ${r.sent} · Failed: ${r.failed}`, "success");
      setBroadcast("");
    } catch { toast("Broadcast failed", "error"); }
    setBusy(false);
  };

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--border2)] border-t-[var(--accent2)] rounded-full spin" />
    </div>
  );

  const filteredUsers = q
    ? users.filter(u =>
        String(u.id).includes(q) ||
        (u.username || "").toLowerCase().includes(q.toLowerCase()) ||
        (u.first_name || "").toLowerCase().includes(q.toLowerCase())
      )
    : users;

  const tabs: {id: Tab; label: string; icon: string}[] = [
    { id: "stats", label: "Stats", icon: "◉" },
    { id: "users", label: "Users", icon: "◈" },
    { id: "accounts", label: "All Accounts", icon: "▤" },
    { id: "broadcast", label: "Broadcast", icon: "◈" },
    { id: "pricing", label: "Pricing", icon: "◆" },
  ];

  const t = stats?.totals || {};
  const c = stats?.counters || {};
  const total = Number(t.total) || 0;
  const success = Number(t.success) || 0;
  const failed = Number(t.failed) || 0;
  const rate = total ? (success / total) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col admin-mode">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-lg">
        <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent2)] flex items-center justify-center text-white text-xs font-bold">♛</div>
            <span className="font-semibold text-[15px]">Admin</span>
            <span className="text-[10px] text-[var(--accent2)] px-2 py-0.5 rounded-full bg-[var(--accent2)]/10 font-semibold">
              FULL ACCESS
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="btn btn-sm">← User Panel</Link>
            <ThemeToggle />
            <button onClick={logout} className="btn btn-sm btn-ghost">⏏</button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <aside className="md:w-56 border-b md:border-b-0 md:border-r border-[var(--border)] md:min-h-[calc(100vh-3.5rem)]">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent2)]/20 flex items-center justify-center text-[var(--accent2)] text-xs font-bold">♛</div>
              <div className="min-w-0">
                <div className="text-xs font-semibold">Administrator</div>
                <div className="text-[10px] text-[var(--dim2)] truncate">@{me?.username}</div>
              </div>
            </div>
            <div className="text-[10px] text-[var(--dim2)] space-y-1 mt-3 pt-3 border-t border-[var(--border)]">
              <div className="flex justify-between"><span>Users</span><span className="text-[var(--text)]">{c.users || 0}</span></div>
              <div className="flex justify-between"><span>Accounts</span><span className="text-[var(--text)]">{c.accounts || 0}</span></div>
              <div className="flex justify-between"><span>Running</span><span className="text-[var(--success)]">{c.running || 0}</span></div>
            </div>
          </div>

          <nav className="py-2 flex md:flex-col overflow-x-auto md:overflow-visible">
            {tabs.map(s => (
              <div key={s.id} onClick={() => setTab(s.id)}
                className={`nav-item whitespace-nowrap ${tab === s.id ? "active" : ""}`}>
                <span className="opacity-70 text-sm">{s.icon}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 p-4 md:p-8">
          {tab === "stats" && (
            <div className="fade space-y-6">
              <div>
                <h1 className="text-2xl font-bold">System Stats</h1>
                <p className="text-sm text-[var(--dim)] mt-0.5">Real-time overview</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="stat">
                  <div className="stat-label">Total Users</div>
                  <div className="stat-value">{c.users || 0}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Total Accounts</div>
                  <div className="stat-value">{c.accounts || 0}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Campaigns</div>
                  <div className="stat-value">{c.campaigns || 0}</div>
                  <div className="stat-sub text-[var(--success)]">{c.running || 0} running</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Success Rate</div>
                  <div className="stat-value" style={{ color: rate >= 90 ? "var(--success)" : rate >= 70 ? "var(--warning)" : "var(--danger)" }}>
                    {rate.toFixed(1)}%
                  </div>
                  <div className="stat-sub">{success.toLocaleString()} / {total.toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card p-5">
                  <div className="stat-label">Messages Sent (Total)</div>
                  <div className="text-2xl font-bold mt-2">{total.toLocaleString()}</div>
                </div>
                <div className="card p-5">
                  <div className="stat-label">Failed</div>
                  <div className="text-2xl font-bold mt-2 text-[var(--danger)]">{failed.toLocaleString()}</div>
                </div>
              </div>

              {stats?.daily?.length > 0 && (
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
              )}

              {stats?.top_users?.length > 0 && (
                <div className="card p-5">
                  <div className="text-sm font-semibold mb-4">Top Users by Accounts</div>
                  <div className="space-y-2">
                    {stats.top_users.map((u: any, i: number) => (
                      <div key={u.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                        <div className="w-6 h-6 rounded-md bg-[var(--surface3)] text-xs flex items-center justify-center text-[var(--dim)] font-semibold">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{u.first_name || u.username || u.id}</div>
                          <div className="text-[10px] text-[var(--dim2)]">id: {u.id}</div>
                        </div>
                        <span className={`tag ${u.plan === "unverified" ? "tag-neutral" : "tag-info"}`}>{u.plan}</span>
                        <span className="text-xs text-[var(--dim)]">{u.acc_count} acc</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "users" && (
            <div className="fade space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold">Users</h1>
                  <p className="text-sm text-[var(--dim)] mt-0.5">{users.length} total</p>
                </div>
                <input className="inp text-xs py-2 max-w-[220px]" placeholder="Search id / username…"
                  value={q} onChange={e => setQ(e.target.value)} />
              </div>

              {/* QUICK DELIVER BOX */}
              <div className="card p-4 bg-[var(--accent2)]/5 border-[var(--accent2)]/30 shadow-[0_0_15px_rgba(0,150,255,0.1)]">
                <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                  ⚡ Quick Deliver (Fast Upgrade)
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-[10px] text-[var(--dim)] mb-1 block">User Telegram ID</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 123456789" 
                      value={quickId} 
                      onChange={e => setQuickId(e.target.value)}
                      className="inp py-2 text-sm w-full" 
                    />
                  </div>
                  <div className="w-[130px]">
                    <label className="text-[10px] text-[var(--dim)] mb-1 block">Select Plan</label>
                    <select 
                      value={quickPlan} 
                      onChange={e => setQuickPlan(e.target.value)}
                      className="inp py-2 text-sm w-full"
                    >
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="max">Max</option>
                    </select>
                  </div>
                  <div className="w-[90px]">
                    <label className="text-[10px] text-[var(--dim)] mb-1 block">Days</label>
                    <input 
                      type="number" 
                      min="1"
                      placeholder="30" 
                      value={quickDays} 
                      onChange={e => setQuickDays(e.target.value)}
                      className="inp py-2 text-sm w-full" 
                    />
                  </div>
                  <button 
                    onClick={handleQuickDeliver} 
                    disabled={busy}
                    className="btn btn-primary py-2 px-6 h-[38px]"
                  >
                    {busy ? "Delivering..." : "Deliver Now"}
                  </button>
                </div>
              </div>

              {loading ? <SkelList count={4} /> : (
                <div className="card divide-y divide-[var(--border)]">
                  {filteredUsers.map((u: any) => (
                    <div key={u.id} className="p-3 flex items-center gap-3 flex-wrap">
                      <div className="w-9 h-9 rounded-full bg-[var(--surface3)] flex items-center justify-center text-xs font-bold text-[var(--dim)] shrink-0">
                        {(u.first_name?.[0] || u.username?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{u.first_name || u.username || "Unknown"}</div>
                        <div className="text-[10px] text-[var(--dim2)]">id: {u.id}</div>
                      </div>
                      <span className={`tag ${u.plan === "unverified" ? "tag-neutral" : u.plan === "max" ? "tag-purple" : "tag-info"}`}>
                        {u.plan}
                      </span>
                      <select
                        defaultValue={u.plan}
                        onChange={e => setUserPlan(u.id, e.target.value)}
                        className="inp py-1 text-xs max-w-[110px]">
                        <option value="unverified">unverified</option>
                        <option value="basic">basic</option>
                        <option value="pro">pro</option>
                        <option value="max">max</option>
                      </select>
                      <button onClick={() => doStealth(u)} className="btn btn-sm btn-icon" title="Stealth">
                        🕵
                      </button>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-xs text-[var(--dim2)]">No users found</div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "accounts" && (
            <div className="fade space-y-5">
              <div>
                <h1 className="text-2xl font-bold">All Accounts</h1>
                <p className="text-sm text-[var(--dim)] mt-0.5">{accounts.length} accounts across system</p>
              </div>

              {loading ? <SkelList count={4} /> : accounts.length === 0 ? (
                <div className="card p-12 text-center text-[var(--dim)] text-sm">No accounts</div>
              ) : (
                <div className="grid gap-3">
                  {accounts.map((a: any) => {
                    const owner = users.find(u => u.id === a.user_id);
                    return (
                      <div key={a.id} className="card card-hover p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-[var(--surface3)] flex items-center justify-center text-[var(--accent)] text-sm font-bold shrink-0">▤</div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate mono">{a.phone}</div>
                              <div className="text-[10px] text-[var(--dim2)] truncate">
                                {owner ? `Owner: ${owner.username || owner.first_name || owner.id}` : `user_id: ${a.user_id}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`tag ${a.health === "Safe" ? "tag-ok" : "tag-warn"}`}>{a.health}</span>
                            <Link href={`/dashboard/accounts/${a.id}`} className="btn btn-sm">View</Link>
                            {owner && (
                              <button onClick={() => doStealth(owner)} className="btn btn-sm btn-icon" title="Stealth as owner">
                                🕵
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "broadcast" && (
            <div className="fade space-y-5 max-w-2xl">
              <div>
                <h1 className="text-2xl font-bold">Broadcast</h1>
                <p className="text-sm text-[var(--dim)] mt-0.5">
                  Send a Telegram message to all {c.users || 0} users
                </p>
              </div>

              <div className="card p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--dim)] mb-3">Message</div>
                <textarea
                  className="inp min-h-[140px] resize-none"
                  placeholder="Type your message here… Telegram formatting supported (*bold*, _italic_)"
                  value={broadcast}
                  onChange={e => setBroadcast(e.target.value)}
                />
                <div className="flex items-center justify-between mt-4">
                  <div className="text-[11px] text-[var(--dim2)]">
                    {broadcast.length} chars
                  </div>
                  <button onClick={sendBroadcast} disabled={busy || !broadcast.trim()}
                    className="btn btn-primary">
                    {busy ? "Sending…" : "Send to all users"}
                  </button>
                </div>
              </div>

              <div className="card p-4 bg-[var(--warning)]/5 border-[var(--warning)]/30">
                <div className="text-xs text-[var(--warning)]">
                  ⚠ Rate limit: ~0.1s per user. Total time ≈ {(c.users || 0) * 0.1}s.
                </div>
              </div>
            </div>
          )}

          {tab === "pricing" && (
            <div className="fade space-y-5">
              <div>
                <h1 className="text-2xl font-bold">Plan Pricing</h1>
                <p className="text-sm text-[var(--dim)] mt-0.5">Configure limits & prices for each plan</p>
              </div>

              <div className="card overflow-hidden">
                <div className="grid grid-cols-7 gap-3 p-3 bg-[var(--surface2)] text-[11px] font-semibold uppercase tracking-wider text-[var(--dim)]">
                  <span>Plan</span>
                  <span>Price ৳</span>
                  <span>Days</span>
                  <span>Accounts</span>
                  <span>Joins/d</span>
                  <span>Msgs/d</span>
                  <span></span>
                </div>
                {plans.map((p: any) => (
                  <div key={p.name} className="grid grid-cols-7 gap-3 p-3 items-center border-t border-[var(--border)]">
                    <span className="text-sm font-semibold uppercase text-[var(--accent2)]">{p.name}</span>
                    <input type="number" defaultValue={p.price}
                      onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), price: +e.target.value}})}
                      className="inp py-1 text-xs" />
                    <input type="number" defaultValue={p.days}
                      onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), days: +e.target.value}})}
                      className="inp py-1 text-xs" />
                    <input type="number" defaultValue={p.max_accounts}
                      onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), max_accounts: +e.target.value}})}
                      className="inp py-1 text-xs" />
                    <input type="number" defaultValue={p.max_daily_joins}
                      onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), max_daily_joins: +e.target.value}})}
                      className="inp py-1 text-xs" />
                    <input type="number" defaultValue={p.max_daily_messages}
                      onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), max_daily_messages: +e.target.value}})}
                      className="inp py-1 text-xs" />
                    <button onClick={() => savePlan(editPlan[p.name] || p)} disabled={busy}
                      className="btn btn-primary btn-sm">Save</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="border-t border-[var(--border)] px-4 md:px-6 py-3 text-[11px] text-[var(--dim2)] flex justify-between max-w-7xl mx-auto w-full">
        <span>topupbuzz // admin</span>
        <a href={`https://t.me/${SUPPORT_USER.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent2)]">
          {SUPPORT_USER}
        </a>
      </footer>

      <ConfirmDialog
        open={!!confirmStealth}
        title="Enter stealth mode?"
        message={`View the panel as ${confirmStealth?.first_name || confirmStealth?.username || confirmStealth?.id}? You'll see their accounts and campaigns.`}
        onCancel={() => setConfirmStealth(null)}
        onConfirm={confirmStealthAction}
      />
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
        return (
          <div key={i} className="chart-bar-wrap">
            <div className="chart-bar-track">
              {f > 0 && <div className="chart-bar chart-bar-err" style={{ height: `${fH}%` }} />}
              {s > 0 && <div className="chart-bar chart-bar-ok" style={{ height: `${sH}%` }} />}
            </div>
            <div className="chart-bar-label">{String(d.day).slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}
