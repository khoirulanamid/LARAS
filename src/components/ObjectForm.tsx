/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

export default function ObjectForm({
  obj,
  onChange
}: {
  obj: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
}) {
  function rid(p: string) {
    return ${p}_${Math.random().toString(36).slice(2, 10)};
  }

  function set(key: string, val: any) {
    onChange({ ...obj, [key]: val });
  }

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <input
          className="border rounded px-2 py-1 flex-1"
          placeholder="key"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const k = (e.target as HTMLInputElement).value.trim() || rid("k");
              set(k, "");
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
        <button
          className="px-3 py-1 rounded bg-neutral-800 text-white"
          onClick={() => set(rid("k"), "")}
        >
          + Field
        </button>
      </div>

      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <input
            className="border rounded px-2 py-1 w-40"
            value={k}
            onChange={(e) => {
              const nk = e.target.value;
              const next = { ...obj };
              delete (next as any)[k];
              (next as any)[nk] = v;
              onChange(next);
            }}
          />
          <input
            className="border rounded px-2 py-1 flex-1"
            value={String(v ?? "")}
            onChange={(e) => set(k, e.target.value)}
          />
          <button
            className="px-3 py-1 rounded bg-red-600 text-white"
            onClick={() => {
              const next = { ...obj };
              delete (next as any)[k];
              onChange(next);
            }}
          >
            Hapus
          </button>
        </div>
      ))}
    </div>
  );
}