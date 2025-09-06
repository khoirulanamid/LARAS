import { useEffect, useMemo, useState } from 'react'
import { callGeminiStrict } from '../lib/aiClient'
import { validateStory, type ValidationResult } from '../lib/validate'

type OutShape = {
  full: any
  per_scene: any[]
  __meta?: { attempts: { modelTried:string; switched?:boolean; reason?:string }[] }
}

const copy = (t:string)=> navigator.clipboard.writeText(t)
function download(name: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}

// alternatif ringan: NDJSON gabungan semua scene (kalau mau ZIP, nanti bisa tambah JSZip)
async function downloadScenesNdjson(items: {name:string, data:any}[], file='per_scene.ndjson'){
  const nd = items.map(x=> JSON.stringify({ name:x.name, data:x.data })).join('\n')
  const blob = new Blob([nd], { type: 'application/x-ndjson' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = file; a.click(); URL.revokeObjectURL(url)
}

export default function SmartLarasCinematicPro() {
  // minimal controls; durasi fixed 8 detik
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gemini-1.5-pro')
  const [title, setTitle] = useState('Kartun Edukasi Anak')
  const [scenes, setScenes] = useState(20)

  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'full'|'per'>('full')
  const [out, setOut] = useState<OutShape|null>(null)
  const [error, setError] = useState<string|undefined>()
  const [modelUsed, setModelUsed] = useState<string>('')
  const [switchNote, setSwitchNote] = useState<string>('')
  const [check, setCheck] = useState<ValidationResult|null>(null)

  useEffect(()=>{ const k = localStorage.getItem('GEMINI_KEY'); if (k) setApiKey(k) },[])
  function saveKey(k:string){ setApiKey(k); localStorage.setItem('GEMINI_KEY', k) }

  const canGo = useMemo(()=> apiKey.trim().length>20 && scenes>0 && title.trim().length>1, [apiKey, scenes, title])

  /** PROMPT — konsistensi ketat, lebih natural, ada Intro & Outro (bukan putri) */
  function buildPrompt(){
    return `
KELUARKAN JSON SAJA (tanpa teks tambahan) dengan bentuk persis:
{ "full": { ... }, "per_scene": [ ... ] }

Judul: "${title}"
Jumlah scene: ${scenes}
Durasi setiap scene: 8 (tuliskan sebagai "durationSec": 8 di tiap scene)

WAJIB:
- Scene pertama bertag "Intro" (perkenalan & hook).
- Scene terakhir bertag "Outro" (penutup & ringkasan).
- Konsistensi keras: karakter & lokasi punya id tetap (roster[].id dan locations[].id), dan scene memakai "ref" & "location_id" yang sesuai roster/locations.
- Visual karakter stabil (rambut, mata+pupil, kulit, baju[model+hex], celana/rok[model+hex], sepatu — tidak berubah antar scene).

GAYA CERITA (hindari kaku):
- Beat sinematik: setup → inciting incident → rising actions → midpoint → escalation → climax → resolution → outro.
- Dialog alami, ringkas, ramah anak. Selipkan humor halus (tanpa slapstick berlebihan).
- Show-don't-tell: tindakan & ekspresi menggambarkan emosi.
- Kamera bervariasi (wide/close, pan/tilt/dolly/tracking), komposisi (rule_of_thirds/leading_lines), lensa realistis 24–50mm.
- Audio: musik ramah anak (fade saat dialog), SFX relevan (langkah kaki, angin, pintu, tawa).

BENTUK WAJIB:
{
  "full": {
    "version": "3.2",
    "schema": "laras.story",
    "consistency": {
      "lock": true,
      "design_id": "auto_simple",
      "seed": "auto",
      "look_lock": { "face": true, "body": true, "clothes": true, "colors": true }
    },
    "roster": [
      /* daftar karakter lengkap + atribut visual (warna hex) */
    ],
    "locations": [
      /* contoh: loc_rumah_1, loc_rumah_2, loc_sekolah, loc_taman, loc_jalan */
    ],
    "audio": { "mix_profile":"film", "music_global":["ramah_anak"], "sfx_global":["langkah_kaki","kicau_burung"] },
    "scenes": [
      {
        "id":"S001","tag":"Intro","durationSec":8,
        "location_id":"loc_rumah_1",
        "camera":{"frame":"wide","lens":"28mm","movement":"slow_push_in","composition":"rule_of_thirds"},
        "characters":[{"ref":"char_utama","pose":"...","expression":"...","action":"..."}],
        "dialog":[{"ref":"char_utama","text":"..."}],
        "sfx":["angin_sepoi"],"music_cue":"intro_warm","notes":"perkenalan & hook"
      }
      /* total ${scenes} scene. Pastikan alur mengalir sesuai beat, lalu Outro di scene terakhir */
    ]
  },
  "per_scene": [
    /* salin seluruh scene satu-per-objek, sama persis dengan 'scenes' */
  ]
}

WAJIBKAN:
- Semua "durationSec" harus = 8.
- Semua "characters[].ref" ada di "roster".
- Semua "location_id" ada di "locations".
- Id scene berurutan S001..S${String(scenes).padStart(3,'0')}
`.trim()
  }

  async function onGenerate(){
    try{
      setLoading(true); setError(undefined); setOut(null); setModelUsed(''); setSwitchNote(''); setCheck(null)
      const data = await callGeminiStrict({ apiKey, model, prompt: buildPrompt() }) as OutShape
      if (!data?.full || !Array.isArray(data?.per_scene)) throw new Error('Output tidak sesuai { full, per_scene }')
      setOut(data)
      const attempts = data.__meta?.attempts || []
      if (attempts.length){
        setModelUsed(attempts[attempts.length-1].modelTried)
        const switched = attempts.find(a=>a.switched)
        if (switched) setSwitchNote(`Model berpindah otomatis (${attempts.map(a=>a.modelTried).join(' → ')})${switched.reason ? ` karena ${switched.reason}`:''}`)
      }
      // Validasi konsistensi
      const report = validateStory(data, scenes)
      setCheck(report)
    }catch(e:any){
      setError(e?.message || 'Unknown error')
    }finally{ setLoading(false) }
  }

  const fullText = out ? JSON.stringify(out.full, null, 2) : ''
  const perText = out ? JSON.stringify(out.per_scene, null, 2) : ''
  const sceneFiles = (out?.per_scene || []).map((sc, i)=>({
    name: `${(sc?.id ?? `S${String(i+1).padStart(3,'0')}`)}.json`,
    data: sc
  }))

  return (
    <div className="layout">
      {/* LEFT: form sticky */}
      <div className="left card">
        <div className="section-title">Story Controls (Sederhana)</div>
        <div className="kv">
          <label>Gemini API Key</label>
          <input type="text" placeholder="Tempel API Key di sini (AIza...)" value={apiKey} onChange={(e)=>saveKey(e.target.value)} />
          <small className="helper">Disimpan lokal. Jangan bagikan.</small>

          <label>Judul</label>
          <input type="text" placeholder="Contoh: Kartun Edukasi Anak" spellCheck={false} value={title} onChange={(e)=>setTitle(e.target.value)} required />

          <label>Jumlah Scene</label>
          <input type="number" placeholder="20" inputMode="numeric" min={1} max={200} step={1} value={scenes} onChange={(e)=>setScenes(Number(e.target.value||1))} required />
          <small className="helper">Durasi per scene otomatis <b>8 detik</b>.</small>

          <label>Model awal</label>
          <input type="text" placeholder="gemini-1.5-pro" value={model} onChange={(e)=>setModel(e.target.value)} />
          <small className="helper">Jika quota habis → fallback ke 1.5-flash → 2.0-flash.</small>
        </div>

        <div className="row" style={{marginTop:14}}>
          {modelUsed && <span className="badge">Model: {modelUsed}</span>}
          <button className="button" disabled={!canGo || loading} onClick={onGenerate}>
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>

        {switchNote && <div className="note" style={{marginTop:8}}>⚠️ {switchNote}</div>}

        {check && (
          <div style={{marginTop:12}}>
            <div className="section-title">Validation</div>
            <div className="note">
              {check.ok ? '✅ Lolos pemeriksaan dasar.' : '⚠️ Ada catatan:'}
              <ul>
                {check.messages.map((m,i)=>(<li key={i}>{m}</li>))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: output (tinggi tetap + scroll) */}
      <div className="card">
        <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}>
          <div className="tabs">
            <div className={`tab ${tab==='full'?'active':''}`} onClick={()=>setTab('full')}>FULL JSON</div>
            <div className={`tab ${tab==='per'?'active':''}`} onClick={()=>setTab('per')}>PER-SCENE JSON</div>
          </div>
          <div className="row">
            {tab==='full' ? (
              <>
                <button className="button secondary" disabled={!out} onClick={()=>copy(fullText)}>Copy</button>
                <button className="button ghost" disabled={!out} onClick={()=>download('full.json', out!.full)}>Download</button>
              </>
            ) : (
              <>
                <button className="button secondary" disabled={!out} onClick={()=>copy(perText)}>Copy Semua</button>
                <button className="button ghost" disabled={!out} onClick={()=>download('per_scene.json', out!.per_scene)}>Download Semua</button>
                <button className="button" disabled={!sceneFiles.length} onClick={()=>downloadScenesNdjson(sceneFiles)}>Per-Scene (gabung)</button>
              </>
            )}
          </div>
        </div>

        {tab==='per' && (
          <div className="list">
            {(sceneFiles.length===0) ? (
              <div className="item"><span>Tidak ada scene.</span></div>
            ) : sceneFiles.map((f, idx)=>(
              <div className="item" key={idx}>
                <span>{f.name}</span>
                <div className="row">
                  <button className="button secondary" onClick={()=>copy(JSON.stringify(f.data,null,2))}>Copy</button>
                  <button className="button ghost" onClick={()=>download(f.name, f.data)}>Download</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="output" style={{marginTop:10}}>
          { error
            ? `❌ ${error}`
            : out
              ? (tab==='full' ? fullText : perText)
              : 'Belum ada output. Klik Generate.' }
        </div>
      </div>
    </div>
  )
}
