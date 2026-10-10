"use client";
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Avatar({ user, size = 44 }: { user: any; size?: number }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  // Try multiple sources in order:
  // 1. Backend proxy (reliable)
  // 2. Telegram photo_url direct
  // 3. Fallback initial
  const sources = [
    user?.id ? `${API_URL}/avatar/${user.id}` : null,
    user?.photo_url || null,
  ].filter(Boolean);

  useEffect(() => {
    setSrcIdx(0);
    setFailed(false);
  }, [user?.id, user?.photo_url]);

  const initial = (user?.first_name?.[0] || user?.username?.[0] || "?").toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.4 };
  const currentSrc = sources[srcIdx];

  const handleError = () => {
    if (srcIdx < sources.length - 1) setSrcIdx(srcIdx + 1);
    else setFailed(true);
  };

  if (!failed && currentSrc) {
    return (
      <img
        key={currentSrc}
        src={currentSrc}
        alt=""
        referrerPolicy="no-referrer"
        onError={handleError}
        className="rounded-full object-cover border border-[var(--border2)] shrink-0"
        style={style}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-gradient-to-br from-[var(--accent)]/30 to-[var(--accent2)]/30 border border-[var(--accent)]/40 flex items-center justify-center font-bold text-[var(--accent)] shrink-0"
      style={style}>
      {initial}
    </div>
  );
}
