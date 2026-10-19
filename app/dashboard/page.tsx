"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  getMe, getAccounts, getMyStats, getFolders, getCampaign,
  getLocal, saveLocal, clearLocal, getTelegramWebApp, telegramMiniAuth 
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

      // Calculate Schedules & Groups from campaigns
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

    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (ready) loadData();
  }, [ready, loadData]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-[var(--dim)]">Loading...</div>;

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
      {tab === "home" && <HomeTab stats={stats} campaignStats={campaignStats} folders={folders} accounts={accounts} setTab={setTab} />}
      {tab === "library" && <LibraryTab setTab={setTab} />}
      {tab === "broadcast" && <BroadcastTab accounts={accounts} />}
      {tab === "chats" && <div className="text-center mt-20 text-[var(--dim)]">Chats Module Coming Soon</div>}
      {tab === "me" && <MeTab me={me} />}

      {/* BOTTOM NAV */}
      <div className="bottom-nav fixed bottom-0 left-0 right-0 bg-[#0f0f11]/90 backdrop-blur-md border-t border-[var(--border)] flex justify-around py-3 pb-6 z-50">
        {[
          { id: "home", icon: "◈", label: "Home" },
          { id: "library", icon: "|||", label: "Library" },
          { id: "broadcast", icon: "➤", label: "Broadcast" },
          { id: "chats", icon: "≡", label: "Chats" },
          { id: "me", icon: "●", label: "Me" }
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

function HomeTab({ stats, campaignStats, folders, accounts, setTab }: any) {
  const t = stats?.totals || {};
  const totalPosts = Number(t.total) || 0;
  
  return (
    <div className="space-y-6">
      {/* STATS GRID */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] mb-3 text-lg">📈</div>
          <div className="text-3xl font-bold text-white">{totalPosts}</div>
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

      {/* QUICK ACTIONS */}
      <div>
        <h3 className="text-[11px] font-bold text-[var(--dim)] tracking-widest uppercase mb-3">Quick Actions</h3>
        <div className="space-y-3">
          <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[var(--accent)] transition" onClick={() => alert("Post Manager coming soon")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black text-xl">📝</div>
            <div className="flex-1">
              <div className="text-white text-sm font-medium">My Posts</div>
              <div className="text-xs text-[var(--dim)]">Create & manage posts with buttons</div>
            </div>
            <span className="text-[var(--dim)]">›</span>
          </div>
          <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[var(--accent)] transition" onClick={() => setTab("broadcast")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black text-xl">➤</div>
            <div className="flex-1">
              <div className="text-white text-sm font-medium">Broadcast now</div>
              <div className="text-xs text-[var(--dim)]">Post once to your groups</div>
            </div>
            <span className="text-[var(--dim)]">›</span>
          </div>
          <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[var(--accent)] transition" onClick={() => alert("Folder manager coming soon")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black text-xl">📂</div>
            <div className="flex-1">
              <div className="text-white text-sm font-medium">Manage groups</div>
              <div className="text-xs text-[var(--dim)]">Add chats to folders</div>
            </div>
            <span className="text-[var(--dim)]">›</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LibraryTab({ setTab }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">Library</h2>
      <div className="space-y-3">
        <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] text-xl">📄</div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium">My Posts</div>
            <div className="text-xs text-[var(--dim)]">Create & manage posts</div>
          </div>
          <span className="text-[var(--dim)]">›</span>
        </div>
        <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] text-xl">📁</div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium">My Folders</div>
            <div className="text-xs text-[var(--dim)]">Organise your groups</div>
          </div>
          <span className="text-[var(--dim)]">›</span>
        </div>
        <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] text-xl">⏱</div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium">Schedule</div>
            <div className="text-xs text-[var(--dim)]">Auto-post on a daily timer</div>
          </div>
          <span className="text-[var(--dim)]">›</span>
        </div>
      </div>
    </div>
  );
}

function BroadcastTab({ accounts }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-2">Broadcast</h2>
      <p className="text-sm text-[var(--dim)] mb-6">Post a message once to your groups, right now.</p>
      
      <div className="space-y-3">
        {["Write now", "Source link", "My Posts"].map((item, i) => (
          <div key={i} className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4 opacity-70">
            <div className="w-12 h-12 rounded-full bg-[#050505] border border-[#1f1f22] flex items-center justify-center text-[var(--dim)] text-xl">
              {i === 0 ? "✏️" : i === 1 ? "🔗" : "📄"}
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-medium">{item}</div>
              <div className="text-xs text-[var(--accent)] font-medium mt-0.5">Account required</div>
            </div>
            <span className="text-[var(--dim)]">🔒</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeTab({ me }: any) {
  return (
    <div className="space-y-6">
      {/* PROFILE CARD */}
      <div className="rounded-2xl p-6 text-center" style={{ background: "linear-gradient(180deg, var(--accent-dim) 0%, transparent 100%)", border: "1px solid var(--accent)" }}>
        <div className="w-20 h-20 rounded-full mx-auto bg-[#050505] border-2 border-[var(--accent)] flex items-center justify-center overflow-hidden mb-4">
          {me?.photo_url ? <img src={me.photo_url} alt="pic" className="w-full h-full object-cover" /> : <span className="text-2xl text-[var(--accent)]">●</span>}
        </div>
        <h2 className="text-xl font-bold text-white">{me?.first_name || me?.username || "User"}</h2>
        <p className="text-sm text-[var(--dim)] mt-1">@{me?.username || "unknown"}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-medium">
          <span>👑</span> {me?.plan === "unverified" ? "No Premium" : me?.plan}
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]">✨</div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium">Get Premium</div>
            <div className="text-xs text-[var(--dim)]">Unlock all features</div>
          </div>
          <div className="text-[var(--accent)] font-bold text-xs bg-[var(--accent-dim)] px-3 py-1 rounded-full">🪙 0</div>
        </div>
        <div className="bg-[#0f0f11] border border-[#1f1f22] rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]">🎁</div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium">Refer & Earn</div>
            <div className="text-xs text-[var(--dim)]">Invite friends, earn coins</div>
          </div>
          <span className="text-[var(--dim)]">›</span>
        </div>
      </div>

      <button className="w-full mt-4 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl py-3 font-semibold hover:bg-red-500/20 transition" onClick={() => { clearLocal("session"); window.location.href = "/"; }}>
        Log out
      </button>
    </div>
  );
}
