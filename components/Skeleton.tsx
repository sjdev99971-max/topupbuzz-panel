"use client";

export function SkelLine({ w = "100%", h = 12 }: { w?: string; h?: number }) {
  return <div className="skel" style={{ width: w, height: h, marginBottom: 8 }} />;
}

export function SkelCard() {
  return (
    <div className="card p-4">
      <SkelLine w="40%" h={10} />
      <SkelLine w="70%" h={20} />
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
