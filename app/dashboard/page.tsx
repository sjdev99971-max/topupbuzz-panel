"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Home, Layers, Send, MessageCircle, User, TrendingUp, CalendarClock, 
  Folder, FileText, Settings, ShieldAlert, ChevronRight, PenTool, Link as LinkIcon, 
  CheckCircle2, Loader2, Plus, Download, Upload, Users, Crown, BookOpen, Sparkles, Gift, Headphones, LogIn, LogOut, Clock, Zap, HelpCircle, X 
} from "lucide-react";
import { 
  getMe, getAccounts, getMyStats, getFolders, getCampaign, getLocal, saveLocal, clearLocal, 
  getTelegramWebApp, telegramMiniAuth, refreshDialogs, broadcastNow, getSavedPosts, createSavedPost, getPlans, 
  createFolder, joinMissingGroups, downloadFolderFile, checkSpamBot, getLogs, deleteAccount, updateFolder, updateSettings 
} from "@/lib/api";

type Tab = "home" | "library" | "broadcast" | "chats" | "me";

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
  const [folders, setFolders] = useState<any[]>([]);
  const [campaignStats, setCampaignStats] = useState({ activeSchedules: 0, totalGroups: 0 });
  const [ready, setReady] = useState(false);
  const [stealthId, setStealthId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let session = getLocal("session");
      
      if (!session || !session.id) {
        const tg = getTelegramWebApp();
        if (tg && tg.initData) {
          try {
            const res = await telegramMiniAuth(tg.initData);
            if (res && res.user) {
              saveLocal("session", res.user);
              session = res.user;
            } else {
              throw new Error("Invalid auth response");
            }
          } catch (err: any) {
            console.error("Telegram Auto-Login Failed:", err);
            const errMsg = err.response?.data?.detail || err.message || "Auth failed";
            // এররটি স্ক্রিনে দেখানো, যাতে বোঝা যায় কোথায় সমস্যা
            alert("Auto-Login Failed: " + errMsg);
            if (typeof window !== "undefined") window.location.href = "/login"; 
            return;
          }
        } else {
          // টেলিগ্রামের বাইরে ওপেন করলে
          if (typeof window !== "undefined") window.location.href = "/login"; 
          return;
        }
      }
      
      setMe(session); 
      setReady(true);
    })();
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, sts, flds, m] = await Promise.all([
        getAccounts().catch(() => []), getMyStats().catch(() => null),
        getFolders().catch(() => []), getMe().catch(() => null)
      ]);
      
      if (m) { 
        setMe(m); 
        // Stealth মোডে থাকলে অ্যাডমিনের মেইন সেশন চেঞ্জ করা যাবে না
        const isStealth = typeof window !== "undefined" && localStorage.getItem("stealth_id");
        if (!isStealth) saveLocal("session", m); 
      }
      setAccounts(accs); setStats(sts); setFolders(flds);

      let active = 0, groups = 0;
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
    setLoading(false);
  }, []);

  useEffect(() => { 
    if (ready) {
      loadData();
      const interval = setInterval(loadData, 5000); // প্রতি ৫ সেকেন্ডে রিফ্রেশ
      return () => clearInterval(interval);
    }
  }, [ready, loadData]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-[var(--accent)]"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 bg-[#050505] text-white font-sans selection:bg-[var(--accent)] selection:text-black">
      {stealthId && (
        <div className="bg-red-600 text-white p-2 text-center text-sm font-bold flex justify-between items-center px-4 sticky top-0 z-50 rounded-xl mb-4 shadow-lg">
          <span>🕵️ Viewing as User ID: {stealthId}</span>
          <button onClick={() => { 
            if (typeof window !== "undefined") {
              localStorage.removeItem("stealth_id"); 
              window.location.href = "/dashboard"; 
            }
          }} className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-gray-200">Exit Stealth</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,102,0.4)]"><Send size={16} /></div>
           <span className="font-semibold text-white tracking-wide">TopUpBuzz</span>
        </div>
        <div className="flex items-center gap-2">
          {me?.is_admin && (
            <Link href="/admin" className="text-xs bg-[var(--accent-dim)] text-[var(--accent)] px-3 py-1.5 rounded-full font-bold flex items-center gap-1 border border-[var(--accent)]/30">
              <ShieldAlert size={12} /> Admin
            </Link>
          )}
        </div>
      </div>

      {tab === "home" && <HomeTab stats={stats} campaignStats={campaignStats} folders={folders} accounts={accounts} loading={loading} setTab={setTab} onRefresh={loadData} />}
      {tab === "library" && <LibraryTab setTab={setTab} accounts={accounts} onRefresh={loadData} />}
      {tab === "broadcast" && <BroadcastTab accounts={accounts} folders={folders} />}
      {tab === "chats" && <ChatsTab accounts={accounts} />}
      {tab === "me" && <MeTab me={me} />}

      {/* Floating Bottom Menu Card */}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
        <div className="bottom-nav-glass flex justify-around items-center py-2 px-2 w-full max-w-md rounded-3xl pointer-events-auto">
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
              <div key={t.id} className={`flex flex-col items-center gap-1 cursor-pointer w-16 transition-all duration-300 ${isActive ? "text-[var(--accent)] scale-105" : "text-[var(--dim)] hover:text-white"}`} onClick={() => setTab(t.id as Tab)}>
                <div className={`p-2 rounded-2xl transition-all ${isActive ? "bg-[var(--accent-dim)] shadow-[0_0_15px_rgba(28,212,90,0.3)]" : ""}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>{t.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HomeTab({ stats, campaignStats, folders, accounts, loading, setTab, onRefresh }: any) {
  const router = useRouter();
  const t = stats?.totals || {};
  
  const deleteAcc = async (id: string) => {
    if(!confirm("Are you sure you want to delete this account?")) return;
    try {
      await deleteAccount(id);
      if(onRefresh) onRefresh();
      alert("Account deleted successfully!");
    } catch (e) { alert("Failed to delete account"); }
  };

  return (
    <div className="space-y-6 relative">
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3"><TrendingUp size={20} /></div>
          <div className="text-3xl font-bold text-white">{loading ? "..." : (Number(t.total) || 0)}</div>
          <div className="text-[11px] text-[var(--dim)] mt-1">Posts sent</div>
        </div>
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3"><CalendarClock size={20} /></div>
          <div className="text-3xl font-bold text-white">{loading ? "..." : campaignStats.activeSchedules}</div>
          <div className="text-[11px] text-[var(--dim)] mt-1">Active schedules</div>
        </div>
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3"><Layers size={20} /></div>
          <div className="text-3xl font-bold text-white">{loading ? "..." : campaignStats.totalGroups}</div>
          <div className="text-[11px] text-[var(--dim)] mt-1">Groups</div>
        </div>
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3"><Folder size={20} /></div>
          <div className="text-3xl font-bold text-white">{loading ? "..." : folders.length}</div>
          <div className="text-[11px] text-[var(--dim)] mt-1">Folders</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3 ml-1">
          <h3 className="text-[11px] font-bold text-[var(--dim)] tracking-widest uppercase">Connected Accounts</h3>
          <button onClick={() => router.push("/login")} className="bg-[var(--accent)] text-black px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(28,212,90,0.3)]">
            <Plus size={14} /> Add Account
          </button>
        </div>
        
        <div className="space-y-3">
          {accounts.length === 0 ? (
             <div className="glass-card p-4 text-center text-sm text-[var(--dim)]">No accounts connected yet. Click "Add Account" above.</div>
          ) : (
            accounts.map((a: any) => (
              <div key={a.id} className="glass-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]"><User size={18} /></div>
                <div className="flex-1">
                  <div className="text-white text-sm font-bold">{a.phone}</div>
                  <div className="text-xs text-[var(--dim)] mt-0.5">Status: <span className={a.health === 'Safe' ? 'text-green-500' : 'text-red-500'}>{a.health || 'Unknown'}</span></div>
                </div>
                <button onClick={() => deleteAcc(a.id)} className="text-red-500/70 hover:text-red-500 p-2 bg-red-500/10 rounded-xl"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-bold text-[var(--dim)] tracking-widest uppercase mb-3 ml-1">Quick Actions</h3>
        <div className="space-y-3">
          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => setTab("broadcast")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,102,0.3)]"><Send size={22} /></div>
            <div className="flex-1"><div className="text-white text-sm font-bold">Broadcast now</div><div className="text-xs text-[var(--dim)] mt-0.5">Post once to your groups</div></div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>
          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => setTab("library")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,102,0.3)]"><Layers size={22} /></div>
            <div className="flex-1"><div className="text-white text-sm font-bold">Manage groups</div><div className="text-xs text-[var(--dim)] mt-0.5">Add chats to folders</div></div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
function LibraryTab({ setTab, accounts, onRefresh }: any) {
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  
  const [selectedAcc, setSelectedAcc] = useState("");
  const [dialogs, setDialogs] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [folderName, setFolderName] = useState("");
  const [loadingDlgs, setLoadingDlgs] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    getFolders().then(f => { setFolders(f); setLoading(false); }).catch(() => setLoading(false)); 
  }, []);

  const loadGroups = async (accId: string) => {
    setSelectedAcc(accId); if (!accId) return;
    setLoadingDlgs(true); setDialogs([]);
    try { const res = await refreshDialogs(accId); setDialogs([...(res.groups||[]), ...(res.channels||[])]); } 
    catch { alert("Failed to load groups."); }
    setLoadingDlgs(false);
  };

  const handleCreateFolder = async () => {
    if (!folderName || selectedGroups.length === 0) return alert("Enter folder name and select groups.");
    setSaving(true);
    try {
      const groupsData = dialogs.filter(d => selectedGroups.includes(d.id));
      if (editingFolderId) {
        await updateFolder(editingFolderId, folderName, groupsData);
        alert("Folder updated successfully!");
      } else {
        await createFolder(folderName, groupsData);
        await joinMissingGroups(selectedAcc, groupsData);
        alert("Folder created & background joining started!");
      }
      setIsCreating(false);
      setFolderName(""); setSelectedGroups([]); setSelectedAcc(""); setDialogs([]); setEditingFolderId(null);
      getFolders().then(setFolders);
      if(onRefresh) onRefresh();
    } catch (e: any) { alert("Failed to save folder."); }
    setSaving(false);
  };


  const handleEditFolder = (f: any) => {
    setEditingFolderId(f.id);
    setFolderName(f.name);
    const groups = typeof f.groups_json === 'string' ? JSON.parse(f.groups_json) : f.groups_json;
    setSelectedGroups(groups.map((g: any) => g.id));
    setIsCreating(true);
  };

  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event: any) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.name && data.groups) {
           await createFolder(data.name, data.groups);
           if (accounts.length > 0) await joinMissingGroups(accounts[0].id, data.groups);
           alert("Folder Imported!");
           getFolders().then(setFolders);
        }
      } catch { alert("Invalid JSON file."); }
    };
    reader.readAsText(file);
  };

  if (isCreating) {
    return (
      <div className="space-y-4 pb-10">
        <div className="flex items-center gap-3 mb-4">
           <button onClick={() => setIsCreating(false)} className="text-[var(--dim)] bg-white/5 p-2 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
           <h2 className="text-xl font-bold text-white">Create New Folder</h2>
        </div>
        <div className="glass-card p-4">
          <label className="text-xs text-[var(--dim)] mb-2 block font-semibold">1. Select Account to load groups</label>
          <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" value={selectedAcc} onChange={e => loadGroups(e.target.value)}>
            <option value="">-- Choose Account --</option>
            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.phone}</option>)}
          </select>
          {loadingDlgs && <div className="flex items-center gap-2 text-xs text-[var(--accent)] mt-3"><Loader2 size={14} className="animate-spin" /> Fetching dialogs...</div>}
        </div>
        {dialogs.length > 0 && (
          <div className="glass-card p-4">
             <label className="text-xs text-[var(--dim)] mb-2 block font-semibold">2. Select Groups ({selectedGroups.length} selected)</label>
             <div className="max-h-60 overflow-y-auto bg-[#050505] border border-[#1f1f22] rounded-xl p-2 custom-scrollbar">
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
          <label className="text-xs text-[var(--dim)] mb-2 block font-semibold">3. Folder Name</label>
          <input type="text" className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" placeholder="e.g. VIP Groups" value={folderName} onChange={e => setFolderName(e.target.value)} />
        </div>
        <button onClick={handleCreateFolder} disabled={saving} className="w-full bg-[var(--accent)] text-black py-4 rounded-xl font-bold text-lg flex justify-center gap-2">
          {saving ? <><Loader2 size={20} className="animate-spin" /> Saving...</> : "Save Folder & Auto-Join"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Library</h2>
        <div className="flex gap-2">
          <label className="bg-white/5 text-white px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1 cursor-pointer hover:bg-white/10">
            <Upload size={16}/> Import
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          <button className="bg-[var(--accent)] text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.3)]" onClick={() => setIsCreating(true)}>
            <Plus size={16}/> New Folder
          </button>
        </div>
      </div>
      
      <h3 className="text-sm font-bold text-[var(--dim)] mb-2">My Folders</h3>
      {loading ? (
        <><SkeletonCard /><SkeletonCard /></>
      ) : folders.length === 0 ? (
        <div className="text-center text-[var(--dim)] text-sm mt-10 glass-card p-8">No folders yet. Create or Import one!</div>
      ) : (
        folders.map((f, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]"><Folder size={18} /></div>
             <div className="flex-1"><div className="text-white font-bold text-sm">{f.name}</div><div className="text-xs text-[var(--dim)]">{JSON.parse(f.groups_json).length} groups</div></div>
             <button onClick={() => handleEditFolder(f)} className="text-blue-400 hover:text-blue-300 p-2"><Settings size={18} /></button>
             <button onClick={() => downloadFolderFile(f.id)} className="text-[var(--dim)] hover:text-[var(--accent)] p-2"><Download size={18} /></button>
          </div>
        ))
      )}
    </div>
  );
}

function BroadcastTab({ accounts, folders }: any) {
  const [mode, setMode] = useState<"list" | "write" | "link" | "saved" | "send_now" | "history">("list");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [selectedAcc, setSelectedAcc] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{success: number, failed: number} | null>(null);

  const reset = () => { setMode("list"); setContent(""); setTitle(""); setResult(null); setSelectedAcc(""); setSelectedFolder(""); setSelectedTemplate(""); };

  const loadMyPosts = async () => {
    setLoadingPosts(true);
    try { const posts = await getSavedPosts(); setSavedPosts(posts); } catch {}
    setLoadingPosts(false);
  };


  const loadHistory = async (accId: string) => {
    if (!accId) return;
    setLoadingLogs(true);
    try {
      const res = await getLogs(accId);
      setHistoryLogs(res || []);
    } catch (e) { alert("Failed to load history"); }
    setLoadingLogs(false);
  };

  const enterSendMode = async () => {
    if (accounts.length === 0) return alert("Please add an account first.");
    setMode("send_now");
    try {
      const p = await getSavedPosts();
      setSavedPosts(p);
    } catch (e) {
      alert("Failed to load templates");
    }
  };

  const handleSaveTemplate = async (type: "text" | "link") => {
    if (!title || !content) return alert("Enter title and content/link.");
    if (type === "link" && !content.includes("t.me/")) {
      return alert("❌ Invalid Link! Please enter a valid Telegram link (e.g., https://t.me/channel/123)");
    }
    setSaving(true);
    try {
      await createSavedPost({ title, content, type });
      alert("Saved successfully!");
      reset();
    } catch { alert("Failed to save."); }
    setSaving(false);
  };

  const handleBroadcastNow = async () => {
    if (!selectedAcc || !selectedFolder || !selectedTemplate) return alert("Select account, folder & template.");
    const folderData = folders.find((f:any) => f.id.toString() === selectedFolder);
    const templateData = savedPosts.find(p => p.id.toString() === selectedTemplate);
    if (!folderData || !templateData) return alert("Invalid selection.");
    
    const targets = JSON.parse(folderData.groups_json);

    setSending(true); setResult(null);
    try {
      const res = await broadcastNow({ 
        acc_id: selectedAcc, 
        targets: targets.map((t:any) => t.id), 
        type: templateData.content.startsWith("http") ? "link" : "text", 
        content: templateData.content 
      });
      setResult({ success: res.success, failed: res.failed });
    } catch (e: any) { alert("Broadcast failed."); }
    setSending(false);
  };

  if (mode === "list") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white mb-2">Broadcast</h2>
        <p className="text-sm text-[var(--dim)] mb-6">Manage your posts and send them to folders.</p>
        
        <div className="space-y-3">
          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer border border-[var(--accent)]/30 bg-[var(--accent-dim)]" onClick={enterSendMode}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,102,0.4)]"><Send size={22} /></div>
            <div className="flex-1"><div className="text-white text-sm font-bold text-lg">Send Broadcast Now</div><div className="text-xs text-[var(--accent)] mt-0.5">Select Account, Folder & Send</div></div>
            <ChevronRight size={20} className="text-[var(--accent)]" />
          </div>

          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => setMode("write")}>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white"><PenTool size={22} /></div>
            <div className="flex-1"><div className="text-white text-sm font-bold">Write New Template</div><div className="text-xs text-[var(--dim)]">Save a text message</div></div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>

          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => setMode("link")}>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white"><LinkIcon size={22} /></div>
            <div className="flex-1"><div className="text-white text-sm font-bold">Import Source Link</div><div className="text-xs text-[var(--dim)]">Save a Telegram post link</div></div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>

          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => { setMode("saved"); loadMyPosts(); }}>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white"><FileText size={22} /></div>
            <div className="flex-1"><div className="text-white text-sm font-bold">Saved Post History</div><div className="text-xs text-[var(--dim)]">View all saved templates</div></div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>
          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer mt-3" onClick={() => { setMode("history"); }}>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white"><Clock size={22} /></div>
            <div className="flex-1"><div className="text-white text-sm font-bold">Broadcast History</div><div className="text-xs text-[var(--dim)]">See where and when posts were sent</div></div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "write") {
    return (
      <div className="space-y-4 pb-10">
        <div className="flex items-center gap-3 mb-4">
           <button onClick={reset} className="text-[var(--dim)] bg-white/5 p-2 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
           <h2 className="text-xl font-bold text-white">Write Template</h2>
        </div>
        <div className="glass-card p-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--dim)] mb-1 block">Template Title</label>
            <input type="text" className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" placeholder="e.g. Promotion Msg" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-[var(--dim)] mb-1 block">Message Content</label>
            <textarea className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white min-h-[150px]" placeholder="Type your message here..." value={content} onChange={e => setContent(e.target.value)} />
          </div>
        </div>
        <button onClick={() => handleSaveTemplate("text")} disabled={saving} className="w-full bg-[var(--accent)] text-black py-4 rounded-xl font-bold">
          {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
    );
  }

  if (mode === "link") {
    return (
      <div className="space-y-4 pb-10">
        <div className="flex items-center gap-3 mb-4">
           <button onClick={reset} className="text-[var(--dim)] bg-white/5 p-2 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
           <h2 className="text-xl font-bold text-white">Import Source Link</h2>
        </div>
        <div className="glass-card p-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--dim)] mb-1 block">Source Title</label>
            <input type="text" className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" placeholder="e.g. My Channel Post" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-[var(--dim)] mb-1 block">Telegram Post Link</label>
            <input type="text" className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" placeholder="https://t.me/channel/123" value={content} onChange={e => setContent(e.target.value)} />
          </div>
        </div>
        <button onClick={() => handleSaveTemplate("link")} disabled={saving} className="w-full bg-[var(--accent)] text-black py-4 rounded-xl font-bold">
          {saving ? "Saving..." : "Save Source Link"}
        </button>
      </div>
    );
  }

  if (mode === "saved") {
    return (
      <div className="space-y-4 pb-10">
        <div className="flex items-center gap-3 mb-4">
           <button onClick={reset} className="text-[var(--dim)] bg-white/5 p-2 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
           <h2 className="text-xl font-bold text-white">My Posts</h2>
        </div>
        {loadingPosts ? <div className="text-center text-[var(--accent)] mt-10"><Loader2 className="animate-spin mx-auto" size={32} /></div> : 
         savedPosts.length === 0 ? <div className="text-center text-[var(--dim)] py-10 glass-card">No templates saved yet.</div> :
         savedPosts.map((p: any) => (
           <div key={p.id} className="glass-card p-4">
             <div className="text-white font-bold text-sm mb-1">{p.title}</div>
             <div className="text-xs text-[var(--dim)] bg-black/30 p-2 rounded-lg mt-2 line-clamp-3">{p.content}</div>
           </div>
         ))
        }
      </div>
    );
  }


  if (mode === "history") {
    return (
      <div className="space-y-4 pb-10">
        <div className="flex items-center gap-3 mb-4">
           <button onClick={reset} className="text-[var(--dim)] bg-white/5 p-2 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
           <h2 className="text-xl font-bold text-white">Broadcast History</h2>
        </div>
        <div className="glass-card p-4 mb-4">
          <label className="text-xs text-[var(--dim)] mb-2 block font-semibold">Select Account to view logs</label>
          <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" value={selectedAcc} onChange={e => { setSelectedAcc(e.target.value); loadHistory(e.target.value); }}>
            <option value="">-- Choose Account --</option>
            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.phone}</option>)}
          </select>
        </div>
        {loadingLogs ? (
           <div className="text-center text-[var(--accent)] mt-10"><Loader2 className="animate-spin mx-auto" size={32} /></div>
        ) : historyLogs.length === 0 ? (
           <div className="text-center text-[var(--dim)] py-10 glass-card">No history found for this account.</div>
        ) : (
           <div className="space-y-2">
             {historyLogs.map((log: any) => (
               <div key={log.id} className="glass-card p-3 flex flex-col gap-1">
                 <div className="flex justify-between items-start">
                   <div className="text-sm font-bold text-white truncate max-w-[70%]">{log.group_title}</div>
                   <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${log.status.includes('success') ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{log.status}</div>
                 </div>
                 <div className="text-[10px] text-[var(--dim)]">{new Date(log.ts).toLocaleString()}</div>
               </div>
             ))}
           </div>
        )}
      </div>
    );
  }
  if (mode === "send_now") {
    return (
      <div className="space-y-4 pb-10">
        <div className="flex items-center gap-3 mb-4">
           <button onClick={reset} className="text-[var(--dim)] bg-white/5 p-2 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
           <h2 className="text-xl font-bold text-white">Broadcast Now</h2>
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
              <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" value={selectedAcc} onChange={e => setSelectedAcc(e.target.value)}>
                <option value="">-- Choose Account --</option>
                {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.phone}</option>)}
              </select>
            </div>

            <div className="glass-card p-4">
              <label className="text-xs text-[var(--dim)] mb-2 block font-semibold">2. Select Target Folder</label>
              <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}>
                <option value="">-- Choose Folder --</option>
                {folders.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            <div className="glass-card p-4">
              <label className="text-xs text-[var(--dim)] mb-2 block font-semibold">3. Select Template / Source</label>
              <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                <option value="">-- Choose Post --</option>
                {savedPosts.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>

            <button onClick={handleBroadcastNow} disabled={sending} className="w-full bg-[var(--accent)] text-black py-4 rounded-xl font-bold text-lg flex justify-center gap-2">
              {sending ? <><Loader2 size={20} className="animate-spin" /> Sending...</> : "Start Broadcast"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function ChatsTab({ accounts }: any) {
  const [selectedAcc, setSelectedAcc] = useState("");
  const [dialogs, setDialogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [botChecking, setBotChecking] = useState(false);

  const loadChats = async (accId: string) => {
    setSelectedAcc(accId);
    if (!accId) return;
    setLoading(true); setDialogs([]);
    try { const res = await refreshDialogs(accId); setDialogs([...(res.groups || []), ...(res.channels || [])]); } 
    catch { alert("Failed to load chats."); }
    setLoading(false);
  };

  const handleSpamBot = async () => {
    if (!selectedAcc) return alert("Select an account first.");
    setBotChecking(true);
    try {
      const res = await checkSpamBot(selectedAcc);
      alert(`Status: ${res.status}\n\n${res.message}`);
    } catch { alert("SpamBot check failed."); }
    setBotChecking(false);
  };

  const filtered = dialogs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-2">Chats & Health</h2>
      
      <div className="glass-card p-4 space-y-3">
        <label className="text-xs text-[var(--dim)] block font-semibold">Select Account</label>
        <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" value={selectedAcc} onChange={e => loadChats(e.target.value)}>
          <option value="">-- Choose Account --</option>
          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.phone}</option>)}
        </select>
        
        <button onClick={handleSpamBot} disabled={!selectedAcc || botChecking} className="w-full bg-red-500/10 text-red-500 border border-red-500/30 py-2 rounded-xl text-sm font-bold flex justify-center items-center gap-2">
           {botChecking ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />} 
           Check Account Health (@SpamBot)
        </button>
      </div>

      {dialogs.length > 0 && (
        <div className="glass-card p-4">
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-2 text-sm text-white mb-3" />
          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filtered.map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-3 bg-[#050505] p-3 rounded-xl border border-[#1f1f22]">
                <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] text-xs"><MessageCircle size={14} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{c.title}</div>
                  <div className="text-[10px] text-[var(--dim)]">ID: {c.id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MeTab({ me }: any) {
  const router = useRouter();
  const [showPremium, setShowPremium] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings States
  const [activeStart, setActiveStart] = useState(me?.settings?.active_start || "08:00");
  const [activeEnd, setActiveEnd] = useState(me?.settings?.active_end || "23:00");
  const [forwardMode, setForwardMode] = useState(me?.settings?.forward_mode || "copy");
  const [batchSize, setBatchSize] = useState(me?.settings?.batch_size || 1);
  const [delayMinutes, setDelayMinutes] = useState(me?.settings?.delay_minutes || 10);
  const [maxRetries, setMaxRetries] = useState(me?.settings?.max_retries || 3);
  const [notifications, setNotifications] = useState(me?.settings?.notifications ?? true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Help Modal State
  const [helpData, setHelpData] = useState<any>(null);
  
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const cleanName = me?.first_name?.replace(/[^\w\s\u0980-\u09FF]/gi, '').trim() || me?.username || "User";
  const avatarUrl = me?.photo_url || `https://apis.topup.buzz/avatar/${me?.user_id || me?.id}`;
  const currentPlan = me?.plan || "unverified";

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await getPlans();
      setPlans(res || []);
    } catch (e) {
      console.error("Failed to load plans", e);
    }
    setLoadingPlans(false);
  };

  useEffect(() => {
    if (showPremium) loadPlans();
  }, [showPremium]);

  const handleSaveSettings = async () => {
    if (delayMinutes < 5 && delayMinutes > 0) {
      if(!confirm("WARNING: Delay less than 5 minutes can get your account restricted by Telegram. Do you want to proceed?")) return;
    }
    if (delayMinutes === 0) {
      if(!confirm("DANGER: Setting delay to 0 means all posts will be sent at once. This is highly unsafe and your account WILL be banned. Proceed?")) return;
    }

    setSavingSettings(true);
    try {
      await updateSettings({ 
        active_start: activeStart,
        active_end: activeEnd,
        forward_mode: forwardMode,
        batch_size: batchSize,
        delay_minutes: delayMinutes,
        max_retries: maxRetries,
        notifications: notifications
      });
      alert("Settings saved successfully!");
      setShowSettings(false);
    } catch (e) {
      alert("Error saving settings!");
    }
    setSavingSettings(false);
  };

  const handleBuyPlan = (plan: any) => {
    const text = `Hello, I need the ${plan.name.toUpperCase()} plan.\nPrice: ৳${plan.price}\nDuration: ${plan.days} Days\nMy Username: @${me?.username || "user"}`;
    navigator.clipboard.writeText(text);
    alert("Plan details copied to clipboard! Please paste it in the chat.");
    window.open("https://t.me/DEVELOPER_JAHID_BHAI", "_blank");
  };

  // Helper component for Help Icon
  const HelpIcon = ({ title, desc, example }: any) => (
    <button onClick={() => setHelpData({ title, desc, example })} className="flex items-center gap-1 ml-2 group">
      <HelpCircle size={16} className="text-[var(--accent)] group-hover:animate-spin" />
      <span className="rgb-neon-text text-[10px]">(বিস্তারিত জানতে ক্লিক করুন)</span>
    </button>
  );

  if (showSettings) {
    return (
      <div className="space-y-4 pb-20 relative">
        <div className="flex items-center gap-3 mb-4">
           <button onClick={() => setShowSettings(false)} className="text-white bg-white/10 p-2 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
           <h2 className="text-xl font-bold text-white">Settings</h2>
        </div>

        {/* Animated Warning Notice */}
        <div className="rgb-neon-border bg-black/50 border-2 rounded-2xl p-4 text-sm text-white/90 space-y-2">
           <div className="flex items-center gap-2 rgb-neon-text font-bold mb-1">
              <ShieldAlert size={18} /> টেলিগ্রাম সেফটি গাইডলাইন (গুরুত্বপূর্ণ)
           </div>
           <p>টেলিগ্রামের স্প্যাম ফিল্টার অত্যন্ত কড়া। একসাথে অনেকগুলো পোস্ট পাঠালে বা খুব কম সময়ের মধ্যে পর পর পোস্ট পাঠালে আপনার অ্যাকাউন্ট <strong>Restricted বা Ban</strong> খেতে পারে।</p>
        </div>

        <div className="glass-card p-5 space-y-6">
           {/* Active Hours */}
           <div>
              <label className="text-sm font-semibold text-white mb-2 flex items-center">
                 <CalendarClock size={16} className="mr-2"/> Active Hours (Night Mode)
                 <HelpIcon title="Active Hours" desc="কোন সময়ে বট পোস্ট করবে।" example="সকাল ৮টা থেকে রাত ১১টা দিলে, এই সময়ের বাইরে বট কোনো পোস্ট পাঠাবে না।" />
              </label>
              <div className="flex items-center gap-2">
                 <input type="time" value={activeStart} onChange={e => setActiveStart(e.target.value)} className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]" />
                 <span className="text-white/50">to</span>
                 <input type="time" value={activeEnd} onChange={e => setActiveEnd(e.target.value)} className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]" />
              </div>
           </div>

           {/* Forward Mode */}
           <div className="border-t border-white/5 pt-4">
              <label className="text-sm font-semibold text-white mb-2 flex items-center">
                 <Send size={16} className="mr-2"/> Forward Mode
                 <HelpIcon title="Forward Mode" desc="মেসেজ পাঠানোর ধরন।" example="Copy দিলে 'Forwarded from' লেখা থাকবে না। Forward দিলে ট্যাগ সহ যাবে।" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setForwardMode("copy")} className={`py-2 rounded-xl text-sm font-bold border transition-colors ${forwardMode === "copy" ? "bg-[var(--accent)] text-black border-[var(--accent)]" : "bg-transparent text-white border-white/20"}`}>Copy (No Tag)</button>
                 <button onClick={() => setForwardMode("forward")} className={`py-2 rounded-xl text-sm font-bold border transition-colors ${forwardMode === "forward" ? "bg-[var(--accent)] text-black border-[var(--accent)]" : "bg-transparent text-white border-white/20"}`}>Forward (With Tag)</button>
              </div>
           </div>

           {/* Batch Size - Custom Input */}
           <div className="border-t border-white/5 pt-4">
              <label className="text-sm font-semibold text-white mb-2 flex items-center">
                 <Zap size={16} className="mr-2"/> Batch Size
                 <HelpIcon title="Batch Size" desc="একসাথে কতগুলো গ্রুপে মেসেজ পাঠাবে।" example="১ দিলে একটার পর একটা যাবে (সবচেয়ে সেফ)। ৩ দিলে ৩টি গ্রুপে একসাথে যাবে।" />
              </label>
              <input 
                type="number" 
                min="1" 
                max="20"
                value={batchSize} 
                onChange={e => setBatchSize(Number(e.target.value))} 
                placeholder="যেমন: ১" 
                className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]" 
              />
           </div>

           {/* Delay Minutes */}
           <div className="border-t border-white/5 pt-4">
              <label className="text-sm font-semibold text-white mb-2 flex items-center">
                 <Clock size={16} className="mr-2"/> Delay (মিনিট)
                 <HelpIcon title="Delay" desc="পরবর্তী ব্যাচে যাওয়ার আগে কতক্ষণ অপেক্ষা করবে।" example="১০ দিলে প্রতি ১০ মিনিট পর পর পোস্ট যাবে। ৫ মিনিটের নিচে দিলে ব্লক হওয়ার সম্ভাবনা থাকে।" />
              </label>
              <input type="number" min="0" value={delayMinutes} onChange={e => setDelayMinutes(Number(e.target.value))} className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]" />
              {/* Animated Warning for Delay */}
              <div className="mt-2 text-[11px] font-bold text-white bg-red-500/20 p-2 rounded-lg border border-red-500/50 flex items-center gap-1">
                 <ShieldAlert size={12} /> সতর্কতা: ৫ মিনিটের নিচে ডিলে দিলে অ্যাকাউন্ট ব্লক হতে পারে।
              </div>
           </div>

           {/* Auto Retry */}
           <div className="border-t border-white/5 pt-4">
              <label className="text-sm font-semibold text-white mb-2 flex items-center">
                 <Zap size={16} className="mr-2"/> Auto Retry
                 <HelpIcon title="Auto Retry" desc="পোস্ট ফেইল হলে বট কতবার আবার চেষ্টা করবে।" example="৩ দিলে পোস্ট ফেইল হলে ৩ বার অটোমেটিক আবার পাঠানোর চেষ্টা করবে।" />
              </label>
              <select value={maxRetries} onChange={e => setMaxRetries(Number(e.target.value))} className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]">
                <option value={1}>1 Attempt</option>
                <option value={3}>3 Attempts (Recommended)</option>
                <option value={5}>5 Attempts</option>
              </select>
           </div>

           {/* Notifications */}
           <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <div>
                 <div className="text-sm font-semibold text-white flex items-center">
                    <Settings size={16} className="mr-2"/> Daily Notifications
                    <HelpIcon title="Notifications" desc="টেলিগ্রামের সেফটি টিপস।" example="দিনে ২ বার বট আপনাকে মেসেজ দিয়ে সতর্ক করবে।" />
                 </div>
              </div>
              <button onClick={() => setNotifications(!notifications)} className={`w-12 h-6 rounded-full transition-colors relative ${notifications ? 'bg-[var(--accent)]' : 'bg-white/20'}`}>
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${notifications ? 'left-6' : 'left-0.5'}`}></div>
              </button>
           </div>
        </div>

        <button onClick={handleSaveSettings} disabled={savingSettings} className="w-full bg-[var(--accent)] text-black py-4 rounded-xl font-bold flex justify-center items-center mt-4 shadow-[0_0_15px_rgba(28,212,90,0.3)]">
          {savingSettings ? <Loader2 size={20} className="animate-spin" /> : "Save Settings"}
        </button>

        {/* HELP MODAL */}
        {helpData && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setHelpData(null)}>
            <div className="bg-[#111] border border-[#1cd45a]/50 rounded-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[var(--accent)]">{helpData.title}</h3>
                <button onClick={() => setHelpData(null)} className="text-white/50 hover:text-white bg-white/5 p-1 rounded-full"><X size={20}/></button>
              </div>
              <p className="text-white text-sm mb-4">{helpData.desc}</p>
              <div className="bg-[#050505] p-3 rounded-xl border border-white/10">
                 <p className="text-xs text-[var(--accent)] font-bold mb-1">উদাহরণ:</p>
                 <p className="text-sm text-white/80">{helpData.example}</p>
              </div>
              <button onClick={() => setHelpData(null)} className="w-full mt-6 bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20">বুঝেছি</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (showPremium) {
    return (
      <div className="space-y-4 pb-20">
        <div className="flex items-center gap-3 mb-6">
           <button onClick={() => setShowPremium(false)} className="text-white bg-white/10 p-2 rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
           <h2 className="text-xl font-bold text-white">Premium Plans</h2>
        </div>
        <div className="bg-[#111] border border-[var(--accent)]/30 rounded-2xl p-6 text-center space-y-2 shadow-[0_0_20px_rgba(28,212,90,0.1)]">
          <Crown size={48} className="text-[var(--accent)] mx-auto mb-2" />
          <h3 className="text-xl font-bold text-white">Your Current Plan</h3>
          <p className="text-[var(--accent)] font-bold text-lg uppercase">{currentPlan}</p>
        </div>
        {loadingPlans ? (
           <div className="text-center text-[var(--accent)] mt-10"><Loader2 className="animate-spin mx-auto" size={32} /></div>
        ) : (
          <div className="space-y-4 mt-6">
            {plans.map((p: any) => {
              const isCurrent = p.name === currentPlan;
              return (
                <div key={p.name} className={`bg-[#111] border rounded-2xl p-5 flex flex-col gap-2 ${isCurrent ? 'border-[var(--accent)]' : 'border-white/10'}`}>
                  <div className="flex justify-between items-center">
                    <div className="text-white font-bold text-lg capitalize">{p.name}</div>
                    <div className="text-[var(--accent)] font-bold">৳{p.price} <span className="text-xs text-white/50 font-normal">/ {p.days} Days</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-white/70">
                    <div className="bg-black/40 p-2 rounded-lg">Accounts: <span className="text-white font-bold">{p.max_accounts}</span></div>
                    <div className="bg-black/40 p-2 rounded-lg">Daily Msgs: <span className="text-white font-bold">{p.max_daily_messages}</span></div>
                  </div>
                  <button disabled={isCurrent} onClick={() => handleBuyPlan(p)} className={`w-full mt-3 py-3 rounded-xl font-bold text-sm ${isCurrent ? 'bg-white/10 text-white/50' : 'bg-[var(--accent)] text-black active:scale-95 transition-transform'}`}>
                    {isCurrent ? "Current Plan" : "Buy Plan (Contact Admin)"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      <div className="bg-[#1cd45a] rounded-2xl p-6 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6 relative z-10">
           <button className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-black"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M21 12c0 1.2-.4 2.3-1 3.2a7 7 0 0 1-12 0c-.6-.9-1-2-1-3.2a7 7 0 0 1 14 0Z"/></svg></button>
           <button className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-black"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
        </div>
        <div className="flex flex-col items-center justify-center text-center relative z-10">
          <div className="w-24 h-24 rounded-full border-4 border-[#0d1f13] overflow-hidden bg-[#0d1f13] mb-3 flex items-center justify-center relative">
            <img src={avatarUrl} alt="profile" className="w-full h-full object-cover relative z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div className="absolute inset-0 flex items-center justify-center z-0"><User size={40} className="text-white/50" /></div>
          </div>
          <h2 className="text-xl font-bold text-black flex items-center justify-center gap-1">
            {cleanName} <span className="font-mono text-black/70">&lt;/&gt;</span>
          </h2>
          <p className="text-sm text-black/60 font-medium mt-0.5">@{me?.username || "user"}</p>
          <div className="mt-4 bg-black/10 px-4 py-1.5 rounded-full flex items-center gap-2 cursor-pointer hover:bg-black/20 transition-colors" onClick={() => setShowPremium(true)}>
            <Crown size={16} className="text-black" />
            <span className="text-sm font-semibold text-black capitalize">{currentPlan} Plan · Tap to Upgrade</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center -mt-2 mb-4">
        <button className="bg-white/5 border border-white/10 px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2"><BookOpen size={16} /> Show tutorial</button>
      </div>

      <div className="space-y-3">
        <div onClick={() => setShowPremium(true)} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors">
          <div className="w-10 h-10 rounded-full bg-[#1cd45a]/10 flex items-center justify-center text-[#1cd45a]"><Sparkles size={20} /></div>
          <div className="flex-1"><div className="text-white font-semibold text-[15px]">Get Premium</div><div className="text-xs text-white/50">Unlock all features</div></div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 bg-[#1cd45a] text-black px-2 py-0.5 rounded-full text-xs font-bold uppercase"><Crown size={12}/> {currentPlan}</div>
             <ChevronRight size={18} className="text-white/30" />
          </div>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-[#1cd45a]/10 flex items-center justify-center text-[#1cd45a]"><Gift size={20} /></div>
          <div className="flex-1"><div className="text-white font-semibold text-[15px]">Tasks</div><div className="text-xs text-white/50">Earn coins</div></div>
          <ChevronRight size={18} className="text-white/30" />
        </div>
        <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-[#1cd45a]/10 flex items-center justify-center text-[#1cd45a]"><Gift size={20} /></div>
          <div className="flex-1"><div className="text-white font-semibold text-[15px]">Refer & Earn</div><div className="text-xs text-white/50">Invite friends, earn coins</div></div>
          <ChevronRight size={18} className="text-white/30" />
        </div>
        <div onClick={() => setShowSettings(true)} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors">
          <div className="w-10 h-10 rounded-full bg-[#1cd45a]/10 flex items-center justify-center text-[#1cd45a]"><Settings size={20} /></div>
          <div className="flex-1"><div className="text-white font-semibold text-[15px]">Settings</div><div className="text-xs text-white/50">Active Hours · Forward · Safety</div></div>
          <ChevronRight size={18} className="text-white/30" />
        </div>
      </div>

      <div className="bg-[#111] border border-white/5 rounded-2xl p-2 mt-4 space-y-1">
        <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer"><FileText size={18} className="text-white/60" /><span className="flex-1 text-sm text-white/90 font-medium">Terms & Conditions</span><ChevronRight size={16} className="text-white/30" /></div>
        <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer"><ShieldAlert size={18} className="text-white/60" /><span className="flex-1 text-sm text-white/90 font-medium">Privacy Policy</span><ChevronRight size={16} className="text-white/30" /></div>
        <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer"><Headphones size={18} className="text-white/60" /><span className="flex-1 text-sm text-white/90 font-medium">Support</span><ChevronRight size={16} className="text-white/30" /></div>
      </div>

      <button 
        onClick={() => router.push("/login")} 
        className="w-full bg-[var(--accent)] text-black py-4 rounded-xl font-bold text-base flex justify-center items-center gap-2 mt-4 shadow-[0_0_15px_rgba(28,212,90,0.3)]"
      >
        <User size={20} /> Add New Account
      </button>
      <button onClick={() => { localStorage.clear(); window.location.href = "/login?logout=true"; }} className="w-full bg-red-500/10 text-red-500 border border-red-500/30 py-4 rounded-xl font-bold text-base flex justify-center items-center gap-2 mt-4">
        <LogOut size={20} /> Log out Dashboard
      </button>
    </div>
  );
}
