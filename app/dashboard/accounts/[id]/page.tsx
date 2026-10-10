"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import GroupPicker from "@/components/GroupPicker";
import { toast } from "@/components/Toast";
import { SkelList } from "@/components/Skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import {
  getAccount, getCampaign, saveCampaign, startCampaign, stopCampaign,
  refreshDialogs, getLogs, getLogsCsv, getLocal
} from "@/lib/api";

export default function AccountPage() {
  const router = useRouter();
  const params = useParams();
  const accId = String(params.id);

  const [account, setAccount] = useState<any>(null);
  const [dialogs, setDialogs] = useState<{groups: any[], channels: any[]}>({groups:[], channels:[]});
  const [loadingDlgs, setLoadingDlgs] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [source, setSource] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [intervalMin, setIntervalMin] = useState(5);
  const [status, setStatus] = useState("Stopped");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"setup" | "logs">("setup");

  useEffect(() => {
    if (!getLocal("session")) { router.push("/"); return; }
    (async () => {
      try {
        const [acc, camp] = await Promise.all([getAccount(accId), getCampaign(accId)]);
        setAccount(acc);
        setSource(camp.source || "");
        setSourceTitle(camp.source_title || "");
        setIntervalMin(camp.interval_min || 5);
        setStatus(camp.status || "Stopped");
        const grps = camp.groups_json || [];
        setSelected(Array.isArray(grps) ? grps.map((g: any) => g.id) : []);
      } catch {
        toast("account not found", "error");
        router.push("/dashboard");
      } finally { setLoading(false); }
    })();
  }, [accId, router]);

  const loadDialogs = async () => {
    setLoadingDlgs(true);
    try {
      const r = await refreshDialogs(accId);
      setDialogs({ groups: r.groups, channels: r.channels });
      toast(`loaded ${r.total} dialogs`, "success");
    } catch (e: any) {
      toast("failed to load: " + (e?.response?.data?.detail || e.message), "error");
    } finally { setLoadingDlgs(false); }
  };

  const loadLogs = useCallback(async () => {
    try { setLogs(await getLogs(accId, 100)); } catch {}
  }, [accId]);

  useEffect(() => {
    if (tab !== "logs") return;
    loadLogs();
    const i = setInterval(() => { loadLogs(); }, 5000);
    return () => clearInterval(i);
  }, [tab, loadLogs]);

  const allTargets = [...dialogs.groups, ...dialogs.channels];

  const save = async () => {
    setSaving(true);
    try {
      const chosen = allTargets.filter(g => selected.includes(g.id));
      await saveCampaign(accId, {
        source: source || null,
        source_title: sourceTitle,
        groups: chosen,
        interval_min: intervalMin,
      });
      toast(`saved — ${chosen.length} groups`, "success");
    } catch { toast("save failed", "error"); }
    setSaving(false);
  };

  const doStart = async () => {
    if (!source || !source.trim()) {
      toast("Set source channel first", "error");
      return;
    }
    if (selected.length === 0) {
      toast("Select at least one group", "error");
      return;
    }
    try {
      // Auto-save before start
      await save();
      await startCampaign(accId);
      setStatus("Running");
      toast("Campaign started 🚀", "success");
    } catch (e: any) {
      toast("Start failed: " + (e?.response?.data?.detail || e.message), "error");
    }
  };

  const doStop = async () => {
    try {
      await stopCampaign(accId);
      setStatus("Stopped");
      toast("campaign stopped", "info");
    } catch { toast("stop failed", "error"); }
  };

  if (loading) return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <SkelList count={4} />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="text-[var(--dim)] hover:text-[var(--blue)] text-sm">←</Link>
            <span className="text-[var(--blue)]">◈</span>
            <div className="min-w-0">
              <div className="text-sm truncate">{account?.phone}</div>
              <div className="text-[10px] text-[var(--dim2)] truncate">{accId}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`tag ${status === "Running" ? "tag-ok" : "tag-neutral"}`}>{status}</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => setTab("setup")} className={`btn btn-sm ${tab === "setup" ? "btn-primary" : ""}`}>setup</button>
          <button onClick={() => setTab("logs")} className={`btn btn-sm ${tab === "logs" ? "btn-primary" : ""}`}>logs</button>
        </div>

        {tab === "setup" && (
          <div className="space-y-4">
            {/* ACTIONS BAR */}
            <div className="flex items-center gap-2 flex-wrap">
              {status === "Stopped" ? (
                <button onClick={doStart} className="btn btn-success">▶ start campaign</button>
              ) : (
                <button onClick={doStop} className="btn btn-danger">⏹ stop</button>
              )}
              <button onClick={save} disabled={saving} className="btn btn-primary">
                {saving ? "saving…" : "💾 save"}
              </button>
              <span className="text-xs text-[var(--dim)] ml-auto">
                {selected.length} groups selected
              </span>
            </div>

            {/* SOURCE */}
            <div className="card corner p-5">
              <h3 className="text-sm mb-3"><span className="text-[var(--dim)]">&gt;</span> source channel</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="inp text-xs" placeholder="channel id / username (e.g. @mychannel or -100xxx)"
                  value={source} onChange={e => setSource(e.target.value)} />
                <input className="inp text-xs" placeholder="display title (optional)"
                  value={sourceTitle} onChange={e => setSourceTitle(e.target.value)} />
              </div>
              <p className="text-[10px] text-[var(--dim2)] mt-2">
                Source channel থেকে message নিয়ে groups-এ পাঠানো হবে। আপনার account অবশ্যই source-এ joined থাকতে হবে।
              </p>
            </div>

            {/* INTERVAL */}
            <div className="card corner p-5">
              <h3 className="text-sm mb-3"><span className="text-[var(--dim)]">&gt;</span> interval</h3>
              <div className="flex items-center gap-3 flex-wrap">
                {[5, 10, 15, 30, 60].map(v => (
                  <button key={v} onClick={() => setIntervalMin(v)}
                    className={`btn btn-sm ${intervalMin === v ? "btn-primary" : ""}`}>{v}m</button>
                ))}
                <input type="number" min={1} max={1440} value={intervalMin}
                  onChange={e => setIntervalMin(+e.target.value)}
                  className="inp text-xs py-1.5 max-w-[100px]" />
                <span className="text-xs text-[var(--dim)]">minutes</span>
              </div>
              <p className="text-[10px] text-[var(--dim2)] mt-2">
                প্রতি {intervalMin} মিনিট পর পর selected সব groups-এ একসাথে message পাঠানো হবে।
              </p>
            </div>

            {/* GROUPS */}
            <div className="card corner p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-sm"><span className="text-[var(--dim)]">&gt;</span> target groups</h3>
                <button onClick={loadDialogs} disabled={loadingDlgs} className="btn btn-sm btn-primary">
                  {loadingDlgs ? "loading…" : "↻ load from telegram"}
                </button>
              </div>

              {allTargets.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--dim2)]">
                  // click "load from telegram" to fetch your groups & channels
                </div>
              ) : (
                <GroupPicker groups={allTargets} selected={selected} onChange={setSelected} />
              )}
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm"><span className="text-[var(--dim)]">&gt;</span> broadcast logs</h3>
              <div className="flex gap-2">
                <button onClick={loadLogs} className="btn btn-sm">↻ refresh</button>
                <a href={getLogsCsv(accId)} className="btn btn-sm" download>⬇ csv</a>
              </div>
            </div>
            <div className="card p-4 bg-black/20 max-h-[70vh] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center text-xs text-[var(--dim2)] py-8">// no logs yet</div>
              ) : (
                <div className="space-y-1 text-xs">
                  {logs.map((l: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)]/40 last:border-0">
                      <span className="text-[var(--dim2)] w-36 shrink-0 truncate">{l.ts}</span>
                      <span className={`tag shrink-0 ${l.status?.startsWith("success") ? "tag-ok" : "tag-err"}`}>
                        {l.status?.split(":")[0] || "?"}
                      </span>
                      <span className="truncate">{l.group_title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-[var(--border)] px-4 md:px-6 py-3 text-[10px] text-[var(--dim2)] flex justify-between">
        <span>topupbuzz // campaign editor</span>
        <Link href="/dashboard" className="hover:text-[var(--blue)]">← dashboard</Link>
      </footer>
    </div>
  );
}
