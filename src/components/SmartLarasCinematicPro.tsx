import React, { useMemo, useState } from "react";
import { enhanceWithAI } from "../lib/aiClient";
import type { LarasJSON } from "../types";

/* =========================
   SMART LARAS — Cinematic Pro+ (UI Pro)
   - Tema cerita
   - Gaya visual
   - Jumlah adegan (auto distribusi durasi)
   - Target usia
   - Mode Aman Canva (filter prompt)
   - Preset cepat (Marvel/Pixar/Anime)
   - Generate Lokal + AI Boost (Gemini/Proxy)
   ========================= */

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
const AR_ALIASES: Record<string, string> = {
  portrait: "9:16", landscape: "16:9", square: "1:1", tiktok: "9:16",
  reels: "9:16", yt: "16:9", youtube: "16:9", cinema: "2.35:1"
};
function detectLanguage(txt: string): "id-ID" | "en-US" {
  return txt.toLowerCase().includes(" yang ") || txt.toLowerCase().includes(" anak")
    ? "id-ID" : "en-US";
}
function extractNumber(txt: string, unit: string) {
  const rx = new RegExp(`(\\d{1,3})\\s*(?:${unit})`, "i");
  const m = txt.match(rx);
  return m ? parseInt(m[1], 10) : undefined;
}
function pickDurationSeconds(instruction: string, fallback = 60) {
  const s = instruction.toLowerCase();
  const detik = extractNumber(s, "detik") ?? extractNumber(s, "sec") ?? extractNumber(s, "seconds");
  const menit = extractNumber(s, "menit") ?? extractNumber(s, "minute") ?? extractNumber(s, "min");
  if (menit && !detik) return Math.min(600, Math.max(15, menit * 60));
  if (detik) return Math.min(600, Math.max(10, detik));
  return fallback;
}
function pickAspectRatio(instruction: string, fallback = "16:9") {
  const s = instruction.toLowerCase();
  const m = s.match(/(\d{1,2}:\d{1,2}|2\.35:1)/);
  if (m) return m[1];
  for (const k of Object.keys(AR_ALIASES)) if (s.includes(k)) return AR_ALIASES[k];
  return fallback;
}

type Tema = "Edukasi" | "Petualangan" | "Moral" | "Sains";
type Gaya = "3D cartoon cinematic" | "Pixar" | "Anime" | "Marvel" | "2.5D";
type Usia = "3-5" | "5-7" | "8-10" | "11-13";

