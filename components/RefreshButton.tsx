"use client";
import { useState } from "react";
export default function RefreshButton({ onRefresh }: { onRefresh: () => void | Promise<void> }) {
  const [spin, setSpin] = useState(false);
  const handle = async () => {
    setSpin(true);
    try { await onRefresh(); } finally { setTimeout(() => setSpin(false), 600); }
  };
  return (
    <button onClick={handle} className="btn btn-sm btn-icon" title="Refresh">
      <span className={spin ? "spin inline-block" : "inline-block"}>↻</span>
    </button>
  );
}
