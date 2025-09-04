import React, { useMemo, useState, useEffect } from "react";
import { enhanceWithAI } from "../lib/aiClient";
import { STYLE_PROFILES, StyleKey } from "../lib/spec";
import type { LarasJSON } from "../types";

function rid(p:string){ return `${p}_${Math.random().toString(36).slice(2,10)}`; }
const ARS = ["16:9","9:16","1:1","2.35:1"] as const;

function detectLanguage(txt:string):"id-ID"|"en-US"{
  const s=txt.toLowerCase(); return (s.includes(" yang ")||s.includes(" anak"))?"id-ID":"en-US";
}
function extractNumber(txt:string,unit:string){ const m=txt.match(new RegExp(`(\\d{1,3})\\s*(?:${unit})`,"i")); return m?parseInt(m[1],10):undefined; }
function pickDurationSeconds(instruction:string,fallback=60){
  const s=instruction.toLowerCase();
  const detik=extractNumber(s,"detik")??extractNumber(s,"sec")??extractNumber(s,"seconds");
  const menit=extractNumber(s,"menit")??extractNumber(s,"minute")??extractNumber(s,"min");
  if (menit && !detik) return Math.min(1200, Math.max(15, menit*60));
  if (detik) return Math.min(1200, Math.max(10, detik));
  return fallback;
}

type MixProfile = "film"|"podcast"|"ads";

type Character = {
  display_name: string;
  role: "Protagonist"|"Sidekick"|"Antagonist"|"Supporting";
  age?: string; gender?: "male"|"female"|"other";
  design?: string; facial_features?: string; eyes?: string; hair?: string;
  clothing?: string; accessories?: string; character_id: string;
};

