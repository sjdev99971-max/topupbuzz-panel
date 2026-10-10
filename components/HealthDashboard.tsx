"use client";
import { useEffect, useState } from "react";
import { getHealthAccounts, runHealthCheck } from "@/lib/api";
import { toast } from "@/components/Toast";

export default function HealthDashboard() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);

  const load = () => {
    getHealthAccounts().then(setAccounts).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const check = async (id: string) => {
    setChecking(id);
    try {
      const r = await runHealthCheck(id);
      if (r.ok) toast(`✅ ${id.slice(0, 12)} — verified`, "success");
      else toast(`⚠ ${r.health}: ${r.error}`, "error");
      load();
    } catch { toast("Check failed", "error"); }
    setChecking(null);
  };

  if (loading) return <div className="text-xs text-[var(--dim)] p-6 text-center">Loading…</div>;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>🩺 Account Health</h3>
          <div className="sub">{accounts.length} accounts monitored</div>
        </div>
        <button onClick={load} className="btn btn-sm">↻</button>
      </div>
      <div className="card-body tight">
        {accounts.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--dim2)]">No accounts</div>
        ) : (
          <div className="space-y-2">
            {accounts.map((a: any) => {
              const successRate = a.total_sent > 0 ? (a.success / a.total_sent) * 100 : 0;
              const risk = successRate < 50 && a.total_sent > 5 ? "high"
                          : successRate < 80 && a.total_sent > 5 ? "medium" : "low";
              const riskColor = risk === "high" ? "var(--danger)" : risk === "medium" ? "var(--warning)" : "var(--success)";
              return (
                <div key={a.id} className="p-3 rounded-lg border border-[var(--border)] flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0"
                         style={{ background: riskColor, boxShadow: `0 0 8px ${riskColor}` }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate mono">{a.phone}</div>
                      <div className="text-[10px] text-[var(--dim2)]">
                        Last active: {a.last_active || "never"} · Floeds: {a.flood_count || 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`tag ${a.health === "Safe" ? "tag-ok" : "tag-err"}`}>{a.health}</span>
                    <span className={`tag tag-${risk === "high" ? "err" : risk === "medium" ? "warn" : "ok"}`}>
                      risk: {risk}
                    </span>
                    <span className="text-xs text-[var(--dim)]">
                      {a.sent_24h}/{(a.sent_24h || 0) + (a.fail_24h || 0)} (24h)
                    </span>
                    <button onClick={() => check(a.id)} disabled={checking === a.id}
                      className="btn btn-sm">
                      {checking === a.id ? "…" : "check"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
