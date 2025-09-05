export type AIOpts = {
  apiKey?: string;
  model?: string;
  endpoint?: string; // optional proxy or custom URL
};

const DEFAULT_MODEL = "gemini-2.0-flash";

export async function aiGenerate(
  system: string,
  user: string,
  opts: AIOpts = {}
): Promise<string> {
  const key =
    opts.apiKey ||
    (typeof import.meta !== "undefined"
      ? (import.meta as any).env?.VITE_GEMINI_API_KEY
      : undefined);

  const url =
    opts.endpoint ||
    (typeof import.meta !== "undefined"
      ? (import.meta as any).env?.VITE_GEMINI_URL
      : undefined) ||
    "https://generativelanguage.googleapis.com/v1beta/models/" +
      (opts.model || DEFAULT_MODEL) +
      ":generateContent";

  if (!key) throw new Error("VITE_GEMINI_API_KEY belum di-set.");

  const payload = {
    contents: [{ role: "user", parts: [{ text: '${system}\n\n${user}' }] }],
    generationConfig: { temperature: 0.6 }
  };

  const res = await fetch('${url}?key=${key}', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error('AI error ${res.status}: ${t}');
  }

  const data = await res.json();
  const out =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    (data?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p?.text || "")
      .join("\n");
  return String(out || "").trim();
}