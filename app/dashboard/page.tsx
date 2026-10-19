"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  getMe, getAccounts, getMyStats, getCampaign, getLocal, saveLocal, clearLocal, 
  getTelegramWebApp, telegramMiniAuth, refreshDialogs, getSavedPosts, createSavedPost 
} from "@/lib/api";

type Tab = "home" | "broadcast" | "chats" | "configure";

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");
  const [me, setMe] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
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
      const [accs, sts, m] = await Promise.all([getAccounts().catch(() => []), getMyStats().catch(() => null), getMe().catch(() => null)]);
      if (m) { setMe(m); saveLocal("session", m); }
      setAccounts(accs); setStats(sts);
    } catch {}
  }, []);

  useEffect(() => { if (ready) loadData(); }, [ready, loadData]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">Loading...</div>;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 bg-[#050505] text-white font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 glass-card p-4">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-black font-bold">T</div>
           <span className="font-semibold text-white">TopUpBuzz</span>
        </div>
        <div className="flex items-center gap-2">
          {me?.is_admin && <Link href="/admin" className="text-xs bg-[var(--accent)] text-black px-3 py-1 rounded-full font-bold">Admin</Link>}
          <div className="text-xs text-[var(--dim)]">@{me?.username || 'User'}</div>
        </div>
      </div>

      {tab === "home" && <HomeTab stats={stats} accounts={accounts} setTab={setTab} />}
      {tab === "broadcast" && <BroadcastTab accounts={accounts} />}
      {tab === "chats" && <ChatsTab accounts={accounts} />}
      {tab === "configure" && <ConfigureTab accounts={accounts} />}

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0f0f11]/80 backdrop-blur-xl border-t border-[#1f1f22] flex justify-around py-3 pb-6 z-50">
        {[
          { id: "home", icon: "◈", label: "Home" },
          { id: "broadcast", icon: "➤", label: "Broadcast" },
          { id: "chats", icon: "💬", label: "Chats" },
          { id: "configure", icon: "⚙️", label: "Configure" }
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
function HomeTab({ stats, accounts, setTab }: any) {
  const t = stats?.totals || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4"><div className="text-3xl font-bold text-[var(--accent)]">{Number(t.total) || 0}</div><div className="text-xs text-[var(--dim)] mt-1">Posts sent</div></div>
        <div className="glass-card p-4"><div className="text-3xl font-bold text-white">{accounts.length}</div><div className="text-xs text-[var(--dim)] mt-1">Accounts</div></div>
      </div>
      <div className="glass-card p-4 flex items-center justify-between" onClick={() => setTab("broadcast")}>
        <div className="text-sm font-medium">Start Campaign</div><div className="text-[var(--accent)]">➤</div>
      </div>
      <div className="glass-card p-4 flex items-center justify-between" onClick={() => setTab("configure")}>
        <div className="text-sm font-medium">Import Schedule</div><div className="text-[var(--accent)]">⚙️</div>
      </div>
    </div>
  );
}

function BroadcastTab({ accounts }: any) {
  const [selectedAcc, setSelectedAcc] = useState("");
  const [dialogs, setDialogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGroups = async (accId: string) => {
    setSelectedAcc(accId); if (!accId) return;
    setLoading(true);
    try { const res = await refreshDialogs(accId); setDialogs([...(res.groups||[]), ...(res.channels||[])]); } catch { alert("Failed to load."); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Broadcast</h2>
      <div className="glass-card p-4">
        <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-3 text-sm text-white" value={selectedAcc} onChange={e => loadGroups(e.target.value)}>
          <option value="">-- Select Account --</option>
          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.phone}</option>)}
        </select>
      </div>
      <div className="glass-card p-4 text-center text-[var(--dim)]">Select account to load groups.</div>
    </div>
  );
}

function ChatsTab({ accounts }: any) {
  return <div className="text-center mt-10 text-[var(--dim)]">Chats module coming soon...</div>;
}

function ConfigureTab({ accounts }: any) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [channelLink, setChannelLink] = useState("");

  useEffect(() => { getSavedPosts().then(setTemplates).catch(() => {}); }, []);

  const importFromChannel = () => {
    if (!channelLink) return alert("Enter channel link");
    alert("Channel import logic will connect to backend API.");
    setChannelLink("");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Configure</h2>
      
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-[var(--accent)]">Import Template</h3>
        <input type="text" placeholder="@channel or https://t.me/..." value={channelLink} onChange={e => setChannelLink(e.target.value)} className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-2 text-sm text-white" />
        <button onClick={importFromChannel} className="w-full bg-[var(--accent)] text-black py-2 rounded-xl text-sm font-bold">Import From Channel</button>
      </div>

      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-[var(--accent)]">Schedule From Template</h3>
        <select className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-2 text-sm text-white">
          <option value="">-- Select Template --</option>
          {templates.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <button className="w-full bg-white/10 text-white py-2 rounded-xl text-sm font-bold">Schedule Now</button>
      </div>

      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-[var(--accent)]">Multiple Post Schedule</h3>
        <textarea placeholder="Paste multiple links (1 per line)..." className="w-full bg-[#050505] border border-[#1f1f22] rounded-xl px-4 py-2 text-sm text-white min-h-[80px]" />
        <button className="w-full bg-white/10 text-white py-2 rounded-xl text-sm font-bold">Schedule All</button>
      </div>
    </div>
  );
}
