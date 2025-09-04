import React, { useMemo, useState, useEffect } from "react";
import { enhanceWithAI } from "../lib/aiClient";
import { STYLE_PROFILES, StyleKey } from "../lib/spec";
import type { LarasJSON } from "../types";

function rid(p: string) {
  return `${p}_${Math.random().toString(36).slice(2, 10)}`;
}
const ARS = ["16:9", "9:16", "1:1", "2.35:1"] as const;

function detectLanguage(txt: string): "id-ID" | "en-US" {
  const s = txt.toLowerCase();
  return s.includes(" yang ") || s.includes(" anak") ? "id-ID" : "en-US";
}
function extractNumber(txt: string, unit: string) {
  const m = txt.match(new RegExp(`(\\d{1,3})\\s*(?:${unit})`, "i"));
  return m ? parseInt(m[1], 10) : undefined;
}
function pickDurationSeconds(instruction: string, fallback = 60) {
  const s = instruction.toLowerCase();
  const detik =
    extractNumber(s, "detik") ??
    extractNumber(s, "sec") ??
    extractNumber(s, "seconds");
  const menit =
    extractNumber(s, "menit") ??
    extractNumber(s, "minute") ??
    extractNumber(s, "min");
  if (menit && !detik) return Math.min(1200, Math.max(15, menit * 60));
  if (detik) return Math.min(1200, Math.max(10, detik));
  return fallback;
}

type MixProfile = "film" | "podcast" | "ads";
type Character = {
  display_name: string;
  role: "Protagonist" | "Sidekick" | "Antagonist" | "Supporting";
  age?: string;
  gender?: "male" | "female" | "other";
  design?: string;
  facial_features?: string;
  eyes?: string;
  hair?: string;
  clothing?: string;
  accessories?: string;
  character_id: string;
};

const MAX_SCENE_SEC = 8;
function splitScenesMax8(full: any) {
  const scenes = full?.scenes ?? [];
  let out: any[] = [];
  scenes.forEach((sc: any) => {
    const total = Math.max(1, Number(sc.seconds || 0));
    if (total <= MAX_SCENE_SEC) {
      out.push(sc);
      return;
    }
    const parts = Math.ceil(total / MAX_SCENE_SEC);
    const base = Math.floor(total / parts);
    let remainder = total - base * parts;
    for (let i = 0; i < parts; i++) {
      const sec = base + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      out.push({
        ...sc,
        name: `${sc.name || `Scene ${sc.index}`} (bagian ${i + 1}/${parts})`,
        seconds: sec,
      });
    }
  });
  return out.map((s, i) => ({ ...s, index: i + 1 }));
}

// builder → set durasi/frames sesuai scene
function buildPerSceneJSONs(full: any) {
  const scenes = splitScenesMax8(full);
  return scenes.map((sc: any) => {
    const fps = full.output?.fps || full.global?.output?.fps || 30;
    return {
      title: `Scene ${sc.index} — ${sc.name || ""} (${sc.seconds}s)`,
      obj: {
        version: full.version,
        schema: full.schema,
        intent: full.intent,
        consistency: full.consistency,
        global: {
          ...full.global,
          audio: {
            ...(full.global?.audio ?? {}),
            voiceover: { ...(full.global?.audio?.voiceover ?? {}), enabled: true },
          },
        },
        characters: full.characters,
        narrative: { total_seconds: Number(sc.seconds || 0) },
        output: {
          ...(full.output ?? {}),
          duration_seconds: Number(sc.seconds || 0),
          frames: fps * Number(sc.seconds || 0),
        },
        vendor: {
          ...full.vendor,
          canva: {
            ...(full.vendor?.canva ?? {}),
            magic_studio: {
              ...(full.vendor?.canva?.magic_studio ?? {}),
              voiceover_generate: true,
            },
          },
        },
        scenes: [sc],
      },
    };
  });
}

