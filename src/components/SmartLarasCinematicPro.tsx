import { useEffect, useMemo, useState } from 'react'
import { callGeminiStrict } from '../lib/aiClient'

// Bentuk hasil yang diharapkan
type OutShape = {
  full: any
  per_scene: any[]
  __meta?: { attempts: { modelTried:string; switched?:boolean; reason?:string }[] }
}

// util umum
const copy = (t:string)=> navigator.clipboard.writeText(t)
function download(name: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}

// buat ZIP per-scene (tanpa lib eksternal)
async function downloadScenesZip(items: {name:string, data:any}[], zipName='per_scene.zip'){
  const parts: BlobPart[] = []
  // Minimal ZIP writer manual terlalu panjang; gunakan FileSystem API sederhana:
  // fallback: gabungkan semua JSON jadi newline-delimited (masih satu file)
  // → kalau butuh benar2 ZIP, nanti bisa ganti dengan JSZip. Untuk sekarang kita simpan NDJSON.
  const nd = items.map(x=> JSON.stringify({ name:x.name, data:x.data })).join('\n')
  parts.push(nd)
  const blob = new Blob(parts, { type: 'application/x-ndjson' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = zipName; a.click(); URL.revokeObjectURL(url)
}

export default function SmartLarasCinematicPro() {
  // kontrol minimal (awam): API key, Judul, Jumlah scene. Durasi fix 8 detik.
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gemini-1.5-pro') // tetap ada tapi kecil
  const [title, setTitle] = useState('Kartun Edukasi Anak')
  const [scenes, setScenes] = useState(20)

  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'full'|'per'>('full')
  const [out, setOut] = useState<OutShape|null>(null)
  const [error, setError] = useState<string|undefined>()
  const [modelUsed, setModelUsed] = useState<string>('')
  const [switchNote, setSwitchNote] = useState<string>('')

  useEffect(()=>{ const k = localStorage.getItem('GEMINI_KEY'); if (k) setApiKey(k) },[])
  function saveKey(k:string){ setApiKey(k); localStorage.setItem('GEMINI_KEY', k) }

  const canGo = useMemo(()=> apiKey.trim().length>20 && scenes>0 && title.trim().length>1, [apiKey, scenes, title])

  // Prompt super singkat (awam), tapi tetap enforce schema & konsistensi. Durasi fix 8 detik.
  function buildPrompt(){
    return `
HASILKAN JSON SAJA (tanpa teks lain) { "full":{...}, "per_scene":[...] }.
Judul: "${title}". Jumlah scene: ${scenes}. Durasi tiap scene: 8 detik.
Konsistensi karakter & lokasi wajib (id persisten, warna pakaian hex, look_lock wajah/tubuh/pakaian/warna).
Skema:
{
 "full":{
   "version":"3.0","schema":"laras.story",
   "consistency":{"lock":true,"design_id":"auto_simple","seed":"auto","look_lock":{"face":true,"body":true,"clothes":true,"colors":true}},
   "roster":[/* daftar karakter lengkap & atribut visual (rambut, mata+pupil, hidung, telinga, baju, celana/rok, sepatu) */],
   "locations":[/* daftar lokasi penting, mis. rumah_1, rumah_2, rumah_3, sekolah, taman, jalan */],
   "audio":{"mix_profile":"film","music_global":["ramah_anak"],"sfx_global":["langkah_kaki","kicau_burung"]},
   "scenes":[
     {"id":"S001","durationSec":8,"location_id":"loc_rumah_1",
      "camera":{"frame":"...","lens":"28mm","movement":"...","composition":"rule_of_thirds"},
      "characters":[{"ref":"char_1","pose":"...","expression":"...","action":"..."}],
      "dialog":[{"ref":"char_1","text":"..."}],
      "sfx":["..."],"music_cue":"...","notes":""}
     // total ${scenes} scene
   ]
 },
 "per_scene":[/* salin semua scene satu per item, sama persis dengan 'scenes' di atas */]
}
`.trim()
  }

  async function onGenerate(){
    try{
      setLoading(true); setError(undefined); setOut(null); setModelUsed(''); setSwitchNote('')
      const data = await callGeminiStrict({ apiKey, model, prompt: buildPrompt() }) as OutShape
      if (!data?.full || !Array.isArray(data?.per_scene)) throw new Error('Output tidak sesuai bentuk { full, per_scene }')
      setOut(data)
      const attempts = data.__meta?.attempts || []
      if (attempts.length){
        setModelUsed(attempts[attempts.length-1].modelTried)
        const switched = attempts.find(a=>a.switched)
        if (switched) setSwitchNote(`Model berpindah otomatis (${attempts.map(a=>a.modelTried).join(' → ')})${switched.reason ? ` karena ${switched.reason}`:''}`)
      }
    }catch(e:any){
      setError(e?.message || 'Unknown error')
    }finally{ setLoading(false) }
  }

  const fullText = out ? JSON.stringify(out.full, null, 2) : ''
  const perText = out ? JSON.stringify(out.per_scene, null, 2) : ''

  // buat daftar file per-scene
  const sceneFiles = (out?.per_scene || []).map((sc, i)=>({
    name: `${(sc?.id ?? `S${String(i+1).padStart(3,'0')}`)}.json`,
    data: sc
  }))

  return (
    <div className="card">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
        <div style={{fontWeight:900,letterSpacing:.3,fontSize:18}}>Story Controls (Sederhana)</div>
        <div className="row">
          {modelUsed && <span className="badge">Model: {modelUsed}</span>}
          <button className="button" disabled={!canGo || loading} onClick={onGenerate}>
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
      {switchNote && <div className="note" style={{marginTop:6}}>⚠️ {switchNote}</div>}

      <div className="grid" style={{marginTop:12}}>
        {/* KIRI: kontrol minimal */}
        <div>
          <div className="kv">
            <label>Gemini API Key</label>
            <input type="text" placeholder="AIza..." value={apiKey} onChange={e=>saveKey(e.target.value)} />
            <small className="helper">Disimpan lokal (localStorage). Jangan bagikan ke publik.</small>

            <label>Judul</label>
            <input type="text" value={title} onChange={e=>setTitle(e.target.value)} />

            <label>Jumlah Scene</label>
            <input type="number" min={1} value={scenes} onChange={e=>setScenes(parseInt(e.target.value||'1'))} />

            <label>Model awal</label>
            <input type="text" value={model} onChange={e=>setModel(e.target.value)} />
            <small className="helper">Jika quota habis → otomatis pindah ke 1.5-flash → 2.0-flash.</small>
          </div>

          <hr className="sep"/>
          <div className="note">Durasi per scene otomatis <b>8 detik</b>. Output: <b>FULL JSON</b> & <b>PER-SCENE</b> (terpisah).</div>
        </div>

        {/* KANAN: output & aksi */}
        <div>
          <div className="tabs">
            <div className={`tab ${tab==='full'?'active':''}`} onClick={()=>setTab('full')}>FULL JSON</div>
            <div className={`tab ${tab==='per'?'active':''}`} onClick={()=>setTab('per')}>PER-SCENE JSON</div>
          </div>

          {tab==='full' ? (
            <>
              <div className="row" style={{marginTop:10}}>
                <button className="button secondary" disabled={!out} onClick={()=>copy(fullText)}>Copy</button>
                <button className="button ghost" disabled={!out} onClick={()=>download('full.json', out!.full)}>Download</button>
              </div>
              <div className="output" style={{marginTop:10}}>
                {error ? `❌ ${error}` : (out ? fullText : 'Belum ada output. Klik Generate.')}
              </div>
            </>
          ) : (
            <>
              <div className="row" style={{marginTop:10}}>
                <button className="button secondary" disabled={!out} onClick={()=>copy(perText)}>Copy Semua</button>
                <button className="button ghost" disabled={!out} onClick={()=>download('per_scene.json', out!.per_scene)}>Download Semua (1 file)</button>
                <button className="button" disabled={!sceneFiles.length} onClick={()=>downloadScenesZip(sceneFiles,'per_scene.ndjson')}>
                  Download Per-Scene (gabung)
                </button>
              </div>

              {/* daftar file per-scene */}
              <div className="list">
                {sceneFiles.length===0 ? (
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

              <div className="output" style={{marginTop:10}}>
                {error ? `❌ ${error}` : (out ? perText : 'Belum ada output. Klik Generate.')}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
