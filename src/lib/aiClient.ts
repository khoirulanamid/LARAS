export interface SwitchProgress { (status: string): void }

async function postJSON(url: string, body: any, headers: Record<string,string>){
  const res = await fetch(url, { method: 'POST', headers: { 'content-type':'application/json', ...headers }, body: JSON.stringify(body) });
  if (!res.ok){ const t = await res.text().catch(()=>res.statusText); throw new Error(`HTTP ${res.status}: ${t}`) }
  return res.json();
}

export async function callGeminiAutoSwitch(apiKey: string, prompt: string, progress?: SwitchProgress){
  const candidates = [ 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest' ];
  const endpoint = (m:string)=>`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const headers = {} as Record<string,string>;
  const bodyFor = (m:string)=>({ contents: [{ role:'user', parts:[{text: prompt}] }], generationConfig: { temperature: 0.6, topP: 0.9 } });

  let lastErr:any = null;
  for (let i=0;i<candidates.length;i++){
    const model = candidates[i];
    try{
      progress?.(`Trying ${model}…`);
      const json = await postJSON(endpoint(model), bodyFor(model), headers);
      const text = json?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||'').join('') || '';
      const parsed = safeJsonParse(text);
      if (!parsed || typeof parsed !== 'object') throw new Error('Model did not return JSON');
      progress?.(`Parsed JSON from ${model}`);
      return parsed; // { full, per_scene } or idea JSON
    }catch(err:any){
      lastErr = err; progress?.(`Switching model… (${err?.message||err})`);
      await sleep(300); continue;
    }
  }
  throw lastErr || new Error('All models failed');
}

function safeJsonParse(s:string){ try{ return JSON.parse(s) }catch{ return null } }
function sleep(ms:number){ return new Promise(r=>setTimeout(r, ms)) }
