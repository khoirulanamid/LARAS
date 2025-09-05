import React from "react";

export type UIObject = {
  id: string;
  kind: "prop" | "flora" | "fauna" | "effect" | "sfx" | "particles";
  name: string;
  color?: string;
  material?: string;
  texture?: string;
  behavior?: string;
  sfx?: string;
  particles?: string;
};

function rid(p: string) {
  return `${p}_${Math.random().toString(36).slice(2, 10)}`;
}

// helper utk mengubah list UIObject → field environment
export function flattenObjectsToEnv(list: UIObject[]) {
  const flora: string[] = [];
  const fauna: string[] = [];
  const props: string[] = [];
  const sfx: string[] = [];
  const particles: string[] = [];

  list.forEach((o) => {
    const detail = [o.name, o.color, o.material, o.texture, o.behavior]
      .filter(Boolean)
      .join(" / ");
    const text = detail || o.name;

    if (o.kind === "flora") flora.push(text);
    else if (o.kind === "fauna") fauna.push(text);
    else if (o.kind === "prop") props.push(text);
    else if (o.kind === "sfx") { if (o.sfx) sfx.push(o.sfx); else sfx.push(text); }
    else if (o.kind === "particles") { if (o.particles) particles.push(o.particles); else particles.push(text); }
    else if (o.kind === "effect") {
      // effect bisa masuk ke particles agar terlihat (atau ke micro_details di scene)
      particles.push(text);
    }
  });

  return { flora, fauna, props, sfx, particles };
}

export default function ObjectForm({
  objects,
  onChange,
}: {
  objects: UIObject[];
  onChange: (list: UIObject[]) => void;
}) {
  function update(i: number, patch: Partial<UIObject>) {
    const next = [...objects];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function add(kind: UIObject["kind"]) {
    onChange([
      ...objects,
      { id: rid("obj"), kind, name: "New Item" } as UIObject,
    ]);
  }
  function remove(i: number) {
    const next = objects.filter((_, idx) => idx !== i);
    onChange(next);
  }

  return (
    <div className="rounded-xl border border-white/10 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm">Objects / Environment</div>
        <div className="flex gap-1">
          <button onClick={()=>add("prop")} className="text-xs px-2 py-1 rounded bg-white/10">+ Prop</button>
          <button onClick={()=>add("flora")} className="text-xs px-2 py-1 rounded bg-white/10">+ Flora</button>
          <button onClick={()=>add("fauna")} className="text-xs px-2 py-1 rounded bg-white/10">+ Fauna</button>
          <button onClick={()=>add("effect")} className="text-xs px-2 py-1 rounded bg-white/10">+ Effect</button>
          <button onClick={()=>add("sfx")} className="text-xs px-2 py-1 rounded bg-white/10">+ SFX</button>
          <button onClick={()=>add("particles")} className="text-xs px-2 py-1 rounded bg-white/10">+ Particles</button>
        </div>
      </div>

      <div className="space-y-3">
        {objects.map((o, i) => (
          <div key={o.id} className="rounded-xl bg-[#0B1220] border border-white/10 p-3">
            <div className="grid md:grid-cols-6 gap-2">
              <Select label="Jenis" value={o.kind} onChange={(v)=>update(i,{kind: v as UIObject["kind"]})}
                options={["prop","flora","fauna","effect","sfx","particles"]}/>
              <Field label="Nama" value={o.name} onChange={(v)=>update(i,{name:v})}/>
              <Field label="Warna" value={o.color} onChange={(v)=>update(i,{color:v})}/>
              <Field label="Material" value={o.material} onChange={(v)=>update(i,{material:v})}/>
              <Field label="Tekstur" value={o.texture} onChange={(v)=>update(i,{texture:v})}/>
              <Field label="Perilaku" value={o.behavior} onChange={(v)=>update(i,{behavior:v})}/>
              <Field label="SFX" value={o.sfx} onChange={(v)=>update(i,{sfx:v})}/>
              <Field label="Particles" value={o.particles} onChange={(v)=>update(i,{particles:v})}/>
            </div>
            <div className="mt-2 flex justify-end">
              <button onClick={()=>remove(i)} className="text-xs px-2 py-1 rounded bg-rose-700/60">Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({label, value, onChange}:{label:string; value?:any; onChange:(v:string)=>void}) {
  return (
    <label className="text-xs">
      <div>{label}</div>
      <input value={value||""} onChange={e=>onChange(e.target.value)} className="w-full rounded bg-transparent border border-white/10 px-2 py-1"/>
    </label>
  );
}
function Select({label, value, onChange, options}:{label:string; value:any; onChange:(v:string)=>void; options:string[]}) {
  return (
    <label className="text-xs">
      <div>{label}</div>
      <select value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded bg-transparent border border-white/10 px-2 py-1">
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
