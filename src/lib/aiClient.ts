/** Simple Gemini client for browser (Vite). 
 *  Pastikan .env berisi:
 *  VITE_GEMINI_API_KEY=xxxx
 */
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; // <-- disuntik saat build

function stripFences(text: string) {
  if (!text) return text;
  return text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
}

export async function aiBoostGenerate(instruction: string, seconds: number, style: string) {
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY belum diisi.");
  const sys = [
    "Kamu asisten pembuat skenario video animasi anak.",
    "KELUARKAN HANYA JSON VALID, TANPA CODE FENCE.",
    "Bagi menjadi scenes maksimal 8 detik/scene.",
    "Field wajib: version, schema, intent, consistency, global, characters, narrative.total_seconds, scenes[].",
    "Jaga keamanan: ramah anak, tanpa kekerasan/18+."
  ].join(" ");

  const user = [
    `Instruksi: ${instruction}`,
    `Durasi: ${seconds} detik`,
    `Style: ${style}`,
    "Output: JSON valid."
  ].join("\n");

  const res = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: sys }, { text: user }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
    })
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error("AI error: " + res.status + " " + t);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") || "";
  const clean = stripFences(text);

  // Validasi JSON
  let obj: any;
  try { obj = JSON.parse(clean); } catch {
    throw new Error("AI mengembalikan format non-JSON. Coba lagi atau kurangi kompleksitas prompt.");
  }
  return obj; // JSON object
}
