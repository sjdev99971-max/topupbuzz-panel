"use client";
import { useState, useMemo } from "react";

type Group = { id: number; title: string; username?: string | null };

export default function GroupPicker({
  groups, selected, onChange
}: { groups: Group[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return s ? groups.filter(g => g.title.toLowerCase().includes(s)) : groups;
  }, [q, groups]);

  const allSelected = filtered.length > 0 && filtered.every(g => selected.includes(g.id));

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const selectAll = () => {
    if (allSelected) onChange(selected.filter(id => !filtered.some(g => g.id === id)));
    else {
      const s = new Set(selected);
      filtered.forEach(g => s.add(g.id));
      onChange(Array.from(s));
    }
  };

  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-3">
        <input
          className="inp text-xs py-1.5 flex-1"
          placeholder="search groups…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <button onClick={selectAll} className="btn btn-sm">
          {allSelected ? "deselect" : "select all"}
        </button>
      </div>

      <div className="text-[10px] text-[var(--dim2)] mb-2">
        {selected.length} selected / {filtered.length} shown
      </div>

      <div className="max-h-72 overflow-y-auto border border-[var(--border)] rounded">
        {filtered.length === 0 ? (
          <div className="text-center text-xs text-[var(--dim2)] py-8">no groups match</div>
        ) : (
          filtered.map(g => (
            <label key={g.id}
              className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)]/40 last:border-0 hover:bg-[var(--surface2)]/50 cursor-pointer text-xs">
              <input
                type="checkbox"
                className="checkbox"
                checked={selected.includes(g.id)}
                onChange={() => toggle(g.id)}
              />
              <span className="flex-1 truncate">{g.title}</span>
              {g.username && <span className="text-[10px] text-[var(--dim2)]">@{g.username}</span>}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