export default function SmartLarasCinematicPro(){
  // ==== FORM STATE ====
  const [style, setStyle] = useState<StyleKey>("Marvel");
  const [resolution, setResolution] = useState<"4K"|"8K">("4K");
  const [fps, setFps] = useState<30|60>(60);
  const [aspect, setAspect] = useState<typeof ARS[number]>("16:9");
  const [mix, setMix] = useState<MixProfile>("film");

  const [scenes, setScenes] = useState<number>(6);
  const [instruction, setInstruction] = useState("Buat animasi 1 menit, anak pemandu kebun binatang futuristik, gajah robot & singa api, sinematik, green screen portrait.");
  const [modeAman, setModeAman] = useState(true);

  const [characters, setCharacters] = useState<Character[]>([
    { display_name:"Raka", role:"Protagonist", age:"10", gender:"male",
      facial_features:"ceria, ekspresif", eyes:"mata bulat cokelat",
      hair:"rambut pendek hitam", clothing:"jaket petualang anak", accessories:"headset mic",
      character_id:rid("char") },
    { display_name:"GajahBot", role:"Sidekick", design:"gajah mekanik futuristik, armor berkilau, mata biru neon", character_id:rid("char") },
    { display_name:"Singa Api", role:"Antagonist", design:"singa dengan surai api menyala, aura kuat", character_id:rid("char") }
  ]);

  // ==== OUTPUT / STATUS ====
  const [jsonOut, setJsonOut] = useState<string>("");
  const [busy, setBusy] = useState<"idle"|"local"|"ai">("idle");
  const [error, setError] = useState<string>("");

  // ==== LOCALSTORAGE (auto save/load) ====
  useEffect(()=>{ // load
    const raw = localStorage.getItem("laras_state_v2_5"); if(!raw) return;
    try{
      const s = JSON.parse(raw);
      setStyle(s.style ?? style); setResolution(s.resolution ?? resolution); setFps(s.fps ?? fps);
      setAspect(s.aspect ?? aspect); setMix(s.mix ?? mix); setScenes(s.scenes ?? scenes);
      setInstruction(s.instruction ?? instruction); setModeAman(Boolean(s.modeAman));
      if(Array.isArray(s.characters)) setCharacters(s.characters);
    }catch{}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{ // save
    const snapshot = { style, resolution, fps, aspect, mix, scenes, instruction, modeAman, characters };
    localStorage.setItem("laras_state_v2_5", JSON.stringify(snapshot));
  },[style,resolution,fps,aspect,mix,scenes,instruction,modeAman,characters]);

  // ==== HELPERS ====
  const lang = useMemo(()=>detectLanguage(instruction),[instruction]);
  const totalSec = useMemo(()=>pickDurationSeconds(instruction, 60),[instruction]);
  const fpsNum = fps === 60 ? 60 : 30;
  const resPx = resolution==="8K" ? "7680x4320" : "3840x2160";

  function distribute(n:number,total:number){
    const weights = [0.12,0.18,0.2,0.2,0.18,0.12];
    const base = Array.from({length:n},(_,i)=>weights[i%6]);
    const sum = base.reduce((a,b)=>a+b,0);
    // minimal 3 detik
    return base.map(w=>Math.max(3, Math.round((w/sum)*total)));
  }

  function safetyLists(enabled:boolean){
    if(!enabled) return { do:["alur natural","transisi halus","ekspresi sesuai emosi","proporsi wajah konsisten"], dont:["distorsi","noise berat","glitch teks"] };
    return { do:["ramah anak","hindari jumpscare","tone positif","ekspresi lembut","transisi halus"],
             dont:["kekerasan","darah","tema dewasa","bahasa kasar","hewan tersakiti"] };
  }

  // Kamera preset singkat untuk variasi otomatis
  const CAMERA_PALETTE = [
    { angle:"wide",   movement:"crane down, dolly-in", lens:"35mm", dof:"shallow fg sharp bg soft", framing:"establishing" },
    { angle:"medium", movement:"tracking",              lens:"40mm anamorphic", dof:"medium",       framing:"OTS" },
    { angle:"close-up", movement:"dolly-in",           lens:"85mm", dof:"very shallow",             framing:"portrait" },
    { angle:"bird view", movement:"drone",             lens:"24mm", dof:"deep",                     framing:"top" },
    { angle:"low angle", movement:"dolly-zoom",        lens:"50mm", dof:"shallow",                  framing:"hero" },
    { angle:"medium", movement:"handheld subtle",      lens:"35mm", dof:"medium",                   framing:"dialogue" },
  ];

  function buildLocalDraft(): LarasJSON {
    const profile = STYLE_PROFILES[style];
    const deisgnId = rid("design");
    const seed = String(Math.floor(Math.random()*1_000_000));
    const seconds = distribute(scenes, totalSec);
    const safe = safetyLists(modeAman);

    const globalStyle = {
      profile: style,
      grading: profile.grading,
      palette: profile.palette,
      lens_default: profile.lens_default
    };

    const globalAudio = {
      mix_profile: mix,
      music_global: profile.music_global,
      sfx_global: profile.sfx_global,
      voiceover: {
        language: lang,
        tone: lang==="id-ID" ? "narasi anak jelas, ekspresif, sesuai emosi" : "clear kid narration, expressive",
        pace: lang==="id-ID" ? "±125 wpm (sesuaikan durasi)" : "±125 wpm (match duration)"
      }
    };

    const scenesArr = Array.from({length: scenes}, (_,i)=>{
      const cam = CAMERA_PALETTE[i % CAMERA_PALETTE.length];
      const sec = seconds[i];
      // micro/environment defaults by style:
      const env = (style==="Real Film")
        ? { location:"kebun binatang futuristik (real film)", weather:"clear with haze", textures:["wet pavement reflections","steel rail texture","glass glare"], props:["holographic sign","ticket gate"] }
        : { location:"kebun binatang futuristik", weather:"sunny", textures:["neon glow","dust motes","soft fog"], props:["robotic gate","info panel"] };

      const lighting = (style==="Marvel"||style==="Real Film")
        ? { key:"directional warm", fill:"soft neutral", rim:"strong cool", volumetric:true }
        : (style==="Pixar"||style==="Cartoon")
        ? { key:"soft warm", fill:"gentle", rim:"subtle", volumetric:true }
        : { key:"stylized key", fill:"anime soft", rim:"bright", volumetric:true };

      const charRefs = characters.map(c=>({ref:c.character_id, visible:true, notes:"keep outfit/logo/colors"}));

      const label = ["Pembukaan","Pengantar","Perkembangan","Klimaks","Resolusi","Penutup"][i] || `Adegan ${i+1}`;
      const dialogue = lang==="id-ID"
        ? `(${label}) Narator menjelaskan dengan ekspresi sesuai adegan.`
        : `(${label}) Narrator explains with emotion matching the beat.`;

      const musicCue = (style==="Marvel") ? "heroic build"
                    : (style==="Pixar") ? "warm playful"
                    : (style==="Anime") ? "anime swell"
                    : (style==="Cartoon") ? "comedy light"
                    : "filmic pulse";

      const sfx = (style==="Marvel"||style==="Real Film")
        ? ["footsteps foley","cloth rustle","robotic hum","crowd ambience"]
        : ["soft steps","playful whoosh","ambient park","robot beep"];

      const micro = (style==="Real Film")
        ? ["subtle wind on hair", "tiny lens dust glints", "distant birds", "city bokeh flicker"]
        : ["sparkle dust", "neon flicker", "penguin chatter afar"];

      return {
        index: i+1,
        name: label,
        seconds: sec,
        continuity: { characters: charRefs },
        camera: cam,
        environment: env,
        lighting,
        action: lang==="id-ID"
          ? "Gerakan tubuh natural (napas naik-turun, kedipan, rambut/aksesoris bergerak). Interaksi fisik nyata."
          : "Natural body motion (breathing, blinking, hair/cloth motion). Real physical interactions.",
        expressions: lang==="id-ID" ? "selaras emosi adegan" : "match scene emotion",
        gestures: ["wave","head nod","eye blink"],
        lipsync: "dialogue",
        dialogue,
        music_cue: musicCue,
        sfx,
        micro_details: micro
      };
    });

    const obj: LarasJSON = {
      version: "2.5",
      schema: "laras.prompt",
      intent: "cinematic_storytelling",
      consistency: {
        lock: true,
        design_id: deisgnId,
        seed,
        look_lock: { face:true, body:true, clothes:true, colors:true }
      },
      global: {
        style: globalStyle,
        audio: globalAudio,
        safety: safe,
        output: {
          resolution: resPx,
          fps: fpsNum,
          container: "mp4",
          audio_channels: "stereo"
        }
      },
      characters,
      scenes: scenesArr,
      narrative: {
        logline: lang==="id-ID"
          ? "Video multi-adegan sinematik dengan konsistensi karakter sempurna."
          : "Multi-scene cinematic video with perfect character consistency.",
        total_seconds: totalSec
      },
      output: { // untuk kompatibilitas lama (beberapa vendor baca dari sini)
        mode: "video",
        aspect_ratio: aspect,
        fps: fpsNum,
        duration_seconds: totalSec,
        frames: fpsNum * totalSec,
        subtitles: { enabled:true, language: lang },
        transparent_background: instruction.toLowerCase().includes("green")
      },
      vendor: { canva: { magic_studio: {
        strict_face_lock:true, geometry_consistency:"ultra", color_consistency:"ultra", cinematic_mode:true
      } } }
    };
    return obj;
  }

  async function generateLocal(){
    setError(""); setBusy("local");
    try{ const draft = buildLocalDraft(); setJsonOut(JSON.stringify(draft,null,2)); }
    catch(e:any){ setError(e?.message||"Local generator failed"); }
    finally{ setBusy("idle"); }
  }
  async function generateWithAI(){
    setError(""); setBusy("ai");
    try{
      const draft = buildLocalDraft();
      const { enhanced } = await enhanceWithAI({ instruction, draft });
      const json = typeof enhanced==="string" ? enhanced : JSON.stringify(enhanced,null,2);
      setJsonOut(json);
    }catch(e:any){ setError(e?.message||"AI Boost failed"); }
    finally{ setBusy("idle"); }
  }

  // ==== UI ====
  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <div className="mx-auto max-w-6xl p-4">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">SMART LARAS — Cinematic Pro+ v2.5</h1>
            <p className="text-xs opacity-70">Multi-scene • Konsistensi karakter • Kamera/Lighting/Audio per adegan • 4K/8K</p>
          </div>
          <div className="flex gap-2">
            <button disabled={!jsonOut} onClick={()=>navigator.clipboard.writeText(jsonOut)}
              className="px-3 py-2 rounded-xl bg-white/10 disabled:opacity-40">Copy JSON</button>
            <button disabled={!jsonOut} onClick={()=>{
              const blob=new Blob([jsonOut],{type:"application/json"});
              const url=URL.createObjectURL(blob); const a=document.createElement("a");
              a.href=url; a.download=`LARAS_${Date.now()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            }} className="px-3 py-2 rounded-xl bg-white/10 disabled:opacity-40">Download</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* LEFT: FORM */}
          <section className="rounded-2xl bg-[#0E1626] border border-white/10 p-4">
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">
                <div className="mb-1 opacity-80">Style</div>
                <select value={style} onChange={e=>setStyle(e.target.value as StyleKey)}
                  className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  <option>Marvel</option><option>Pixar</option><option>Anime</option><option>Cartoon</option><option>Real Film</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">Aspect</div>
                <select value={aspect} onChange={e=>setAspect(e.target.value as any)}
                  className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  {ARS.map(a=><option key={a}>{a}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">Resolusi</div>
                <select value={resolution} onChange={e=>setResolution(e.target.value as any)}
                  className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  <option value="4K">4K (3840x2160)</option>
                  <option value="8K">8K (7680x4320)</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">FPS</div>
                <select value={fps} onChange={e=>setFps(Number(e.target.value) as any)}
                  className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">Mix Profile</div>
                <select value={mix} onChange={e=>setMix(e.target.value as MixProfile)}
                  className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  <option value="film">film</option>
                  <option value="podcast">podcast</option>
                  <option value="ads">ads</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">Jumlah Adegan</div>
                <input type="number" min={3} max={12} value={scenes}
                  onChange={e=>setScenes(Math.min(12,Math.max(3,Number(e.target.value))))}
                  className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2"/>
              </label>
            </div>

            <label className="text-sm block mt-3">
              <div className="mb-1 opacity-80">Deskripsi/Instruksi</div>
              <textarea value={instruction} onChange={e=>setInstruction(e.target.value)} rows={4}
                className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2"
                placeholder="Tuliskan cerita, lokasi, hewan/objek, green screen?, durasi (menit/detik), dll."/>
            </label>

            <div className="mt-3 flex items-center justify-between">
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={modeAman} onChange={e=>setModeAman(e.target.checked)}/>
                <span>Mode Aman Canva</span>
              </label>
              <div className="flex gap-2">
                <button onClick={generateLocal} disabled={busy!=="idle"} className="px-4 py-2 rounded-xl bg-emerald-600 disabled:opacity-50">{busy==="local"?"Generating...":"Generate (Lokal)"}</button>
                <button onClick={generateWithAI} disabled={busy!=="idle"} className="px-4 py-2 rounded-xl bg-indigo-600 disabled:opacity-50">{busy==="ai"?"Boosting...":"AI Boost Generate"}</button>
              </div>
            </div>
            {error && <div className="mt-3 text-xs rounded-xl border border-rose-400 bg-rose-900/20 text-rose-200 p-3">{error}</div>}
          </section>

          {/* RIGHT: PREVIEW */}
          <section className="rounded-2xl bg-[#0E1626] border border-white/10 p-4">
            <h2 className="text-lg font-semibold mb-2">JSON Preview</h2>
            <div className="rounded-xl bg-[#0B1220] border border-white/10 p-3 max-h-[65vh] overflow-auto">
              <pre className="text-xs whitespace-pre-wrap">{jsonOut || "// Tekan Generate untuk melihat output JSON (v2.5)"}</pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
