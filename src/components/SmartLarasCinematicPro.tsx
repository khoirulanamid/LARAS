import React, { useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { aiBoostGenerate } from "../lib/aiClient";
import { downloadText, buildPerSceneTextPrompt, drawStoryboardToCanvasAndDownload } from "../lib/exporters";

type StyleProfile = "Marvel" | "Pixar" | "Anime" | "Cartoon" | "Real Film";

export default function SmartLarasCinematicPro() {
  const [instruction, setInstruction] = useState(
    "Buat film 120 detik bergaya Pixar tentang pemandu ceria yang mengenalkan hewan di kebun binatang futuristik. Karakter utama baru (bukan Milo), sangat detail DNA & konsisten."
  );
  const [style, setStyle] = useState<StyleProfile>("Pixar");
  const [durationSec, setDurationSec] = useState<number>(120);
  const [aspect, setAspect] = useState<string>("16:9");

  const [fullJson, setFullJson] = useState<string>("");
  const [perScene, setPerScene] = useState<Array<{ title: string; obj: any }>>([]);
  const [error, setError] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  function presetApply(p: StyleProfile) {
    setStyle(p);
    setInstruction(
      p === "Marvel"
        ? "Buat film 90 detik gaya Marvel. Pahlawan anak memandu tur kebun binatang futuristik. Karakter utama baru sangat detail (DNA), epik."
        : p === "Pixar"
        ? "Buat film 120 detik gaya Pixar. Pemandu ceria memandu hewan favoritnya. Karakter utama baru sangat detail (DNA), ramah anak."
        : p === "Anime"
        ? "Buat film 90 detik gaya Anime. Pahlawan kecil memandu tur kebun binatang magis. Karakter utama baru sangat detail (DNA)."
        : p === "Real Film"
        ? "Buat film 60 detik real-film. Presenter memandu studio satwa. Karakter utama baru sangat detail (DNA), fotorealistik."
        : "Buat film 60 detik kartun. Pemandu ceria memandu hewan lucu. Karakter utama baru sangat detail (DNA)."
    );
  }

  async function generateAI() {
    setError("");
    try {
      const obj = await aiBoostGenerate(instruction, durationSec, style);

      obj.global = obj.global || {}; obj.global.output = obj.global.output || {};
      obj.global.output.aspect_ratio = aspect; obj.global.output.transparent_background = false;

      setFullJson(JSON.stringify(obj, null, 2));

      const per: Array<{ title: string; obj: any }> = [];
      for (let i = 0; i < obj.scenes.length; i++) {
        const s = obj.scenes[i];
        per.push({
          title: scene_${i + 1}.json,
          obj: {
            version: obj.version,
            schema: obj.schema,
            intent: obj.intent,
            session_id: obj.session_id,
            consistency: obj.consistency,
            global: obj.global,
            characters: obj.characters,
            narrative: { total_seconds: s.seconds || 0 },
            scenes: [s],
          },
        });
      }
      setPerScene(per);
    } catch (e: any) {
      setError(e?.message || "Gagal AI Generate.");
    }
  }

  function exportVO(format: "txt" | "md") {
    if (!perScene.length) return;
    const ext = format === "txt" ? ".txt" : ".md";
    for (let i = 0; i < perScene.length; i++) {
      const sObj = perScene[i].obj;
      const sc = Array.isArray(sObj?.scenes) ? sObj.scenes[0] : sObj?.scenes; if (!sc) continue;
      const who = sObj?.characters?.[0]?.display_name || "Narator";
      const dial = (sc.dialogue || "").replace(/^["“”]+|["“”]+$/g, "");
      const text = format === "txt"
        ? Scene ${i + 1} — Durasi ${sc.seconds || 0}s\nDialog (${who}): ${dial || ""}
        : # Scene ${i + 1}\n\n- Durasi: ${sc.seconds || 0} detik\n- Dialog (${who}): ${dial || "-"}\n;
      downloadText(perScene[i].title.replace(".json", ext), text, "text/plain");
    }
  }

  function exportPrompts() {
    for (let i = 0; i < perScene.length; i++) {
      const sObj = perScene[i].obj;
      const prompt = buildPerSceneTextPrompt(sObj);
      downloadText(perScene[i].title.replace(".json", "_prompt.txt"), prompt, "text/plain");
    }
  }

  function exportStoryboard() {
    const scenes = perScene.map((ps) => ps.obj?.scenes?.[0]).filter(Boolean);
    drawStoryboardToCanvasAndDownload({ canvasRef, title: "Storyboard", scenes, aspect });
  }

  return (
    <div className="min-h-screen theme-abstract text-neutral-900 dark:text-white">
      <div className="mx-auto max-w-6xl p-6">
        <header className="mb-5 flex items-center justify-between card px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="hero-dot"></div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">SMART LARAS — Cinematic Pro+ (AI-only)</h1>
              <p className="text-xs md:text-sm text-muted">AI dengan Character DNA + Style Bible. Per-scene JSON (≤8s), VO export, storyboard PNG.</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <section className="card p-4 mb-4">
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="text-sm text-muted">Preset gaya:</span>
            <button onClick={() => presetApply("Marvel")} className="btn btn-ghost">Marvel</button>
            <button onClick={() => presetApply("Pixar")} className="btn btn-ghost">Pixar</button>
            <button onClick={() => presetApply("Anime")} className="btn btn-ghost">Anime</button>
            <button onClick={() => presetApply("Cartoon")} className="btn btn-ghost">Cartoon</button>
            <button onClick={() => presetApply("Real Film")} className="btn btn-ghost">Real Film</button>
          </div>

          <label className="block text-sm mb-2">
            <span>Perintah pengguna</span>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2"
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="text-sm">
              <div>Durasi (detik)</div>
              <input type="number" min={10} max={600} value={durationSec} onChange={(e)=>setDurationSec(parseInt(e.target.value||"60",10))} className="w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="text-sm">
              <div>Gaya</div>
              <select value={style} onChange={(e)=>setStyle(e.target.value as StyleProfile)} className="w-full rounded-xl border px-3 py-2">
                <option>Marvel</option><option>Pixar</option><option>Anime</option><option>Cartoon</option><option>Real Film</option>
              </select>
            </label>
            <label className="text-sm">
              <div>Aspect</div>
              <select value={aspect} onChange={(e)=>setAspect(e.target.value)} className="w-full rounded-xl border px-3 py-2">
                <option>16:9</option><option>9:16</option><option>1:1</option><option>2.35:1</option>
              </select>
            </label>
            <div className="flex items-end">
              <button onClick={generateAI} className="btn btn-primary w-full">AI Boost Generate</button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={()=>{ if(fullJson) navigator.clipboard.writeText(fullJson); }} disabled={!fullJson} className="btn btn-ghost disabled:opacity-40">Copy Full JSON</button>
            <button onClick={()=>exportVO("txt")} disabled={!perScene.length} className="btn btn-ghost disabled:opacity-40">Export VO .txt</button>
            <button onClick={()=>exportVO("md")} disabled={!perScene.length} className="btn btn-ghost disabled:opacity-40">Export VO .md</button>
            <button onClick={exportPrompts} disabled={!perScene.length} className="btn btn-ghost disabled:opacity-40">Export Prompt per Scene</button>
            <button onClick={exportStoryboard} disabled={!perScene.length} className="btn btn-ghost disabled:opacity-40">Generate Storyboard (PNG)</button>
          </div>

          {error ? <div className="mt-3 text-sm" style={{color:'#ef4444'}}>{error}</div> : null}
        </section>

        <section className="card p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Per-Scene JSON (≤8 detik/scene)</h2>
          {!perScene.length && <div className="text-sm text-muted">Belum ada. Klik AI Boost Generate.</div>}
          <div className="grid md:grid-cols-2 gap-3">
            {perScene.map((ps) => {
              const content = JSON.stringify(ps.obj, null, 2);
              return (
                <div key={ps.title} className="rounded-xl border" style={{borderColor:'var(--border)'}}>
                  <div className="px-3 py-2 flex items-center justify-between" style={{background:'rgba(0,0,0,.03)'}}>
                    <div className="font-semibold text-sm">{ps.title}</div>
                    <div className="flex gap-2">
                      <button onClick={()=>navigator.clipboard.writeText(content)} className="btn btn-primary">Copy</button>
                      <button onClick={()=>{ const blob = new Blob([content],{type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=ps.title; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }} className="btn btn-ghost">Download</button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs" style={{background:'#0f172a', color:'#e5e7eb', padding:'12px', maxHeight:'260px', overflow:'auto'}}>{content}</pre>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Full JSON (gabungan)</h2>
          <pre className="whitespace-pre-wrap text-xs" style={{background:'#0f172a', color:'#e5e7eb', padding:'16px', borderRadius:'12px', maxHeight:'50vh', overflow:'auto'}}>{fullJson || "// Belum ada. Klik AI Boost Generate."}</pre>
        </section>

        <canvas ref={canvasRef} width={1800} height={1200} style={{ display: "none" }} />
      </div>
    </div>
  );
}
