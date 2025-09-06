// aiClient.ts
export type CallInfo = { modelTried: string; switched?: boolean; reason?: string }
export type CallOpts = {
  apiKey: string
  model?: string            // model awal (opsional)
  modelsChain?: string[]    // rantai fallback (opsional)
  prompt: string
  onSwitch?: (from: string, to: string, reason: string) => void
}

function stripFence(s: string){ return s.replace(/```json|```/g, '').trim() }
function robustParse(raw: string){
  const t = raw.trim()
  try { return JSON.parse(t) } catch {}
  try { return JSON.parse(`{${t}}`) } catch {}
  try { return JSON.parse(`[${t}]`) } catch {}
  throw new Error('Gagal parse JSON dari model')
}

async function callModel(apiKey: string, model: string, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    contents: [{ role:'user', parts:[{ text: prompt }] }],
    safetySettings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ],
    generationConfig: { temperature: 0.5, topK: 32, topP: 0.9, maxOutputTokens: 8192 }
  }
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
  const txt = await res.text()
  if (!res.ok) throw { status: res.status, text: txt }
  let data: any; try { data = JSON.parse(txt) } catch { throw new Error('Response bukan JSON') }
  const text = data?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||'').join('') || ''
  if (!text) throw new Error('Teks kosong dari model')
  const cleaned = stripFence(text)
  try { return JSON.parse(cleaned) } catch { return robustParse(cleaned) }
}

/** Panggil Gemini dengan auto-fallback.
 *  Default chain lumayan lengkap; urutan dari "berkualitas → cepat".
 */
export async function callGeminiStrict(opts: CallOpts){
  const { apiKey, prompt, onSwitch } = opts
  if (!apiKey || apiKey.length < 20) throw new Error('API key tidak valid')

  const defaultChain = [
    // kualitas tinggi → cepat
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite",   // jika tersedia di akun
    "gemini-1.0-pro"           // fallback lama
  ]

  // susun chain: model awal (jika ada) + chain custom (jika ada) + default, lalu dedup
  const chain = Array.from(new Set([
    ...(opts.model ? [opts.model] : []),
    ...(opts.modelsChain || []),
    ...defaultChain
  ]))

  const attempts: CallInfo[] = []
  let lastErr: any

  for (let i=0; i<chain.length; i++){
    const m = chain[i]
    try {
      const result = await callModel(apiKey, m, prompt)
      attempts.push({ modelTried: m, switched: i>0, reason: attempts[i-1]?.reason })
      return { ...result, __meta: { attempts } }
    } catch (e:any) {
      lastErr = e
      const reason = e?.status === 429 ? '429 quota/rate limit' : `err ${e?.status||''}`
      if (i < chain.length-1) {
        onSwitch?.(m, chain[i+1], reason) // ← beritahu UI untuk popup
      }
      attempts.push({ modelTried: m, switched: true, reason })
      continue
    }
  }
  throw new Error(`Semua model gagal. Error terakhir: ${lastErr?.text || lastErr}`)
}