export default function SmartLarasCinematicPro() {
  const [style, setStyle] = useState<StyleKey>("Cartoon");
  const [resolution, setResolution] = useState<"4K" | "8K">("4K");
  const [fps, setFps] = useState<30 | 60>(30);
  const [aspect, setAspect] = useState<typeof ARS[number]>("16:9");
  const [mix, setMix] = useState<MixProfile>("film");
  const [scenes, setScenes] = useState<number>(6);
  const [instruction, setInstruction] = useState(
    "Buat film kartun 2 menit tentang anak kucing yang belajar berbagi mainan; ceria, ramah anak, 16:9."
  );
  const [modeAman, setModeAman] = useState(true);

  const [characters, setCharacters] = useState<Character[]>([
    {
      display_name: "Milo",
      role: "Protagonist",
      age: "6",
      gender: "other",
      facial_features: "mata besar ceria",
      hair: "bulu halus oren",
      clothing: "kaos biru",
      accessories: "kalung lonceng",
      character_id: rid("char"),
    },
  ]);

  const [jsonOut, setJsonOut] = useState<string>("");
  const [perScene, setPerScene] = useState<Array<{ title: string; obj: any }>>(
    []
  );
  const [busy, setBusy] = useState<"idle" | "local" | "ai">("idle");
  const [error, setError] = useState<string>("");

  // load & save localStorage
  useEffect(() => {
    const raw = localStorage.getItem("laras_state_v2_5_split");
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      setStyle(s.style ?? style);
      setResolution(s.resolution ?? resolution);
      setFps(s.fps ?? fps);
      setAspect(s.aspect ?? aspect);
      setMix(s.mix ?? mix);
      setScenes(s.scenes ?? scenes);
      setInstruction(s.instruction ?? instruction);
      setModeAman(Boolean(s.modeAman));
      if (Array.isArray(s.characters)) setCharacters(s.characters);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const snapshot = {
      style,
      resolution,
      fps,
      aspect,
      mix,
      scenes,
      instruction,
      modeAman,
      characters,
    };
    localStorage.setItem("laras_state_v2_5_split", JSON.stringify(snapshot));
  }, [style, resolution, fps, aspect, mix, scenes, instruction, modeAman, characters]);

  const lang = useMemo(() => detectLanguage(instruction), [instruction]);
  const totalSec = useMemo(
    () => pickDurationSeconds(instruction, 120),
    [instruction]
  );
  const fpsNum = fps === 60 ? 60 : 30;

  function distribute(n: number, total: number) {
    const weights = [0.12, 0.18, 0.2, 0.2, 0.18, 0.12];
    const base = Array.from({ length: n }, (_, i) => weights[i % 6]);
    const sum = base.reduce((a, b) => a + b, 0);
    return base.map((w) => Math.max(3, Math.round((w / sum) * total)));
  }
  function safetyLists(enabled: boolean) {
    if (!enabled)
      return {
        do: ["alur natural", "transisi halus", "ekspresi sesuai emosi", "proporsi wajah konsisten"],
        dont: ["distorsi", "noise berat", "glitch teks"],
      };
    return {
      do: ["ramah anak", "hindari jumpscare", "tone positif", "ekspresi lembut", "transisi halus"],
      dont: ["kekerasan", "darah", "tema dewasa", "bahasa kasar", "hewan tersakiti"],
    };
  }

  const CAMERA_PALETTE = [
    { angle: "wide", movement: "crane down, dolly-in", lens: "30mm toon", dof: "deep", framing: "establishing" },
    { angle: "medium", movement: "tracking", lens: "35mm", dof: "medium", framing: "OTS" },
    { angle: "close-up", movement: "dolly-in", lens: "85mm", dof: "very shallow", framing: "portrait" },
    { angle: "low angle", movement: "dolly-zoom", lens: "50mm", dof: "shallow", framing: "hero" },
    { angle: "medium", movement: "handheld subtle", lens: "35mm", dof: "medium", framing: "dialogue" },
    { angle: "bird view", movement: "drone", lens: "24mm", dof: "deep", framing: "top" },
  ];

  function buildLocalDraft(): LarasJSON {
    const profile = STYLE_PROFILES[style];
    const designId = rid("design");
    const seed = String(Math.floor(Math.random() * 1_000_000));
    const seconds = distribute(scenes, totalSec);
    const safe = safetyLists(modeAman);

    const scenesArr = Array.from({ length: scenes }, (_, i) => {
      const cam = CAMERA_PALETTE[i % CAMERA_PALETTE.length];
      return {
        index: i + 1,
        name: ["Intro", "Build Up", "Conflict", "Climax", "Resolution", "Outro"][i] || `Scene ${i + 1}`,
        seconds: seconds[i],
        continuity: { characters: characters.map((c) => ({ ref: c.character_id, visible: true })) },
        camera: cam,
        environment: { location: "taman bermain ceria", weather: "cerah", textures: ["rumput hijau","langit biru","awan lembut"], props: ["mainan","ayunan","ember pasir"] },
        lighting: { key: "soft warm", fill: "gentle", rim: "subtle", volumetric: true },
        action: "Gerakan natural (napas, kedipan, kain/bulu bergerak).",
        expressions: "selaras emosi adegan",
        gestures: ["wave","head nod","eye blink"],
        lipsync: "dialogue",
        dialogue: "(Scene) Narator menjelaskan dengan emosi sesuai adegan.",
        music_cue: "playful / comedy light",
        sfx: ["soft steps","toy squeak","slide whistle","ambient park"],
        micro_details: ["bunga bergoyang","awan bergerak","kilau matahari lembut"],
      };
    });

    return {
      version: "2.5",
      schema: "laras.prompt",
      intent: "cinematic_storytelling",
      consistency: { lock: true, design_id: designId, seed, look_lock: { face: true, body: true, clothes: true, colors: true } },
      global: {
        style: { profile: style, grading: profile.grading, palette: profile.palette, lens_default: profile.lens_default },
        audio: { mix_profile: mix, music_global: profile.music_global, sfx_global: profile.sfx_global, voiceover: { language: lang, tone: "ekspresif", pace: "±110–125 wpm" } },
        safety: safe,
        output: { resolution: resolution === "8K" ? "7680x4320" : "3840x2160", fps: fpsNum, container: "mp4", audio_channels: "stereo" },
      },
      characters,
      scenes: scenesArr,
      narrative: { logline: "Film kartun multi-adegan sinematik.", total_seconds: totalSec },
      output: { mode: "video", aspect_ratio: aspect, fps: fpsNum, duration_seconds: totalSec, frames: fpsNum * totalSec, subtitles: { enabled: true, language: lang }, transparent_background: instruction.toLowerCase().includes("green") },
      vendor: { canva: { magic_studio: { strict_face_lock: true, geometry_consistency: "ultra", color_consistency: "ultra", cinematic_mode: true, voiceover_generate: true } } },
    };
  }

  function refreshPerSceneFromFull(fullObj: any) {
    let full = fullObj;
    if ((!full?.scenes || !full.scenes.length) && full?.narrative?.beats) {
      full = { ...full, scenes: full.narrative.beats.map((b: any, i: number) => ({ index: i + 1, name: b.label || `Scene ${i + 1}`, seconds: Math.max(3, Number(b.seconds || 6)), dialogue: b.dialogue || "" })) };
    }
    setPerScene(buildPerSceneJSONs(full));
  }

  async function generateLocal() {
    setError(""); setBusy("local");
    try { const draft = buildLocalDraft(); setJsonOut(JSON.stringify(draft, null, 2)); refreshPerSceneFromFull(draft); }
    catch (e: any) { setError(e?.message || "Local generator failed"); }
    finally { setBusy("idle"); }
  }
  async function generateWithAI() {
    setError(""); setBusy("ai");
    try { const draft = buildLocalDraft(); const { enhanced } = await enhanceWithAI({ instruction, draft }); const full = typeof enhanced === "string" ? JSON.parse(enhanced) : enhanced; setJsonOut(JSON.stringify(full, null, 2)); refreshPerSceneFromFull(full); }
    catch (e: any) { setError(e?.message || "AI Boost failed"); }
    finally { setBusy("idle"); }
  }

  function downloadTextAs(filename: string, content: string, type = "application/json") {
    const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <div className="mx-auto max-w-6xl p-4">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">SMART LARAS — Cinematic Pro+ v2.5 (Split ≤ 8s/scene)</h1>
            <p className="text-xs opacity-70">Per scene JSON terpisah & siap disalin. Scene otomatis dipecah jadi maksimal 8 detik.</p>
          </div>
          <div className="flex gap-2">
            <button disabled={!jsonOut} onClick={() => navigator.clipboard.writeText(jsonOut)} className="px-3 py-2 rounded-xl bg-white/10 disabled:opacity-40">Copy Full JSON</button>
            <button disabled={!jsonOut} onClick={() => downloadTextAs(`LARAS_FULL_${Date.now()}.json`, jsonOut)} className="px-3 py-2 rounded-xl bg-white/10 disabled:opacity-40">Download Full</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* LEFT: FORM */}
          <section className="rounded-2xl bg-[#0E1626] border border-white/10 p-4">
            <label className="block text-sm mb-2">Deskripsi / Instruksi
              <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={4} className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2" />
            </label>

            <div className="grid md:grid-cols-2 gap-3 mt-2">
              <label className="text-sm">
                <div className="mb-1 opacity-80">Style</div>
                <select value={style} onChange={(e)=>setStyle(e.target.value as StyleKey)} className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  <option>Marvel</option><option>Pixar</option><option>Anime</option><option>Cartoon</option><option>Real Film</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">Aspect</div>
                <select value={aspect} onChange={(e)=>setAspect(e.target.value as any)} className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  {ARS.map(a=><option key={a}>{a}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">Resolusi</div>
                <select value={resolution} onChange={(e)=>setResolution(e.target.value as any)} className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  <option value="4K">4K (3840x2160)</option>
                  <option value="8K">8K (7680x4320)</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">FPS</div>
                <select value={fps} onChange={(e)=>setFps(Number(e.target.value) as any)} className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  <option value={30}>30</option><option value={60}>60</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">Mix Profile</div>
                <select value={mix} onChange={(e)=>setMix(e.target.value as MixProfile)} className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  <option value="film">film</option><option value="podcast">podcast</option><option value="ads">ads</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">Jumlah Adegan (sebelum split)</div>
                <input type="number" min={3} max={12} value={scenes} onChange={(e)=>setScenes(Math.min(12,Math.max(3,Number(e.target.value))))} className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2"/>
              </label>
              <label className="text-sm flex items-center gap-2 mt-1">
                <input type="checkbox" checked={modeAman} onChange={(e)=>setModeAman(e.target.checked)} />
                <span>Mode Aman Canva</span>
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={generateLocal} disabled={busy!=="idle"} className="px-4 py-2 rounded-xl bg-emerald-600 disabled:opacity-50">{busy==="local"?"Generating...":"Generate (Lokal)"}</button>
              <button onClick={generateWithAI} disabled={busy!=="idle"} className="px-4 py-2 rounded-xl bg-indigo-600 disabled:opacity-50">{busy==="ai"?"Boosting...":"AI Boost Generate"}</button>
            </div>
            {error && <div className="mt-3 text-xs rounded-xl border border-rose-400 bg-rose-900/20 text-rose-200 p-3">{error}</div>}
          </section>

          {/* RIGHT: PER-SCENE JSON */}
          <section className="rounded-2xl bg-[#0E1626] border border-white/10 p-4">
            <h2 className="text-lg font-semibold mb-2">Per-Scene JSON (maks 8 detik per scene)</h2>
            {perScene.length===0 && <div className="rounded-xl bg-[#0B1220] border border-white/10 p-3 text-xs opacity-70">Belum ada output. Tekan <b>Generate</b> dulu.</div>}
            <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
              {perScene.map((it, idx) => { const jsonStr = JSON.stringify(it.obj, null, 2);
                return (
                  <div key={idx} className="rounded-xl bg-[#0B1220] border border-white/10">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                      <div className="text-xs font-semibold">{it.title}</div>
                      <div className="flex gap-2">
                        <button onClick={()=>navigator.clipboard.writeText(jsonStr)} className="text-xs px-2 py-1 rounded bg-white/10">Copy</button>
                        <button onClick={()=>downloadTextAs(`scene_${String(idx+1).padStart(2,"0")}.json`, jsonStr)} className="text-xs px-2 py-1 rounded bg-white/10">Download</button>
                      </div>
                    </div>
                    <pre className="text-[11px] whitespace-pre-wrap p-3">{jsonStr}</pre>
                  </div>
                ); })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
