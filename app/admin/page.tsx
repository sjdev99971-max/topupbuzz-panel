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
  adminBroadcast, setStealth, getPlans, getAccounts, SUPPORT_USER, adminGetAllAccounts, adminDemoteUser, adminMakeRentAccount, adminDeletePlan
} from "@/lib/api";

type Tab = "stats" | "users" | "accounts" | "rent_accounts" | "broadcast" | "pricing";

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

  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPrice, setNewPlanPrice] = useState("");
  const [newPlanDays, setNewPlanDays] = useState("30");
  const [newPlanMaxAcc, setNewPlanMaxAcc] = useState("1");
  const [newPlanMaxJoins, setNewPlanMaxJoins] = useState("50");
  const [newPlanMaxMsgs, setNewPlanMaxMsgs] = useState("1000");
  const [newPlanAccounts, setNewPlanAccounts] = useState<string[]>([]);

  const defaultPlans = [
    { name: "unverified", price: 0, days: 0, max_accounts: 0, max_daily_joins: 0, max_daily_messages: 0 },
    { name: "basic", price: 50, days: 30, max_accounts: 1, max_daily_joins: 50, max_daily_messages: 10000 },
    { name: "pro", price: 100, days: 30, max_accounts: 3, max_daily_joins: 2000, max_daily_messages: 20000 },
    { name: "max", price: 200, days: 30, max_accounts: 10, max_daily_joins: 5000, max_daily_messages: 100000 }
  ];

  const [confirmStealth, setConfirmStealth] = useState<any>(null);

  // Quick Deliver States
  const [quickId, setQuickId] = useState("");
  const [quickPlan, setQuickPlan] = useState("basic");
  const [quickDays, setQuickDays] = useState("30");

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
      ["accounts", adminGetAllAccounts()], ["plans", getPlans()]
    ];
    const results = await Promise.allSettled(calls.map(c => c[1]));
    const failed: string[] = [];
    
    results.forEach((r, i) => {
      const name = calls[i][0];
      if (r.status === "fulfilled") {
        if (name === "stats") setStats(r.value);
        if (name === "users") setUsers(r.value);
        if (name === "accounts") setAccounts(r.value);
        if (name === "plans") {
          const fetched = r.value;
          if (Array.isArray(fetched) && fetched.length > 0) {
            setPlans(fetched);
          } else {
            setPlans(defaultPlans);
          }
        }
      } else {
        if (name === "plans") setPlans(defaultPlans);
        failed.push(name);
      }
    });
    if (failed.length > 0) toast("Failed to load: " + failed.join(", "), "error");
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
      toast(`✅ Delivered ${quickPlan} to ${quickId}`, "success");
      setQuickId(""); refresh();
    } catch (err: any) { 
      toast(err.response?.data?.detail || "Delivery failed. Check User ID or Plan.", "error"); 
    }
    setBusy(false);
  };

  const handleQuickDemote = async () => {
    if (!quickId.trim()) return toast("Enter User ID", "error");
    if (!confirm(`Demote user ${quickId} to Unverified?`)) return;
    setBusy(true);
    try {
      await adminDemoteUser(Number(quickId));
      toast(`✅ User ${quickId} demoted`, "success");
      setQuickId(""); refresh();
    } catch { toast("Demotion failed.", "error"); }
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

  
  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) return alert("Enter plan name");
    setBusy(true);
    try {
      await adminUpdatePlan({
        name: newPlanName.toLowerCase(),
        price: Number(newPlanPrice) || 0,
        days: Number(newPlanDays) || 30,
        max_accounts: Number(newPlanMaxAcc) || 1,
        max_daily_joins: Number(newPlanMaxJoins) || 50,
        max_daily_messages: Number(newPlanMaxMsgs) || 1000,
        included_accounts: newPlanAccounts
      });
      alert("✅ Plan created successfully!");
      // ফর্ম ক্লিয়ার
      setNewPlanName(""); setNewPlanPrice(""); setNewPlanDays("30"); 
      setNewPlanMaxAcc("1"); setNewPlanMaxJoins("50"); setNewPlanMaxMsgs("1000"); setNewPlanAccounts([]);
      refresh();
    } catch (e) { alert("Failed to create plan"); }
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

  const handleMakeRent = async (a: any) => {
    const isRentStr = prompt("Make this a Rent Account? (Type 1 for Yes, 0 for No)", a.is_rent === 1 ? "1" : "0");
    if (isRentStr === null) return;
    const isRent = parseInt(isRentStr);
    if (isRent !== 0 && isRent !== 1) return alert("Invalid input. Use 0 or 1.");
    
    let limit = a.hourly_limit || 30;
    if (isRent === 1) {
        const limitStr = prompt("Set Hourly Message Limit (Default 30):", limit.toString());
        if (limitStr) limit = parseInt(limitStr);
    }
    
    await adminMakeRentAccount(a.id, isRent, limit, a.is_frozen || 0);
    alert("✅ Rent Account Settings Updated!");
    refresh();
  };

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent2)] rounded-full spin" />
    </div>
  );

  const filteredUsers = q ? users.filter(u => String(u.id).includes(q) || (u.username || "").toLowerCase().includes(q.toLowerCase())) : users;
  const tabs: {id: Tab; label: string; icon: string}[] = [
    { id: "stats", label: "Stats", icon: "◉" },
    { id: "users", label: "Users", icon: "◈" },
    { id: "accounts", label: "All Accounts", icon: "▤" },
    { id: "rent_accounts", label: "Rent Accounts", icon: "⭐" },
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
    <div className="min-h-screen flex flex-col admin-mode bg-[var(--bg)] text-[var(--text)] font-sans">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/60 backdrop-blur-xl shadow-lg shadow-black/50">
        <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <Link href="/dashboard" className="flex items-center gap-2.5 text-white">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent2)] flex items-center justify-center text-white text-xs font-bold">♛</div>
            <span className="font-semibold text-[15px]">Admin</span>
            <span className="text-[10px] text-[var(--accent2)] px-2 py-0.5 rounded-full bg-[var(--accent2)]/10 font-semibold">FULL ACCESS</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="btn btn-sm bg-white/10 text-white hover:bg-white/20">← User Panel</Link>
            <button onClick={logout} className="btn btn-sm btn-ghost text-white">⏏</button>
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
              <div className="flex justify-between"><span>Users</span><span className="text-white">{c.users || 0}</span></div>
              <div className="flex justify-between"><span>Accounts</span><span className="text-white">{c.accounts || 0}</span></div>
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
                <div className="stat"><div className="stat-label">Total Users</div><div className="stat-value">{c.users || 0}</div></div>
                <div className="stat"><div className="stat-label">Total Accounts</div><div className="stat-value">{c.accounts || 0}</div></div>
                <div className="stat"><div className="stat-label">Campaigns</div><div className="stat-value">{c.campaigns || 0}</div><div className="stat-sub text-[var(--success)]">{c.running || 0} running</div></div>
                <div className="stat"><div className="stat-label">Success Rate</div><div className="stat-value" style={{ color: rate >= 90 ? "var(--success)" : rate >= 70 ? "var(--warning)" : "var(--danger)" }}>{rate.toFixed(1)}%</div><div className="stat-sub">{success.toLocaleString()} / {total.toLocaleString()}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-5"><div className="stat-label">Messages Sent (Total)</div><div className="text-2xl font-bold mt-2">{total.toLocaleString()}</div></div>
                <div className="card p-5"><div className="stat-label">Failed</div><div className="text-2xl font-bold mt-2 text-[var(--danger)]">{failed.toLocaleString()}</div></div>
              </div>
              {stats?.top_users?.length > 0 && (
                <div className="card p-5">
                  <div className="text-sm font-semibold mb-4">Top Users by Accounts</div>
                  <div className="space-y-2">
                    {stats.top_users.map((u: any, i: number) => (
                      <div key={u.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                        <div className="w-6 h-6 rounded-md bg-[var(--surface3)] text-xs flex items-center justify-center text-[var(--dim)] font-semibold">{i + 1}</div>
                        <div className="flex-1 min-w-0"><div className="text-sm truncate">{u.first_name || u.username || u.id}</div><div className="text-[10px] text-[var(--dim2)]">id: {u.id}</div></div>
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
                <div><h1 className="text-2xl font-bold">Users</h1><p className="text-sm text-[var(--dim)] mt-0.5">{users.length} total</p></div>
                <input className="inp text-xs py-2 max-w-[220px]" placeholder="Search id / username…" value={q} onChange={e => setQ(e.target.value)} />
              </div>
              <div className="card p-4 border border-[var(--accent2)]/30">
                <div className="text-sm font-semibold mb-3 flex items-center gap-2">⚡ Quick Deliver (Fast Upgrade)</div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[150px]"><label className="text-[10px] text-[var(--dim)] mb-1 block">User Telegram ID</label><input type="number" placeholder="e.g. 123456789" value={quickId} onChange={e => setQuickId(e.target.value)} className="inp py-2 text-sm w-full" /></div>
                  <div className="w-[130px]">
                    <label className="text-[10px] text-[var(--dim)] mb-1 block">Select Plan</label>
                    <select value={quickPlan} onChange={e => setQuickPlan(e.target.value)} className="inp py-2 text-sm w-full">
                      {plans.length > 0 ? (
                        plans.map((p: any) => (
                          <option key={p.name} value={p.name}>{p.name.toUpperCase()}</option>
                        ))
                      ) : (
                        <>
                          <option value="basic">Basic</option>
                          <option value="pro">Pro</option>
                          <option value="max">Max</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="w-[90px]"><label className="text-[10px] text-[var(--dim)] mb-1 block">Days</label><input type="number" min="1" placeholder="30" value={quickDays} onChange={e => setQuickDays(e.target.value)} className="inp py-2 text-sm w-full" /></div>
                  <button onClick={handleQuickDeliver} disabled={busy} className="btn py-2 px-6 h-[38px] bg-gradient-to-r from-[var(--accent2)] to-emerald-500 text-white font-bold rounded-xl">{busy ? "..." : "Deliver Now"}</button>
                  <button onClick={handleQuickDemote} disabled={busy} className="btn py-2 px-4 h-[38px] bg-red-500/10 text-red-500 border border-red-500/30">Demote</button>
                </div>
              </div>
              {loading ? <SkelList count={4} /> : (
                <div className="card divide-y divide-[var(--border)]">
                  {filteredUsers.map((u: any) => (
                    <div key={u.id} className="p-3 flex items-center gap-3 flex-wrap">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent2)] to-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shrink-0">{(u.first_name?.[0] || u.username?.[0] || "?").toUpperCase()}</div>
                      <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{u.first_name || u.username || "Unknown"}</div><div className="text-[10px] text-[var(--dim2)]">id: {u.id}</div></div>
                      <span className={`tag ${u.plan === "unverified" ? "tag-neutral" : u.plan === "max" ? "tag-purple" : "tag-info"}`}>{u.plan}</span>
                      <select defaultValue={u.plan} onChange={e => setUserPlan(u.id, e.target.value)} className="inp py-1 text-xs max-w-[110px]"><option value="unverified">unverified</option><option value="basic">basic</option><option value="pro">pro</option><option value="max">max</option></select>
                      <button onClick={() => doStealth(u)} className="btn btn-sm btn-icon bg-white/5">🕵</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "accounts" && (
            <div className="fade space-y-5">
              <div><h1 className="text-2xl font-bold">All Accounts</h1><p className="text-sm text-[var(--dim)] mt-0.5">{accounts.length} accounts across system</p></div>
              {loading ? <SkelList count={4} /> : accounts.length === 0 ? (
                <div className="card p-12 text-center text-[var(--dim)] text-sm">No accounts</div>
              ) : (
                <div className="grid gap-3">
                  {accounts.map((a: any) => {
                    const owner = users.find(u => u.id === a.user_id);
                    return (
                      <div key={a.id} className="card p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-[var(--surface3)] flex items-center justify-center text-[var(--accent)] text-sm font-bold shrink-0">▤</div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate mono">{a.phone}</div>
                              <div className="text-[10px] text-[var(--dim2)] truncate">{owner ? `Owner: ${owner.username || owner.first_name || owner.id}` : `user_id: ${a.user_id}`}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`tag ${a.health === "Safe" ? "tag-ok" : "tag-warn"}`}>{a.health}</span>
                            <button onClick={() => handleMakeRent(a)} className={`btn btn-sm ${a.is_rent === 1 ? 'bg-purple-600 text-white' : 'bg-white/10 text-white'}`}>{a.is_rent === 1 ? "⭐ Managed" : "Make Rent"}</button>
                            <button onClick={() => doStealth(users.find(u => u.id === a.user_id))} className="btn btn-sm bg-white/5">🕵</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "rent_accounts" && (
            <div className="fade space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">⭐ Rent Accounts</h1>
                  <p className="text-sm text-[var(--dim)] mt-0.5">Manage accounts assigned to users</p>
                </div>
                <button onClick={() => window.location.href = "/login?type=rent"} className="btn btn-primary flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                  + Add Rent Account
                </button>
              </div>
              {loading ? <SkelList count={3} /> : accounts.filter((a: any) => a.is_rent === 1).length === 0 ? (
                <div className="card p-12 text-center text-[var(--dim)] text-sm">No Rent Accounts found. Go to "All Accounts" to make an account a Rent Account.</div>
              ) : (
                <div className="grid gap-4">
                  {accounts.filter((a: any) => a.is_rent === 1).map((a: any) => (
                    <div key={a.id} className="card p-5 border border-[var(--accent2)]/30 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent2)] to-purple-500"></div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mt-2">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-[var(--accent2)]/20 flex items-center justify-center text-[var(--accent2)] text-xl font-bold shrink-0 border border-[var(--accent2)]/30">⭐</div>
                          <div className="min-w-0">
                            <div className="text-base font-bold text-[var(--text)] truncate">{a.phone}</div>
                            <div className="text-xs text-[var(--dim2)] mt-1.5 flex flex-wrap items-center gap-2">
                              <span className="bg-[var(--bg)] px-2 py-1 rounded-md border border-[var(--border)]">Limit: <span className="text-white font-bold">{a.hourly_limit || 30} /h</span></span>
                              <span className={`px-2 py-1 rounded-md border font-bold ${a.is_frozen === 1 ? "bg-red-500/10 text-red-500 border-red-500/30" : "bg-green-500/10 text-green-500 border-green-500/30"}`}>{a.is_frozen === 1 ? "❄️ Frozen" : "🔥 Active"}</span>
                              <span className={`px-2 py-1 rounded-md border font-bold ${a.user_id ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}>{a.user_id ? `In Use (User: ${a.user_id})` : "Unused"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <button onClick={async () => {
                            const newStatus = a.is_frozen === 1 ? 0 : 1;
                            await adminMakeRentAccount, adminDeletePlan(a.id, 1, a.hourly_limit || 30, newStatus);
                            alert(newStatus === 1 ? "❄️ Frozen!" : "🔥 Unfrozen!");
                            refresh();
                          }} className={`btn btn-sm ${a.is_frozen === 1 ? 'bg-orange-500 text-white' : 'bg-[var(--surface3)] text-[var(--text)]'}`}>
                            {a.is_frozen === 1 ? "❄️ Unfreeze" : "❄️ Freeze"}
                          </button>
                          <button onClick={async () => {
                            const limitStr = prompt("Set new Hourly Limit:", (a.hourly_limit || 30).toString());
                            if (limitStr) {
                              await adminMakeRentAccount, adminDeletePlan(a.id, 1, parseInt(limitStr), a.is_frozen || 0);
                              alert("✅ Limit Updated!"); refresh();
                            }
                          }} className="btn btn-sm bg-[var(--surface3)] text-[var(--text)]">✏️ Edit Limit</button>
                          <button onClick={async () => {
                            if(!confirm("Remove from Rent System?")) return;
                            await adminMakeRentAccount, adminDeletePlan(a.id, 0, 30, 0);
                            alert("✅ Removed!"); refresh();
                          }} className="btn btn-sm bg-red-500/10 text-red-500 border border-red-500/30">🗑️ Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "broadcast" && (
            <div className="fade space-y-5 max-w-2xl">
              <div><h1 className="text-2xl font-bold">Broadcast</h1><p className="text-sm text-[var(--dim)] mt-0.5">Send a Telegram message to all {c.users || 0} users</p></div>
              <div className="card p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--dim)] mb-3">Message</div>
                <textarea className="inp min-h-[140px] resize-none" placeholder="Type your message here…" value={broadcast} onChange={e => setBroadcast(e.target.value)} />
                <div className="flex items-center justify-between mt-4">
                  <div className="text-[11px] text-[var(--dim2)]">{broadcast.length} chars</div>
                  <button onClick={sendBroadcast} disabled={busy || !broadcast.trim()} className="btn btn-primary">{busy ? "Sending…" : "Send to all users"}</button>
                </div>
              </div>
              <div className="card p-4 bg-[var(--warning)]/5 border-[var(--warning)]/30"><div className="text-xs text-[var(--warning)]">⚠ Rate limit: ~0.1s per user.</div></div>
            </div>
          )}

          {tab === "pricing" && (
            <div className="fade space-y-5">
              <div><h1 className="text-2xl font-bold">Plan Pricing</h1><p className="text-sm text-[var(--dim)] mt-0.5">Configure limits & prices</p></div>

              {/* CREATE NEW PLAN UI */}
              <div className="card p-5 border border-[var(--accent2)]/30">
                <div className="text-sm font-semibold mb-4 flex items-center gap-2">✨ Create New Plan</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="text-[10px] text-[var(--dim)] block mb-1">Plan Name</label>
                    <input type="text" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder="e.g. vip" className="inp py-2 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--dim)] block mb-1">Price (৳)</label>
                    <input type="number" value={newPlanPrice} onChange={e => setNewPlanPrice(e.target.value)} className="inp py-2 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--dim)] block mb-1">Duration (Days)</label>
                    <input type="number" value={newPlanDays} onChange={e => setNewPlanDays(e.target.value)} className="inp py-2 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--dim)] block mb-1">Max Accounts</label>
                    <input type="number" value={newPlanMaxAcc} onChange={e => {
                    const val = e.target.value;
                    setNewPlanMaxAcc(val);
                    // যদি নতুন লিমিটের চেয়ে বেশি অ্যাকাউন্ট সিলেক্ট করা থাকে, তবে এক্সট্রা সিলেকশন মুছে ফেলা
                    const limit = Number(val) || 1;
                    if (newPlanAccounts.length > limit) {
                      setNewPlanAccounts(newPlanAccounts.slice(0, limit));
                    }
                  }} className="inp py-2 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--dim)] block mb-1">Daily Joins</label>
                    <input type="number" value={newPlanMaxJoins} onChange={e => setNewPlanMaxJoins(e.target.value)} className="inp py-2 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--dim)] block mb-1">Daily Msgs</label>
                    <input type="number" value={newPlanMaxMsgs} onChange={e => setNewPlanMaxMsgs(e.target.value)} className="inp py-2 text-sm w-full" />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="text-[10px] text-[var(--dim)] block mb-2">Include Rent Accounts (Optional)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {accounts.filter((a: any) => a.is_rent === 1).map((a: any) => (
                      <label key={a.id} className="flex items-center gap-2 text-xs text-white bg-[var(--bg)] p-2 rounded-lg border border-[var(--border)] cursor-pointer hover:border-[var(--accent2)]">
                        <input type="checkbox" 
                          checked={newPlanAccounts.includes(a.id)} 
                          disabled={newPlanAccounts.length >= Number(newPlanMaxAcc) && !newPlanAccounts.includes(a.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              if (newPlanAccounts.length >= Number(newPlanMaxAcc)) {
                                alert(`You can only select up to ${newPlanMaxAcc} accounts based on Max Accounts limit.`);
                                return;
                              }
                              setNewPlanAccounts([...newPlanAccounts, a.id]);
                            } else {
                              setNewPlanAccounts(newPlanAccounts.filter(id => id !== a.id));
                            }
                          }} 
                          className="accent-[var(--accent2)] disabled:opacity-50" 
                        />
                        {a.phone}
                      </label>
                    ))}
                    {accounts.filter((a: any) => a.is_rent === 1).length === 0 && (
                      <div className="text-xs text-[var(--dim)]">No Rent Accounts available.</div>
                    )}
                  </div>
                </div>

                <button onClick={handleCreatePlan} disabled={busy} className="btn btn-primary w-full bg-gradient-to-r from-[var(--accent2)] to-purple-600 text-white font-bold py-3">
                  {busy ? "Creating..." : "Create Plan"}
                </button>
              </div>
              {/* END CREATE NEW PLAN UI */}
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    <div className="grid grid-cols-7 gap-3 p-3 bg-[var(--surface2)] text-[11px] font-semibold uppercase tracking-wider text-[var(--dim)]">
                      <span>Plan</span><span>Price ৳</span><span>Days</span><span>Accounts</span><span>Joins/d</span><span>Msgs/d</span><span></span>
                    </div>
                    {plans.map((p: any) => (
                      <div key={p.name} className="grid grid-cols-7 gap-3 p-3 items-center border-t border-[var(--border)]">
                        <span className="text-sm font-semibold uppercase text-[var(--accent2)]">{p.name}</span>
                        <input type="number" defaultValue={p.price} onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), price: +e.target.value}})} className="inp py-1 text-xs" />
                        <input type="number" defaultValue={p.days} onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), days: +e.target.value}})} className="inp py-1 text-xs" />
                        <input type="number" defaultValue={p.max_accounts} onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), max_accounts: +e.target.value}})} className="inp py-1 text-xs" />
                        <input type="number" defaultValue={p.max_daily_joins} onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), max_daily_joins: +e.target.value}})} className="inp py-1 text-xs" />
                        <input type="number" defaultValue={p.max_daily_messages} onChange={e => setEditPlan({...editPlan, [p.name]: {...p, ...(editPlan[p.name]||{}), max_daily_messages: +e.target.value}})} className="inp py-1 text-xs" />
                        <div className="flex items-center gap-1">
                          <button onClick={() => savePlan(editPlan[p.name] || p)} disabled={busy} className="btn btn-primary btn-sm">Save</button>
                          <button onClick={() => {
                            setNewPlanName(p.name); setNewPlanPrice(p.price.toString()); setNewPlanDays(p.days.toString());
                            setNewPlanMaxAcc(p.max_accounts.toString()); setNewPlanMaxJoins(p.max_daily_joins.toString()); setNewPlanMaxMsgs(p.max_daily_messages.toString());
                            window.scrollTo(0, 0); // স্ক্রল করে উপরে ফর্মে নিয়ে যাবে
                          }} className="btn btn-sm bg-blue-500/20 text-blue-400">✏️</button>
                          <button onClick={async () => {
                            if(!confirm(`Delete plan "${p.name}"? Users already on this plan will keep their limits, but the plan won't appear for new buyers.`)) return;
                            try { await adminDeletePlan(p.name); alert("✅ Plan deleted!"); refresh(); } catch(e) { alert("Failed to delete plan."); }
                          }} className="btn btn-sm bg-red-500/20 text-red-500">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <footer className="border-t border-[var(--border)] px-4 md:px-6 py-3 text-[11px] text-[var(--dim2)] flex justify-between max-w-7xl mx-auto w-full">
        <span>topupbuzz // admin</span><a href={`https://t.me/${SUPPORT_USER.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent2)]">{SUPPORT_USER}</a>
      </footer>
      <ConfirmDialog open={!!confirmStealth} title="Enter stealth mode?" message={`View as ${confirmStealth?.first_name || confirmStealth?.username || confirmStealth?.id}?`} onCancel={() => setConfirmStealth(null)} onConfirm={confirmStealthAction} />
    </div>
  );
}
