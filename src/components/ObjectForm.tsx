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
  // versi aman: tanpa template literal/backtick
  return p + "_" + Math.random().toString(36).slice(2, 10);
}

// helper utk mengubah list UIObject → field environment
export function flattenObjectsToEnv(list: UIObject[]) {
  const flora: string[] = [];
  const fauna: string[] = [];
  const props: string[] = [];
  const sfx: string[] = [];
  const particles: string[] = [];

  list.forEach(function(o) {
    const pieces = [o.name, o.color, o.material, o.texture, o.behavior].filter(function(x){return !!x;});
    const detail = pieces.join(" / ");
    const text = detail || o.name;

    if (o.kind === "flora") flora.push(text);
    else if (o.kind === "fauna") fauna.push(text);
    else if (o.kind === "prop") props.push(text);
    else if (o.kind === "sfx") { if (o.sfx) sfx.push(o.sfx); else sfx.push(text); }
    else if (o.kind === "particles") { if (o.particles) particles.push(o.particles); else particles.push(text); }
    else if (o.kind === "effect") {
      // effect → micro FX
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
    const next = objects.slice();
    next[i] = Object.assign({}, next[i], patch);
    onChange(next);
  }
  function add(kind: UIObject["kind"]) {
    onChange(
      objects.concat([{ id: rid("obj"), kind: kind, name: "New Item" } as UIObject])
    );
  }
  function remove(i: number) {
    const next = objects.filter(function(_, idx){ return idx !== i; });
    onChange(next);
  }

  return (
    <div className="rounded-xl border border-white/10 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm">Objects / Environment</div>
        <div className="flex gap-1">
          <button onClick={function(){add("prop");}} className="text-xs px-2 py-1 rounded bg-white/10">+ Prop</button>
          <button onClick={function(){add("flora");}} className="text-xs px-2 py-1 rounded bg-white/10">+ Flora</button>
          <button onClick={function(){add("fauna");}} className="text-xs px-2 py-1 rounded bg-white/10">+ Fauna</button>
          <button onClick={function(){add("effect");}} className="text-xs px-2 py-1 rounded bg-white/10">+ Effect</button>
          <button onClick={function(){add("sfx");}} className="text-xs px-2 py-1 rounded bg-white/10">+ SFX</button>
          <button onClick={function(){add("particles");}} className="text-xs px-2 py-1 rounded bg-white/10">+ Particles</button>
        </div>
      </div>

      <div className="space-y-3">
        {objects.map(function(o, i) {
          return (
            <div key={o.id} className="rounded-xl bg-[#0B1220] border border-white/10 p-3">
              <div className="grid md:grid-cols-6 gap-2">
                <Select label="Jenis" value={o.kind} onChange={function(v){update(i,{kind: v as UIObject["kind"]});}}
                  options={["prop","flora","fauna","effect","sfx","particles"]}/>
                <Field label="Nama" value={o.name} onChange={function(v){update(i,{name:v});}}/>
                <Field label="Warna" value={o.color} onChange={function(v){update(i,{color:v});}}/>
                <Field label="Material" value={o.material} onChange={function(v){update(i,{material:v});}}/>
                <Field label="Tekstur" value={o.texture} onChange={function(v){update(i,{texture:v});}}/>
                <Field label="Perilaku" value={o.behavior} onChange={function(v){update(i,{behavior:v});}}/>
                <Field label="SFX" value={o.sfx} onChange={function(v){update(i,{sfx:v});}}/>
                <Field label="Particles" value={o.particles} onChange={function(v){update(i,{particles:v});}}/>
              </div>
              <div className="mt-2 flex justify-end">
                <button onClick={function(){remove(i);}} className="text-xs px-2 py-1 rounded bg-rose-700/60">Hapus</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field(props: {label:string; value?:any; onChange:(v:string)=>void}) {
  return (
    <label className="text-xs">
      <div>{props.label}</div>
      <input
        value={props.value||""}
        onChange={function(e){props.onChange(e.target.value);}}
        className="w-full rounded bg-transparent border border-white/10 px-2 py-1"
      />
    </label>
  );
}
function Select(props:{label:string; value:any; onChange:(v:string)=>void; options:string[]}) {
  return (
    <label className="text-xs">
      <div>{props.label}</div>
      <select
        value={props.value}
        onChange={function(e){props.onChange(e.target.value);}}
        className="w-full rounded bg-transparent border border-white/10 px-2 py-1"
      >
        {props.options.map(function(o){ return <option key={o}>{o}</option>; })}
      </select>
    </label>
  );
}