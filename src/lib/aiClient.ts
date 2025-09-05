type Params = { apiKey: string; model: string; prompt: string }

function stripFence(s: string){ return s.replace(/```json|```/g, '').trim() }

function robustParse(raw: string){
  const t = raw.trim()
  try { return JSON.parse(t) } catch {}
  try { return JSON.parse(`{${t}}`) } catch {}
  try { return JSON.parse(`[${t}]`) } catch {}
  throw new Error('Gagal parse JSON dari model')
}

export async function callGeminiStrict({ apiKey, model, prompt }: Params){
  if (!apiKey || apiKey.length < 20) throw new Error('API key tidak valid')

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
  const t = await res.text()
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${t}`)

  let data: any; try { data = JSON.parse(t) } catch { throw new Error('Response bukan JSON') }

  const text = data?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||'').join('') || ''
  if (!text) throw new Error('Teks kosong dari model')

  const cleaned = stripFence(text)
  try { return JSON.parse(cleaned) } catch { return robustParse(cleaned) }
}
