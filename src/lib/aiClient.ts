// src/lib/aiClient.ts
// LARAS — AI Boost client (Gemini) with dual mode:
// - Safe (recommended): use proxy URL (VITE_GEMINI_PROXY_URL)
// - Direct (unsafe for public): use API key (VITE_GEMINI_API_KEY)

import type { AIEnhanceRequest, AIEnhanceResponse } from "../types";
import SYSTEM_PROMPT from "./aiSystemPrompt";

const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;
const DIRECT_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

type GeminiResp =
  | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; [k: string]: any }
  | any;

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
    return { enhanced: JSON.parse(text) };
  } catch {
    // Fallback: return raw text so user can see why it failed
    return { enhanced: text };
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
    // ---- Mode 1: Safe (proxy) ----
    if (PROXY_URL) {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruction: req.instruction, draft: req.draft }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`AI proxy failed: ${res.status} ${text}`);
      }
      const data = (await res.json()) as AIEnhanceResponse;
      if (!("enhanced" in data)) throw new Error("Proxy response missing 'enhanced'");
      return data;
    }

    // ---- Mode 2: Direct (exposes key in bundle) ----
    if (DIRECT_KEY) {
      const payload = buildPayload(req);
      const res = await fetch(`${GEMINI_URL}?key=${DIRECT_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Gemini failed: ${res.status} ${text}`);
      }
      const data = (await res.json()) as GeminiResp;
      return parseGemini(data);
    }

    // ---- Not configured ----
    throw new Error(
      "AI not configured. Set VITE_GEMINI_PROXY_URL (recommended) or VITE_GEMINI_API_KEY."
    );
  } finally {
    clearTimeout(t);
  }
}

export default { enhanceWithAI };
