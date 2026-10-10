"use client";

export function SkelLine({ w = "100%", h = 12, r = 6 }: { w?: string; h?: number; r?: number }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, marginBottom: 8 }} />;
}

export function SkelCard() {
  return (
    <div className="card p-5">
      <SkelLine w="40%" h={10} />
      <SkelLine w="70%" h={24} />
      <SkelLine w="50%" h={10} />
    </div>
  );
}

export function SkelList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4">
          <SkelLine w="30%" h={10} />
          <SkelLine w="60%" h={14} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, sub, action }: any) {
  return (
    <div className="card p-12 text-center">
      <div className="text-4xl opacity-30 mb-4">{icon || "◈"}</div>
      <div className="text-sm font-medium mb-1">{title}</div>
      {sub && <div className="text-xs text-[var(--dim)] mb-4">{sub}</div>}
      {action}
    </div>
  );
}
