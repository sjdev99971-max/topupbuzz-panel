"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Home, Layers, Send, MessageCircle, User, TrendingUp, CalendarClock, 
  Folder, FileText, Settings, ShieldAlert, ChevronRight, PenTool, Link as LinkIcon, 
  CheckCircle2, Loader2, Plus, Download, Upload, Users 
} from "lucide-react";
import { 
  getMe, getAccounts, getMyStats, getFolders, getCampaign, getLocal, saveLocal, clearLocal, 
  getTelegramWebApp, telegramMiniAuth, refreshDialogs, broadcastNow, getSavedPosts, createSavedPost, 
  createFolder, joinMissingGroups, exportFolder 
} from "@/lib/api";

type Tab = "home" | "library" | "broadcast" | "chats" | "me";

// --- SKELETON LOADER COMPONENT ---
function SkeletonCard() {
  return (
    <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 animate-pulse mb-3">
      <div className="h-4 bg-white/10 rounded w-1/2 mb-3"></div>
      <div className="h-3 bg-white/5 rounded w-3/4"></div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");
  const [me, setMe] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let session = getLocal("session");
      if (!session) {
        const tg = getTelegramWebApp();
        if (tg?.initData) {
          try { const res = await telegramMiniAuth(tg.initData); saveLocal("session", res.user); session = res.user; } 
          catch { router.push("/"); return; }
        } else { router.push("/login"); return; }
      }
      setMe(session); setReady(true);
    })();
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, sts, m] = await Promise.all([getAccounts().catch(() => []), getMyStats().catch(() => null), getMe().catch(() => null)]);
      if (m) { setMe(m); saveLocal("session", m); }
      setAccounts(accs); setStats(sts);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (ready) loadData(); }, [ready, loadData]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-[var(--accent)]"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 bg-[#050505] text-white font-sans">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,102,0.4)]"><Send size={16} /></div>
           <span className="font-semibold text-white">TopUpBuzz</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-xs bg-[var(--accent-dim)] text-[var(--accent)] px-3 py-1.5 rounded-full font-bold flex items-center gap-1 border border-[var(--accent)]/30">
            <ShieldAlert size={12} /> Admin
          </Link>
        </div>
      </div>

      {/* MAIN CONTENT ROUTING */}
      {tab === "home" && <HomeTab stats={stats} accounts={accounts} loading={loading} setTab={setTab} />}
      {tab === "library" && <LibraryTab setTab={setTab} />}
      {tab === "broadcast" && <BroadcastTab accounts={accounts} />}
      {tab === "chats" && <ChatsTab accounts={accounts} />}
      {tab === "me" && <MeTab me={me} />}

      {/* BOTTOM NAV */}
      <div className="bottom-nav-glass fixed bottom-0 left-0 right-0 flex justify-around py-3 pb-6 z-50 rounded-t-3xl">
        {[
          { id: "home", icon: Home, label: "Home" },
          { id: "library", icon: Layers, label: "Library" },
          { id: "broadcast", icon: Send, label: "Broadcast" },
          { id: "chats", icon: MessageCircle, label: "Chats" },
          { id: "me", icon: User, label: "Me" }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <div key={t.id} className={`flex flex-col items-center gap-1 cursor-pointer w-16 transition-colors ${isActive ? "text-[var(--accent)]" : "text-[var(--dim)]"}`} onClick={() => setTab(t.id as Tab)}>
              <div className={`p-1.5 rounded-xl ${isActive ? "bg-[var(--accent-dim)]" : ""}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- HOME TAB ---
function HomeTab({ stats, accounts, loading, setTab }: any) {
  const t = stats?.totals || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3"><TrendingUp size={20} /></div>
          <div className="text-3xl font-bold text-white">{loading ? "..." : (Number(t.total) || 0)}</div>
          <div className="text-[11px] text-[var(--dim)] mt-1">Posts sent</div>
        </div>
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3"><Users size={20} /></div>
          <div className="text-3xl font-bold text-white">{loading ? "..." : accounts.length}</div>
          <div className="text-[11px] text-[var(--dim)] mt-1">Accounts</div>
        </div>
      </div>
      
      <div>
        <h3 className="text-[11px] font-bold text-[var(--dim)] uppercase mb-3 ml-1">Quick Actions</h3>
        <div className="space-y-3">
          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => setTab("broadcast")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black"><Send size={22} /></div>
            <div className="flex-1"><div className="text-white text-sm font-bold">Broadcast now</div><div className="text-xs text-[var(--dim)]">Post once to your groups</div></div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>
          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => setTab("library")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black"><Layers size={22} /></div>
            <div className="flex-1"><div className="text-white text-sm font-bold">Manage groups</div><div className="text-xs text-[var(--dim)]">Add chats to folders</div></div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- LIBRARY TAB (Manage Groups) ---
function LibraryTab({ setTab }: any) {
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getFolders().then(f => { setFolders(f); setLoading(false); }).catch(() => setLoading(false)); }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Library</h2>
        <button className="bg-[var(--accent)] text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2" onClick={() => setTab("broadcast")}><Plus size={16}/> New Folder</button>
      </div>
      
      <h3 className="text-sm font-bold text-[var(--dim)] mb-2">My Folders</h3>
      {loading ? (
        <><SkeletonCard /><SkeletonCard /></>
      ) : folders.length === 0 ? (
        <div className="text-center text-[var(--dim)] text-sm mt-10">No folders yet. Create one!</div>
      ) : (
        folders.map((f, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]"><Folder size={18} /></div>
             <div className="flex-1"><div className="text-white font-bold text-sm">{f.name}</div><div className="text-xs text-[var(--dim)]">{JSON.parse(f.groups_json).length} groups</div></div>
             <a href={exportFolder(f.id)} download className="text-[var(--dim)] hover:text-[var(--accent)] p-2"><Download size={18} /></a>
          </div>
        ))
      )}
    </div>
  );
}

// --- BROADCAST TAB ---
function BroadcastTab({ accounts }: any) {
  const [mode, setMode] = useState<"list" | "write" | "link" | "saved">("list");
  const [selectedAcc, setSelectedAcc] = useState("");
  const [dialogs, setDialogs] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [selectedSaved, setSelectedSaved] = useState("");
  const [result, setResult] = useState<{success: number, failed: number} | null>(null);
  
  // Folder Save State
  const [folderName, setFolderName] = useState("");
  const [showSaveFolder, setShowSaveFolder] = useState(false);

  const reset = () => { setMode("list"); setContent(""); setSelectedGroups([]); setResult(null); setSelectedAcc(""); setDialogs([]); setShowSaveFolder(false); };

  const loadGroups = async (accId: string) => {
    setSelectedAcc(accId); if (!accId) return;
    setLoading(true); setDialogs([]);
    try { 
      const res = await refreshDialogs(accId); 
      setDialogs([...(res.groups||[]), ...(res.channels||[])]); 
    } catch { 
      alert("Failed to load groups."); 
    }
    setLoading(false);
  };

  const enterMode = (m: any) => {
    if (accounts.length === 0) return alert("Please add an account first.");
    setMode(m);
    if (m === "saved") getSavedPosts().then(setSavedPosts).catch(console.error);
  };

  const handleBroadcast = async () => {
    let finalContent = content;
    if (mode === "saved") finalContent = savedPosts.find(p => p.id.toString() === selectedSaved)?.content || "";
    if (!selectedAcc || selectedGroups.length === 0 || !finalContent) return alert("Select account, groups & enter message.");
    
    setSending(true); setResult(null);
    try {
      const res = await broadcastNow({ 
        acc_id: selectedAcc, 
        targets: selectedGroups, 
        type: mode === "link" ? "link" : "text", 
        content: finalContent 
      });
      setResult({ success: res.success, failed: res.failed });
    } catch (e: any) { 
      alert("Broadcast failed: " + (e.response?.data?.detail || e.message)); 
    }
    setSending(false);
  };

  // Save as Folder Logic
  const saveSelectedToFolder = async () => {
    if (!folderName || selectedGroups.length === 0) return alert("Enter folder name and select groups.");
    const groupsData = dialogs.filter(d => selectedGroups.includes(d.id));
    await createFolder(folderName, groupsData);
    
    // Trigger auto-join in background
    await joinMissingGroups(selectedAcc, groupsData);
    
    alert("Folder saved & background joining started!");
    setShowSaveFolder(false); setFolderName("");
  };

  if (mode === "list") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white mb-2">Broadcast</h2>
        <p className="text-sm text-[var(--dim)] mb-6">Post a message once to your groups, right now.</p>
        <div className="space-y-3">
          {[
            { id: "write", icon: PenTool, title: "Write now", desc: "Send a custom text message" },
            { id: "link", icon: LinkIcon, title: "Source link", desc: "Send a post from a Telegram link" },
            { id: "saved", icon: FileText, title: "My Posts", desc: "Send a saved message template" }
          ].map((item) => (
            <div key={item.id} className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => enterMode(item.id)}>
              <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black"><item.icon size={22} /></div>
              <div className="flex-1"><div className="text-white text-sm font-bold">{item.title}</div><div className="text-xs text-[var(--dim)]">{item.desc}</div></div>
              <ChevronRight size={20} className="text-[var(--dim)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-3 mb-4">
         <button onClick={reset} className="text-[var(--dim)] bg-white/5 p-2 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
         <h2 className="text-xl font-bold text-white capitalize">{mode} Message</h2>
      </div>

      {result ? (
        <div className="glass-card p-8 text-center space-y-4 border-t-2 border-[var(--accent)]">
           <CheckCircle2 size={48} className="text-[var(--accent)] mx-auto" />
           <h3 className="text-xl font-bold text-white">Broadcast Complete</h3>
           <div className="flex justify-center gap-6 text-sm">
             <div className="text-green-500 font-bold bg-green-500/10 px-4 py-2 rounded-lg">{result.success} Success</div>
             <div className="text-red-500 font-bold bg-red-500/10 px-4 py-2 rounded-lg">{result.failed} Failed</div>
           </div>
           <button onClick={reset} className="w-full mt-6 bg-[var(--accent)] text-black py-3 rounded-xl font-bold">Done</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <label className="text-xs text-[var(--dim)] mb-2 block font-semibold">1. Select Account</label>
            <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" value={selectedAcc} onChange={e => loadGroups(e.target.value)}>
              <option value="">-- Choose Account --</option>
              {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.phone}</option>)}
            </select>
            {loading && <div className="flex items-center gap-2 text-xs text-[var(--accent)] mt-3"><Loader2 size={14} className="animate-spin" /> Fetching dialogs...</div>}
          </div>

          {dialogs.length > 0 && (
            <div className="glass-card p-4">
               <div className="flex justify-between items-center mb-2">
                 <label className="text-xs text-[var(--dim)] font-semibold">2. Target Groups ({selectedGroups.length})</label>
                 <button onClick={() => setShowSaveFolder(!showSaveFolder)} className="text-xs text-[var(--accent)] font-bold flex items-center gap-1"><Folder size={12}/> Save to Folder</button>
               </div>
               
               {showSaveFolder && (
                 <div className="bg-[var(--accent-dim)] p-3 rounded-xl mb-3 flex gap-2">
                   <input type="text" placeholder="Folder Name" value={folderName} onChange={e => setFolderName(e.target.value)} className="flex-1 bg-black/50 px-3 py-1 rounded-lg text-sm outline-none" />
                   <button onClick={saveSelectedToFolder} className="bg-[var(--accent)] text-black px-3 py-1 rounded-lg text-xs font-bold">Save & Auto-Join</button>
                 </div>
               )}

               <div className="max-h-60 overflow-y-auto bg-[#050505] border border-[#1f1f22] rounded-xl p-2">
                 {dialogs.map((d: any) => (
                   <label key={d.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                     <input type="checkbox" checked={selectedGroups.includes(d.id)} onChange={e => { 
                       if (e.target.checked) setSelectedGroups([...selectedGroups, d.id]); 
                       else setSelectedGroups(selectedGroups.filter(id => id !== d.id)); 
                     }} className="accent-[var(--accent)] w-4 h-4" />
                     <span className="text-sm text-white truncate flex-1">{d.title}</span>
                   </label>
                 ))}
               </div>
            </div>
          )}

          <div className="glass-card p-4">
            <label className="text-xs text-[var(--dim)] mb-2 block font-semibold">3. Message Content</label>
            {mode === "write" && <textarea className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white min-h-[100px]" placeholder="Type message..." value={content} onChange={e => setContent(e.target.value)} />}
            {mode === "link" && <input type="text" className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" placeholder="https://t.me/channel/123" value={content} onChange={e => setContent(e.target.value)} />}
            {mode === "saved" && <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" value={selectedSaved} onChange={e => setSelectedSaved(e.target.value)}><option value="">-- Choose --</option>{savedPosts.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>}
          </div>

          <button onClick={handleBroadcast} disabled={sending} className="w-full bg-[var(--accent)] text-black py-4 rounded-xl font-bold text-lg flex justify-center gap-2">
            {sending ? <><Loader2 size={20} className="animate-spin" /> Sending...</> : "Broadcast Now"}
          </button>
        </div>
      )}
    </div>
  );
}

function ChatsTab({ accounts }: any) {
  return <div className="text-center mt-20 text-[var(--dim)]">Chats Module Coming Soon...</div>;
}

function MeTab({ me }: any) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6 text-center border-t-2 border-[var(--accent)]">
        <div className="w-20 h-20 rounded-full mx-auto bg-[#050505] border-2 border-[var(--accent)] flex items-center justify-center overflow-hidden mb-4">
          {me?.photo_url ? <img src={me.photo_url} className="w-full h-full object-cover" /> : <User size={32} className="text-[var(--accent)]" />}
        </div>
        <h2 className="text-xl font-bold text-white">{me?.first_name || me?.username}</h2>
        <p className="text-sm text-[var(--dim)] mt-1">@{me?.username}</p>
      </div>
      <button className="w-full bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl py-3 font-bold" onClick={() => { clearLocal("session"); window.location.href = "/"; }}>Log out</button>
    </div>
  );
}
