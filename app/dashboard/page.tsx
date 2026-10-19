"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  getMe, getAccounts, getMyStats, getFolders, getCampaign, deleteAccount,
  getLocal, saveLocal, clearLocal, getTelegramWebApp, telegramMiniAuth, 
  refreshDialogs, broadcastNow, getSavedPosts, createSavedPost
} from "@/lib/api";

type Tab = "home" | "accounts" | "broadcast" | "chats" | "me";

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");
  const [me, setMe] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [campaignStats, setCampaignStats] = useState({ activeSchedules: 0, totalGroups: 0 });
  const [ready, setReady] = useState(false);

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
      const [accs, sts, flds, m] = await Promise.all([
        getAccounts().catch(() => []),
        getMyStats().catch(() => null),
        getFolders().catch(() => []),
        getMe().catch(() => null)
      ]);
      
      if (m) { setMe(m); saveLocal("session", m); }
      setAccounts(accs);
      setStats(sts);
      setFolders(flds);

      let active = 0;
      let groups = 0;
      for (const acc of accs) {
        try {
          const camp = await getCampaign(acc.id);
          if (camp && camp.status === "Running") active++;
          if (camp && camp.groups_json) {
             const g = typeof camp.groups_json === 'string' ? JSON.parse(camp.groups_json) : camp.groups_json;
             groups += g.length || 0;
          }
        } catch {}
      }
      setCampaignStats({ activeSchedules: active, totalGroups: groups });
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (ready) loadData();
  }, [ready, loadData]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-[var(--dim)] bg-[#050505]">Loading...</div>;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 bg-[#050505] text-white font-sans">
      
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
      {tab === "home" && <HomeTab stats={stats} campaignStats={campaignStats} folders={folders} setTab={setTab} />}
      {tab === "accounts" && <AccountsTab accounts={accounts} loadData={loadData} router={router} />}
      {tab === "broadcast" && <BroadcastTab accounts={accounts} />}
      {tab === "chats" && <ChatsTab accounts={accounts} />}
      {tab === "me" && <MeTab me={me} />}

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0f0f11]/95 backdrop-blur-md border-t border-[#1f1f22] flex justify-around py-3 pb-6 z-50">
        {[
          { id: "home", icon: "◈", label: "Home" },
          { id: "accounts", icon: "👥", label: "Accounts" },
          { id: "broadcast", icon: "➤", label: "Broadcast" },
          { id: "chats", icon: "💬", label: "Chats" },
          { id: "me", icon: "👤", label: "Me" }
        ].map((t) => (
          <div key={t.id} className={`flex flex-col items-center gap-1 cursor-pointer w-16 ${tab === t.id ? "text-[var(--accent)]" : "text-[var(--dim)]"}`} onClick={() => setTab(t.id as Tab)}>
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= TABS =================

function HomeTab({ stats, campaignStats, folders, setTab }: any) {
  const t = stats?.totals || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3 text-lg">📈</div>
          <div className="text-3xl font-bold text-white">{Number(t.total) || 0}</div>
          <div className="text-xs text-[var(--dim)] mt-1">Posts sent</div>
        </div>
        <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3 text-lg">⏱</div>
          <div className="text-3xl font-bold text-white">{campaignStats.activeSchedules}</div>
          <div className="text-xs text-[var(--dim)] mt-1">Active schedules</div>
        </div>
        <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3 text-lg">📚</div>
          <div className="text-3xl font-bold text-white">{campaignStats.totalGroups}</div>
          <div className="text-xs text-[var(--dim)] mt-1">Groups</div>
        </div>
        <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3 text-lg">📁</div>
          <div className="text-3xl font-bold text-white">{folders.length}</div>
          <div className="text-xs text-[var(--dim)] mt-1">Folders</div>
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-bold text-[var(--dim)] tracking-widest uppercase mb-3">Quick Actions</h3>
        <div className="space-y-3">
          <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[var(--accent)] transition" onClick={() => setTab("broadcast")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black text-xl">➤</div>
            <div className="flex-1">
              <div className="text-white text-sm font-medium">Broadcast now</div>
              <div className="text-xs text-[var(--dim)]">Post once to your groups</div>
            </div>
            <span className="text-[var(--dim)]">›</span>
          </div>
          <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[var(--accent)] transition" onClick={() => setTab("accounts")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black text-xl">👥</div>
            <div className="flex-1">
              <div className="text-white text-sm font-medium">Manage Accounts</div>
              <div className="text-xs text-[var(--dim)]">Add or configure accounts</div>
            </div>
            <span className="text-[var(--dim)]">›</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountsTab({ accounts, loadData, router }: any) {
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
      {accounts.length === 0 ? (
        <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl text-center p-8">
          <div className="text-[var(--dim)] text-sm mb-4">No accounts connected yet.</div>
          <button className="w-full bg-[var(--accent)] text-black py-3 rounded-xl font-bold" onClick={() => router.push("/login")}>+ Connect First Account</button>
        </div>
      ) : (
        <div className="space-y-3">
          <button className="w-full bg-[var(--accent)] text-black py-3 rounded-xl font-bold mb-2" onClick={() => router.push("/login")}>+ Add Account</button>
          {accounts.map((a: any) => (
            <div key={a.id} className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]">◈</div>
              <div className="flex-1">
                <div className="text-white font-medium text-sm">{a.phone}</div>
                <div className="text-xs text-[var(--dim)]">{a.health}</div>
              </div>
              <button className="text-xs bg-[#1f1f22] text-white px-3 py-1.5 rounded-lg font-medium" onClick={() => router.push(`/dashboard/accounts/${a.id}`)}>
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

function BroadcastTab({ accounts }: any) {
  const [mode, setMode] = useState<"list" | "write" | "link" | "saved">("list");
  const [selectedAcc, setSelectedAcc] = useState("");
  const [dialogs, setDialogs] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [selectedSaved, setSelectedSaved] = useState("");
  const [result, setResult] = useState<{success: number, failed: number} | null>(null);

  const reset = () => { setMode("list"); setContent(""); setSelectedGroups([]); setResult(null); setSelectedAcc(""); };

  const loadGroups = async (accId: string) => {
    setSelectedAcc(accId); if (!accId) return;
    setLoading(true);
    try { const res = await refreshDialogs(accId); setDialogs([...(res.groups||[]), ...(res.channels||[])]); } 
    catch { alert("Failed to load groups."); }
    setLoading(false);
  };

  const handleBroadcast = async () => {
    let finalContent = content;
    if (mode === "saved") finalContent = savedPosts.find(p => p.id.toString() === selectedSaved)?.content || "";
    if (!selectedAcc || selectedGroups.length === 0 || !finalContent) return alert("Select account, groups & enter message.");
    setLoading(true); setResult(null);
    try {
      const res = await broadcastNow({ acc_id: selectedAcc, targets: selectedGroups, type: mode === "link" ? "link" : "text", content: finalContent });
      setResult({ success: res.success, failed: res.failed });
    } catch (e: any) { alert("Broadcast failed: " + e.message); }
    setLoading(false);
  };

  if (mode === "list") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white mb-2">Broadcast</h2>
        <p className="text-sm text-[var(--dim)] mb-6">Post a message once to your groups, right now.</p>
        <div className="space-y-3">
          {[
            { id: "write", icon: "✏️", title: "Write now", desc: "Send a custom text message" },
            { id: "link", icon: "🔗", title: "Source link", desc: "Send a post from a Telegram link" },
            { id: "saved", icon: "📄", title: "My Posts", desc: "Send a saved message template" }
          ].map((item) => (
            <div key={item.id} className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[var(--accent)]" 
                 onClick={() => { if(accounts.length===0) return alert("No accounts found."); setMode(item.id as any); if(item.id==="saved") getSavedPosts().then(setSavedPosts).catch(console.error); }}>
              <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black text-xl">{item.icon}</div>
              <div className="flex-1"><div className="text-white text-sm font-medium">{item.title}</div><div className="text-xs text-[var(--dim)]">{item.desc}</div></div>
              <span className="text-[var(--dim)]">›</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2 mb-4">
         <button onClick={reset} className="text-[var(--dim)] font-bold text-lg">←</button>
         <h2 className="text-xl font-bold text-white capitalize">{mode} Message</h2>
      </div>
      {result ? (
        <div className="bg-[#0f0f11] border border-[var(--accent)] rounded-2xl p-6 text-center space-y-4">
           <div className="text-4xl">✅</div><h3 className="text-xl font-bold text-white">Broadcast Complete</h3>
           <div className="flex justify-center gap-6 text-sm"><div className="text-green-500 font-bold">{result.success} Success</div><div className="text-red-500 font-bold">{result.failed} Failed</div></div>
           <button onClick={reset} className="w-full mt-4 bg-[var(--accent)] text-black py-3 rounded-xl font-bold">Done</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4">
            <label className="text-xs text-[var(--dim)] mb-2 block">Select Account</label>
            <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" value={selectedAcc} onChange={e => loadGroups(e.target.value)}>
              <option value="">-- Choose Account --</option>
              {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.phone}</option>)}
            </select>
            {loading && <div className="text-xs text-[var(--accent)] mt-2">Loading groups...</div>}
          </div>
          {dialogs.length > 0 && (
            <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4">
               <label className="text-xs text-[var(--dim)] mb-2 block">Target Groups ({selectedGroups.length} selected)</label>
               <div className="max-h-60 overflow-y-auto bg-[#050505] border border-[#1f1f22] rounded-xl p-2">
                 {dialogs.map((d: any) => (
                   <label key={d.id} className="flex items-center gap-2 p-2 hover:bg-[#1f1f22] rounded cursor-pointer">
                     <input type="checkbox" checked={selectedGroups.includes(d.id)} onChange={e => { if (e.target.checked) setSelectedGroups([...selectedGroups, d.id]); else setSelectedGroups(selectedGroups.filter(id => id !== d.id)); }} className="accent-[var(--accent)] w-4 h-4" />
                     <span className="text-sm text-white truncate">{d.title}</span>
                   </label>
                 ))}
               </div>
            </div>
          )}
          <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4">
            <label className="text-xs text-[var(--dim)] mb-2 block">{mode === "write" ? "Message Text" : mode === "link" ? "Post Link" : "Select Template"}</label>
            {mode === "write" && <div className="space-y-2"><textarea className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white min-h-[120px]" placeholder="Type message..." value={content} onChange={e => setContent(e.target.value)} /><button onClick={async () => { const title = prompt("Template Title:"); if (title && content) { await createSavedPost({ title, content }); alert("Saved!"); } }} className="text-xs text-[var(--accent)] font-bold">+ Save Template</button></div>}
            {mode === "link" && <input type="text" className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" placeholder="https://t.me/channel/123" value={content} onChange={e => setContent(e.target.value)} />}
            {mode === "saved" && <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" value={selectedSaved} onChange={e => setSelectedSaved(e.target.value)}><option value="">-- Choose --</option>{savedPosts.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>}
          </div>
          <button onClick={handleBroadcast} disabled={loading} className="w-full bg-[var(--accent)] text-black py-3 rounded-xl font-bold text-lg">{loading ? "Sending..." : "Broadcast Now"}</button>
        </div>
      )}
    </div>
  );
}

function ChatsTab({ accounts }: any) {
  const [selectedAcc, setSelectedAcc] = useState("");
  const [dialogs, setDialogs] = useState<{groups: any[], channels: any[]}>({groups: [], channels: []});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadChats = async () => {
    if (!selectedAcc) return;
    setLoading(true); setError(""); setDialogs({groups: [], channels: []});
    try { const res = await refreshDialogs(selectedAcc); setDialogs({ groups: res.groups || [], channels: res.channels || [] }); } 
    catch (e: any) { setError(e?.response?.data?.detail || "Failed to load."); }
    setLoading(false);
  };

  const allChats = [...dialogs.groups, ...dialogs.channels];
  const filtered = allChats.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-2">Chats</h2>
      <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 space-y-4">
        <div>
          <label className="block text-xs text-[var(--dim)] mb-2">Select Account</label>
          <div className="flex gap-2">
            <select value={selectedAcc} onChange={e => setSelectedAcc(e.target.value)} className="flex-1 bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white">
              <option value="">-- Choose --</option>
              {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.phone}</option>)}
            </select>
            <button onClick={loadChats} disabled={!selectedAcc || loading} className="bg-[var(--accent)] text-black px-6 py-3 rounded-xl font-bold text-sm">{loading ? "..." : "Load"}</button>
          </div>
        </div>
        {error && <div className="text-red-500 text-xs">{error}</div>}
        {allChats.length > 0 && (
          <div className="pt-4 border-t border-[#1f1f22]">
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-2 text-xs text-white mb-3" />
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {filtered.length === 0 ? <div className="text-center text-xs text-[var(--dim)] py-4">No chats found.</div> : filtered.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 bg-[#050505] p-3 rounded-xl border border-[#1f1f22]">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] text-xs">{c.id < 0 ? "📢" : "👥"}</div>
                    <div className="flex-1 min-w-0"><div className="text-sm text-white truncate">{c.title}</div><div className="text-[10px] text-[var(--dim)]">ID: {c.id}</div></div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MeTab({ me }: any) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 text-center" style={{ background: "linear-gradient(180deg, var(--accent-dim) 0%, transparent 100%)", border: "1px solid var(--accent)" }}>
        <div className="w-20 h-20 rounded-full mx-auto bg-[#050505] border-2 border-[var(--accent)] flex items-center justify-center overflow-hidden mb-4">
          {me?.photo_url ? <img src={me.photo_url} alt="pic" className="w-full h-full object-cover" /> : <span className="text-2xl text-[var(--accent)]">●</span>}
        </div>
        <h2 className="text-xl font-bold text-white">{me?.first_name || me?.username || "User"}</h2>
        <p className="text-sm text-[var(--dim)] mt-1">@{me?.username || "unknown"}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-medium"><span>👑</span> {me?.plan === "unverified" ? "No Premium" : me?.plan}</div>
      </div>
      <button className="w-full mt-4 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl py-3 font-semibold hover:bg-red-500/20 transition" onClick={() => { clearLocal("session"); window.location.href = "/"; }}>Log out</button>
    </div>
  );
}
