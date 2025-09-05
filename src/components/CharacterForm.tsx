/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

export type Char = {
  id: string;
  name: string;
  role: "main" | "support" | "background";
  look?: string;
  outfit?: string;
};

export default function CharacterForm({
  chars,
  onChange
}: {
  chars: Char[];
  onChange: (next: Char[]) => void;
}) {
  function rid() {
    return "char_" + Math.random().toString(36).slice(2, 10);
  }
  return (
    <div className="grid gap-3">
      <button
        className="px-3 py-1 rounded bg-neutral-800 text-white w-max"
        onClick={() =>
          onChange([
            ...chars,
            { id: rid(), name: "Karakter", role: "main", look: "", outfit: "" }
          ])
        }
      >
        + Karakter
      </button>

      {chars.map((c, i) => (
        <div key={c.id} className="p-3 border rounded grid gap-2">
          <div className="flex gap-2">
            <input
              className="border rounded px-2 py-1 flex-1"
              value={c.name}
              onChange={(e) => {
                const next = [...chars];
                next[i] = { ...c, name: e.target.value };
                onChange(next);
              }}
            />
            <select
              className="border rounded px-2 py-1"
              value={c.role}
              onChange={(e) => {
                const next = [...chars];
                next[i] = { ...c, role: e.target.value as any };
                onChange(next);
              }}
            >
              <option value="main">main</option>
              <option value="support">support</option>
              <option value="background">background</option>
            </select>
            <button
              className="px-3 py-1 rounded bg-red-600 text-white"
              onClick={() => onChange(chars.filter((x) => x.id !== c.id))}
            >
              Hapus
            </button>
          </div>
          <input
            className="border rounded px-2 py-1"
            placeholder="look detail (mata, rambut, warna kulit, dll.)"
            value={c.look ?? ""}
            onChange={(e) => {
              const next = [...chars];
              next[i] = { ...c, look: e.target.value };
              onChange(next);
            }}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="outfit detail (baju, celana, aksesoris, warna)"
            value={c.outfit ?? ""}
            onChange={(e) => {
              const next = [...chars];
              next[i] = { ...c, outfit: e.target.value };
              onChange(next);
            }}
          />
        </div>
      ))}
    </div>
  );
}