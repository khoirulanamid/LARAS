import React from "react";

export type UICharacter = {
  display_name: string;
  role: "Protagonist" | "Sidekick" | "Antagonist" | "Supporting";
  age?: string;
  gender?: "male" | "female" | "other";
  design?: string;

  // ULTRA DETAILS:
  height_cm?: number;
  body_type?: string;
  skin_tone?: string;

  eyes_shape?: string;
  iris_color?: string;
  pupil_shape?: string;
  eyelashes?: string;
  eyebrows_shape?: string;
  eyebrows_thickness?: string;

  nose_shape?: string;
  mouth_lip_shape?: string;
  teeth_detail?: string;
  ear_shape?: string;

  hair_style?: string;
  hair_length?: string;
  hair_color?: string;

  fingernails?: string;
  toenails?: string;

  // Wardrobe
  top_type?: string; top_color?: string; top_color_detail?: string; top_material?: string; top_texture?: string; top_fit?: string; top_pattern?: string; top_trim?: string;
  bottom_type?: string; bottom_color?: string; bottom_color_detail?: string; bottom_material?: string; bottom_texture?: string; bottom_fit?: string; bottom_pattern?: string; bottom_hem?: string;
  footwear_type?: string; footwear_color?: string; footwear_material?: string; footwear_sole?: string; footwear_laces?: string;
  accessories?: string;

  // Physiology
  breathing_style?: string;
  gait_style?: string;
  speech_style?: string;

  character_id: string;
};

