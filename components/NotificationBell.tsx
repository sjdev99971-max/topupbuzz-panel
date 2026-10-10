"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getNotifications, markNotifsSeen } from "@/lib/api";

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getNotifications();
        setUnread(r.unread);
        setItems(r.items);
      } catch {}
    };
    load();
    const id = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(id);
  }, []);

  const openPanel = async () => {
    setOpen(true);
    if (unread > 0) {
      try {
        await markNotifsSeen();
        setTimeout(() => setUnread(0), 500);
      } catch {}
    }
  };

  return (
    <>
      <button onClick={openPanel} className="btn btn-sm btn-icon relative" title="Notifications">
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--danger)] text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="modal p-0 max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Notifications</h3>
                <div className="text-[10px] text-[var(--dim2)]">{items.length} total</div>
              </div>
              <button onClick={() => setOpen(false)} className="btn btn-sm btn-ghost">✕</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="text-3xl opacity-30 mb-2">🔔</div>
                  <div className="text-xs text-[var(--dim)]">No notifications</div>
                </div>
              ) : items.map((n: any) => (
                <div key={n.id} className="p-4 border-b border-[var(--border)]/50 last:border-0">
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0">
                      {n.type === "flood_alert" ? "⚠" : "🔔"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.body && <div className="text-xs text-[var(--dim)] mt-1">{n.body}</div>}
                      <div className="text-[10px] text-[var(--dim2)] mt-2">{n.ts}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
