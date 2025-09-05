// src/lib/aiClient.ts
export type Scene = {
  index: number;
  seconds: number;           // maks 8
  name: string;
  camera: string;
  environment: string;
  action: string;
  dialogue?: string;
  music_cue?: string;
  sfx?: string[];
};

export type GenerateInput = {
  apiKey?: string;
  description: string;       // deskripsi user
  style: "Marvel" | "Pixar" | "Anime" | "Cartoon" | "Real Film";
  aspect: "16:9" | "9:16" | "1:1";
};

const MODEL = "gemini-2.0-flash";

function systemGuardrail(desc: string) {
  // Prompt aman agar lolos filter dan tidak menyebut identitas/usia secara sensitif
  return `
Kamu adalah perancang skenario video kartun edukatif yang aman untuk semua umur.
Buatkan daftar scene sinematik (maks 8 detik/scene) *tanpa menyebut umur secara eksplisit*,
hindari tema sensitif, kekerasan, atau konten dewasa. Gaya bahasa positif dan ramah.
Balas *hanya* JSON array of scene (tanpa teks lain, tanpa codefence). Struktur tiap scene:
{
 "index": number,
 "seconds": number (<=8),
 "name": string,
 "camera": string,
 "environment": string,
 "action": string,
 "dialogue": string,
 "music_cue": string,
 "sfx": string[]
}

Deskripsi pengguna:
${desc}
`.trim();
}

export async function generateScenes(input: GenerateInput): Promise<Scene[]> {
  const apiKey =
    input.apiKey?.trim() ||
    (import.meta as any).env?.VITE_GEMINI_KEY ||
    (window as any)._GEMINI_KEY_;

  if (!apiKey) {
    throw new Error("API key belum diisi.");
  }

  const body = {
    contents: [
      {
        parts: [{ text: systemGuardrail('${input.style} • ${input.aspect} • ${input.description}') }],
      },
    ],
    generationConfig: { temperature: 0.8, candidateCount: 1, maxOutputTokens: 2048 },
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUAL", threshold: "BLOCK_LOW_AND_ABOVE" },
    ],
  };

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent',
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error('Gemini error ${res.status}: ${t}');
  }

  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("Model tidak mengembalikan teks.");

  // Bersihkan kemungkinan code-fence/backticks jika ada
  const cleaned = text.replace(/json|/g, "").trim();

  let arr: Scene[] = [];
  try {
    arr = JSON.parse(cleaned);
  } catch {
    // fallback: coba ekstrak array dengan regex
    const match = cleaned.match(/\[([\s\S]*)\]$/);
    if (!match) throw new Error("Output bukan JSON array.");
    arr = JSON.parse('[${match[1]}]');
  }

  // Normalisasi: pastikan <=8 detik
  arr = arr.map((s, i) => ({
    index: s.index ?? i + 1,
    seconds: Math.min(8, Math.max(3, Number(s.seconds || 6))),
    name: s.name || 'Scene ${i + 1}',
    camera: s.camera || "wide, dolly-in, depth of field sinematik",
    environment: s.environment || "lokasi terang, aman, ceria",
    action: s.action || "aksi ringan edukatif",
    dialogue: s.dialogue || "",
    music_cue: s.music_cue || "light comedy / ukulele",
    sfx: Array.isArray(s.sfx) ? s.sfx : ["ambience ringan"],
  }));

  return arr;
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}