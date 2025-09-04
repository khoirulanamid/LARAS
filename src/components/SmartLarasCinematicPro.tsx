import React, { useState } from "react";
import { enhanceWithAI } from "../lib/aiClient";
import type { LarasJSON } from "../types";

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
function toWordsPerMinuteHint(seconds: number) {
  const targetWpm = 125;
  const words = Math.round((seconds / 60) * targetWpm);
  return `${words} kata (±${targetWpm} wpm)`;
}
const AR_ALIASES: Record<string,string> = {"portrait":"9:16","landscape":"16:9","square":"1:1","tiktok":"9:16","reels":"9:16","yt":"16:9","youtube":"16:9","cinema":"2.35:1"};
function detectLanguage(txt: string): "id-ID" | "en-US" {
  return txt.toLowerCase().includes("yang") || txt.toLowerCase().includes("anak") ? "id-ID" : "en-US";
}
function extractNumber(txt: string, unit: string) {
  const rx = new RegExp(`(\\d{1,3})\\s*(?:${unit})`,"i");
  const m = txt.match(rx);
  return m ? parseInt(m[1],10) : undefined;
}
function pickDurationSeconds(instruction: string) {
  const s = instruction.toLowerCase();
  const detik = extractNumber(s,"detik") ?? extractNumber(s,"sec") ?? extractNumber(s,"seconds");
  const menit = extractNumber(s,"menit") ?? extractNumber(s,"minute") ?? extractNumber(s,"min");
  if (menit && !detik) return Math.min(600, Math.max(15, menit*60));
  if (detik) return Math.min(600, Math.max(10, detik));
  return 60;
}
function pickAspectRatio(instruction: string) {
  const s = instruction.toLowerCase();
  const m = s.match(/(\d{1,2}:\d{1,2}|2\.35:1)/);
  if (m) return m[1];
  for (const k of Object.keys(AR_ALIASES)) if (s.includes(k)) return AR_ALIASES[k];
  return "16:9";
}

