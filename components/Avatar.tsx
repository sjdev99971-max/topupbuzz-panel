"use client";
import { useState } from "react";

export default function Avatar({ user, size = 44 }: { user: any; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (user?.first_name?.[0] || user?.username?.[0] || "?").toUpperCase();
  const url = user?.photo_url;

  const style = {
    width: size,
    height: size,
    fontSize: size * 0.4,
  };

  if (url && !imgFailed) {
    return (
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setImgFailed(true)}
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
