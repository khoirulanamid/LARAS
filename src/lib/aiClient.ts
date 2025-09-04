// src/lib/aiClient.ts
// AI Boost client (Gemini) — robust JSON sanitizer

import type { AIEnhanceRequest, AIEnhanceResponse } from "../types";
import SYSTEM_PROMPT from "./aiSystemPrompt";

const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;
const DIRECT_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

type GeminiResp = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
} & Record<string, any>;

// --- sanitize: buang ```json, ambil blok { ... } terluas, dan parse ---
function sanitizeToJSON(raw: string) {
  if (!raw) throw new Error("Empty response");
  // buang backticks/fence dan label bahasa
  let txt = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // kalau masih ada teks di luar JSON, ambil substring dari { pertama ke } terakhir
  const first = txt.indexOf("{");
  const last = txt.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    txt = txt.slice(first, last + 1);
  }

  // hapus koma gantung umum (jarang terjadi, tapi aman)
  txt = txt.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(txt);
}

function buildPayload(req: AIEnhanceRequest) {
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

function parseGemini(data: GeminiResp) {
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No output from Gemini");
  try {
    const json = sanitizeToJSON(text);
    return { enhanced: json };
  } catch (e: any) {
    // kirim juga teks mentah supaya bisa dilihat di UI kalau tetap gagal
    throw new Error(`Model returned non-JSON. Detail: ${e?.message || e}`);
  }
}

export async function enhanceWithAI(
  req: AIEnhanceRequest,
  opts?: { timeoutMs?: number }
): Promise<AIEnhanceResponse> {
  const timeoutMs = opts?.timeoutMs ?? 60_000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 1) Proxy mode (aman)
    if (PROXY_URL) {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruction: req.instruction, draft: req.draft }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`AI proxy failed: ${res.status} ${await res.text()}`);

      const payload = await res.json();
      // Proxy kamu mungkin sudah mengembalikan { enhanced }, kalau belum, sanitasi di sini:
      if (payload?.enhanced) return payload as AIEnhanceResponse;

      // fallback: kalau proxy mengembalikan "text"
      if (typeof payload === "string") {
        return { enhanced: sanitizeToJSON(payload) };
      }
      return { enhanced: payload };
    }

    // 2) Direct mode (key dibundle)
    if (DIRECT_KEY) {
      const res = await fetch(`${GEMINI_URL}?key=${DIRECT_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(req)),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Gemini failed: ${res.status} ${await res.text()}`);

      const data = (await res.json()) as GeminiResp;
      return parseGemini(data);
    }

    throw new Error("AI not configured. Set VITE_GEMINI_PROXY_URL or VITE_GEMINI_API_KEY.");
  } finally {
    clearTimeout(t);
  }
}

export default { enhanceWithAI };
