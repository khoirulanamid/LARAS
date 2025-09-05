import React, { useMemo, useState, useEffect, useRef } from "react";
import { enhanceWithAI } from "../lib/aiClient";
import { STYLE_PROFILES, StyleKey } from "../lib/spec";
import type { LarasJSON } from "../types";
import CharacterForm, { UICharacter } from "./CharacterForm";
import ObjectForm, { UIObject, flattenObjectsToEnv } from "./ObjectForm";
import {
  buildPerSceneTextPrompt,
  buildGlobalVOText,
  buildSceneVOText,
  downloadText,
  drawStoryboardToCanvasAndDownload,
} from "../lib/exporters";
import {
  buildAnatomy,
  buildWardrobe,
  buildPhysiology,
  buildEnvironment,
  buildMicroFX,
} from "../lib/deepDetail";

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
        vendor: full.vendor,
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

  const [characters, setCharacters] = useState<UICharacter[]>([
    {
      display_name: "Milo",
      role: "Protagonist",
      age: "6",
      gender: "other",
      design: "anak kucing kartun orisinal",
      height_cm: 120,
      body_type: "child-proportion",
      skin_tone: "#F6C89F",
      eyes_shape: "large round",
      iris_color: "green",
      pupil_shape: "round",
      eyelashes: "subtle",
      eyebrows_shape: "soft arc",
      hair_style: "short",
      hair_length: "short",
      hair_color: "orange ginger",
      fingernails: "short clean",
      toenails: "clean",
      top_type: "t-shirt", top_color: "#2563EB", top_color_detail: "cool blue highlights", top_material: "cotton knit", top_texture: "fine weave", top_fit: "relaxed",
      bottom_type: "shorts", bottom_color: "#F59E0B", bottom_color_detail: "warm amber", bottom_material: "cotton twill", bottom_texture: "subtle twill",
      footwear_type: "sneakers", footwear_color: "#FFFFFF", footwear_material: "canvas",
      accessories: "small bell collar",
      breathing_style: "calm", gait_style: "playful run & hop", speech_style: "cheerful child",
      character_id: rid("char"),
    },
  ]);

  // NEW: Objects (props/flora/fauna/effect/sfx/particles)
  const [objects, setObjects] = useState<UIObject[]>([
    { id: rid("obj"), kind: "prop", name: "play ball", color: "red-white", material: "rubber", behavior: "bounces softly", sfx: "soft thump" },
    { id: rid("obj"), kind: "flora", name: "trees with soft leaves" },
    { id: rid("obj"), kind: "fauna", name: "small birds" },
  ]);

  const [jsonOut, setJsonOut] = useState<string>("");
  const [perScene, setPerScene] = useState<Array<{ title: string; obj: any }>>([]);
  const [busy, setBusy] = useState<"idle" | "local" | "ai">("idle");
  const [error, setError] = useState<string>("");

  // preset load
  useEffect(() => {
    const raw = localStorage.getItem("laras_preset_v26_ultra_obj");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      setStyle(p.style ?? style);
      setResolution(p.resolution ?? resolution);
      setFps(p.fps ?? fps);
      setAspect(p.aspect ?? aspect);
      setMix(p.mix ?? mix);
      setScenes(p.scenes ?? scenes);
      setInstruction(p.instruction ?? instruction);
      setModeAman(Boolean(p.modeAman));
      if (Array.isArray(p.characters)) setCharacters(p.characters);
      if (Array.isArray(p.objects)) setObjects(p.objects);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // preset save
  useEffect(() => {
    const snapshot = { style, resolution, fps, aspect, mix, scenes, instruction, modeAman, characters, objects };
    localStorage.setItem("laras_preset_v26_ultra_obj", JSON.stringify(snapshot));
  }, [style, resolution, fps, aspect, mix, scenes, instruction, modeAman, characters, objects]);

  const lang = useMemo(() => detectLanguage(instruction), [instruction]);
  const totalSec = useMemo(() => pickDurationSeconds(instruction, 120), [instruction]);
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

  function buildCharacters() {
    return characters.map((c) => {
      const anatomy = buildAnatomy({
        height_cm: c.height_cm,
        body_type: c.body_type,
        skin_tone: c.skin_tone,
        facial: {
          eyes: { shape: c.eyes_shape, iris_color: c.iris_color, pupil_shape: c.pupil_shape, eyelashes: c.eyelashes },
          eyebrows: { shape: c.eyebrows_shape, thickness: c.eyebrows_thickness },
          nose: { shape: c.nose_shape },
          mouth: { lip_shape: c.mouth_lip_shape, teeth: c.teeth_detail },
          ear: { shape: c.ear_shape },
        },
        hair: { style: c.hair_style, length: c.hair_length, color: c.hair_color },
        hands: { fingernails: c.fingernails },
        feet: { toenails: c.toenails },
      });
      const wardrobe = buildWardrobe({
        top: { type: c.top_type, color: c.top_color, color_detail: c.top_color_detail, material: c.top_material, texture: c.top_texture, fit: c.top_fit, pattern: c.top_pattern, trim: c.top_trim },
        bottom: { type: c.bottom_type, color: c.bottom_color, color_detail: c.bottom_color_detail, material: c.bottom_material, texture: c.bottom_texture, fit: c.bottom_fit, pattern: c.bottom_pattern, hem: c.bottom_hem },
        footwear: { type: c.footwear_type, color: c.footwear_color, material: c.footwear_material, sole: c.footwear_sole, laces: c.footwear_laces },
        accessories: c.accessories ? c.accessories.split(",").map(s=>s.trim()).filter(Boolean) : undefined,
      });
      const physiology = buildPhysiology({
        breathing: { style: c.breathing_style },
        gait: { style: c.gait_style },
        speech: { style: c.speech_style },
      });
      return {
        display_name: c.display_name,
        role: c.role,
        age: c.age,
        gender: c.gender,
        design: c.design,
        character_id: c.character_id,
        anatomy,
        wardrobe,
        physiology,
      };
    });
  }

  function buildLocalDraft(): LarasJSON {
    const profile = STYLE_PROFILES[style];
    const designId = rid("design");
    const seed = String(Math.floor(Math.random() * 1_000_000));
    const seconds = distribute(scenes, totalSec);
    const safe = safetyLists(modeAman);
    const charBlocks = buildCharacters();
    const microFX = buildMicroFX(style);

    // collect env extras from ObjectForm
    const envExtra = flattenObjectsToEnv(objects);

    const scenesArr = Array.from({ length: scenes }, (_, i) => {
      const cam = CAMERA_PALETTE[i % CAMERA_PALETTE.length];
      const envBase = buildEnvironment({});
      // merge env with extras
      const env = {
        ...envBase,
        flora: [...(envBase.flora||[]), ...envExtra.flora],
        fauna: [...(envBase.fauna||[]), ...envExtra.fauna],
        props: [...(envBase.props||[]), ...envExtra.props],
        ambient_sfx: [...(envBase.ambient_sfx||[]), ...envExtra.sfx],
        particles: [...(envBase.particles||[]), ...envExtra.particles],
      };

      return {
        index: i + 1,
        name: ["Intro", "Build Up", "Conflict", "Climax", "Resolution", "Outro"][i] || `Scene ${i + 1}`,
        seconds: seconds[i],
        continuity: {
          characters: charBlocks.map((c) => ({
            ref: c.character_id,
            visible: true,
            lock: ["face","body","clothes","colors"],
          })),
        },
        camera: cam,
        environment: env,
        lighting: env.lighting,
        action: "Natural body motion with secondary animation (hair/cloth).",
        expressions: "match scene emotion with micro expressions.",
        gestures: ["wave","head nod","eye blink","shoulder tilt subtle"],
        lipsync: "dialogue",
        dialogue: "(Scene) Narasi anak yang jelas dan ceria.",
        music_cue: i===0 ? "playful start" : i===scenes-1 ? "warm closing" : "light playful",
        sfx: [...(env.ambient_sfx||[])],
        micro_details: [...(env.particles||[]), ...microFX],
        physiology_overrides: {
          breathing: "visible but subtle chest motion on idle",
          gait: "footfall soft with slight shoe compression",
          facial_micro: ["blink cadence 3-5s", "micro-smile during positive lines"],
        },
      };
    });

    return {
      version: "2.6",
      schema: "laras.prompt",
      intent: "cinematic_storytelling",
      consistency: { lock: true, design_id: designId, seed, look_lock: { face: true, body: true, clothes: true, colors: true } },
      global: {
        style: { profile: style, grading: profile.grading, palette: profile.palette, lens_default: profile.lens_default },
        audio: { mix_profile: mix, music_global: profile.music_global, sfx_global: profile.sfx_global, voiceover: { language: lang, tone: "jelas & ceria", pace: "±110–125 wpm" } },
        safety: safe,
        output: { resolution: resolution === "8K" ? "7680x4320" : "3840x2160", fps: fpsNum, container: "mp4", audio_channels: "stereo" },
      },
      characters: charBlocks,
      scenes: scenesArr,
      narrative: { logline: "Film multi-adegan dengan detail anatomi, wardrobe, fisiologi, lingkungan & objek ultra detail.", total_seconds: totalSec },
      output: { mode: "video", aspect_ratio: aspect, fps: fpsNum, duration_seconds: totalSec, frames: fpsNum * totalSec, subtitles: { enabled: true, language: lang } },
      vendor: { canva: { magic_studio: { strict_face_lock: true, geometry_consistency: "ultra", color_consistency: "ultra", cinematic_mode: true } } },
    };
  }

  function refreshPerSceneFromFull(fullObj: any) {
    let full = fullObj;
    if ((!full?.scenes || !full.scenes.length) && full?.narrative?.beats) {
      full = { ...full, scenes: full.narrative.beats.map((b: any, i: number) => ({
        index: i + 1,
        name: b.label || `Scene ${i + 1}`,
        seconds: Math.max(3, Number(b.seconds || 6)),
        dialogue: b.dialogue || "" })) };
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  function generateStoryboardPNG() {
    const full = jsonOut ? JSON.parse(jsonOut) : buildLocalDraft();
    const scenesLocal = splitScenesMax8(full);
    drawStoryboardToCanvasAndDownload({ canvasRef, title: "Storyboard Ultra", scenes: scenesLocal, aspect });
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <div className="mx-auto max-w-6xl p-4">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">SMART LARAS — Cinematic Pro+ Ultra Detail v2.6 + Objects</h1>
            <p className="text-xs opacity-70">Ultra-detail anatomy, wardrobe, physiology, environment & objects. Split ≤ 8s/scene.</p>
          </div>
          <div className="flex gap-2">
            <button disabled={!jsonOut} onClick={() => navigator.clipboard.writeText(jsonOut)} className="px-3 py-2 rounded-xl bg-white/10 disabled:opacity-40">Copy Full JSON</button>
            <button disabled={!jsonOut} onClick={() => downloadText(`LARAS_FULL_${Date.now()}.json`, jsonOut, "application/json")} className="px-3 py-2 rounded-xl bg-white/10 disabled:opacity-40">Download Full</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* LEFT: FORM */}
          <section className="rounded-2xl bg-[#0E1626] border border-white/10 p-4 space-y-3">
            <label className="block text-sm">
              <div className="mb-1 opacity-80">Deskripsi / Instruksi</div>
              <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={4}
                className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2"
                placeholder="Ceritakan tujuan video, durasi (menit/detik), gaya, dsb." />
            </label>

            <div className="grid md:grid-cols-3 gap-3">
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
                  <option value="4K">4K</option><option value="8K">8K</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">FPS</div>
                <select value={fps} onChange={(e)=>setFps(Number(e.target.value) as any)} className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  <option value={30}>30</option><option value={60}>60</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">Mix</div>
                <select value={mix} onChange={(e)=>setMix(e.target.value as MixProfile)} className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                  <option value="film">film</option><option value="podcast">podcast</option><option value="ads">ads</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-1 opacity-80">Jumlah Adegan</div>
                <input type="number" min={3} max={12} value={scenes} onChange={(e)=>setScenes(Math.min(12,Math.max(3,Number(e.target.value))))}
                  className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2" />
              </label>
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={modeAman} onChange={(e)=>setModeAman(e.target.checked)} />
                <span>Mode Aman</span>
              </label>
            </div>

            <CharacterForm characters={characters} onChange={setCharacters} />
            <ObjectForm objects={objects} onChange={setObjects} />

            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={generateLocal} disabled={busy!=="idle"} className="px-4 py-2 rounded-xl bg-emerald-600 disabled:opacity-50">
                {busy==="local"?"Generating...":"Generate (Lokal)"}
              </button>
              <button onClick={generateWithAI} disabled={busy!=="idle"} className="px-4 py-2 rounded-xl bg-indigo-600 disabled:opacity-50">
                {busy==="ai"?"Boosting...":"AI Boost Generate"}
              </button>
              <button onClick={generateStoryboardPNG} className="px-4 py-2 rounded-xl bg-white/10">Generate Storyboard (PNG)</button>

              <button onClick={()=>{
                const full = jsonOut ? JSON.parse(jsonOut) : buildLocalDraft();
                downloadText(`VO_GLOBAL_${Date.now()}.txt`, buildGlobalVOText(full), "text/plain");
              }} className="px-4 py-2 rounded-xl bg-white/10">Export VO .txt</button>
              <button onClick={()=>{
                const full = jsonOut ? JSON.parse(jsonOut) : buildLocalDraft();
                downloadText(`VO_GLOBAL_${Date.now()}.md`, `# VO Script\n\n${buildGlobalVOText(full)}`, "text/markdown");
              }} className="px-4 py-2 rounded-xl bg-white/10">Export VO .md</button>
            </div>

            {error && <div className="mt-3 text-xs rounded-xl border border-rose-400 bg-rose-900/20 text-rose-200 p-3">{error}</div>}

            <canvas ref={canvasRef} width={1920} height={1080} className="hidden" />
          </section>

          {/* RIGHT: PER-SCENE JSON + actions */}
          <section className="rounded-2xl bg-[#0E1626] border border-white/10 p-4">
            <h2 className="text-lg font-semibold mb-2">Per-Scene (≤ 8s/scene)</h2>

            {perScene.length===0 && (
              <div className="rounded-xl bg-[#0B1220] border border-white/10 p-3 text-xs opacity-70">
                Belum ada output. Tekan <b>Generate</b> terlebih dahulu.
              </div>
            )}

            <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
              {perScene.map((it, idx) => {
                const jsonStr = JSON.stringify(it.obj, null, 2);
                const textPrompt = buildPerSceneTextPrompt(it.obj);
                const voTxt = buildSceneVOText(it.obj);
                return (
                  <div key={idx} className="rounded-xl bg-[#0B1220] border border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
                      <div className="text-xs font-semibold">{it.title}</div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={()=>navigator.clipboard.writeText(jsonStr)} className="text-xs px-2 py-1 rounded bg-white/10">Copy JSON</button>
                        <button onClick={()=>downloadText(`scene_${String(idx+1).padStart(2,"0")}.json`, jsonStr, "application/json")} className="text-xs px-2 py-1 rounded bg-white/10">Download JSON</button>

                        <button onClick={()=>navigator.clipboard.writeText(textPrompt)} className="text-xs px-2 py-1 rounded bg-white/10">Copy Prompt</button>
                        <button onClick={()=>downloadText(`scene_${String(idx+1).padStart(2,"0")}_prompt.txt`, textPrompt, "text/plain")} className="text-xs px-2 py-1 rounded bg-white/10">Prompt .txt</button>

                        <button onClick={()=>downloadText(`scene_${String(idx+1).padStart(2,"0")}_VO.txt`, voTxt, "text/plain")} className="text-xs px-2 py-1 rounded bg-white/10">VO .txt</button>
                        <button onClick={()=>downloadText(`scene_${String(idx+1).padStart(2,"0")}_VO.md`, `### Scene ${idx+1} VO\n\n${voTxt}`, "text/markdown")} className="text-xs px-2 py-1 rounded bg-white/10">VO .md</button>
                      </div>
                    </div>
                    <pre className="text-[11px] whitespace-pre-wrap p-3">{jsonStr}</pre>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
