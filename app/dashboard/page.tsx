"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Home, Layers, Send, MessageCircle, User, TrendingUp, CalendarClock, 
  Folder, FileText, Settings, ShieldAlert, ChevronRight, PenTool, Link as LinkIcon, CheckCircle2, AlertCircle, Loader2 
} from "lucide-react";
import { 
  getMe, getAccounts, getMyStats, getFolders, getCampaign, getLocal, saveLocal, clearLocal, 
  getTelegramWebApp, telegramMiniAuth, refreshDialogs, broadcastNow, getSavedPosts, createSavedPost
} from "@/lib/api";

type Tab = "home" | "library" | "broadcast" | "chats" | "me";

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
          try { const res = await telegramMiniAuth(tg.initData); saveLocal("session", res.user); session = res.user; } 
          catch { router.push("/"); return; }
        } else { router.push("/login"); return; }
      }
      setMe(session); setReady(true);
    })();
  }, [router]);

  const loadData = useCallback(async () => {
    try {
      const [accs, sts, flds, m] = await Promise.all([
        getAccounts().catch(() => []), getMyStats().catch(() => null),
        getFolders().catch(() => []), getMe().catch(() => null)
      ]);
      
      if (m) { setMe(m); saveLocal("session", m); }
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
  }, []);

  useEffect(() => { if (ready) loadData(); }, [ready, loadData]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-[var(--accent)]"><Settings className="animate-spin" /></div>;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 bg-[#050505] text-white font-sans selection:bg-[var(--accent)] selection:text-black">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,102,0.4)]">
             <Send size={16} strokeWidth={2.5} />
           </div>
           <span className="font-semibold text-white tracking-wide">TopUpBuzz</span>
        </div>
        <div className="flex items-center gap-2">
          {me?.is_admin ? (
            <Link href="/admin" className="text-xs bg-[var(--accent)] text-black px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(0,255,102,0.3)]">
              <ShieldAlert size={12} /> Admin
            </Link>
          ) : (
            <div onClick={() => alert("Admin Bot coming Soon 🔜")} className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 cursor-pointer">
              <ShieldAlert size={12} /> Admin
            </div>
          )}
          <div className="text-xs text-[var(--dim)]">@{me?.username || 'User'}</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {tab === "home" && <HomeTab stats={stats} campaignStats={campaignStats} folders={folders} accounts={accounts} setTab={setTab} />}
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
            <div key={t.id} className={`flex flex-col items-center gap-1 cursor-pointer w-16 transition-colors ${isActive ? "text-[var(--accent)]" : "text-[var(--dim)] hover:text-white"}`} onClick={() => setTab(t.id as Tab)}>
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

// ================= TABS =================

function HomeTab({ stats, campaignStats, folders, accounts, setTab }: any) {
  const t = stats?.totals || {};
  
  return (
    <div className="space-y-6">
      {/* STATS GRID */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3">
            <TrendingUp size={20} />
          </div>
          <div className="text-3xl font-bold text-white">{Number(t.total) || 0}</div>
          <div className="text-[11px] text-[var(--dim)] mt-1 font-medium">Posts sent</div>
        </div>
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3">
            <CalendarClock size={20} />
          </div>
          <div className="text-3xl font-bold text-white">{campaignStats.activeSchedules}</div>
          <div className="text-[11px] text-[var(--dim)] mt-1 font-medium">Active schedules</div>
        </div>
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3">
            <Layers size={20} />
          </div>
          <div className="text-3xl font-bold text-white">{campaignStats.totalGroups}</div>
          <div className="text-[11px] text-[var(--dim)] mt-1 font-medium">Groups</div>
        </div>
        <div className="glass-card p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3">
            <Folder size={20} />
          </div>
          <div className="text-3xl font-bold text-white">{folders.length}</div>
          <div className="text-[11px] text-[var(--dim)] mt-1 font-medium">Folders</div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <h3 className="text-[11px] font-bold text-[var(--dim)] tracking-widest uppercase mb-3 ml-1">Quick Actions</h3>
        <div className="space-y-3">
          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => setTab("library")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,102,0.3)]">
              <FileText size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-bold">My Posts</div>
              <div className="text-xs text-[var(--dim)] mt-0.5">Create & manage posts with buttons</div>
            </div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>
          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => alert("Schedule configuration coming soon!")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,102,0.3)]">
              <CalendarClock size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-bold">New schedule</div>
              <div className="text-xs text-[var(--dim)] mt-0.5">Auto-post on a daily timer</div>
            </div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>
          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => setTab("broadcast")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,102,0.3)]">
              <Send size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-bold">Broadcast now</div>
              <div className="text-xs text-[var(--dim)] mt-0.5">Post once to your groups</div>
            </div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>
          <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => alert("Manage groups coming soon!")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,102,0.3)]">
              <Layers size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-bold">Manage groups</div>
              <div className="text-xs text-[var(--dim)] mt-0.5">Add chats to folders</div>
            </div>
            <ChevronRight size={20} className="text-[var(--dim)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Other Tabs (Dummy but styled)
function LibraryTab({ setTab }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">Library</h2>
      <div className="glass-card p-4 flex items-center gap-4 cursor-pointer" onClick={() => setTab("broadcast")}>
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]"><Send size={18} /></div>
        <div className="flex-1"><div className="text-white text-sm font-bold">Schedules</div><div className="text-xs text-[var(--dim)]">View active timers</div></div>
      </div>
    </div>
  );
}

function BroadcastTab({ accounts }: any) {
  return <div className="text-center mt-20 text-[var(--dim)]">Broadcast UI Loading...</div>;
}

function ChatsTab({ accounts }: any) {
  return <div className="text-center mt-20 text-[var(--dim)]">Chats UI Loading...</div>;
}

function MeTab({ me }: any) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6 text-center border-t-2 border-[var(--accent)]">
        <div className="w-20 h-20 rounded-full mx-auto bg-[#050505] border-2 border-[var(--accent)] flex items-center justify-center overflow-hidden mb-4 shadow-[0_0_20px_rgba(0,255,102,0.2)]">
          {me?.photo_url ? <img src={me.photo_url} alt="pic" className="w-full h-full object-cover" /> : <User size={32} className="text-[var(--accent)]" />}
        </div>
        <h2 className="text-xl font-bold text-white">{me?.first_name || me?.username || "User"}</h2>
        <p className="text-sm text-[var(--dim)] mt-1">@{me?.username || "unknown"}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-dim)] border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-bold">
          <span>👑</span> {me?.plan === "unverified" ? "No Premium" : me?.plan}
        </div>
      </div>
      <button className="w-full mt-4 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl py-3 font-semibold hover:bg-red-500/20 transition flex justify-center items-center gap-2" onClick={() => { clearLocal("session"); window.location.href = "/"; }}>
        Log out
      </button>
    </div>
  );
}
