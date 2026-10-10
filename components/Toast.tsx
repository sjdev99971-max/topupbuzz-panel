"use client";
import { useEffect, useState } from "react";

type ToastItem = { id: number; msg: string; type: "success" | "error" | "info"; life: number };
let toaster: ((t: Omit<ToastItem, "id" | "life">) => void) | null = null;

export function toast(msg: string, type: "success" | "error" | "info" = "info") {
  toaster?.({ msg, type });
}

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    toaster = (t) => {
      const id = Date.now() + Math.random();
      setItems(prev => {
        const next = [...prev, { id, life: 3500, ...t }];
        return next.slice(-5); // max 5
      });
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 3500);
    };
    return () => { toaster = null; };
  }, []);

  return (
    <div className="toast-wrap">
      {items.map((t, i) => (
        <div key={t.id} className={`toast toast-${t.type}`} style={{
          animation: "fade 0.25s ease-out",
          opacity: 1 - i * 0.1,
        }}>
          <span className="mr-2">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "i"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
