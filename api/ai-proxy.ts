// api/ai-proxy.ts — Vercel Function (Edge) untuk menyembunyikan API key
export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { instruction, draft } = await req.json();

    const base = process.env.AI_STUDIO_BASE_URL;
    const key  = process.env.AI_STUDIO_API_KEY;
    if (!base || !key) {
      return new Response(JSON.stringify({ error: "Missing AI_STUDIO_BASE_URL or AI_STUDIO_API_KEY" }), { status: 500 });
    }

    // 👉 Ganti path endpoint di bawah sesuai provider kamu.
    // Misal: `${base}/v1/generate` atau `${base}/v1/chat/completions`
    const url = `${base.replace(/\/+$/,"")}/v1/generate`;

    // Prompt sistem: minta model menyempurnakan LARAS JSON
    const system = `You are a JSON LARAS architect. Improve and complete the provided JSON
with consistent structure: characters, style, narrative beats (intro, build, mid, climax,
resolution, outro), transitions, dialogue, fx, output settings. Keep keys stable and return
valid JSON only.`;

    const payload = {
      // Struktur payload bisa berbeda tiap provider.
      // Sesuaikan: prompt, messages, model, temperature, dll.
      prompt: [
        { role: "system", content: system },
        { role: "user", content: `User instruction: ${instruction}` },
        { role: "user", content: `Draft JSON:\n${JSON.stringify(draft)}` }
      ],
      // Contoh parameter umum:
      temperature: 0.6,
      max_tokens: 1200
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${key}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `Upstream error: ${res.status}`, details: text }), { status: 502 });
    }

    // Asumsikan provider mengembalikan { output: "...json string..." } atau langsung JSON
    const data = await res.json();

    // Deteksi kemungkinan format respons. Silakan sesuaikan parsing sesuai provider.
    let enhanced: any = null;

    if (typeof data === "object" && data.output) {
      // output bisa berupa string JSON
      try { enhanced = JSON.parse(data.output); } catch { enhanced = data.output; }
    } else if (data.choices?.[0]?.message?.content) {
      // gaya OpenAI
      const content = data.choices[0].message.content;
      try { enhanced = JSON.parse(content); } catch { enhanced = content; }
    } else {
      enhanced = data;
    }

    return new Response(JSON.stringify({ enhanced }), {
      headers: { "content-type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Proxy failed", details: err?.message }), { status: 500 });
  }
}
