"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";

export default function WebhooksPanel() {
  const [hooks, setHooks] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("campaign_fail");
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/webhooks").then(r => setHooks(r.data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!url.startsWith("http")) return toast("Invalid URL", "error");
    setLoading(true);
    try {
      await api.post("/webhooks", { url, events });
      toast("Webhook added", "success");
      setUrl(""); load();
    } catch { toast("Failed", "error"); }
    setLoading(false);
  };

  const del = async (id: number) => {
    try { await api.delete(`/webhooks/${id}`); toast("Deleted", "success"); load(); }
    catch { toast("Failed", "error"); }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>🔔 Webhooks</h3>
          <div className="sub">Get notified at external URL</div>
        </div>
      </div>
      <div className="card-body tight space-y-3">
        <input className="inp text-xs mono" placeholder="https://your-webhook.url/endpoint"
          value={url} onChange={e => setUrl(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          <select className="inp text-xs py-1.5 max-w-[180px]" value={events} onChange={e => setEvents(e.target.value)}>
            <option value="campaign_fail">campaign_fail</option>
            <option value="partial_fail">partial_fail</option>
            <option value="campaign_fail,partial_fail">both</option>
          </select>
          <button onClick={add} disabled={loading} className="btn btn-sm btn-primary">
            {loading ? "Adding…" : "+ Add"}
          </button>
        </div>

        {hooks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
            {hooks.map(h => (
              <div key={h.id} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                <span className="flex-1 truncate mono">{h.url}</span>
                <span className="tag tag-info">{h.events}</span>
                <button onClick={() => del(h.id)} className="btn btn-sm btn-danger">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