export default function SmartLarasCinematicPro() {
  // ====== FORM ======
  const [tema, setTema] = useState<Tema>("Edukasi");
  const [gaya, setGaya] = useState<Gaya>("3D cartoon cinematic");
  const [usia, setUsia] = useState<Usia>("5-7");
  const [adegan, setAdegan] = useState<number>(5);
  const [modeAman, setModeAman] = useState(true);

  // teks bebas supaya fleksibel (ikut versi lama)
  const [instruction, setInstruction] = useState(
    "Buat animasi 1 menit, anak jadi pemandu kebun binatang futuristik, ada gajah robot & singa api, epic, green screen portrait."
  );

  // output & status
  const [jsonOut, setJsonOut] = useState<string>("");
  const [busy, setBusy] = useState<"idle" | "local" | "ai">("idle");
  const [error, setError] = useState<string>("");

  // ====== PRESET ======
  function applyPreset(preset: "marvel" | "pixar" | "anime") {
    if (preset === "marvel") {
      setGaya("Marvel");
      setInstruction("Buat animasi 1 menit gaya Marvel, anak jadi superhero di kebun binatang, ada gajah robot dan singa api, epic cinematic, green screen portrait, 16:9.");
    } else if (preset === "pixar") {
      setGaya("Pixar");
      setInstruction("Buat animasi 1 menit gaya Pixar, anak jadi pemandu lucu di kebun binatang, ada jerapah ceria & penguin imut, fun heartwarming, green screen landscape, 16:9.");
    } else {
      setGaya("Anime");
      setInstruction("Buat animasi 1 menit gaya Anime, anak jadi pahlawan di kebun binatang ajaib, ada naga api & panda bijak, sinematik, green screen portrait, 9:16.");
    }
  }

  // ====== COPY & DOWNLOAD ======
  function copyJson() { if (jsonOut) navigator.clipboard.writeText(jsonOut); }
  function downloadJson() {
    if (!jsonOut) return;
    const blob = new Blob([jsonOut], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `LARAS_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // ====== HELPER NARASI ======
  const lang = useMemo(() => detectLanguage(instruction), [instruction]);
  const totalSec = useMemo(() => pickDurationSeconds(instruction, 60), [instruction]);
  const fps = 24;
  const frames = fps * totalSec;
  const aspect = useMemo(() => pickAspectRatio(instruction, "16:9"), [instruction]);

  // Distribusi durasi per adegan (intro→build→mid→climax→resolution→outro)
  function distributeBeats(n: number, total: number) {
    // bobot kasar biar flow natural
    const weights = [0.12, 0.18, 0.2, 0.2, 0.18, 0.12];
    const base = Array.from({ length: Math.max(6, n) }, (_, i) => weights[i % 6]);
    const sum = base.reduce((a, b) => a + b, 0);
    return base.slice(0, n).map(w => Math.max(3, Math.round((w / sum) * total)));
  }

  // Tone by age
  function toneForAge(u: Usia) {
    if (u === "3-5") return { tone: "ceria, sangat sederhana, lambat", wpm: 90 };
    if (u === "5-7") return { tone: "ceria, sederhana, jelas", wpm: 110 };
    if (u === "8-10") return { tone: "semangat, informatif, jelas", wpm: 125 };
    return { tone: "seru, informatif, agak cepat", wpm: 135 };
  }

  function styleGenre(g: Gaya) {
    if (g === "Pixar") return "Pixar Style";
    if (g === "Anime") return "Anime Style";
    if (g === "Marvel") return "Marvel Style";
    if (g === "2.5D") return "2.5D Motion";
    return "3D Cartoon Cinematic";
  }

  function safetyDoDont(enabled: boolean) {
    if (!enabled) return {
      do: ["alur natural", "ekspresi sesuai emosi", "transisi halus", "proporsi wajah konsisten"],
      dont: ["distorsi wajah", "noise berat", "glitch teks"]
    };
    return {
      do: [
        "alur natural",
        "ekspresi ramah anak",
        "transisi lembut",
        "hindari hal-hal menakutkan"
      ],
      dont: [
        "kekerasan",
        "darah",
        "tema dewasa",
        "bahasa kasar",
        "efek jumpscare",
        "hewan tersakiti"
      ]
    };
  }

  // ====== BUILD DRAFT JSON LOKAL ======
  function buildLocalDraft(): LarasJSON {
    const { tone, wpm } = toneForAge(usia);
    const secondsPerBeat = distributeBeats(adegan, totalSec);
    const bgIsGreen = instruction.toLowerCase().includes("green");
    const style = styleGenre(gaya);
    const safe = safetyDoDont(modeAman);

    // contoh karakter default (bisa diganti oleh user lewat teks)
    const characters = [
      { display_name: "Raka", role: "Protagonist", age: "10", gender: "male",
        facial_features: "ceria, ekspresif", eyes: "mata bulat cokelat",
        hair: "rambut pendek hitam", clothing: "jaket petualang anak",
        accessories: "headset mic", character_id: rid("char") },
      { display_name: "GajahBot", role: "Sidekick",
        design: "gajah mekanik futuristik, armor berkilau, mata biru neon",
        character_id: rid("char") }
    ];

    // label beat sesuai jumlah adegan
    const labels = ["Pembukaan","Pengantar","Perkembangan","Klimaks","Resolusi","Penutup"];
    const beats = Array.from({ length: adegan }, (_, i) => {
      const label = labels[i] ?? `Adegan ${i+1}`;
      const sec = secondsPerBeat[i] ?? Math.round(totalSec / adegan);
      const commonShot = i===0 ? "establishing, crane down"
        : i===adegan-1 ? "crane up, wide cinematic"
        : "tracking/dolly dynamic";
      const sampleDialog = lang==="id-ID"
        ? `(${label}) Dialog narasi ramah anak tentang tema ${tema.toLowerCase()}.`
        : `(${label}) Friendly kid narration about ${tema.toLowerCase()} theme.`;
      return {
        index: i+1,
        label,
        shot: commonShot,
        action: `${label} selaras konteks ${tema.toLowerCase()} dengan gaya ${style}.`,
        dialogue: sampleDialog,
        seconds: sec
      };
    });

    const obj: LarasJSON = {
      version: "2.3",
      schema: "laras.prompt",
      intent: "cinematic_storytelling",
      consistency: { lock: true, design_id: rid("design"), seed: String(Math.floor(Math.random()*1_000_000)) },
      meta: {
        theme: tema,
        target_age: usia,
        safe_mode: modeAman,
        visual_style: gaya
      },
      characters,
      style: {
        genre: style,
        palette: [
          { name:"primary", value:"#0ea5e9" },
          { name:"accent", value:"#f59e0b" },
          { name:"nature", value:"#10b981" },
          { name:"shadow", value:"#111827" }
        ],
        lighting: "cinematic soft key, gentle rim, subtle volumetric",
        camera: "crane, dolly, hero close-up, wides",
        fx: modeAman ? ["sparkles","soft glow"] : ["particle sparks","soft smoke","lens flare"],
        background: bgIsGreen ? "chroma green #00ff00" : "futuristic zoo / kid-friendly environment"
      },
      guidance: {
        voiceover: {
          language: lang,
          tone,
          pace: `${Math.round((totalSec/60)*wpm)} kata (±${wpm} wpm)`
        },
        music: gaya==="Marvel" ? ["orchestral heroic score","big drums"]
              : gaya==="Pixar" ? ["warm strings","light percussion"]
              : gaya==="Anime" ? ["anime orchestral","percussive build"]
              : ["playful score","light drums"],
        sfx: ["footsteps soft","animal friendly sounds","robotic hum"],
        ...safe
      },
      narrative: {
        logline: lang==="id-ID"
          ? `Cerita ${tema.toLowerCase()} bergaya ${style} dengan narator anak; alur halus dan aman untuk usia ${usia}.`
          : `A ${tema.toLowerCase()} story in ${style} style with a kid narrator; smooth and age-safe (${usia}).`,
        beats,
        script: beats.map(b => b.dialogue),
        total_seconds: totalSec
      },
      output: {
        mode: "video",
        aspect_ratio: aspect,
        fps,
        duration_seconds: totalSec,
        frames,
        subtitles: { enabled: true, language: lang },
        transparent_background: bgIsGreen
      },
      vendor: { canva: { magic_studio: {
        strict_face_lock: true,
        geometry_consistency: "ultra",
        color_consistency: "ultra",
        cinematic_mode: true
      } } }
    };

    return obj;
  }

  async function generateLocal() {
    setError(""); setBusy("local");
    try {
      const draft = buildLocalDraft();
      setJsonOut(JSON.stringify(draft, null, 2));
    } catch (e: any) {
      setError(e?.message || "Local generator failed");
    } finally { setBusy("idle"); }
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
    } finally { setBusy("idle"); }
  }

  // ====== UI ======
  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-10 backdrop-blur bg-[#0b1220]/70 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 grid place-content-center font-bold">L</div>
            <div className="font-semibold">SMART LARAS — Cinematic Pro+</div>
          </div>
          <div className="text-xs opacity-80">Presets · Gemini Boost</div>
        </div>
      </nav>

      {/* MAIN */}
      <div className="mx-auto max-w-6xl p-4 grid lg:grid-cols-2 gap-4">
        {/* LEFT: FORM */}
        <section className="rounded-2xl bg-[#0E1626] border border-white/10 p-4 shadow-lg">
          <header className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Skena Builder</h2>
            <div className="flex gap-2">
              <button onClick={()=>applyPreset("marvel")} className="px-3 py-1 rounded-full bg-red-600 text-white text-xs">Marvel</button>
              <button onClick={()=>applyPreset("pixar")} className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs">Pixar</button>
              <button onClick={()=>applyPreset("anime")} className="px-3 py-1 rounded-full bg-pink-600 text-white text-xs">Anime</button>
            </div>
          </header>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="mb-1 opacity-80">Pilih Tema Cerita</div>
              <select value={tema} onChange={e=>setTema(e.target.value as Tema)}
                className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                <option>Edukasi</option>
                <option>Petualangan</option>
                <option>Moral</option>
                <option>Sains</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Pilih Gaya Visual</div>
              <select value={gaya} onChange={e=>setGaya(e.target.value as Gaya)}
                className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                <option>3D cartoon cinematic</option>
                <option>Pixar</option>
                <option>Anime</option>
                <option>Marvel</option>
                <option>2.5D</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Jumlah Adegan</div>
              <input type="number" min={3} max={12} value={adegan}
                onChange={e=>setAdegan(Math.min(12, Math.max(3, Number(e.target.value))))}
                className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2" />
            </label>

            <label className="text-sm">
              <div className="mb-1 opacity-80">Target Usia Penonton</div>
              <select value={usia} onChange={e=>setUsia(e.target.value as Usia)}
                className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2">
                <option value="3-5">3-5 tahun</option>
                <option value="5-7">5-7 tahun</option>
                <option value="8-10">8-10 tahun</option>
                <option value="11-13">11-13 tahun</option>
              </select>
            </label>
          </div>

          <label className="text-sm block mt-3">
            <div className="mb-1 opacity-80">Masukkan Ide Cerita (tambahkan “16:9 / 9:16 / 2.35:1”, “green screen”, menit/detik, hewan/objek, dsb.)</div>
            <textarea rows={4} value={instruction} onChange={e=>setInstruction(e.target.value)}
              className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-3 py-2" />
          </label>

          <div className="mt-3 flex items-center justify-between">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={modeAman} onChange={e=>setModeAman(e.target.checked)} />
              <span>Aktifkan Mode Aman Canva</span>
            </label>

            <div className="flex gap-2">
              <button onClick={generateLocal} disabled={busy!=="idle"}
                className="rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">
                {busy==="local" ? "Generating..." : "Generate (Lokal)"}
              </button>
              <button onClick={generateWithAI} disabled={busy!=="idle"}
                className="rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">
                {busy==="ai" ? "Boosting..." : "AI Boost Generate"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-rose-400 bg-rose-900/20 text-rose-200 p-3 text-xs">
              {error}
            </div>
          )}
        </section>

        {/* RIGHT: PREVIEW */}
        <section className="rounded-2xl bg-[#0E1626] border border-white/10 p-4 shadow-lg">
          <header className="mb-3">
            <h2 className="text-lg font-semibold">JSON Preview</h2>
            <p className="text-xs opacity-70">
              Hasil siap ditempel ke Canva/Magic Studio. Gunakan <em>design_id</em> dan <em>seed</em> yang sama untuk konsistensi episode.
            </p>
          </header>
          <div className="rounded-xl bg-[#0B1220] border border-white/10 p-3 max-h-[65vh] overflow-auto">
            <pre className="text-xs whitespace-pre-wrap">
{jsonOut || "// Tekan Generate (Lokal) atau AI Boost Generate untuk melihat output JSON di sini."}
            </pre>
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={copyJson} disabled={!jsonOut}
              className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-40">
              Copy JSON
            </button>
            <button onClick={downloadJson} disabled={!jsonOut}
              className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-40">
              Download
            </button>
          </div>
        </section>
      </div>

      <footer className="text-xs text-white/60 text-center py-6">
        © {new Date().getFullYear()} SMART LARAS — Cinematic Pro+
      </footer>
    </div>
  );
}
