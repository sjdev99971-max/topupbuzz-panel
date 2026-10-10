"use client";
import { useEffect, useState } from "react";
import { getAnalyticsGroups, getAnalyticsHours, getAnalyticsCost } from "@/lib/api";

export default function AnalyticsPanel() {
  const [groups, setGroups] = useState<any>(null);
  const [hours, setHours] = useState<any>(null);
  const [cost, setCost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getAnalyticsGroups(), getAnalyticsHours(), getAnalyticsCost()
    ]).then(([g, h, c]) => {
      if (g.status === "fulfilled") setGroups(g.value);
      if (h.status === "fulfilled") setHours(h.value);
      if (c.status === "fulfilled") setCost(c.value);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-xs text-[var(--dim)] p-6 text-center">Loading analytics…</div>;

  const hourMax = Math.max(1, ...(hours?.hours || []).map((h: any) => h.total || 0));
  const bestHour = (hours?.hours || []).reduce((best: any, cur: any) =>
    (cur.success || 0) > (best?.success || 0) ? cur : best, null);

  return (
    <div className="space-y-4">
      {/* COST ANALYSIS */}
      {cost && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3>💰 Cost Analysis</h3>
              <div className="sub">Value from your plan</div>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat">
                <div className="stat-label">Plan</div>
                <div className="text-lg font-bold mt-1 uppercase">{cost.plan}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Messages Sent</div>
                <div className="text-lg font-bold mt-1">{cost.total_sent.toLocaleString()}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Efficiency</div>
                <div className="text-lg font-bold mt-1" style={{color: cost.efficiency > 50 ? "var(--success)" : "var(--warning)"}}>
                  {cost.efficiency}%
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Cost/Message</div>
                <div className="text-lg font-bold mt-1">৳{cost.cost_per_msg}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BEST HOUR */}
      {hours?.hours?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3>⏰ Best Time Analysis</h3>
              <div className="sub">
                Best hour: {bestHour ? `${String(bestHour.hour).padStart(2,"0")}:00` : "—"} (30 days)
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="flex items-end gap-1 h-24">
              {Array.from({ length: 24 }).map((_, h) => {
                const row = (hours.hours || []).find((x: any) => x.hour === h);
                const total = row?.total || 0;
                const success = row?.success || 0;
                const hPct = (total / hourMax) * 100;
                const sPct = total > 0 ? (success / total) * 100 : 0;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-1" title={`${h}:00 — ${total} sent`}>
                    <div className="w-full bg-[var(--surface3)] rounded-t" style={{ height: `${Math.max(4, hPct)}%`, position: "relative" }}>
                      <div className="absolute bottom-0 w-full bg-[var(--success)] rounded-t" style={{ height: `${sPct}%` }} />
                    </div>
                    <span className="text-[8px] text-[var(--dim2)]">{h}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-[var(--dim2)] mt-2 text-center">hour of day (24h) — green = success rate</div>
          </div>
        </div>
      )}

      {/* TOP GROUPS */}
      {groups?.top?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3>🏆 Top Groups</h3>
              <div className="sub">Most messages sent</div>
            </div>
          </div>
          <div className="card-body tight">
            <div className="space-y-2">
              {groups.top.slice(0, 10).map((g: any, i: number) => {
                const rate = g.total > 0 ? (g.success / g.total) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)]/40 last:border-0">
                    <div className="w-6 h-6 rounded-md bg-[var(--surface3)] text-xs flex items-center justify-center font-semibold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{g.group_title}</div>
                      <div className="text-[10px] text-[var(--dim2)]">
                        {g.success} ok · {g.failed} failed
                      </div>
                    </div>
                    <span className={`tag ${rate >= 90 ? "tag-ok" : rate >= 70 ? "tag-warn" : "tag-err"}`}>
                      {rate.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WORST GROUPS */}
      {groups?.worst?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3>⚠ Problem Groups</h3>
              <div className="sub">High failure rate — consider removing</div>
            </div>
          </div>
          <div className="card-body tight">
            <div className="space-y-2">
              {groups.worst.map((g: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)]/40 last:border-0">
                  <span className="text-[var(--danger)] shrink-0">⚠</span>
                  <div className="flex-1 min-w-0 text-sm truncate">{g.group_title}</div>
                  <span className="tag tag-err">{g.failed} failed</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
