"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, getMyAccounts, getFolders, getSavedPosts, getHealth, getLocal, saveLocal, clearLocal, getTelegramWebApp, telegramMiniAuth } from "@/lib/api";

type Tab = "home" | "library" | "broadcast" | "chats" | "me";

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");
  const [me, setMe] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
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
      const [accs, flds, psts] = await Promise.all([
        getMyAccounts().catch(() => []),
        getFolders().catch(() => []),
        getSavedPosts().catch(() => [])
      ]);
      setAccounts(accs);
      setFolders(flds);
      setPosts(psts);
    } catch {}
  }, []);

  useEffect(() => {
    if (ready) loadData();
  }, [ready, loadData]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-[var(--dim)]">Loading...</div>;

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] font-bold">T</div>
           <span className="font-semibold text-white">TopUpBuzz</span>
        </div>
        <div className="text-xs text-[var(--dim)]">{me?.username || 'User'}</div>
      </div>

      {/* MAIN CONTENT */}
      {tab === "home" && <HomeTab accounts={accounts} folders={folders} posts={posts} setTab={setTab} />}
      {tab === "library" && <LibraryTab posts={posts} folders={folders} setTab={setTab} />}
      {tab === "broadcast" && <BroadcastTab accounts={accounts} />}
      {tab === "chats" && <div className="text-center mt-20 text-[var(--dim)]">Chats Module Coming Soon</div>}
      {tab === "me" && <MeTab me={me} />}

      {/* BOTTOM NAV */}
      <div className="bottom-nav">
        {[
          { id: "home", icon: "◈", label: "Home" },
          { id: "library", icon: "|||", label: "Library" },
          { id: "broadcast", icon: "➤", label: "Broadcast" },
          { id: "chats", icon: "≡", label: "Chats" },
          { id: "me", icon: "●", label: "Me" }
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

function HomeTab({ accounts, folders, posts, setTab }: any) {
  return (
    <div className="space-y-6">
      {/* STATS GRID */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="icon-box mb-3 text-xl">📈</div>
          <div className="text-3xl font-bold text-white">0</div>
          <div className="text-xs text-[var(--dim)] mt-1">Posts sent</div>
        </div>
        <div className="card">
          <div className="icon-box mb-3 text-xl">⏱</div>
          <div className="text-3xl font-bold text-white">0</div>
          <div className="text-xs text-[var(--dim)] mt-1">Active schedules</div>
        </div>
        <div className="card">
          <div className="icon-box mb-3 text-xl">📚</div>
          <div className="text-3xl font-bold text-white">{accounts.length}</div>
          <div className="text-xs text-[var(--dim)] mt-1">Accounts</div>
        </div>
        <div className="card">
          <div className="icon-box mb-3 text-xl">📁</div>
          <div className="text-3xl font-bold text-white">{folders.length}</div>
          <div className="text-xs text-[var(--dim)] mt-1">Folders</div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <h3 className="text-xs font-bold text-[var(--dim)] tracking-widest uppercase mb-3">Quick Actions</h3>
        <div className="space-y-3">
          <div className="card flex items-center gap-4 cursor-pointer hover:border-[var(--accent)]" onClick={() => setTab("library")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black text-xl">📝</div>
            <div>
              <div className="text-white font-medium">My Posts</div>
              <div className="text-xs text-[var(--dim)]">Create & manage posts with buttons</div>
            </div>
          </div>
          <div className="card flex items-center gap-4 cursor-pointer hover:border-[var(--accent)]" onClick={() => setTab("broadcast")}>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-black text-xl">➤</div>
            <div>
              <div className="text-white font-medium">Broadcast now</div>
              <div className="text-xs text-[var(--dim)]">Post once to your groups</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LibraryTab({ posts, folders, setTab }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">Library</h2>
      <div className="space-y-3">
        <div className="card flex items-center gap-4" onClick={() => alert("Post manager coming soon")}>
          <div className="icon-box">📄</div>
          <div className="flex-1">
            <div className="text-white font-medium">My Posts</div>
            <div className="text-xs text-[var(--dim)]">Create & manage posts with buttons</div>
          </div>
          <span className="text-[var(--dim)]">›</span>
        </div>
        <div className="card flex items-center gap-4" onClick={() => setTab("broadcast")}>
          <div className="icon-box">📁</div>
          <div className="flex-1">
            <div className="text-white font-medium">My Folders</div>
            <div className="text-xs text-[var(--dim)]">Organise your groups into folders</div>
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
          <div key={i} className="card flex items-center gap-4 opacity-70">
            <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--dim)] text-xl">
              {i === 0 ? "✏️" : i === 1 ? "🔗" : "📄"}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">{item}</div>
              <div className="text-xs text-[var(--accent)]">Account required</div>
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
        <div className="w-20 h-20 rounded-full mx-auto bg-[var(--surface)] border-2 border-[var(--accent)] flex items-center justify-center overflow-hidden mb-4">
          {me?.photo_url ? <img src={me.photo_url} alt="pic" className="w-full h-full object-cover" /> : <span className="text-2xl text-[var(--accent)]">●</span>}
        </div>
        <h2 className="text-xl font-bold text-white">{me?.first_name || me?.username || "User"}</h2>
        <p className="text-sm text-[var(--dim)] mt-1">@{me?.username || "unknown"}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-[var(--accent)]/30 text-[var(--accent)] text-sm">
          <span>👑</span> {me?.plan === "unverified" ? "No Premium" : me?.plan}
        </div>
      </div>

      <div className="space-y-3">
        <div className="card flex items-center gap-4" onClick={() => alert("Premium page coming soon")}>
          <div className="icon-box">✨</div>
          <div className="flex-1">
            <div className="text-white font-medium">Get Premium</div>
            <div className="text-xs text-[var(--dim)]">Unlock all features</div>
          </div>
          <div className="text-[var(--accent)] font-bold text-sm bg-[var(--accent-dim)] px-3 py-1 rounded-full">🪙 0</div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="icon-box">🎁</div>
          <div className="flex-1">
            <div className="text-white font-medium">Refer & Earn</div>
            <div className="text-xs text-[var(--dim)]">Invite friends, earn coins</div>
          </div>
          <span className="text-[var(--dim)]">›</span>
        </div>
        <div className="card flex items-center gap-4">
          <div className="icon-box">⚙️</div>
          <div className="flex-1">
            <div className="text-white font-medium">Settings</div>
            <div className="text-xs text-[var(--dim)]">Timezone · Forward</div>
          </div>
          <span className="text-[var(--dim)]">›</span>
        </div>
      </div>

      <button className="btn-green w-full mt-4" onClick={() => { clearLocal("session"); window.location.href = "/"; }}>
        Log out
      </button>
    </div>
  );
}
