import React, { useMemo, useRef, useState } from "react";
import CharacterForm from "./CharacterForm";
import ObjectForm, { UIObject } from "./ObjectForm";
import { downloadText, buildPerSceneTextPrompt, drawStoryboardToCanvasAndDownload } from "../lib/exporters";
import { buildAnatomy, buildWardrobe, buildPhysiology, buildEnvironment, buildMicroFX } from "../lib/deepDetail";
import ThemeToggle from "./ThemeToggle";

type StyleProfile = "Marvel" | "Pixar" | "Anime" | "Cartoon" | "Real Film";

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function rid(prefix: string) { return prefix + "_" + Math.random().toString(36).slice(2,10); }

export default function SmartLarasCinematicPro() {
  const [instruction, setInstruction] = useState("Buat film kartun 2 menit tentang Milo, anak kucing oranye ceria di taman bermain.");
  const [style, setStyle] = useState<StyleProfile>("Cartoon");
  const [durationSec, setDurationSec] = useState<number>(120);
  const [aspect, setAspect] = useState<string>("16:9");

  const [characters, setCharacters] = useState<any[]>([
    {
      display_name: "Milo",
      role: "Protagonist",
      character_id: rid("char"),
      age: "6",
      gender: "other",
      design: "anak kucing kartun",
      facial_features: "mata besar ceria",
      eyes: "hijau",
      hair: "bulu halus oren",
      clothing: "kaos biru",
      accessories: "kalung lonceng",
      expression: "ceria"
    }
  ]);
  const [objects, setObjects] = useState<UIObject[]>([]);

  const [fullJson, setFullJson] = useState<string>("");
  const [perScene, setPerScene] = useState<Array<{ title: string; obj: any }>>([]);
  const [error, setError] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  function splitDuration(totalSec: number): number[] {
    const maxPer = 8;
    const out: number[] = [];
    let remain = clamp(totalSec, 1, 600);
    while (remain > 0) {
      const take = Math.min(maxPer, remain);
      out.push(take);
      remain -= take;
    }
    return out;
  }

  function presetApply(p: StyleProfile) {
    setStyle(p);
    if (p === "Marvel") setInstruction("Buat film gaya Marvel 60 detik: bocah pahlawan di kebun binatang futuristik.");
    if (p === "Pixar") setInstruction("Buat film gaya Pixar 60 detik: pemandu anak lucu di kebun binatang ceria.");
    if (p === "Anime") setInstruction("Buat film gaya Anime 60 detik: pahlawan kecil di kebun binatang ajaib.");
    if (p === "Cartoon") setInstruction("Buat film kartun 60 detik: anak kucing ceria bermain di taman.");
    if (p === "Real Film") setInstruction("Buat film realis 60 detik: pemandu tur di kebun binatang modern.");
  }

  function detectLang(s: string): "id-ID" | "en-US" {
    const low = s.toLowerCase();
    if (low.indexOf(" yang ") >= 0 || low.indexOf(" anak ") >= 0 || low.indexOf("buat ") === 0) return "id-ID";
    return "en-US";
  }

  function genStory() {
    setError("");
    try {
      const lang = detectLang(instruction);
      const sec = clamp(durationSec || 60, 10, 600);
      const fps = 30;

      const anatomy = buildAnatomy({});
      const wardrobe = buildWardrobe({});
      const physio = buildPhysiology({});
      const env = buildEnvironment({});
      const microfx = buildMicroFX(style);

      const base: any = {
        version: "2.6",
        schema: "laras.prompt",
        intent: "cinematic_storytelling",
        consistency: {
          lock: true,
          design_id: rid("design"),
          seed: String(Math.floor(Math.random() * 1000000)),
          look_lock: { face: true, body: true, clothes: true, colors: true }
        },
        global: {
          style: {
            profile: style,
            grading: style === "Marvel" ? "epic high contrast" :
                     style === "Pixar" ? "warm vivid friendly" :
                     style === "Anime" ? "pastel + sharp line" :
                     style === "Real Film" ? "cinematic neutral" : "vivid saturation, playful contrast",
            palette: [
              { name: "primary", value: "#3B82F6" },
              { name: "accent", value: "#F59E0B" },
              { name: "joy", value: "#10B981" }
            ],
            lens_default: style === "Real Film" ? "35mm anamorphic" : "30mm toon"
          },
          audio: {
            mix_profile: "film",
            music_global: style === "Marvel" ? ["orchestral heroic"] :
                          style === "Pixar" ? ["playful orchestra"] :
                          style === "Anime" ? ["anime modern"] :
                          style === "Real Film" ? ["subtle cinematic"] : ["comedy light","quirky mallets"],
            sfx_global: ["ambient park","soft steps","toy squeak"],
            voiceover: {
              language: lang,
              tone: "narasi anak jelas, ekspresif, sesuai emosi",
              pace: "110-125 wpm (sesuaikan durasi)"
            }
          },
          safety: {
            do: ["ramah anak","hindari jumpscare","tone positif","ekspresi lembut","transisi halus"],
            dont: ["kekerasan","darah","tema dewasa","bahasa kasar","hewan tersakiti"]
          },
          output: { resolution: "3840x2160", fps: fps, container: "mp4", audio_channels: "stereo" },
          microfx: microfx
        },
        characters: characters,
        anatomy: anatomy,
        wardrobe: wardrobe,
        physiology: physio,
        environment_default: env,
        narrative: { total_seconds: sec }
      };

      const chunks = splitDuration(sec);
      const scenes: any[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const sDur = chunks[i];
        scenes.push({
          index: i + 1,
          name: i === 0 ? "Intro" : (i === chunks.length - 1 ? "Outro" : "Scene " + String(i + 1)),
          seconds: sDur,
          continuity: { characters: [{ ref: characters[0] && characters[0].character_id, visible: true, notes: "keep outfit/logo/colors" }] },
          camera: { angle: i === 0 ? "wide" : "medium", movement: i === 0 ? "crane down, dolly-in" : "tracking", lens: base.global.style.lens_default, dof: "deep", framing: i === 0 ? "establishing" : "standard" },
          environment: { location: "taman bermain ceria", weather: "cerah", textures: ["rumput hijau","langit biru","awan lembut"], props: ["mainan","ayunan","ember pasir"] },
          lighting: { key: "soft warm", fill: "gentle", rim: "subtle", volumetric: true },
          action: i === 0 ? "Perkenalan suasana dan karakter utama." : (i === chunks.length - 1 ? "Penutup ramah dan lambaian." : "Aksi ringan sesuai alur."),
          expressions: "ceria",
          gestures: ["wave","head nod","eye blink"],
          lipsync: "dialogue",
          dialogue: i === 0 ? "Narator: Di taman bermain yang ceria, hiduplah seekor anak kucing bernama Milo." :
                    (i === chunks.length - 1 ? "Narator: Sampai jumpa di petualangan berikutnya!" : "Narator: Milo bermain dan belajar hal baru."),
          music_cue: style === "Marvel" ? "heroic light" : (style === "Real Film" ? "subtle underscore" : "playful"),
          sfx: ["ambient park","soft steps"],
          micro_details: ["bunga bergoyang","awan bergerak","kilau matahari lembut"]
        });
      }
      base.scenes = scenes;

      setFullJson(JSON.stringify(base, null, 2));

      const per: Array<{ title: string; obj: any }> = [];
      for (let j = 0; j < scenes.length; j++) {
        per.push({
          title: "scene_" + String(j + 1) + ".json",
          obj: {
            version: base.version,
            schema: base.schema,
            intent: base.intent,
            consistency: base.consistency,
            global: base.global,
            characters: base.characters,
            narrative: { total_seconds: scenes[j].seconds },
            scenes: [ scenes[j] ]
          }
        });
      }
      setPerScene(per);
    } catch (e: any) {
      setError(e && e.message ? e.message : "Unknown error");
    }
  }

  function exportAllSceneVO(format: "txt" | "md") {
    if (!perScene.length) return;
    const ext = format === "txt" ? ".txt" : ".md";
    for (let i = 0; i < perScene.length; i++) {
      const sObj = perScene[i].obj;
      const sc = Array.isArray(sObj && sObj.scenes) ? sObj.scenes[0] : (sObj && sObj.scenes);
      if (!sc) continue;
      const who = (sObj.characters && sObj.characters[0] && sObj.characters[0].display_name) || "Narator";
      const dial = (sc.dialogue || "").replace(/^["“”]+|["“”]+$/g, "");
      const text = format === "txt"
        ? ("Scene " + String(i + 1) + " — Durasi " + String(sc.seconds || 0) + "s\n" + (dial ? ("Dialog (" + who + "): " + dial) : ""))
        : ("# Scene " + String(i + 1) + "\n\n- Durasi: " + String(sc.seconds || 0) + " detik\n- Dialog (" + who + "): " + (dial || "-") + "\n");
      downloadText(perScene[i].title.replace(".json", ext), text, "text/plain");
    }
  }

  function exportAllSceneTextPrompt() {
    if (!perScene.length) return;
    for (let i = 0; i < perScene.length; i++) {
      const sObj = perScene[i].obj;
      const prompt = buildPerSceneTextPrompt(sObj);
      downloadText(perScene[i].title.replace(".json", "_prompt.txt"), prompt, "text/plain");
    }
  }

  function exportStoryboardPNG() {
    const scenes = perScene.map(function(ps){ return (ps.obj && ps.obj.scenes && ps.obj.scenes[0]) || null; }).filter(function(x){return !!x;});
    drawStoryboardToCanvasAndDownload({
      canvasRef: canvasRef,
      title: "Storyboard",
      scenes: scenes,
      aspect: aspect
    });
  }

  return (
    <div className="min-h-screen theme-abstract text-neutral-900 dark:text-white">
      <div className="mx-auto max-w-6xl p-6">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between card px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-fuchsia-500"></div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">SMART LARAS — Cinematic Pro+</h1>
              <p className="text-xs md:text-sm text-muted">
                Auto split per scene (maks 8 detik), export VO (.txt/.md), prompt per scene, dan storyboard PNG.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Controls */}
        <section className="card p-4 mb-4">
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="badge border-black/10 dark:border-white/15">Preset:</span>
            <button onClick={function(){presetApply("Marvel");}} className="btn btn-ghost">Marvel</button>
            <button onClick={function(){presetApply("Pixar");}} className="btn btn-ghost">Pixar</button>
            <button onClick={function(){presetApply("Anime");}} className="btn btn-ghost">Anime</button>
            <button onClick={function(){presetApply("Cartoon");}} className="btn btn-ghost">Cartoon</button>
            <button onClick={function(){presetApply("Real Film");}} className="btn btn-ghost">Real Film</button>
          </div>

          <label className="block text-sm mb-2">
            <span className="text-neutral-700 dark:text-slate-200">Perintah pengguna</span>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 bg-white/80 dark:bg-slate-900/60 border-black/10 dark:border-white/10"
              rows={3}
              value={instruction}
              onChange={function(e){setInstruction(e.target.value);}}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-sm">
              <div>Durasi (detik)</div>
              <input type="number" min={10} max={600} value={durationSec} onChange={function(e){ setDurationSec(parseInt(e.target.value||"60",10)); }} className="w-full rounded-xl border px-3 py-2 bg-white/80 dark:bg-slate-900/60 border-black/10 dark:border-white/10"/>
            </label>
            <label className="text-sm">
              <div>Gaya</div>
              <select value={style} onChange={function(e){ setStyle(e.target.value as StyleProfile); }} className="w-full rounded-xl border px-3 py-2 bg-white/80 dark:bg-slate-900/60 border-black/10 dark:border-white/10">
                <option>Marvel</option>
                <option>Pixar</option>
                <option>Anime</option>
                <option>Cartoon</option>
                <option>Real Film</option>
              </select>
            </label>
            <label className="text-sm">
              <div>Aspect</div>
              <select value={aspect} onChange={function(e){ setAspect(e.target.value); }} className="w-full rounded-xl border px-3 py-2 bg-white/80 dark:bg-slate-900/60 border-black/10 dark:border-white/10">
                <option>16:9</option>
                <option>9:16</option>
                <option>1:1</option>
                <option>2.35:1</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={genStory} className="btn btn-primary">Generate</button>
            <button onClick={function(){ if(fullJson) navigator.clipboard.writeText(fullJson); }} disabled={!fullJson} className="btn btn-ghost disabled:opacity-40">Copy Full JSON</button>
            <button onClick={function(){exportAllSceneVO("txt");}} disabled={!perScene.length} className="btn btn-ghost disabled:opacity-40">Export VO .txt</button>
            <button onClick={function(){exportAllSceneVO("md");}} disabled={!perScene.length} className="btn btn-ghost disabled:opacity-40">Export VO .md</button>
            <button onClick={exportAllSceneTextPrompt} disabled={!perScene.length} className="btn btn-ghost disabled:opacity-40">Export Prompt per Scene</button>
            <button onClick={exportStoryboardPNG} disabled={!perScene.length} className="btn btn-ghost disabled:opacity-40">Generate Storyboard (PNG)</button>
          </div>

          {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
        </section>

        {/* Per-Scene */}
        <section className="card p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Per-Scene JSON (maks 8 detik/scene)</h2>
          {!perScene.length ? <div className="text-sm text-muted">Belum ada. Klik Generate dulu.</div> : null}
          <div className="grid md:grid-cols-2 gap-3">
            {perScene.map(function(ps){
              const content = JSON.stringify(ps.obj, null, 2);
              return (
                <div key={ps.title} className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                  <div className="px-3 py-2 flex items-center justify-between bg-black/[0.03] dark:bg-white/[0.06]">
                    <div className="font-semibold text-sm">{ps.title}</div>
                    <div className="flex gap-2">
                      <button onClick={function(){ navigator.clipboard.writeText(content); }} className="btn btn-primary">Copy</button>
                      <button onClick={function(){
                        const blob = new Blob([content], {type: "application/json"});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = ps.title;
                        document.body.appendChild(a); a.click(); a.remove();
                        URL.revokeObjectURL(url);
                      }} className="btn btn-ghost">Download</button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs bg-neutral-900 text-neutral-100 p-3 max-h-64 overflow-auto">{content}</pre>
                </div>
              );
            })}
          </div>
        </section>

        {/* Full JSON */}
        <section className="card p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Full JSON (gabungan)</h2>
          <pre className="whitespace-pre-wrap text-xs bg-neutral-900 text-neutral-100 p-4 rounded-2xl overflow-auto max-h-[50vh]">{fullJson || "// Belum ada. Klik Generate."}</pre>
        </section>

        {/* Hidden canvas for storyboard */}
        <canvas ref={canvasRef} width={1800} height={1200} style={{display:"none"}} />
      </div>
    </div>
  );
}