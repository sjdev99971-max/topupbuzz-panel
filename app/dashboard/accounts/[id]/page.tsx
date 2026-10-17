"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import GroupPicker from "@/components/GroupPicker";
import { toast } from "@/components/Toast";
import { SkelList } from "@/components/Skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import ConfirmDialog from "@/components/ConfirmDialog";
import WebhooksPanel from "@/components/WebhooksPanel";
import {
  getAccount, getCampaign, saveCampaign, startCampaign, stopCampaign,
  refreshDialogs, getLogs, getLogsCsv, getLocal, getAccountStats,
  retryFailed, scheduleCampaign, unscheduleCampaign, pauseCampaign, resumeCampaign
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
  const [sourceType, setSourceType] = useState("channel");
  const [activeHoursStart, setActiveHoursStart] = useState(0);
  const [activeHoursEnd, setActiveHoursEnd] = useState(23);
  const [intervalMin, setIntervalMin] = useState(5);
  const [mode, setMode] = useState<"copy" | "forward">("copy");
  const [status, setStatus] = useState("Stopped");
  const [paused, setPaused] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [tab, setTab] = useState<"setup" | "logs" | "stats">("setup");
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    if (!getLocal("session")) { router.push("/"); return; }
    (async () => {
      try {
        const [acc, camp, st] = await Promise.all([
          getAccount(accId), getCampaign(accId), getAccountStats(accId).catch(() => null)
        ]);
        setAccount(acc);
        setSource(camp.source || "");
        setSourceTitle(camp.source_title || "");
        setIntervalMin(camp.interval_min || 5);
        setStatus(camp.status || "Stopped");
        setPaused(!!camp.paused);
        setMode((camp.mode as any) || "copy");
        setScheduledAt(camp.scheduled_at || 0);
        const grps = camp.groups_json || [];
        setSelected(Array.isArray(grps) ? grps.map((g: any) => g.id) : []);
        setStats(st);
      } catch {
        toast("Account not found", "error");
        router.push("/dashboard");
      } finally { setLoading(false); }
    })();
  }, [accId, router]);

  const loadDialogs = async () => {
    setLoadingDlgs(true);
    try {
      const r = await refreshDialogs(accId);
      setDialogs({ groups: r.groups, channels: r.channels });
      toast(`Loaded ${r.total} dialogs`, "success");
    } catch (e: any) {
      toast("Failed: " + (e?.response?.data?.detail || e.message), "error");
    } finally { setLoadingDlgs(false); }
  };

  const loadLogs = useCallback(async () => {
    try { setLogs(await getLogs(accId, 100)); } catch {}
  }, [accId]);

  const loadStats = useCallback(async () => {
    try { setStats(await getAccountStats(accId)); } catch {}
  }, [accId]);

  useEffect(() => {
    if (tab === "logs") loadLogs();
    if (tab === "stats") loadStats();
    // Polling removed; user can manually refresh
  }, [tab, loadLogs, loadStats]);

  const allTargets = [...dialogs.groups, ...dialogs.channels];

  const save = async () => {
    setSaving(true);
    try {
      const chosen = allTargets.filter(g => selected.includes(g.id));
      const res = await saveCampaign(accId, {
        source: source || null,
        source_title: sourceTitle,
        active_hours_start: activeHoursStart,
        active_hours_end: activeHoursEnd,
        groups: chosen,
        interval_min: intervalMin,
        mode: mode,
      });
      toast(`Saved · ${res.group_count || chosen.length} groups`, "success");
    } catch (e: any) {
      toast("Save failed: " + (e?.response?.data?.detail || e.message), "error");
    }
    setSaving(false);
  };

  const doStart = async () => {
    if (!source?.trim()) { toast("Set source channel first", "error"); return; }
    if (selected.length === 0) { toast("Select at least one group", "error"); return; }
    try {
      await save();
      await startCampaign(accId);
      setStatus("Running");
      toast("Campaign started 🚀", "success");
    } catch (e: any) {
      toast("Start failed: " + (e?.response?.data?.detail || e.message), "error");
    }
  };

  const doPause = async () => {
    try {
      await pauseCampaign(accId);
      setPaused(true);
      toast("Campaign paused", "info");
    } catch { toast("Pause failed", "error"); }
  };

  const doResume = async () => {
    try {
      await resumeCampaign(accId);
      setPaused(false);
      toast("Campaign resumed 🚀", "success");
    } catch { toast("Resume failed", "error"); }
  };

  const doStop = async () => {
    try {
      await stopCampaign(accId);
      setStatus("Stopped");
      setConfirmStop(false);
      toast("Campaign stopped", "info");
    } catch { toast("Stop failed", "error"); }
  };

  const doRetry = async () => {
    setRetrying(true);
    try {
      const r = await retryFailed(accId);
      toast(`Retried ${r.retried} groups · ${r.success || 0} sent`, "success");
      if (tab === "logs") loadLogs();
    } catch (e: any) {
      toast("Retry failed: " + (e?.response?.data?.detail || e.message), "error");
    }
    setRetrying(false);
  };

  const doSchedule = async (minutes: number) => {
    try {
      const ts = Math.floor(Date.now() / 1000) + minutes * 60;
      await scheduleCampaign(accId, ts);
      setScheduledAt(ts);
      setStatus("Scheduled");
      toast(`Will start in ${minutes} min`, "success");
    } catch { toast("Schedule failed", "error"); }
  };

  const doUnschedule = async () => {
    try {
      await unscheduleCampaign(accId);
      setScheduledAt(0);
      setStatus("Stopped");
      toast("Unscheduled", "info");
    } catch { toast("Failed", "error"); }
  };

  if (loading) return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <SkelList count={4} />
    </div>
  );

  const t = stats?.totals || {};
  const success = Number(t.success) || 0;
  const failed = Number(t.failed) || 0;
  const totalMsgs = Number(t.total) || 0;
  const rate = totalMsgs ? (success / totalMsgs) * 100 : 0;

  const formatHour = (h: number) => {
    if (h === 0) return "12:00 AM";
    if (h === 12) return "12:00 PM";
    return h < 12 ? `${h.toString().padStart(2, '0')}:00 AM` : `${h - 12}:00 PM`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-lg">
        <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="btn btn-sm btn-ghost">←</Link>
            <div className="w-8 h-8 rounded-lg bg-[var(--surface3)] flex items-center justify-center text-[var(--accent)] shrink-0">▤</div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate mono">{account?.phone}</div>
              <div className="text-[10px] text-[var(--dim2)] truncate mono">{accId}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {paused && <span className="tag tag-warn">⏸ PAUSED</span>}
            <span className={`tag ${status === "Running" ? "tag-ok" : status === "Scheduled" ? "tag-warn" : status === "Error" ? "tag-err" : "tag-neutral"}`}>
              {status}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">
        {/* TABS */}
        <div className="pill-group mb-5">
          <button className={tab === "setup" ? "active" : ""} onClick={() => setTab("setup")}>⚙ Setup</button>
          <button className={tab === "stats" ? "active" : ""} onClick={() => setTab("stats")}>◉ Stats</button>
          <button className={tab === "logs" ? "active" : ""} onClick={() => setTab("logs")}>▤ Logs</button>
        </div>

        {tab === "setup" && (
          <div className="space-y-4">
            {/* QUICK STATS */}
            <div className="grid grid-cols-3 gap-3">
              <div className="stat">
                <div className="stat-label">Sent</div>
                <div className="stat-value">{totalMsgs.toLocaleString()}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Success</div>
                <div className="stat-value text-[var(--success)]">{success.toLocaleString()}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Failed</div>
                <div className="stat-value text-[var(--danger)]">{failed.toLocaleString()}</div>
              </div>
            </div>

            {/* ACTIONS BAR */}
            <div className="card p-4">
              <div className="flex items-center gap-2 flex-wrap">
                {status === "Stopped" || status === "Error" || status === "Scheduled" ? (
                  <button onClick={doStart} className="btn btn-success">
                    ▶ {status === "Scheduled" ? "Start Now" : "Start"}
                  </button>
                ) : paused ? (
                  <button onClick={doResume} className="btn btn-success">▶ Resume</button>
                ) : (
                  <>
                    <button onClick={doPause} className="btn">⏸ Pause</button>
                    <button onClick={() => setConfirmStop(true)} className="btn btn-danger">⏹ Stop</button>
                  </>
                )}
                <button onClick={save} disabled={saving} className="btn btn-primary">
                  {saving ? "Saving…" : "💾 Save"}
                </button>
                {failed > 0 && (
                  <button onClick={doRetry} disabled={retrying} className="btn">
                    {retrying ? "Retrying…" : `↻ Retry Failed (${failed})`}
                  </button>
                )}
                <div className="flex-1" />
                <span className="text-xs text-[var(--dim)]">
                  {selected.length} groups selected
                </span>
              </div>
            </div>

            {/* SCHEDULE */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>⏰ Schedule Start</h3>
                  <div className="sub">Auto-start campaign after delay</div>
                </div>
                {scheduledAt > 0 && (
                  <button onClick={doUnschedule} className="btn btn-sm btn-danger">Cancel</button>
                )}
              </div>
              <div className="card-body tight">
                {scheduledAt > 0 ? (
                  <div className="p-3 rounded-lg bg-[var(--warning)]/5 border border-[var(--warning)]/30 text-sm">
                    <div className="text-[var(--warning)] font-semibold">
                      Scheduled: {new Date(scheduledAt * 1000).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {[5, 30, 60, 120, 360, 1440].map(m => (
                      <button key={m} onClick={() => doSchedule(m)} className="btn btn-sm">
                        {m >= 1440 ? `${m/1440}d` : m >= 60 ? `${m/60}h` : `${m}m`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* POST MODE */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>📤 Post Mode</h3>
                  <div className="sub">How messages are delivered</div>
                </div>
              </div>
              <div className="card-body tight">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setMode("copy")}
                    className={`p-4 rounded-lg border-2 text-left transition ${mode === "copy" ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border2)] hover:border-[var(--dim)]"}`}>
                    <div className="text-xl mb-1">📋</div>
                    <div className="text-sm font-semibold mb-1">Copy & Post</div>
                    <div className="text-[11px] text-[var(--dim)] leading-snug">
                      Clean copy — no "Forwarded from" tag.
                    </div>
                    {mode === "copy" && <div className="text-[10px] text-[var(--accent)] mt-2 font-bold">● SELECTED</div>}
                  </button>
                  <button onClick={() => setMode("forward")}
                    className={`p-4 rounded-lg border-2 text-left transition ${mode === "forward" ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border2)] hover:border-[var(--dim)]"}`}>
                    <div className="text-xl mb-1">↪</div>
                    <div className="text-sm font-semibold mb-1">Forward</div>
                    <div className="text-[11px] text-[var(--dim)] leading-snug">
                      Preserves source attribution.
                    </div>
                    {mode === "forward" && <div className="text-[10px] text-[var(--accent)] mt-2 font-bold">● SELECTED</div>}
                  </button>
                </div>
              </div>
            </div>

            {/* WEBHOOKS */}
            <WebhooksPanel />

            {/* SOURCE */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>📡 Source Channel</h3>
                  <div className="sub">Where messages come from</div>
                </div>
              </div>
              <div className="card-body tight space-y-3">
                <input className="inp text-xs mono"
                  placeholder="@channel_username or https://t.me/+invite"
                  value={source} onChange={e => setSource(e.target.value)} />
                <input className="inp text-xs"
                  placeholder="Display title (optional)"
                  value={sourceTitle} onChange={e => setSourceTitle(e.target.value)} />
                <p className="text-[10px] text-[var(--dim2)]">
                  💡 Use <b>@username</b> for public channels. Your account must have joined the source.
                </p>
              </div>
            </div>

            {/* INTERVAL */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>⏱ Interval</h3>
                  <div className="sub">Time between each blast</div>
                </div>
              </div>
              <div className="card-body tight">
                <div className="flex items-center gap-2 flex-wrap">
                  {[1, 5, 10, 15, 30, 60].map(v => (
                    <button key={v} onClick={() => setIntervalMin(v)}
                      className={`btn btn-sm ${intervalMin === v ? "btn-primary" : ""}`}>{v}m</button>
                  ))}
                  <input type="number" min={1} max={1440} value={intervalMin}
                    onChange={e => setIntervalMin(+e.target.value)}
                    className="inp text-xs py-1.5 max-w-[80px]" />
                  <span className="text-xs text-[var(--dim)]">min</span>
                </div>
                <p className="text-[10px] text-[var(--dim2)] mt-3">
                  সব groups-এ <b>একসাথে</b> পাঠানো হবে প্রতি {intervalMin} মিনিটে।
                </p>
              </div>
            </div>

            {/* ACTIVE HOURS */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>🕒 Active Hours (Sleep Mode)</h3>
                  <div className="sub">Time of day to send posts</div>
                </div>
              </div>
              <div className="card-body tight">
                <div className="flex items-center gap-2">
                  <select value={activeHoursStart} onChange={e => setActiveHoursStart(+e.target.value)} className="inp text-xs py-1.5 flex-1">
                    {Array.from({length: 24}).map((_, i) => (
                      <option key={i} value={i}>{formatHour(i)}</option>
                    ))}
                  </select>
                  <span className="text-xs">to</span>
                  <select value={activeHoursEnd} onChange={e => setActiveHoursEnd(+e.target.value)} className="inp text-xs py-1.5 flex-1">
                    {Array.from({length: 24}).map((_, i) => (
                      <option key={i} value={i}>{formatHour(i)}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-[var(--dim2)] mt-3">
                  Example: <b>09:00 AM to 11:00 PM</b> means bot will only post during the daytime.
                </p>
              </div>
            </div>

            {/* GROUPS */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>🎯 Target Groups</h3>
                  <div className="sub">{selected.length} selected</div>
                </div>
                <button onClick={loadDialogs} disabled={loadingDlgs} className="btn btn-sm btn-primary">
                  {loadingDlgs ? "Loading…" : "↻ Load from Telegram"}
                </button>
              </div>
              <div className="card-body tight">
                {allTargets.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-3xl opacity-30 mb-3">🎯</div>
                    <div className="text-xs text-[var(--dim)] mb-1">No groups loaded</div>
                    <div className="text-[10px] text-[var(--dim2)]">Click "Load from Telegram" to fetch</div>
                  </div>
                ) : (
                  <GroupPicker groups={allTargets} selected={selected} onChange={setSelected} />
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "stats" && (
          <div className="fade space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat">
                <div className="stat-icon">📤</div>
                <div className="stat-label">Total Sent</div>
                <div className="stat-value">{totalMsgs.toLocaleString()}</div>
              </div>
              <div className="stat">
                <div className="stat-icon" style={{color:"var(--success)"}}>✓</div>
                <div className="stat-label">Success</div>
                <div className="stat-value text-[var(--success)]">{success.toLocaleString()}</div>
              </div>
              <div className="stat">
                <div className="stat-icon" style={{color:"var(--danger)"}}>✕</div>
                <div className="stat-label">Failed</div>
                <div className="stat-value text-[var(--danger)]">{failed.toLocaleString()}</div>
              </div>
              <div className="stat">
                <div className="stat-icon">%</div>
                <div className="stat-label">Success Rate</div>
                <div className="stat-value" style={{color: rate >= 90 ? "var(--success)" : rate >= 70 ? "var(--warning)" : "var(--danger)"}}>
                  {rate.toFixed(1)}%
                </div>
              </div>
            </div>

            {stats?.daily?.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3>Activity (7 days)</h3>
                    <div className="sub">Success vs failed per day</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--dim)]">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--success)]"/> Success</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--danger)]"/> Failed</span>
                  </div>
                </div>
                <div className="card-body tight">
                  <ChartBars daily={stats.daily} />
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold">Broadcast Logs</h3>
                <div className="text-xs text-[var(--dim)]">{logs.length} entries · auto-refresh 5s</div>
              </div>
              <div className="flex gap-2">
                <button onClick={loadLogs} className="btn btn-sm">↻ Refresh</button>
                <button onClick={doRetry} disabled={retrying} className="btn btn-sm">
                  {retrying ? "…" : "↻ Retry Failed"}
                </button>
                <a href={getLogsCsv(accId)} className="btn btn-sm" download>⬇ CSV</a>
              </div>
            </div>
            <div className="card p-0 overflow-hidden">
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-3xl opacity-30 mb-2">▤</div>
                  <div className="text-xs text-[var(--dim)]">No logs yet</div>
                </div>
              ) : (
                <div className="max-h-[70vh] overflow-y-auto">
                  {logs.map((l: any, i: number) => {
                    const ok = l.status?.startsWith("success");
                    const formatHour = (h: number) => {
    if (h === 0) return "12:00 AM";
    if (h === 12) return "12:00 PM";
    return h < 12 ? `${h.toString().padStart(2, '0')}:00 AM` : `${h - 12}:00 PM`;
  };

  return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--surface2)]/50">
                        <span className={`tag shrink-0 ${ok ? "tag-ok" : "tag-err"}`}>
                          {ok ? "✓" : "✕"}
                        </span>
                        <span className="text-[11px] text-[var(--dim2)] w-32 shrink-0 mono truncate">{l.ts}</span>
                        <span className="text-sm flex-1 truncate">{l.group_title}</span>
                        <span className={`text-[10px] ${ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                          {l.status?.split(":")[1]?.slice(0, 30) || l.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmStop}
        title="Stop campaign?"
        message="Current blast cycle will be interrupted."
        danger
        onCancel={() => setConfirmStop(false)}
        onConfirm={doStop}
      />
    </div>
  );
}

function ChartBars({ daily }: any) {
  const max = Math.max(1, ...daily.map((d: any) => (Number(d.success)||0) + (Number(d.failed)||0)));
  const formatHour = (h: number) => {
    if (h === 0) return "12:00 AM";
    if (h === 12) return "12:00 PM";
    return h < 12 ? `${h.toString().padStart(2, '0')}:00 AM` : `${h - 12}:00 PM`;
  };

  return (
    <div className="chart-bars">
      {daily.map((d: any, i: number) => {
        const s = Number(d.success) || 0;
        const f = Number(d.failed) || 0;
        const sH = (s / max) * 100;
        const fH = (f / max) * 100;
        const formatHour = (h: number) => {
    if (h === 0) return "12:00 AM";
    if (h === 12) return "12:00 PM";
    return h < 12 ? `${h.toString().padStart(2, '0')}:00 AM` : `${h - 12}:00 PM`;
  };

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