function rid(p: string) {
  return `${p}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function CharacterForm({
  characters,
  onChange,
}: {
  characters: UICharacter[];
  onChange: (list: UICharacter[]) => void;
}) {
  function update(i: number, patch: Partial<UICharacter>) {
    const next = [...characters];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function add() {
    onChange([
      ...characters,
      {
        display_name: "Karakter Baru",
        role: "Supporting",
        character_id: rid("char"),
        height_cm: 120,
        body_type: "child-proportion",
        skin_tone: "#F6C89F",
      } as UICharacter,
    ]);
  }
  function remove(i: number) {
    const next = characters.filter((_, idx) => idx !== i);
    onChange(next);
  }

  return (
    <div className="rounded-xl border border-white/10 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm">Karakter (Ultra Detail)</div>
        <button onClick={add} className="text-xs px-2 py-1 rounded bg-white/10">+ Tambah</button>
      </div>

      <div className="space-y-3">
        {characters.map((c, i) => (
          <div key={c.character_id} className="rounded-xl bg-[#0B1220] border border-white/10 p-3">
            <div className="grid md:grid-cols-3 gap-2">
              <Field label="Nama" value={c.display_name} onChange={(v)=>update(i,{display_name:v})}/>
              <Select label="Peran" value={c.role} onChange={(v)=>update(i,{role:v as any})}
                options={["Protagonist","Sidekick","Antagonist","Supporting"]}/>
              <Select label="Gender" value={c.gender||"other"} onChange={(v)=>update(i,{gender:v as any})}
                options={["male","female","other"]}/>
              <Field label="Desain Ringkas" value={c.design} onChange={(v)=>update(i,{design:v})} col={3}/>

              <Field label="Tinggi (cm)" value={String(c.height_cm??"")} onChange={(v)=>update(i,{height_cm:Number(v)||undefined})}/>
              <Field label="Tipe Tubuh" value={c.body_type} onChange={(v)=>update(i,{body_type:v})}/>
              <Field label="Skin Tone (#/deskripsi)" value={c.skin_tone} onChange={(v)=>update(i,{skin_tone:v})}/>

              <Field label="Bentuk Mata" value={c.eyes_shape} onChange={(v)=>update(i,{eyes_shape:v})}/>
              <Field label="Warna Iris" value={c.iris_color} onChange={(v)=>update(i,{iris_color:v})}/>
              <Field label="Bentuk Pupil" value={c.pupil_shape} onChange={(v)=>update(i,{pupil_shape:v})}/>
              <Field label="Bulu Mata" value={c.eyelashes} onChange={(v)=>update(i,{eyelashes:v})}/>
              <Field label="Bentuk Alis" value={c.eyebrows_shape} onChange={(v)=>update(i,{eyebrows_shape:v})}/>
              <Field label="Tebal Alis" value={c.eyebrows_thickness} onChange={(v)=>update(i,{eyebrows_thickness:v})}/>

              <Field label="Bentuk Hidung" value={c.nose_shape} onChange={(v)=>update(i,{nose_shape:v})}/>
              <Field label="Bentuk Bibir" value={c.mouth_lip_shape} onChange={(v)=>update(i,{mouth_lip_shape:v})}/>
              <Field label="Detail Gigi" value={c.teeth_detail} onChange={(v)=>update(i,{teeth_detail:v})}/>
              <Field label="Bentuk Telinga" value={c.ear_shape} onChange={(v)=>update(i,{ear_shape:v})}/>

              <Field label="Gaya Rambut" value={c.hair_style} onChange={(v)=>update(i,{hair_style:v})}/>
              <Field label="Panjang Rambut" value={c.hair_length} onChange={(v)=>update(i,{hair_length:v})}/>
              <Field label="Warna Rambut" value={c.hair_color} onChange={(v)=>update(i,{hair_color:v})}/>

              <Field label="Kuku Tangan" value={c.fingernails} onChange={(v)=>update(i,{fingernails:v})}/>
              <Field label="Kuku Kaki" value={c.toenails} onChange={(v)=>update(i,{toenails:v})}/>

              <Field label="Atasan (jenis)" value={c.top_type} onChange={(v)=>update(i,{top_type:v})}/>
              <Field label="Atasan (warna)" value={c.top_color} onChange={(v)=>update(i,{top_color:v})}/>
              <Field label="Atasan (detail warna)" value={c.top_color_detail} onChange={(v)=>update(i,{top_color_detail:v})}/>
              <Field label="Atasan (material)" value={c.top_material} onChange={(v)=>update(i,{top_material:v})}/>
              <Field label="Atasan (tekstur)" value={c.top_texture} onChange={(v)=>update(i,{top_texture:v})}/>
              <Field label="Atasan (fit)" value={c.top_fit} onChange={(v)=>update(i,{top_fit:v})}/>
              <Field label="Atasan (pola)" value={c.top_pattern} onChange={(v)=>update(i,{top_pattern:v})}/>
              <Field label="Atasan (tepi/trim)" value={c.top_trim} onChange={(v)=>update(i,{top_trim:v})}/>

              <Field label="Bawahan (jenis)" value={c.bottom_type} onChange={(v)=>update(i,{bottom_type:v})}/>
              <Field label="Bawahan (warna)" value={c.bottom_color} onChange={(v)=>update(i,{bottom_color:v})}/>
              <Field label="Bawahan (detail warna)" value={c.bottom_color_detail} onChange={(v)=>update(i,{bottom_color_detail:v})}/>
              <Field label="Bawahan (material)" value={c.bottom_material} onChange={(v)=>update(i,{bottom_material:v})}/>
              <Field label="Bawahan (tekstur)" value={c.bottom_texture} onChange={(v)=>update(i,{bottom_texture:v})}/>
              <Field label="Bawahan (fit)" value={c.bottom_fit} onChange={(v)=>update(i,{bottom_fit:v})}/>
              <Field label="Bawahan (pola)" value={c.bottom_pattern} onChange={(v)=>update(i,{bottom_pattern:v})}/>
              <Field label="Bawahan (ujung/hem)" value={c.bottom_hem} onChange={(v)=>update(i,{bottom_hem:v})}/>

              <Field label="Sepatu (jenis)" value={c.footwear_type} onChange={(v)=>update(i,{footwear_type:v})}/>
              <Field label="Sepatu (warna)" value={c.footwear_color} onChange={(v)=>update(i,{footwear_color:v})}/>
              <Field label="Sepatu (material)" value={c.footwear_material} onChange={(v)=>update(i,{footwear_material:v})}/>
              <Field label="Sepatu (sol)" value={c.footwear_sole} onChange={(v)=>update(i,{footwear_sole:v})}/>
              <Field label="Sepatu (tali)" value={c.footwear_laces} onChange={(v)=>update(i,{footwear_laces:v})}/>
              <Field label="Aksesori (list, koma)" value={c.accessories} onChange={(v)=>update(i,{accessories:v})} col={3}/>

              <Field label="Napas (gaya)" value={c.breathing_style} onChange={(v)=>update(i,{breathing_style:v})}/>
              <Field label="Jalan/Lari (gaya)" value={c.gait_style} onChange={(v)=>update(i,{gait_style:v})}/>
              <Field label="Cara Bicara" value={c.speech_style} onChange={(v)=>update(i,{speech_style:v})}/>
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

function Field({label, value, onChange, col=1}:{label:string; value?:any; onChange:(v:string)=>void; col?:number}) {
  return (
    <label className={`text-xs ${col===3?'md:col-span-3':''}`}>
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
