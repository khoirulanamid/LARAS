import type { AIEnhanceRequest, AIEnhanceResponse } from "../types";

// Mode 1 (AMAN): panggil proxy yang kamu host (Cloudflare Worker)
// Set lewat env build: VITE_GEMINI_PROXY_URL=https://your-worker.workers.dev
const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;

// Mode 2 (TIDAK AMAN): panggil Gemini langsung dari browser
// Set: VITE_GEMINI_API_KEY=AIza...
const DIRECT_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const system = `You are a JSON LARAS architect. Improve and complete the provided JSON with:
- characters (consistent),
- style (genre, palette, lighting, camera, fx),
- narrative beats (intro, build, mid, climax, resolution, outro) with transitions,
- dialogue per beat,
- guidance (voiceover pace, do/dont),
- output (duration, fps, aspect)
Return *valid JSON only*.`;

export async function enhanceWithAI(req: AIEnhanceRequest): Promise<AIEnhanceResponse> {
  if (PROXY_URL) {
    // Aman: lewat proxy
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction: req.instruction, draft: req.draft }),
    });
    if (!res.ok) throw new Error(`Proxy failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  if (DIRECT_KEY) {
    // Tidak aman: panggil Gemini langsung (key terekspos)
    const payload = {
      contents: [
        { parts: [
          { text: system },
          { text: `User instruction:\n${req.instruction}` },
          { text: `Draft JSON:\n${JSON.stringify(req.draft)}` }
        ] }
      ]
    };
    const res = await fetch(`${GEMINI_URL}?key=${DIRECT_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Gemini failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No output from Gemini");
    let enhanced: any;
    try { enhanced = JSON.parse(text); } catch { enhanced = text; }
    return { enhanced };
  }

  throw new Error("AI not configured. Set VITE_GEMINI_PROXY_URL (safe) or VITE_GEMINI_API_KEY (unsafe).");
}
