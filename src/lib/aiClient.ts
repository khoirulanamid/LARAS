// AI Boost client (Gemini) — ALWAYS return clean JSON object

import type { AIEnhanceRequest, AIEnhanceResponse } from "../types";
import SYSTEM_PROMPT from "./aiSystemPrompt";

const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;
const DIRECT_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

type GeminiResp = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
} & Record<string, any>;

/** Buang ```json/```/~~~ + ambil substring dari { pertama sampai } terakhir, lalu parse */
function sanitizeToObject(raw: string) {
  if (!raw) throw new Error("Empty response");
  let txt = raw
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```(?:json|JSON)?/g, "").replace(/```/g, ""))
    .replace(/~~~[\s\S]*?~~~/g, (m) => m.replace(/~~~(?:json|JSON)?/g, "").replace(/~~~/g, ""))
    .trim();

  const first = txt.indexOf("{");
  const last = txt.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    txt = txt.slice(first, last + 1);
  }

  // hapus koma gantung: ,}
  txt = txt.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(txt);
}

function payload(req: AIEnhanceRequest) {
  return {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          { text: `User instruction:\n${req.instruction}` },
          { text: `Draft JSON:\n${JSON.stringify(req.draft)}` },
        ],
      },
    ],
  };
}

function parseGeminiJSON(data: GeminiResp) {
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No output from Gemini");
  return { enhanced: sanitizeToObject(text) } as AIEnhanceResponse;
}

export async function enhanceWithAI(
  req: AIEnhanceRequest,
  opts?: { timeoutMs?: number }
): Promise<AIEnhanceResponse> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 60_000);

  try {
    // 1) Proxy (recommended)
    if (PROXY_URL) {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruction: req.instruction, draft: req.draft }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`AI proxy failed: ${res.status} ${await res.text()}`);

      const body = await res.json();

      // Jika proxy sudah kembalikan objek JSON:
      if (body && typeof body === "object" && body.enhanced) {
        // bisa string (fenced) atau object
        if (typeof body.enhanced === "string") {
          return { enhanced: sanitizeToObject(body.enhanced) };
        }
        return { enhanced: body.enhanced };
      }

      // Jika proxy mengembalikan teks langsung:
      if (typeof body === "string") {
        return { enhanced: sanitizeToObject(body) };
      }

      // Fallback: asumsi sudah objek bersih
      return { enhanced: body };
    }

    // 2) Direct (key dibundle ke frontend)
    if (DIRECT_KEY) {
      const res = await fetch(`${GEMINI_URL}?key=${DIRECT_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(req)),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Gemini failed: ${res.status} ${await res.text()}`);
      const data = (await res.json()) as GeminiResp;
      return parseGeminiJSON(data);
    }

    throw new Error("AI not configured. Set VITE_GEMINI_PROXY_URL or VITE_GEMINI_API_KEY.");
  } finally {
    clearTimeout(t);
  }
}

export default { enhanceWithAI };
