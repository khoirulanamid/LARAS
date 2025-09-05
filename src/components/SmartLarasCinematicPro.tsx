import React, { useEffect, useState } from "react";
import CharacterForm, { Char } from "./CharacterForm";
import ObjectForm from "./ObjectForm";
import { aiGenerate } from "../lib/aiClient";
import { buildVOText, buildVOMarkdown, Scene } from "../lib/exporters";
import { savePreset, loadPreset } from "../lib/storage";

function stripCodeFence(s: string): string {
  const fenced = s.match(/[a-zA-Z]*\n([\s\S]*?)/);
  if (fenced) return fenced[1].trim();
  return s.trim();
}
function safeJSON<T=any>(txt: string, fallback: T): T {
  try { return JSON.parse(txt) as T; } catch { return fallback; }
}
function secondsFromText(input: string): number {
  const mMenit = input.toLowerCase().match(/(\d{1,3})\s*(menit|min|minute)/);
  const mDetik = input.toLowerCase().match(/(\d{1,3})\s*(detik|sec|seconds?)/);
  if (mMenit) return Math.min(600, Math.max(10, parseInt(mMenit[1]) * 60));
  if (mDetik) return Math.min(600, Math.max(10, parseInt(mDetik[1])));
  return 60;
}
function chunkScenes(totalSec: number, maxPerScene = 8) {
  const scenes: number[] = [];
  let left = totalSec;
  while (left > 0) {
    const s = Math.min(maxPerScene, left);
    scenes.push(s);
    left -= s;
  }
  return scenes;
}
function download(filename: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default function SmartLarasCinematicPro(){
  const [instruction, setInstruction] = useState<string>("Buat film kartun anak edukatif 1 menit tema kebun binatang ceria, ramah anak, positif.");
  const [style, setStyle] = useState<"Marvel"|"Pixar"|"Anime"|"Cartoon"|"Real Film">("Cartoon");
  const [aspect, setAspect] = useState<string>("16:9");
  const [chars, setChars] = useState<Char[]>([
    { id: "char_main", name: "Milo", role: "main", look: "anak kucing oranye, mata hijau besar, ekspresi ceria", outfit: "kaos biru dengan lonceng" }
  ]);
  const [objects, setObjects] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fullJSON, setFullJSON] = useState<any>(null);
  const [perScene, setPerScene] = useState<Array<{ title: string; obj: any }>>([]);
  const [voTxt, setVoTxt] = useState<string>("");
  const [voMd, setVoMd] = useState<string>("");

  useEffect(()=>{
    const loaded = loadPreset<any>("laras_preset", null);
    if (loaded){
      setInstruction(loaded.instruction ?? instruction);
      setStyle(loaded.style ?? style);
      setAspect(loaded.aspect ?? aspect);
      setChars(loaded.chars ?? chars);
      setObjects(loaded.objects ?? objects);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(()=>{
    savePreset("laras_preset", { instruction, style, aspect, chars, objects });
  }, [instruction, style, aspect, chars, objects]);

  function refreshPerSceneFromFull(fullObj: any) {
    const scenes: Scene[] = fullObj?.scenes ?? [];
    setPerScene(
      scenes.map((sc) => ({
        title: 'scene_${String(sc.index).padStart(2, "0")}_${(sc.name || "untitled").replace(/\s+/g, "_").slice(0,24)}',
        obj: sc
      }))
    );
    setVoTxt(buildVOText(scenes));
    setVoMd(buildVOMarkdown(scenes));
  }

  async function onGenerateAI(){
    setLoading(true); setError(""); setPerScene([]); setFullJSON(null);
    try{
      const totalSec = secondsFromText(instruction);
      const chunks = chunkScenes(totalSec, 8);
      const sys = [
        "Anda adalah perancang prompt video sinematik anak yang AMAN. Keluarkan JSON VALID (tanpa markdown, tanpa ```).",
        "Aturan:",
        "- Tema ramah anak, positif, edukatif. Hindari konten sensitif.",
        "- Bagi durasi menjadi beberapa scene, tiap scene <= 8 detik.",
        "- Konsistensi karakter (wajah/outfit/warna) di seluruh scene.",
        "- Sertakan detail kamera, aksi, ekspresi, lingkungan, musik, SFX.",
        "- Hasil akhir HANYA JSON (tanpa komentar).",
        "Skema: {version, schema, intent, global:{style,audio,output}, characters:[...], scenes:[{index,name,seconds,dialogue,action,expressions,camera,environment,lighting,music_cue,sfx}]}"
      ].join("\n");

      const user = JSON.stringify({
        request: { instruction, style, aspect, chunks, language: "id-ID" },
        characters: chars,
        objects
      });

      const raw = await aiGenerate(sys, user, {});
      const cleaned = stripCodeFence(raw);
      const parsed = safeJSON<any>(cleaned, null);
      if (!parsed || !parsed.scenes) throw new Error("AI tidak mengembalikan JSON scenes yang valid.");
      setFullJSON(parsed);
      refreshPerSceneFromFull(parsed);
    }catch(e:any){
      setError(String(e?.message || e));
    }finally{
      setLoading(false);
    }
  }

  function downloadPerSceneJSON(){
    perScene.forEach((s) => {
      download('${s.title}.json', JSON.stringify(s.obj, null, 2), "application/json");
    });
  }
  function downloadFullJSON(){
    if (!fullJSON) return;
    download('LARAS_Full_${Date.now()}.json', JSON.stringify(fullJSON, null, 2), "application/json");
  }
  function downloadVO(kind: "txt" | "md"){
    const content = kind === "txt" ? voTxt : voMd;
    const filename = kind === "txt" ? 'VO_${Date.now()}.txt' : 'VO_${Date.now()}.md';
    download(filename, content, "text/plain");
  }
  function generateStoryboardPNG() {
    if (!perScene.length) return;
    const w = 1600, h = 900;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0, "#0f172a"); g.addColorStop(1, "#334155");
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

    const cols = 3;
    const rows = Math.ceil(perScene.length / cols);
    const pad = 20;
    const cellW = (w - pad * (cols + 1)) / cols;
    const cellH = (h - pad * (rows + 1)) / rows;

    ctx.font = "bold 18px ui-sans-serif";
    ctx.textBaseline = "top";

    perScene.forEach((s, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = pad + c * (cellW + pad);
      const y = pad + r * (cellH + pad);

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const radius = 16;
      ctx.moveTo(x+radius,y);
      ctx.arcTo(x+cellW,y,x+cellW,y+cellH,radius);
      ctx.arcTo(x+cellW,y+cellH,x,y+cellH,radius);
      ctx.arcTo(x,y+cellH,x,y,radius);
      ctx.arcTo(x,y,x+cellW,y,radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "white";
      const title = s.title.replace(/_/g," ");
      ctx.fillText(title, x+12, y+12);
      const sec = s.obj?.seconds ?? 0;
      ctx.fillText('Durasi: ${sec}s', x+12, y+36);
      const dial = String(s.obj?.dialogue || "").slice(0, 90);
      ctx.fillText('Dialog: ${dial}', x+12, y+60);
    });

    canvas.toBlob((blob)=>{
      if(!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = 'Storyboard_${Date.now()}.png';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="hero-dot" />
          <div>
            <h2 className="text-xl font-bold">Cinematic Builder (AI)</h2>
            <p className="text-sm text-muted">Multi-scene ≤ 8s/scene, JSON aman, VO export, storyboard PNG.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={()=>setStyle("Marvel")}>Marvel</button>
          <button className="btn" onClick={()=>setStyle("Pixar")}>Pixar</button>
          <button className="btn" onClick={()=>setStyle("Anime")}>Anime</button>
          <button className="btn" onClick={()=>setStyle("Cartoon")}>Cartoon</button>
          <button className="btn" onClick={()=>setStyle("Real Film")}>Real Film</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span>Perintah / Brief</span>
            <textarea
              className="w-full"
              rows={4}
              value={instruction}
              onChange={(e)=>setInstruction(e.target.value)}
              placeholder="Contoh: Buat film kartun anak edukatif 2 menit tema kebun binatang ceria, ramah anak, positif."
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span>Style</span>
              <select className="w-full" value={style} onChange={(e)=>setStyle(e.target.value as any)}>
                <option>Cartoon</option>
                <option>Marvel</option>
                <option>Pixar</option>
                <option>Anime</option>
                <option>Real Film</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span>Aspect Ratio</span>
              <select className="w-full" value={aspect} onChange={(e)=>setAspect(e.target.value)}>
                <option>16:9</option>
                <option>9:16</option>
                <option>1:1</option>
                <option>2.35:1</option>
              </select>
            </label>
          </div>

          <div className="grid gap-1">
            <span>Karakter</span>
            <CharacterForm chars={chars} onChange={setChars} />
          </div>

          <div className="grid gap-1">
            <span>Objek/Props</span>
            <ObjectForm obj={objects} onChange={setObjects} />
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={onGenerateAI} disabled={loading}>
              {loading ? "Menghasilkan..." : "Generate (AI)"}
            </button>
            <button className="btn" onClick={()=>{
              setInstruction("Buat film kartun anak edukatif 1 menit tentang tur kebun binatang, fun dan positif.");
              setStyle("Cartoon");
            }}>
              Preset Aman
            </button>
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button className="btn" onClick={downloadFullJSON} disabled={!fullJSON}>Download Full JSON</button>
            <button className="btn" onClick={downloadPerSceneJSON} disabled={!perScene.length}>Download per Scene (JSON)</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn" onClick={()=>downloadVO("txt")} disabled={!perScene.length}>Export VO .txt</button>
            <button className="btn" onClick={()=>downloadVO("md")} disabled={!perScene.length}>Export VO .md</button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button className="btn" onClick={generateStoryboardPNG} disabled={!perScene.length}>Generate Storyboard (PNG)</button>
          </div>

          <div className="storyboard">
            <h3 className="font-bold mb-2">Preview per Scene (copy cepat)</h3>
            {!perScene.length && <div className="text-sm text-muted">Belum ada scene. Generate dulu.</div>}
            <div className="grid gap-2">
              {perScene.map((s, idx)=>(
                <div key={idx} className="p-2 border rounded bg-white/20 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-xs">{s.title}.json</div>
                    <div className="flex gap-2">
                      <button className="btn" onClick={()=>navigator.clipboard.writeText(JSON.stringify(s.obj))}>Copy JSON</button>
                      <button className="btn" onClick={()=>download('${s.title}.json', JSON.stringify(s.obj, null, 2))}>Download</button>
                    </div>
                  </div>
                  <pre className="text-xs mt-2 overflow-auto max-h-40">{JSON.stringify(s.obj, null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>

          <div className="storyboard">
            <h3 className="font-bold mb-2">VO Script (ringkas)</h3>
            <pre className="text-xs overflow-auto max-h-40">{voTxt || "// Belum ada VO"}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}