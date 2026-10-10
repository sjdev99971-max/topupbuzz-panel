"use client";
import { useEffect, useState } from "react";

type Toast = { id: number; msg: string; type: "success" | "error" | "info" };
let toaster: ((t: Omit<Toast, "id">) => void) | null = null;

export function toast(msg: string, type: "success" | "error" | "info" = "info") {
  toaster?.({ msg, type });
}

export default function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    toaster = (t) => {
      const id = Date.now() + Math.random();
      setItems(prev => [...prev, { id, ...t }]);
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 3500);
    };
    return () => { toaster = null; };
  }, []);

  return (
    <div className="toast-wrap">
      {items.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="mr-2">
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "i"}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