export default function SmartLarasCinematicPro() {
  const [instruction, setInstruction] = useState("Buat animasi gaya Marvel 1 menit, anak jadi superhero di kebun binatang, ada gajah robot dan singa api, epic cinematic, green screen portrait.");
  const [jsonOut, setJsonOut] = useState<string>("");
  const [busy, setBusy] = useState<"idle"|"local"|"ai">("idle");
  const [error, setError] = useState<string>("");

  function buildLocalDraft(): LarasJSON {
    const lang = detectLanguage(instruction);
    const sec = pickDurationSeconds(instruction);
    const ar  = pickAspectRatio(instruction);
    const fps = 24;
    const frames = fps * sec;

    const characters = [
      { display_name: "Raka", role: "Protagonist", age: "10", gender: "male",
        facial_features: "ceria, ekspresif", eyes: "mata bulat cokelat",
        hair: "rambut pendek hitam", clothing: "kostum pahlawan mini dengan logo hewan",
        accessories: "headset mic", character_id: rid("char") },
      { display_name: "GajahBot", role: "Sidekick",
        design: "gajah mekanik futuristik, armor berkilau, mata biru neon",
        character_id: rid("char") },
      { display_name: "Singa Api", role: "Antagonist",
        design: "singa dengan surai api menyala, aura kuat",
        character_id: rid("char") }
    ];

    const beats = [
      { index:1, label:"Pembukaan", shot:"establishing shot, crane down",
        action:"Raka menyapa penonton, perkenalkan setting kebun binatang futuristik",
        dialogue: lang==="id-ID" ? "Halo, aku Raka! Hari ini kita akan bertualang di kebun binatang istimewa ini!" : "Hi! Today we explore a special zoo!",
        seconds:8 },
      { index:2, label:"Perkenalan Sidekick", shot:"wide to medium dolly in",
        action:"GajahBot muncul dengan efek mekanik",
        dialogue: lang==="id-ID" ? "Kenalkan, ini GajahBot! Teman robot kita yang setia." : "Meet ElephantBot, our trusty friend!",
        seconds:10 },
      { index:3, label:"Komedi Ringan", shot:"tracking shot",
        action:"Pasukan penguin robot lewat berbaris, interaksi lucu",
        dialogue: lang==="id-ID" ? "Lihat, penguin robot! Mereka lucu sekali." : "Look, robot penguins! So cute.",
        seconds:10 },
      { index:4, label:"Konflik", shot:"dramatic low angle, dolly zoom",
        action:"Singa Api muncul dengan aura api, terjadi ketegangan",
        dialogue: lang==="id-ID" ? "Oh tidak, Singa Api datang! Kita harus berani!" : "Oh no, Fire Lion is here! Be brave!",
        seconds:15 },
      { index:5, label:"Resolusi", shot:"close up hero shot",
        action:"Berhasil menenangkan Singa Api, pesan moral",
        dialogue: lang==="id-ID" ? "Yay! Ingat, jaga hewan dan lingkungan!" : "Yay! Care for animals and the planet!",
        seconds:10 },
      { index:6, label:"Penutup", shot:"crane up, wide cinematic",
        action:"Semua karakter melambai, transisi ke teks penutup",
        dialogue: lang==="id-ID" ? "Terima kasih! Sampai jumpa!" : "Thanks! See you next time!",
        seconds:7 },
    ];

    return {
      version: "2.2",
      schema: "laras.prompt",
      intent: "cinematic_storytelling",
      consistency: { lock: true, design_id: rid("design"), seed: String(Math.floor(Math.random()*1_000_000)) },
      characters,
      style: {
        genre: instruction.toLowerCase().includes("pixar") ? "Pixar Style"
             : instruction.toLowerCase().includes("anime") ? "Anime Style"
             : "Marvel Style",
        palette: [
          { name:"hero", value:"#1E90FF" }, { name:"fire", value:"#FF4500" },
          { name:"tech", value:"#C0C0C0" }, { name:"nature", value:"#2E8B57" }
        ],
        lighting: "cinematic 3-point, dramatic rim light, volumetric fog",
        camera: "crane, dolly, zoom, hero close-up",
        fx: ["particle sparks","flames","smoke","lens flare"],
        background: instruction.toLowerCase().includes("green") ? "chroma green #00ff00" : "futuristic zoo environment",
      },
      guidance: {
        voiceover: { language: lang, tone: "epic, heroic, jelas", pace: toWordsPerMinuteHint(sec) },
        music: ["orchestral heroic score","drums epic"],
        sfx: ["elephant mechanical stomp","lion roar fiery","penguin chatter"],
        do: ["alur cerita natural","proporsi wajah konsisten","transisi halus","ekspresi sesuai emosi"],
        dont: ["jari tambahan","distorsi wajah","noise berat","glitch teks"]
      },
      narrative: {
        logline: lang==="id-ID"
          ? "Seorang anak menjadi pahlawan kebun binatang dengan bantuan GajahBot."
          : "A kid becomes the zoo hero with ElephantBot.",
        beats,
        script: beats.map(b=>b.dialogue),
        total_seconds: sec
      },
      output: {
        mode: "video",
        aspect_ratio: ar,
        fps,
        duration_seconds: sec,
        frames,
        subtitles: { enabled:true, language: lang },
        transparent_background: instruction.toLowerCase().includes("green")
      },
      vendor: { canva: { magic_studio: {
        strict_face_lock:true, geometry_consistency:"ultra", color_consistency:"ultra", cinematic_mode:true
      } } }
    };
  }

  async function generateLocal() {
    setError(""); setBusy("local");
    try {
      const draft = buildLocalDraft();
      setJsonOut(JSON.stringify(draft, null, 2));
    } catch (e: any) {
      setError(e?.message || "Local generator failed");
    } finally {
      setBusy("idle");
    }
  }

  async function generateWithAI() {
    setError(""); setBusy("ai");
    try {
      const draft = buildLocalDraft();
      const { enhanced } = await enhanceWithAI({ instruction, draft });
      const json = typeof enhanced === "string" ? enhanced : JSON.stringify(enhanced, null, 2);
      setJsonOut(json);
    } catch (e: any) {
      setError(e?.message || "AI Boost failed");
    } finally {
      setBusy("idle");
    }
  }

  function copyJson(){ if(jsonOut) navigator.clipboard.writeText(jsonOut); }
  function downloadJson(){
    if(!jsonOut) return;
    const blob=new Blob([jsonOut],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`LARAS_CinematicStory_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function applyPreset(preset: string) {
    if (preset === "marvel") {
      setInstruction("Buat animasi gaya Marvel 1 menit, anak jadi superhero di kebun binatang, ada gajah robot dan singa api, epic cinematic, green screen portrait.");
    } else if (preset === "pixar") {
      setInstruction("Buat animasi gaya Pixar 1 menit, anak jadi pemandu lucu di kebun binatang, ada jerapah ceria dan penguin imut, fun adventure, green screen landscape.");
    } else if (preset === "anime") {
      setInstruction("Buat animasi gaya Anime 1 menit, anak jadi pahlawan di kebun binatang ajaib, ada naga api dan panda bijak, gaya anime sinematik, green screen portrait.");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-5xl p-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SMART LARAS — Cinematic Pro+ Story</h1>
            <p className="text-sm text-neutral-600">Continuity + Preset + <span className="font-semibold">Gemini Boost</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyJson} disabled={!jsonOut} className="rounded-2xl px-4 py-2 shadow bg-neutral-900 text-white disabled:opacity-40">Copy JSON</button>
            <button onClick={downloadJson} disabled={!jsonOut} className="rounded-2xl px-4 py-2 shadow bg-white border disabled:opacity-40">Download</button>
          </div>
        </header>

        <section className="rounded-3xl bg-white p-4 shadow space-y-3">
          <div className="flex gap-2">
            <button onClick={()=>applyPreset("marvel")} className="px-3 py-1 rounded-full bg-red-600 text-white text-sm">Marvel</button>
            <button onClick={()=>applyPreset("pixar")} className="px-3 py-1 rounded-full bg-blue-600 text-white text-sm">Pixar</button>
            <button onClick={()=>applyPreset("anime")} className="px-3 py-1 rounded-full bg-pink-600 text-white text-sm">Anime</button>
          </div>

          <label className="block text-sm">
            <span className="text-neutral-700">Perintah pengguna</span>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2"
              rows={4}
              value={instruction}
              onChange={(e)=>setInstruction(e.target.value)}
              placeholder="Contoh: Buat animasi 2 menit gaya Pixar 2.5D, narator anak laki-laki nama Raka, 16:9, green screen, tampilkan jerapah & penguin."
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button onClick={generateLocal} disabled={busy!=="idle"} className="rounded-2xl px-4 py-2 shadow bg-neutral-900 text-white disabled:opacity-40">
              {busy==="local" ? "Generating..." : "Generate (Lokal)"}
            </button>
            <button onClick={generateWithAI} disabled={busy!=="idle"} className="rounded-2xl px-4 py-2 shadow bg-emerald-600 text-white disabled:opacity-40">
              {busy==="ai" ? "Boosting..." : "AI Boost Generate"}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-900 text-xs">{error}</div>
          )}
        </section>

        <section className="mt-4 rounded-3xl bg-white p-4 shadow">
          <h2 className="text-lg font-semibold mb-2">JSON Preview</h2>
          <pre className="whitespace-pre-wrap text-xs bg-neutral-900 text-neutral-100 p-4 rounded-2xl overflow-auto max-h-[60vh]">
{jsonOut || "// Tekan Generate (Lokal) atau AI Boost Generate untuk melihat output JSON"}
          </pre>
        </section>
      </div>
    </div>
  );
}
